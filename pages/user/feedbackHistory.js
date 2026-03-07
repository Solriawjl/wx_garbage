// pages/user/feedbackHistory.js
Page({
  data: {
    feedbackList: [],
    
    // 左滑控制参数
    startX: 0,
    isMoving: false
  },

  onLoad: function (options) {
    this.fetchFeedbackHistory();
  },

  fetchFeedbackHistory: function() {
    const userId = wx.getStorageSync('userId');
    wx.showLoading({ title: '加载中...' });

    wx.request({
      url: `http://192.168.0.126:8000/api/user/feedback_history?user_id=${userId}`,
      method: 'GET',
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          // 初始化偏移量
          let list = res.data.data.map(item => {
            return { ...item, offsetX: 0 };
          });
          this.setData({ feedbackList: list });
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
  },

  // -----------------------------------------
  // 全局归位逻辑
  // -----------------------------------------
  recoverSwipe: function() {
    let list = this.data.feedbackList;
    let hasOpen = false;
    
    list.forEach(item => {
      if (item.offsetX < 0) {
        item.offsetX = 0; 
        hasOpen = true;
      }
    });
    
    if (hasOpen) {
      this.setData({ feedbackList: list });
      return true; 
    }
    return false;
  },

  // -----------------------------------------
  // 左滑删除核心算法
  // -----------------------------------------
  touchS: function (e) {
    if (e.touches.length === 1) {
      let list = this.data.feedbackList;
      let currentIndex = e.currentTarget.dataset.index;
      
      list.forEach((item, index) => {
        if (index !== currentIndex && item.offsetX < 0) {
          item.offsetX = 0;
        }
      });

      this.setData({
        feedbackList: list,
        startX: e.touches[0].clientX,
        isMoving: true 
      });
    }
  },

  touchM: function (e) {
    if (e.touches.length === 1) {
      let moveX = e.touches[0].clientX;
      let disX = this.data.startX - moveX;
      let list = this.data.feedbackList;
      let index = e.currentTarget.dataset.index;
      
      if (disX <= 0) { list[index].offsetX = 0; }
      else { list[index].offsetX = -disX >= -140 ? -disX : -140; }
      
      this.setData({ feedbackList: list });
    }
  },

  touchE: function (e) {
    if (e.changedTouches.length === 1) {
      let endX = e.changedTouches[0].clientX;
      let disX = this.data.startX - endX;
      let list = this.data.feedbackList;
      let index = e.currentTarget.dataset.index;
      
      list[index].offsetX = disX > 70 ? -140 : 0;
      this.setData({ feedbackList: list, isMoving: false });
    }
  },

  // -----------------------------------------
  // 单条移除与一键清空
  // -----------------------------------------
  removeItem: function(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.feedbackList[index];
    
    wx.showModal({
      title: '删除反馈',
      content: '确定要删除这条纠错记录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.request({
            url: `http://192.168.0.126:8000/api/user/feedback_history/${item.id}`,
            method: 'DELETE',
            success: (delRes) => {
              if (delRes.data.code === 200) {
                let newList = this.data.feedbackList;
                newList.splice(index, 1);
                this.setData({ feedbackList: newList });
                wx.showToast({ title: '已删除' });
              }
            }
          });
        } else {
          let list = this.data.feedbackList;
          list[index].offsetX = 0;
          this.setData({ feedbackList: list });
        }
      }
    });
  },

  clearAll: function() {
    wx.showModal({
      title: '一键清空',
      content: '确定要清空所有反馈记录吗？',
      confirmColor: '#F44336',
      success: (res) => {
        if (res.confirm) {
          const userId = wx.getStorageSync('userId');
          wx.request({
            url: `http://192.168.0.126:8000/api/user/feedback_history/clear?user_id=${userId}`,
            method: 'DELETE',
            success: (delRes) => {
              if (delRes.data.code === 200) {
                this.setData({ feedbackList: [] });
                wx.showToast({ title: '已清空' });
              }
            }
          });
        }
      }
    });
  }
})