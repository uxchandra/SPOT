import "dotenv/config";
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

// Penangkap error terakhir: error dari route (misalnya query database gagal) dikembalikan sebagai JSON
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "Terjadi kesalahan pada server" });
});

app.listen(PORT, () => {
  console.log(`Backend berjalan di http://localhost:${PORT}`);
});
