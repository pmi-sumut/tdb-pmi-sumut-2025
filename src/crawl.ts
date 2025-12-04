import axios, { AxiosError } from "axios";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

const BASE_URL = "https://gis.bnpb.go.id/server/rest/services/thematic/BANSOR_SUMATERA/MapServer/17/query";
const PROVINSI = "Sumatera Utara";
const MAX_RETRIES = 16;

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || "YOUR_SHEET_ID_HERE";
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "your-service-account@project.iam.gserviceaccount.com";
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY || "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n";

const FIELDS = [
    { name: "hilang", label: "Hilang" },
    { name: "meninggal", label: "Meninggal" },
    { name: "luka_sakit", label: "Luka Sakit" },
    { name: "fasum_rusak", label: "Fasilitas Umum Rusak" },
    { name: "pendidikan_rusak", label: "Pendidikan Rusak" },
    { name: "rumah_ibadat_rusak", label: "Rumah Ibadah Rusak" },
    { name: "fasyankes_rusak", label: "Fasyankes Rusak" },
    { name: "kantor_rusak", label: "Kantor Rusak" },
    { name: "jembatan_rusak", label: "Jembatan Rusak" },
];

interface ApiResponse {
    features: Array<{
        attributes: {
        value: number;
        };
    }>;
}

interface CrawlData {
    [key: string]: number | string;
    updated_at: string;
}

function getRetryDelay(attempt: number): number {
    const baseDelay = 1000;
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), 60000);
    const jitter = Math.random() * 500;
    return exponentialDelay + jitter;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatTimestamp(date: Date): string {
    return date.toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}
async function fetchDataWithRetry(
    fieldName: string,
    attempt: number = 0
): Promise<number> {
    try {
        const params = {
        f: "json",
        cacheHint: "true",
        orderByFields: "",
        outFields: "*",
        outStatistics: JSON.stringify([
            {
            onStatisticField: fieldName,
            outStatisticFieldName: "value",
            statisticType: "sum",
            },
        ]),
        returnGeometry: "false",
        spatialRel: "esriSpatialRelIntersects",
        where: `provinsi='${PROVINSI}'`,
        };

        console.log(
        `[${fieldName}] Attempt ${attempt + 1}/${MAX_RETRIES + 1} - Fetching data...`
        );

        const response = await axios.get<ApiResponse>(BASE_URL, {
        params,
        timeout: 30000,
        });

        if (
        !response.data?.features ||
        !Array.isArray(response.data.features) ||
        response.data.features.length === 0
        ) {
        throw new Error("Invalid response structure");
        }

        const value = response.data.features[0]?.attributes?.value ?? 0;
        console.log(`[${fieldName}] ✓ Success - Value: ${value}`);

        return value;
    } catch (error) {
        const errorMessage =
        error instanceof AxiosError
            ? `${error.message} (${error.code})`
            : error instanceof Error
            ? error.message
            : "Unknown error";

        console.error(`[${fieldName}] ✗ Error: ${errorMessage}`);

        if (attempt < MAX_RETRIES) {
        const delay = getRetryDelay(attempt);
        console.log(
            `[${fieldName}] Retrying in ${(delay / 1000).toFixed(2)} seconds...`
        );
        await sleep(delay);
        return fetchDataWithRetry(fieldName, attempt + 1);
        }

        console.error(
        `[${fieldName}] ✗ Failed after ${MAX_RETRIES + 1} attempts. Using value: 0`
        );
        return 0;
    }
}

async function fetchAllData(): Promise<CrawlData> {
    console.log("=".repeat(60));
    console.log("Starting BNPB Data Crawler");
    console.log(`Provinsi: ${PROVINSI}`);
    console.log(`Total Fields: ${FIELDS.length}`);
    console.log("=".repeat(60));
    console.log("");

    const results: CrawlData = {
        updated_at: new Date().toISOString(),
    };

    for (const field of FIELDS) {
        const value = await fetchDataWithRetry(field.name);
        results[field.label] = value;
        console.log("");
    }

    return results;
}

async function initGoogleSheet(): Promise<GoogleSpreadsheet> {
    console.log("=".repeat(60));
    console.log("Connecting to Google Sheets...");

    try {
        const serviceAccountAuth = new JWT({
        email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });

        const doc = new GoogleSpreadsheet(GOOGLE_SHEET_ID, serviceAccountAuth);
        
        await doc.loadInfo();
        
        console.log(`✓ Connected to: ${doc.title}`);
        console.log("=".repeat(60));
        console.log("");

        return doc;
    } catch (error) {
        console.error("✗ Failed to connect to Google Sheets");
        console.error(error);
        throw error;
    }
}

async function setupSheetHeaders(sheet: any): Promise<void> {
    try {
        await sheet.loadHeaderRow();
        
        const expectedHeaders = [
        ...FIELDS.map((f) => f.label),
        "Updated At",
        ];

    const currentHeaders = sheet.headerValues || [];
    
    if (currentHeaders.length === 0) {
        console.log("Setting up sheet headers...");
        await sheet.setHeaderRow(expectedHeaders);
        console.log("✓ Headers created");
        } else {
        console.log("✓ Headers already exist");
        }
    } catch (error) {
        console.error("Error setting up headers:", error);
        throw error;
    }
}

async function writeToGoogleSheets(data: CrawlData): Promise<void> {
    console.log("=".repeat(60));
    console.log("Writing data to Google Sheets...");

    try {
        const doc = await initGoogleSheet();
    
    let sheet = doc.sheetsByIndex[0];
    
    if (!sheet) {
        console.log("Creating new sheet...");
        sheet = await doc.addSheet({ title: "Data BNPB" });
    }

    await setupSheetHeaders(sheet);

    const rowData: any = {};
    FIELDS.forEach((field) => {
        rowData[field.label] = data[field.label];
    });
    rowData["Updated At"] = formatTimestamp(new Date(data.updated_at));

    console.log("Adding new row...");
    await sheet.addRow(rowData);

    console.log("✓ Data successfully written to Google Sheets");
    console.log(`Sheet: ${sheet.title}`);
    console.log(`URL: https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}`);
    console.log("=".repeat(60));
    } catch (error) {
        console.error("✗ Failed to write to Google Sheets");
        console.error(error);
    throw error;
    }
}

async function main(): Promise<void> {
    const startTime = Date.now();

    console.log("");
    console.log("╔" + "═".repeat(58) + "╗");
    console.log("║" + " ".repeat(15) + "BNPB DATA CRAWLER" + " ".repeat(25) + "║");
    console.log("║" + " ".repeat(10) + "Google Sheets Integration" + " ".repeat(22) + "║");
    console.log("╚" + "═".repeat(58) + "╝");
    console.log("");

    try {
        if (GOOGLE_SHEET_ID === "YOUR_SHEET_ID_HERE" || 
            GOOGLE_SERVICE_ACCOUNT_EMAIL.includes("your-service-account")) {
        console.error("✗ Error: Google Sheets credentials not configured!");
        console.error("");
        console.error("Please set the following environment variables:");
        console.error("  - GOOGLE_SHEET_ID");
        console.error("  - GOOGLE_SERVICE_ACCOUNT_EMAIL");
        console.error("  - GOOGLE_PRIVATE_KEY");
        console.error("");
        console.error("Or edit the values directly in crawler.ts");
        process.exit(1);
        }

        const data = await fetchAllData();
        await writeToGoogleSheets(data);

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log("");
        console.log("✓ Crawling completed successfully!");
        console.log(`Duration: ${duration} seconds`);
        console.log("");

        process.exit(0);
    } catch (error) {
        console.error("");
        console.error("✗ Fatal error occurred:");
        console.error(error);
        console.error("");

        process.exit(1);
    }
}

main();