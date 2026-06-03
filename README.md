# VietQR Generator — Hướng dẫn deploy Vercel

## Cấu trúc file
```
/
├── index.html        ← App chính (không chứa token)
├── config.js         ← Đọc từ window.__ENV (không hardcode token)
├── VietQR.xlsx       ← Dữ liệu tài khoản ngân hàng
├── vercel.json       ← Route mọi request qua /api/serve
└── api/
    └── serve.js      ← Serverless function: inject env vars + phục vụ file
```

## Bước 1 — Đẩy code lên GitHub

```bash
git init
git add .
git commit -m "init: VietQR app"
git remote add origin https://github.com/kiethtt-105/qr_bank.git
git push -u origin main
```

> ⚠️ Token **KHÔNG** nằm trong code nữa → an toàn khi push public repo

## Bước 2 — Cài đặt Environment Variables trên Vercel

Vào **Vercel Dashboard → Project → Settings → Environment Variables**, thêm:

| Name        | Value                        |
|-------------|------------------------------|
| `GH_TOKEN`  | `ghp_xxxxxxxxxxxxxxxxxxxx`   |
| `GH_OWNER`  | `kiethtt-105`                |
| `GH_REPO`   | `qr_bank`                    |
| `GH_BRANCH` | `main`                       |
| `GH_PATH`   | `VietQR.xlsx`                |

> Token chỉ tồn tại trong môi trường Vercel, **không bao giờ** xuất hiện trong source code hay browser.

## Bước 3 — Deploy

Vercel tự detect và deploy khi push code. Hoặc chạy:

```bash
npx vercel --prod
```

## Cách hoạt động (bảo mật)

```
Browser → Vercel Edge
              ↓
         api/serve.js  ←  process.env.GH_TOKEN (chỉ server biết)
              ↓
         inject vào HTML: window.__ENV = { GH_TOKEN: "...", ... }
              ↓
         Trả HTML về browser
```

Token đi từ Vercel Environment → HTML response **tại runtime**, không lưu trong repo.

## Chỉnh sửa dữ liệu

Khi bạn thêm/sửa/xoá tài khoản trong app và bấm **"Lưu lên GitHub"**:
- Chỉ các ô nhập liệu (`data__id`, `list_name`, `data_num`, `name_ac`) được ghi
- Các cột VLOOKUP từ sheet `API - io` giữ nguyên công thức
- Vercel tự deploy lại sau 1-2 phút
