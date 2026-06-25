/* ═══════════════════════════════════════════════════════════════════
   player.js — Audio Playback, Progress, Volume, Quick Download
   ═══════════════════════════════════════════════════════════════════ */

// ── Play Song ───────────────────────────────────────────────────────
async function playSong(source, id, name, artists, keyword) {
  // 移除所有 playing 状态
  document.querySelectorAll('.song-row').forEach(r => r.classList.remove('playing'));
  const row = document.getElementById(`song-${source}-${id}`);
  if (row) row.classList.add('playing');

  try {
    const params = new URLSearchParams({ name, keyword: keyword || name });
    const r = await fetch(`/api/song/url/${source}/${id}?${params}`);
    const d = await r.json();

    if (!d.url) { showToast('😞 暂无可用播放源'); return; }

    S.currentSongId = { source, id, keyword: keyword || name };
    S.meta = { name: d.name || name, artist: d.artist || artists, cover: d.cover || '', source };

    // 更新播放栏信息
    const sourceLabel = SOURCE_NAMES[source] || '';
    $('pName').innerHTML = `${esc(d.name || name)} <span class="p-source ${source}">${SOURCE_ICONS[source]}</span>`;
    $('pArtist').textContent = (d.artist || artists || '—') + (sourceLabel ? ` · ${sourceLabel}` : '');

    // 封面
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
    audio.load();
    audio.volume = S.volume / 100;
    audio.play().then(() => {
      S.isPlaying = true;
      updatePlayState();
    }).catch(() => {});
  } catch (e) {
    showToast('获取播放链接失败');
    console.error(e);
  }
}

// ── Playback Controls ───────────────────────────────────────────────
function togglePlay() {
  if (!audio.src && !S.currentSongId) return;
  if (S.isPlaying) {
    audio.pause();
    S.isPlaying = false;
  } else {
    S.isPlaying = true;
    audio.play().catch(() => { S.isPlaying = false; });
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
  const r = $('progressTrack').getBoundingClientRect();
  audio.currentTime = ((e.clientX - r.left) / r.width) * (audio.duration || 0);
}

// ── Time ────────────────────────────────────────────────────────────
function onTimeUpdate() {
  const c = audio.currentTime, d = audio.duration || 0;
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
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
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
  const { source, id, keyword } = S.currentSongId;
  openQualityModal(source, id, S.meta.name, S.meta.artist, keyword || S.meta.name || '');
}
