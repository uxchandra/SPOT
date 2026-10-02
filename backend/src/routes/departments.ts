import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

interface DepartmentInput {
  code?: string;
  name?: string;
  description?: string;
  position?: string; // jabatan penanggung jawab
  userId?: number | null; // user yang memegang jabatan tersebut
}

// Data user yang ikut dikirim bersama department
const departmentInclude = {
  user: { select: { id: true, name: true, email: true } },
} as const;

// Validasi input. Mengembalikan pesan error, atau null kalau valid.
async function validate(body: DepartmentInput, departmentId?: number): Promise<string | null> {
  const code = body.code?.trim().toUpperCase();
  if (!code) return "Kode department wajib diisi";
  if (!/^[A-Z0-9_-]{1,20}$/.test(code)) return "Kode hanya boleh huruf, angka, - dan _ (maksimal 20 karakter)";
  if (!body.name?.trim()) return "Nama department wajib diisi";
  if (body.position && body.position.trim().length > 100) return "Jabatan maksimal 100 karakter";

  if (body.userId != null) {
    const user = await prisma.user.findUnique({ where: { id: body.userId } });
    if (!user) return "User tidak ditemukan";
  }

  const sameCode = await prisma.department.findUnique({ where: { code } });
  if (sameCode && sameCode.id !== departmentId) return `Kode ${code} sudah dipakai department lain`;
  return null;
}

function toData(body: DepartmentInput) {
  return {
    code: body.code!.trim().toUpperCase(),
    name: body.name!.trim(),
    description: body.description?.trim() || null,
    position: body.position?.trim() || null,
    userId: body.userId ?? null,
  };
}

// GET /api/departments : daftar department
router.get("/", requirePermission("department.view"), async (_req, res) => {
  res.json(await prisma.department.findMany({ include: departmentInclude, orderBy: { code: "asc" } }));
});

// GET /api/departments/user-options : pilihan user untuk penanggung jawab department
// (dipisah dari /api/users supaya cukup butuh permission department.manage)
router.get("/user-options", requirePermission("department.manage"), async (_req, res) => {
  res.json(
    await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  );
});

// POST /api/departments : tambah department
router.post("/", requirePermission("department.manage"), async (req, res) => {
  const body = req.body as DepartmentInput;
  const error = await validate(body);
  if (error) {
    res.status(400).json({ message: error });
    return;
  }
  res.status(201).json(await prisma.department.create({ data: toData(body), include: departmentInclude }));
});

// PUT /api/departments/:id : ubah department
router.put("/:id", requirePermission("department.manage"), async (req, res) => {
  const id = Number(req.params.id);
  if (!(await prisma.department.findUnique({ where: { id } }))) {
    res.status(404).json({ message: "Department tidak ditemukan" });
    return;
  }

  const body = req.body as DepartmentInput;
  const error = await validate(body, id);
  if (error) {
    res.status(400).json({ message: error });
    return;
  }
  res.json(await prisma.department.update({ where: { id }, data: toData(body), include: departmentInclude }));
});

// DELETE /api/departments/:id : hapus department
router.delete("/:id", requirePermission("department.manage"), async (req, res) => {
  const id = Number(req.params.id);
  if (!(await prisma.department.findUnique({ where: { id } }))) {
    res.status(404).json({ message: "Department tidak ditemukan" });
    return;
  }
  await prisma.department.delete({ where: { id } });
  res.json({ message: "Department berhasil dihapus" });
});

export default router;
