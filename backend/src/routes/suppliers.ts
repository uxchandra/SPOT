import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

interface SupplierInput {
  code?: string;
  name?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  npwp?: string;
  isActive?: boolean;
}

const supplierInclude = { _count: { select: { items: true } } } as const;

async function validate(body: SupplierInput, supplierId?: number): Promise<string | null> {
  const code = body.code?.trim().toUpperCase();
  if (!code) return "Kode supplier wajib diisi";
  if (!/^[A-Z0-9_-]{1,20}$/.test(code)) return "Kode hanya boleh huruf, angka, - dan _ (maksimal 20 karakter)";
  if (!body.name?.trim()) return "Nama supplier wajib diisi";
  if (body.email?.trim() && !/^\S+@\S+\.\S+$/.test(body.email.trim())) return "Email tidak valid";
  if (body.phone?.trim() && !/^[0-9+()\-\s]{6,30}$/.test(body.phone.trim())) return "Nomor telepon tidak valid";
  if (body.npwp?.trim() && !/^[0-9.\-]{15,25}$/.test(body.npwp.trim())) return "Format NPWP tidak valid";

  const sameCode = await prisma.supplier.findUnique({ where: { code } });
  if (sameCode && sameCode.id !== supplierId) return `Kode ${code} sudah dipakai supplier lain`;
  return null;
}

function toData(body: SupplierInput) {
  return {
    code: body.code!.trim().toUpperCase(),
    name: body.name!.trim(),
    contactPerson: body.contactPerson?.trim() || null,
    phone: body.phone?.trim() || null,
    email: body.email?.trim() || null,
    address: body.address?.trim() || null,
    npwp: body.npwp?.trim() || null,
    isActive: body.isActive ?? true,
  };
}

function toResponse({ _count, ...supplier }: { _count: { items: number } } & Record<string, unknown>) {
  return { ...supplier, itemCount: _count.items };
}

// GET /api/suppliers : daftar supplier
router.get("/", requirePermission("supplier.view"), async (_req, res) => {
  const suppliers = await prisma.supplier.findMany({ include: supplierInclude, orderBy: { code: "asc" } });
  res.json(suppliers.map(toResponse));
});

// POST /api/suppliers : tambah supplier
router.post("/", requirePermission("supplier.manage"), async (req, res) => {
  const body = req.body as SupplierInput;
  const error = await validate(body);
  if (error) {
    res.status(400).json({ message: error });
    return;
  }
  res.status(201).json(toResponse(await prisma.supplier.create({ data: toData(body), include: supplierInclude })));
});

// PUT /api/suppliers/:id : ubah supplier
router.put("/:id", requirePermission("supplier.manage"), async (req, res) => {
  const id = Number(req.params.id);
  if (!(await prisma.supplier.findUnique({ where: { id } }))) {
    res.status(404).json({ message: "Supplier tidak ditemukan" });
    return;
  }

  const body = req.body as SupplierInput;
  const error = await validate(body, id);
  if (error) {
    res.status(400).json({ message: error });
    return;
  }
  res.json(toResponse(await prisma.supplier.update({ where: { id }, data: toData(body), include: supplierInclude })));
});

// DELETE /api/suppliers/:id : hapus supplier (hanya kalau belum dipakai item; selain itu nonaktifkan saja)
router.delete("/:id", requirePermission("supplier.manage"), async (req, res) => {
  const id = Number(req.params.id);
  const supplier = await prisma.supplier.findUnique({ where: { id }, include: supplierInclude });
  if (!supplier) {
    res.status(404).json({ message: "Supplier tidak ditemukan" });
    return;
  }
  if (supplier._count.items > 0) {
    res.status(400).json({
      message: `Supplier masih menjadi supplier utama ${supplier._count.items} item. Nonaktifkan saja supplier ini, atau ganti supplier di item tersebut.`,
    });
    return;
  }
  await prisma.supplier.delete({ where: { id } });
  res.json({ message: "Supplier berhasil dihapus" });
});

export default router;
