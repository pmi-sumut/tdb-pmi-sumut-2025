// service/bnpb.ts
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

export class BNPBService {
    private doc: GoogleSpreadsheet;

    constructor(
        private sheetId: string,
        private clientEmail: string,
        private privateKey: string
    ) {
        const auth = new JWT({
        email: clientEmail,
        key: privateKey,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });

        this.doc = new GoogleSpreadsheet(sheetId, auth);
    }

    private async connectToSheet() {
        await this.doc.loadInfo();
        const sheet = this.doc.sheetsByIndex[0];
        return sheet;
    }

    private toCamelCase(str: string): string {
        return str
        .toLowerCase()
        .replace(/[^a-z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
    }

    private transformData(raw: Record<string, any>) {
        const wilayahList = [
        "Tapanuli Selatan",
        "Kota Sibolga",
        "Tapanuli Utara",
        "Deli Serdang",
        "Langkat",
        "Humbang Hasundutan",
        "Tapanuli Tengah",
        "Kota Medan",
        ];

        const result: any = {};
        const meninggalWilayah: any = {};

        for (const key in raw) {
        const value = raw[key];

        if (wilayahList.includes(key)) {
            const camelKey = this.toCamelCase(key);
            meninggalWilayah[camelKey] = value;
            continue;
        }

        if (key === "Meninggal") {
            result.meninggalTotal = value;
            continue;
        }

        const camelKey = this.toCamelCase(key);
        result[camelKey] = value;
        }

        if (Object.keys(meninggalWilayah).length > 0) {
        result.meninggal = meninggalWilayah;
        }

        return result;
    }

    async getLatestData() {
        const sheet = await this.connectToSheet();

        await sheet.loadHeaderRow();
        const headers = sheet.headerValues;

        const rows = await sheet.getRows();

        if (rows.length === 0) {
        return null;
        }

        const lastRow = rows[rows.length - 1];

        const raw: Record<string, any> = {};
        headers.forEach((header) => {
        const value = lastRow.get(header);
        const num = Number(value);
        raw[header] = isNaN(num) || value === "" ? value : num;
        });

        const transformed = this.transformData(raw);

        return transformed;
    }
}
