# PRD: Bara — Personal Micro-Habit Tracker

> Versi 1.0 · MVP Final · Siap Eksekusi
> Bahasa: Indonesia · Single-user PWA

---

## 0. PETUNJUK UNTUK AI AGENT

Dokumen ini adalah **satu-satunya sumber kebenaran** untuk aplikasi Bara.

- Baca berurutan: Arsitektur → Skema → Logika Bisnis → UI → Lapisan Psikologi.
- Semua blok `ATURAN` bersifat deterministik. Implementasi harus persis seperti tertulis.
- Semua blok `CATATAN` berisi konteks/alasan — jangan dilewati, mencegah salah implementasi.
- Bila ada ambiguitas: pilih yang paling ketat. Tolak daripada menebak.
- Nama aplikasi "Bara" bisa diganti dengan nama lain tanpa mengubah logika apapun.

---

## 1. RINGKASAN PROYEK

```
Nama App        : Bara
Jenis           : Personal Micro-Habit Tracker (Olahraga)
Platform        : Mobile Web / PWA (dapat diinstall, mode standalone)
Jumlah Pengguna : Tepat 1 orang (single-user, dilindungi PIN)
Tujuan          : Membangun kebiasaan olahraga harian lewat mekanik motivasi psikologis
Scope MVP       : Lock Screen + Home Screen + Stats Screen + Streak/Freeze Logic
Di Luar MVP     : Push Notification (dibangun infrastrukturnya, diaktifkan di Fase 2)
```

---

## 2. TECH STACK

| Lapisan     | Teknologi                            | Keterangan                            |
| ----------- | ------------------------------------ | ------------------------------------- |
| Frontend    | React + Vite + Tailwind CSS          | PWA via `vite-plugin-pwa`             |
| Backend     | Vercel Serverless Functions (`/api`) | Runtime Node.js                       |
| Database    | Turso (SQLite for Edge)              | Client: `@libsql/client`              |
| Hosting     | Vercel                               | Free tier cukup untuk MVP             |
| Push Notif  | Web Push API + Service Worker        | Infrastruktur disiapkan, aktif Fase 2 |
| Penjadwalan | Vercel Cron Jobs                     | Grant freeze mingguan                 |

---

## 3. KEAMANAN & AUTENTIKASI

### 3.1 Lock Screen (PIN Gate)

```
ALUR:
  1. App dibuka → cek sessionStorage['auth_token']
  2. Jika tidak ada / tidak valid → tampilkan Lock Screen (UI numpad)
  3. User masukkan PIN → POST /api/auth { pin }
  4. Server: bandingkan pin === process.env.APP_PASSCODE
  5. Jika cocok → generate token acak (crypto.randomUUID()) → simpan di Map server-side (in-memory)
  6. Return { token } ke frontend
  7. Frontend: simpan token di sessionStorage['auth_token']
  8. Semua API call berikutnya: kirim header Authorization: Bearer <token>
  9. Setiap route API validasi token sebelum memproses apapun
```

```
ATURAN: Jangan simpan PIN mentah di storage client.
ATURAN: Token wajib divalidasi di setiap API request, bukan hanya saat halaman dibuka.
ATURAN: Jika PIN salah 5x berturut-turut → cooldown 30 detik sebelum bisa coba lagi.
CATATAN: Tidak ada email, OAuth, atau reset password. PIN statis dari environment variable.
CATATAN: Token in-memory berarti reset saat serverless function cold start — user perlu PIN ulang.
         Ini perilaku yang dapat diterima untuk single-user personal app.
```

### 3.2 Environment Variables

```env
# Wajib ada
TURSO_DATABASE_URL=      # Connection URL dari Turso (format: libsql://...)
TURSO_AUTH_TOKEN=        # Auth token dari Turso
APP_PASSCODE=            # PIN master, minimal 4 digit (contoh: "admin123admin")

# Opsional — disiapkan sekarang, aktif di Fase 2
VAPID_PUBLIC_KEY=        # Generate dengan: npx web-push generate-vapid-keys
VAPID_PRIVATE_KEY=       # Generate dengan: npx web-push generate-vapid-keys

# Development only (jangan commit ke repo)
VITE_API_URL=http://localhost:3000
```

---

## 4. SKEMA DATABASE

### 4.1 Tabel: `activity_logs`

Menyimpan setiap sesi olahraga yang dicatat pengguna.

```sql
CREATE TABLE IF NOT EXISTS activity_logs (
  id            TEXT     PRIMARY KEY,
  -- UUID v4, dibuat di server

  activity_type TEXT     NOT NULL,
  -- Nilai yang diizinkan: 'Push Up' | 'Dumbbell'

  duration      INTEGER  NOT NULL,
  -- Nilai yang diizinkan: 5 | 10 | 15 | 30 | 45 (menit)

  intensity     INTEGER  NOT NULL,
  -- Dihitung otomatis di server: 1 | 2 | 3 (lihat §5.1)

  logged_date   TEXT     NOT NULL,
  -- Format: YYYY-MM-DD, dikirim oleh client dalam waktu lokal pengguna

  created_at    TEXT     NOT NULL
  -- Format: ISO-8601 UTC, dibuat di server saat insert
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs(logged_date);
```

```
CATATAN PENTING — logged_date vs created_at:
  logged_date  = tanggal dalam ZONA WAKTU LOKAL pengguna (dikirim dari client)
  created_at   = timestamp UTC server (hanya untuk audit/debug)

  Semua logika streak, heatmap, dan statistik SELALU menggunakan logged_date.
  Jangan pernah menurunkan tanggal dari created_at untuk logika bisnis apapun.
```

### 4.2 Tabel: `user_state`

Menyimpan state global pengguna. Selalu tepat 1 baris data (`id = 1`).

```sql
CREATE TABLE IF NOT EXISTS user_state (
  id               INTEGER  PRIMARY KEY DEFAULT 1,

  current_streak   INTEGER  NOT NULL DEFAULT 0,
  -- Jumlah hari beruntun saat ini

  longest_streak   INTEGER  NOT NULL DEFAULT 0,
  -- Rekor terpanjang sepanjang masa (untuk fitur psikologi §7.5)

  freeze_credits   INTEGER  NOT NULL DEFAULT 1,
  -- Nyawa cadangan. Nilai: 0–3. Mulai dengan 1 kredit.

  last_active_date TEXT     DEFAULT NULL,
  -- Format: YYYY-MM-DD waktu lokal. NULL jika belum pernah log.

  push_endpoint    TEXT     DEFAULT NULL,
  -- Web Push: subscription endpoint URL

  push_p256dh      TEXT     DEFAULT NULL,
  -- Web Push: kunci enkripsi p256dh

  push_auth        TEXT     DEFAULT NULL,
  -- Web Push: kunci auth

  push_enabled     INTEGER  NOT NULL DEFAULT 0
  -- Web Push aktif: 0 = nonaktif, 1 = aktif
);

-- Jalankan sekali saat setup awal
INSERT OR IGNORE INTO user_state (id) VALUES (1);
```

### 4.3 Skrip Migrasi Lengkap

Simpan sebagai `migrations/001_init.sql`. Jalankan via Turso shell atau route `/api/setup`.

```sql
CREATE TABLE IF NOT EXISTS activity_logs (
  id            TEXT     PRIMARY KEY,
  activity_type TEXT     NOT NULL,
  duration      INTEGER  NOT NULL,
  intensity     INTEGER  NOT NULL,
  logged_date   TEXT     NOT NULL,
  created_at    TEXT     NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs(logged_date);

CREATE TABLE IF NOT EXISTS user_state (
  id               INTEGER  PRIMARY KEY DEFAULT 1,
  current_streak   INTEGER  NOT NULL DEFAULT 0,
  longest_streak   INTEGER  NOT NULL DEFAULT 0,
  freeze_credits   INTEGER  NOT NULL DEFAULT 1,
  last_active_date TEXT     DEFAULT NULL,
  push_endpoint    TEXT     DEFAULT NULL,
  push_p256dh      TEXT     DEFAULT NULL,
  push_auth        TEXT     DEFAULT NULL,
  push_enabled     INTEGER  NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO user_state (id) VALUES (1);
```

---

## 5. LOGIKA BISNIS

### 5.1 Perhitungan Intensitas

Dihitung **di server** saat entri log dibuat. Tidak pernah dikirim dari client.

```
ATURAN:
  duration <= 10            → intensity = 1   (Rendah)
  duration >= 11 DAN <= 20  → intensity = 2   (Sedang)
  duration > 20             → intensity = 3   (Tinggi)
```

### 5.2 Logika Streak

Semua evaluasi streak terjadi **di server** di dalam `POST /api/log`.

**Input wajib dari client:**

- `today_local` — String format `YYYY-MM-DD`, tanggal hari ini dalam zona waktu lokal pengguna.
  Contoh cara menghasilkannya di client:
  ```javascript
  const today_local = new Date().toLocaleDateString("sv-SE"); // 'sv-SE' menghasilkan format YYYY-MM-DD
  ```

**Fungsi pembantu — hitung selisih hari:**

```javascript
function diffDays(dateStrA, dateStrB) {
  // dateStrA dan dateStrB adalah string YYYY-MM-DD
  const a = new Date(dateStrA + "T00:00:00");
  const b = new Date(dateStrB + "T00:00:00");
  return Math.round((a - b) / (1000 * 60 * 60 * 24));
}
```

**Alur evaluasi streak:**

```
LANGKAH 1 — Ambil user_state saat ini dari DB.

LANGKAH 2 — Cek first-ever use:
  IF last_active_date IS NULL:
    current_streak = 1
    longest_streak = 1
    last_active_date = today_local
    → Simpan ke DB, selesai.

LANGKAH 3 — Guard duplikasi hari yang sama:
  IF today_local == last_active_date:
    → Jangan ubah streak apapun.
    → Log aktivitas tetap disimpan secara normal.
    → Return state yang ada tanpa perubahan.
    → Selesai.

LANGKAH 4 — Hitung gap:
  days_missed = diffDays(today_local, last_active_date) - 1
  -- Contoh: last_active = Senin, today = Selasa → days_missed = 0 (hari beruntun)
  -- Contoh: last_active = Senin, today = Rabu   → days_missed = 1 (bolos 1 hari)
  -- Contoh: last_active = Senin, today = Jumat  → days_missed = 3 (bolos 3 hari)

LANGKAH 5a — Jika days_missed == 0 (hari beruntun):
  current_streak += 1
  IF current_streak > longest_streak: longest_streak = current_streak
  last_active_date = today_local
  → Simpan ke DB.

LANGKAH 5b — Jika days_missed >= 1 (ada gap):
  → Jalankan Logika Freeze (§5.3)
```

### 5.3 Logika Freeze Credit (Nyawa)

Dipanggil dari §5.2 Langkah 5b ketika `days_missed >= 1`.

```
ATURAN:
  days_to_cover = days_missed

  JIKA freeze_credits >= days_to_cover:
    freeze_credits -= days_to_cover
    current_streak += 1
    -- Streak SELAMAT berkat freeze
    -- Tidak ada perubahan pada longest_streak (streak tidak bertumbuh selama freeze)
    last_active_date = today_local

  JIKA freeze_credits < days_to_cover:
    current_streak = 1
    -- Streak RESET. Mulai dari 1, bukan 0, karena user sedang aktif sekarang.
    freeze_credits = MAX(0, freeze_credits - days_to_cover)
    -- Clamp ke 0. freeze_credits tidak boleh negatif.
    last_active_date = today_local
    -- Flag untuk UI: { streak_was_reset: true } → tampilkan pesan recovery (§7.5)

SETELAH MENGHITUNG:
  Simpan perubahan ke user_state di DB dalam satu UPDATE statement.
```

```
CATATAN: Streak reset ke 1, bukan 0. User sedang aktif saat ini — menampilkan 0 tidak akurat
         dan secara psikologis merugikan.
CATATAN: longest_streak TIDAK diupdate saat streak di-reset — rekor historis tetap terjaga.
```

### 5.4 Grant Freeze Credit Mingguan

Dijalankan via **Vercel Cron Job** setiap Senin pukul 00:00 UTC.

```
Route    : GET /api/cron/grant-freeze
Jadwal   : 0 0 * * 1
Proteksi : Header wajib: Authorization: Bearer <CRON_SECRET>
           Tambahkan CRON_SECRET ke environment variables.

ATURAN:
  credits_baru = MIN(freeze_credits + 1, 3)
  UPDATE user_state SET freeze_credits = credits_baru WHERE id = 1

CATATAN: Batas maksimal 3. Jika sudah 3, tidak ada perubahan (bukan error).
```

### 5.5 Agregasi Data Heatmap

Heatmap menampilkan **1 sel per hari kalender** selama 14 minggu terakhir (98 hari).

```
ATURAN — Jika ada beberapa log di tanggal yang sama:
  intensity_ditampilkan = MAX(intensity) dari semua log di tanggal tersebut

ATURAN — Pemetaan warna sel:
  Tidak ada aktivitas  → level-0 (kosong / abu-abu)
  intensity = 1        → level-1 (hijau muda)
  intensity = 2        → level-2 (hijau sedang)
  intensity = 3        → level-3 (hijau tua)

QUERY:
  SELECT   logged_date,
           MAX(intensity)   AS intensity,
           SUM(duration)    AS total_menit,
           COUNT(*)         AS jumlah_sesi
  FROM     activity_logs
  WHERE    logged_date >= :tanggal_98_hari_lalu
  GROUP BY logged_date
  ORDER BY logged_date ASC

  -- :tanggal_98_hari_lalu dihitung di server:
  -- const d = new Date(); d.setDate(d.getDate() - 97); return d.toLocaleDateString('sv-SE')
  -- (97 agar hari ini ikut terhitung)
```

---

## 6. API ROUTES

Semua route memerlukan header `Authorization: Bearer <token>` kecuali yang ditandai.

| Method | Route                    | Deskripsi                                             |
| ------ | ------------------------ | ----------------------------------------------------- |
| POST   | `/api/auth`              | Validasi PIN, kembalikan token. Tanpa auth header.    |
| POST   | `/api/log`               | Catat sesi olahraga. Menjalankan semua logika streak. |
| GET    | `/api/state`             | Ambil user_state (streak, freeze, longest_streak).    |
| GET    | `/api/stats`             | Ambil statistik lengkap + data heatmap.               |
| POST   | `/api/push/subscribe`    | Simpan subscription push ke user_state. (Fase 2)      |
| GET    | `/api/cron/grant-freeze` | Cron mingguan — tambah freeze credit.                 |

---

### Detail: POST `/api/auth`

```
Request body : { pin: string }
Tanpa auth header.

Alur server:
  1. Bandingkan pin === process.env.APP_PASSCODE
  2. Jika tidak cocok → 401 { error: 'PIN salah' }
  3. Jika cocok → token = crypto.randomUUID()
  4. Simpan token di Set in-memory: validTokens.add(token)
  5. Return 200 { token }
```

---

### Detail: POST `/api/log`

```
Request body:
  {
    activity_type : 'Push Up' | 'Dumbbell',
    duration      : 5 | 10 | 15 | 30 | 45,
    today_local   : 'YYYY-MM-DD'   ← tanggal lokal pengguna
  }

Alur server:
  1. Validasi auth token
  2. Validasi input:
       - activity_type harus salah satu dari: ['Push Up', 'Dumbbell']
       - duration harus salah satu dari: [5, 10, 15, 30, 45]
       - today_local harus cocok dengan pola: /^\d{4}-\d{2}-\d{2}$/
     Jika invalid → 400 { error: 'Input tidak valid' }
  3. Hitung intensity (§5.1)
  4. INSERT ke activity_logs:
       id            = crypto.randomUUID()
       activity_type = dari request
       duration      = dari request
       intensity     = hasil perhitungan langkah 3
       logged_date   = today_local dari request
       created_at    = new Date().toISOString()
  5. Ambil user_state WHERE id = 1
  6. Jalankan Logika Streak (§5.2) + Logika Freeze jika diperlukan (§5.3)
  7. UPDATE user_state dalam satu query
  8. Hitung jumlah sesi hari ini:
       SELECT COUNT(*) FROM activity_logs WHERE logged_date = today_local
  9. Return 200:
       {
         success        : true,
         streak_reset   : true | false,   ← untuk UI recovery framing
         state: {
           current_streak  : number,
           longest_streak  : number,
           freeze_credits  : number,
           sesi_hari_ini   : number        ← jumlah log hari ini (untuk UI)
         }
       }
```

---

### Detail: GET `/api/stats`

```
Query param : today_local (YYYY-MM-DD) — dikirim sebagai query string

Alur server:
  1. Validasi auth token
  2. Hitung statistik:

     -- Total menit (sepanjang masa):
     SELECT COALESCE(SUM(duration), 0) AS total_menit FROM activity_logs

     -- Skor Disiplin (30 hari terakhir):
     SELECT COUNT(DISTINCT logged_date) AS hari_aktif
     FROM activity_logs
     WHERE logged_date >= :30_hari_lalu AND logged_date <= :today_local
     → skor_disiplin = ROUND((hari_aktif / 30.0) * 100, 1)

     -- Data heatmap (98 hari terakhir):
     (lihat query §5.5)

  3. Return 200:
       {
         total_menit     : number,
         skor_disiplin   : number,   ← persentase, 0–100
         heatmap         : [
           { date: 'YYYY-MM-DD', intensity: 0|1|2|3, total_menit: number, jumlah_sesi: number },
           ...
         ]
       }
```

---

## 7. LAPISAN PSIKOLOGI

Ini adalah pembeda utama aplikasi. Implementasi 5 framework perubahan perilaku.

### 7.1 Loss Aversion — Freeze Credits sebagai "Nyawa"

```
IMPLEMENTASI:
  Tampilkan freeze_credits sebagai ikon hati (❤), bukan angka.

  freeze_credits == 3 → 3 ikon hati penuh, warna normal
  freeze_credits == 2 → 2 ikon hati penuh, warna normal
  freeze_credits == 1 → 1 ikon hati, animasi pulse berwarna amber (peringatan)
  freeze_credits == 0 → ikon hati pecah/kosong, warna merah redup

  Setelah streak di-reset (streak_reset === true dari API):
  → Tampilkan pesan faktual (tanpa menyalahkan):
    "Nyawa habis. Streak baru dimulai dari 1."
  → Jangan tampilkan: "Streak kamu hilang!" (framing negatif, hindari)
```

### 7.2 Progress Principle — Efek Kedekatan Milestone

Pengguna bekerja lebih keras ketika bisa melihat kemajuan menuju tujuan.

```
MILESTONE: [7, 14, 21, 30, 60, 100, 365] hari

KALKULASI next_milestone (dilakukan di frontend):
  next_milestone = MILESTONE.find(m => m > current_streak) ?? null

IMPLEMENTASI:
  Jika next_milestone ada:
  → Tampilkan di bawah display streak:
    "X hari lagi menuju [next_milestone] 🔥"
    (X = next_milestone - current_streak)

  Saat current_streak === milestone:
  → Tampilkan overlay perayaan full-screen selama 3 detik:
    Animasi confetti/glow + teks:
    "7 hari. Kamu sudah lebih konsisten dari kebanyakan orang."
    "30 hari. Ini sudah jadi bagian dari dirimu."
    "100 hari. Berbeda level."
  → Dismiss otomatis setelah 3 detik, atau ketuk untuk tutup.

  Jika current_streak > 365:
  → Tampilkan: "Streak: [N] hari 🔥 Tanpa batas." (tidak ada next_milestone)
```

### 7.3 Identity Reinforcement — Kebiasaan Berbasis Identitas

```
IMPLEMENTASI — Teks sapaan di Home Screen (rotasi setiap hari berdasarkan hari ke-N):
  Daftar teks (pilih index = dayOfYear % jumlah_teks):
  [
    "Orang yang bergerak tiap hari tidak menunggu mood.",
    "Kamu bukan orang yang skip. Buktikan hari ini.",
    "Konsistensi mengalahkan intensitas. Selalu.",
    "5 menit tetap terhitung. Mulai saja.",
    "Tubuh tidak peduli kamu lelah. Mulai 5 menit.",
    "Kebiasaan dibangun dari hari-hari biasa, bukan hari istimewa."
  ]

IMPLEMENTASI — Pesan konfirmasi setelah log (pilih acak):
  [
    "Selesai. Ini yang membedakan kamu.",
    "Streak aman. Badan berterima kasih.",
    "Satu langkah lagi membentuk siapa kamu.",
    "Dilakukan. Lebih baik dari sempurna tapi tidak jadi."
  ]
```

### 7.4 Minimum Viable Effort — Kurangi Hambatan Memulai

Opsi 5 menit ada khusus untuk menghilangkan alasan "tidak sempat".

```
IMPLEMENTASI:
  Tombol durasi 5 menit mendapat label kecil di bawahnya: "minimum aman"
  Pastikan tombol 5 menit paling mudah dijangkau secara visual (posisi pertama)

  Banner di Home Screen jika belum ada log hari ini:
  → "Belum ada aktivitas hari ini. 5 menit cukup."
  → Banner hilang otomatis setelah berhasil log pertama hari ini.
```

### 7.5 Personal Best & Recovery Framing — Hindari Shame Spiral

```
IMPLEMENTASI — Stats Screen:
  Selalu tampilkan longest_streak berdampingan dengan current_streak:
  "Saat ini: [X] hari  ·  Rekor: [Y] hari"

  Skor Disiplin ditampilkan dengan label konteks (dihitung di frontend):
  skor >= 80%   → label: "Konsistensi luar biasa"
  skor 50–79%  → label: "Di jalur yang benar"
  skor < 50%   → label: "Masih ada ruang untuk tumbuh"
  (Jangan gunakan label negatif seperti "Buruk", "Rendah", atau "Gagal")

IMPLEMENTASI — Home Screen setelah reset:
  Tampilkan: "Rekormu: [longest_streak] hari. Streak baru dimulai."
  Hapus setelah hari berikutnya berhasil di-log.
```

---

## 8. SPESIFIKASI UI / LAYAR

### Layar 1: Lock Screen

```
Layout    : Layar penuh, konten terpusat secara vertikal
Elemen    :
  - Logo / nama app di atas
  - 4–6 titik sebagai indikator PIN (tampil ter-mask)
  - Numpad 3x4 (angka 1–9, kosong, 0, hapus)
  - Jika PIN salah: animasi getar + teks "PIN salah"
  - Jika PIN salah 5x: tombol dinonaktifkan + teks "Coba lagi dalam 30 detik"
  - Tidak ada opsi "lupa PIN"
```

### Layar 2: Home Screen

```
Layout : Scroll vertikal, padding bawah untuk nav bar

Bagian (atas ke bawah):
  A. Teks sapaan (rotasi harian, lihat §7.3)
     Font kecil, warna muted, italic

  B. Display streak utama
     Angka besar: [current_streak] hari 🔥
     Di bawahnya kecil: "Rekor: [longest_streak] hari"

  C. Freeze Credits
     Ikon hati sebanyak 3 slot (terisi / kosong sesuai nilai)
     Animasi pulse jika tersisa 1 (§7.1)

  D. Progress menuju milestone (§7.2)
     Teks: "[X] hari lagi menuju [next_milestone]"
     Sembunyikan jika current_streak == 0

  E. Status hari ini
     Jika belum log : Banner kuning "Belum ada aktivitas hari ini. 5 menit cukup."
     Jika sudah log  : Teks hijau "[N] sesi hari ini ✓"

  F. Tombol aksi utama
     Dua tombol besar ramah ibu jari: [Push Up] [Dumbbell]

  G. Overlay pilihan durasi (muncul setelah tombol F ditekan)
     Tampil sebagai bottom sheet atau modal
     5 pilihan: [5 mnt *] [10 mnt] [15 mnt] [30 mnt] [45 mnt]
     * Label kecil di bawah tombol 5 mnt: "minimum aman"
     Setelah pilih durasi → kirim ke API → tutup overlay → tampilkan toast konfirmasi

  H. Bottom navigation
     [🏠 Beranda] [📊 Statistik]
```

### Toast Konfirmasi Setelah Log

```
Tampil    : Segera setelah durasi dipilih dan API berhasil
Konten    :
  - Nama aktivitas + durasi (contoh: "Push Up · 15 menit")
  - Pesan identitas acak (§7.3)
  - Animasi increment pada angka streak
  - Jika milestone tercapai → tutup toast, lanjut ke overlay perayaan (§7.2)
Durasi    : Auto-dismiss setelah 2.5 detik
```

### Layar 3: Stats Screen

```
Layout : Scroll vertikal

Bagian (atas ke bawah):
  A. Kartu metrik (grid 2 kolom):
     - Total Menit (lifetime)     [ⓘ "Total durasi semua sesi yang pernah dicatat"]
     - Skor Disiplin %            [ⓘ "Persentase hari aktif dalam 30 hari terakhir"]
     - Streak Saat Ini            [ⓘ "Hari berturut-turut kamu aktif"]
     - Rekor Terpanjang           [ⓘ "Streak terpanjang yang pernah kamu capai"]

  B. Label konteks di bawah Skor Disiplin (§7.5)
     Contoh: "Di jalur yang benar"

  C. Heatmap 14 Minggu
     Grid kotak ala GitHub
     Sumbu X: minggu (kiri = lama, kanan = baru)
     Sumbu Y: hari (Sen–Ming)
     Warna: 4 level (kosong / hijau muda / hijau / hijau tua)
     Interaksi: tap sel → tooltip "DD MMM · [N] menit · [N] sesi"

  D. Tooltip mekanik [ⓘ]:
     Desktop : hover
     Mobile  : tap ikon ⓘ → popover/modal kecil dengan penjelasan 1–2 kalimat
```

---

## 9. KONFIGURASI PWA

### manifest.json

```json
{
  "name": "Bara",
  "short_name": "Bara",
  "description": "Tracker kebiasaan olahraga harian.",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/",
  "scope": "/",
  "background_color": "#0f0f0f",
  "theme_color": "#0f0f0f",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### Service Worker — Tanggung Jawab MVP

```
1. Cache-first untuk aset statis (shell app: HTML, CSS, JS, ikon)
   → App tetap bisa dibuka meski offline, tapi data tidak bisa dimuat (no offline-first)
   → Tampilkan layar "Butuh koneksi internet untuk memuat data" jika fetch gagal

2. (Fase 2) Dengarkan event `push` → tampilkan notifikasi
3. (Fase 2) Klik notifikasi → buka app ke Home Screen
```

### Push Notification — Fase 2 (Infrastruktur Disiapkan Sekarang)

```
Jadwal Cron  : 0 12 * * *  (12:00 UTC = 19:00 WIB)
Route        : GET /api/cron/remind
Proteksi     : Header Authorization: Bearer <CRON_SECRET>

Keputusan MVP — Penanganan Timezone:
  Gunakan tanggal UTC sebagai aproksimasi tanggal lokal pengguna.
  Untuk WIB (UTC+7), selisih maksimal ±7 jam — dapat diterima untuk personal app.
  Implementasi Fase 2 yang lebih akurat bisa menyimpan timezone di user_state.

LOGIKA:
  today_approx = new Date().toISOString().split('T')[0]
  has_logged = SELECT COUNT(*) FROM activity_logs WHERE logged_date = today_approx

  IF has_logged == 0 AND push_enabled == 1:
    Kirim push notification via Web Push API:
    { title: "Bara 🔥", body: "Target hari ini belum aman. 5 menit cukup." }
```

---

## 10. KEPUTUSAN MVP (Open Questions — Sudah Ditetapkan)

Semua ambiguitas dari versi sebelumnya sudah diputuskan. Tidak ada yang perlu dikonfirmasi lagi.

| #   | Pertanyaan                                         | Keputusan MVP                                    | Alasan                                                                |
| --- | -------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------- |
| 1   | Penanganan timezone untuk cron reminder            | Gunakan tanggal UTC sebagai aproksimasi          | Perbedaan ≤7 jam ok untuk personal app, implementasi paling sederhana |
| 2   | Tampilkan jumlah sesi hari ini di Home?            | Ya — tampilkan "[N] sesi hari ini ✓"             | Reinforcement positif tanpa effort ekstra, data sudah ada dari API    |
| 3   | Kapan streak reset terdeteksi?                     | Saat user buka app dan log aktivitas berikutnya  | Tidak perlu background job — cukup untuk single-user app              |
| 4   | Push notification di MVP?                          | Infrastruktur disiapkan, fitur aktif Fase 2      | Mengurangi kompleksitas setup awal; VAPID dan schema sudah ada        |
| 5   | Apa yang terjadi jika user tidak log berhari-hari? | Streak dan freeze dievaluasi saat log berikutnya | Tidak perlu cron untuk evaluasi streak — cukup lazy evaluation        |

---

## 11. SETUP & INISIALISASI

```bash
# LANGKAH 1 — Buat database Turso
turso db create bara
turso db show bara          # Salin TURSO_DATABASE_URL
turso db tokens create bara # Salin TURSO_AUTH_TOKEN

# LANGKAH 2 — Jalankan migrasi
# Opsi A: via Turso shell
turso db shell bara < migrations/001_init.sql

# Opsi B: buat route /api/setup (hanya untuk development)
# GET /api/setup → jalankan skrip migrasi §4.3 → hapus route setelah dipakai

# LANGKAH 3 — Generate VAPID keys (disiapkan sekarang untuk Fase 2)
npx web-push generate-vapid-keys
# Salin output ke environment variables

# LANGKAH 4 — Set environment variables di Vercel Dashboard
# Settings → Environment Variables → tambahkan semua dari §3.2

# LANGKAH 5 — Deploy
vercel deploy

# LANGKAH 6 — Aktifkan Cron Job di Vercel
# Tambahkan ke vercel.json:
{
  "crons": [
    { "path": "/api/cron/grant-freeze", "schedule": "0 0 * * 1" }
  ]
}
```

---

## 12. STRUKTUR FOLDER PROYEK

```
bara/
├── public/
│   ├── icons/
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── sw.js                    ← Service Worker
├── src/
│   ├── components/
│   │   ├── LockScreen.jsx
│   │   ├── HomeScreen.jsx
│   │   ├── StatsScreen.jsx
│   │   ├── DurationOverlay.jsx
│   │   ├── ConfirmationToast.jsx
│   │   ├── MilestrationCelebration.jsx
│   │   ├── Heatmap.jsx
│   │   └── BottomNav.jsx
│   ├── hooks/
│   │   ├── useAuth.js           ← Manajemen token & status autentikasi
│   │   └── useUserState.js      ← Fetch & cache user_state
│   ├── utils/
│   │   ├── dates.js             ← Helper: today_local, diffDays, dll.
│   │   └── milestones.js        ← Kalkulasi next_milestone
│   ├── App.jsx
│   └── main.jsx
├── api/
│   ├── auth.js                  ← POST /api/auth
│   ├── log.js                   ← POST /api/log
│   ├── state.js                 ← GET /api/state
│   ├── stats.js                 ← GET /api/stats
│   ├── push/
│   │   └── subscribe.js         ← POST /api/push/subscribe (Fase 2)
│   └── cron/
│       ├── grant-freeze.js      ← GET /api/cron/grant-freeze
│       └── remind.js            ← GET /api/cron/remind (Fase 2)
├── migrations/
│   └── 001_init.sql
├── vercel.json
├── vite.config.js
└── .env.local                   ← Jangan di-commit ke repo
```

---

_Akhir PRD v1.0 — Bara App · MVP Final · Siap Dieksekusi_
