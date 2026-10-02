import { Router } from "express";
import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { UNITS } from "../lib/units.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

interface ItemInput {
  code?: string;
  name?: string;
  categoryId?: number;
  unit?: string;
  price?: number;
  brand?: string;
  specification?: string;
  supplierId?: number | null;
  isActive?: boolean;
}

const itemInclude = {
  category: { select: { id: true, name: true } },
  supplier: { select: { id: true, code: true, name: true, isActive: true } },
} satisfies Prisma.ItemInclude;

type ItemWithRelations = Prisma.ItemGetPayload<{ include: typeof itemInclude }>;

// Decimal -> number supaya mudah dipakai di frontend
function toResponse(item: ItemWithRelations) {
  return { ...item, price: item.price.toNumber() };
}

async function validate(body: ItemInput, itemId?: number): Promise<string | null> {
  const code = body.code?.trim().toUpperCase();
  if (!code) return "Kode item wajib diisi";
  if (!/^[A-Z0-9_-]{1,30}$/.test(code)) return "Kode hanya boleh huruf, angka, - dan _ (maksimal 30 karakter)";
  if (!body.name?.trim()) return "Nama item wajib diisi";
  if (!body.categoryId || !(await prisma.itemCategory.findUnique({ where: { id: body.categoryId } }))) {
    return "Kategori wajib dipilih";
  }
  if (!body.unit || !(UNITS as readonly string[]).includes(body.unit)) return "Satuan tidak valid";
  if (typeof body.price !== "number" || !Number.isFinite(body.price) || body.price < 0) return "Harga tidak valid";
  if (body.price >= 1e13) return "Harga terlalu besar";
  if (body.supplierId != null && !(await prisma.supplier.findUnique({ where: { id: body.supplierId } }))) {
    return "Supplier tidak ditemukan";
  }

  const sameCode = await prisma.item.findUnique({ where: { code } });
  if (sameCode && sameCode.id !== itemId) return `Kode ${code} sudah dipakai item lain`;
  return null;
}

function toData(body: ItemInput) {
  return {
    code: body.code!.trim().toUpperCase(),
    name: body.name!.trim(),
    categoryId: body.categoryId!,
    unit: body.unit!,
    price: Math.round(body.price! * 100) / 100,
    brand: body.brand?.trim() || null,
    specification: body.specification?.trim() || null,
    supplierId: body.supplierId ?? null,
    isActive: body.isActive ?? true,
  };
}

// GET /api/items : daftar item
router.get("/", requirePermission("item.view"), async (_req, res) => {
  const items = await prisma.item.findMany({ include: itemInclude, orderBy: { code: "asc" } });
  res.json(items.map(toResponse));
});

// GET /api/items/form-options : pilihan untuk form item (satuan, kategori, supplier aktif)
// Dipisah supaya form cukup butuh permission item.manage
router.get("/form-options", requirePermission("item.view", "item.manage"), async (_req, res) => {
  const [categories, suppliers] = await Promise.all([
    prisma.itemCategory.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.supplier.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  res.json({ units: UNITS, categories, suppliers });
});

// POST /api/items : tambah item
router.post("/", requirePermission("item.manage"), async (req, res) => {
  const body = req.body as ItemInput;
  const error = await validate(body);
  if (error) {
    res.status(400).json({ message: error });
    return;
  }
  res.status(201).json(toResponse(await prisma.item.create({ data: toData(body), include: itemInclude })));
});

// PUT /api/items/:id : ubah item
router.put("/:id", requirePermission("item.manage"), async (req, res) => {
  const id = Number(req.params.id);
  if (!(await prisma.item.findUnique({ where: { id } }))) {
    res.status(404).json({ message: "Item tidak ditemukan" });
    return;
  }

  const body = req.body as ItemInput;
  const error = await validate(body, id);
  if (error) {
    res.status(400).json({ message: error });
    return;
  }
  res.json(toResponse(await prisma.item.update({ where: { id }, data: toData(body), include: itemInclude })));
});

// DELETE /api/items/:id : hapus item
// Catatan: setelah modul PO ada, item yang sudah dipakai di PO tidak boleh dihapus (cukup dinonaktifkan).
router.delete("/:id", requirePermission("item.manage"), async (req, res) => {
  const id = Number(req.params.id);
  if (!(await prisma.item.findUnique({ where: { id } }))) {
    res.status(404).json({ message: "Item tidak ditemukan" });
    return;
  }
  await prisma.item.delete({ where: { id } });
  res.json({ message: "Item berhasil dihapus" });
});

export default router;
