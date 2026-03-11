import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. 检查二维码文件
const qrPath = path.join(__dirname, 'data', 'qrcode.png');
console.log('=== 二维码文件检查 ===');
console.log('路径:', qrPath);
console.log('存在:', fs.existsSync(qrPath));
if (fs.existsSync(qrPath)) {
  const stat = fs.statSync(qrPath);
  console.log('大小:', stat.size, 'bytes');
  const buf = fs.readFileSync(qrPath);
  const b64 = `data:image/png;base64,${buf.toString('base64')}`;
  console.log('base64 长度:', b64.length);
  console.log('base64 前100字符:', b64.substring(0, 100));
}

// 2. 检查 resvg 是否可用
console.log('\n=== resvg-js 检查 ===');
try {
  const { Resvg } = await import('@resvg/resvg-js');
  console.log('resvg-js 加载成功');

  // 3. 测试简单的 image 标签渲染
  if (fs.existsSync(qrPath)) {
    const buf = fs.readFileSync(qrPath);
    const b64 = `data:image/png;base64,${buf.toString('base64')}`;

    const testSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="200" height="200">
      <rect width="200" height="200" fill="#fff"/>
      <image xlink:href="${b64}" x="10" y="10" width="100" height="100"/>
      <text x="100" y="150" text-anchor="middle" font-size="14">Test</text>
    </svg>`;

    console.log('\n=== 测试 SVG 渲染 (xlink:href) ===');
    try {
      const resvg1 = new Resvg(testSvg, {
        fitTo: { mode: 'width', value: 200 },
        font: { loadSystemFonts: true },
      });
      const png1 = resvg1.render().asPng();
      fs.writeFileSync(path.join(__dirname, 'test-qr-output-xlink.png'), png1);
      console.log('xlink:href 渲染成功! 输出大小:', png1.length, 'bytes -> test-qr-output-xlink.png');
    } catch (e) {
      console.error('xlink:href 渲染失败:', e.message);
    }

    // 也测试纯 href
    const testSvg2 = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <rect width="200" height="200" fill="#fff"/>
      <image href="${b64}" x="10" y="10" width="100" height="100"/>
      <text x="100" y="150" text-anchor="middle" font-size="14">Test</text>
    </svg>`;

    console.log('\n=== 测试 SVG 渲染 (href) ===');
    try {
      const resvg2 = new Resvg(testSvg2, {
        fitTo: { mode: 'width', value: 200 },
        font: { loadSystemFonts: true },
      });
      const png2 = resvg2.render().asPng();
      fs.writeFileSync(path.join(__dirname, 'test-qr-output-href.png'), png2);
      console.log('href 渲染成功! 输出大小:', png2.length, 'bytes -> test-qr-output-href.png');
    } catch (e) {
      console.error('href 渲染失败:', e.message);
    }
  }
} catch (e) {
  console.error('resvg-js 不可用:', e.message);
  console.log('\n请先安装: npm install @resvg/resvg-js');
}
