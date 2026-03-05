// pages/user/index.js
Page({
  data: {
    totalScore: 0,
    userTitle: '环保新手'
  },

  // 每次进入页面时，实时读取最新的积分和称号
  onShow: function () {
    const score = wx.getStorageSync('totalScore') || 0;
    
    let title = '环保新手';
    if (score >= 100) title = '环保王者';
    else if (score >= 50) title = '环保达人';
    else if (score >= 20) title = '环保卫士';

    this.setData({
      totalScore: score,
      userTitle: title
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