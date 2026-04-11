// pages/user/wrongBook.js
Page({
  data: {
    wrongList: [],
    startX: 0,
    isMoving: false,
    hasData: false, 
    filterOptions: ['全部错题', '高频易错(≥3次)', '重蹈覆辙(2次)', '偶尔失误(1次)'],
    filterIndex: 0
  },

  onShow: function () {
    this.fetchWrongBook();
  },

  // 获取错题列表
  fetchWrongBook: function() {
    const userId = wx.getStorageSync('userId');
    wx.request({
      url: `http://192.168.0.126:8000/api/user/wrong_book?user_id=${userId}`,
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200) {
          let list = res.data.data.map(item => {
            let formattedTime = '最近';
            if (item.created_at) {
              formattedTime = item.created_at.replace('T', ' ').substring(0, 16);
            }
            return { 
              ...item, 
              offsetX: 0,
              displayTime: formattedTime // 存入一个新的专门用于显示的字段
            };
          });
          
          this.allRecordList = list;
          this.setData({ hasData: list.length > 0 });
          this.applyFilter(); // 这里会触发排序
        }
      }
    });
  },

  onFilterChange: function(e) {
    this.setData({ filterIndex: e.detail.value });
    this.applyFilter();
  },

  // 2：核心排序逻辑
  applyFilter: function() {
    if (!this.allRecordList) return;
    
    let index = parseInt(this.data.filterIndex);
    let filtered = [];

    // 先按维度筛选
    switch(index) {
      case 0: filtered = this.allRecordList; break;
      case 1: filtered = this.allRecordList.filter(item => item.errorCount >= 3); break;
      case 2: filtered = this.allRecordList.filter(item => item.errorCount === 2); break;
      case 3: filtered = this.allRecordList.filter(item => item.errorCount === 1); break;
    }

    // 执行排序：未掌握(0)在前，已掌握(1)沉底；同状态下按时间倒序
    filtered.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status - b.status; // 0 在 1 前面
      }
      // 如果状态相同，按时间戳倒序（新错题在最前）
      return new Date(b.created_at) - new Date(a.created_at);
    });

    this.setData({ wrongList: filtered });
  },

  // 消灭错题
  handleResolve: function (e) {
    const wrongId = e.currentTarget.dataset.id;
    wx.showLoading({ title: '处理中...' });

    wx.request({
      url: `http://192.168.0.126:8000/api/user/wrong_book/resolve/${wrongId}`,
      method: 'POST',
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          wx.showToast({ title: '已掌握', icon: 'success' });
          
          // 更新本地全量数据中的状态
          let targetIndex = this.allRecordList.findIndex(item => item.id === wrongId);
          if (targetIndex !== -1) {
            this.allRecordList[targetIndex].status = 1;
            // 重新执行筛选和排序，卡片会自动“滑”到底部
            this.applyFilter(); 
          }
        }
      }
    });
  },

  // --- 左滑交互逻辑 (保持不变，但需确保 offsetX 重置) ---
  touchS: function(e) { if (e.touches.length === 1) this.setData({ startX: e.touches[0].clientX, isMoving: true }); },
  touchM: function(e) {
    if (e.touches.length === 1) {
      let disX = this.data.startX - e.touches[0].clientX;
      let index = e.currentTarget.dataset.index;
      let list = this.data.wrongList;
      list[index].offsetX = disX > 0 ? (disX >= 140 ? -140 : -disX) : 0;
      this.setData({ wrongList: list });
    }
  },
  touchE: function(e) {
    let index = e.currentTarget.dataset.index;
    let list = this.data.wrongList;
    let disX = this.data.startX - e.changedTouches[0].clientX;
    list[index].offsetX = disX > 70 ? -140 : 0;
    this.setData({ wrongList: list, isMoving: false });
  },
  recoverSwipe: function() {
    let list = this.data.wrongList;
    list.forEach(item => item.offsetX = 0);
    this.setData({ wrongList: list });
  },
  removeItem: function(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.wrongList[index];
    wx.showModal({
      title: '移除错题',
      content: '确定要移除吗？',
      success: (res) => {
        if (res.confirm) {
          wx.request({
            url: `http://192.168.0.126:8000/api/user/wrong_book/${item.id}`,
            method: 'DELETE',
            success: () => {
              this.allRecordList = this.allRecordList.filter(i => i.id !== item.id);
              this.applyFilter();
            }
          });
        }
      }
    });
  }
});