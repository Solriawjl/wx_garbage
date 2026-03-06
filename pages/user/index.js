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
      url: `http://127.0.0.1:8000/api/user/info?user_id=${userId}`,
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

  // 清除本地缓存
  clearCache: function() {
    wx.showModal({
      title: '提示',
      content: '确定要清除所有缓存数据（包括总积分和错题本）吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync(); // 一键清理
          this.onShow(); // 重新刷新页面数据
          wx.showToast({ title: '清理成功' });
        }
      }
    });
  }
})