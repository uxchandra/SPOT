import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requirePermission("approval_flow.manage"));

// Saat ini alur approval hanya untuk Permintaan Barang. Nanti PO tinggal memakai documentType lain.
const DOCUMENT_TYPE = "PURCHASE_REQUEST" as const;
const MAX_STEPS = 10;

interface StepInput {
  name?: string;
  approverId?: number;
}

// GET /api/approval-flows : semua department beserta tahap approval-nya
router.get("/", async (_req, res) => {
  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      approvalFlows: {
        where: { documentType: DOCUMENT_TYPE },
        select: {
          steps: {
            orderBy: { stepOrder: "asc" },
            select: {
              stepOrder: true,
              name: true,
              approver: { select: { id: true, name: true, email: true, isActive: true } },
            },
          },
        },
      },
    },
  });

  res.json(
    departments.map(({ approvalFlows, ...department }) => ({
      department,
      steps: approvalFlows[0]?.steps ?? [],
    })),
  );
});

// GET /api/approval-flows/user-options : user aktif yang bisa dipilih sebagai approver
router.get("/user-options", async (_req, res) => {
  res.json(
    await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, department: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
  );
});

// PUT /api/approval-flows/:departmentId : simpan tahap approval department (menggantikan yang lama).
// Daftar tahap kosong = alur dihapus (PB department ini tidak bisa diajukan).
// Perubahan alur tidak memengaruhi PB yang sedang dalam proses approval.
router.put("/:departmentId", async (req, res) => {
  const departmentId = Number(req.params.departmentId);
  if (!(await prisma.department.findUnique({ where: { id: departmentId } }))) {
    res.status(404).json({ message: "Department tidak ditemukan" });
    return;
  }

  const steps = (req.body as { steps?: StepInput[] }).steps;
  if (!Array.isArray(steps)) {
    res.status(400).json({ message: "Data tahap approval tidak valid" });
    return;
  }
  if (steps.length > MAX_STEPS) {
    res.status(400).json({ message: `Maksimal ${MAX_STEPS} tahap approval` });
    return;
  }
  for (const [index, step] of steps.entries()) {
    const label = `Tahap ${index + 1}`;
    if (!step.name?.trim()) {
      res.status(400).json({ message: `${label}: nama tahap wajib diisi` });
      return;
    }
    if (step.name.trim().length > 50) {
      res.status(400).json({ message: `${label}: nama tahap maksimal 50 karakter` });
      return;
    }
    const approver = step.approverId ? await prisma.user.findUnique({ where: { id: step.approverId } }) : null;
    if (!approver || !approver.isActive) {
      res.status(400).json({ message: `${label}: approver wajib dipilih dan harus user aktif` });
      return;
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.approvalFlow.deleteMany({ where: { documentType: DOCUMENT_TYPE, departmentId } });
    if (steps.length === 0) return;
    await tx.approvalFlow.create({
      data: {
        documentType: DOCUMENT_TYPE,
        departmentId,
        steps: {
          create: steps.map((step, index) => ({
            stepOrder: index + 1,
            name: step.name!.trim(),
            approverId: step.approverId!,
          })),
        },
      },
    });
  });

  res.json({ message: "Alur approval berhasil disimpan" });
});

export default router;
