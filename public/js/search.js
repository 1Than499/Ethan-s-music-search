/* ═══════════════════════════════════════════════════════════════════
   search.js — Platform Selector, Search Logic, Result Rendering
   ═══════════════════════════════════════════════════════════════════ */

// ── Platform Selector ───────────────────────────────────────────────
function toggleSource(src) {
  S.enabledSources[src] = !S.enabledSources[src];
  // 同步所有平台按钮（桌面 + 移动端）
  document.querySelectorAll(`.source-btn[data-source="${src}"]`).forEach(btn => {
    if (S.enabledSources[src]) btn.classList.add('active');
    else btn.classList.remove('active');
  });
  updateBrandLabel();
}

function updateBrandLabel() {
  const selected = Object.keys(S.enabledSources).filter(k => S.enabledSources[k]);
  if (selected.length === 0) {
    $('brandVer').textContent = '请选择平台';
  } else if (selected.length === 3) {
    $('brandVer').textContent = '多平台聚合搜索';
  } else {
    $('brandVer').textContent = selected.map(s => SOURCE_NAMES[s]).join(' + ');
  }
}

function getSelectedSources() {
  const list = Object.keys(S.enabledSources).filter(k => S.enabledSources[k]);
  return list.length ? list : ['netease']; // 至少保留一个
}

// ── Search ──────────────────────────────────────────────────────────
let searchAbortController = null;

async function doSearch() {
  // 取消上一次未完成的搜索（防止竞态条件导致旧结果覆盖新结果）
  if (searchAbortController) {
    searchAbortController.abort();
  }
  searchAbortController = new AbortController();
  const { signal } = searchAbortController;

  // 同时读取桌面端和移动端的输入框
  const kw = ($('searchInput').value || $('searchInputM').value || '').trim();
  if (!kw) return;
  // 双向同步
  $('searchInput').value = kw;
  if ($('searchInputM')) $('searchInputM').value = kw;
  const sources = getSelectedSources();
  const srcStr = sources.join(',');

  $('emptyState').style.display = 'none';
  $('songList').innerHTML = '';
  $('spinner').style.display = 'block';
  $('resultLabel').textContent = `搜索中 [${sources.map(s => SOURCE_NAMES[s]).join('+')}]…`;
  $('resultCount').textContent = '';
  $('statsCard').innerHTML = `平台: <strong>${sources.map(s => SOURCE_NAMES[s]).join(' + ')}</strong><br>搜索中…`;

  try {
    const r = await fetch(`/api/search?keyword=${encodeURIComponent(kw)}&source=${srcStr}&limit=30`, { signal });
    const d = await r.json();
    $('spinner').style.display = 'none';

    if (d.error) {
      $('resultLabel').textContent = '错误';
      $('statsCard').innerHTML = `⚠️ ${esc(d.error)}`;
      return;
    }

    if (!d.songs || !d.songs.length) {
      $('resultLabel').textContent = '无结果';
      $('emptyState').style.display = 'flex';
      $('statsCard').innerHTML = `平台: <strong>${sources.map(s => SOURCE_NAMES[s]).join(' + ')}</strong><br>未找到 "<strong>${esc(kw)}</strong>"`;
      return;
    }

    $('resultLabel').textContent = `"${kw}" · ${sources.map(s => SOURCE_NAMES[s]).join('+')}`;
    $('resultCount').textContent = `${d.songs.length} 首`;
    $('statsCard').innerHTML = `平台: <strong>${sources.map(s => SOURCE_NAMES[s]).join(' + ')}</strong><br>关键词: <strong>${esc(kw)}</strong><br>结果: <strong>${d.songs.length}</strong> 首`;

    const list = $('songList');
    d.songs.forEach((s, i) => {
      const row = document.createElement('div');
      row.className = 'song-row';
      row.id = `song-${s.source}-${s.id}`;
      row.innerHTML = `<span class="idx">${i + 1}</span>
        <img class="art" src="${esc(s.albumCover)}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 42 42%22><rect fill=%22%23333%22 width=%2242%22 height=%2242%22 rx=%226%22/><text x=%2221%22 y=%2226%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2216%22>🎵</text></svg>'">
        <div class="info">
          <div class="track-name">${esc(s.name)} <span class="source-badge ${s.source}">${SOURCE_ICONS[s.source]}</span></div>
          <div class="track-meta">${esc(s.artists)}${s.album ? ' · ' + esc(s.album) : ''}</div>
        </div>
        <div class="actions">
          <button class="btn btn-play" onclick="event.stopPropagation();playSong('${s.source}','${s.id}','${escAttr(s.name)}','${escAttr(s.artists)}','${escAttr(s._keyword || kw)}')" title="播放">▶</button>
          <button class="btn btn-dl" onclick="event.stopPropagation();openQualityModal('${s.source}','${s.id}','${escAttr(s.name)}','${escAttr(s.artists)}','${escAttr(s._keyword || kw)}')" title="下载">⬇</button>
        </div>`;
      row.addEventListener('click', () => playSong(s.source, s.id, s.name, s.artists, s._keyword || kw));
      list.appendChild(row);
    });
  } catch (e) {
    // 被取消的请求直接忽略（新搜索已发起）
    if (e.name === 'AbortError') return;
    $('spinner').style.display = 'none';
    $('resultLabel').textContent = '错误';
    console.error(e);
    showToast('搜索失败: ' + e.message);
  }
}
