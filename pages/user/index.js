// pages/user/index.js
Page({
  data: {
    totalScore: 0,
    userTitle: '环保新手',
    recognizeCount: 0, // 识别次数
    challengeCount: 0  // 通关次数
  },

  onShow: function () {
    const userId = wx.getStorageSync('userId');
    if (!userId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    // 从后端实时拉取用户最新数据
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
          // 同步更新本地缓存，防止其他页面读取旧数据
          wx.setStorageSync('totalScore', info.total_score);
          wx.setStorageSync('currentTitle', info.title);
        }
      }
    });
  },

  // 跳转到历史记录页
  goToHistory: function(e) {
    const type = e.currentTarget.dataset.type; // 获取是'recognize'还是'challenge'
    console.log("即将跳转历史记录类型：", type);
    if (type === 'recognize') {
      // 1. 如果点击的是“识别历史”，识别历史页
      wx.navigateTo({
        url: '/pages/user/recognizeHistory'
      });
    } else if (type === 'challenge') {
      wx.navigateTo({
        url: '/pages/user/challengeHistory'
      });
    }
  },

  // 跳转错题本
  goToWrongBook: function() {
    wx.navigateTo({
      url: '/pages/user/wrongBook'
    });
  },

  // 跳转到我的反馈历史
  goToFeedbackHistory: function() {
    wx.navigateTo({ 
      url: '/pages/user/feedbackHistory' 
    });
  },

  // 关于我们
  showAbout: function() {
    wx.showModal({
      title: '关于我们',
      content: '基于移动端的智能垃圾分类系统 v1.0\n开发者：wjl',
      showCancel: false
    });
  },

  // 清除本地缓存 (升级版)
  clearCache: function() {
    wx.showModal({
      title: '清除本地缓存',
      content: '确定要清除本地缓存的临时图片和状态吗？\n(您的积分、历史记录和错题本已安全保存在云端，不会丢失)',
      success: (res) => {
        if (res.confirm) {
          // 1. 🚀 核心护城河：先把极其重要的登录凭证备份出来！
          const userId = wx.getStorageSync('userId');
          
          // 2. 放心大胆地一键清空本地所有垃圾缓存
          wx.clearStorageSync(); 
          
          // 3. 🚀 赶紧把 userId 存回去，让用户保持登录状态！
          if (userId) {
            wx.setStorageSync('userId', userId);
          }

          // 4. 重新触发一次请求，把后端最新的积分和称号拉取下来
          this.onShow(); 
          
          wx.showToast({ title: '缓存清理完毕', icon: 'success' });
        }
      }
    });
  },

  // 退出登录
  logout: function() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      confirmColor: '#F44336',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync(); // 彻底清空本地缓存（包含 userId）
          wx.reLaunch({
            url: '/pages/login/login' // 假设你的登录页叫这个，如果是其他名字请修改
          });
        }
      }
    });
  }
})