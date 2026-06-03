const fs = require("fs");
const path = require("path");

module.exports = (req, res) => {
  const url = req.url.replace(/\?.*$/, "");

  // Phục vụ VietQR.xlsx trực tiếp (binary)
  if (url === "/VietQR.xlsx") {
    const xlsxPath = path.join(process.cwd(), "VietQR.xlsx");
    if (!fs.existsSync(xlsxPath)) {
      res.status(404).end("Not found");
      return;
    }
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Cache-Control", "no-store");
    res.end(fs.readFileSync(xlsxPath));
    return;
  }

  // Phục vụ index.html với __ENV được inject từ Vercel Environment Variables
  const htmlPath = path.join(process.cwd(), "index.html");
  let html = fs.readFileSync(htmlPath, "utf8");

  // Inject biến môi trường vào <head> — token KHÔNG bao giờ nằm trong source code
  const envScript = `<script>
window.__ENV = {
  GH_TOKEN:  "${process.env.GH_TOKEN  || ""}",
  GH_OWNER:  "${process.env.GH_OWNER  || "kiethtt-105"}",
  GH_REPO:   "${process.env.GH_REPO   || "qr_bank"}",
  GH_BRANCH: "${process.env.GH_BRANCH || "main"}",
  GH_PATH:   "${process.env.GH_PATH   || "VietQR.xlsx"}"
};
</script>`;

  html = html.replace("</head>", envScript + "\n</head>");

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(html);
};