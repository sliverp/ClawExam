import { COLORS, W, H } from './renderer.js';

const TABS = [
  { icon: '🏠', text: '首页' },
  { icon: '📊', text: '统计' },
  { icon: '🏆', text: '好友榜' },
  { icon: '🏟️', text: '竞技场' },
  { icon: '👤', text: '我的' }
];

const TAB_H = 50;

export function drawTabBar(renderer, selected, onSwitch) {
  const ctx = renderer.ctx;
  const y = H - TAB_H;
  const tabW = W / TABS.length;

  // 背景
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, y, W, TAB_H);
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(W, y);
  ctx.stroke();

  TABS.forEach((tab, i) => {
    const x = i * tabW;
    const isActive = i === selected;

    // 图标
    ctx.font = '20px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(tab.icon, x + tabW / 2, y + 14);

    // 文字
    ctx.font = `bold 10px -apple-system, sans-serif`;
    ctx.fillStyle = isActive ? COLORS.red : COLORS.gray;
    ctx.fillText(tab.text, x + tabW / 2, y + 36);
    ctx.textAlign = 'left';

    // 选中指示器
    if (isActive) {
      ctx.fillStyle = COLORS.red;
      ctx.fillRect(x + tabW / 2 - 12, y + 44, 24, 3);
    }

    // 触摸区域
    renderer.addTouch(x, y, tabW, TAB_H, () => onSwitch(i), false);
  });
}

export { TAB_H, TABS };
