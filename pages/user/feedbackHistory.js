// pages/user/feedbackHistory.js
Page({
  data: {
    feedbackList: []
  },

  onLoad: function (options) {
    this.fetchFeedbackHistory();
  },

  fetchFeedbackHistory: function() {
    const userId = wx.getStorageSync('userId');
    wx.showLoading({ title: '加载中...' });

    wx.request({
      url: `http://127.0.0.1:8000/api/user/feedback_history?user_id=${userId}`,
      method: 'GET',
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          this.setData({ feedbackList: res.data.data });
        }
      }
    });
  },

  previewImage: function(e) {
    const currentUrl = e.currentTarget.dataset.url;
    wx.previewImage({
      urls: [currentUrl], 
      current: currentUrl 
    });
  }
})