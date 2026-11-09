# TT App Comm — Tanggapan Developer atas Hasil UAT

**Proyek:** Tutor Time Communication App — Update
**Menanggapi:** Dokumen "TT App Comm – User Acceptance Testing (UAT) Result", bagian 6 *Developer Review & Follow-up* (pengujian 5 November 2026)
**Tanggal tanggapan:** 9 November 2026
**Status:** Perbaikan selesai — siap untuk retest

---

## 1. Ringkasan

| No. | Temuan | Status | Tindakan |
|---|---|---|---|
| 1 | Child tagging & visibility post setelah edit | **Diperbaiki** + 1 hal perlu konfirmasi | Tombol *Tag children* tersedia di halaman Edit untuk setiap post yang memiliki media |
| 2 | PDF preview & download (iOS & Android) | **Diperbaiki** | PDF dapat dibuka dan disimpan ke HP |
| 3 | Video download (iOS & Android) | **Diperbaiki — perlu retest** | Penyebab yang paling mungkin sudah diperbaiki; pesan error kini menampilkan alasannya |
| 4 | Perbedaan video playback iOS vs Android | **Diperbaiki** | Pemutar video baru yang sama di kedua platform, termasuk tombol mundur/maju 10 detik |
| 5 | Refresh timeline | **Diperbaiki** | Tarik ke bawah (*pull-to-refresh*) atau tekan ikon Home |
| 6 | Tombol Enter di kolom komentar (iOS) | **Diperbaiki** | Enter membuat baris baru; komentar hanya terkirim lewat tombol *Send* |
| 7 | Edit / hapus komentar | **Ditambahkan** | Parents dan Teacher dapat mengedit dan menghapus komentar |
| 8 | Attachment pada Announcement | **Diperbaiki** | Sama dengan No. 2 — dokumen dapat dibuka dan disimpan |
| 9 | Ask Teacher via WhatsApp | **Ditambahkan** | Pesan WhatsApp otomatis menyertakan judul dan tanggal post; teksnya dapat diatur oleh Admin |
| 10 | Push notification | **Perlu konfirmasi** | Saat ini notifikasi hanya untuk Announcement |
| 11 | Penjelasan Card & Schedule | **Penjelasan + panduan** | Lihat bagian 4 |

---

## 2. Persiapan Sebelum Retest

Mohon pastikan sebelum mulai retest:

1. **Aplikasi Parents versi 1.0.30 (build 32)** sudah terpasang di HP iOS dan Android.
   - Perbaikan No. 2, 3 dan 8 (simpan foto/video/PDF ke HP) hanya ada di versi ini.
   - Cek versi: *Settings HP → Apps → TT Parent* (Android) atau di TestFlight (iOS).
2. Jika diminta izin **Notifikasi** dan **Foto/Galeri** saat membuka aplikasi, pilih **Izinkan / Allow**.
3. Refresh halaman Web Dashboard (Ctrl+F5) sebelum menguji fitur Teacher/Admin.

---

## 3. Detail Perbaikan & Cara Retest

### No. 1 — Child Tagging & Visibility Post (ISSUE T-01)

**Yang diubah**
- Di halaman **Edit** setiap post yang memiliki foto/video kini ada link **🏷️ Tag children**.
- Melalui link tersebut, Teacher dapat menambah, mengubah, atau menghapus tag anak kapan saja — termasuk untuk post yang sebelumnya di-*skip* tagging-nya, atau jika terjadi salah tag.

**Penjelasan cara kerja tagging (mohon dibaca)**
- Tagging dilakukan **per foto/video**, bukan per post.
- Tag menentukan foto tersebut masuk ke **profil anak yang mana** pada aplikasi Parents.
- Post kelas tetap **terlihat oleh seluruh Parents di kelas tersebut**. Ini sesuai desain saat ini: tagging *tidak* membatasi siapa yang dapat melihat post.

**Keterbatasan**
- Post **tanpa media** (teks saja) tidak dapat di-tag, karena tidak ada foto/video yang bisa ditandai. Karena itu, pilihan tagging tidak muncul saat mengirim post teks saja (temuan *Text-only Post*).

**Mohon konfirmasi**
> Apakah tagging perlu **membatasi** siapa yang dapat melihat post (misalnya post hanya terlihat oleh Parents dari anak yang di-tag)?

**Cara retest**
1. Login ke Web Dashboard sebagai Teacher.
2. Buat Regular Post dengan 1–2 foto, lalu klik **Skip / do later** pada halaman tagging.
3. Buka post tersebut melalui **Edit** → klik **🏷️ Tag children**.
4. Centang satu anak → **Save tags**.
5. Buka lagi **Edit → Tag children**, hilangkan centangnya → **Save tags**.
6. ✅ Diharapkan: tag dapat ditambah dan dihapus tanpa harus membuat post baru.

---

### No. 2 & No. 8 — PDF Preview & Download / Attachment Announcement (ISSUE P-02, P-05)

**Yang diubah**
- **Open document** → PDF dibuka dengan aplikasi pembaca PDF di HP.
- Tombol **↓ Save** → muncul menu *share* HP untuk menyimpan PDF:
  - iPhone: pilih **Save to Files / Simpan ke File**.
  - Android: pilih **Files**, **Drive**, atau aplikasi lain yang tersedia.
- Berlaku untuk PDF di **Regular Post** (Gallery) dan di **Announcement**.

**Cara retest**
1. Teacher mengirim Announcement dengan lampiran PDF, dan satu Regular Post dengan lampiran PDF.
2. Di aplikasi Parents, buka Announcement → tekan **Open document**.
   ✅ PDF terbuka.
3. Kembali, lalu tekan **↓ Save** di samping dokumen.
   ✅ Menu share muncul dan PDF dapat disimpan.
4. Ulangi pada Regular Post: buka post → pada tampilan PDF tekan **Open document**, lalu **↓ Save**.
5. Lakukan di **iOS dan Android**.

---

### No. 3 — Video Download (ISSUE P-03)

**Yang diubah**
- Video dari iPhone tersimpan dengan format file yang tidak dikenali oleh galeri HP. Ini kemungkinan besar penyebab pesan *"Couldn't save this file"*, dan sudah diperbaiki.
- Jika penyimpanan masih gagal, pesan error kini menampilkan **alasan** di dalam tanda kurung, misalnya *"Couldn't save this file (…)"*.

**Cara retest**
1. Teacher membuat post dengan video — sebaiknya **satu video dari iPhone** dan **satu dari Android**.
2. Di aplikasi Parents, buka video → tekan **↓ Save**.
3. ✅ Diharapkan: muncul pesan *"Saved to your photos"* dan video tersedia di Galeri/Photos.
4. ❗ Jika masih gagal: mohon **screenshot pesan error lengkap** (termasuk teks di dalam tanda kurung), beserta jenis HP dan versi OS.

---

### No. 4 — Video Playback iOS vs Android

**Yang diubah**
- Aplikasi kini menggunakan **satu pemutar video yang sama** di iOS dan Android, dengan:
  - ▶ / ❚❚ Play / Pause
  - ⟲ 10 — mundur 10 detik
  - 10 ⟳ — maju 10 detik
  - Garis progres yang dapat digeser, serta durasi video
- Menekan area video juga menjalankan atau menghentikan video.

**Cara retest**
1. Buka post video di iOS dan Android.
2. Coba Play, Pause, mundur 10 detik, maju 10 detik, dan geser garis progres.
3. ✅ Diharapkan: tampilan dan fungsi sama di kedua platform.

---

### No. 5 — Refresh Timeline (ISSUE P-01)

**Yang diubah** (sesuai saran tim UAT)
- **Tarik ke bawah** pada halaman Home → muncul tulisan *"Refreshing…"* dan timeline diperbarui.
- Saat sedang berada di Home, **tekan ikon Home** pada menu bawah → halaman kembali ke atas dan timeline diperbarui.

**Cara retest**
1. Buka aplikasi Parents di halaman Home.
2. Teacher membuat post baru.
3. Di HP Parents, tarik layar Home ke bawah.
   ✅ Post baru muncul tanpa harus berpindah menu.
4. Ulangi dengan menekan ikon **Home** di menu bawah.

---

### No. 6 — Tombol Enter di Kolom Komentar (ISSUE P-04)

**Yang diubah**
- Kolom komentar kini mendukung **beberapa baris**.
- Tombol Enter/Return pada keyboard membuat **baris baru**. Komentar hanya terkirim saat menekan tombol **Send**.

**Cara retest**
1. Buka komentar pada sebuah post (iOS dan Android).
2. Ketik satu baris → tekan Enter → ketik baris kedua.
   ✅ Komentar belum terkirim, dan kolom bertambah tinggi.
3. Tekan **Send**.
   ✅ Komentar terkirim dengan dua baris.

---

### No. 7 — Edit / Hapus Komentar

**Yang diubah**

| Pengguna | Edit | Hapus |
|---|---|---|
| **Parents** (aplikasi) | Komentar milik sendiri | Komentar milik sendiri |
| **Teacher / Admin** (Web Dashboard → Parent Comments) | Balasan milik sendiri | Semua komentar pada post di kelasnya — komentar Parents maupun balasan Teacher |

Catatan:
- Jika Parents mengedit komentar, komentar tersebut kembali berstatus **Open** di Parent Comments, agar Teacher membaca versi terbarunya.
- Komentar yang dihapus langsung hilang dari tampilan Parents maupun Teacher.

**Cara retest — Parents**
1. Kirim komentar pada sebuah post.
2. Di bawah komentar tersebut tekan **Edit** → ubah teks → **Save**.
   ✅ Teks berubah.
3. Tekan **Delete** → konfirmasi.
   ✅ Komentar hilang.

**Cara retest — Teacher**
1. Buka **Parent Comments** di Web Dashboard.
2. Balas komentar Parents, lalu klik **Edit** pada balasan tersebut → ubah teks → OK.
   ✅ Balasan berubah, juga di aplikasi Parents.
3. Klik **Delete** pada komentar Parents atau balasan → konfirmasi.
   ✅ Komentar hilang, juga di aplikasi Parents.

---

### No. 9 — Ask Teacher via WhatsApp (ISSUE P-06)

**Yang diubah**
- Saat Parents menekan **Ask Ms. …** pada sebuah post, WhatsApp terbuka dengan pesan yang sudah terisi, contoh:
  > Hi Ms. Simona, I have a question about "Water Play" (6 Nov).
- **Admin dapat mengatur teks pesan** melalui *Setup → WhatsApp Numbers → Edit* pada kolom **Ask Teacher message**. Kode yang dapat digunakan:
  - `{teacher}` — nama Teacher
  - `{title}` — judul post
  - `{date}` — tanggal post
- Jika kolom dikosongkan, aplikasi memakai teks default di atas.
- Pengaturan berlaku **per nomor WhatsApp**, sehingga berlaku untuk kelas-kelas yang memakai nomor tersebut.

**Keterbatasan**
- WhatsApp tidak mengizinkan aplikasi lain melampirkan foto/post secara otomatis. Karena itu, referensi dikirim dalam bentuk teks (judul + tanggal).

**Cara retest**
1. Admin membuka *Setup → WhatsApp Numbers → Edit* pada salah satu nomor, mengisi misalnya:
   `Halo {teacher}, saya ingin bertanya tentang "{title}" tanggal {date}.` lalu **Submit**.
2. Pastikan kelas yang diuji menggunakan nomor tersebut (*Setup → Class Arrangement*).
3. Di aplikasi Parents, buka post dari kelas tersebut → tekan **Ask Ms. …**.
4. ✅ WhatsApp terbuka dengan pesan yang sudah terisi sesuai template, termasuk judul dan tanggal post.

---

### No. 10 — Push Notification (ISSUE P-07)

**Status saat ini**
- Push notification **sudah tersedia untuk Announcement**. Saat Teacher/Admin mengirim Announcement (termasuk yang dijadwalkan), Parents di kelas tujuan menerima notifikasi. Menekan notifikasi membuka Announcement tersebut.
- **Regular Post belum mengirim notifikasi.** Inilah alasan tidak ada notifikasi saat pengujian dengan post biasa.

**Syarat agar notifikasi diterima**
- Aplikasi versi **1.0.30 (build 32)** atau lebih baru.
- Izin **Notifikasi** diizinkan di HP.
- Parents sudah login di aplikasi setidaknya satu kali setelah update.

**Mohon konfirmasi**
> Apakah notifikasi **hanya untuk Announcement** sudah cukup untuk rilis ini, atau **Regular Post juga perlu mengirim notifikasi**?
>
> Sebagai pertimbangan: Teacher dapat membuat beberapa Regular Post dalam sehari, sehingga notifikasi untuk setiap post berpotensi terasa terlalu sering bagi Parents.

**Cara retest (Announcement)**
1. Di HP Parents, tutup aplikasi (tidak perlu logout).
2. Teacher mengirim Announcement ke kelas anak tersebut dengan pilihan **Send Now**.
3. ✅ Dalam ±1–2 menit notifikasi muncul. Tekan notifikasi → aplikasi membuka Announcement tersebut.

---

## 4. Panduan Fitur Baru: Card & Schedule (No. 11)

Kedua fitur ini belum ada di aplikasi live sebelumnya, sehingga pengujian pertama diperlakukan sebagai **pengujian fitur baru**.

### 4.1 Card (Member Card)

**Fungsi**
Kartu keanggotaan digital Parents Tutor Time, sekaligus akses ke **benefit/diskon dari partner**.

**Isi halaman**
1. **Kartu member** — nama Parents, **Member ID**, nama anak, dan **QR code**.
2. **QR code** — tekan untuk menampilkan QR dalam ukuran besar (untuk dipindai oleh partner).
3. **Partners near you** — daftar partner yang memberikan benefit kepada member Tutor Time. Setiap partner menampilkan:
   - Besaran diskon dan deskripsi singkat
   - 📍 Jarak dari lokasi Parents (jika izin lokasi diberikan)
   - 🧭 **Directions** — membuka Google Maps ke lokasi partner
   - 📍 **Check in** — menandai kunjungan ke partner

   Jika izin lokasi diberikan, partner diurutkan dari yang **terdekat**. Jika ditolak, daftar tetap tampil tanpa urutan jarak.

> **Catatan:** Pemindaian QR oleh partner dan tombol **Check in** saat ini masih berupa **demo**. Check in hanya tersimpan di HP tersebut untuk hari itu dan belum terkirim ke sistem. Mekanisme pemindaian dan pencatatan diskon di sisi partner masih akan difinalkan. Untuk saat ini, mohon uji tampilan dan alur penggunaannya saja.

**Cara penggunaan oleh Parents**
1. Kunjungi partner yang tercantum.
2. Saat pembayaran, buka menu **Card** dan tunjukkan **QR code** kepada kasir.
3. Diskon berlaku setelah QR dipindai oleh partner.

**Cara pengujian**

| No. | Langkah | Hasil yang diharapkan |
|---|---|---|
| 1 | Buka menu **Card** | Nama Parents, Member ID, dan nama anak tampil dengan benar |
| 2 | Tekan QR code | QR tampil dalam ukuran besar dan dapat ditutup kembali |
| 3 | Izinkan akses lokasi saat diminta | Daftar partner terurut dari yang terdekat, beserta jaraknya |
| 4 | Tolak akses lokasi (uji di HP lain atau setelah reset izin) | Daftar partner tetap tampil |
| 5 | Tekan **🧭 Directions** pada salah satu partner | Google Maps terbuka ke lokasi partner |
| 6 | Tekan **📍 Check in** pada salah satu partner | Muncul tanda *✓ Checked in* beserta jam; **Undo** membatalkannya |

### 4.2 Schedule (Weekly Schedule / Lesson Plan)

**Fungsi**
Menampilkan **jadwal kegiatan anak Senin–Jumat minggu berjalan**, misalnya Circle Time, Learning Centers, Outdoor Play, dan Storytime.

**Dari mana datanya?**
- Jadwal diambil langsung dari **Lesson Planner** milik Teacher kelas tersebut.
- Teacher **tidak perlu memposting** jadwal secara terpisah.
- Jadwal minggu tersebut tampil di aplikasi **hanya setelah lesson plan berstatus *Approved* atau *Published*** di Lesson Planner.
- Jika lesson plan minggu ini belum di-approve/publish, Schedule akan tampil **kosong**. Ini normal, bukan error.

**Cara penggunaan oleh Parents**
1. Buka menu **Schedule**.
2. Jika memiliki lebih dari satu anak, pilih anak di bagian atas.
3. Lihat kegiatan per hari beserta jamnya.

**Cara pengujian**

| No. | Langkah | Hasil yang diharapkan |
|---|---|---|
| 1 | Teacher membuat lesson plan minggu ini di Lesson Planner, lalu **Approve/Publish** | — |
| 2 | Di aplikasi Parents (anak di kelas tersebut), buka **Schedule** | Jadwal Senin–Jumat tampil sesuai lesson plan |
| 3 | Bandingkan setiap hari dan jam dengan lesson plan | Kegiatan dan jam sesuai |
| 4 | Ganti anak (untuk Parents dengan >1 anak) | Jadwal berganti sesuai kelas anak tersebut |
| 5 | Buka Schedule untuk anak di kelas yang lesson plan-nya **belum** di-approve | Jadwal kosong — sesuai desain |

---

## 5. Hal yang Memerlukan Konfirmasi dari Tim UAT

1. **Tagging & visibility (No. 1):** apakah tagging perlu membatasi siapa yang dapat melihat post?
2. **Push notification (No. 10):** apakah notifikasi cukup untuk Announcement saja, atau Regular Post juga perlu?
3. **Hapus komentar oleh Teacher (No. 7):** saat ini Teacher dapat menghapus komentar Parents pada post di kelasnya. Apakah hal ini sesuai, atau Teacher hanya boleh menghapus balasan miliknya sendiri?

---

## 6. Catatan untuk Retest

Sesuai catatan pada dokumen UAT, mohon setiap hasil retest dilengkapi dengan:
- Jenis HP dan versi OS (contoh: iPhone 13, iOS 18.1 / Samsung A54, Android 14)
- Versi aplikasi (harus **1.0.30 build 32**)
- Browser dan versinya (untuk Web Dashboard)
- Screenshot atau screen recording untuk setiap temuan yang masih gagal
- Langkah reproduksi

Jika ada temuan baru di luar daftar ini, mohon dicatat terpisah.
