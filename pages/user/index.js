// pages/user/index.js
Page({
  data: {
    avatarUrl: 'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/user/head.png', // 默认头像
    nickname: '', // 默认昵称
    totalScore: 0,
    userTitle: '环保新手',
    recognizeCount: 0, 
    challengeCount: 0  
  },

  onShow: function () {
    // 1. 尝试从本地恢复头像和昵称
    const savedAvatar = wx.getStorageSync('avatarUrl');
    const savedNickname = wx.getStorageSync('nickname');
    if (savedAvatar) this.setData({ avatarUrl: savedAvatar });
    if (savedNickname) this.setData({ nickname: savedNickname });

    // 2. 🚀 检查是否有账户，没有则触发“静默登录”
    const userId = wx.getStorageSync('userId');
    if (!userId) {
      this.doSilentLogin();
    } else {
      this.fetchUserData(userId);
    }
  },

  // ==========================================
  // 🚀 核心能力：微信静默登录与注册
  // ==========================================
  doSilentLogin: function() {
    wx.showLoading({ title: '登录中...', mask: true });
    
    // 调起微信原生登录，获取临时 code
    wx.login({
      success: (res) => {
        if (res.code) {
          // 发送 code 到你的 FastAPI 后端换取 openid
          wx.request({
            url: 'http://192.168.0.126:8000/api/user/login', // ⚠️记得换IP
            method: 'POST',
            data: { code: res.code },
            success: (backendRes) => {
              wx.hideLoading();
              if (backendRes.statusCode === 200 && backendRes.data.id) {
                const newUserId = backendRes.data.id;
                // 登录成功，把专属的 userId 存在本地
                wx.setStorageSync('userId', newUserId);
                wx.showToast({ title: '登录成功', icon: 'success' });
                // 拉取这个新用户的积分数据（0分）
                this.fetchUserData(newUserId);
              } else {
                wx.showToast({ title: '登录失败', icon: 'error' });
              }
            },
            fail: () => {
              wx.hideLoading();
              wx.showToast({ title: '服务器连接失败', icon: 'error' });
            }
          })
        }
      }
    });
  },

  // ==========================================
  // 🚀 核心能力：获取微信头像和昵称
  // ==========================================
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    // 存入页面数据渲染
    this.setData({ avatarUrl });
    // 永久保存在手机缓存中
    wx.setStorageSync('avatarUrl', avatarUrl);
    
    // 💡 进阶：在真实毕设中，如果你想把头像永久存在后端，
    // 可以用 wx.uploadFile 把这个本地临时路径 avatarUrl 传给后端。
    // 目前存本地缓存对演示来说已经足够完美。
  },

  onNicknameBlur(e) {
    const { value } = e.detail;
    this.setData({ nickname: value });
    wx.setStorageSync('nickname', value);
  },

  // ==========================================
  // 原有的业务逻辑保持不变
  // ==========================================
  fetchUserData: function(userId) {
    wx.request({
      url: `http://192.168.0.126:8000/api/user/info?user_id=${userId}`, // ⚠️记得换IP
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200) {
          const info = res.data.data;
          this.setData({
            totalScore: info.total_score,
            userTitle: info.title,
            recognizeCount: info.recognize_count,
            challengeCount: info.challenge_count
          });
          wx.setStorageSync('totalScore', info.total_score);
          wx.setStorageSync('currentTitle', info.title);
        }
      }
    });
  },

  goToHistory: function(e) {
    const type = e.currentTarget.dataset.type; 
    if (type === 'recognize') {
      wx.navigateTo({ url: '/pages/user/recognizeHistory' });
    } else if (type === 'challenge') {
      wx.navigateTo({ url: '/pages/user/challengeHistory' });
    }
  },

  goToWrongBook: function() {
    wx.navigateTo({ url: '/pages/user/wrongBook' });
  },

  goToFeedbackHistory: function() {
    wx.navigateTo({ url: '/pages/user/feedbackHistory' });
  },

  showAbout: function() {
    wx.showModal({
      title: '关于我们',
      content: '基于移动端的智能垃圾分类系统 v1.0\n开发者：wjl',
      showCancel: false
    });
  },

  clearCache: function() {
    wx.showModal({
      title: '清除本地缓存',
      content: '确定要清除缓存吗？\n(您的积分和历史记录已安全保存在云端)',
      success: (res) => {
        if (res.confirm) {
          const userId = wx.getStorageSync('userId');
          const avatarUrl = wx.getStorageSync('avatarUrl');
          const nickname = wx.getStorageSync('nickname');
          
          wx.clearStorageSync(); 
          
          if (userId) wx.setStorageSync('userId', userId);
          if (avatarUrl) wx.setStorageSync('avatarUrl', avatarUrl);
          if (nickname) wx.setStorageSync('nickname', nickname);

          this.onShow(); 
          wx.showToast({ title: '清理完毕', icon: 'success' });
        }
      }
    });
  },

  logout: function() {
    wx.showModal({
      title: '清除账号信息',
      content: '相当于退出登录，下次进入将自动重新分配新账号。',
      confirmColor: '#F44336',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync(); 
          this.setData({
            avatarUrl: 'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/user/head.png',
            nickname: '',
            totalScore: 0,
            userTitle: '环保新手',
            recognizeCount: 0,
            challengeCount: 0
          });
          this.doSilentLogin(); // 退出后立即重新分配新身份
        }
      }
    });
  }
})