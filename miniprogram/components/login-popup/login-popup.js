const api = require('../../utils/api');

Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    }
  },

  data: {
    avatarUrl: '',
    nickname: '',
    loading: false,
    privacyAgreed: false
  },

  methods: {
    onChooseAvatar(e) {
      this.setData({ avatarUrl: e.detail.avatarUrl });
    },

    onNicknameInput(e) {
      this.setData({ nickname: e.detail.value });
    },

    onClose() {
      this.setData({ avatarUrl: '', nickname: '', loading: false, privacyAgreed: false });
      this.triggerEvent('close');
    },

    onTogglePrivacy() {
      this.setData({ privacyAgreed: !this.data.privacyAgreed });
    },

    onViewPrivacy() {
      wx.navigateTo({ url: '/pages/privacy/privacy' });
    },

    async onConfirm() {
      if (!this.data.privacyAgreed) {
        wx.showToast({ title: '请先阅读并同意隐私政策', icon: 'none' });
        return;
      }
      if (!this.data.nickname.trim()) {
        wx.showToast({ title: '请输入昵称', icon: 'none' });
        return;
      }
      this.setData({ loading: true });

      try {
        const { code } = await wx.login();

        const res = await api.wxLogin({
          code,
          nickname: this.data.nickname.trim()
        });

        if (res.ok) {
          const app = getApp();
          const userInfo = {
            uid_hash: res.uid_hash,
            nickname: res.nickname,
            avatar_url: res.avatar_url
          };
          app.login(res.app_token, userInfo);

          if (this.data.avatarUrl && this.data.avatarUrl.startsWith('wxfile://')) {
            try {
              const uploadRes = await api.uploadAvatar(this.data.avatarUrl);
              if (uploadRes.ok) {
                const freshUserInfo = {
                  ...userInfo,
                  avatar_url: uploadRes.url
                };
                app.globalData.userInfo = freshUserInfo;
                wx.setStorageSync('user_info', freshUserInfo);
              }
            } catch (e) {
              console.warn('头像上传失败，继续使用默认头像:', e);
            }
          }

          wx.showToast({ title: '登录成功', icon: 'success' });
          this.setData({ avatarUrl: '', nickname: '', loading: false });
          this.triggerEvent('success', {
            uid_hash: res.uid_hash,
            nickname: res.nickname,
            avatar_url: app.globalData.userInfo?.avatar_url || res.avatar_url
          });
        } else {
          wx.showToast({ title: res.error || '登录失败', icon: 'none' });
          this.setData({ loading: false });
        }
      } catch (e) {
        console.error('登录失败:', e);
        wx.showToast({ title: '登录失败', icon: 'none' });
        this.setData({ loading: false });
      }
    }
  }
});
