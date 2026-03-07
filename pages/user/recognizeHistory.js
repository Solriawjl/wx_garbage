// pages/user/recognizeHistory.js
Page({
  data: {
    historyList: [],
    showDetailModal: false, 
    currentDetailItem: {},
    
    // 左滑控制参数
    startX: 0,
    isMoving: false
  },

  onLoad: function (options) {
    this.fetchHistory();
  },

  fetchHistory: function() {
    const userId = wx.getStorageSync('userId');
    wx.showLoading({ title: '加载中...' });
    
    wx.request({
      url: `http://192.168.0.126:8000/api/user/recognize_history?user_id=${userId}`,
      method: 'GET',
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          // 初始化时给每个 item 增加一个 offsetX 为 0
          let list = res.data.data.map(item => {
            return { ...item, offsetX: 0 };
          });
          this.setData({ historyList: list });
        }
      }
    });
  },

  // -----------------------------------------
  // 🚀 左滑删除核心算法
  // -----------------------------------------
  touchS: function (e) {
    if (e.touches.length === 1) {
      let list = this.data.historyList;
      let currentIndex = e.currentTarget.dataset.index;
      
      // 遍历列表，把“不是当前正在摸的这块”且“已经被滑开”的卡片全部合上
      list.forEach((item, index) => {
        if (index !== currentIndex && item.offsetX < 0) {
          item.offsetX = 0;
        }
      });

      this.setData({
        historyList: list, // 更新其他卡片的闭合状态
        startX: e.touches[0].clientX,
        isMoving: true 
      });
    }
  },

  touchM: function (e) {
    if (e.touches.length === 1) {
      let moveX = e.touches[0].clientX;
      let disX = this.data.startX - moveX;
      let list = this.data.historyList;
      let index = e.currentTarget.dataset.index;
      
      // 如果向右滑（负数）归零，向左滑最大不超过 140rpx
      if (disX <= 0) { list[index].offsetX = 0; }
      else { list[index].offsetX = -disX >= -140 ? -disX : -140; }
      
      this.setData({ historyList: list });
    }
  },

  touchE: function (e) {
    if (e.changedTouches.length === 1) {
      let endX = e.changedTouches[0].clientX;
      let disX = this.data.startX - endX;
      let list = this.data.historyList;
      let index = e.currentTarget.dataset.index;
      
      // 如果滑动距离超过 70rpx，就自动弹到底，否则回弹关闭
      list[index].offsetX = disX > 70 ? -140 : 0;
      this.setData({ historyList: list, isMoving: false });
    }
  },

  // -----------------------------------------
  // 🗑️ 单条删除与一键清空
  // -----------------------------------------
  removeItem: function(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.historyList[index];
    
    wx.showModal({
      title: '删除记录',
      content: '确定要删除这条识别记录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.request({
            url: `http://192.168.0.126:8000/api/user/recognize_history/${item.id}`,
            method: 'DELETE',
            success: (delRes) => {
              if (delRes.data.code === 200) {
                let newList = this.data.historyList;
                newList.splice(index, 1);
                this.setData({ historyList: newList });
                wx.showToast({ title: '已删除' });
              }
            }
          });
        } else {
          // 取消删除时，把可能滑开的卡片弹回去
          let list = this.data.historyList;
          list[index].offsetX = 0;
          this.setData({ historyList: list });
        }
      }
    });
  },

  // -----------------------------------------
  // 一键归位所有的滑动卡片
  // -----------------------------------------
  recoverSwipe: function() {
    let list = this.data.historyList;
    let hasOpen = false;
    
    // 检查是否有处于滑开状态的卡片
    list.forEach(item => {
      if (item.offsetX < 0) {
        item.offsetX = 0; // 强制归位
        hasOpen = true;
      }
    });
    
    // 如果刚才有开着的，就更新视图并返回 true
    if (hasOpen) {
      this.setData({ historyList: list });
      return true; 
    }
    return false;
  },

  clearAll: function() {
    wx.showModal({
      title: '一键清空',
      content: '确定要清空所有识别历史吗？',
      confirmColor: '#F44336',
      success: (res) => {
        if (res.confirm) {
          const userId = wx.getStorageSync('userId');
          wx.request({
            url: `http://192.168.0.126:8000/api/user/recognize_history/clear?user_id=${userId}`,
            method: 'DELETE',
            success: (delRes) => {
              if (delRes.data.code === 200) {
                this.setData({ historyList: [] });
                wx.showToast({ title: '已清空' });
              }
            }
          });
        }
      }
    });
  },

  // -----------------------------------------
  // 弹窗与跳转反馈（原有逻辑保持不变）
  // -----------------------------------------
  goToDetail: function(e) {
    // 拦截器：如果当前有被滑开的卡片，点击卡片只会让它们缩回去，绝不弹窗！
    if (this.recoverSwipe()) {
      return; 
    }

    const item = e.currentTarget.dataset.item;
    this.setData({
      currentDetailItem: item,
      showDetailModal: true
    });
  },
  closeDetail: function() { this.setData({ showDetailModal: false }); },
  preventTouch: function() {},
  goToFeedback: function() {
    this.closeDetail();
    const item = this.data.currentDetailItem;
    wx.navigateTo({
      url: `/pages/feedback/feedback?imageUrl=${encodeURIComponent(item.imageUrl)}&itemName=${encodeURIComponent(item.itemName)}&categoryName=${encodeURIComponent(item.categoryName)}`
    });
  }
})