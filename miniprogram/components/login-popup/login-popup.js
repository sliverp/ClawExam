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
    loading: false
  },

  methods: {
    onChooseAvatar(e) {
      this.setData({ avatarUrl: e.detail.avatarUrl });
    },

    onNicknameInput(e) {
      this.setData({ nickname: e.detail.value });
    },

    onClose() {
      this.setData({ avatarUrl: '', nickname: '', loading: false });
      this.triggerEvent('close');
    },

    async onConfirm() {
      if (!this.data.nickname.trim()) {
        wx.showToast({ title: '请输入昵称', icon: 'none' });
        return;
      }
      this.setData({ loading: true });

      try {
        const { code } = await wx.login();

        let avatarUrl = this.data.avatarUrl;
        // 如果用户选择了头像，先上传
        if (avatarUrl && avatarUrl.startsWith('wxfile://')) {
          try {
            const uploadRes = await api.uploadAvatar(avatarUrl);
            if (uploadRes.ok) {
              avatarUrl = uploadRes.url;
            }
          } catch (e) {
            console.warn('头像上传失败，使用空头像:', e);
            avatarUrl = '';
          }
        }

        const res = await api.wxLogin({
          code,
          nickname: this.data.nickname.trim(),
          avatar_url: avatarUrl
        });

        if (res.ok) {
          const app = getApp();
          app.login(res.app_token, {
            uid_hash: res.uid_hash,
            nickname: res.nickname,
            avatar_url: res.avatar_url
          });

          wx.showToast({ title: '登录成功', icon: 'success' });
          this.setData({ avatarUrl: '', nickname: '', loading: false });
          this.triggerEvent('success', {
            uid_hash: res.uid_hash,
            nickname: res.nickname,
            avatar_url: res.avatar_url
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
