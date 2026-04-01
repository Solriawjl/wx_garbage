// pages/user/wrongBook.js
Page({
  data: {
    wrongList: [],
    
    // 左滑控制参数
    startX: 0,
    isMoving: false,

    // 🚀 新增：筛选功能相关参数
    hasData: false, 
    filterOptions: ['全部错题', '高频易错(≥3次)', '重蹈覆辙(2次)', '偶尔失误(1次)'],
    filterIndex: 0
  },

  onLoad: function (options) {
    this.fetchWrongBook();
  },

  fetchWrongBook: function() {
    const userId = wx.getStorageSync('userId');
    wx.request({
      url: `http://192.168.0.126:8000/api/user/wrong_book?user_id=${userId}`,
      method: 'GET',
      success: (res) => {
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

  // 🚀 新增：执行本地过滤 (基于 errorCount)
  applyFilter: function() {
    const idx = parseInt(this.data.filterIndex);
    let filtered = this.allRecordList || [];
    
    if (idx === 1) {
      filtered = this.allRecordList.filter(item => item.errorCount >= 3);
    } else if (idx === 2) {
      filtered = this.allRecordList.filter(item => item.errorCount === 2);
    } else if (idx === 3) {
      filtered = this.allRecordList.filter(item => item.errorCount === 1);
    }
    
    this.setData({ wrongList: filtered });
  },

  // -----------------------------------------
  // 全局归位与左滑逻辑 (保持不变)
  // -----------------------------------------
  recoverSwipe: function() {
    let list = this.data.wrongList;
    let hasOpen = false;
    
    list.forEach(item => {
      if (item.offsetX < 0) {
        item.offsetX = 0; 
        hasOpen = true;
      }
    });

    if (hasOpen) {
      this.setData({ wrongList: list });
      return true; 
    }
    return false;
  },

  touchS: function (e) {
    if (e.touches.length === 1) {
      let list = this.data.wrongList;
      let currentIndex = e.currentTarget.dataset.index;
      list.forEach((item, index) => {
        if (index !== currentIndex && item.offsetX < 0) { item.offsetX = 0; }
      });
      this.setData({ wrongList: list, startX: e.touches[0].clientX, isMoving: true });
    }
  },

  touchM: function (e) {
    if (e.touches.length === 1) {
      let moveX = e.touches[0].clientX;
      let disX = this.data.startX - moveX;
      let list = this.data.wrongList;
      let index = e.currentTarget.dataset.index;
      if (disX <= 0) { list[index].offsetX = 0; }
      else { list[index].offsetX = -disX >= -140 ? -disX : -140; }
      this.setData({ wrongList: list });
    }
  },

  touchE: function (e) {
    if (e.changedTouches.length === 1) {
      let endX = e.changedTouches[0].clientX;
      let disX = this.data.startX - endX;
      let list = this.data.wrongList;
      let index = e.currentTarget.dataset.index;
      list[index].offsetX = disX > 70 ? -140 : 0;
      this.setData({ wrongList: list, isMoving: false });
    }
  },

  // -----------------------------------------
  // 单条删除与一键清空 (加入底层同步逻辑)
  // -----------------------------------------
  removeItem: function(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.wrongList[index];
    
    wx.showModal({
      title: '移除错题',
      content: `确定已掌握【${item.name}】并将其移出错题本吗？`,
      confirmText: '记住了',
      cancelText: '再看看',
      success: (res) => {
        if (res.confirm) {
          wx.request({
            url: `http://192.168.0.126:8000/api/user/wrong_book/${item.id}`,
            method: 'DELETE',
            success: (delRes) => {
              if (delRes.data.code === 200) {
                // 🚀 同步删除底层数据并重新渲染当前分类
                this.allRecordList = this.allRecordList.filter(i => i.id !== item.id);
                this.setData({ hasData: this.allRecordList.length > 0 });
                this.applyFilter();
                wx.showToast({ title: '已移除', icon: 'success' });
              }
            }
          });
        } else {
          let list = this.data.wrongList;
          list[index].offsetX = 0;
          this.setData({ wrongList: list });
        }
      }
    });
  },

  clearAll: function() {
    wx.showModal({
      title: '一键清空',
      content: '确定要清空【全部】错题记录吗？清空后无法恢复哦。',
      confirmColor: '#F44336',
      success: (res) => {
        if (res.confirm) {
          const userId = wx.getStorageSync('userId');
          wx.request({
            url: `http://192.168.0.126:8000/api/user/wrong_book/clear?user_id=${userId}`,
            method: 'DELETE',
            success: (delRes) => {
              if (delRes.data.code === 200) {
                // 🚀 清空全量底层数据
                this.allRecordList = [];
                this.setData({ hasData: false });
                this.applyFilter();
                wx.showToast({ title: '已清空', icon: 'none' });
              }
            }
          });
        }
      }
    });
  }
})