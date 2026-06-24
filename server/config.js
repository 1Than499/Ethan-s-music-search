// ═══════════════════════════════════════════════════════════════════
//  API Endpoints & Constants
// ═══════════════════════════════════════════════════════════════════

const NETEASE_SEARCH = 'https://api.vkeys.cn/v2/music/netease';
const NETEASE_METING = 'https://api.qijieya.cn/meting';
const NETEASE_LYRIC = 'https://api.vkeys.cn/v2/music/netease/lyric';
const KUWO_API     = 'https://kw-api.cenguigui.cn/';
const QQ_API       = 'https://tang.api.s01s.cn/music_open_api.php';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Referer': 'https://music.163.com/',
};

const TIMEOUT = 10000;

module.exports = {
  NETEASE_SEARCH,
  NETEASE_METING,
  NETEASE_LYRIC,
  KUWO_API,
  QQ_API,
  HEADERS,
  TIMEOUT,
};
