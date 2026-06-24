// ═══════════════════════════════════════════════════════════════════
//  Search Route — GET /api/search
// ═══════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { searchNetease } = require('../services/netease');
const { searchKuwo } = require('../services/kuwo');
const { searchQQ } = require('../services/qq');

// GET /api/search?keyword=X&source=netease,kuwo,qq&page=1&limit=30
router.get('/', async (req, res) => {
  const { keyword, source = 'netease', page = 1, limit = 30 } = req.query;
  if (!keyword) {
    return res.status(400).json({ error: '请输入搜索关键词' });
  }

  // 支持逗号分隔的多平台，如 source=netease,kuwo,qq
  const sources = [...new Set(
    (Array.isArray(source) ? source : String(source).split(',')).map(s => s.trim()).filter(Boolean)
  )];
  const validSources = sources.filter(s => ['netease', 'kuwo', 'qq'].includes(s));
  if (!validSources.length) {
    return res.status(400).json({ error: '无效的音乐平台，可选: netease, kuwo, qq' });
  }

  console.log(`🔍 搜索 [${validSources.join(' + ')}]: "${keyword}"`);

  const p = parseInt(page);
  const l = parseInt(limit);

  // 并行搜索所有选中的平台
  const tasks = validSources.map(src => {
    switch (src) {
      case 'kuwo':  return searchKuwo(keyword, p, l).then(r => ({ source: src, ...r }));
      case 'qq':    return searchQQ(keyword, p, l).then(r => ({ source: src, ...r }));
      default:      return searchNetease(keyword, p, l).then(r => ({ source: src, ...r }));
    }
  });

  const results = await Promise.all(tasks);

  // 交错合并：轮询从每个平台取一首
  const merged = [];
  const arrays = results.map(r => r.songs);
  let idx = 0, added = 0;
  while (added < arrays.reduce((a, b) => a + b.length, 0)) {
    for (const arr of arrays) {
      if (idx < arr.length) { merged.push(arr[idx]); added++; }
    }
    idx++;
  }

  const total = results.reduce((sum, r) => sum + (r.total || 0), 0);
  res.json({ songs: merged, total, sources: validSources });
});

module.exports = router;
