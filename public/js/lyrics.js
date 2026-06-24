/* ═══════════════════════════════════════════════════════════════════
   lyrics.js — LRC Parsing, Rendering, Synchronization
   ═══════════════════════════════════════════════════════════════════ */

// ── Parse LRC ───────────────────────────────────────────────────────
function parseLRC(t) {
  if (!t) return [];
  const lines = t.split(/\r?\n/);
  const reg = /\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\]/;
  const out = [];
  for (const l of lines) {
    const m = reg.exec(l);
    if (!m) continue;
    const min = parseInt(m[1]) || 0,
          sec = parseInt(m[2]) || 0,
          ms  = m[3] ? parseInt(m[3].padEnd(3, '0')) : 0,
          time = min * 60 + sec + ms / 1000,
          text = l.replace(reg, '').trim();
    if (text) out.push({ time, text });
  }
  out.sort((a, b) => a.time - b.time);
  return out;
}

// ── Render Lyrics ───────────────────────────────────────────────────
function renderLyrics() {
  const b = $('lyricsBody'), nl = $('noLyrics');
  b.innerHTML = '';
  S.lyricsEls = [];
  S.activeLyricIdx = -1;
  if (!S.lyrics.length) {
    nl.style.display = 'flex';
    return;
  }
  nl.style.display = 'none';
  S.lyrics.forEach((l, i) => {
    const el = document.createElement('div');
    el.className = 'lyric-line';
    el.textContent = l.text;
    el.addEventListener('click', () => {
      if (audio.src) audio.currentTime = l.time;
    });
    b.appendChild(el);
    S.lyricsEls.push(el);
  });
}

// ── Sync Lyrics ─────────────────────────────────────────────────────
function syncLyrics(cur) {
  if (!S.lyrics.length || !S.lyricsEls.length) return;
  let idx = -1;
  for (let i = 0; i < S.lyrics.length; i++) {
    if (S.lyrics[i].time <= cur) idx = i;
    else break;
  }
  if (idx === S.activeLyricIdx) return;
  S.activeLyricIdx = idx;
  S.lyricsEls.forEach((el, i) => {
    el.classList.remove('active', 'past');
    if (i < idx) el.classList.add('past');
    else if (i === idx) {
      el.classList.add('active');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

// ── Toggle Lyrics Panel ─────────────────────────────────────────────
function toggleLyrics() {
  const p = $('lyricsPanel'), h = $('dividerHandle'), b = $('btnLyric');
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    if (p.classList.contains('mobile-lyrics-open')) {
      p.classList.remove('mobile-lyrics-open');
      b.classList.remove('active');
    } else {
      p.classList.add('mobile-lyrics-open');
      b.classList.add('active');
    }
  } else {
    if (p.style.display === 'none') {
      p.style.display = '';
      if (h) h.style.display = '';
      b.classList.add('active');
    } else {
      p.style.display = 'none';
      if (h) h.style.display = 'none';
      b.classList.remove('active');
    }
  }
}
