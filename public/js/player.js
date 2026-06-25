/* ═══════════════════════════════════════════════════════════════════
   player.js — Audio Playback (XHR + simple approach)
   ═══════════════════════════════════════════════════════════════════ */

// ── Play Song ───────────────────────────────────────────────────────
var playRequestId = 0;

function playSong(source, id, name, artists, keyword) {
  var thisRequest = ++playRequestId;

  // 高亮
  document.querySelectorAll('.song-row').forEach(function(r) { r.classList.remove('playing'); });
  var row = document.getElementById('song-' + source + '-' + id);
  if (row) row.classList.add('playing');

  $('pName').innerHTML = '<span style="color:var(--text3)">加载中…</span>';
  $('pArtist').textContent = '';

  // 使用 XHR 代替 fetch（更稳定的跨域行为）
  var kw = keyword || name || '';
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/song/url/' + source + '/' + id +
    '?name=' + encodeURIComponent(name || '') +
    '&keyword=' + encodeURIComponent(kw));
  xhr.timeout = 10000;

  xhr.onload = function() {
    if (thisRequest !== playRequestId) return;
    try {
      var d = JSON.parse(xhr.responseText);
      if (!d || !d.url) {
        showToast('😞 暂无可用播放源 [' + source + ']');
        return;
      }
      applyAndPlay(d, source, id, name, artists, kw);
    } catch (e) {
      showToast('解析失败: ' + e.message);
    }
  };

  xhr.onerror = function() {
    if (thisRequest !== playRequestId) return;
    showToast('获取播放链接失败 (网络错误)');
    console.error('XHR error, status:', xhr.status);
  };

  xhr.ontimeout = function() {
    if (thisRequest !== playRequestId) return;
    showToast('获取播放链接超时');
  };

  xhr.send();
}

function applyAndPlay(d, source, id, name, artists, kw) {
  S.currentSongId = { source: source, id: id, keyword: kw };
  S.meta = { name: d.name || name, artist: d.artist || artists, cover: d.cover || '', source: source };

  $('pName').innerHTML = esc(d.name || name) + ' <span class="p-source ' + source + '">' + (SOURCE_ICONS[source] || '') + '</span>';
  $('pArtist').textContent = (d.artist || artists || '—');

  if (d.cover) {
    $('pArt').src = d.cover;
    $('pArt').style.display = '';
    $('pArtPH').style.display = 'none';
  } else {
    $('pArt').style.display = 'none';
    $('pArtPH').style.display = '';
  }
  updateFavButton();

  S.lyrics = d.lrc ? parseLRC(d.lrc) : [];
  renderLyrics();

  audio.src = d.url;
  audio.volume = S.volume / 100;
  audio.play().then(function() {
    S.isPlaying = true;
    updatePlayState();
  }).catch(function(e) {
    console.warn('play rejected:', e.name);
    // 静默处理 autoplay 拦截
  });
}

// ── Playback Controls ───────────────────────────────────────────────
function togglePlay() {
  if (!audio.src && !S.currentSongId) return;
  if (S.isPlaying) { audio.pause(); S.isPlaying = false; }
  else { S.isPlaying = true; audio.play().catch(function() { S.isPlaying = false; }); }
  updatePlayState();
}

function updatePlayState() { $('btnPlay').textContent = S.isPlaying ? '⏸' : '▶'; }

function seekRelative(s) {
  if (!audio.src) return;
  audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + s));
}

function seekByClick(e) {
  if (!audio.src) return;
  var rect = $('progressTrack').getBoundingClientRect();
  audio.currentTime = ((e.clientX - rect.left) / rect.width) * (audio.duration || 0);
}

// ── Time ────────────────────────────────────────────────────────────
function onTimeUpdate() {
  var c = audio.currentTime, d = audio.duration || 0;
  $('timeCur').textContent = fmt(c);
  $('progressFill').style.width = d ? (c / d * 100) + '%' : '0%';
  syncLyrics(c);
}
function onMetaLoaded() { $('timeDur').textContent = fmt(audio.duration || 0); }
function onSongEnd() { S.isPlaying = false; updatePlayState(); }
function fmt(s) { var m = Math.floor(s / 60), sec = Math.floor(s % 60); return m + ':' + String(sec).padStart(2, '0'); }

// ── Volume ──────────────────────────────────────────────────────────
function setVolume(v) { S.volume = parseInt(v); audio.volume = S.volume / 100; updateVolIcon(); updateVolFill(); }
function toggleMute() { S.muted = !S.muted; audio.muted = S.muted; updateVolIcon(); }
function updateVolIcon() {
  if (S.muted || S.volume === 0) $('volIcon').textContent = '🔇';
  else if (S.volume < 50) $('volIcon').textContent = '🔉';
  else $('volIcon').textContent = '🔊';
}
function updateVolFill() { $('volSlider').style.setProperty('--vol-pct', S.volume + '%'); }

// ── Quick Download ──────────────────────────────────────────────────
function downloadCurrent() {
  if (!S.currentSongId || !S.meta) { showToast('请先播放歌曲'); return; }
  openQualityModal(S.currentSongId.source, S.currentSongId.id, S.meta.name, S.meta.artist, S.currentSongId.keyword || S.meta.name || '');
}
