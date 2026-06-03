// config.js — KHÔNG chứa token hay thông tin nhạy cảm
// Token được inject qua Vercel Environment Variables (xem vercel.json)
window.VIETQR_CONFIG = {
  GH_TOKEN:  (window.__ENV && window.__ENV.GH_TOKEN)  || "",
  GH_OWNER:  (window.__ENV && window.__ENV.GH_OWNER)  || "kiethtt-105",
  GH_REPO:   (window.__ENV && window.__ENV.GH_REPO)   || "qr_bank",
  GH_BRANCH: (window.__ENV && window.__ENV.GH_BRANCH) || "main",
  GH_PATH:   (window.__ENV && window.__ENV.GH_PATH)   || "VietQR.xlsx",
};