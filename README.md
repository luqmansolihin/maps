# Google Maps Clone (JavaScript & Leaflet.js)

Aplikasi web peta interaktif mandiri dengan tampilan dan fitur modern menyerupai **Google Maps**. Dibangun menggunakan **JavaScript murni (ES6+)**, **HTML5**, **CSS3**, dan **Leaflet.js** tanpa ketergantungan pada Google Maps API berbayar (100% gratis & open-source).

![Screenshot Google Maps Clone](https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png)

---

## Fitur Utama

1. **Tampilan & Rasa Google Maps Asli**:
    - Floating search bar di pojok kiri atas dengan ikon menu, riwayat, dan tombol rute cepat.
    - Peta responsif penuh layar (_full-screen interactive map_).
    - Animasi transisi halus dan popup modern.

2. **Pilihan Layer Peta (Layer Switcher di Kiri Bawah)**:
    - 🗺️ **Jalan (Default)**: Tampilan jalan modern dan bersih dari CartoDB Voyager.
    - 🛰️ **Satelit**: Foto citra satelit resolusi tinggi dari Esri World Imagery + label jalan.
    - 🌙 **Mode Gelap (Dark Mode)**: Tampilan malam yang elegan dari CartoDB Dark Matter.
    - ⛰️ **Topografi**: Tampilan kontur ketinggian dan alam dari OpenTopoMap.

3. **Pencarian Lokasi Cepat (Geocoding & Autocomplete)**:
    - Pencarian alamat, gedung, atau kota di seluruh dunia (didukung oleh Nominatim OpenStreetMap).
    - Saran pencarian (_autocomplete suggestions_) secara real-time saat mengetik.
    - Navigasi keyboard (panah atas/bawah, Enter, Escape).
    - Riwayat pencarian yang tersimpan otomatis di browser.

4. **Petunjuk Arah & Rute (Directions / Routing)**:
    - Pilihan mode transportasi: **Mobil (Driving)**, **Sepeda (Cycling)**, dan **Pejalan Kaki (Walking)**.
    - Input titik asal dan titik tujuan dengan fitur autocomplete.
    - Tombol **"Gunakan Lokasi Saat Ini"** untuk titik asal instan.
    - Tombol balik arah (tukar asal dan tujuan).
    - Menghitung total jarak (km) dan estimasi waktu tempuh secara akurat (OSRM Engine).
    - Daftar instruksi langkah demi langkah (_turn-by-turn_) dalam Bahasa Indonesia.
    - Klik pada salah satu instruksi langkah untuk menyorot tikungan/lokasi tersebut di peta.

5. **Detail Lokasi & Info Titik (Reverse Geocoding)**:
    - Klik di mana saja pada peta untuk melihat alamat lengkap, nama tempat, dan koordinat lintang-bujur (_lat, lng_).
    - Tombol **"Rute"** langsung dari kartu detail tempat.
    - Tombol **"Salin Koordinat"** ke clipboard.
    - Tombol **"Bagikan"** tautan peta dengan koordinat spesifik (_deep-link_).

6. **Lokasi Saya (GPS / Geolocation)**:
    - Tombol pelacak lokasi saat ini dengan penanda titik biru berdenyut (_pulsing blue dot_) dan lingkaran estimasi akurasi.

7. **Tempat Tersimpan (Bookmarks / Favorit)**:
    - Simpan lokasi favorit yang tersimpan persisten di `localStorage`.
    - Buka menu hamburger di search bar untuk melihat daftar tempat tersimpan dan melompat ke lokasi dengan satu klik.

---

## Struktur File Proyek

```
maps/
├── index.html              # Antarmuka utama aplikasi
├── package.json            # Konfigurasi npm & dependensi dev server (Vite)
├── README.md               # Dokumentasi proyek
├── css/
│   ├── style.css           # Variabel tema, layout dasar, dan notifikasi
│   └── components.css      # Styling search bar, panel rute, layer, dan kartu tempat
└── js/
    ├── app.js              # Entry point utama & orkestrasi aplikasi
    ├── config.js           # Konfigurasi tile layers, koordinat default, dan API endpoints
    ├── map.js              # Inisialisasi peta Leaflet & custom pin/markers
    ├── search.js           # Penanganan autocomplete pencarian & riwayat
    ├── routing.js          # Mesin kalkulasi rute OSRM & formatter navigasi
    ├── places.js           # Reverse geocoding saat klik peta & kartu detail
    └── storage.js          # Pengelolaan localStorage untuk riwayat & favorit
```

---

## Cara Menjalankan Proyek

### Opsi 1: Menggunakan Dev Server Vite (Rekomendasi)

Jalankan perintah berikut di terminal:

```bash
# Menjalankan server pengembangan lokal
npm run dev
```

Buka URL yang ditampilkan di terminal (biasanya `http://localhost:5173`) pada peramban web Anda.

### Opsi 2: Menggunakan Server Web Statis Lainnya

Jika Anda memiliki Python atau ekstensi VS Code Live Server:

```bash
# Menggunakan Python
python -m http.server 3000

# Atau menggunakan npx serve
npx serve .
```

Lalu buka `http://localhost:3000`.

---

## Sumber Daya & API yang Digunakan (100% Gratis)

- **Leaflet.js (v1.9.4)**: Library pemetaan JavaScript terbuka & cepat.
- **CartoDB & OpenStreetMap**: Penyedia tile layer jalan dan mode gelap.
- **Esri World Imagery**: Foto citra satelit resolusi tinggi.
- **Nominatim (OpenStreetMap)**: Geocoding (pencarian teks ke koordinat) dan Reverse Geocoding (koordinat ke alamat).
- **OSRM (Open Source Routing Machine)**: Kalkulasi jalur dan petunjuk navigasi.
