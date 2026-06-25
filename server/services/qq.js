// ═══════════════════════════════════════════════════════════════════
//  QQ音乐 Service
// ═══════════════════════════════════════════════════════════════════

const axios = require('axios');
const { QQ_API, HEADERS, TIMEOUT } = require('../config');
const { inferQuality } = require('../utils');

/**
 * 搜索 QQ 音乐
 */
async function searchQQ(keyword, page = 1, limit = 30) {
  try {
    const resp = await axios.get(QQ_API, {
      params: { msg: keyword, type: 'json' },
      headers: HEADERS, timeout: TIMEOUT,
    });
    const json = resp.data;
    // 兼容：数组 或 {data: [...]}
    const data = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
    if (!Array.isArray(data) || !data.length) return { songs: [], total: 0 };

    const start = (page - 1) * limit;
    const paged = data.slice(start, start + limit);

    const songs = paged.map((s, i) => {
      const mid = s.song_mid || '';
      return {
        id: mid,
        name: s.song_title || s.song_name || '',
        artists: s.singer_name || '',
        album: s.album_name || s.album_title || '',
        // 直接用 mid 构造封面 URL（秒返，不走额外 API）
        albumCover: s.album_pic || s.singer_pic || (mid ? 'https://y.gtimg.cn/music/photo_new/T002R300x300M000' + mid + '.jpg' : ''),
        duration: 0,
        source: 'qq',
        _mid: mid,
        _keyword: keyword,
      };
    });

    return { songs, total: data.length };
  } catch (e) {
    console.error('[QQ Search]', e.message);
    return { songs: [], total: 0, error: e.message };
  }
}

/**
 * 获取 QQ 音乐播放链接
 */
async function getQQUrl(mid, keyword) {
  try {
    const resp = await axios.get(QQ_API, {
      params: { msg: keyword, type: 'json', mid },
      headers: HEADERS, timeout: TIMEOUT,
    });
    const d = resp.data;
    if (!d || typeof d !== 'object') {
      console.log(`  ⚠ QQ 无数据: mid=${mid}`);
      return null;
    }

    // 按优先级选最佳可用 URL（扩展所有已知字段）
    let audioUrl = null;
    if (d.song_play_url_sq) audioUrl = d.song_play_url_sq;
    else if (d.song_play_url_pq) audioUrl = d.song_play_url_pq;
    else if (d.song_play_url_hq) audioUrl = d.song_play_url_hq;
    else if (d.song_play_url_standard) audioUrl = d.song_play_url_standard;
    else if (d.song_play_url_fq) audioUrl = d.song_play_url_fq;
    else if (d.song_play_url) audioUrl = d.song_play_url;
    // 兼容不同字段名
    else if (d.url) audioUrl = d.url;
    else if (d.play_url) audioUrl = d.play_url;

    if (!audioUrl) {
      console.log(`  ⚠ QQ 无播放链接: ${d.song_title || mid} (VIP/下架/地区限制)`);
    }

    return {
      name: d.song_title || d.song_name || d.name || '',
      artist: d.singer_name || d.artist || '',
      audioUrl,
      cover: d.album_pic || d.singer_pic || d.pic || (mid ? 'https://y.gtimg.cn/music/photo_new/T002R300x300M000' + mid + '.jpg' : null),
      lrc: d.song_lyric || d.lyric || d.lrc || null,
    };
  } catch (e) {
    console.error('[QQ URL]', e.message);
    return null;
  }
}

/**
 * 获取 QQ 音乐多音质下载链接
 */
async function getQQQualities(mid, keyword) {
  try {
    const resp = await axios.get(QQ_API, {
      params: { msg: keyword, type: 'json', mid },
      headers: HEADERS, timeout: 7000,
    });
    const d = resp.data;
    if (!d || typeof d !== 'object' || !d.song_mid) return [];

    const results = [];

    // 按优先级列出所有可用音质
    const qLevels = [
      { key: 'sq',   field: 'song_play_url_sq',   label: 'QQ · 臻品 SQ',      icon: '💎', br: 999000, tag: 'lossless' },
      { key: 'pq',   field: 'song_play_url_pq',   label: 'QQ · 臻品 PQ',      icon: '💎', br: 999000, tag: 'lossless' },
      { key: 'hq',   field: 'song_play_url_hq',   label: 'QQ · HQ 高品',       icon: '🔊', br: 320000, tag: 'hq' },
      { key: 'standard', field: 'song_play_url_standard', label: 'QQ · 标准',   icon: '🎵', br: 128000, tag: 'standard' },
      { key: 'fq',   field: 'song_play_url_fq',   label: 'QQ · 流畅',          icon: '🎵', br: 64000,  tag: 'low' },
    ];

    for (const q of qLevels) {
      if (d[q.field]) {
        const info = inferQuality(d[q.field]);
        results.push({
          key: `qq-${q.key}`,
          label: q.label,
          icon: q.icon,
          br: q.br,
          size: 0,
          sizeLabel: '',
          url: d[q.field],
          type: info.tag === 'lossless' ? 'flac' : 'mp3',
          source: 'QQ音乐',
        });
      }
    }

    // fallback
    if (results.length === 0 && d.song_play_url) {
      results.push({
        key: 'qq-fallback',
        label: 'QQ · 默认',
        icon: '🎵',
        br: 128000, size: 0, sizeLabel: '',
        url: d.song_play_url, type: 'mp3', source: 'QQ音乐',
      });
    }

    return results;
  } catch (_) {
    return [];
  }
}

module.exports = { searchQQ, getQQUrl, getQQQualities };
