// Seeder: isi data awal role, permission & user admin.
// Aman dijalankan berulang kali. Jalankan: npm run db:seed
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";
import { ADMIN_ROLE, DEFAULT_ROLES, PERMISSIONS } from "../src/lib/permissions.js";

async function main() {
  // 1. Permission: samakan dengan daftar di kode (tambah yang baru, hapus yang sudah tidak ada)
  for (const [name, description] of Object.entries(PERMISSIONS)) {
    await prisma.permission.upsert({
      where: { name },
      update: { description },
      create: { name, description },
    });
  }
  await prisma.permission.deleteMany({ where: { name: { notIn: Object.keys(PERMISSIONS) } } });

  // 2. Role bawaan: hanya dibuat kalau belum ada, supaya pengaturan dari halaman Role tidak tertimpa
  for (const [name, { description, permissions }] of Object.entries(DEFAULT_ROLES)) {
    const exists = await prisma.role.findUnique({ where: { name } });
    if (exists) continue;
    const permissionRows = await prisma.permission.findMany({ where: { name: { in: permissions } } });
    await prisma.role.create({
      data: {
        name,
        description,
        permissions: { create: permissionRows.map((p) => ({ permissionId: p.id })) },
      },
    });
  }

  // 3. Role admin selalu punya semua permission (termasuk permission yang baru ditambahkan)
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: ADMIN_ROLE } });
  const allPermissions = await prisma.permission.findMany();
  await prisma.rolePermission.createMany({
    data: allPermissions.map((p) => ({ roleId: adminRole.id, permissionId: p.id })),
    skipDuplicates: true,
  });

  // 4. User admin awal (hanya dibuat kalau belum ada, password tidak ditimpa)
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@pud.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: "Administrator",
      email,
      password: await bcrypt.hash(password, 10),
      roleId: adminRole.id,
    },
  });

  console.log(`Seeder selesai. Login admin: ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
