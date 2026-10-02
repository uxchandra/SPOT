import bcrypt from "bcryptjs";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { AUTH_COOKIE, loadAuthUser, requireAuth, signToken } from "../middleware/auth.js";

const router = Router();

const cookieOptions = {
  httpOnly: true, // tidak bisa dibaca JavaScript di browser (aman dari XSS)
  sameSite: "lax" as const,
  // secure = cookie hanya dikirim lewat HTTPS. Default: aktif di production.
  // Kalau aplikasi diakses lewat http://IP-server (tanpa HTTPS), set COOKIE_SECURE=false di .env.
  secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : process.env.NODE_ENV === "production",
  maxAge: 8 * 60 * 60 * 1000, // 8 jam, sama dengan masa berlaku token
};

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ message: "Email dan password wajib diisi" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Pesan error dibuat sama supaya tidak membocorkan email mana yang terdaftar
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ message: "Email atau password salah" });
    return;
  }

  res.cookie(AUTH_COOKIE, signToken(user.id), cookieOptions);
  res.json(await loadAuthUser(user.id));
});

// POST /api/auth/logout
router.post("/logout", (_req, res) => {
  res.clearCookie(AUTH_COOKIE, { ...cookieOptions, maxAge: undefined });
  res.json({ message: "Berhasil logout" });
});

// GET /api/auth/me : data user yang sedang login + permission-nya
router.get("/me", requireAuth, (req, res) => {
  res.json(req.user);
});

export default router;
