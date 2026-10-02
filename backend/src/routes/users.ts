import bcrypt from "bcryptjs";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requirePermission("user.manage"));

interface UserInput {
  name?: string;
  email?: string;
  password?: string;
  roleId?: number;
  departmentId?: number | null;
  isActive?: boolean;
}

const MIN_PASSWORD_LENGTH = 8;

// Kolom yang dikirim ke frontend (password tidak pernah ikut dikirim)
const userSelect = {
  id: true,
  name: true,
  email: true,
  isActive: true,
  createdAt: true,
  role: { select: { id: true, name: true } },
  department: { select: { id: true, code: true, name: true } },
} as const;

// Validasi input. Mengembalikan pesan error, atau null kalau valid.
async function validate(body: UserInput, userId?: number): Promise<string | null> {
  const isNew = userId === undefined;
  if (!body.name?.trim()) return "Nama wajib diisi";
  if (!body.email?.trim() || !/^\S+@\S+\.\S+$/.test(body.email)) return "Email tidak valid";
  if (isNew && !body.password) return "Password wajib diisi";
  if (body.password && body.password.length < MIN_PASSWORD_LENGTH) {
    return `Password minimal ${MIN_PASSWORD_LENGTH} karakter`;
  }
  if (!body.roleId || !(await prisma.role.findUnique({ where: { id: body.roleId } }))) return "Role tidak valid";
  if (body.departmentId != null && !(await prisma.department.findUnique({ where: { id: body.departmentId } }))) {
    return "Department tidak valid";
  }

  const sameEmail = await prisma.user.findUnique({ where: { email: body.email.trim() } });
  if (sameEmail && sameEmail.id !== userId) return "Email sudah dipakai user lain";
  return null;
}

// GET /api/users/department-options : pilihan department untuk form user
router.get("/department-options", async (_req, res) => {
  res.json(await prisma.department.findMany({ select: { id: true, code: true, name: true }, orderBy: { name: "asc" } }));
});

// GET /api/users : daftar user
router.get("/", async (_req, res) => {
  res.json(await prisma.user.findMany({ select: userSelect, orderBy: { name: "asc" } }));
});

// POST /api/users : tambah user
router.post("/", async (req, res) => {
  const body = req.body as UserInput;
  const error = await validate(body);
  if (error) {
    res.status(400).json({ message: error });
    return;
  }

  const user = await prisma.user.create({
    data: {
      name: body.name!.trim(),
      email: body.email!.trim(),
      password: await bcrypt.hash(body.password!, 10),
      roleId: body.roleId!,
      departmentId: body.departmentId ?? null,
      isActive: body.isActive ?? true,
    },
    select: userSelect,
  });
  res.status(201).json(user);
});

// PUT /api/users/:id : ubah user. Password hanya diganti kalau diisi.
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body as UserInput;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ message: "User tidak ditemukan" });
    return;
  }

  const error = await validate(body, id);
  if (error) {
    res.status(400).json({ message: error });
    return;
  }

  // Cegah admin mengunci dirinya sendiri
  if (id === req.user!.id) {
    if (body.isActive === false) {
      res.status(400).json({ message: "Anda tidak bisa menonaktifkan akun sendiri" });
      return;
    }
    if (body.roleId !== existing.roleId) {
      res.status(400).json({ message: "Anda tidak bisa mengubah role akun sendiri" });
      return;
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      name: body.name!.trim(),
      email: body.email!.trim(),
      roleId: body.roleId!,
      departmentId: body.departmentId ?? null,
      isActive: body.isActive ?? existing.isActive,
      ...(body.password ? { password: await bcrypt.hash(body.password, 10) } : {}),
    },
    select: userSelect,
  });
  res.json(user);
});

export default router;
