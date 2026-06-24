/* ═══════════════════════════════════════════════════════════════════
   modal.js — Quality Picker Modal for Music Downloads
   ═══════════════════════════════════════════════════════════════════ */

// ── Open Quality Modal ──────────────────────────────────────────────
async function openQualityModal(source, id, name, artists, keyword) {
  S.pendingDownload = { source, id, name, artist: artists, keyword };
  S.selectedQuality = null;
  S.qualities = null;

  $('qModalTitle').textContent = '选择下载音质';
  $('qModalSub').textContent = `[${SOURCE_NAMES[source]}] ${name} — ${artists}`;
  $('qualityList').innerHTML =
    '<div class="loading-row"><div class="spinner"></div>正在从多平台获取音质…</div>';
  $('btnDownloadConfirm').disabled = true;
  $('qualityModal').classList.add('open');

  try {
    const params = new URLSearchParams({ name, artist: artists, keyword: keyword || name });
    const r = await fetch(`/api/song/qualities/${source}/${id}?${params}`);
    const d = await r.json();
    S.qualities = d.qualities || [];
    renderQualityList();
  } catch (e) {
    $('qualityList').innerHTML =
      '<div style="padding:16px;color:var(--text2);text-align:center">⚠️ 加载失败，请重试</div>';
    console.error(e);
  }
}

// ── Render Quality List ─────────────────────────────────────────────
function renderQualityList() {
  const list = $('qualityList');
  if (!S.qualities.length) {
    list.innerHTML =
      '<div style="padding:16px;color:var(--text2);text-align:center">😞 暂无可选音质</div>';
    return;
  }
  list.innerHTML = S.qualities
    .map(
      (q, i) => `
    <div class="quality-opt" data-idx="${i}" onclick="selectQuality(${i})">
      <span class="q-icon">${q.icon}</span>
      <div class="q-info">
        <div class="q-label">${esc(q.label)}</div>
        <div class="q-detail">${q.source || ''} · ${q.type?.toUpperCase() || 'MP3'}${q.size > 0 && q.sizeLabel ? ' · ' + esc(q.sizeLabel) : ''}</div>
      </div>
      <span class="q-size">${q.size > 0 && q.sizeLabel ? esc(q.sizeLabel) : ''}</span>
    </div>
  `
    )
    .join('');
}

// ── Select Quality ──────────────────────────────────────────────────
function selectQuality(idx) {
  S.selectedQuality = idx;
  document.querySelectorAll('#qualityList .quality-opt').forEach(el => el.classList.remove('selected'));
  document
    .querySelector(`#qualityList .quality-opt[data-idx="${idx}"]`)
    ?.classList.add('selected');
  $('btnDownloadConfirm').disabled = false;
}

// ── Close Modal ─────────────────────────────────────────────────────
function closeQualityModal() {
  $('qualityModal').classList.remove('open');
  S.pendingDownload = null;
  S.selectedQuality = null;
}

// ── Confirm Download ────────────────────────────────────────────────
function confirmDownload() {
  if (S.selectedQuality === null || !S.qualities || !S.pendingDownload) return;
  const q = S.qualities[S.selectedQuality];
  if (!q || !q.url) return;

  const ext = q.type || 'mp3';
  const dl = S.pendingDownload;

  // 直接打开下载链接
  const a = document.createElement('a');
  a.href = q.url;
  a.download = `${dl.name || 'song'} - ${dl.artist || ''} [${q.source || SOURCE_NAMES[dl.source] || ''}].${ext}`;
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // 备用：如果是跨域资源，打开新窗口
  setTimeout(() => {
    if (!document.hidden) window.open(q.url, '_blank');
  }, 800);

  showToast(`⬇ 已开始下载 · ${q.label}`);
  closeQualityModal();
}
