# Fitur Progress Materi Siswa

## 📋 Overview

Fitur tracking progress membaca materi berdasarkan **sub-bab yang diselesaikan** untuk monitoring siswa oleh admin/guru.

**Cara Kerja:**

- Siswa membaca materi per sub-bab
- Di akhir setiap sub-bab ada tombol "Tandai Selesai & Lanjut"
- Setiap kali tombol diklik, progress otomatis dihitung: `(sub-bab selesai / total sub-bab) * 100%`
- Admin/Guru bisa monitoring progress setiap siswa

## 🗄️ Database Setup

### 1. Jalankan Migration SQL

Buka Supabase SQL Editor dan jalankan file:

```
scripts/008_create_materi_progress.sql
```

File ini akan membuat:

- Tabel `sub_bab_progress` untuk tracking sub-bab yang selesai
- Tabel `materi_progress` untuk menyimpan progress keseluruhan (auto-calculated)
- Function `recalculate_materi_progress()` untuk hitung progress otomatis
- Trigger yang auto-update progress saat sub-bab ditandai selesai
- Index untuk optimasi query
- RLS policies untuk security

## 🔧 Struktur Database

### Tabel `sub_bab_progress`

```sql
sub_bab_progress:
  - id (UUID, Primary Key)
  - siswa_id (UUID, FK ke auth.users)
  - sub_bab_id (UUID, FK ke materi_sub_bab)
  - completed (BOOLEAN, default false)
  - completed_at (TIMESTAMP, auto-set saat completed=true)
  - created_at (TIMESTAMP)
  - updated_at (TIMESTAMP)
  - UNIQUE(siswa_id, sub_bab_id)
```

### Tabel `materi_progress` (Auto-calculated)

```sql
materi_progress:
  - id (UUID, Primary Key)
  - siswa_id (UUID, FK ke auth.users)
  - materi_id (UUID, FK ke materi)
  - completed_sub_bab (INTEGER, count sub-bab selesai)
  - total_sub_bab (INTEGER, total sub-bab dalam materi)
  - progress_percentage (INTEGER, = (completed/total)*100)
  - last_read_at (TIMESTAMP, auto-update)
  - completed_at (TIMESTAMP, auto-set saat 100%)
  - created_at (TIMESTAMP)
  - updated_at (TIMESTAMP)
  - UNIQUE(siswa_id, materi_id)
```

### Cara Kerja Auto-Calculation:

1. Siswa klik "Tandai Selesai" → Insert/Update `sub_bab_progress`
2. Trigger otomatis panggil `recalculate_materi_progress()`
3. Function hitung:
   - Total sub-bab dalam materi
   - Jumlah sub-bab yang completed=true
   - Persentase = (completed / total) \* 100
4. Update `materi_progress` dengan hasil perhitungan

## 🎯 Fitur yang Tersedia

### A. Untuk Admin (Halaman Siswa)

**Lokasi:** `/admin/siswa`

**Fitur:**

1. Tombol ikon 📖 (BookOpen) di setiap card siswa
2. Klik tombol → Muncul dialog progress
3. Tampilan progress:
   - 📊 Summary cards:
     - Total Materi (yang accessible untuk kelas siswa)
     - Materi Selesai Dibaca (100%)
     - Materi Sudah Dibuka (yang pernah dibaca)
     - Rata-rata Progress (%)
   - 📝 Detail per materi:
     - Judul materi
     - Progress bar dengan warna:
       - 🟢 Hijau (100% selesai)
       - 🔵 Biru (50-99%)
       - 🟡 Kuning (1-49%)
     - Tanggal terakhir dibaca
     - Tanggal selesai (jika 100%)

### B. Untuk Siswa (Mark Sub-Bab Complete)

**API Endpoint:** `POST /api/siswa/materi-progress`

**Body:**

```json
{
  "sub_bab_id": "uuid-sub-bab",
  "completed": true
}
```

**Response:**

```json
{
  "ok": true,
  "sub_bab_progress": {
    "id": "uuid",
    "siswa_id": "uuid",
    "sub_bab_id": "uuid",
    "completed": true,
    "completed_at": "2025-11-04T..."
  },
  "materi_progress": {
    "completed_sub_bab": 3,
    "total_sub_bab": 10,
    "progress_percentage": 30
  }
}
```

### C. Get Progress (Untuk Siswa)

**API Endpoint:** `GET /api/siswa/materi-progress`

Query params:

- `sub_bab_id` - Get status satu sub-bab (completed atau belum)
- `materi_id` - Get progress materi + semua sub-bab progress
- Tanpa param - Get semua progress siswa

## 🎨 UI Components

### Icon Status Progress:

- 📖 (BookOpen) - Tombol lihat progress
- ✓ (Check) - Materi selesai 100%
- 📈 (TrendingUp) - Rata-rata progress
- 👁️ (Eye) - Materi sudah dibuka

### Color Scheme:

- **Biru** - Total materi, progress 50-99%
- **Hijau** - Materi selesai 100%
- **Kuning** - Materi sudah dibuka, progress 1-49%
- **Ungu** - Rata-rata progress

## 🔐 Security (RLS Policies)

1. **Siswa:**

   - ✅ Bisa lihat progress sendiri
   - ✅ Bisa insert progress baru
   - ✅ Bisa update progress sendiri
   - ❌ Tidak bisa lihat progress siswa lain

2. **Admin/Guru:**
   - ✅ Bisa lihat semua progress siswa
   - ❌ Tidak bisa edit progress siswa

## 📊 Cara Kerja Filter Kelas

Progress hanya menghitung materi yang **accessible** untuk siswa:

- Materi dengan `kelas = []` atau `null` → Semua siswa bisa akses
- Materi dengan `kelas = ['X RPL 1']` → Hanya siswa kelas X RPL 1

Formula:

```
total_materi = count(materi yang accessible untuk kelas siswa)
average_progress = sum(all progress) / total_materi
```

## 🚀 Implementasi di Halaman Materi Siswa

### Komponen Ready-to-Use

Sudah tersedia komponen button siap pakai:

```
components/MarkCompleteButton.tsx
```

### Cara Pakai:

**1. Import component di halaman materi siswa:**

```typescript
import { MarkCompleteButton } from "@/components/MarkCompleteButton";
```

**2. Letakkan di akhir setiap sub-bab:**

```tsx
<div className="sub-bab-content">
  {/* Konten sub-bab */}
  <h2>1.1 Pengenalan Pemrograman</h2>
  <p>Isi materi...</p>

  {/* Button di akhir */}
  <MarkCompleteButton
    subBabId={currentSubBab.id}
    subBabTitle={currentSubBab.title}
    isCompleted={completedSubBabs.includes(currentSubBab.id)}
    onCompleteAction={() => {
      // Navigate ke sub-bab berikutnya
      if (nextSubBab) {
        router.push(`/siswa/materi/${materiId}/sub-bab/${nextSubBab.id}`);
      } else {
        // Semua selesai, kembali ke list materi
        router.push("/siswa/materi");
      }
    }}
  />
</div>
```

**3. Load progress saat mount:**

```typescript
const [completedSubBabs, setCompletedSubBabs] = useState<string[]>([]);

useEffect(() => {
  async function loadProgress() {
    const response = await fetch(
      `/api/siswa/materi-progress?materi_id=${materiId}`
    );
    const data = await response.json();

    // Extract completed sub_bab IDs
    const completed = data.sub_bab_progress
      .filter((p: any) => p.completed)
      .map((p: any) => p.sub_bab_id);

    setCompletedSubBabs(completed);
  }

  loadProgress();
}, [materiId]);
```

### Fitur Button:

- ✅ **Belum Selesai:** Tampil button besar "Tandai Selesai & Lanjut"
- ✅ **Sudah Selesai:** Tampil badge hijau dengan tombol "Batalkan"
- ✅ **Auto-navigate:** Otomatis pindah ke sub-bab berikutnya setelah ditandai
- ✅ **Toast notification:** Tampil notifikasi progress update
- ✅ **Loading state:** Disable saat proses simpan

## 📝 TODO (Opsional - Enhancement)

1. **Auto-tracking:** Implementasi auto-update progress saat siswa scroll di halaman materi
2. **Time-based:** Track waktu baca (berapa lama siswa membaca materi)
3. **Quiz integration:** Set progress 100% otomatis setelah quiz selesai
4. **Export report:** Export progress siswa ke Excel/PDF
5. **Notifikasi:** Kirim notifikasi ke siswa yang progress-nya rendah
6. **Leaderboard:** Ranking siswa berdasarkan progress

## 🐛 Troubleshooting

**Progress tidak muncul:**

1. Pastikan SQL script sudah dijalankan
2. Check RLS policies di Supabase dashboard
3. Pastikan siswa sudah punya kelas yang sesuai dengan materi

**Progress tidak update:**

1. Check browser console untuk error
2. Pastikan API endpoint `/api/siswa/materi-progress` bisa diakses
3. Verify `materi_id` valid dan exist di database

**Dialog loading terus:**

1. Check network tab untuk error 500/404
2. Pastikan API `/api/admin/materi-progress` berjalan
3. Check Supabase logs untuk query errors
