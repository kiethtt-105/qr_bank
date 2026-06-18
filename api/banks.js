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
    if (!apiSheet) return res.status(500).json({ success: false, error: 'Không tìm thấy sheet API-io' });

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
    if (!listSheet) return res.status(500).json({ success: false, error: 'Không tìm thấy sheet List_bank' });

    const rows = XLSX.utils.sheet_to_json(wb.Sheets[listSheet], { defval: '' });

    const accounts = rows
      .filter(r => r['data__bin'] && r['data_num'] && String(r['data__bin']).trim() !== '-')
      .map(r => {
        const bin = String(r['data__bin']).trim();
        const info = bankMap[bin] || {};
        let stk = String(r['data_num'] || '').trim();
        if (/e/i.test(stk)) stk = Number(r['data_num']).toFixed(0);

        const tmpl = info.template || 'BdT8CDO';

        return {
          list_name:  String(r['list_name'] || ''),
          stk,
          bin,
          bank_name:  String(r['data__name']      || info.name      || ''),
          bank_code:  String(r['data__code']      || info.code      || ''),
          short_name: String(r['data__shortName'] || info.shortName || ''),
          logo:       String(r['data__logo']      || info.logo      || ''),
          name_ac:    String(r['name_ac'] || ''),
          template:   tmpl,
          qr_base:    `https://img.vietqr.io/image/${bin}-${stk}-${tmpl}.png`,
        };
      });

    const { list } = req.query;

    // ?list=xxx → filter theo list_name, trả full accounts
    if (list) {
      const filtered = accounts.filter(
        a => a.list_name.toLowerCase() === list.toLowerCase()
      );
      return res.status(200).json({ success: true, count: filtered.length, accounts: filtered });
    }

    // Không có query → trả danh sách list_name unique (để hiển thị chọn)
    const listNames = [...new Set(accounts.map(a => a.list_name).filter(Boolean))];
    return res.status(200).json({ success: true, count: listNames.length, lists: listNames });

  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};