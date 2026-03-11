// pages/user/index.js
Page({
  data: {
    isLoggedIn: false,
    avatarUrl: 'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/user/head.png',
    nickname: '',
    totalScore: 0,
    userTitle: '未登录',
    recognizeCount: 0, 
    challengeCount: 0  
  },

  onShow: function () {
    const isLoggedIn = wx.getStorageSync('isLoggedIn') || false;
    this.setData({ isLoggedIn });

    if (isLoggedIn) {
      const userId = wx.getStorageSync('userId');
      if (!userId) {
        // 兜底防错
        this.doSilentLogin(true);
      } else {
        // 1. 核心修复：读取该账号专属的缓存头像和昵称！
        const savedAvatar = wx.getStorageSync(`avatar_${userId}`);
        const savedNickname = wx.getStorageSync(`nickname_${userId}`);
        
        // 只要有专属缓存就显示，没有才显示默认
        this.setData({ 
          avatarUrl: savedAvatar ? savedAvatar : 'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/user/head.png',
          nickname: savedNickname ? savedNickname : ''
        });

        // 2. 拉取云端积分数据
        this.fetchUserData(userId);
      }
    }
  },

  // 获取微信头像和昵称 (深度绑定账号)
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this.setData({ avatarUrl });
    
    // 将头像与当前账号(userId)深度绑定，存入专属缓存
    const userId = wx.getStorageSync('userId');
    if (userId) {
      wx.setStorageSync(`avatar_${userId}`, avatarUrl);
    }
  },

  onNicknameBlur(e) {
    const { value } = e.detail;
    this.setData({ nickname: value });
    
    // 将昵称与当前账号(userId)深度绑定，存入专属缓存
    const userId = wx.getStorageSync('userId');
    if (userId) {
      wx.setStorageSync(`nickname_${userId}`, value);
    }
  },

  fetchUserData: function(userId) {
    wx.request({
      url: `http://192.168.0.126:8000/api/user/info?user_id=${userId}`, 
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

  // 操作前检查是否登录
  checkLoginStatus: function() {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return false;
    }
    return true;
  },

  // 各类跳转逻辑保持不变
  goToHistory: function(e) {
    if (!this.checkLoginStatus()) return;
    const type = e.currentTarget.dataset.type; 
    if (type === 'recognize') {
      wx.navigateTo({ url: '/pages/user/recognizeHistory' });
    } else if (type === 'challenge') {
      wx.navigateTo({ url: '/pages/user/challengeHistory' });
    }
  },

  goToWrongBook: function() {
    if (!this.checkLoginStatus()) return;
    wx.navigateTo({ url: '/pages/user/wrongBook' });
  },

  goToFeedbackHistory: function() {
    if (!this.checkLoginStatus()) return;
    wx.navigateTo({ url: '/pages/user/feedbackHistory' });
  },

  showAbout: function() {
    wx.showModal({
      title: '关于我们',
      content: '基于移动端的智能垃圾分类系统 v1.2\n开发者：wjl',
      showCancel: false
    });
  },

  clearCache: function() {
    wx.showModal({
      title: '清除本地缓存',
      // 明确列出清除项和保留项，打消用户顾虑
      content: '点击确定后，以下数据将被清空：\n1. 您自定义设置的头像和昵称\n2. AI识别产生的临时图片缓存\n\n请放心，您的云端账号数据（总积分、历史记录等）和登录状态将安全保留。',
      confirmText: '确认清理',
      confirmColor: '#4CAF50', // 用绿色表示安全操作
      success: (res) => {
        if (res.confirm) {
          // 1. 先把绝不离手的“底牌”存起来
          const userId = wx.getStorageSync('userId');
          const isLoggedIn = wx.getStorageSync('isLoggedIn'); 
          
          // 2. 无差别清理本地空间（此时头像、昵称、临时结果全清空了）
          wx.clearStorageSync(); 
          
          // 3. 瞬间把“底牌”恢复回去，保持不掉线
          if (userId) wx.setStorageSync('userId', userId);
          if (isLoggedIn) wx.setStorageSync('isLoggedIn', isLoggedIn);

          // 4. 刷新当前页面，头像和昵称会瞬间变回未设置的默认状态
          this.onShow(); 
          wx.showToast({ title: '清理完毕', icon: 'success' });
        }
      }
    });
  },

  // 退出登录：改写保护逻辑
  logout: function() {
    wx.showModal({
      title: '退出登录',
      content: '退出后将返回登录界面，确定退出吗？',
      confirmColor: '#F44336',
      success: (res) => {
        if (res.confirm) {
          // 只移除通行证状态，坚决不清理 avatar_xxx 缓存
          wx.removeStorageSync('isLoggedIn');
          wx.removeStorageSync('userId'); 
          
          wx.showToast({ title: '已退出', icon: 'success' });
          
          // 回到登录黑屋
          setTimeout(() => {
            wx.reLaunch({
              url: '/pages/login/login'
            });
          }, 800);
        }
      }
    });
  }
})