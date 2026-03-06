// pages/user/challengeHistory.js
Page({
  data: {
    historyList: []
  },

  onLoad: function (options) {
    this.fetchChallengeHistory();
  },

  fetchChallengeHistory: function() {
    const userId = wx.getStorageSync('userId');
    wx.showLoading({ title: '加载中...' });

    wx.request({
      url: `http://127.0.0.1:8000/api/user/challenge_history?user_id=${userId}`,
      method: 'GET',
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          this.setData({ historyList: res.data.data });
        }
      }
    });
  },

  goToDetail: function(e) {
    const item = e.currentTarget.dataset.item;
    // 把这条记录的得分和错题本存入缓存，让 result 页去读
    wx.setStorageSync('challengeScore', item.score);
    wx.setStorageSync('challengeWrongList', item.wrongList);
    
    wx.navigateTo({
      url: '/pages/challenge/result?isFromHistory=true' 
    });
  },

  // 点击筛选
  onFilter: function() {
    wx.showActionSheet({
      itemList: ['全部挑战', '满分通关', '及格挑战', '不及格记录'],
      success: (res) => {
        console.log("用户选择了筛选条件索引：", res.tapIndex);
        wx.showToast({
          title: '筛选功能开发中',
          icon: 'none'
        });
      }
    });
  }
})