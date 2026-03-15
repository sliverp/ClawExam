// 轻量 Canvas UI 渲染引擎
// 支持：文本、矩形、圆角矩形、图片、滚动、触摸事件

const { screenWidth, screenHeight, pixelRatio } = GameGlobal;
const W = screenWidth;
const H = screenHeight;
const DPR = pixelRatio;

// 颜色常量（Neobrutalism 风格）
export const COLORS = {
  bg: '#FFFBEB', fg: '#1a1a1a', white: '#FFFFFF',
  red: '#E63B2E', orange: '#FF6B35', yellow: '#FFD93D',
  blue: '#3EC1D3', purple: '#A855F7', pink: '#FF6B6B',
  green: '#6EE7B7', gray: '#888888', lightGray: '#eeeeee',
  border: '#1a1a1a'
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = W;
    this.H = H;
    this.DPR = DPR;
    // 触摸目标列表
    this.touchTargets = [];
    // 滚动偏移
    this.scrollY = 0;
    this.maxScrollY = 0;
    this.contentHeight = 0;
    // Tab bar height
    this.tabBarHeight = 50;
    this.scrollableTop = 0;
    this.scrollableBottom = H - this.tabBarHeight;
    // 触摸状态
    this._touchStartY = 0;
    this._touchStartTime = 0;
    this._velocity = 0;
    this._animId = null;
    this._isTouching = false;

    this._bindTouch();
  }

  _bindTouch() {
    wx.onTouchStart((e) => {
      this._isTouching = true;
      const t = e.touches[0];
      this._touchStartY = t.clientY;
      this._touchStartX = t.clientX;
      this._touchStartTime = Date.now();
      this._lastTouchY = t.clientY;
      this._velocity = 0;
      if (this._animId) {
        cancelAnimationFrame(this._animId);
        this._animId = null;
      }
    });

    wx.onTouchMove((e) => {
      const t = e.touches[0];
      const dy = t.clientY - this._lastTouchY;
      this._lastTouchY = t.clientY;
      this.scrollY = Math.max(0, Math.min(this.maxScrollY, this.scrollY - dy));
      this._velocity = -dy;
      this._needRender = true;
    });

    wx.onTouchEnd((e) => {
      this._isTouching = false;
      const t = e.changedTouches[0];
      const dx = Math.abs(t.clientX - this._touchStartX);
      const dy = Math.abs(t.clientY - this._touchStartY);
      const dt = Date.now() - this._touchStartTime;

      // 判断是点击还是滑动
      if (dx < 10 && dy < 10 && dt < 300) {
        this._handleTap(t.clientX, t.clientY);
      } else {
        // 惯性滚动
        this._startInertia();
      }
    });
  }

  _startInertia() {
    const decel = 0.95;
    const tick = () => {
      if (this._isTouching || Math.abs(this._velocity) < 0.5) return;
      this._velocity *= decel;
      this.scrollY = Math.max(0, Math.min(this.maxScrollY, this.scrollY + this._velocity));
      this._needRender = true;
      this._animId = requestAnimationFrame(tick);
    };
    this._animId = requestAnimationFrame(tick);
  }

  _handleTap(x, y) {
    // y 需要加上滚动偏移（对于滚动区域内的元素）
    for (let i = this.touchTargets.length - 1; i >= 0; i--) {
      const t = this.touchTargets[i];
      const ty = t.scrollable ? y + this.scrollY : y;
      if (x >= t.x && x <= t.x + t.w && ty >= t.y && ty <= t.y + t.h) {
        if (t.handler) t.handler();
        return;
      }
    }
  }

  clear() {
    const ctx = this.ctx;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);
    this.touchTargets = [];
    this._cursorY = 0;
  }

  // 注册可点击区域
  addTouch(x, y, w, h, handler, scrollable = true) {
    this.touchTargets.push({ x, y, w, h, handler, scrollable });
  }

  // 绘制 Neobrutalism 风格卡片
  drawCard(x, y, w, h, opts = {}) {
    const ctx = this.ctx;
    const { fill = COLORS.white, shadow = true, borderWidth = 2 } = opts;
    if (shadow) {
      ctx.fillStyle = COLORS.border;
      ctx.fillRect(x + 3, y + 3, w, h);
    }
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(x, y, w, h);
  }

  // 绘制按钮
  drawButton(x, y, w, h, text, opts = {}) {
    const { bg = COLORS.yellow, color = COLORS.fg, fontSize = 14, handler } = opts;
    this.drawCard(x, y, w, h, { fill: bg });
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.font = `bold ${fontSize}px -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2);
    ctx.textAlign = 'left';
    if (handler) {
      this.addTouch(x, y, w, h, handler, opts.scrollable !== false);
    }
  }

  // 绘制文本
  drawText(x, y, text, opts = {}) {
    const ctx = this.ctx;
    const { fontSize = 14, color = COLORS.fg, bold = false, align = 'left', maxWidth } = opts;
    ctx.fillStyle = color;
    ctx.font = `${bold ? 'bold ' : ''}${fontSize}px -apple-system, 'PingFang SC', sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    if (maxWidth) {
      ctx.fillText(text, x, y, maxWidth);
    } else {
      ctx.fillText(text, x, y);
    }
    ctx.textAlign = 'left';
  }

  // 绘制换行文本，返回总高度
  drawWrappedText(x, y, text, maxWidth, opts = {}) {
    const ctx = this.ctx;
    const { fontSize = 13, color = COLORS.fg, lineHeight = 1.5 } = opts;
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px -apple-system, 'PingFang SC', sans-serif`;
    const lh = fontSize * lineHeight;
    const words = text.split('');
    let line = '';
    let curY = y;
    for (const ch of words) {
      const testLine = line + ch;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        ctx.fillText(line, x, curY);
        line = ch;
        curY += lh;
      } else {
        line = testLine;
      }
    }
    if (line) {
      ctx.fillText(line, x, curY);
      curY += lh;
    }
    return curY - y;
  }

  // 绘制进度条
  drawProgressBar(x, y, w, h, percent, fillColor = COLORS.green) {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.lightGray;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
    const fillW = Math.max(0, Math.min(1, percent / 100)) * w;
    if (fillW > 0) {
      ctx.fillStyle = fillColor;
      ctx.fillRect(x, y, fillW, h);
    }
  }

  // 绘制标签
  drawTag(x, y, text, opts = {}) {
    const ctx = this.ctx;
    const { bg = COLORS.blue, color = COLORS.fg, fontSize = 10 } = opts;
    ctx.font = `bold ${fontSize}px -apple-system, sans-serif`;
    const tw = ctx.measureText(text).width + 10;
    const th = fontSize + 6;
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, tw, th);
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, tw, th);
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + 5, y + th / 2);
    ctx.textBaseline = 'top';
    return tw;
  }

  // 绘制圆形图片（头像）
  drawCircleImage(img, x, y, radius) {
    if (!img || !img.width) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, x, y, radius * 2, radius * 2);
    ctx.restore();
  }

  // 开始滚动区域裁剪
  beginScrollArea(top, bottom) {
    this.scrollableTop = top;
    this.scrollableBottom = bottom;
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, top, W, bottom - top);
    ctx.clip();
    ctx.translate(0, -this.scrollY + top);
  }

  endScrollArea() {
    this.ctx.restore();
  }

  updateScroll(contentHeight) {
    this.contentHeight = contentHeight;
    const viewH = this.scrollableBottom - this.scrollableTop;
    this.maxScrollY = Math.max(0, contentHeight - viewH);
    if (this.scrollY > this.maxScrollY) this.scrollY = this.maxScrollY;
  }
}

export { W, H, DPR };
