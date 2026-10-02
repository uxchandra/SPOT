import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import type { PermissionName } from "../lib/permissions.js";

export const AUTH_COOKIE = "token";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET belum diisi di file .env");
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  department: { id: number; code: string; name: string } | null; // department tempat user bekerja
  isApprover: boolean; // ditunjuk sebagai approver di salah satu alur approval
}

// Tambahkan properti req.user ke tipe Request milik Express
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, JWT_SECRET!, { expiresIn: "8h" });
}

// Ambil user beserta role & permission-nya dari database
export async function loadAuthUser(userId: number): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
      department: { select: { id: true, code: true, name: true } },
      _count: { select: { approvalSteps: true } },
    },
  });
  if (!user || !user.isActive) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.name,
    permissions: user.role.permissions.map((rp) => rp.permission.name),
    department: user.department,
    isApprover: user._count.approvalSteps > 0,
  };
}

// Wajib login. User dibaca ulang dari database setiap request,
// jadi perubahan role/permission atau user dinonaktifkan langsung berlaku.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) {
    res.status(401).json({ message: "Silakan login terlebih dahulu" });
    return;
  }

  let userId: number;
  try {
    const payload = jwt.verify(token, JWT_SECRET!) as jwt.JwtPayload;
    userId = Number(payload.sub);
  } catch {
    res.status(401).json({ message: "Sesi berakhir, silakan login kembali" });
    return;
  }

  const user = await loadAuthUser(userId);
  if (!user) {
    res.status(401).json({ message: "User tidak ditemukan atau tidak aktif" });
    return;
  }

  req.user = user;
  next();
}

// Wajib punya permission tertentu (kalau diisi beberapa, cukup punya salah satunya).
// Pakai setelah requireAuth.
export function requirePermission(...permissions: PermissionName[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!permissions.some((p) => req.user?.permissions.includes(p))) {
      res.status(403).json({ message: "Anda tidak memiliki akses untuk tindakan ini" });
      return;
    }
    next();
  };
}
