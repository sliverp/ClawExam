const api = require('../../utils/api');
const util = require('../../utils/util');

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
    savingImage: false,
    scorePercent0: '0',
    scorePercent1: '0.0'
  },

  onLoad(options) {
    // 处理邀请者
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

      // 构建维度得分列表
      const categoryList = [];
      if (res.category_scores) {
        for (const [key, val] of Object.entries(res.category_scores)) {
          categoryList.push({
            name: key,
            score: val.score,
            max: val.max,
            percent: val.max > 0 ? (val.score / val.max * 100).toFixed(1) : 0
          });
        }
      }

      // 后端返回 score: { total, max, percent }，映射为前端需要的字段
      const totalScore = res.score ? res.score.total : (res.total_score || 0);
      const totalMaxScore = res.score ? res.score.max : (res.total_max_score || 1);
      const scorePercent0 = (totalScore / (totalMaxScore || 1) * 100).toFixed(0);
      const scorePercent1 = (totalScore / (totalMaxScore || 1) * 100).toFixed(1);

      // 统一 cert 对象字段，便于 wxml 中直接引用
      const cert = {
        ...res,
        total_score: totalScore,
        total_max_score: totalMaxScore,
        total_questions: res.total_questions || categoryList.length || 0
      };

      this.setData({
        cert,
        loading: false,
        certImageUrl: api.getCertImageUrl(token),
        gradeColor: util.gradeColor(res.grade),
        gradeDesc: util.gradeDesc(res.grade),
        examColor: util.examColor(res.exam_id),
        durationText: util.formatDuration(res.duration_seconds),
        categoryList,
        scorePercent0,
        scorePercent1
      });
    } catch (e) {
      this.setData({ loading: false, error: '加载失败，请检查网络' });
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
        }
      },
      fail: () => {
        wx.showToast({ title: '下载失败', icon: 'none' });
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
