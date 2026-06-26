/* ═══════════════════════════════════════════════════════════════════
   player.js — Audio Playback
   ═══════════════════════════════════════════════════════════════════ */

var playRequestId = 0;

function playSong(source, id, name, artists, keyword) {
  var thisRequest = ++playRequestId;
  console.log('[play #' + thisRequest + ']', source, id, (name || '').slice(0, 20));

  document.querySelectorAll('.song-row').forEach(function(r) { r.classList.remove('playing'); });
  var row = document.getElementById('song-' + source + '-' + id);
  if (row) row.classList.add('playing');

  var pn = document.getElementById('pName');
  var pa = document.getElementById('pArtist');
  if (pn) pn.innerHTML = '<span style="color:var(--text3)">加载中…</span>';
  if (pa) pa.textContent = '';

  var kw = keyword || name || '';
  var url = '/api/song/url/' + source + '/' + id +
    '?name=' + encodeURIComponent(name || '') +
    '&keyword=' + encodeURIComponent(kw);

  var xhr = new XMLHttpRequest();
  xhr.open('GET', url);
  xhr.timeout = 12000;

  xhr.onload = function() {
    console.log('[play #' + thisRequest + '] load status=' + xhr.status);
    if (thisRequest !== playRequestId) { console.log('[play #' + thisRequest + '] stale'); return; }
    try {
      var d = JSON.parse(xhr.responseText);
      if (!d || !d.url) { showToast('😞 暂无可用播放源'); return; }
      applyTrack(d, source, id, name, artists, kw);
    } catch (e) {
      console.error('[play #' + thisRequest + '] error:', e.message, e.stack);
      showToast('出错: ' + e.message);
    }
  };

  xhr.onerror = function() {
    console.error('[play #' + thisRequest + '] network error');
    if (thisRequest !== playRequestId) return;
    showToast('获取播放链接失败');
  };

  xhr.ontimeout = function() {
    console.error('[play #' + thisRequest + '] timeout');
    if (thisRequest !== playRequestId) return;
    showToast('获取播放链接超时');
  };

  xhr.send();
}

function applyTrack(d, source, id, name, artists, kw) {
  S.currentSongId = { source: source, id: id, keyword: kw };
  S.meta = { name: d.name || name, artist: d.artist || artists, cover: d.cover || '', source: source };

  var el;
  el = document.getElementById('pName');
  if (el) el.innerHTML = esc(d.name || name) + ' <span class="p-source ' + source + '">' + (SOURCE_ICONS[source] || '') + '</span>';
  el = document.getElementById('pArtist');
  if (el) el.textContent = (d.artist || artists || '—');

  var pArt = document.getElementById('pArt');
  var pArtPH = document.getElementById('pArtPH');
  if (d.cover) {
    if (pArt) { pArt.src = d.cover; pArt.style.display = ''; }
    if (pArtPH) pArtPH.style.display = 'none';
  } else {
    if (pArt) pArt.style.display = 'none';
    if (pArtPH) pArtPH.style.display = '';
  }

  updateFavButton();
  // 先显示已有歌词，没有就空着
  if (typeof parseLRC === 'function' && typeof renderLyrics === 'function') {
    S.lyrics = d.lrc ? parseLRC(d.lrc) : [];
    renderLyrics();
  }

  var a = document.getElementById('audio');
  if (!a) { showToast('音频元素丢失'); return; }
  a.src = d.url;
  a.volume = S.volume / 100;
  a.play().then(function() {
    S.isPlaying = true;
    updatePlayState();
  }).catch(function(e) {
    console.warn('play rejected:', e.name);
  });

  // 异步补拉歌词（不阻塞播放）
  if (!d.lrc) fetchLyricsAsync(source, id, kw);
}

// ── 异步获取歌词（播放后补拉）────────────────────────────────────────
function fetchLyricsAsync(source, id, keyword) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/lyric/' + source + '/' + id + '?keyword=' + encodeURIComponent(keyword || ''));
  xhr.timeout = 8000;
  xhr.onload = function() {
    try {
      var data = JSON.parse(xhr.responseText);
      if (data && data.lrc && typeof parseLRC === 'function' && typeof renderLyrics === 'function') {
        S.lyrics = parseLRC(data.lrc);
        renderLyrics();
      }
    } catch (_) {}
  };
  xhr.send();
}

// ── Controls ────────────────────────────────────────────────────────
function togglePlay() {
  var a = document.getElementById('audio');
  if (!a || (!a.src && !S.currentSongId)) return;
  if (S.isPlaying) { a.pause(); S.isPlaying = false; }
  else { S.isPlaying = true; a.play().catch(function() { S.isPlaying = false; }); }
  updatePlayState();
}
function updatePlayState() { var b = document.getElementById('btnPlay'); if (b) b.textContent = S.isPlaying ? '⏸' : '▶'; }

function seekRelative(s) {
  var a = document.getElementById('audio');
  if (!a || !a.src) return;
  a.currentTime = Math.max(0, Math.min(a.duration || 0, a.currentTime + s));
}

function seekByClick(e) {
  var a = document.getElementById('audio');
  if (!a || !a.src) return;
  var rect = document.getElementById('progressTrack').getBoundingClientRect();
  a.currentTime = ((e.clientX - rect.left) / rect.width) * (a.duration || 0);
}

function onTimeUpdate() {
  var a = document.getElementById('audio');
  var c = a.currentTime, d = a.duration || 0;
  var tc = document.getElementById('timeCur');
  var pf = document.getElementById('progressFill');
  if (tc) tc.textContent = fmt(c);
  if (pf) pf.style.width = d ? (c / d * 100) + '%' : '0%';
  if (typeof syncLyrics === 'function') syncLyrics(c);
}
function onMetaLoaded() {
  var a = document.getElementById('audio');
  var td = document.getElementById('timeDur');
  if (td) td.textContent = fmt(a.duration || 0);
}
function onSongEnd() { S.isPlaying = false; updatePlayState(); }
function fmt(s) { var m = Math.floor(s / 60), sec = Math.floor(s % 60); return m + ':' + String(sec).padStart(2, '0'); }

function setVolume(v) {
  S.volume = parseInt(v);
  var a = document.getElementById('audio'); if (a) a.volume = S.volume / 100;
  updateVolIcon(); updateVolFill();
}
function toggleMute() {
  S.muted = !S.muted;
  var a = document.getElementById('audio'); if (a) a.muted = S.muted;
  updateVolIcon();
}
function updateVolIcon() {
  var vi = document.getElementById('volIcon');
  if (!vi) return;
  if (S.muted || S.volume === 0) vi.textContent = '🔇';
  else if (S.volume < 50) vi.textContent = '🔉';
  else vi.textContent = '🔊';
}
function updateVolFill() {
  var vs = document.getElementById('volSlider');
  if (vs) vs.style.setProperty('--vol-pct', S.volume + '%');
}

function downloadCurrent() {
  if (!S.currentSongId || !S.meta) { showToast('请先播放歌曲'); return; }
  openQualityModal(S.currentSongId.source, S.currentSongId.id, S.meta.name, S.meta.artist, S.currentSongId.keyword || S.meta.name || '');
}
