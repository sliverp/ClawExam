// 微信小游戏 BOM/DOM 适配器
const { screenWidth, screenHeight, pixelRatio } = wx.getSystemInfoSync();

// 主 Canvas
const canvas = wx.createCanvas();
canvas.width = screenWidth * pixelRatio;
canvas.height = screenHeight * pixelRatio;

// 全局模拟
if (!GameGlobal.window) {
  GameGlobal.window = GameGlobal;
}
GameGlobal.canvas = canvas;
GameGlobal.screenWidth = screenWidth;
GameGlobal.screenHeight = screenHeight;
GameGlobal.pixelRatio = pixelRatio;

// requestAnimationFrame
if (!GameGlobal.requestAnimationFrame) {
  GameGlobal.requestAnimationFrame = canvas.requestAnimationFrame
    ? canvas.requestAnimationFrame.bind(canvas)
    : (cb) => setTimeout(cb, 16);
}

if (!GameGlobal.cancelAnimationFrame) {
  GameGlobal.cancelAnimationFrame = canvas.cancelAnimationFrame
    ? canvas.cancelAnimationFrame.bind(canvas)
    : clearTimeout;
}

// Image polyfill
if (!GameGlobal.Image) {
  GameGlobal.Image = function() {
    return wx.createImage();
  };
}

export { canvas, screenWidth, screenHeight, pixelRatio };
