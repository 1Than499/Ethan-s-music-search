/* ═══════════════════════════════════════════════════════════════════
   lyrics.js — LRC Parsing, Rendering, Synchronization
   ═══════════════════════════════════════════════════════════════════ */

function parseLRC(t) {
  if (!t) return [];
  var lines = t.split(/\r?\n/);
  var reg = /\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\]/;
  var out = [];
  for (var i = 0; i < lines.length; i++) {
    var m = reg.exec(lines[i]);
    if (!m) continue;
    var min = parseInt(m[1]) || 0,
        sec = parseInt(m[2]) || 0,
        ms  = m[3] ? parseInt(m[3].padEnd(3, '0')) : 0,
        time = min * 60 + sec + ms / 1000,
        text = lines[i].replace(reg, '').trim();
    if (text) out.push({ time: time, text: text });
  }
  out.sort(function(a, b) { return a.time - b.time; });
  return out;
}

function renderLyrics() {
  var b = document.getElementById('lyricsBody');
  var nl = document.getElementById('noLyrics');
  if (!b) return;
  b.innerHTML = '';
  S.lyricsEls = [];
  S.activeLyricIdx = -1;
  if (!S.lyrics.length) {
    if (nl) nl.style.display = 'flex';
    return;
  }
  if (nl) nl.style.display = 'none';
  S.lyrics.forEach(function(l, i) {
    var el = document.createElement('div');
    el.className = 'lyric-line';
    el.textContent = l.text;
    el.addEventListener('click', function() {
      var a = document.getElementById('audio');
      if (a && a.src) a.currentTime = l.time;
    });
    b.appendChild(el);
    S.lyricsEls.push(el);
  });
}

function syncLyrics(cur) {
  if (!S.lyrics.length || !S.lyricsEls.length) return;
  var idx = -1;
  for (var i = 0; i < S.lyrics.length; i++) {
    if (S.lyrics[i].time <= cur) idx = i;
    else break;
  }
  if (idx === S.activeLyricIdx) return;
  S.activeLyricIdx = idx;
  S.lyricsEls.forEach(function(el, i) {
    el.classList.remove('active', 'past');
    if (i < idx) el.classList.add('past');
    else if (i === idx) {
      el.classList.add('active');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

function toggleLyrics() {
  var p = document.getElementById('lyricsPanel');
  var h = document.getElementById('dividerHandle');
  var b = document.getElementById('btnLyric');
  if (!p) return;
  var isMobile = window.innerWidth <= 768;
  if (isMobile) {
    if (p.classList.contains('mobile-lyrics-open')) {
      p.classList.remove('mobile-lyrics-open');
      if (b) b.classList.remove('active');
    } else {
      p.classList.add('mobile-lyrics-open');
      if (b) b.classList.add('active');
    }
  } else {
    if (p.style.display === 'none') {
      p.style.display = '';
      if (h) h.style.display = '';
      if (b) b.classList.add('active');
    } else {
      p.style.display = 'none';
      if (h) h.style.display = 'none';
      if (b) b.classList.remove('active');
    }
  }
}
