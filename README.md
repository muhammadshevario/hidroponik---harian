# Hidroponik Harian — Logbook Tim

Aplikasi web responsif untuk input laporan harian hidroponik, ringkasan pH/PPM, grafik tinggi tanaman, pencarian riwayat, dan foto. Data laporan disimpan di Cloud Firestore agar semua anggota melihat sumber data yang sama.

## Penting sebelum dipakai
- Aplikasi ini **belum tersambung** sampai Anda mengisi `public/firebase-config.js` dengan konfigurasi Firebase milik tim.
- Jangan memakai aturan Firestore/Storage terbuka untuk publik pada penggunaan nyata.
- Versi awal ini belum memiliki login. Aturan contoh di bawah hanya untuk uji coba terkontrol. Untuk pemakaian tim yang sebenarnya, aktifkan Firebase Authentication dan batasi akses hanya untuk anggota yang diizinkan.
- `apiKey` konfigurasi Firebase web bukan private key server. Jangan pernah memasukkan service account/private key ke frontend.

## 1. Buat project Firebase
1. Buka https://console.firebase.google.com/ dan buat project, misalnya `hidroponik-harian-tim`.
2. Tambahkan aplikasi Web (ikon `</>`), beri nama aplikasi, lalu salin objek konfigurasi SDK.
3. Buka **Build → Firestore Database → Create database**. Pilih lokasi terdekat yang sesuai kebutuhan tim.
4. Buka **Build → Storage → Get started** untuk mengaktifkan foto. Jika console meminta mengaktifkan billing, ikuti ketentuan yang ditampilkan Firebase.
5. Buka `public/firebase-config.js`, lalu ganti semua nilai `ISI_...` dengan nilai konfigurasi proyek Anda. Jangan mengubah nama properti.

## 2. Aturan keamanan untuk pengujian awal
Firestore → Rules. Untuk tes singkat dengan anggota yang Anda percayai, aturan sementara dapat berupa:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /reports/{reportId} {
      allow read, create: if true;
      allow update, delete: if false;
    }
  }
}
```

**Peringatan:** aturan di atas membolehkan siapa pun yang mengetahui project/app dapat membaca dan menambahkan laporan. Gunakan hanya untuk tes singkat dengan data non-sensitif. Jangan biarkan ini sebagai aturan produksi.

Storage → Rules, untuk uji coba singkat:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /report-photos/{reportId}/{fileName} {
      allow read: if true;
      allow create: if request.resource != null
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
      allow update, delete: if false;
    }
  }
}
```

Catatan: aturan Storage di atas ditujukan untuk pengujian dan tidak memberikan kontrol keanggotaan. Untuk pemakaian nyata, aktifkan Firebase Authentication dan ubah aturan Firestore/Storage agar hanya pengguna terautentikasi dan/atau anggota tim yang boleh membaca/menulis. Jika ingin, saya bisa bantu susun aturan berdasarkan model anggota tim Anda.

## 3. Jalankan lokal
Aplikasi menggunakan ES modules dan impor Firebase dari CDN, jadi jalankan lewat server lokal, bukan membuka `index.html` sebagai `file://`.

Cara mudah:
1. Instal Node.js versi LTS dari https://nodejs.org/.
2. Buka terminal di folder proyek ini.
3. Jalankan:
   ```bash
   npx serve .
   ```
4. Buka URL lokal yang ditampilkan. Untuk tes HP lain di Wi-Fi yang sama, gunakan alamat LAN komputer Anda jika server mengizinkan koneksi LAN.

## 4. Deploy ke Firebase Hosting
1. Instal Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```
2. Login:
   ```bash
   firebase login
   ```
3. Di folder proyek, inisialisasi Hosting:
   ```bash
   firebase init hosting
   ```
   Pilih project Firebase yang tadi dibuat, set public directory menjadi `public`, dan pilih **No** untuk single-page app rewrite (kecuali Anda mengubah routing).
4. Salin `firebase.json` contoh yang disertakan atau pastikan hosting menunjuk ke `public`.
5. Deploy:
   ```bash
   firebase deploy --only hosting
   ```
6. Buka URL Hosting yang diberikan. Bagikan URL yang sama ke anggota tim.

## 5. Tes wajib sebelum digunakan
- Simpan satu laporan dengan tanggal, nama pelapor, tanaman, pH/PPM, tinggi, dan catatan.
- Pastikan indikator menjadi **Tersinkron** dan laporan muncul di Riwayat.
- Refresh halaman; laporan harus tetap ada.
- Buka URL Hosting yang sama di HP teman; laporan yang sama harus muncul.
- Coba unggah foto. Jika gagal, cek Firebase Storage aktif dan aturan Storage.
- Jika gagal membaca/menyimpan, periksa Console browser dan tab Firestore/Storage Rules.

## Struktur
- `public/index.html` — tampilan aplikasi
- `public/style.css` — desain responsif
- `public/app.js` — logika formulir, Firestore, grafik, dan riwayat
- `public/firebase-config.js` — konfigurasi web Firebase
- `firebase.json` — konfigurasi Firebase Hosting

## Batasan versi awal
- Tidak ada autentikasi/login dan belum ada fungsi edit/hapus.
- Foto memakai Firebase Storage, terpisah dari dokumen Firestore.
- Grafik menampilkan hingga 20 titik laporan terbaru yang memiliki nilai tinggi tanaman, tanpa memisahkan jenis tanaman. Untuk analisis pertumbuhan yang akurat, filter per tanaman/bedeng sebaiknya ditambahkan pada versi berikutnya.
- Firebase berpotensi mengenakan biaya jika penggunaan melebihi kuota gratis; cek dashboard usage/billing.

## Membuat aplikasi Android APK
Paket ini juga sudah dilengkapi konfigurasi Capacitor dan GitHub Actions untuk membangun APK. Ikuti langkah di [`PANDUAN_APK.md`](PANDUAN_APK.md). APK belum dibuat otomatis di dalam ZIP ini; workflow GitHub yang akan membangunnya setelah proyek diunggah.
