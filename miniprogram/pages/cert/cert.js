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
    savingImage: false
  },

  onLoad(options) {
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

      this.setData({
        cert: res,
        loading: false,
        certImageUrl: api.getCertImageUrl(token),
        gradeColor: util.gradeColor(res.grade),
        gradeDesc: util.gradeDesc(res.grade),
        examColor: util.examColor(res.exam_id),
        durationText: util.formatDuration(res.duration_seconds),
        categoryList
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
    return {
      title: `🦞 ${this.data.cert?.profile?.claw_name || 'ClawExam'} 的考试证书 — ${this.data.cert?.grade || ''}级`,
      path: `/pages/cert/cert?token=${this.data.token}`
    };
  }
});
