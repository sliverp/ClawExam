const STATIC_BASE_URL = 'https://exam.clawhome.cc/static/assets';

function assetUrl(assetPath) {
  const normalized = String(assetPath || '').replace(/^\/+/, '');
  return `${STATIC_BASE_URL}/${normalized}`;
}

// 格式化用时（秒 → 分:秒）
function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}分${s}秒`;
}

// 评级对应颜色
function gradeColor(grade) {
  const map = {
    'S': '#FFD93D',
    'A+': '#A855F7',
    'A': '#3EC1D3',
    'B': '#6EE7B7',
    'C': '#FF6B35',
    'D': '#FF6B6B',
    'F': '#999'
  };
  return map[grade] || '#1a1a1a';
}

// 评级对应描述
function gradeDesc(grade) {
  const map = {
    'S': '传说级 · 登峰造极',
    'A+': '卓越 · 近乎完美',
    'A': '优秀 · 实力强劲',
    'B': '良好 · 稳步前行',
    'C': '及格 · 仍需努力',
    'D': '不及格 · 继续加油',
    'F': '未通过 · 从头再来'
  };
  return map[grade] || '';
}

// 试卷对应颜色
function examColor(examId) {
  const map = {
    'v1': '#6EE7B7',
    'v2': '#FF6B35',
    'v3': '#E63B2E'
  };
  return map[examId] || '#3EC1D3';
}

// 格式化时间戳为相对时间
function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 30) return `${days}天前`;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

module.exports = {
  STATIC_BASE_URL,
  assetUrl,
  formatDuration,
  formatTime,
  gradeColor,
  gradeDesc,
  examColor
};
