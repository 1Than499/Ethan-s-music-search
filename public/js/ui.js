/* ═══════════════════════════════════════════════════════════════════
   ui.js — Toast, Divider, Favorites, Source Constants
   ═══════════════════════════════════════════════════════════════════ */

const SOURCE_NAMES = { netease: '网易云音乐', kuwo: '酷我音乐', qq: 'QQ音乐' };
const SOURCE_ICONS = { netease: '🔴', kuwo: '🟠', qq: '🟢' };

// ── Toast ───────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ── Resizable Divider ───────────────────────────────────────────────
function initDivider() {
  const handle = $('dividerHandle');
  const panel = $('lyricsPanel');
  let dragging = false, startX, startW;

  handle.addEventListener('mousedown', e => {
    dragging = true;
    startX = e.clientX;
    startW = panel.offsetWidth;
    handle.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const dx = startX - e.clientX;
    const w = Math.max(180, Math.min(600, startW + dx));
    panel.style.width = w + 'px';
    panel.style.transition = 'none';
  });
  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
    document.body.style.cursor = '';
    panel.style.transition = '';
    localStorage.setItem('music-lyrics-width', panel.style.width);
  });
}

// ── Favorites ───────────────────────────────────────────────────────
function toggleFavorite() {
  if (!S.currentSongId || !S.meta) return;
  const song = {
    source: S.currentSongId.source,
    id: S.currentSongId.id,
    name: S.meta.name,
    artist: S.meta.artist,
    cover: S.meta.cover,
  };
  const idx = S.favorites.findIndex(f => f.source === song.source && f.id === song.id);
  if (idx >= 0) {
    S.favorites.splice(idx, 1);
    showToast('已取消收藏');
  } else {
    S.favorites.unshift(song);
    showToast('❤ 已收藏');
  }
  localStorage.setItem('music-favorites', JSON.stringify(S.favorites));
  updateFavButton();
}

function updateFavButton() {
  if (!S.currentSongId) {
    $('btnFav').textContent = '♡';
    $('btnFav').classList.remove('liked');
    return;
  }
  const liked = S.favorites.some(
    f => f.source === S.currentSongId.source && f.id === S.currentSongId.id
  );
  $('btnFav').textContent = liked ? '❤' : '♡';
  if (liked) $('btnFav').classList.add('liked');
  else $('btnFav').classList.remove('liked');
}
