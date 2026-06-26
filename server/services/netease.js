// ═══════════════════════════════════════════════════════════════════
//  网易云音乐 Service
// ═══════════════════════════════════════════════════════════════════

const axios = require('axios');
const { NETEASE_SEARCH, NETEASE_METING, NETEASE_LYRIC, HEADERS, TIMEOUT } = require('../config');
const { inferQuality, formatSize } = require('../utils');

/**
 * 搜索网易云音乐
 */
async function searchNetease(keyword, page = 1, limit = 30) {
  try {
    const resp = await axios.get(NETEASE_SEARCH, {
      params: { word: keyword, page, num: limit },
      headers: HEADERS, timeout: TIMEOUT,
    });
    const data = resp.data;
    if (data.code !== 200 || !Array.isArray(data.data)) return { songs: [], total: 0 };
    const songs = data.data.map(s => ({
      id: String(s.id),
      name: s.song || s.name || '',
      artists: s.singer || s.artist || '',
      album: s.album || '',
      albumCover: s.cover || '',
      duration: s.duration || 0,
      source: 'netease',
    }));
    return { songs, total: data.total || songs.length };
  } catch (e) {
    console.error('[Netease Search]', e.message);
    return { songs: [], total: 0, error: e.message };
  }
}

/**
 * 获取网易云音乐播放链接（优先用直链，不用meting跳转）
 */
async function getNeteaseUrl(songId) {
  // 优先: NeteaseCloudMusicApi 拿直链（快且稳定）
  try {
    const { song_url } = require('NeteaseCloudMusicApi');
    const r = await song_url({ id: String(songId), br: 320000 });
    if (r.body?.code === 200 && r.body.data?.[0]?.url) {
      const su = r.body.data[0];
      // 同时获取封面和歌词
      let cover = null, name = '', artist = '';
      try {
        const meting = await axios.get(NETEASE_METING, {
          params: { type: 'song', id: songId },
          headers: HEADERS, timeout: 5000,
        });
        if (Array.isArray(meting.data) && meting.data.length) {
          cover = meting.data[0].pic || null;
          name = meting.data[0].name || '';
          artist = meting.data[0].artist || '';
        }
      } catch (_) {}
      console.log(`  ✅ Netease直链: ${su.url.slice(0,60)}...`);
      return { name, artist, audioUrl: su.url, cover, lrc: null };
    }
  } catch (e) {
    console.log(`  ⚠ Netease直链失败: ${e.message}, 降级meting`);
  }

  // 降级: meting 跳转 URL
  try {
    const resp = await axios.get(NETEASE_METING, {
      params: { type: 'song', id: songId },
      headers: HEADERS, timeout: TIMEOUT,
    });
    const data = resp.data;
    if (Array.isArray(data) && data.length) {
      const d = data[0];
      return {
        name: d.name || '',
        artist: d.artist || '',
        audioUrl: d.url || null,
        cover: d.pic || null,
      };
    }
  } catch (e) {
    console.error('[Netease URL]', e.message);
  }

  return null;
}

/**
 * 获取网易云音乐歌词
 */
async function getNeteaseLyric(songId) {
  try {
    const lrcResp = await axios.get(NETEASE_LYRIC, {
      params: { id: songId },
      headers: HEADERS, timeout: TIMEOUT,
    });
    if (lrcResp.data?.code === 200 && lrcResp.data?.data?.lrc) {
      return lrcResp.data.data.lrc;
    }
    return null;
  } catch (_) {
    return null;
  }
}

/**
 * 获取网易云音乐多音质下载链接
 */
async function getNeteaseQualities(songId) {
  const results = [];

  // meting proxy (best available)
  try {
    const meting = await axios.get(NETEASE_METING, {
      params: { type: 'song', id: songId },
      headers: HEADERS, timeout: 7000,
    });
    if (Array.isArray(meting.data) && meting.data.length) {
      const d = meting.data[0];
      if (d.url) {
        const info = inferQuality(d.url);
        results.push({
          key: 'netease-meting',
          label: '网易云 · 推荐音质',
          icon: '⭐', br: 320000, size: 0, sizeLabel: '',
          url: d.url, type: 'mp3', source: '网易云音乐',
        });
      }
    }
  } catch (_) {}

  // NeteaseCloudMusicApi fallback levels
  try {
    const { song_url } = require('NeteaseCloudMusicApi');
    for (const br of [320000, 128000]) {
      try {
        const r = await song_url({ id: String(songId), br });
        if (r.body?.code === 200 && r.body.data?.[0]?.url) {
          const su = r.body.data[0];
          results.push({
            key: `netease-${br}`,
            label: `网易云 · ${br === 320000 ? '320kbps' : '128kbps'}`,
            icon: br === 320000 ? '🔊' : '🎵',
            br: su.br || br, size: su.size || 0,
            sizeLabel: formatSize(su.size),
            url: su.url, type: su.type || 'mp3', source: '网易云音乐',
          });
        }
      } catch (_) {}
    }
  } catch (_) {}

  return results;
}

module.exports = { searchNetease, getNeteaseUrl, getNeteaseLyric, getNeteaseQualities };
