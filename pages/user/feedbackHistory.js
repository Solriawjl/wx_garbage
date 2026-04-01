// pages/user/feedbackHistory.js
Page({
  data: {
    feedbackList: [],
    
    // 左滑控制参数
    startX: 0,
    isMoving: false,

    // 🚀 新增：筛选功能相关参数
    hasData: false, 
    filterOptions: ['全部状态', '待处理', '已采纳', '已驳回'],
    filterIndex: 0
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
          let list = res.data.data.map(item => {
            return { ...item, offsetX: 0 };
          });
          
          // 🚀 核心：挂载原始全量数据
          this.allRecordList = list;
          this.setData({ hasData: list.length > 0 });
          this.applyFilter();
        }
      }
    });
  },

  // 🚀 新增：用户切换下拉菜单事件
  onFilterChange: function(e) {
    this.setData({ filterIndex: e.detail.value });
    this.applyFilter();
  },

  // 🚀 新增：执行本地过滤 (基于 status 状态)
  applyFilter: function() {
    const idx = parseInt(this.data.filterIndex);
    let filtered = this.allRecordList || [];
    
    // status: 0-待处理, 1-已采纳, 2-已驳回
    if (idx === 1) {
      filtered = this.allRecordList.filter(item => item.status === 0);
    } else if (idx === 2) {
      filtered = this.allRecordList.filter(item => item.status === 1);
    } else if (idx === 3) {
      filtered = this.allRecordList.filter(item => item.status === 2);
    }
    
    this.setData({ feedbackList: filtered });
  },

  previewImage: function(e) {
    const currentUrl = e.currentTarget.dataset.url;
    wx.previewImage({
      urls: [currentUrl], 
      current: currentUrl 
    });
  },

  // -----------------------------------------
  // 全局归位与左滑逻辑 (保持不变)
  // -----------------------------------------
  recoverSwipe: function() {
    let list = this.data.feedbackList;
    let hasOpen = false;
    list.forEach(item => {
      if (item.offsetX < 0) { item.offsetX = 0; hasOpen = true; }
    });
    if (hasOpen) { this.setData({ feedbackList: list }); return true; }
    return false;
  },

  touchS: function (e) {
    if (e.touches.length === 1) {
      let list = this.data.feedbackList;
      let currentIndex = e.currentTarget.dataset.index;
      list.forEach((item, index) => {
        if (index !== currentIndex && item.offsetX < 0) { item.offsetX = 0; }
      });
      this.setData({ feedbackList: list, startX: e.touches[0].clientX, isMoving: true });
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
  // 单条删除与一键清空
  // -----------------------------------------
  removeItem: function(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.feedbackList[index];
    
    // 拦截待处理的反馈
    if (item.status === 0) {
      wx.showToast({ title: '处理中的反馈无法删除', icon: 'none' });
      let list = this.data.feedbackList;
      list[index].offsetX = 0;
      this.setData({ feedbackList: list });
      return; 
    }

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
                // 🚀 同步删除底层数据并重新渲染当前分类
                this.allRecordList = this.allRecordList.filter(i => i.id !== item.id);
                this.setData({ hasData: this.allRecordList.length > 0 });
                this.applyFilter();
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
      title: '一键清理',
      content: '确定要清理所有【已处理】的反馈记录吗？\n(审核中的记录将为您保留)', 
      confirmColor: '#F44336',
      success: (res) => {
        if (res.confirm) {
          const userId = wx.getStorageSync('userId');
          wx.showLoading({ title: '清理中...' });
          wx.request({
            url: `http://192.168.0.126:8000/api/user/feedback_history/clear?user_id=${userId}`,
            method: 'DELETE',
            success: (delRes) => {
              if (delRes.data.code === 200) {
                // 🚀 核心修改：因为后端只清理了已办结的数据，待处理的数据还在数据库里，
                // 所以这里最安全的做法是直接重新 fetch 一次，而不是将数组置空。
                this.fetchFeedbackHistory(); 
                wx.showToast({ title: '清理完成', icon: 'success' });
              }
            },
            complete: () => { wx.hideLoading(); }
          });
        }
      }
    });
  }
})