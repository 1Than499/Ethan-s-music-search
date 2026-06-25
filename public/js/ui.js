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
  updateFavCount();
  // 如果当前正在显示收藏歌单，刷新列表
  if (S.showingFavorites) showFavorites();
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

// ── Favorites Playlist ──────────────────────────────────────────────
function updateFavCount() {
  var fc = $('favCount'), fcd = $('favCard');
  if (fc) fc.textContent = S.favorites.length + ' 首';
  if (fcd) fcd.style.display = S.favorites.length > 0 ? '' : 'none';
}

function showFavorites() {
  S.showingFavorites = true;
  var sp2 = $('spinner'), es3 = $('emptyState');
  if (sp2) sp2.style.display = 'none';
  if (es3) es3.style.display = 'none';

  if (!S.favorites.length) {
    var sl2 = $('songList'), rl3 = $('resultLabel'), rc3 = $('resultCount'), sc3 = $('statsCard');
    if (sl2) sl2.innerHTML = '';
    if (rl3) rl3.textContent = '收藏歌单';
    if (rc3) rc3.textContent = '0 首';
    if (es3) { es3.style.display = 'flex'; var iconEl = es3.querySelector('.icon'); if (iconEl) iconEl.textContent = '💔'; var msgEl = es3.querySelector('.msg'); if (msgEl) msgEl.textContent = '还没有收藏歌曲，播放时点击 ♡ 即可收藏'; }
    if (sc3) sc3.innerHTML = '❤ <strong>收藏歌单</strong><br>暂无收藏';
    return;
  }

  var rl4 = $('resultLabel'), rc4 = $('resultCount'), sc4 = $('statsCard');
  if (rl4) rl4.textContent = '收藏歌单';
  if (rc4) rc4.textContent = S.favorites.length + ' 首';
  if (sc4) sc4.innerHTML = '❤ <strong>收藏歌单</strong><br>共 <strong>' + S.favorites.length + '</strong> 首';

  var list = $('songList');
  if (!list) return;
  list.innerHTML = '';

  S.favorites.forEach((s, i) => {
    const row = document.createElement('div');
    row.className = 'song-row fav-row';
    row.id = 'fav-' + s.source + '-' + s.id;
    row.innerHTML = '<span class="idx">' + (i + 1) + '</span>' +
      '<img class="art" src="' + esc(s.cover || '') + '" loading="lazy" onerror="this.src=\'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 42 42%22><rect fill=%22%23333%22 width=%2242%22 height=%2242%22 rx=%226%22/><text x=%2221%22 y=%2226%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2216%22>🎵</text></svg>\'">' +
      '<div class="info">' +
        '<div class="track-name">' + esc(s.name) + ' <span class="source-badge ' + s.source + '">' + (SOURCE_ICONS[s.source] || '') + '</span></div>' +
        '<div class="track-meta">' + esc(s.artist || '') + '</div>' +
      '</div>' +
      '<div class="actions">' +
        '<button class="btn btn-play" onclick="event.stopPropagation();playSong(\'' + s.source + '\',\'' + s.id + '\',\'' + escAttr(s.name) + '\',\'' + escAttr(s.artist) + '\',\'' + escAttr(s.name) + '\')" title="播放">▶</button>' +
        '<button class="btn btn-remove" onclick="event.stopPropagation();removeFavorite(\'' + s.source + '\',\'' + s.id + '\')" title="取消收藏">✕</button>' +
      '</div>';
    row.addEventListener('click', function() {
      playSong(s.source, s.id, s.name, s.artist, s.name);
    });
    list.appendChild(row);
  });
}

function removeFavorite(source, id) {
  const idx = S.favorites.findIndex(function(f) { return f.source === source && f.id === id; });
  if (idx >= 0) {
    var removed = S.favorites[idx];
    S.favorites.splice(idx, 1);
    localStorage.setItem('music-favorites', JSON.stringify(S.favorites));
    updateFavButton();
    updateFavCount();
    showToast('已取消收藏: ' + removed.name);
    showFavorites();
  }
}
