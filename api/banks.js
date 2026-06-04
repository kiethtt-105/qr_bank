// api/banks.js — Vercel Serverless Function
// Chỉ trả về danh sách tài khoản từ sheet List_bank trong VietQR.xlsx

import path from "path";
import { readFileSync } from "fs";
import * as XLSX from "xlsx";

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const filePath = path.join(process.cwd(), "VietQR.xlsx");
    const buf = readFileSync(filePath);
    const wb = XLSX.read(buf, { type: "buffer" });

    // ── Sheet API-io → build bankMap (lấy logo, template, shortName) ──
    const apiSheetName = wb.SheetNames.find((n) => n.toLowerCase().includes("api"));
    const bankMap = {};
    if (apiSheetName) {
      XLSX.utils.sheet_to_json(wb.Sheets[apiSheetName], { defval: "" })
        .forEach((r) => {
          const bin = String(r["data__bin"] || "").trim();
          if (bin) bankMap[bin] = {
            logo:      String(r["data__logo"] || "").trim(),
            shortName: String(r["data__shortName"] || r["data__short_name"] || "").trim(),
            name:      String(r["data__name"] || "").trim(),
            code:      String(r["data__code"] || "").trim(),
            template:  String(r["Template"] || "BdT8CDO").trim(),
          };
        });
    }

    // ── Sheet List_bank → danh sách tài khoản ────────────────────────
    const listSheetName = wb.SheetNames.find((n) => n.toLowerCase().includes("list"));
    if (!listSheetName) {
      return res.status(500).json({ ok: false, error: "Không tìm thấy sheet List_bank" });
    }

    const rows = XLSX.utils.sheet_to_json(wb.Sheets[listSheetName], { defval: "" });
    const accounts = rows
      .filter((r) => r["data__bin"] && r["data_num"] && String(r["data__bin"]).trim() !== "-")
      .map((r) => {
        const bin  = String(r["data__bin"]).trim();
        const info = bankMap[bin] || {};
        let stk    = String(r["data_num"] || "").trim();
        if (/e/i.test(stk)) stk = Number(r["data_num"]).toFixed(0);

        const nameAc   = String(r["name_ac"] || "").trim();
        const template = info.template || "BdT8CDO";
        const label    = String(r["list_name"] || info.code || bin).trim();

        return {
          label,                                          // tên hiển thị trong menu
          menuLabel: `${label} – ${stk}`,                // sẵn dùng cho Shortcuts menu
          stk,
          bin,
          shortName: String(r["data__shortName"] || info.shortName || "").trim(),
          logo:      String(r["data__logo"]      || info.logo      || "").trim(),
          nameAc,
          template,
          qrUrl: `https://img.vietqr.io/image/${bin}-${stk}-${template}.png`
                + (nameAc ? `?accountName=${encodeURIComponent(nameAc)}` : ""),
        };
      });

    return res.status(200).json({
      ok:     true,
      total:  accounts.length,
      accounts,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}