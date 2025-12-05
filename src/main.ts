// main.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { BNPBService } from "./service/bnpb";
import { PmiService } from "./service/pmi";
import { readFileSync } from 'fs'
import { join } from 'path'

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || "";
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
const GOOGLE_PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
const PORT = process.env.PORT || 3000;

if (!GOOGLE_SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
  console.error("❌ Error: Missing required environment variables!");
  process.exit(1);
}

const bnpbService = new BNPBService(
  GOOGLE_SHEET_ID,
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY
);

const pmiService = new PmiService(
  GOOGLE_SHEET_ID,
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY
);

const app = new Hono();

app.use("*", cors());

app.onError((err, c) => {
  console.error("Error:", err);
  return c.json({ success: false, error: err.message }, 500);
});

app.get("/api/bnpb/latest", async (c) => {
  try {
    const data = await bnpbService.getLatestData();

    if (!data) {
      return c.json({ success: false, message: "No data available" }, 404);
    }

    return c.json({
      success: true,
      data,
    });
  } catch (err) {
    throw err;
  }
});

app.get("/api/pmi/giat", async (c) => {
  try {
    const data = await pmiService.getPmiGiatList();

    if (!data || data.length === 0) {
      return c.json(
        {
          success: false,
          message: "No data available",
        },
        404
      );
    }

    return c.json({
      success: true,
      data,
    });
  } catch (error: any) {
    throw error;
  }
});

app.get("/api/pmi/posko", async (c) => {
  try {
    const data = await pmiService.getPmiPoskoList();

    if (!data || data.length === 0) {
      return c.json(
        {
          success: false,
          message: "No data available",
        },
        404
      );
    }

    return c.json({
      success: true,
      data,
    });
  } catch (error: any) {
    throw error;
  }
});

app.get('/', (c) => {
  const html = readFileSync(join(process.cwd(), 'public/dashboard.html'), 'utf8')
  return c.html(html)
})

console.log(`
📊 Google Sheet: ${GOOGLE_SHEET_ID.substring(0, 20)}...
🌐 Server: http://localhost:${PORT}
`);

export default {
  port: PORT,
  fetch: app.fetch,
};
