# Panduan membuat APK Hidroponik Harian

Paket ini membungkus website `public/` menjadi aplikasi Android menggunakan Capacitor. Build APK dilakukan melalui GitHub Actions, jadi tidak wajib memasang Android Studio di HP/komputer sendiri.

## Sebelum build

1. Pastikan `public/firebase-config.js` sudah diisi dengan konfigurasi Firebase milik tim.
2. Siapkan akun GitHub dan buat repository baru, misalnya `hidroponik-harian-android`.
3. Unggah semua isi folder proyek ini ke repository. Pastikan folder `.github/workflows/` ikut terunggah. Jika mengunggah dari browser HP, unggah file dan folder dengan fitur upload GitHub atau gunakan GitHub Desktop/terminal di komputer.
4. Buka tab **Actions** pada repository. Jika diminta, izinkan Actions.
5. Pilih workflow **Build APK Android** di sisi kiri, tekan **Run workflow**, lalu tekan tombol hijau untuk menjalankan.
6. Tunggu sampai proses selesai dengan status hijau. Buka hasil run, cari bagian **Artifacts**, lalu unduh `hidroponik-harian-apk`.
7. Ekstrak ZIP artifact, lalu pindahkan `app-debug.apk` ke HP Android dan buka untuk menginstal. Android mungkin meminta izin **Install unknown apps** untuk aplikasi/file manager yang digunakan. Izinkan hanya jika kamu yakin file berasal dari repository milikmu sendiri.

## Catatan penting

- Workflow ini menghasilkan **APK debug** untuk pengujian, bukan paket rilis Play Store.
- APK memerlukan internet karena Firebase SDK dimuat dari CDN dan data disimpan online.
- APK tidak akan bisa menyinkronkan laporan lintas HP sampai Firebase dikonfigurasi dan Firestore/Storage siap.
- Jangan menggunakan aturan Firebase yang mengizinkan semua orang membaca/menambah data untuk penggunaan sungguhan. Tambahkan login dan aturan akses yang sesuai sebelum membagikan ke banyak orang.
- Jika nama atau ikon aplikasi ingin diganti, ubah `appName`/`appId` di `capacitor.config.json`. `appId` harus unik dan sebaiknya tidak diganti setelah aplikasi mulai dipakai.
- Workflow ini mengunduh dependensi dari npm dan Android Gradle Plugin saat build; jika ada versi yang tidak kompatibel di masa depan, workflow mungkin perlu diperbarui.
