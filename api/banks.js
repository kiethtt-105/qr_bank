// api/banks.js — Vercel Serverless Function
// Trả về danh sách tài khoản (List_bank) và ngân hàng (API-io) từ VietQR.xlsx
// Deploy cùng thư mục gốc với VietQR.xlsx

import path from "path";
import { readFileSync } from "fs";
import * as XLSX from "xlsx";

export default function handler(req, res) {
  // CORS — cho phép iPhone / app ngoài gọi được
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // Đọc file xlsx từ thư mục gốc của project
    const filePath = path.join(process.cwd(), "VietQR.xlsx");
    const buf = readFileSync(filePath);
    const wb = XLSX.read(buf, { type: "buffer" });

    // ── Sheet API-io → danh sách ngân hàng ──────────────────────────
    const apiSheetName = wb.SheetNames.find((n) =>
      n.toLowerCase().includes("api")
    );
    let banks = [];
    if (apiSheetName) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[apiSheetName], {
        defval: "",
      });
      banks = rows
        .filter((r) => r["data__bin"])
        .map((r) => ({
          bin: String(r["data__bin"] || "").trim(),
          id: r["data__id"] || "",
          name: String(r["data__name"] || "").trim(),
          code: String(r["data__code"] || "").trim(),
          shortName: String(
            r["data__shortName"] || r["data__short_name"] || ""
          ).trim(),
          logo: String(r["data__logo"] || "").trim(),
          template: String(r["Template"] || "BdT8CDO").trim(),
        }));
    }

    // ── Sheet List_bank → danh sách tài khoản ───────────────────────
    const listSheetName = wb.SheetNames.find((n) =>
      n.toLowerCase().includes("list")
    );
    let accounts = [];
    if (listSheetName) {
      // Build bank map từ banks
      const bankMap = {};
      banks.forEach((b) => (bankMap[b.bin] = b));

      const rows = XLSX.utils.sheet_to_json(wb.Sheets[listSheetName], {
        defval: "",
      });
      accounts = rows
        .filter(
          (r) =>
            r["data__bin"] &&
            r["data_num"] &&
            String(r["data__bin"]).trim() !== "-"
        )
        .map((r) => {
          const bin = String(r["data__bin"]).trim();
          const info = bankMap[bin] || {};
          let stk = String(r["data_num"] || "").trim();
          if (/e/i.test(stk)) stk = Number(r["data_num"]).toFixed(0);
          return {
            label: String(r["list_name"] || r["data__code"] || "").trim(),
            stk,
            bin,
            name: String(r["data__name"] || info.name || "").trim(),
            code: String(r["data__code"] || info.code || "").trim(),
            shortName: String(
              r["data__shortName"] || info.shortName || ""
            ).trim(),
            logo: String(r["data__logo"] || info.logo || "").trim(),
            nameAc: String(r["name_ac"] || "").trim(),
            template: info.template || "BdT8CDO",
            // URL QR sẵn (không có amount/memo)
            qrUrl: `https://img.vietqr.io/image/${bin}-${stk}-${
              info.template || "BdT8CDO"
            }.png?accountName=${encodeURIComponent(
              String(r["name_ac"] || info.shortName || "").trim()
            )}`,
          };
        });
    }

    return res.status(200).json({
      ok: true,
      total_banks: banks.length,
      total_accounts: accounts.length,
      banks,
      accounts,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}