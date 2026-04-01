// pages/user/recognizeHistory.js
Page({
  data: {
    historyList: [],
    showDetailModal: false, 
    currentDetailItem: {},
    
    // 左滑控制参数
    startX: 0,
    isMoving: false,

    // 筛选功能相关参数
    hasData: false, 
    filterOptions: ['全部分类', '可回收物', '有害垃圾', '厨余垃圾', '其他垃圾'],
    filterIndex: 0
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
          let list = res.data.data.map(item => {
            return { ...item, offsetX: 0 };
          });
          
          // 将原始全量数据挂载到 this 上，不在 data 里，避免不必要的渲染开销
          this.allRecordList = list; 
          this.setData({ hasData: list.length > 0 });
          this.applyFilter(); // 初始渲染时执行一次筛选（默认展示全部）
        }
      }
    });
  },

  // 用户切换下拉菜单事件
  onFilterChange: function(e) {
    this.setData({ filterIndex: e.detail.value });
    this.applyFilter();
  },

  // 执行本地过滤
  applyFilter: function() {
    const idx = parseInt(this.data.filterIndex);
    let filtered = this.allRecordList || [];
    
    // 如果选的不是 0 (全部分类)，就进行严格匹配过滤
    if (idx > 0) { 
      filtered = this.allRecordList.filter(item => item.categoryName === this.data.filterOptions[idx]);
    }
    
    // 渲染过滤后的结果到页面
    this.setData({ historyList: filtered });
  },

  // -----------------------------------------
  // 左滑删除核心算法 (保持不变)
  // -----------------------------------------
  touchS: function (e) {
    if (e.touches.length === 1) {
      let list = this.data.historyList;
      let currentIndex = e.currentTarget.dataset.index;
      list.forEach((item, index) => {
        if (index !== currentIndex && item.offsetX < 0) item.offsetX = 0;
      });
      this.setData({ historyList: list, startX: e.touches[0].clientX, isMoving: true });
    }
  },
  touchM: function (e) {
    if (e.touches.length === 1) {
      let moveX = e.touches[0].clientX;
      let disX = this.data.startX - moveX;
      let list = this.data.historyList;
      let index = e.currentTarget.dataset.index;
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
      list[index].offsetX = disX > 70 ? -140 : 0;
      this.setData({ historyList: list, isMoving: false });
    }
  },
  recoverSwipe: function() {
    let list = this.data.historyList;
    let hasOpen = false;
    list.forEach(item => {
      if (item.offsetX < 0) { item.offsetX = 0; hasOpen = true; }
    });
    if (hasOpen) { this.setData({ historyList: list }); return true; }
    return false;
  },

  // -----------------------------------------
  // 单条删除与一键清空 (加入底层同步逻辑)
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
                // 同步删除底层全量数据中的这一条
                this.allRecordList = this.allRecordList.filter(i => i.id !== item.id);
                // 检查全量数据是否空了，更新顶栏状态，并重新执行当前分类的筛选
                this.setData({ hasData: this.allRecordList.length > 0 });
                this.applyFilter(); 
                
                wx.showToast({ title: '已删除' });
              }
            }
          });
        } else {
          let list = this.data.historyList;
          list[index].offsetX = 0;
          this.setData({ historyList: list });
        }
      }
    });
  },

  clearAll: function() {
    wx.showModal({
      title: '一键清空',
      content: '确定要清空【全部】识别历史吗？\n(包含其他分类中被隐藏的记录)',
      confirmColor: '#F44336',
      success: (res) => {
        if (res.confirm) {
          const userId = wx.getStorageSync('userId');
          wx.request({
            url: `http://192.168.0.126:8000/api/user/recognize_history/clear?user_id=${userId}`,
            method: 'DELETE',
            success: (delRes) => {
              if (delRes.data.code === 200) {
                // 🚀 核心：清空全量数据并更新视图
                this.allRecordList = [];
                this.setData({ hasData: false });
                this.applyFilter();
                
                wx.showToast({ title: '已清空' });
              }
            }
          });
        }
      }
    });
  },

  // -----------------------------------------
  // 弹窗与跳转反馈
  // -----------------------------------------
  goToDetail: function(e) {
    if (this.recoverSwipe()) return; 
    const item = e.currentTarget.dataset.item;
    this.setData({ currentDetailItem: item, showDetailModal: true });
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