/* ═══════════════════════════════════════════════════════════════════
   app.js — Global State, Utilities, Theme, Init, Keyboard Shortcuts
   ═══════════════════════════════════════════════════════════════════ */

// ── Global Shortcut ─────────────────────────────────────────────────
const $ = s => document.getElementById(s);
const audio = $('audio');

// ── Application State ───────────────────────────────────────────────
const S = {
  enabledSources: { netease: true, kuwo: true, qq: true },
  currentSongId: null,         // { source, id, keyword }
  lyrics: [], lyricsEls: [], activeLyricIdx: -1,
  isPlaying: false, volume: 80, muted: false,
  meta: null,                  // { name, artist, cover, source }
  qualities: null, selectedQuality: null,
  pendingDownload: null,       // { source, id, name, artist, keyword }
  favorites: JSON.parse(localStorage.getItem('music-favorites') || '[]'),
  showingFavorites: false,
};

// ── Utility Functions ───────────────────────────────────────────────
function esc(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

function escAttr(s) {
  return (s || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// ── Theme ───────────────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('music-theme') || 'dark';
  applyTheme(saved);
}

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  $('btnTheme').textContent = t === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('music-theme', t);
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  applyTheme(cur === 'dark' ? 'light' : 'dark');
}

// ── Accent Color ─────────────────────────────────────────────────────
function initAccent() {
  const saved = localStorage.getItem('music-accent') || 'blue';
  setAccent(saved);
}

function setAccent(color) {
  document.documentElement.setAttribute('data-accent', color);
  S.accent = color;
  // Update active dot
  document.querySelectorAll('.accent-dot').forEach(d => {
    d.classList.toggle('active', d.dataset.accent === color);
  });
  localStorage.setItem('music-accent', color);
}

// ── Init ────────────────────────────────────────────────────────────
function init() {
  initTheme();
  initAccent();
  initDivider();
  updateBrandLabel();
  updateVolFill();
  updateFavCount();

  // Restore lyrics width
  const savedW = localStorage.getItem('music-lyrics-width');
  if (savedW && $('lyricsPanel').style.display !== 'none') {
    $('lyricsPanel').style.width = savedW;
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    switch (e.key) {
      case ' ': e.preventDefault(); togglePlay(); break;
      case 'ArrowLeft': seekRelative(-5); break;
      case 'ArrowRight': seekRelative(5); break;
      case 'ArrowUp':
        audio.volume = Math.min(1, audio.volume + 0.1);
        S.volume = Math.round(audio.volume * 100);
        $('volSlider').value = S.volume;
        break;
      case 'ArrowDown':
        audio.volume = Math.max(0, audio.volume - 0.1);
        S.volume = Math.round(audio.volume * 100);
        $('volSlider').value = S.volume;
        break;
      case 'l': toggleLyrics(); break;
      case 'm': toggleMute(); break;
      case '1': toggleSource('netease'); showToast('已切换: 网易云音乐'); break;
      case '2': toggleSource('kuwo'); showToast('已切换: 酷我音乐'); break;
      case '3': toggleSource('qq'); showToast('已切换: QQ音乐'); break;
    }
  });

  // Close modal on overlay click
  $('qualityModal').addEventListener('click', e => {
    if (e.target === $('qualityModal')) closeQualityModal();
  });
}

// ── Start ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
