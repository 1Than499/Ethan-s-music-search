// ═══════════════════════════════════════════════════════════════════
//  Utility Functions
// ═══════════════════════════════════════════════════════════════════

/**
 * 从 URL 推断音质标签
 */
function inferQuality(url) {
  if (!url) return { tag: 'standard', label: '标准 MP3', icon: '🎵' };
  const base = url.split('?')[0].toLowerCase();
  const m = base.match(/\.([a-z0-9]+)$/);
  const ext = m ? m[1] : 'mp3';
  if (['flac','wav','ape','alac','aiff'].includes(ext))
    return { tag: 'lossless', label: `无损 ${ext.toUpperCase()}`, icon: '💎' };
  if (ext === 'mp3' && (base.includes('/320') || base.includes('_320') || base.includes('-320') || base.includes('high')))
    return { tag: '320k', label: '高品 MP3', icon: '🔊' };
  return { tag: 'standard', label: '标准 MP3', icon: '🎵' };
}

/**
 * 格式化文件大小
 */
function formatSize(bytes) {
  if (!bytes) return '';
  // 如果已经是格式化字符串（如 "52.83 MB"），直接返回
  if (typeof bytes === 'string' && /\d/.test(bytes) && /[a-z]/i.test(bytes)) return bytes;
  const n = Number(bytes);
  if (!n || n <= 0) return '';
  if (n > 1048576) return `${(n/1048576).toFixed(1)}MB`;
  return `${(n/1024).toFixed(0)}KB`;
}

module.exports = { inferQuality, formatSize };
