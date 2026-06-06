const XLSX = require('xlsx');
const path = require('path');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const filePath = path.join(process.cwd(), 'VietQR.xlsx');
    const wb = XLSX.readFile(filePath);

    // Sheet API-io → BANK_MAP theo bin
    const apiSheet = wb.SheetNames.find(n => n.toLowerCase().includes('api'));
    const apiRows = XLSX.utils.sheet_to_json(wb.Sheets[apiSheet], { defval: '' });
    const bankMap = {};
    apiRows.forEach(r => {
      const bin = String(r['data__bin'] || '').trim();
      if (bin) bankMap[bin] = {
        logo:      String(r['data__logo'] || ''),
        shortName: String(r['data__shortName'] || r['data__short_name'] || ''),
        name:      String(r['data__name'] || ''),
        code:      String(r['data__code'] || ''),
        template:  String(r['Template'] || '').trim() || 'BdT8CDO',
      };
    });

    // Sheet List_bank → danh sách tài khoản
    const listSheet = wb.SheetNames.find(n => n.toLowerCase().includes('list'));
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[listSheet], { defval: '' });

    const accounts = rows
      .filter(r => r['data__bin'] && r['data_num'] && String(r['data__bin']).trim() !== '-')
      .map(r => {
        const bin = String(r['data__bin']).trim();
        const info = bankMap[bin] || {};
        let stk = String(r['data_num'] || '').trim();
        if (/e/i.test(stk)) stk = Number(r['data_num']).toFixed(0);

        const tmpl = info.template || 'BdT8CDO';
        const nameAc = String(r['name_ac'] || '');
        const listName = String(r['list_name'] || '');

        // Build QR base URL
        const qrBase = `https://img.vietqr.io/image/${bin}-${stk}-${tmpl}.png&amount=`;
        const params = new URLSearchParams();
        if (nameAc) params.set('accountName', nameAc);
        const qrUrl = qrBase + (params.toString() ? '?' + params.toString() : '');

        return {
          list_name:  listName,
          stk,
          bin,
          bank_name:  String(r['data__name']  || info.name      || ''),
          bank_code:  String(r['data__code']  || info.code      || ''),
          short_name: String(r['data__shortName'] || info.shortName || ''),
          logo:       String(r['data__logo']  || info.logo      || ''),
          name_ac:    nameAc,
          template:   tmpl,
          qr_url:     qrUrl,
          // Helper: thêm amount vào qr_url
          // VD: qr_url + "&amount=50000"
        };
      });

    res.status(200).json({ success: true, count: accounts.length, accounts });

  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};