// ═══════════════════════════════════════════════════════════════════
//  Music Search Server — Entry Point
// ═══════════════════════════════════════════════════════════════════

const express = require('express');
const cors = require('cors');
const path = require('path');

const searchRoute = require('./routes/search');
const songRoute = require('./routes/song');
const lyricRoute = require('./routes/lyric');
const downloadRoute = require('./routes/download');

const app = express();

// ── Middleware ──────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── API Routes ─────────────────────────────────────────────────────
app.use('/api/search', searchRoute);
app.use('/api/song', songRoute);
app.use('/api/lyric', lyricRoute);
app.use('/api/download', downloadRoute);

// ── Start Server ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3456;
const srcs = ['网易云音乐', '酷我音乐', 'QQ音乐'];

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   🎵 音乐搜索 v1.0 已启动               ║
║   地址: http://localhost:${PORT}            ║
║   平台: ${srcs.join(' / ')}     ║
║   搜索: vkeys / kw-api / tang           ║
║   下载: 直接链接（仅用于个人学习和研究） ║
╚══════════════════════════════════════════╝
  `);
});
