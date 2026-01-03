import axios from "axios";

const BASE_URL = process.env.KOBO_URL || "https://kc.ifrc.org/api";
const API_TOKEN = process.env.KOBO_API_TOKEN || "";
const ASSESSMENT_UID = process.env.KOBO_ASSESSMENT_UID || "";
const SERVICE_UID = process.env.KOBO_SERVICE_UID || "";

interface AssessmentData {
    "pengungsi/jml_kk": string | number;
    "pengungsi/jml_jiwa": string | number;
    "pengungsi/pengungsi_usia_jk/pengungsi_lk/total_pengungsi_lk": string | number;
    "pengungsi/pengungsi_usia_jk/pengungsi_pr/total_pengungsi_pr": string | number;
    "pengungsi/pengungsi_kel_rentan/total_pengungsi_kel_rentan": string | number;
    "pengungsi/total_pengungsi": string | number;
    "umum/id-kabkota": string;
    "umum/kabkota": string;
    "pengungsi/pengungsi_usia_jk/pengungsi_lk/lk_5th": string | number;
    "pengungsi/pengungsi_usia_jk/pengungsi_pr/pr_5th": string | number;
    "pengungsi/pengungsi_usia_jk/pengungsi_lk/lk_5-17th": string | number;
    "pengungsi/pengungsi_usia_jk/pengungsi_pr/pr_5-17th": string | number;
    "pengungsi/pengungsi_usia_jk/pengungsi_lk/lk_18-60th": string | number;
    "pengungsi/pengungsi_usia_jk/pengungsi_pr/pr_18-60th": string | number;
    "pengungsi/pengungsi_usia_jk/pengungsi_lk/lk_60th": string | number;
    "pengungsi/pengungsi_usia_jk/pengungsi_pr/pr_60th": string | number;
    "pengungsi/pengungsi_kel_rentan/ibu_hamil": string | number;
    "pengungsi/pengungsi_kel_rentan/ibu_menyusui": string | number;
    "pengungsi/pengungsi_kel_rentan/disabilitas": string | number;
    "pengungsi/pengungsi_kel_rentan/anak_tanpa_pendamping": string | number;
    "pengungsi/pengungsi_kel_rentan/wanita_sebagai_kk": string | number;
}

interface ServiceData {
    jenis_layanan: string;
    sub_layanan?: string;
    sal_kegiatan?: string;
    sal_distribusi?: string;
    jenis_bantuan?: string;
    status_rujukan?: string;
    "jenis_kelamin/total_manfaat": string | number;
    "jenis_kelamin/laki_laki"?: string | number;
    "jenis_kelamin/perempuan"?: string | number;
    "pen_man_usia_laki/usia_5l"?: string | number;
    "pen_man_usia_laki/usia5_17l"?: string | number;
    "pen_man_usia_laki/usia18_60l"?: string | number;
    "pen_man_usia_laki/usia_60l"?: string | number;
    "pen_man_usia_perempuan/usia_5p"?: string | number;
    "pen_man_usia_perempuan/usia5_17p"?: string | number;
    "pen_man_usia_perempuan/usia18_60p"?: string | number;
    "pen_man_usia_perempuan/usia_60p"?: string | number;
    jml_brg_unit?: string | number;
    satu_an?: string;
    [key: string]: any;
}

interface TotalPengungsi {
    kk: number;
    jiwa: number;
    laki: number;
    perempuan: number;
    rentan: number;
}

interface PengungsiPerKabKota {
    id: string;
    kabKota: string;
    total: number;
}

interface PengungsiUsia {
    name: string;
    value: number;
}

interface PengungsiRentan {
    name: string;
    value: number;
}

interface ShelterStatistics {
    totalPengungsi: TotalPengungsi;
    pengungsiPerKabKota: PengungsiPerKabKota[];
    pengungsiUsia: PengungsiUsia[];
    pengungsiRentan: PengungsiRentan[];
}

interface GenderDetail {
    lakiLaki: number;
    perempuan: number;
    total: number;
}

interface AgeDetail {
    kurangDari5: number;
    antara5Hingga17: number;
    antara18Hingga60: number;
    lebihDari60: number;
}

interface DetailItem {
    name: string;
    count: number;
    penerimaManfaat: number;
    jumlah?: string; // Optional: untuk WASH sub layanan dengan liter
}

interface BantuanItem {
    name: string;
    jumlah: number;
    satuan: string;
}

interface PenyakitItem {
    name: string;
    jumlah: number;
}

interface ServiceDetail {
    subLayanan?: DetailItem[];
    saluranDistribusi?: DetailItem[];
    jenisBantuanFood?: BantuanItem[];
    jenisBantuanNonFood?: BantuanItem[];
    jenisPenyakit?: PenyakitItem[];
    statusRujukan?: DetailItem[];
}

interface ServiceStatistic {
    id: string;
    value: string;
    count: number;
    penerimaManfaat: number;
    jumlah: string | null;
    jenisKelamin: GenderDetail;
    usia: AgeDetail;
    detail?: ServiceDetail;
}

interface GiatDetail {
    jenis_kelamin: {
        laki_laki: number;
        perempuan: number;
    };
    usia: {
        kurang_dari_5: number;
        antara_5_17: number;
        antara_18_60: number;
        lebih_dari_60: number;
    };
    // Conditional fields based on layanan type
    jumlah?: string;
    jenis_penyakit?: string;
    bantuan?: string;
    saluran_distribusi?: string;
    [key: string]: any;
}

interface GiatData {
    jenis_layanan: string;
    sub_layanan: string;
    total_penerima_manfaat: number;
    note: string;
    lokasi_kegiatan: string;
    tanggal_kegiatan: string;
    nama_pelapor: string;
    kab_kota_id: string;
    kab_kota_name: string;
    detail?: GiatDetail;
}

export class KoboService {
    private static readonly kabKotaDefinitions: Record<string, string> = {
        "1201": "Nias",
        "1202": "Mandailing Natal",
        "1203": "Tapanuli Selatan",
        "1204": "Tapanuli Tengah",
        "1205": "Tapanuli Utara",
        "1206": "Toba Samosir",
        "1207": "Labuhan Batu",
        "1208": "Asahan",
        "1209": "Simalungun",
        "1210": "Dairi",
        "1211": "Karo",
        "1212": "Deli Serdang",
        "1213": "Langkat",
        "1214": "Nias Selatan",
        "1215": "Humbang Hasundutan",
        "1216": "Pakpak Bharat",
        "1217": "Samosir",
        "1218": "Serdang Bedagai",
        "1219": "Batu Bara",
        "1220": "Padang Lawas Utara",
        "1221": "Padang Lawas",
        "1222": "Labuhan Batu Selatan",
        "1223": "Labuhan Batu Utara",
        "1224": "Nias Utara",
        "1225": "Nias Barat",
        "1271": "Kota Sibolga",
        "1272": "Kota Tanjung Balai",
        "1273": "Kota Pematang Siantar",
        "1274": "Kota Tebing Tinggi",
        "1275": "Kota Medan",
        "1276": "Kota Binjai",
        "1277": "Kota Padangsidimpuan",
        "1278": "Kota Gunungsitoli",
        "1288": "Danau Toba",
    };

    private static readonly layananDefinitions: Record<string, string> = {
        pertolongan_pertama: 'Pertolongan Pertama/Pencarian Korban',
        evakuasi_korban: 'Evakuasi Korban Mengungsi',
        shelter: 'Shelter',
        medis: 'Medis',
        tim_ambulans: 'Tim Ambulans',
        dapur_umum: 'Dapur Umum',
        relief_distribusi: 'Relief/Distribusi',
        wash: 'WASH',
        pemulihan_hubungan: 'Pemulihan Hubungan Keluarga',
        dukungan_psikososial: 'Dukungan Psikososial',
    };

    private static readonly subLayananDefinitions: Record<string, Record<string, string>> = {
        shelter: {
            'hunian_sementara': 'Hunian Sementara',
            'hunian_tetap': 'Hunian Tetap',
            'pembersihan_puing': 'Pembersihan Puing',
            'hunian_darurat': 'Hunian Darurat (terpal)',
            'hunian_tradisional': 'Hunian Tradisional (Kayu)',
            'promosi_rumah': 'Promosi Rumah Aman',
            'pembangunan_fisik': 'Pembangunan Fisik',
            'sekolah_darurat': 'Sekolah Darurat',
            'sekolah_permanen': 'Sekolah Permanen',
            'tempat_ibadah_darurat': 'Tempat Ibadah Darurat',
            'tempat_ibadah': 'Tempat Ibadah Permanen',
        },
        medis: {
            'layanan_kesehatan_tetap': 'Layanan Kesehatan Tetap',
            'layanan_kesehatan_keliling': 'Layanan Kesehatan Keliling',
            'promosi_kesehatan': 'Promosi Kesehatan',
            'surveilans_berbasis_masyarakat': 'Surveilans Berbasis Masyarakat',
            'vaksinasi': 'Vaksinasi',
        },
        tim_ambulans: {
            'layanan_ambulan_rujukan': 'Layanan Ambulan Rujukan',
            'layanan_mobil_jenazah': 'Layanan Mobil Jenazah',
        },
        relief_distribusi: {
            'distribusi_barang_food': 'Distribusi Barang Food Item',
            'distribusi_barang_non_food': 'Distribusi Barang Non Food Item',
        },
        wash: {
            'distribusi_air_bersih': 'Distribusi Air Bersih',
            'penyemprotan_disinfektan': 'Penyemprotan Disinfektan',
            'promosi_kebersihan': 'Promosi Kebersihan',
            'pembuatan_sanitasi': 'Pembuatan Sanitasi',
            'pembersihan_sumur': 'Pembersihan Sumur',
            'pusat_kesehatan': 'Pusat Kesehatan',
            'kamar_mandi_renov': 'Kamar Mandi Renovasi',
            'kamar_mandi_baru': 'Kamar Mandi Baru',
            'jamban_renov': 'Jamban Renovasi',
            'jamban_baru': 'Jamban Baru',
            'pemasangan_pipa': 'Pemasangan Pipa (m)',
            'tempat_pembuangan_akhir': 'Tempat Pembuangan Akhir',
            'produksi_air_bersih': 'Produksi Air Bersih',
            'pembersihan_lingkungan': 'Pembersihan Lingkungan',
        },
        pemulihan_hubungan: {
            'saya_mencari': 'Saya Mencari',
            'saya_selamat': 'Saya Selamat',
            'telepon_gratis': 'Telepon Gratis',
            'reunifikasi': 'Reunifikasi',
            'anak_tanpa_pendamping': 'Anak Tanpa Pendamping',
        },
        dukungan_psikososial: {
            'expresif kreatif': 'Expresif Kreatif',
            'fgd_dewasa': 'FGD Dewasa dan Lansia',
            'sense_of_place': 'Sense of Place',
            'informal_schooling': 'Informal Schooling',
            'debrifing_relawan': 'Debriefing Relawan',
            'psychological_first': 'Psychological First Aid',
            'assesment': 'Assessment',
            'jejajaring': 'Jejaring',
            'sikoedukasi': 'Psikoedukasi',
            'home_visit': 'Home Visit',
            'perawatan_keluarga': 'Perawatan Keluarga',
        },
    };

    private static readonly saluranKegiatanDefinitions: Record<string, string> = {
        'tatap_muka': 'Tatap Muka',
        'media_kie': 'Media Cetak / KIE',
        'pengumuman_keliling': 'Pengumuman Keliling',
        'radio_komunitas': 'Radio Komunitas',
        'media_sosial': 'Media Sosial',
        'diskusi_kelompok': 'Diskusi Kelompok',
        'whatsapp_group': 'WhatsApp Group',
    };

    private static readonly saluranDistribusiDefinitions: Record<string, string> = {
        'dist_langsung': 'Distribusi Langsung',
        'dist_lok_pengungsian': 'Distribusi ke Lokasi Pengungsian',
        'dist_lok_disepakati': 'Distribusi ke Titik yang Disepakati',
        'dist_ke_faskes': 'Distribusi ke Fasilitas Kesehatan',
        'peng_markas_pmi': 'Pengambilan di Markas PMI',
    };

    private static readonly statusRujukanDefinitions: Record<string, string> = {
        'luka_berat': 'Luka Berat',
        'luka_ringan': 'Luka Ringan',
        'meninggal_dunia': 'Meninggal Dunia',
        'lainnya1': 'Lainnya',
    };

    private static readonly jenisPenyakitDefinitions: Record<string, string> = {
        'diare': 'Diare',
        'ispa': 'ISPA',
        'mialgia': 'Mialgia',
        'gatal_gatal': 'Gatal-Gatal',
        'muntah_muntah': 'Muntah-Muntah',
        'common_flu_cold': 'Common Flu/Cold',
        'hipertensi': 'Hipertensi',
        'tb_paru': 'TB Paru',
        'dbd': 'DBD',
        'typhoid': 'Typhoid',
        'kolera': 'Kolera',
        'pes': 'Pes',
        'demam_berdarah': 'Demam Berdarah Dengue',
        'campak': 'Campak',
        'polio': 'Polio',
        'difteri': 'Difteri',
        'pertusis': 'Pertusis',
        'rabies': 'Rabies',
        'malaria': 'Malaria',
        'avian_influenza': 'Avian Influenza H5N1',
        'antraks': 'Antraks',
        'leptospirosis': 'Leptospirosis',
        'hepatitis': 'Hepatitis',
        'influenza_a': 'Influenza A baru (H1N1)/Pandemi 2009',
        'meningitis': 'Meningitis',
        'yellow_fever': 'Yellow Fever',
        'chikungunya': 'Chikungunya',
        'lainnya1': 'Lainnya',
    };

    private static readonly jenisBantuanFoodDefinitions: Record<string, string> = {
        'air_mineral': 'Air Mineral',
        'beras_beras': 'Beras',
        'biskuit_biskuit': 'Biskuit',
        'minyak_goreng': 'Minyak Goreng',
        'gula_pasir': 'Gula Pasir',
        'kopi_kopi': 'Kopi',
        'makanan_makanan': 'Makanan',
        'mie_instan': 'Mie Instan',
        'minuman_minuman': 'Minuman',
        'sembako_sembako': 'Sembako',
        'susu_bayi': 'Susu Bayi',
        'vitamin_vitamin': 'Vitamin',
        'nasi_bungkus': 'Makanan Siap Saji',
    };

    private static readonly jenisBantuanNonFoodDefinitions: Record<string, string> = {
        'alat_spraying': 'Alat Spraying',
        'baby_kit': 'Baby Kit',
        'cleaning_kit': 'Cleaning Kit',
        'water_pump': 'Water Pump',
        'selang_spiral': 'Selang Spiral',
        'pakaian_pakai': 'Pakaian Layak Pakai',
        'perlengkapan_mandi': 'Perlengkapan Mandi',
        'pembalut_wanita': 'Pembalut Wanita',
        'karpet_karpet': 'Karpet',
        'springbed_springbed': 'Springbed',
        'family_kit': 'Family Kit',
        'googles_googles': 'Googles',
        'handsanitaizer_handsanitaizer': 'Hand Sanitizer',
        'hazmat_hazmat': 'Hazmat',
        'hygiene_kit': 'Hygiene Kit',
        'jas_hujan': 'Jas Hujan',
        'kelambu_kelambu': 'Kelambu',
        'kruk_kruk': 'Kruk',
        'kursi_roda': 'Kursi Roda',
        'masker_kain': 'Masker Kain',
        'masker_medis': 'Masker Medis',
        'n_n95': 'N95',
        'paket_phbs': 'Paket PHBS',
        'sabun_mandi': 'Sabun Mandi',
        'sabun_cuci': 'Sabun Cuci',
        'popok_bayi': 'Popok Bayi',
        'sarung_sarung': 'Sarung',
        'sarung_karet': 'Sarung Tangan Karet',
        'sarung_medis': 'Sarung Tangan Medis',
        'school_kit': 'School Kit',
        'sekop_sekop': 'Sekop',
        'selimut_selimut': 'Selimut',
        'seng_seng': 'Seng',
        'shalter_kits': 'Shelter Tools Kit',
        'sprei_sprei': 'Sprei',
        'desinfeksi_desinfeksi': 'Desinfeksi',
        'tandon_air': 'Tandon Air',
        'terpaulin_terpaulin': 'Terpaulin',
        'tikar_matras': 'Tikar/Matras',
        'voucher': 'Voucher',
        'uang_tunai': 'Uang Tunai',
    };

    private static async fetch(url: string) {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Token ${API_TOKEN}`,
                Accept: "application/json",
            },
        });
        return response.data;
    }

    private static async assessmentData() {
        return this.fetch(`${BASE_URL}/v2/assets/${ASSESSMENT_UID}/data.json`);
    }

    private static async serviceData() {
        return this.fetch(`${BASE_URL}/v2/assets/${SERVICE_UID}/data.json`);
    }

    private static toNumber(value: string | number | undefined | null): number {
        if (value === undefined || value === null || value === "") return 0;
        return typeof value === "number" ? value : parseFloat(String(value)) || 0;
    }

    public static async getShelterStatistics(): Promise<ShelterStatistics> {
        const data = await this.assessmentData();
        const results: AssessmentData[] = data.results || [];

        const totalPengungsi: TotalPengungsi = results.reduce(
            (acc, item) => ({
                kk: acc.kk + this.toNumber(item["pengungsi/jml_kk"]),
                jiwa: acc.jiwa + this.toNumber(item["pengungsi/jml_jiwa"]),
                laki:
                    acc.laki +
                    this.toNumber(
                        item["pengungsi/pengungsi_usia_jk/pengungsi_lk/total_pengungsi_lk"]
                    ),
                perempuan:
                    acc.perempuan +
                    this.toNumber(
                        item["pengungsi/pengungsi_usia_jk/pengungsi_pr/total_pengungsi_pr"]
                    ),
                rentan:
                    acc.rentan +
                    this.toNumber(
                        item["pengungsi/pengungsi_kel_rentan/total_pengungsi_kel_rentan"]
                    ),
            }),
            { kk: 0, jiwa: 0, laki: 0, perempuan: 0, rentan: 0 }
        );

        const kabKotaMap = new Map<string, { kabKota: string; total: number }>();
        
        results.forEach((item) => {
            const id = item["umum/id-kabkota"];
            const kabKota = item["umum/kabkota"];
            const total = this.toNumber(item["pengungsi/total_pengungsi"]);

            if (kabKotaMap.has(id)) {
                const existing = kabKotaMap.get(id)!;
                existing.total += total;
            } else {
                kabKotaMap.set(id, { kabKota, total });
            }
        });

        const pengungsiPerKabKota: PengungsiPerKabKota[] = Array.from(
            kabKotaMap.entries()
        )
            .map(([id, data]) => ({
                id,
                kabKota: data.kabKota,
                total: data.total,
            }))
            .sort((a, b) => b.total - a.total);

        const pengungsiUsia: PengungsiUsia[] = [
            {
                name: "< 5 Tahun",
                value: results.reduce(
                    (acc, item) =>
                        acc +
                        this.toNumber(
                            item["pengungsi/pengungsi_usia_jk/pengungsi_lk/lk_5th"]
                        ) +
                        this.toNumber(
                            item["pengungsi/pengungsi_usia_jk/pengungsi_pr/pr_5th"]
                        ),
                    0
                ),
            },
            {
                name: "5-17 Tahun",
                value: results.reduce(
                    (acc, item) =>
                        acc +
                        this.toNumber(
                            item["pengungsi/pengungsi_usia_jk/pengungsi_lk/lk_5-17th"]
                        ) +
                        this.toNumber(
                            item["pengungsi/pengungsi_usia_jk/pengungsi_pr/pr_5-17th"]
                        ),
                    0
                ),
            },
            {
                name: "18-60 Tahun",
                value: results.reduce(
                    (acc, item) =>
                        acc +
                        this.toNumber(
                            item["pengungsi/pengungsi_usia_jk/pengungsi_lk/lk_18-60th"]
                        ) +
                        this.toNumber(
                            item["pengungsi/pengungsi_usia_jk/pengungsi_pr/pr_18-60th"]
                        ),
                    0
                ),
            },
            {
                name: "> 60 Tahun",
                value: results.reduce(
                    (acc, item) =>
                        acc +
                        this.toNumber(
                            item["pengungsi/pengungsi_usia_jk/pengungsi_lk/lk_60th"]
                        ) +
                        this.toNumber(
                            item["pengungsi/pengungsi_usia_jk/pengungsi_pr/pr_60th"]
                        ),
                    0
                ),
            },
        ];

        const pengungsiRentan: PengungsiRentan[] = [
            {
                name: "Ibu Hamil",
                value: results.reduce(
                    (acc, item) =>
                        acc +
                        this.toNumber(item["pengungsi/pengungsi_kel_rentan/ibu_hamil"]),
                    0
                ),
            },
            {
                name: "Ibu Menyusui",
                value: results.reduce(
                    (acc, item) =>
                        acc +
                        this.toNumber(item["pengungsi/pengungsi_kel_rentan/ibu_menyusui"]),
                    0
                ),
            },
            {
                name: "Disabilitas",
                value: results.reduce(
                    (acc, item) =>
                        acc +
                        this.toNumber(item["pengungsi/pengungsi_kel_rentan/disabilitas"]),
                    0
                ),
            },
            {
                name: "Anak Tanpa Pendamping",
                value: results.reduce(
                    (acc, item) =>
                        acc +
                        this.toNumber(
                            item["pengungsi/pengungsi_kel_rentan/anak_tanpa_pendamping"]
                        ),
                    0
                ),
            },
            {
                name: "Wanita Sebagai Kepala Keluarga",
                value: results.reduce(
                    (acc, item) =>
                        acc +
                        this.toNumber(
                            item["pengungsi/pengungsi_kel_rentan/wanita_sebagai_kk"]
                        ),
                    0
                ),
            },
        ];

        return {
            totalPengungsi,
            pengungsiPerKabKota,
            pengungsiUsia,
            pengungsiRentan,
        };
    }

    public static async getGiatData(): Promise<GiatData[]> {
        const data = await this.serviceData();
        const results: ServiceData[] = data.results || [];

        return results.map((item) => {
            const layanan = item.jenis_layanan || "";
            const sub = item.sub_layanan || "";
            const kabKotaId = String(item["kab_kota"] || "");
            const rawName = this.kabKotaDefinitions[kabKotaId];
            const kabKotaName = rawName ? `${rawName}` : kabKotaId;

            const detail: GiatDetail = {
                jenis_kelamin: {
                    laki_laki: this.toNumber(item["jenis_kelamin/laki_laki"]),
                    perempuan: this.toNumber(item["jenis_kelamin/perempuan"])
                },
                usia: {
                    kurang_dari_5: this.toNumber(item['pen_man_usia_laki/usia_5l']) + this.toNumber(item['pen_man_usia_perempuan/usia_5p']),
                    antara_5_17: this.toNumber(item['pen_man_usia_laki/usia5_17l']) + this.toNumber(item['pen_man_usia_perempuan/usia5_17p']),
                    antara_18_60: this.toNumber(item['pen_man_usia_laki/usia18_60l']) + this.toNumber(item['pen_man_usia_perempuan/usia18_60p']),
                    lebih_dari_60: this.toNumber(item['pen_man_usia_laki/usia_60l']) + this.toNumber(item['pen_man_usia_perempuan/usia_60p'])
                }
            };

            // Conditional details
            if (layanan === 'wash' && this.toNumber(item.jml_brg_unit) > 0) {
                 detail.jumlah = `${this.toNumber(item.jml_brg_unit).toLocaleString('id-ID')} liter`;
            }

            if (layanan === 'relief_distribusi') {
                // Bantuan
                if (item.jenis_bantuan && this.toNumber(item.jml_brg_unit) > 0) {
                     const satuAn = item.satu_an ? item.satu_an.replace(/^(.+?)_\1$/, '$1') : '';
                     const name = this.jenisBantuanFoodDefinitions[item.jenis_bantuan] || 
                                this.jenisBantuanNonFoodDefinitions[item.jenis_bantuan] || 
                                item.jenis_bantuan;
                    detail.bantuan = `${name} (${this.toNumber(item.jml_brg_unit)} ${satuAn})`;
                }
                // Saluran Distribusi
                 if (item.sal_distribusi) {
                    detail.saluran_distribusi = this.saluranDistribusiDefinitions[item.sal_distribusi] || item.sal_distribusi;
                }
            }

            if (layanan === 'medis') {
                const penyakitList: string[] = [];
                Object.keys(item).forEach((key) => {
                    if (key.startsWith('Jenis_Penyakit/')) {
                        const penyakitKey = key.replace('Jenis_Penyakit/', '');
                        const value = this.toNumber(item[key]);
                        if (value > 0) {
                            const name = this.jenisPenyakitDefinitions[penyakitKey] || penyakitKey;
                            penyakitList.push(`${name} (${value})`);
                        }
                    }
                });
                if (penyakitList.length > 0) {
                    detail.jenis_penyakit = penyakitList.join(', ');
                }
            }

            return {
                kab_kota_id: kabKotaId,
                kab_kota_name: kabKotaName,
                jenis_layanan: this.layananDefinitions[layanan] || layanan || "",
                sub_layanan: (this.subLayananDefinitions[layanan] && this.subLayananDefinitions[layanan][sub]) 
                    ? this.subLayananDefinitions[layanan][sub] 
                    : sub || "",
                total_penerima_manfaat: this.toNumber(item["jenis_kelamin/total_manfaat"]),
                note: item.note,
                lokasi_kegiatan: item.lok_keg,
                tanggal_kegiatan: item.tanggal_keg,
                nama_pelapor: item.nama_pelapor,
                detail: detail
            };
        }).sort((a, b) => {
            const dateA = new Date(a.tanggal_kegiatan || 0).getTime();
            const dateB = new Date(b.tanggal_kegiatan || 0).getTime();
            return dateB - dateA;
        });
    }

    public static async getServiceStatistics(date?: string, kabKota?: string): Promise<ServiceStatistic[]> {
        const data = await this.serviceData();
        let results: ServiceData[] = data.results || [];

        // Filter based on parameters
        if (date) {
            results = results.filter(item => item.tanggal_keg === date);
        }

        if (kabKota) {
            results = results.filter(item => {
                const id = String(item.kab_kota);
                const name = this.kabKotaDefinitions[id];
                return name === kabKota;
            });
        }

        // Helper to initialize sub-categories with 0
        const initSubCategory = (definitions: Record<string, string>) => {
            const result: Record<string, { count: number; penerimaManfaat: number }> = {};
            Object.keys(definitions).forEach(key => {
                result[key] = { count: 0, penerimaManfaat: 0 };
            });
            return result;
        };

        // Helper untuk WASH sub layanan (dengan tracking liter)
        const initWashSubCategory = (definitions: Record<string, string>) => {
            const result: Record<string, { count: number; penerimaManfaat: number; totalLiter: number }> = {};
            Object.keys(definitions).forEach(key => {
                result[key] = { count: 0, penerimaManfaat: 0, totalLiter: 0 };
            });
            return result;
        };

        const initBantuanCategory = (definitions: Record<string, string>) => {
            const result: Record<string, { jumlah: number; satuan: string }> = {};
            Object.keys(definitions).forEach(key => {
                result[key] = { jumlah: 0, satuan: '' };
            });
            return result;
        };

        const initPenyakitCategory = (definitions: Record<string, string>) => {
            const result: Record<string, number> = {};
            Object.keys(definitions).forEach(key => {
                result[key] = 0;
            });
            return result;
        };

        // Initialize layanan map
        const layananMap: Record<string, any> = {
            pertolongan_pertama: {
                id: 'pertolongan_pertama',
                value: 'Pertolongan Pertama/Pencarian Korban',
                count: 0,
                penerimaManfaat: 0,
                jumlah: null,
                jenisKelamin: { lakiLaki: 0, perempuan: 0, total: 0 },
                usia: { kurangDari5: 0, antara5Hingga17: 0, antara18Hingga60: 0, lebihDari60: 0 },
            },
            evakuasi_korban: {
                id: 'evakuasi_korban',
                value: 'Evakuasi Korban Mengungsi',
                count: 0,
                penerimaManfaat: 0,
                jumlah: null,
                jenisKelamin: { lakiLaki: 0, perempuan: 0, total: 0 },
                usia: { kurangDari5: 0, antara5Hingga17: 0, antara18Hingga60: 0, lebihDari60: 0 },
            },
            shelter: {
                id: 'shelter',
                value: 'Shelter',
                count: 0,
                penerimaManfaat: 0,
                jumlah: null,
                jenisKelamin: { lakiLaki: 0, perempuan: 0, total: 0 },
                usia: { kurangDari5: 0, antara5Hingga17: 0, antara18Hingga60: 0, lebihDari60: 0 },
                _subLayanan: initSubCategory(this.subLayananDefinitions.shelter),
            },
            medis: {
                id: 'medis',
                value: 'Medis',
                count: 0,
                penerimaManfaat: 0,
                jumlah: null,
                jenisKelamin: { lakiLaki: 0, perempuan: 0, total: 0 },
                usia: { kurangDari5: 0, antara5Hingga17: 0, antara18Hingga60: 0, lebihDari60: 0 },
                _subLayanan: initSubCategory(this.subLayananDefinitions.medis),
                _jenisPenyakit: initPenyakitCategory(this.jenisPenyakitDefinitions),
            },
            tim_ambulans: {
                id: 'tim_ambulans',
                value: 'Tim Ambulans',
                count: 0,
                penerimaManfaat: 0,
                jumlah: null,
                jenisKelamin: { lakiLaki: 0, perempuan: 0, total: 0 },
                usia: { kurangDari5: 0, antara5Hingga17: 0, antara18Hingga60: 0, lebihDari60: 0 },
                _subLayanan: initSubCategory(this.subLayananDefinitions.tim_ambulans),
            },
            dapur_umum: {
                id: 'dapur_umum',
                value: 'Dapur Umum',
                count: 0,
                penerimaManfaat: 0,
                jumlah: null,
                jenisKelamin: { lakiLaki: 0, perempuan: 0, total: 0 },
                usia: { kurangDari5: 0, antara5Hingga17: 0, antara18Hingga60: 0, lebihDari60: 0 },
            },
            relief_distribusi: {
                id: 'relief_distribusi',
                value: 'Relief/Distribusi',
                count: 0,
                penerimaManfaat: 0,
                jumlah: null,
                jenisKelamin: { lakiLaki: 0, perempuan: 0, total: 0 },
                usia: { kurangDari5: 0, antara5Hingga17: 0, antara18Hingga60: 0, lebihDari60: 0 },
                _items: {} as Record<string, number>,
                _subLayanan: initSubCategory(this.subLayananDefinitions.relief_distribusi),
                _saluranDistribusi: initSubCategory(this.saluranDistribusiDefinitions),
                _jenisBantuanFood: initBantuanCategory(this.jenisBantuanFoodDefinitions),
                _jenisBantuanNonFood: initBantuanCategory(this.jenisBantuanNonFoodDefinitions),
            },
            wash: {
                id: 'wash',
                value: 'WASH',
                count: 0,
                penerimaManfaat: 0,
                jumlah: null,
                jenisKelamin: { lakiLaki: 0, perempuan: 0, total: 0 },
                usia: { kurangDari5: 0, antara5Hingga17: 0, antara18Hingga60: 0, lebihDari60: 0 },
                _totalLiter: 0,
                _subLayanan: initWashSubCategory(this.subLayananDefinitions.wash),
                _saluranKegiatan: initSubCategory(this.saluranKegiatanDefinitions),
            },
            pemulihan_hubungan: {
                id: 'pemulihan_hubungan',
                value: 'Pemulihan Hubungan Keluarga',
                count: 0,
                penerimaManfaat: 0,
                jumlah: null,
                jenisKelamin: { lakiLaki: 0, perempuan: 0, total: 0 },
                usia: { kurangDari5: 0, antara5Hingga17: 0, antara18Hingga60: 0, lebihDari60: 0 },
                _subLayanan: initSubCategory(this.subLayananDefinitions.pemulihan_hubungan),
            },
            dukungan_psikososial: {
                id: 'dukungan_psikososial',
                value: 'Dukungan Psikososial',
                count: 0,
                penerimaManfaat: 0,
                jumlah: null,
                jenisKelamin: { lakiLaki: 0, perempuan: 0, total: 0 },
                usia: { kurangDari5: 0, antara5Hingga17: 0, antara18Hingga60: 0, lebihDari60: 0 },
                _subLayanan: initSubCategory(this.subLayananDefinitions.dukungan_psikososial),
                _saluranKegiatan: initSubCategory(this.saluranKegiatanDefinitions),
            },
        };

        // Process each record
        results.forEach((record) => {
            const jenisLayanan = record.jenis_layanan;
            if (!jenisLayanan || !layananMap[jenisLayanan]) return;

            const layanan = layananMap[jenisLayanan];
            const totalManfaat = this.toNumber(record['jenis_kelamin/total_manfaat']);
            const lakiLaki = this.toNumber(record['jenis_kelamin/laki_laki']);
            const perempuan = this.toNumber(record['jenis_kelamin/perempuan']);
            const jmlBrgUnit = this.toNumber(record.jml_brg_unit);
            const satuAn = record.satu_an || '';

            // Base aggregation
            layanan.count++;
            layanan.penerimaManfaat += totalManfaat;
            layanan.jenisKelamin.lakiLaki += lakiLaki;
            layanan.jenisKelamin.perempuan += perempuan;
            layanan.jenisKelamin.total += totalManfaat;

            // Age aggregation
            layanan.usia.kurangDari5 += this.toNumber(record['pen_man_usia_laki/usia_5l']) + 
                                         this.toNumber(record['pen_man_usia_perempuan/usia_5p']);
            layanan.usia.antara5Hingga17 += this.toNumber(record['pen_man_usia_laki/usia5_17l']) + 
                                             this.toNumber(record['pen_man_usia_perempuan/usia5_17p']);
            layanan.usia.antara18Hingga60 += this.toNumber(record['pen_man_usia_laki/usia18_60l']) + 
                                              this.toNumber(record['pen_man_usia_perempuan/usia18_60p']);
            layanan.usia.lebihDari60 += this.toNumber(record['pen_man_usia_laki/usia_60l']) + 
                                         this.toNumber(record['pen_man_usia_perempuan/usia_60p']);

            // Sub layanan (non-WASH)
            if (jenisLayanan !== 'wash' && record.sub_layanan && layanan._subLayanan && layanan._subLayanan[record.sub_layanan]) {
                layanan._subLayanan[record.sub_layanan].count++;
                layanan._subLayanan[record.sub_layanan].penerimaManfaat += totalManfaat;
            }

            // Sub layanan WASH (dengan tracking liter)
            if (jenisLayanan === 'wash' && record.sub_layanan && layanan._subLayanan && layanan._subLayanan[record.sub_layanan]) {
                layanan._subLayanan[record.sub_layanan].count++;
                layanan._subLayanan[record.sub_layanan].penerimaManfaat += totalManfaat;
                if (jmlBrgUnit > 0) {
                    layanan._subLayanan[record.sub_layanan].totalLiter += jmlBrgUnit;
                }
            }

            // Saluran kegiatan
            if (record.sal_kegiatan && layanan._saluranKegiatan && layanan._saluranKegiatan[record.sal_kegiatan]) {
                layanan._saluranKegiatan[record.sal_kegiatan].count++;
                layanan._saluranKegiatan[record.sal_kegiatan].penerimaManfaat += totalManfaat;
            }

            // Status rujukan
            if (record.status_rujukan && layanan._statusRujukan && layanan._statusRujukan[record.status_rujukan]) {
                layanan._statusRujukan[record.status_rujukan].count++;
                layanan._statusRujukan[record.status_rujukan].penerimaManfaat += totalManfaat;
            }

            // Relief/Distribusi specific
            if (jenisLayanan === 'relief_distribusi') {
                // Track items for jumlah
                if (jmlBrgUnit > 0 && satuAn) {
                    const cleanSatuAn = satuAn.replace(/^(.+?)_\1$/, '$1');
                    layanan._items[cleanSatuAn] = (layanan._items[cleanSatuAn] || 0) + jmlBrgUnit;
                }

                // Saluran distribusi
                if (record.sal_distribusi && layanan._saluranDistribusi[record.sal_distribusi]) {
                    layanan._saluranDistribusi[record.sal_distribusi].count++;
                    layanan._saluranDistribusi[record.sal_distribusi].penerimaManfaat += totalManfaat;
                }

                // Jenis bantuan
                if (record.jenis_bantuan && jmlBrgUnit > 0) {
                    const cleanSatuAn = satuAn ? satuAn.replace(/^(.+?)_\1$/, '$1') : '';
                    
                    if (layanan._jenisBantuanFood[record.jenis_bantuan]) {
                        layanan._jenisBantuanFood[record.jenis_bantuan].jumlah += jmlBrgUnit;
                        if (!layanan._jenisBantuanFood[record.jenis_bantuan].satuan) {
                            layanan._jenisBantuanFood[record.jenis_bantuan].satuan = cleanSatuAn;
                        }
                    } else if (layanan._jenisBantuanNonFood[record.jenis_bantuan]) {
                        layanan._jenisBantuanNonFood[record.jenis_bantuan].jumlah += jmlBrgUnit;
                        if (!layanan._jenisBantuanNonFood[record.jenis_bantuan].satuan) {
                            layanan._jenisBantuanNonFood[record.jenis_bantuan].satuan = cleanSatuAn;
                        }
                    }
                }
            }

            // WASH specific
            if (jenisLayanan === 'wash' && jmlBrgUnit > 0) {
                layanan._totalLiter += jmlBrgUnit;
            }

            // Medis specific - Jenis Penyakit
            if (jenisLayanan === 'medis') {
                Object.keys(record).forEach((key) => {
                    if (key.startsWith('Jenis_Penyakit/')) {
                        const penyakitKey = key.replace('Jenis_Penyakit/', '');
                        const value = this.toNumber(record[key]);
                        if (value > 0 && layanan._jenisPenyakit[penyakitKey] !== undefined) {
                            layanan._jenisPenyakit[penyakitKey] += value;
                        }
                    }
                });
            }
        });

        // Format output
        Object.keys(layananMap).forEach((key) => {
            const layanan = layananMap[key];
            const detail: ServiceDetail = {};

            // Sub layanan - always include
            if (layanan._subLayanan) {
                const subLayananDef = this.subLayananDefinitions[key as keyof typeof this.subLayananDefinitions];
                
                // Special handling for WASH (with liter info)
                if (key === 'wash') {
                    detail.subLayanan = Object.entries(layanan._subLayanan).map(
                        ([k, v]: [string, any]) => {
                            const item: DetailItem = {
                                name: subLayananDef?.[k] || k,
                                count: v.count,
                                penerimaManfaat: v.penerimaManfaat,
                            };
                            // Add jumlah if there's liter data
                            if (v.totalLiter > 0) {
                                item.jumlah = `${v.totalLiter.toLocaleString('id-ID')} liter`;
                            }
                            return item;
                        }
                    );
                } else {
                    detail.subLayanan = Object.entries(layanan._subLayanan).map(
                        ([k, v]: [string, any]) => ({
                            name: subLayananDef?.[k] || k,
                            count: v.count,
                            penerimaManfaat: v.penerimaManfaat,
                        })
                    );
                }
            }
            delete layanan._subLayanan;

            // Status rujukan - always include if exists
            if (layanan._statusRujukan) {
                detail.statusRujukan = Object.entries(layanan._statusRujukan).map(
                    ([k, v]: [string, any]) => ({
                        name: this.statusRujukanDefinitions[k] || k,
                        count: v.count,
                        penerimaManfaat: v.penerimaManfaat,
                    })
                );
            }
            delete layanan._statusRujukan;

            // Relief/Distribusi
            if (key === 'relief_distribusi') {
                // Format jumlah
                if (Object.keys(layanan._items).length > 0) {
                    layanan.jumlah = Object.entries(layanan._items)
                        .map(([unit, count]: [string, any]) => 
                            `${count.toLocaleString('id-ID')} ${unit}`)
                        .join(', ');
                }
                delete layanan._items;

                // Saluran distribusi - always include
                detail.saluranDistribusi = Object.entries(layanan._saluranDistribusi).map(
                    ([k, v]: [string, any]) => ({
                        name: this.saluranDistribusiDefinitions[k] || k,
                        count: v.count,
                        penerimaManfaat: v.penerimaManfaat,
                    })
                );
                delete layanan._saluranDistribusi;

                // Jenis bantuan food - always include
                detail.jenisBantuanFood = Object.entries(layanan._jenisBantuanFood).map(
                    ([k, v]: [string, any]) => ({
                        name: this.jenisBantuanFoodDefinitions[k] || k,
                        jumlah: v.jumlah,
                        satuan: v.satuan,
                    })
                );
                delete layanan._jenisBantuanFood;

                // Jenis bantuan non-food - always include
                detail.jenisBantuanNonFood = Object.entries(layanan._jenisBantuanNonFood).map(
                    ([k, v]: [string, any]) => ({
                        name: this.jenisBantuanNonFoodDefinitions[k] || k,
                        jumlah: v.jumlah,
                        satuan: v.satuan,
                    })
                );
                delete layanan._jenisBantuanNonFood;
            }

            // WASH
            if (key === 'wash') {
                if (layanan._totalLiter > 0) {
                    layanan.jumlah = `${layanan._totalLiter.toLocaleString('id-ID')} liter`;
                }
                delete layanan._totalLiter;
            }

            // Medis - Jenis Penyakit - always include
            if (key === 'medis') {
                detail.jenisPenyakit = Object.entries(layanan._jenisPenyakit).map(
                    ([k, v]: [string, any]) => ({
                        name: this.jenisPenyakitDefinitions[k] || k,
                        jumlah: v,
                    })
                );
                delete layanan._jenisPenyakit;
            }

            // Add detail object if has content
            if (Object.keys(detail).length > 0) {
                layanan.detail = detail;
            }
        });

        return Object.values(layananMap) as ServiceStatistic[];
    }
}