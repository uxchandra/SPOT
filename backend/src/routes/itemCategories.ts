import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

interface CategoryInput {
  name?: string;
  description?: string;
}

const categoryInclude = { _count: { select: { items: true } } } as const;

async function validate(body: CategoryInput, categoryId?: number): Promise<string | null> {
  const name = body.name?.trim();
  if (!name) return "Nama kategori wajib diisi";
  if (name.length > 100) return "Nama kategori maksimal 100 karakter";

  const sameName = await prisma.itemCategory.findUnique({ where: { name } });
  if (sameName && sameName.id !== categoryId) return `Kategori ${name} sudah ada`;
  return null;
}

function toData(body: CategoryInput) {
  return { name: body.name!.trim(), description: body.description?.trim() || null };
}

// Sertakan jumlah item di setiap kategori
function toResponse({ _count, ...category }: { _count: { items: number } } & Record<string, unknown>) {
  return { ...category, itemCount: _count.items };
}

// GET /api/item-categories : daftar kategori
router.get("/", requirePermission("item_category.view"), async (_req, res) => {
  const categories = await prisma.itemCategory.findMany({ include: categoryInclude, orderBy: { name: "asc" } });
  res.json(categories.map(toResponse));
});

// POST /api/item-categories : tambah kategori
router.post("/", requirePermission("item_category.manage"), async (req, res) => {
  const body = req.body as CategoryInput;
  const error = await validate(body);
  if (error) {
    res.status(400).json({ message: error });
    return;
  }
  res.status(201).json(toResponse(await prisma.itemCategory.create({ data: toData(body), include: categoryInclude })));
});

// PUT /api/item-categories/:id : ubah kategori
router.put("/:id", requirePermission("item_category.manage"), async (req, res) => {
  const id = Number(req.params.id);
  if (!(await prisma.itemCategory.findUnique({ where: { id } }))) {
    res.status(404).json({ message: "Kategori tidak ditemukan" });
    return;
  }

  const body = req.body as CategoryInput;
  const error = await validate(body, id);
  if (error) {
    res.status(400).json({ message: error });
    return;
  }
  res.json(toResponse(await prisma.itemCategory.update({ where: { id }, data: toData(body), include: categoryInclude })));
});

// DELETE /api/item-categories/:id : hapus kategori (hanya kalau belum dipakai item)
router.delete("/:id", requirePermission("item_category.manage"), async (req, res) => {
  const id = Number(req.params.id);
  const category = await prisma.itemCategory.findUnique({ where: { id }, include: categoryInclude });
  if (!category) {
    res.status(404).json({ message: "Kategori tidak ditemukan" });
    return;
  }
  if (category._count.items > 0) {
    res.status(400).json({
      message: `Kategori masih dipakai ${category._count.items} item. Pindahkan item ke kategori lain terlebih dahulu.`,
    });
    return;
  }
  await prisma.itemCategory.delete({ where: { id } });
  res.json({ message: "Kategori berhasil dihapus" });
});

export default router;
