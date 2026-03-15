// 开放数据域 - 独立的 JavaScript 作用域
// 只能在这里调用 wx.getFriendCloudStorage / wx.getUserCloudStorage
// 不能访问主域的变量，只能通过 postMessage 通信

const sharedCanvas = wx.getSharedCanvas();
const ctx = sharedCanvas.getContext('2d');

let friends = [];
let canvasW = 300;
let canvasH = 400;
let scrollY = 0;

// 颜色（与主域保持一致）
const COLORS = {
  bg: '#FFFBEB', fg: '#1a1a1a', white: '#FFFFFF',
  red: '#E63B2E', yellow: '#FFD93D', blue: '#3EC1D3',
  green: '#6EE7B7', gray: '#888888', lightGray: '#eeeeee',
  border: '#1a1a1a', gold: '#FFD93D', silver: '#C0C0C0', bronze: '#CD7F32'
};

// 监听主域消息
wx.onMessage((data) => {
  switch (data.type) {
    case 'getFriends':
      loadFriendsData(data.examId);
      break;
    case 'resize':
      canvasW = data.width || canvasW;
      canvasH = data.height || canvasH;
      sharedCanvas.width = canvasW;
      sharedCanvas.height = canvasH;
      renderFriends();
      break;
    case 'hide':
      clear();
      break;
  }
});

function loadFriendsData(examId) {
  wx.getFriendCloudStorage({
    keyList: ['score'],
    success: (res) => {
      friends = (res.data || [])
        .map(friend => {
          let scoreData = {};
          if (friend.KVDataList) {
            const kv = friend.KVDataList.find(k => k.key === 'score');
            if (kv && kv.value) {
              try { scoreData = JSON.parse(kv.value); } catch (e) { /* ignore */ }
            }
          }
          return {
            nickname: friend.nickname || '匿名',
            avatarUrl: friend.avatarUrl || '',
            score: scoreData.score || '0',
            grade: scoreData.grade || '',
            exam: scoreData.exam || '',
            claw: scoreData.claw || '',
            model: scoreData.model || '',
            _avatarImg: null
          };
        })
        .sort((a, b) => Number(b.score) - Number(a.score));

      // 预加载头像
      friends.forEach((f, idx) => {
        if (f.avatarUrl) {
          const img = wx.createImage();
          img.onload = () => {
            friends[idx]._avatarImg = img;
            renderFriends();
          };
          img.src = f.avatarUrl;
        }
      });

      renderFriends();
    },
    fail: (err) => {
      console.error('getFriendCloudStorage failed:', err);
      friends = [];
      renderEmpty('获取好友数据失败');
    }
  });
}

function clear() {
  ctx.clearRect(0, 0, canvasW, canvasH);
}

function renderEmpty(msg) {
  clear();
  const dpr = canvasW / 300; // 估算 DPR
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.fillStyle = COLORS.gray;
  ctx.font = `${14 * dpr}px -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(msg || '暂无好友数据', canvasW / 2, canvasH / 2);
  ctx.textAlign = 'left';
}

function renderFriends() {
  const dpr = canvasW / 300; // 估算 DPR
  clear();
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, canvasW, canvasH);

  if (!friends.length) {
    renderEmpty('暂无好友排行数据\n分享给朋友一起考虾吧！');
    return;
  }

  const pad = 10 * dpr;
  const itemH = 60 * dpr;
  let y = pad;

  for (let i = 0; i < friends.length; i++) {
    const f = friends[i];
    const x = pad;
    const w = canvasW - pad * 2;
    const h = itemH;

    if (y + h > canvasH) break; // 超出可视区域

    // 卡片背景
    ctx.fillStyle = COLORS.border;
    ctx.fillRect(x + 2 * dpr, y + 2 * dpr, w, h);
    ctx.fillStyle = COLORS.white;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1.5 * dpr;
    ctx.strokeRect(x, y, w, h);

    // 排名
    const rank = i + 1;
    const rankW = 24 * dpr;
    const rankBg = rank === 1 ? COLORS.gold : rank === 2 ? COLORS.silver : rank === 3 ? COLORS.bronze : COLORS.lightGray;
    ctx.fillStyle = rankBg;
    ctx.fillRect(x + 2 * dpr, y + 2 * dpr, rankW, h - 4 * dpr);
    ctx.fillStyle = COLORS.fg;
    ctx.font = `bold ${12 * dpr}px -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${rank}`, x + 2 * dpr + rankW / 2, y + h / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // 头像
    const avatarSize = 36 * dpr;
    const avatarX = x + rankW + 8 * dpr;
    const avatarY = y + (h - avatarSize) / 2;
    if (f._avatarImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(f._avatarImg, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();
    } else {
      ctx.fillStyle = COLORS.yellow;
      ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
      ctx.font = `${20 * dpr}px -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🦞', avatarX + avatarSize / 2, avatarY + avatarSize / 2);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
    }

    // 信息
    const infoX = avatarX + avatarSize + 8 * dpr;
    const maxInfoW = w - (infoX - x) - 8 * dpr;

    // 昵称
    ctx.fillStyle = COLORS.fg;
    ctx.font = `bold ${12 * dpr}px -apple-system, 'PingFang SC', sans-serif`;
    ctx.fillText(f.nickname, infoX, y + 6 * dpr, maxInfoW);

    // 分数 + 等级
    const scoreText = `${f.score}%${f.grade ? ' · ' + f.grade : ''}`;
    ctx.fillStyle = COLORS.blue;
    ctx.font = `bold ${11 * dpr}px -apple-system, sans-serif`;
    ctx.fillText(scoreText, infoX, y + 22 * dpr);

    // 进度条
    const barY = y + 37 * dpr;
    const barW = maxInfoW;
    const barH = 7 * dpr;
    ctx.fillStyle = COLORS.lightGray;
    ctx.fillRect(infoX, barY, barW, barH);
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(infoX, barY, barW, barH);
    const pct = Math.min(100, Math.max(0, Number(f.score) || 0));
    const fillColor = pct >= 90 ? COLORS.green : pct >= 60 ? COLORS.yellow : '#FF6B6B';
    if (pct > 0) {
      ctx.fillStyle = fillColor;
      ctx.fillRect(infoX, barY, barW * pct / 100, barH);
    }

    // 虾名 + 模型
    if (f.claw || f.model) {
      ctx.fillStyle = COLORS.gray;
      ctx.font = `${9 * dpr}px -apple-system, sans-serif`;
      ctx.fillText(`${f.claw}${f.model ? ' · ' + f.model : ''}`, infoX, y + 47 * dpr, maxInfoW);
    }

    y += h + 6 * dpr;
  }
}
