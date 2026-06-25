/* ═══════════════════════════════════════════════════════════════════
   player.js — Audio Playback (client-side API calls, like 皮卡丘)
   ═══════════════════════════════════════════════════════════════════ */

// ── External API endpoints (called directly from browser) ──────────
const PLAY_API = {
  netease: 'https://api.qijieya.cn/meting/?type=song&id=',
  neteaseLyric: 'https://api.vkeys.cn/v2/music/netease/lyric?id=',
  kuwo: 'https://kw-api.cenguigui.cn/?type=song&level=zp&format=json&id=',
  qq: 'https://tang.api.s01s.cn/music_open_api.php',
};

// ── Play Song ───────────────────────────────────────────────────────
let playRequestId = 0;

async function playSong(source, id, name, artists, keyword) {
  const thisRequest = ++playRequestId;

  // 暂停当前播放
  audio.pause();
  S.isPlaying = false;
  updatePlayState();

  // 高亮当前行
  document.querySelectorAll('.song-row').forEach(function(r) { r.classList.remove('playing'); });
  var row = document.getElementById('song-' + source + '-' + id);
  if (row) row.classList.add('playing');

  // 加载状态
  $('pName').innerHTML = '<span style="color:var(--text3)">加载中…</span>';
  $('pArtist').textContent = '';

  try {
    // 客户端直接调外部 API 获取播放链接（不走服务端代理）
    var detail = await fetchPlayUrl(source, id, name, keyword || name || '');

    // 过期请求忽略
    if (thisRequest !== playRequestId) return;

    if (!detail || !detail.url) {
      showToast('😞 暂无可用播放源');
      return;
    }

    S.currentSongId = { source: source, id: id, keyword: keyword || name || '' };
    S.meta = { name: detail.name || name, artist: detail.artist || artists, cover: detail.cover || '', source: source };

    // 更新播放栏
    $('pName').innerHTML = esc(detail.name || name) + ' <span class="p-source ' + source + '">' + (SOURCE_ICONS[source] || '') + '</span>';
    $('pArtist').textContent = (detail.artist || artists || '—');

    // 封面
    if (detail.cover) {
      $('pArt').src = detail.cover;
      $('pArt').style.display = '';
      $('pArtPH').style.display = 'none';
    } else {
      $('pArt').style.display = 'none';
      $('pArtPH').style.display = '';
    }
    updateFavButton();

    S.lyrics = detail.lrc ? parseLRC(detail.lrc) : [];
    renderLyrics();

    audio.src = detail.url;
    audio.load();
    audio.volume = S.volume / 100;
    audio.play().then(function() {
      S.isPlaying = true;
      updatePlayState();
    }).catch(function() {});
  } catch (e) {
    if (thisRequest !== playRequestId) return;
    showToast('获取播放链接失败');
    console.error(e);
  }
}

// ── Direct API calls (client-side, no server proxy) ─────────────────
async function fetchPlayUrl(source, id, name, keyword) {
  if (source === 'netease') {
    // 网易云：meting API + vkeys 歌词
    var metingResp = await fetch(PLAY_API.netease + encodeURIComponent(id));
    var metingData = await metingResp.json();
    if (Array.isArray(metingData) && metingData.length > 0) {
      var d = metingData[0];
      var lrc = null;
      try {
        var lrcResp = await fetch(PLAY_API.neteaseLyric + encodeURIComponent(id));
        var lrcData = await lrcResp.json();
        if (lrcData && lrcData.code === 200 && lrcData.data && lrcData.data.lrc) {
          lrc = lrcData.data.lrc;
        }
      } catch (_) {}
      return { url: d.url || null, name: d.name || name, artist: d.artist || '', cover: d.pic || null, lrc: lrc };
    }
    return null;
  }

  if (source === 'kuwo') {
    // 酷我
    var kwResp = await fetch(PLAY_API.kuwo + encodeURIComponent(id));
    var kwData = await kwResp.json();
    if (kwData && kwData.code === 200 && kwData.data) {
      var kd = kwData.data;
      return {
        url: kd.url || null,
        name: kd.name || name,
        artist: kd.artist || '',
        cover: kd.pic || null,
        lrc: kd.lyric || null
      };
    }
    // 降级 hq
    var kwResp2 = await fetch('https://kw-api.cenguigui.cn/?type=song&level=hq&format=json&id=' + encodeURIComponent(id));
    var kwData2 = await kwResp2.json();
    if (kwData2 && kwData2.code === 200 && kwData2.data) {
      var kd2 = kwData2.data;
      return {
        url: kd2.url || null,
        name: kd2.name || name,
        artist: kd2.artist || '',
        cover: kd2.pic || null,
        lrc: kd2.lyric || null
      };
    }
    return null;
  }

  if (source === 'qq') {
    // QQ：tang API，带上 mid 和 keyword
    var qqUrl = PLAY_API.qq + '?msg=' + encodeURIComponent(keyword) + '&type=json&mid=' + encodeURIComponent(id);
    var qqResp = await fetch(qqUrl);
    var qqData = await qqResp.json();
    if (qqData && qqData.song_mid) {
      var audioUrl = qqData.song_play_url_sq || qqData.song_play_url_pq ||
                     qqData.song_play_url_hq || qqData.song_play_url_standard ||
                     qqData.song_play_url_fq || qqData.song_play_url || null;
      return {
        url: audioUrl,
        name: qqData.song_title || qqData.song_name || name,
        artist: qqData.singer_name || '',
        cover: qqData.album_pic || qqData.singer_pic || null,
        lrc: qqData.song_lyric || qqData.lyric || null
      };
    }
    return null;
  }

  return null;
}

// ── Playback Controls ───────────────────────────────────────────────
function togglePlay() {
  if (!audio.src && !S.currentSongId) return;
  if (S.isPlaying) {
    audio.pause();
    S.isPlaying = false;
  } else {
    S.isPlaying = true;
    audio.play().catch(function() { S.isPlaying = false; });
  }
  updatePlayState();
}

function updatePlayState() {
  $('btnPlay').textContent = S.isPlaying ? '⏸' : '▶';
}

function seekRelative(s) {
  if (!audio.src) return;
  audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + s));
}

function seekByClick(e) {
  if (!audio.src) return;
  var r = $('progressTrack').getBoundingClientRect();
  audio.currentTime = ((e.clientX - r.left) / r.width) * (audio.duration || 0);
}

// ── Time ────────────────────────────────────────────────────────────
function onTimeUpdate() {
  var c = audio.currentTime, d = audio.duration || 0;
  $('timeCur').textContent = fmt(c);
  $('progressFill').style.width = d ? (c / d * 100) + '%' : '0%';
  syncLyrics(c);
}

function onMetaLoaded() {
  $('timeDur').textContent = fmt(audio.duration || 0);
}

function onSongEnd() {
  S.isPlaying = false;
  updatePlayState();
}

function fmt(s) {
  var m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return m + ':' + String(sec).padStart(2, '0');
}

// ── Volume ──────────────────────────────────────────────────────────
function setVolume(v) {
  S.volume = parseInt(v);
  audio.volume = S.volume / 100;
  updateVolIcon();
  updateVolFill();
}

function toggleMute() {
  S.muted = !S.muted;
  audio.muted = S.muted;
  updateVolIcon();
}

function updateVolIcon() {
  if (S.muted || S.volume === 0) $('volIcon').textContent = '🔇';
  else if (S.volume < 50) $('volIcon').textContent = '🔉';
  else $('volIcon').textContent = '🔊';
}

function updateVolFill() {
  $('volSlider').style.setProperty('--vol-pct', S.volume + '%');
}

// ── Quick Download Current Song ─────────────────────────────────────
function downloadCurrent() {
  if (!S.currentSongId || !S.meta) { showToast('请先播放歌曲'); return; }
  var src = S.currentSongId.source, sid = S.currentSongId.id, kw = S.currentSongId.keyword;
  openQualityModal(src, sid, S.meta.name, S.meta.artist, kw || S.meta.name || '');
}
