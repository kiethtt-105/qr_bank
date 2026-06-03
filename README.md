# VietQR Generator

## Cấu trúc files
```
index.html      — Giao diện chính
config.js       — Cấu hình GitHub token & repo (QUAN TRỌNG: xem bên dưới)
VietQR.xlsx     — Dữ liệu tài khoản ngân hàng
.gitattributes  — Git config
```

## Setup lần đầu

### 1. Điền thông tin vào `config.js`
Mở file `config.js`, điền đầy đủ 3 trường bắt buộc:
```js
window.VIETQR_CONFIG = {
  GH_TOKEN: "ghp_xxxxxxxxxxxxxxxxxxxxxx",  // Personal Access Token
  GH_OWNER: "your-username",               // GitHub username
  GH_REPO:  "vietqr-app",                 // Tên repo
  GH_BRANCH: "main",
  GH_PATH:   "VietQR.xlsx",
};
```

Tạo token tại: https://github.com/settings/tokens/new (chọn quyền `repo`)

### 2. Đẩy lên GitHub
```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

### 3. Deploy Vercel
- Vào https://vercel.com → Import repo vừa tạo
- Framework: **Other** (static)
- Root directory: `/` (mặc định)
- Deploy!

## Cách dùng
- Thêm/sửa/xoá tài khoản ở tab **Quản lý tài khoản**
- Bấm **Lưu lên GitHub** → Vercel tự deploy trong ~1 phút
- Mở app trên bất kỳ thiết bị nào đều thấy dữ liệu mới nhất

## Bảo mật token
Nếu repo **public**: KHÔNG điền token vào `config.js`, thay vào đó dùng modal ⚙️ trong app để nhập token (lưu trong localStorage của browser).

Nếu repo **private**: Có thể điền vào `config.js` an toàn hơn, nhưng tốt nhất vẫn dùng modal.
