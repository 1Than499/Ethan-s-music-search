// ═══════════════════════════════════════════════════════════════════
//  酷我音乐 Service
// ═══════════════════════════════════════════════════════════════════

const axios = require('axios');
const { KUWO_API, HEADERS, TIMEOUT } = require('../config');
const { inferQuality, formatSize } = require('../utils');

/**
 * 搜索酷我音乐
 */
async function searchKuwo(keyword, page = 1, limit = 30) {
  try {
    const resp = await axios.get(KUWO_API, {
      params: { name: keyword, page, limit },
      headers: HEADERS, timeout: TIMEOUT,
    });
    const data = resp.data;
    if (data.code !== 200 || !Array.isArray(data.data)) return { songs: [], total: 0 };
    const songs = data.data.map(s => ({
      id: String(s.rid),
      name: s.name || '',
      artists: s.artist || '',
      album: s.album || '',
      albumCover: s.pic || '',
      duration: 0,
      source: 'kuwo',
    }));
    return { songs, total: data.total || songs.length };
  } catch (e) {
    console.error('[Kuwo Search]', e.message);
    return { songs: [], total: 0, error: e.message };
  }
}

/**
 * 获取酷我音乐播放链接和歌词
 */
async function getKuwoUrl(songId, level = 'zp') {
  try {
    const resp = await axios.get(KUWO_API, {
      params: { id: songId, type: 'song', level, format: 'json' },
      headers: HEADERS, timeout: TIMEOUT,
    });
    const data = resp.data;
    if (data.code !== 200 || !data.data) return null;
    const d = data.data;
    return {
      name: d.name || '',
      artist: d.artist || '',
      audioUrl: d.url || null,
      cover: d.pic || null,
      lrc: d.lyric || null,
      size: d.size || d.filesize || 0,
    };
  } catch (e) {
    console.error('[Kuwo URL]', e.message);
    return null;
  }
}

/**
 * 获取酷我音乐多音质下载链接
 */
async function getKuwoQualities(songId) {
  const levels = [
    { key: 'zp', label: '无损', icon: '💎' },
    { key: 'hq', label: '高品', icon: '🔊' },
    { key: 'standard', label: '标准', icon: '🎵' },
  ];

  const settled = await Promise.allSettled(
    levels.map(async ({ key, label, icon }) => {
      const resp = await axios.get(KUWO_API, {
        params: { id: songId, type: 'song', level: key, format: 'json' },
        headers: HEADERS, timeout: 7000,
      });
      if (resp.data?.code !== 200 || !resp.data?.data?.url) return null;
      const d = resp.data.data;
      const info = inferQuality(d.url);
      // Kuwo size is a string like "52.83 MB"
      const rawSize = d.size || d.filesize || 0;
      const sizeLabel = typeof rawSize === 'string' ? rawSize : formatSize(rawSize);
      const sizeNum = typeof rawSize === 'string'
        ? (parseFloat(rawSize) * (rawSize.includes('MB') ? 1048576 : 1024) || 0)
        : (rawSize || 0);
      return {
        key: `kuwo-${key}`,
        label: `酷我 · ${label}`,
        icon,
        br: key === 'zp' ? 999000 : key === 'hq' ? 320000 : 128000,
        size: sizeNum,
        sizeLabel,
        url: d.url,
        type: key === 'zp' ? 'flac' : 'mp3',
        source: '酷我音乐',
      };
    })
  );

  return settled.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
}

module.exports = { searchKuwo, getKuwoUrl, getKuwoQualities };
