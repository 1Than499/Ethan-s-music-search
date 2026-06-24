// ═══════════════════════════════════════════════════════════════════
//  Song Routes — GET /api/song/url/:source/:id
//               GET /api/song/qualities/:source/:id
// ═══════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getNeteaseUrl, getNeteaseQualities, getNeteaseLyric } = require('../services/netease');
const { getKuwoUrl, getKuwoQualities } = require('../services/kuwo');
const { getQQUrl, getQQQualities } = require('../services/qq');
const { KUWO_API, HEADERS } = require('../config');

// ── Get Song Play URL ─────────────────────────────────────────────
// GET /api/song/url/:source/:id?name=&artist=&keyword=
router.get('/url/:source/:id', async (req, res) => {
  const { source, id } = req.params;
  const { name, keyword } = req.query;
  console.log(`🔗 获取播放链接 [${source}]: ${id}`);

  let detail;
  switch (source) {
    case 'kuwo':
      detail = await getKuwoUrl(id, 'zp');
      break;
    case 'qq':
      detail = await getQQUrl(id, keyword || name || '');
      break;
    case 'netease':
    default: {
      detail = await getNeteaseUrl(id);
      // 同时获取歌词
      if (detail && detail.audioUrl) {
        const lrc = await getNeteaseLyric(id);
        if (lrc) detail.lrc = lrc;
      }
      break;
    }
  }

  if (detail && detail.audioUrl) {
    return res.json({
      url: detail.audioUrl,
      name: detail.name,
      artist: detail.artist,
      cover: detail.cover,
      lrc: detail.lrc || null,
    });
  }

  res.json({ url: null, error: '无法获取播放链接' });
});

// ── Get Multi-Quality Download URLs ──────────────────────────────
// GET /api/song/qualities/:source/:id?name=X&artist=X&keyword=X
router.get('/qualities/:source/:id', async (req, res) => {
  const { source, id } = req.params;
  const { name: songName, artist: songArtist, keyword } = req.query;
  console.log(`📊 获取多音质 [${source}]: ${id} "${songName || ''}"`);

  let qualities = [];

  switch (source) {
    case 'kuwo':
      qualities = await getKuwoQualities(id);
      break;
    case 'qq':
      qualities = await getQQQualities(id, keyword || `${songName || ''} ${songArtist || ''}`.trim());
      break;
    case 'netease':
    default: {
      // 网易云：vkeys + NeteaseCloudMusicApi
      qualities = await getNeteaseQualities(id);

      // 并行尝试从酷我也搜索同名歌曲
      if (songName) {
        try {
          const searchKw = `${songName} ${songArtist || ''}`.trim();
          const kwSearch = await axios.get(KUWO_API, {
            params: { name: searchKw, page: 1, limit: 3 },
            headers: HEADERS, timeout: 7000,
          });
          if (kwSearch.data?.code === 200 && Array.isArray(kwSearch.data?.data)) {
            const matches = kwSearch.data.data.filter(it =>
              it.name && songName && (it.name.includes(songName) || songName.includes(it.name))
            );
            const best = matches[0] || kwSearch.data.data[0];
            if (best?.rid) {
              const kwQualities = await getKuwoQualities(best.rid);
              qualities.push(...kwQualities);
            }
          }
        } catch (_) {}
      }
      break;
    }
  }

  // 去重
  const seen = new Set();
  const unique = qualities.filter(r => {
    if (!r.url) return false;
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  // 排序：无损优先
  unique.sort((a, b) => (b.br || 0) - (a.br || 0));

  res.json({ qualities: unique });
});

module.exports = router;
