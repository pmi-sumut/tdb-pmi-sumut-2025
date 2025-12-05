// service/pmi.ts
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

export class PmiService {
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

    private toCamelCase(str: string): string {
        return str
        .toLowerCase()
        .replace(/[^a-z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
    }

    async getPmiGiatList() {
        await this.doc.loadInfo();

        const sheet = this.doc.sheetsByIndex[1];

        await sheet.loadHeaderRow();
        const headers = sheet.headerValues;

        const rows = await sheet.getRows();

        if (!rows || rows.length === 0) {
        return [];
        }

        const list = rows.map((row) => {
        const obj: Record<string, any> = {};

        headers.forEach((header) => {
            const camelKey = this.toCamelCase(header);
            obj[camelKey] = row.get(header);
        });

        return obj;
        });

        return list;
    }

    async getPmiPoskoList() {
        await this.doc.loadInfo();

        const sheet = this.doc.sheetsByIndex[2];

        await sheet.loadHeaderRow();
        const headers = sheet.headerValues; 

        const rows = await sheet.getRows();

        if (!rows || rows.length === 0) {
        return [];
        }

        const list = rows.map((row) => {
        const obj: Record<string, any> = {};

        headers.forEach((header) => {
            const rawValue = row.get(header);
            const camelKey = this.toCamelCase(header);

            // parsing khusus untuk koordinat
            if (header === "Latitude" || header === "Longitude") {
            const num = parseFloat(rawValue);
            obj[camelKey] = isNaN(num) ? null : num;
            } else {
            obj[camelKey] = rawValue;
            }
        });

        return obj;
        });

        return list;
    }
}
