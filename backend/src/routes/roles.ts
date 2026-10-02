import { Router } from "express";
import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { ADMIN_ROLE, permissionGroup } from "../lib/permissions.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

interface RoleInput {
  name?: string;
  description?: string;
  permissions?: string[]; // nama permission, contoh: ["department.view", "user.manage"]
}

const roleInclude = {
  permissions: { include: { permission: true } },
  _count: { select: { users: true } },
} satisfies Prisma.RoleInclude;

type RoleWithPermissions = Prisma.RoleGetPayload<{ include: typeof roleInclude }>;

function toResponse(role: RoleWithPermissions) {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    isSystem: role.name === ADMIN_ROLE,
    userCount: role._count.users,
    permissions: role.permissions.map((rp) => rp.permission.name),
  };
}

async function validate(body: RoleInput, roleId?: number): Promise<string | null> {
  const name = body.name?.trim();
  if (!name) return "Nama role wajib diisi";
  if (!/^[a-z0-9_-]+$/.test(name)) return "Nama role hanya boleh huruf kecil, angka, - dan _";
  if (!Array.isArray(body.permissions)) return "Permission tidak valid";

  const sameName = await prisma.role.findUnique({ where: { name } });
  if (sameName && sameName.id !== roleId) return "Nama role sudah dipakai";
  return null;
}

// Ubah daftar nama permission menjadi baris role_permissions
async function permissionLinks(names: string[]) {
  const rows = await prisma.permission.findMany({ where: { name: { in: names } } });
  return rows.map((p) => ({ permissionId: p.id }));
}

// GET /api/roles : daftar role. Juga dipakai halaman User untuk pilihan role.
router.get("/", requirePermission("user.manage", "role.manage"), async (_req, res) => {
  const roles = await prisma.role.findMany({ include: roleInclude, orderBy: { id: "asc" } });
  res.json(roles.map(toResponse));
});

// GET /api/roles/permissions : semua permission yang tersedia, untuk pilihan centang
router.get("/permissions", requirePermission("role.manage"), async (_req, res) => {
  const permissions = await prisma.permission.findMany({ orderBy: { id: "asc" } });
  res.json(
    permissions.map((p) => ({ name: p.name, description: p.description, group: permissionGroup(p.name) })),
  );
});

// POST /api/roles : tambah role
router.post("/", requirePermission("role.manage"), async (req, res) => {
  const body = req.body as RoleInput;
  const error = await validate(body);
  if (error) {
    res.status(400).json({ message: error });
    return;
  }

  const role = await prisma.role.create({
    data: {
      name: body.name!.trim(),
      description: body.description?.trim() || null,
      permissions: { create: await permissionLinks(body.permissions!) },
    },
    include: roleInclude,
  });
  res.status(201).json(toResponse(role));
});

// PUT /api/roles/:id : ubah role & permission-nya
router.put("/:id", requirePermission("role.manage"), async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body as RoleInput;

  const existing = await prisma.role.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ message: "Role tidak ditemukan" });
    return;
  }
  if (existing.name === ADMIN_ROLE) {
    res.status(400).json({ message: "Role admin adalah role sistem dan tidak bisa diubah" });
    return;
  }

  const error = await validate(body, id);
  if (error) {
    res.status(400).json({ message: error });
    return;
  }

  // Ganti seluruh permission role ini dengan yang dicentang
  const role = await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId: id } });
    return tx.role.update({
      where: { id },
      data: {
        name: body.name!.trim(),
        description: body.description?.trim() || null,
        permissions: { create: await permissionLinks(body.permissions!) },
      },
      include: roleInclude,
    });
  });
  res.json(toResponse(role));
});

// DELETE /api/roles/:id : hapus role (hanya kalau tidak ada user yang memakainya)
router.delete("/:id", requirePermission("role.manage"), async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.role.findUnique({ where: { id }, include: roleInclude });
  if (!existing) {
    res.status(404).json({ message: "Role tidak ditemukan" });
    return;
  }
  if (existing.name === ADMIN_ROLE) {
    res.status(400).json({ message: "Role admin adalah role sistem dan tidak bisa dihapus" });
    return;
  }
  if (existing._count.users > 0) {
    res.status(400).json({
      message: `Role masih dipakai ${existing._count.users} user. Pindahkan user ke role lain terlebih dahulu.`,
    });
    return;
  }

  await prisma.role.delete({ where: { id } });
  res.json({ message: "Role berhasil dihapus" });
});

export default router;
