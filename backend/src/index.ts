import "dotenv/config";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import approvalFlowRoutes from "./routes/approvalFlows.js";
import authRoutes from "./routes/auth.js";
import departmentRoutes from "./routes/departments.js";
import itemCategoryRoutes from "./routes/itemCategories.js";
import itemRoutes from "./routes/items.js";
import purchaseRequestRoutes from "./routes/purchaseRequests.js";
import roleRoutes from "./routes/roles.js";
import supplierRoutes from "./routes/suppliers.js";
import userRoutes from "./routes/users.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;
// 0.0.0.0 = bisa diakses dari komputer lain lewat IP server (bukan hanya localhost)
const HOST = process.env.HOST || "0.0.0.0";
// Folder hasil build frontend (npm run build di folder frontend)
const FRONTEND_DIST = process.env.FRONTEND_DIST
  ? path.resolve(process.env.FRONTEND_DIST)
  : path.resolve(import.meta.dirname, "../../frontend/dist");

app.use(express.json());
// Express 5: req.body bernilai undefined kalau request tidak punya body JSON.
// Jadikan objek kosong supaya route bisa langsung membaca req.body.xxx tanpa crash.
app.use((req, _res, next) => {
  req.body ??= {};
  next();
});
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/item-categories", itemCategoryRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/purchase-requests", purchaseRequestRoutes);
app.use("/api/approval-flows", approvalFlowRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);

// Endpoint API yang tidak ada -> JSON 404 (bukan halaman frontend)
app.use("/api", (_req, res) => {
  res.status(404).json({ message: "Endpoint tidak ditemukan" });
});

// Production: Express sekaligus menyajikan tampilan (hasil build React), jadi cukup 1 server & 1 port.
// Saat development folder ini tidak ada, tampilan disajikan Vite (npm run dev di folder frontend).
const servesFrontend = fs.existsSync(path.join(FRONTEND_DIST, "index.html"));
if (servesFrontend) {
  app.use(express.static(FRONTEND_DIST));
  // Semua halaman (/dashboard, /purchase-requests/12, ...) memakai index.html; routing diurus React
  app.get(/^(?!\/api(\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  });
}

// Penangkap error terakhir: error dari route (misalnya query database gagal) dikembalikan sebagai JSON
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "Terjadi kesalahan pada server" });
});

app.listen(PORT, HOST, () => {
  console.log(`Backend berjalan di http://localhost:${PORT}`);
  if (servesFrontend) console.log(`Tampilan (frontend) disajikan dari ${FRONTEND_DIST}`);
  // Tampilkan alamat IP jaringan, supaya tahu alamat yang dibuka dari komputer lain
  if (HOST === "0.0.0.0") {
    for (const addresses of Object.values(os.networkInterfaces())) {
      for (const address of addresses ?? []) {
        if (address.family === "IPv4" && !address.internal) {
          console.log(`  Dari komputer lain di jaringan: http://${address.address}:${PORT}`);
        }
      }
    }
  }
});
