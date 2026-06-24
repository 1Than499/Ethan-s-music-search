// ═══════════════════════════════════════════════════════════════════
//  Lyric Route — GET /api/lyric/:source/:id
// ═══════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { NETEASE_LYRIC, KUWO_API, QQ_API, HEADERS } = require('../config');

// GET /api/lyric/:source/:id?keyword=X
router.get('/:source/:id', async (req, res) => {
  const { source, id } = req.params;
  const { keyword } = req.query;
  console.log(`📝 获取歌词 [${source}]: ${id}`);

  try {
    let lrc = null;

    if (source === 'netease') {
      const lrcResp = await axios.get(NETEASE_LYRIC, {
        params: { id },
        headers: HEADERS, timeout: 8000,
      });
      if (lrcResp.data?.code === 200 && lrcResp.data?.data?.lrc) {
        lrc = lrcResp.data.data.lrc;
      }
    } else if (source === 'kuwo') {
      const resp = await axios.get(KUWO_API, {
        params: { id, type: 'song', level: 'zp', format: 'json' },
        headers: HEADERS, timeout: 8000,
      });
      if (resp.data?.code === 200 && resp.data?.data?.lyric) {
        lrc = resp.data.data.lyric;
      }
    } else if (source === 'qq') {
      const resp = await axios.get(QQ_API, {
        params: { msg: keyword || '', type: 'json', mid: id },
        headers: HEADERS, timeout: 8000,
      });
      if (resp.data?.song_lyric || resp.data?.lyric) {
        lrc = resp.data.song_lyric || resp.data.lyric;
      }
    }

    res.json({ lrc });
  } catch (e) {
    console.error('[Lyric]', e.message);
    res.json({ lrc: null, error: e.message });
  }
});

module.exports = router;
