const api = require('../../utils/api');
const util = require('../../utils/util');

const CATEGORY_LABELS = {
  basic: '基本常识',
  tool: '工具调用',
  complex: '复杂推理',
  computer: '实战操作',
  browser: 'Browser Use',
  search: '信息检索',
  reasoning: '复杂推理',
  research: '深度检索',
  practical: '实战操作'
};

const CATEGORY_ORDER = {
  practical: 10,
  computer: 10,
  complex: 20,
  reasoning: 20,
  research: 30,
  browser: 30,
  search: 40,
  basic: 50,
  tool: 60
};

Page({
  data: {
    token: '',
    cert: null,
    loading: true,
    error: '',
    certImageUrl: '',
    gradeColor: '',
    gradeDesc: '',
    examColor: '',
    categoryList: [],
    categoryGridClass: 'cert-category-list-3',
    savingImage: false,
    scorePercent0: '0',
    scorePercent1: '0.0',
    qrcodeImageUrl: util.assetUrl('cert/qrcode.jpg'),
    gradeAssetPath: '',
    badgeCards: [],
    heroNameClass: '',
    heroFootClass: '',
    heroOverlayClass: '',
    displayAvatarUrl: '',
    durationText: '-',
    startedAtText: ''
  },

  onLoad(options) {
    if (options.inviter) {
      const app = getApp();
      if (app.globalData.isLoggedIn) {
        api.addFriend(options.inviter).catch(() => {});
      } else {
        app.globalData.pendingInviter = options.inviter;
      }
    }

    const token = options.token || '';
    if (!token) {
      this.setData({ loading: false, error: '缺少准考证号' });
      return;
    }

    this.setData({ token });
    this.loadCert(token);
  },

  async loadCert(token) {
    try {
      const res = await api.getCertificate(token);
      if (!res.ok) {
        this.setData({ loading: false, error: res.error || '证书不存在' });
        return;
      }

      const totalScore = res.score ? res.score.total : (res.total_score || 0);
      const totalMaxScore = res.score ? res.score.max : (res.total_max_score || 1);
      const scorePercent = res.score && typeof res.score.percent === 'number'
        ? res.score.percent
        : (totalScore / (totalMaxScore || 1) * 100);

      const cert = {
        ...res,
        total_score: totalScore,
        total_max_score: totalMaxScore,
        total_questions: res.total_questions || 0
      };
      const app = getApp();
      const cachedUserInfo = wx.getStorageSync('user_info') || {};
      const displayAvatarUrl = cert.profile?.avatar_url
        || app?.globalData?.userInfo?.avatar_url
        || cachedUserInfo.avatar_url
        || '';

      this.setData({
        cert,
        loading: false,
        certImageUrl: api.getCertImageUrl(token),
        gradeColor: util.gradeColor(res.grade),
        gradeDesc: util.gradeDesc(res.grade),
        examColor: util.examColor(res.exam_id),
        durationText: this.formatDurationCompact(res.duration_seconds),
        categoryList: this.buildCategoryList(res.exam_id, res.category_scores),
        categoryGridClass: this.getCategoryGridClass(res.category_scores),
        scorePercent0: scorePercent.toFixed(0),
        scorePercent1: scorePercent.toFixed(1),
        gradeAssetPath: this.resolveGradeAssetPath(res.exam_id, res.grade),
        badgeCards: this.buildBadgeCards(cert),
        heroNameClass: this.getHeroNameClass(cert.profile?.claw_name),
        heroFootClass: this.getHeroFootClass(res.exam_id),
        heroOverlayClass: this.getHeroOverlayClass(res.exam_id),
        displayAvatarUrl,
        startedAtText: this.formatDateTime(res.started_at)
      });
    } catch (e) {
      this.setData({ loading: false, error: '加载失败，请检查网络' });
    }
  },

  buildCategoryList(examId, categoryScores = {}) {
    const examOrder = this.getExamCategoryOrder(examId);
    return Object.entries(categoryScores)
      .map(([key, val]) => ({
        key,
        name: CATEGORY_LABELS[key] || key,
        score: val.score,
        max: val.max,
        percent: val.max > 0 ? (val.score / val.max * 100).toFixed(1) : '0.0',
        order: examOrder[key] || CATEGORY_ORDER[key] || 999
      }))
      .sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return a.name.localeCompare(b.name, 'zh-Hans-CN');
      });
  },

  getExamCategoryOrder(examId) {
    const examKey = String(examId || '').toLowerCase();
    const map = {
      v1: { basic: 10, complex: 20, tool: 30 },
      v2: { computer: 10, browser: 20, search: 30, complex: 40 },
      v3: { practical: 10, reasoning: 20, research: 30 }
    };
    return map[examKey] || {};
  },

  getCategoryGridClass(categoryScores = {}) {
    const count = Object.keys(categoryScores || {}).length;
    if (count === 4) return 'cert-category-list-2';
    return 'cert-category-list-3';
  },

  getHeroNameClass(name) {
    const len = String(name || '').trim().length;
    if (len >= 12) return 'cert-hero-claw-name-compact';
    if (len >= 8) return 'cert-hero-claw-name-medium';
    return '';
  },

  getHeroFootClass(examId) {
    const examKey = String(examId || '').toLowerCase();
    if (examKey === 'v2') return 'cert-hero-foot-lower';
    return '';
  },

  getHeroOverlayClass(examId) {
    const examKey = String(examId || '').toLowerCase();
    if (examKey === 'v2') return 'cert-hero-overlay-lower';
    return '';
  },

  normalizeGradeAsset(grade) {
    const raw = String(grade || '').toUpperCase();
    if (raw === 'A+') return 'A';
    if (['S', 'A', 'B', 'C', 'D', 'E', 'F'].includes(raw)) return raw;
    return 'F';
  },

  resolveGradeAssetPath(examId, grade) {
    const examKey = ['v1', 'v2', 'v3'].includes(String(examId || '').toLowerCase())
      ? String(examId).toLowerCase()
      : 'v1';
    const gradeKey = this.normalizeGradeAsset(grade);
    return util.assetUrl(`cert/grades/${examKey}/等级${gradeKey}.png`);
  },

  resolveLegacyGradeAsset(grade) {
    const map = {
      S: 'a',
      A: 'b',
      B: 'c',
      C: 'd',
      D: 'e',
      E: 'e',
      F: 'f'
    };
    return map[this.normalizeGradeAsset(grade)] || 'f';
  },

  buildBadgeCards(cert) {
    const badges = Array.isArray(cert.badges) ? cert.badges : [];
    return badges.map((badge) => {
      const presentation = this.getBadgePresentation(badge.id);
      return {
        id: badge.id,
        name: badge.name,
        description: badge.description,
        asset: this.getBadgeAssetPath(badge.id, badge.icon),
        emoji: presentation.emoji,
        tone: presentation.tone
      };
    });
  },

  getBadgeAssetPath(badgeId, remoteIcon) {
    const localMap = {
      graduate: util.assetUrl('cert/badges/badge-graduate.png'),
      honor: util.assetUrl('cert/badges/badge-honor.png'),
      perfect: util.assetUrl('cert/badges/badge-perfect.png'),
      logic_master: util.assetUrl('cert/badges/badge-logic-master.png'),
      research_king: util.assetUrl('cert/badges/badge-research-king.png'),
      practical_ace: util.assetUrl('cert/badges/badge-practical-ace.png'),
      speed_demon: util.assetUrl('cert/badges/badge-speed-demon.png')
    };
    return localMap[badgeId] || remoteIcon || '';
  },

  getBadgePresentation(badgeId) {
    const map = {
      graduate: { emoji: '📜', tone: 'gold' },
      honor: { emoji: '🏆', tone: 'gold' },
      perfect: { emoji: '⭐', tone: 'gold' },
      logic_master: { emoji: '🧠', tone: 'blue' },
      research_king: { emoji: '🔎', tone: 'amber' },
      practical_ace: { emoji: '🛠️', tone: 'orange' },
      speed_demon: { emoji: '⚡', tone: 'violet' }
    };
    return map[badgeId] || { emoji: '🏅', tone: 'gold' };
  },

  formatDurationCompact(seconds) {
    if (!seconds && seconds !== 0) return '-';
    const total = Math.max(0, Number(seconds) || 0);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}h${m}m${s}s`;
    return `${m}m${s}s`;
  },

  formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const normalized = typeof dateStr === 'string' ? dateStr.replace(' ', 'T') : dateStr;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return String(dateStr);

    const pad = (num) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  },

  onStageImageError() {
    const cert = this.data.cert;
    if (!cert) return;
    const fallbackPath = util.assetUrl(`cert/grades/grade-${this.resolveLegacyGradeAsset(cert.grade)}.png`);
    if (this.data.gradeAssetPath !== fallbackPath) {
      this.setData({ gradeAssetPath: fallbackPath });
    }
  },

  onSaveImage() {
    if (this.data.savingImage) return;
    this.setData({ savingImage: true });

    const certImageUrl = this.data.certImageUrl;
    wx.downloadFile({
      url: certImageUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              wx.showToast({ title: '已保存到相册', icon: 'success' });
            },
            fail: (err) => {
              if (err.errMsg.indexOf('auth deny') !== -1 || err.errMsg.indexOf('authorize') !== -1) {
                wx.showModal({
                  title: '需要授权',
                  content: '请在设置中允许保存图片到相册',
                  confirmText: '去设置',
                  success: (modalRes) => {
                    if (modalRes.confirm) {
                      wx.openSetting();
                    }
                  }
                });
              } else {
                wx.showToast({ title: '保存失败', icon: 'none' });
              }
            }
          });
        } else {
          console.error('证书图片下载返回异常:', res.statusCode, certImageUrl);
          wx.showToast({ title: '保存失败，请稍后重试', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('证书图片下载失败:', err);
        wx.showToast({ title: '保存失败，请稍后重试', icon: 'none' });
      },
      complete: () => {
        this.setData({ savingImage: false });
      }
    });
  },

  onGoHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  onShareAppMessage() {
    const cert = this.data.cert;
    const name = cert?.profile?.claw_name || '我的虾';
    const grade = cert?.grade || '';
    const score = cert?.total_score || 0;
    const maxScore = cert?.total_max_score || 100;
    const percent = maxScore > 0 ? Math.round(score / maxScore * 100) : 0;
    const app = getApp();
    const uid = app.globalData.userInfo?.uid_hash || '';
    const inviterParam = uid ? `&inviter=${uid}` : '';
    return {
      title: `🦞 我养的虾「${name}」考了${percent}分（${grade}级），你的虾敢来挑战吗？`,
      path: `/pages/cert/cert?token=${this.data.token}${inviterParam}`
    };
  }
});
