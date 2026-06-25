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

    const songs = paged.map((s, i) => ({
      id: s.song_mid || '',
      name: s.song_title || s.song_name || '',
      artists: s.singer_name || '',
      album: s.album_name || s.album_title || '',
      albumCover: s.album_pic || s.singer_pic || '',
      duration: 0,
      source: 'qq',
      _mid: s.song_mid || '',
      _keyword: keyword,
    }));

    // 批量获取封面（避免并发过多被限流，每批 3 个）
    const songsNeedingCovers = songs.filter(s => !s.albumCover && s._mid);
    if (songsNeedingCovers.length > 0) {
      const BATCH = 3;
      let fetched = 0;
      for (let i = 0; i < songsNeedingCovers.length; i += BATCH) {
        const batch = songsNeedingCovers.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          batch.map(async (s) => {
            try {
              const dr = await axios.get(QQ_API, {
                params: { msg: s._keyword || keyword, type: 'json', mid: s._mid },
                headers: HEADERS, timeout: 8000,
              });
              const d = dr.data;
              if (d && d.album_pic) s.albumCover = d.album_pic;
              else if (d && d.singer_pic) s.albumCover = d.singer_pic;
              if (d && d.album_name) s.album = d.album_name;
              if (d && d.album_title && !s.album) s.album = d.album_title;
              fetched++;
            } catch (_) { /* ignore */ }
          })
        );
      }
      console.log(`  📸 QQ 封面获取: ${fetched}/${songsNeedingCovers.length}`);
    }

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
    if (!d || typeof d !== 'object' || !d.song_mid) return null;

    // 选择最佳音质 URL
    let audioUrl = null;
    let qualityTag = 'standard';
    if (d.song_play_url_sq) { audioUrl = d.song_play_url_sq; qualityTag = 'lossless'; }
    else if (d.song_play_url_pq) { audioUrl = d.song_play_url_pq; qualityTag = 'lossless'; }
    else if (d.song_play_url_hq) { audioUrl = d.song_play_url_hq; qualityTag = 'hq'; }
    else if (d.song_play_url_standard) { audioUrl = d.song_play_url_standard; qualityTag = 'standard'; }
    else { audioUrl = d.song_play_url || null; }

    return {
      name: d.song_title || d.song_name || '',
      artist: d.singer_name || '',
      audioUrl,
      cover: d.album_pic || d.singer_pic || null,
      lrc: d.song_lyric || d.lyric || null,
      quality: qualityTag,
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
