# SPOT (STEP Purchasing Online Tool)

Aplikasi untuk digitalisasi pembuatan Purchase Order (PO).

Nama aplikasi yang tampil di sidebar & halaman login diatur di `frontend/src/lib/app.ts`.

- `frontend/`: React + Vite + TypeScript, UI shadcn/ui + Tailwind CSS, React Router (port 5173)
- `backend/`: Express + TypeScript, MySQL via Prisma ORM 7 (port 3000)

## Setup pertama kali

1. Jalankan MySQL (misalnya lewat Laragon), lalu buat database:
   ```sql
   CREATE DATABASE pud_online_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. Siapkan backend:
   ```bash
   cd backend
   npm install              # sekaligus menjalankan prisma generate
   cp .env.example .env     # isi JWT_SECRET, sesuaikan DATABASE_URL jika perlu
   npm run db:deploy        # buat tabel di database dari folder prisma/migrations
   npm run db:seed          # isi role, permission & user admin awal
   ```
3. Siapkan frontend:
   ```bash
   cd frontend
   npm install
   ```

## Menjalankan aplikasi (mode development)

Buka **dua terminal**.

Terminal 1, backend:

```bash
cd backend
npm run dev
```

Terminal 2, frontend:

```bash
cd frontend
npm run dev
```

Lalu buka http://localhost:5173 dan login dengan akun admin awal:

- Email: `admin@pud.local`
- Password: `admin123` (**segera ganti** untuk server sungguhan; diatur lewat `SEED_ADMIN_*` di `.env`)

Request dari frontend ke `/api/...` otomatis diteruskan ke backend (lihat `proxy` di `frontend/vite.config.ts`).

## Deploy ke server (Windows, diakses lewat IP)

Di server, backend Express sekaligus menyajikan tampilan (hasil build React), jadi cukup **1 program & 1 port**,
tanpa Apache/Nginx. Komputer lain di jaringan kantor membuka `http://IP-SERVER:PORT`, contoh `http://192.168.88.8:3000`.

Semua perintah di bawah dijalankan di **PowerShell** pada server.

### Langkah 0: Siapkan aplikasi pendukung di server

| Aplikasi | Keterangan | Cek versi |
| -------- | ---------- | --------- |
| Git | untuk `git clone` / `git pull` | `git --version` |
| Node.js versi 24 (LTS) | samakan dengan versi saat development | `node -v` |
| MySQL 8 | boleh lewat Laragon | `mysql --version` |

### Langkah 1: Clone project dari GitHub

```powershell
cd C:\apps                     # folder bebas, contoh C:\apps
git clone https://github.com/uxchandra/SPOT.git
cd SPOT
```

Kalau repository-nya **private**, Git akan meminta login GitHub. Pakai akun yang punya akses ke repo
(password diganti **Personal Access Token**: GitHub → Settings → Developer settings → Personal access tokens).

### Langkah 2: Buat database

Jalankan di MySQL (HeidiSQL / phpMyAdmin / command line):

```sql
CREATE DATABASE pud_online_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Sebaiknya buat juga user MySQL khusus aplikasi (jangan pakai root tanpa password di server).

### Langkah 3: Build frontend (tampilan)

```powershell
cd C:\apps\SPOT\frontend
npm ci
npm run build                  # hasil: folder frontend\dist
```

### Langkah 4: Setup backend

```powershell
cd C:\apps\SPOT\backend
npm ci                         # install library + generate Prisma Client
Copy-Item .env.example .env
notepad .env                   # isi seperti contoh di bawah, lalu simpan
```

Isi `backend\.env`:

```env
PORT=3000
NODE_ENV=production
COOKIE_SECURE=false
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/pud_online_system"
JWT_SECRET="isi-dengan-string-acak-baru"
SEED_ADMIN_EMAIL="admin@pud.local"
SEED_ADMIN_PASSWORD="ganti-password-awal-admin"
```

- `COOKIE_SECURE=false` **wajib** selama aplikasi diakses lewat `http://` (tanpa HTTPS); kalau tidak, user tidak bisa login.
- `JWT_SECRET` buat yang **baru** (jangan sama dengan komputer development). Hasilkan dengan:
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `PORT=80` boleh dipakai supaya user cukup membuka `http://IP-SERVER`, asal port 80 tidak dipakai program lain (Apache/IIS/Laragon).
- File `.env` **tidak ikut** di GitHub. Simpan cadangannya di tempat aman.

Lanjutkan:

```powershell
npm run build                  # hasil: folder backend\dist
npm run db:deploy              # membuat semua tabel
npm run db:seed                # sekali saja di awal: role, permission & akun admin
```

### Langkah 5: Coba jalankan

```powershell
node dist/index.js
```

Kalau berhasil, muncul:

```
Backend berjalan di http://localhost:3000
Tampilan (frontend) disajikan dari C:\apps\SPOT\frontend\dist
  Dari komputer lain di jaringan: http://192.168.88.8:3000
```

Buka alamat tersebut di browser server, coba login, lalu hentikan dengan `Ctrl + C`.

### Langkah 6: Jalankan permanen dengan PM2

PM2 menjaga aplikasi tetap hidup: restart otomatis kalau crash dan ikut menyala saat Windows restart.

```powershell
npm install -g pm2 pm2-windows-startup
cd C:\apps\SPOT\backend
pm2 start dist/index.js --name spot
pm2 save
pm2-startup install
```

Perintah PM2 yang sering dipakai: `pm2 status`, `pm2 logs spot`, `pm2 restart spot`, `pm2 stop spot`.

### Langkah 7: Buka port di Windows Firewall

PowerShell **sebagai Administrator** (sesuaikan nomor port dengan `PORT` di `.env`):

```powershell
New-NetFirewallRule -DisplayName "SPOT" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

### Langkah 8: Cek dari komputer lain

1. Buka `http://IP-SERVER:3000` dari komputer lain di jaringan kantor.
2. Login dengan akun admin dari `.env`, lalu **segera ganti password admin** (menu User).
3. Isi data awal: Department → User (beserta department-nya) → Alur Approval → Kategori Item, Supplier, Item List.

Minta tim IT memberi server **IP tetap (static IP)** supaya alamat aplikasi tidak berubah.

### Update aplikasi (setelah ada perubahan di GitHub)

```powershell
cd C:\apps\SPOT
git pull

cd frontend
npm ci
npm run build

cd ..\backend
npm ci
npm run build
npm run db:deploy              # menjalankan migration baru (kalau ada)
pm2 restart spot
```

`npm run db:seed` hanya perlu dijalankan lagi kalau ada **permission baru**; aman dijalankan berulang
(tidak menimpa pengaturan role yang sudah diubah lewat layar).

### Kalau ada masalah

| Gejala | Penyebab & solusi |
| ------ | ----------------- |
| Komputer lain tidak bisa membuka aplikasi | Port belum dibuka di firewall (Langkah 7), atau IP server salah. Cek alamat di `pm2 logs spot` |
| Login berhasil tapi langsung kembali ke halaman login | `COOKIE_SECURE=false` belum diisi di `.env`. Setelah diubah: `pm2 restart spot` |
| Pesan "Tidak dapat terhubung ke server" | Backend mati: cek `pm2 status` & `pm2 logs spot` |
| Error database saat start / `db:deploy` | `DATABASE_URL` salah, database belum dibuat, atau MySQL belum jalan |
| `EADDRINUSE` di log | Port sudah dipakai program lain. Ganti `PORT` di `.env` (dan aturan firewall), lalu `pm2 restart spot` |
| Halaman masih versi lama setelah update | Tekan `Ctrl + F5` di browser; pastikan `npm run build` di folder frontend sudah dijalankan |

## Login, role & permission

- Login memakai token JWT yang disimpan di cookie `httpOnly` (berlaku 8 jam).
- Setiap user punya **1 role**, setiap role punya **banyak permission**.
- Daftar permission & role bawaan ada di `backend/src/lib/permissions.ts`. Setelah mengubahnya, jalankan `npm run db:seed`.
- Backend: lindungi endpoint dengan `requireAuth` dan `requirePermission("nama.permission")` (`backend/src/middleware/auth.ts`).
- Frontend: sembunyikan tombol/menu dengan `can("nama.permission")` dari `useAuth()`. Ini hanya untuk tampilan; keamanan tetap dicek di backend.

| Role     | Permission                                  |
| -------- | ------------------------------------------- |
| admin    | semua (role sistem, tidak bisa diubah/dihapus) |
| staff    | semua `.view` di Data Master, `purchase_request.view`, `purchase_request.create` |
| approver | semua `.view` di Data Master, `purchase_request.view` |

### Menu Data Master

- **Department** (`department.view` untuk melihat, `department.manage` untuk tambah/edit/hapus):
  kode unik (otomatis huruf besar), nama, deskripsi, jabatan (`position`), dan user pemegang jabatan (`user_id`).
  Jabatan dan user boleh kosong. Kalau user pemegang jabatan dihapus dari database, `user_id` otomatis menjadi kosong.
- **Kategori Item** (`item_category.view` / `item_category.manage`): nama unik dan deskripsi.
  Kategori yang masih dipakai item tidak bisa dihapus.
- **Supplier** (`supplier.view` / `supplier.manage`): kode, nama, contact person, telepon, email, alamat, NPWP, status aktif.
  Supplier yang masih menjadi supplier utama sebuah item tidak bisa dihapus; nonaktifkan saja.
- **Item List** (`item.view` / `item.manage`): kode, nama, kategori, satuan, harga acuan, merk, spesifikasi,
  supplier utama (opsional), status aktif. Daftar satuan ada di `backend/src/lib/units.ts`.
  Harga di sini adalah **harga acuan**; saat dipakai di PO nanti, harga disalin ke PO dan bisa diubah di sana.

### Menu Transaksi: Permintaan Barang (PB)

Alur: **Draft → Ajukan → tahap approval berurutan (contoh Checked → Approved) → Disetujui**.
Kalau ditolak (wajib isi alasan), PB kembali ke pembuat untuk direvisi lalu diajukan ulang.

- Pembuat (`purchase_request.create`) harus terhubung ke department (diatur di menu User).
  PB dibuat atas nama department si pembuat.
- Nomor diberikan saat PB **pertama kali disimpan**: `{urut}/{nama dept}/{bulan}/{tahun}`, contoh `101/PUD/08/2026`.
  Nomor urut per department, di-reset setiap tahun. Form Buat PB menampilkan perkiraan nomornya.
- PB tidak bisa dihapus; PB berstatus Draft/Ditolak bisa **dibatalkan** (status Dibatalkan) supaya nomor
  tidak bolong dan jejaknya tetap ada.
- Tanggal pemakaian wajib diisi di setiap baris.
- Barang bisa dipilih dari Item List (kode & satuan terisi otomatis) atau diketik manual.
  Kode, nama & satuan disalin ke PB, jadi perubahan Item List tidak mengubah PB lama.
- Siapa yang bisa melihat PB: semua department (`purchase_request.view_all`), department sendiri
  (`purchase_request.view`), pembuatnya, dan approver PB tersebut.
- Approver **tidak butuh permission khusus**: cukup ditunjuk di Alur Approval. PB yang menunggu
  approval muncul di tab "Menunggu Approval Saya", badge di sidebar, dan kartu di dashboard.

### Menu Pengaturan: Alur Approval

`approval_flow.manage`: atur tahap approval PB per department (nama tahap + 1 approver per tahap).
Tahap disalin ke PB saat diajukan, jadi perubahan alur tidak memengaruhi PB yang sedang diproses.
Department tanpa alur approval tidak bisa mengajukan PB.

Tabel approval (`approval_flows`, `document_approvals`, `document_sequences`) dibuat generik dengan
kolom `document_type`, supaya nanti PO bisa memakai mekanisme yang sama.

### Menu Manajemen User

- **User** (`user.manage`): tambah/edit user, pilih role, aktif/nonaktifkan, ganti password.
  Admin tidak bisa menonaktifkan atau mengganti role akunnya sendiri.
- **Role** (`role.manage`): tambah/edit/hapus role dan centang permission-nya per modul.
  Role yang masih dipakai user tidak bisa dihapus.

Permission **tidak** dibuat dari layar karena setiap permission terikat ke kode. Untuk fitur baru:
tambahkan permission di `backend/src/lib/permissions.ts` (beserta grupnya di `PERMISSION_GROUPS`),
pakai di kode, lalu jalankan `npm run db:seed`. Permission baru otomatis diberikan ke role admin
dan muncul sebagai pilihan centang di halaman Role. Seeder tidak menimpa pengaturan role yang sudah diubah lewat layar.

## Struktur frontend

| Lokasi                             | Isi                                                          |
| ---------------------------------- | ------------------------------------------------------------ |
| `src/App.tsx`                      | Daftar halaman (route)                                       |
| `src/layouts/AdminLayout.tsx`      | Layout admin panel: sidebar + header + breadcrumb            |
| `src/lib/menu.tsx`                 | Daftar menu sidebar (bisa dibatasi per permission)          |
| `src/pages/`                       | Halaman: login, dashboard, data master, user, role           |
| `src/components/ui/`               | Komponen shadcn/ui (tambah lewat `npx shadcn@latest add ...`) |
| `src/lib/theme.tsx`                | Tema terang/gelap (default terang, pilihan disimpan di browser) |

Tema gelap memakai warna bawaan shadcn di `src/index.css` (blok `.dark`). Kalau menambah warna custom
(contoh `bg-amber-50`), tambahkan juga versi gelapnya (contoh `dark:bg-amber-950`).

Menambah halaman baru: buat file di `src/pages/`, daftarkan di `src/App.tsx`, lalu tambahkan menunya di `src/lib/menu.tsx`.

## Endpoint API

| Method | URL                              | Permission                 | Fungsi                     |
| ------ | -------------------------------- | -------------------------- | -------------------------- |
| GET    | /api/health                      | -                          | Cek server hidup           |
| POST   | /api/auth/login                  | -                          | Login                      |
| POST   | /api/auth/logout                 | -                          | Logout                     |
| GET    | /api/auth/me                     | login                      | Data user + permission     |
| GET    | /api/departments                 | `department.view`          | Daftar department          |
| GET    | /api/departments/user-options    | `department.manage`        | Pilihan user aktif untuk form |
| GET / POST / PUT / DELETE | /api/item-categories(/:id) | `item_category.view` / `.manage` | Kategori item |
| GET / POST / PUT / DELETE | /api/suppliers(/:id)       | `supplier.view` / `.manage`      | Supplier      |
| GET / POST / PUT / DELETE | /api/items(/:id)           | `item.view` / `.manage`          | Item          |
| GET    | /api/items/form-options          | `item.view` / `item.manage`| Pilihan satuan, kategori, supplier aktif |
| GET    | /api/purchase-requests?scope=all\|pending | lihat penjelasan PB | Daftar PB / yang menunggu approval saya |
| GET    | /api/purchase-requests/pending-count | login                  | Jumlah PB menunggu approval saya |
| GET    | /api/purchase-requests/form-options | `purchase_request.create` | Pilihan item, satuan, info department |
| GET    | /api/purchase-requests/:id       | lihat penjelasan PB        | Detail + riwayat approval + tindakan yang boleh |
| POST / PUT | /api/purchase-requests(/:id) | `purchase_request.create` (pembuat) | Buat (langsung bernomor) / ubah |
| POST   | /api/purchase-requests/:id/cancel | `purchase_request.create` (pembuat) | Batalkan PB Draft/Ditolak |
| POST   | /api/purchase-requests/:id/submit | `purchase_request.create` (pembuat) | Ajukan / ajukan ulang |
| POST   | /api/purchase-requests/:id/approve | approver tahap aktif     | Setujui (catatan opsional) |
| POST   | /api/purchase-requests/:id/reject  | approver tahap aktif     | Tolak (alasan wajib) |
| GET / PUT | /api/approval-flows(/:departmentId) | `approval_flow.manage` | Lihat / simpan alur approval |
| POST   | /api/departments                 | `department.manage`        | Tambah department          |
| PUT    | /api/departments/:id             | `department.manage`        | Ubah department            |
| DELETE | /api/departments/:id             | `department.manage`        | Hapus department           |
| GET    | /api/users                       | `user.manage`              | Daftar user                |
| POST   | /api/users                       | `user.manage`              | Tambah user                |
| PUT    | /api/users/:id                   | `user.manage`              | Ubah user                  |
| GET    | /api/roles                       | `user.manage` / `role.manage` | Daftar role             |
| GET    | /api/roles/permissions           | `role.manage`              | Semua permission tersedia  |
| POST   | /api/roles                       | `role.manage`              | Tambah role                |
| PUT    | /api/roles/:id                   | `role.manage`              | Ubah role & permission     |
| DELETE | /api/roles/:id                   | `role.manage`              | Hapus role                 |

## Database (Prisma ORM 7)

Struktur tabel didefinisikan di `backend/prisma/schema.prisma`.

| Perintah (di folder `backend`)            | Padanan Laravel                          | Fungsi                                                      |
| ----------------------------------------- | ---------------------------------------- | ----------------------------------------------------------- |
| `npm run db:migrate -- --name nama_ubah`  | `make:migration` + `php artisan migrate` | Buat file migration dari schema, lalu jalankan              |
| `npm run db:deploy`                       | `php artisan migrate --force`            | Jalankan migration yang sudah ada (untuk server/production) |
| `npm run db:seed`                         | `php artisan db:seed`                    | Isi data awal (role, permission, admin)                     |
| `npm run db:generate`                     | -                                        | Generate ulang Prisma Client setelah schema berubah         |
| `npm run db:studio`                       | (seperti phpMyAdmin)                     | Lihat & edit isi tabel di browser                           |

Alur mengubah struktur tabel: edit `schema.prisma`, jalankan `npm run db:migrate -- --name nama_perubahan`, lalu `npm run db:generate`.
