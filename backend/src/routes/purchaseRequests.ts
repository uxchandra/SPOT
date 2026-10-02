import { Router } from "express";
import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { UNITS } from "../lib/units.js";
import { requireAuth, requirePermission, type AuthUser } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

const DOCUMENT_TYPE = "PURCHASE_REQUEST" as const;
const MAX_LINES = 100;

// ===== Helper =====

interface LineInput {
  machine?: string;
  machineItemId?: number | null;
  accountCode?: string;
  itemId?: number | null;
  itemCode?: string; // untuk barang manual (di luar Item List); barang dari Item List memakai kode master
  itemName?: string;
  quantity?: number;
  unit?: string;
  usageDate?: string; // YYYY-MM-DD
  remarks?: string;
}

interface RequestInput {
  tehaiHyouNo?: string;
  items?: LineInput[];
}

const requestInclude = {
  department: { select: { id: true, code: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  items: { orderBy: { lineNo: "asc" } },
} satisfies Prisma.PurchaseRequestInclude;

type RequestWithRelations = Prisma.PurchaseRequestGetPayload<{ include: typeof requestInclude }>;

// Tanggal hari ini menurut WIB, format YYYY-MM-DD (server bisa saja berjalan di zona waktu lain)
const todayInJakarta = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

const toDateString = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null);
const isValidDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));

function hasPermission(user: AuthUser, permission: string) {
  return user.permissions.includes(permission);
}

// Tahap approval yang sedang menunggu tindakan untuk PB ini (atau null)
async function currentApproval(pr: { id: number; status: string; round: number; currentStep: number | null }) {
  if (pr.status !== "IN_APPROVAL" || pr.currentStep === null) return null;
  return prisma.documentApproval.findFirst({
    where: { documentType: DOCUMENT_TYPE, documentId: pr.id, round: pr.round, stepOrder: pr.currentStep, status: "PENDING" },
    include: { approver: { select: { id: true, name: true } } },
  });
}

// Siapa saja yang boleh melihat PB: semua department (view_all), department sendiri (view),
// pembuatnya, dan user yang pernah/sedang menjadi approver PB tersebut.
async function canView(user: AuthUser, pr: { id: number; departmentId: number; createdById: number }) {
  if (hasPermission(user, "purchase_request.view_all")) return true;
  if (hasPermission(user, "purchase_request.view") && pr.departmentId === user.department?.id) return true;
  if (pr.createdById === user.id) return true;
  const asApprover = await prisma.documentApproval.count({
    where: { documentType: DOCUMENT_TYPE, documentId: pr.id, approverId: user.id },
  });
  return asApprover > 0;
}

// PB yang sedang menunggu approval dari user ini (tahap aktif, pengajuan terakhir)
async function pendingRequestIds(userId: number): Promise<number[]> {
  const approvals = await prisma.documentApproval.findMany({
    where: { documentType: DOCUMENT_TYPE, approverId: userId, status: "PENDING" },
    select: { documentId: true, round: true, stepOrder: true },
  });
  if (approvals.length === 0) return [];
  const requests = await prisma.purchaseRequest.findMany({
    where: { id: { in: approvals.map((a) => a.documentId) }, status: "IN_APPROVAL" },
    select: { id: true, round: true, currentStep: true },
  });
  return requests
    .filter((pr) => approvals.some((a) => a.documentId === pr.id && a.round === pr.round && a.stepOrder === pr.currentStep))
    .map((pr) => pr.id);
}

function lineToResponse(line: RequestWithRelations["items"][number]) {
  return { ...line, quantity: line.quantity.toNumber(), usageDate: toDateString(line.usageDate) };
}

// Validasi & ubah input menjadi data siap simpan. Mengembalikan pesan error (string) atau data.
async function buildData(body: RequestInput) {
  if (body.tehaiHyouNo && body.tehaiHyouNo.trim().length > 50) return "No. Tehai hyou maksimal 50 karakter";
  if (!Array.isArray(body.items) || body.items.length === 0) return "Minimal 1 barang wajib diisi";
  if (body.items.length > MAX_LINES) return `Maksimal ${MAX_LINES} baris barang`;

  // Ambil sekaligus item master yang dirujuk
  const refIds = body.items.flatMap((l) => [l.itemId, l.machineItemId]).filter((id): id is number => typeof id === "number");
  const masterItems = new Map((await prisma.item.findMany({ where: { id: { in: refIds } } })).map((i) => [i.id, i]));

  const lines: Prisma.PurchaseRequestItemCreateWithoutPurchaseRequestInput[] = [];
  for (const [index, line] of body.items.entries()) {
    const label = `Baris ${index + 1}`;
    const item = line.itemId != null ? masterItems.get(line.itemId) : undefined;
    const machineItem = line.machineItemId != null ? masterItems.get(line.machineItemId) : undefined;
    if (line.itemId != null && !item) return `${label}: barang tidak ditemukan di Item List`;
    if (line.machineItemId != null && !machineItem) return `${label}: mesin/unit tidak ditemukan di Item List`;

    const itemName = line.itemName?.trim() || item?.name;
    const accountCode = line.accountCode?.trim();
    const quantity = Number(line.quantity);
    const manualCode = line.itemCode?.trim();
    if (!item && manualCode && manualCode.length > 30) return `${label}: kode barang maksimal 30 karakter`;
    if (!itemName) return `${label}: nama barang wajib diisi`;
    if (itemName.length > 255) return `${label}: nama barang maksimal 255 karakter`;
    if (!accountCode) return `${label}: kode account wajib diisi`;
    if (accountCode.length > 30) return `${label}: kode account maksimal 30 karakter`;
    if (!Number.isFinite(quantity) || quantity <= 0) return `${label}: jumlah harus lebih dari 0`;
    if (quantity >= 1e13) return `${label}: jumlah terlalu besar`;
    if (!line.unit || !(UNITS as readonly string[]).includes(line.unit)) return `${label}: satuan tidak valid`;
    if (!isValidDate(line.usageDate)) return `${label}: tanggal pemakaian wajib diisi`;
    if (line.machine && line.machine.trim().length > 255) return `${label}: kode mesin/unit terlalu panjang`;

    lines.push({
      lineNo: index + 1,
      machine: line.machine?.trim() || machineItem?.code || null,
      machineItem: machineItem ? { connect: { id: machineItem.id } } : undefined,
      accountCode,
      item: item ? { connect: { id: item.id } } : undefined,
      itemCode: item?.code ?? (manualCode || null),
      itemName,
      quantity: Math.round(quantity * 100) / 100,
      unit: line.unit,
      usageDate: new Date(line.usageDate),
      remarks: line.remarks?.trim() || null,
    });
  }

  return {
    tehaiHyouNo: body.tehaiHyouNo?.trim() || null,
    lines,
  };
}

// Ambil nomor berikutnya: {urut}/{nama dept}/{bulan}/{tahun}, urut per department per tahun.
// Dipanggil di dalam transaksi supaya dua PB yang disimpan bersamaan tidak mendapat nomor sama.
async function allocateNumber(tx: Prisma.TransactionClient, departmentId: number, departmentName: string, date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const sequence = await tx.documentSequence.upsert({
    where: { documentType_departmentId_year: { documentType: DOCUMENT_TYPE, departmentId, year } },
    create: { documentType: DOCUMENT_TYPE, departmentId, year, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
  });
  return `${sequence.lastNumber}/${departmentName}/${month}/${year}`;
}

// ===== Endpoint =====

// GET /api/purchase-requests/pending-count : jumlah PB yang menunggu approval user ini (untuk badge)
router.get("/pending-count", async (req, res) => {
  res.json({ count: (await pendingRequestIds(req.user!.id)).length });
});

// GET /api/purchase-requests/form-options : pilihan untuk form PB
router.get("/form-options", requirePermission("purchase_request.create"), async (req, res) => {
  const user = req.user!;
  const [items, flow, sequences] = await Promise.all([
    prisma.item.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, unit: true },
      orderBy: { code: "asc" },
    }),
    user.department
      ? prisma.approvalFlow.findUnique({
          where: { documentType_departmentId: { documentType: DOCUMENT_TYPE, departmentId: user.department.id } },
          include: { steps: { select: { id: true } } },
        })
      : null,
    user.department
      ? prisma.documentSequence.findMany({
          where: { documentType: DOCUMENT_TYPE, departmentId: user.department.id },
          select: { year: true, lastNumber: true },
        })
      : [],
  ]);
  res.json({
    units: UNITS,
    items,
    department: user.department,
    hasApprovalFlow: (flow?.steps.length ?? 0) > 0,
    // Nomor urut terakhir per tahun, untuk menampilkan perkiraan nomor PB baru di form
    lastNumbers: Object.fromEntries(sequences.map((s) => [s.year, s.lastNumber])),
  });
});

// GET /api/purchase-requests?scope=all|pending : daftar PB
router.get("/", async (req, res) => {
  const user = req.user!;
  let where: Prisma.PurchaseRequestWhereInput;

  if (req.query.scope === "pending") {
    where = { id: { in: await pendingRequestIds(user.id) } };
  } else if (hasPermission(user, "purchase_request.view_all")) {
    where = {};
  } else {
    const approvedByMe = await prisma.documentApproval.findMany({
      where: { documentType: DOCUMENT_TYPE, approverId: user.id },
      select: { documentId: true },
    });
    where = {
      OR: [
        { createdById: user.id },
        { id: { in: approvedByMe.map((a) => a.documentId) } },
        ...(hasPermission(user, "purchase_request.view") && user.department ? [{ departmentId: user.department.id }] : []),
      ],
    };
  }

  const requests = await prisma.purchaseRequest.findMany({
    where,
    include: { ...requestInclude, items: { select: { id: true } } },
    orderBy: { updatedAt: "desc" },
  });

  // Tahap aktif (untuk menampilkan "Menunggu Checked - Bp Pambudi")
  const active = await prisma.documentApproval.findMany({
    where: {
      documentType: DOCUMENT_TYPE,
      documentId: { in: requests.filter((r) => r.status === "IN_APPROVAL").map((r) => r.id) },
      status: "PENDING",
    },
    include: { approver: { select: { id: true, name: true } } },
  });

  res.json(
    requests.map(({ items, ...pr }) => {
      const step = active.find((a) => a.documentId === pr.id && a.round === pr.round && a.stepOrder === pr.currentStep);
      return {
        ...pr,
        requestDate: toDateString(pr.requestDate),
        itemCount: items.length,
        currentApproval: step ? { stepName: step.stepName, approver: step.approver } : null,
      };
    }),
  );
});

// GET /api/purchase-requests/:id : detail PB + riwayat approval + tindakan yang boleh dilakukan user
router.get("/:id", async (req, res) => {
  const user = req.user!;
  const pr = await prisma.purchaseRequest.findUnique({ where: { id: Number(req.params.id) }, include: requestInclude });
  if (!pr || !(await canView(user, pr))) {
    res.status(404).json({ message: "Permintaan barang tidak ditemukan" });
    return;
  }

  const [approvals, pending] = await Promise.all([
    prisma.documentApproval.findMany({
      where: { documentType: DOCUMENT_TYPE, documentId: pr.id },
      include: { approver: { select: { id: true, name: true } } },
      orderBy: [{ round: "desc" }, { stepOrder: "asc" }],
    }),
    currentApproval(pr),
  ]);

  const isOwner = pr.createdById === user.id && hasPermission(user, "purchase_request.create");
  const editable = pr.status === "DRAFT" || pr.status === "REJECTED";

  res.json({
    ...pr,
    requestDate: toDateString(pr.requestDate),
    items: pr.items.map(lineToResponse),
    approvals,
    actions: {
      canEdit: isOwner && editable,
      canSubmit: isOwner && editable,
      canCancel: isOwner && editable,
      canApprove: pending?.approverId === user.id,
    },
  });
});

// POST /api/purchase-requests : buat PB baru (status Draft)
router.post("/", requirePermission("purchase_request.create"), async (req, res) => {
  const user = req.user!;
  if (!user.department) {
    res.status(400).json({ message: "Akun Anda belum terhubung ke department. Hubungi administrator." });
    return;
  }

  const data = await buildData(req.body as RequestInput);
  if (typeof data === "string") {
    res.status(400).json({ message: data });
    return;
  }

  const department = user.department;
  const requestDate = new Date(todayInJakarta());
  const pr = await prisma.$transaction(async (tx) =>
    tx.purchaseRequest.create({
      data: {
        // Tanggal PB selalu tanggal hari ini (waktu server, WIB), tidak bisa dipilih user
        number: await allocateNumber(tx, department.id, department.name, requestDate),
        requestDate,
        tehaiHyouNo: data.tehaiHyouNo,
        department: { connect: { id: department.id } },
        createdBy: { connect: { id: user.id } },
        items: { create: data.lines },
      },
    }),
  );
  res.status(201).json({ id: pr.id, number: pr.number });
});

// PUT /api/purchase-requests/:id : ubah PB (hanya pembuat, saat Draft atau setelah Ditolak)
router.put("/:id", requirePermission("purchase_request.create"), async (req, res) => {
  const id = Number(req.params.id);
  const pr = await prisma.purchaseRequest.findUnique({ where: { id } });
  if (!pr || pr.createdById !== req.user!.id) {
    res.status(404).json({ message: "Permintaan barang tidak ditemukan" });
    return;
  }
  if (pr.status !== "DRAFT" && pr.status !== "REJECTED") {
    res.status(400).json({ message: "PB yang sedang diproses atau sudah disetujui tidak bisa diubah" });
    return;
  }

  const data = await buildData(req.body as RequestInput);
  if (typeof data === "string") {
    res.status(400).json({ message: data });
    return;
  }

  // Ganti seluruh baris barang dengan isi form terbaru
  await prisma.$transaction([
    prisma.purchaseRequestItem.deleteMany({ where: { purchaseRequestId: id } }),
    prisma.purchaseRequest.update({
      where: { id },
      // Tanggal PB tidak berubah saat diedit
      data: { tehaiHyouNo: data.tehaiHyouNo, items: { create: data.lines } },
    }),
  ]);
  res.json({ id });
});

// POST /api/purchase-requests/:id/cancel : batalkan PB (draft atau setelah ditolak).
// PB tidak dihapus supaya nomornya tidak bolong & tetap ada jejaknya.
router.post("/:id/cancel", requirePermission("purchase_request.create"), async (req, res) => {
  const id = Number(req.params.id);
  const pr = await prisma.purchaseRequest.findUnique({ where: { id } });
  if (!pr || pr.createdById !== req.user!.id) {
    res.status(404).json({ message: "Permintaan barang tidak ditemukan" });
    return;
  }
  const cancelled = await prisma.purchaseRequest.updateMany({
    where: { id, status: { in: ["DRAFT", "REJECTED"] } },
    data: { status: "CANCELLED", currentStep: null },
  });
  if (cancelled.count === 0) {
    res.status(400).json({ message: "Hanya PB berstatus Draft atau Returned yang bisa dibatalkan" });
    return;
  }
  res.json({ message: `PB ${pr.number} dibatalkan (Cancelled)` });
});

// POST /api/purchase-requests/:id/submit : ajukan PB untuk approval
router.post("/:id/submit", requirePermission("purchase_request.create"), async (req, res) => {
  const id = Number(req.params.id);
  const pr = await prisma.purchaseRequest.findUnique({
    where: { id },
    include: { department: true, items: { select: { id: true } } },
  });
  if (!pr || pr.createdById !== req.user!.id) {
    res.status(404).json({ message: "Permintaan barang tidak ditemukan" });
    return;
  }
  if (pr.status !== "DRAFT" && pr.status !== "REJECTED") {
    res.status(400).json({ message: "PB ini sudah diajukan" });
    return;
  }
  if (pr.items.length === 0) {
    res.status(400).json({ message: "Minimal 1 barang wajib diisi" });
    return;
  }

  const flow = await prisma.approvalFlow.findUnique({
    where: { documentType_departmentId: { documentType: DOCUMENT_TYPE, departmentId: pr.departmentId } },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  });
  if (!flow || flow.steps.length === 0) {
    res.status(400).json({
      message: `Alur approval untuk department ${pr.department.name} belum diatur. Hubungi administrator.`,
    });
    return;
  }

  const submitted = await prisma.$transaction(async (tx) => {
    // Kunci status: kalau ada pengajuan bersamaan, hanya satu yang berhasil
    const locked = await tx.purchaseRequest.updateMany({
      where: { id, status: { in: ["DRAFT", "REJECTED"] } },
      data: { status: "IN_APPROVAL" },
    });
    if (locked.count === 0) return null;

    // Salin tahap approval dari alur department saat ini
    const round = pr.round + 1;
    await tx.documentApproval.createMany({
      data: flow.steps.map((step) => ({
        documentType: DOCUMENT_TYPE,
        documentId: id,
        round,
        stepOrder: step.stepOrder,
        stepName: step.name,
        approverId: step.approverId,
      })),
    });

    await tx.purchaseRequest.update({
      where: { id },
      data: {
        round,
        currentStep: flow.steps[0].stepOrder,
        submittedAt: new Date(),
        approvedAt: null,
      },
    });
    return true;
  });

  if (!submitted) {
    res.status(400).json({ message: "PB ini sudah diajukan" });
    return;
  }
  res.json({ message: `PB ${pr.number} berhasil diajukan`, number: pr.number });
});

// POST /api/purchase-requests/:id/approve : setujui tahap yang sedang aktif
router.post("/:id/approve", async (req, res) => {
  const id = Number(req.params.id);
  const notes = (req.body as { notes?: string }).notes?.trim() || null;
  const pr = await prisma.purchaseRequest.findUnique({ where: { id } });
  const pending = pr ? await currentApproval(pr) : null;
  if (!pr || !pending || pending.approverId !== req.user!.id) {
    res.status(403).json({ message: "PB ini tidak sedang menunggu approval Anda" });
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.documentApproval.updateMany({
      where: { id: pending.id, status: "PENDING" },
      data: { status: "APPROVED", notes, actedAt: new Date() },
    });
    if (updated.count === 0) return null;

    const next = await tx.documentApproval.findFirst({
      where: { documentType: DOCUMENT_TYPE, documentId: id, round: pr.round, stepOrder: { gt: pending.stepOrder } },
      orderBy: { stepOrder: "asc" },
    });
    await tx.purchaseRequest.update({
      where: { id },
      data: next
        ? { currentStep: next.stepOrder }
        : { status: "APPROVED", currentStep: null, approvedAt: new Date() },
    });
    return next ? `Disetujui. Diteruskan ke tahap ${next.stepName}.` : "PB disetujui sepenuhnya.";
  });

  if (!result) {
    res.status(409).json({ message: "Tahap ini sudah diproses. Muat ulang halaman." });
    return;
  }
  res.json({ message: result });
});

// POST /api/purchase-requests/:id/reject : tolak, PB kembali ke pembuat untuk direvisi
router.post("/:id/reject", async (req, res) => {
  const id = Number(req.params.id);
  const notes = (req.body as { notes?: string }).notes?.trim();
  if (!notes) {
    res.status(400).json({ message: "Alasan penolakan wajib diisi" });
    return;
  }
  const pr = await prisma.purchaseRequest.findUnique({ where: { id } });
  const pending = pr ? await currentApproval(pr) : null;
  if (!pr || !pending || pending.approverId !== req.user!.id) {
    res.status(403).json({ message: "PB ini tidak sedang menunggu approval Anda" });
    return;
  }

  const ok = await prisma.$transaction(async (tx) => {
    const updated = await tx.documentApproval.updateMany({
      where: { id: pending.id, status: "PENDING" },
      data: { status: "REJECTED", notes, actedAt: new Date() },
    });
    if (updated.count === 0) return false;
    // Tahap setelahnya tidak perlu diproses lagi
    await tx.documentApproval.updateMany({
      where: { documentType: DOCUMENT_TYPE, documentId: id, round: pr.round, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    await tx.purchaseRequest.update({ where: { id }, data: { status: "REJECTED", currentStep: null } });
    return true;
  });

  if (!ok) {
    res.status(409).json({ message: "Tahap ini sudah diproses. Muat ulang halaman." });
    return;
  }
  res.json({ message: "PB dikembalikan (Returned) ke pembuat untuk direvisi." });
});

export default router;
