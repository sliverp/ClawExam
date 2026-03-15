import { COLORS, W, H } from './renderer.js';

let _toast = null;

export function showToast(text, duration = 2000) {
  _toast = { text, endTime: Date.now() + duration };
}

export function drawToast(ctx) {
  if (!_toast) return;
  if (Date.now() > _toast.endTime) { _toast = null; return; }
  const text = _toast.text;
  ctx.font = 'bold 14px -apple-system, sans-serif';
  const tw = ctx.measureText(text).width + 30;
  const th = 36;
  const x = (W - tw) / 2;
  const y = H / 2 - th / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(x, y, tw, th);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, W / 2, H / 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
}
