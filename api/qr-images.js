const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const dir = path.join(process.cwd(), 'qr-png');

    if (!fs.existsSync(dir)) {
      return res.status(200).json({ files: [] });
    }

    const files = fs.readdirSync(dir)
      .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f))
      .map(f => {
        const stat = fs.statSync(path.join(dir, f));
        return {
          name: f,
          url: `/qr-png/${f}`,
          size: stat.size,
          mtime: stat.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.mtime) - new Date(a.mtime)); // mới nhất trước

    res.status(200).json({ files });
  } catch (err) {
    res.status(500).json({ error: err.message, files: [] });
  }
};