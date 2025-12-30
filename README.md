# TDB-PMI Prov SUMUT

Tanggap darurat bencana banjir dan longsor 2025 - Pusat Data dan Teknologi Informasi Palang Merah Indonesia (PMI) Provinsi Sumatera Utara tahun 2025

## Fitur Utama

### 1. API Service (`src/main.ts`)

Menyediakan REST API untuk mengakses data terkini:

- **BNPB Data**: `/api/bnpb/latest`
- **PMI Giat**: `/api/pmi/giat`
- **PMI Posko**: `/api/pmi/posko`
- **KoBoToolbox Shelter**: `/api/kobo/shelter`
- **KoBoToolbox Service**: `/api/kobo/service`
- **Dashboard**: Web dashboard visualisasi data (`/`)

### 2. Data Crawler (`src/crawl.ts`)

Script otomatis untuk mengambil data dari GIS BNPB dan menyimpannya ke Google Sheets:

- Mengambil data per provinsi (Default: Sumatera Utara)
- Mencatat jumlah korban (Hilang, Meninggal, Luka)
- Mencatat kerusakan (Rumah, Fasum, dll)
- Detail data meninggal per Kabupaten
- Auto-retry mechanism dan logging yang rapi

## Prasyarat

- [Bun](https://bun.sh) installed
- Akun Google Cloud dengan Service Account aktif
- Google Sheet yang sudah dishare ke email Service Account (Editor access)
- KoBoToolbox API Token (jika menggunakan fitur KoBo)

## Instalasi

1. Clone repository ini
2. Install dependencies:
   ```bash
   bun install
   ```

## Konfigurasi

Buat file `.env` di root folder (bisa copy dari `.env.example`):

```bash
cp .env.example .env
```

Isi variabel environment berikut:

```env
PORT=3000

# Konfigurasi BNPB
BNPB_URL=https://gis.bnpb.go.id/server/rest/services/covid19/Data_Bencana_Indonesia_Per_Provinsi/FeatureServer/0/query
PROVINSI="Sumatera Utara"

# Konfigurasi KoBoToolbox (Opsional)
KOBO_API_URL=https://kobo.humanitarianresponse.info/api/v2
KOBO_API_TOKEN=your_token
KOBO_ASSESSMENT_UID=asset_uid
KOBO_SERVICE_UID=asset_uid

# Konfigurasi Google Sheets
GOOGLE_SHEET_ID=your_sheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

## Cara Menjalankan

### Menjalankan Server (Development)

Server akan berjalan di `http://localhost:3000` dengan fitur hot-reload.

```bash
bun run dev
```

### Menjalankan Server (Production)

```bash
bun run start
```

### Menjalankan Data Crawler

Untuk menjalankan proses crawling data BNPB ke Google Sheets satu kali:

```bash
bun run crawl
```

### Build Project

Untuk membuild project menjadi single file executable:

```bash
bun run build
```

## Struktur Project

- `src/main.ts`: Entry point untuk API Server (Hono)
- `src/crawl.ts`: Script crawler data BNPB
- `src/service/`: Logic service layer (BNPB, PMI, Kobo)
- `public/`: Static files untuk dashboard frontend
