// ═══════════════════════════════════════════════════════════════════
//  Download Route — GET /api/download/:source/:id
// ═══════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getNeteaseUrl } = require('../services/netease');
const { getKuwoUrl } = require('../services/kuwo');
const { getQQUrl } = require('../services/qq');
const { HEADERS } = require('../config');

// GET /api/download/:source/:id?name=X&keyword=X
router.get('/:source/:id', async (req, res) => {
  const { source, id } = req.params;
  const { name, keyword } = req.query;

  let detail;
  try {
    switch (source) {
      case 'kuwo':
        detail = await getKuwoUrl(id, 'zp');
        break;
      case 'qq':
        detail = await getQQUrl(id, keyword || name || '');
        break;
      case 'netease':
      default:
        detail = await getNeteaseUrl(id);
        break;
    }
  } catch (e) {
    return res.status(500).json({ error: '获取下载链接失败: ' + e.message });
  }

  if (!detail || !detail.audioUrl) {
    return res.status(404).json({ error: '无法获取下载链接' });
  }

  try {
    const filename = encodeURIComponent(
      `${detail.name || id} - ${detail.artist || '未知'}.mp3`
    );
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
    res.setHeader('Content-Type', 'audio/mpeg');

    const stream = await axios.get(detail.audioUrl, {
      responseType: 'stream',
      headers: HEADERS,
      timeout: 120000,
      maxRedirects: 5,
    });
    stream.data.pipe(res);
  } catch (e) {
    res.status(500).json({ error: '下载失败: ' + e.message });
  }
});

module.exports = router;
