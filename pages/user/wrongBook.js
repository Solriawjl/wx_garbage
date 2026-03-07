// pages/user/wrongBook.js
Page({
  data: {
    wrongList: [],
    
    // 左滑控制参数
    startX: 0,
    isMoving: false
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
          // 初始化时给每个错题增加 offsetX 属性
          let list = res.data.data.map(item => {
            return { ...item, offsetX: 0 };
          });
          this.setData({ wrongList: list });
        }
      }
    });
  },

  // -----------------------------------------
  // 全局归位逻辑 (点击空白处触发)
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

  // -----------------------------------------
  // 左滑删除核心算法
  // -----------------------------------------
  touchS: function (e) {
    if (e.touches.length === 1) {
      let list = this.data.wrongList;
      let currentIndex = e.currentTarget.dataset.index;
      
      // 滑动某张卡片时，自动合上其他已经被滑开的卡片
      list.forEach((item, index) => {
        if (index !== currentIndex && item.offsetX < 0) {
          item.offsetX = 0;
        }
      });

      this.setData({
        wrongList: list,
        startX: e.touches[0].clientX,
        isMoving: true 
      });
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
      
      // 超过一半(70)自动滑开，否则弹回
      list[index].offsetX = disX > 70 ? -140 : 0;
      this.setData({ wrongList: list, isMoving: false });
    }
  },

  // -----------------------------------------
  // 单条移除与一键清空
  // -----------------------------------------
  removeItem: function(e) {
    // 拦截：如果当前有被滑开的卡片（且点击的不是删除按钮本身时），优先让卡片归位
    // 因为删除按钮用的 catchtap，所以点击删除时不会触发父级的恢复
    
    const index = e.currentTarget.dataset.index;
    const item = this.data.wrongList[index];
    
    wx.showModal({
      title: '提示',
      content: '确定已经记住这道题的分类了吗？',
      confirmText: '记住了',
      cancelText: '再看看',
      success: (res) => {
        if (res.confirm) {
          // 调用后端删除接口
          wx.request({
            url: `http://192.168.0.126:8000/api/user/wrong_book/${item.id}`,
            method: 'DELETE',
            success: (delRes) => {
              if (delRes.data.code === 200) {
                let newList = this.data.wrongList;
                newList.splice(index, 1);
                this.setData({ wrongList: newList });
                wx.showToast({ title: '已移除', icon: 'success' });
              }
            }
          });
        } else {
          // 取消删除时，把可能滑开的卡片弹回去
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
      content: '确定要清空所有错题记录吗？清空后无法恢复哦。',
      confirmColor: '#F44336',
      success: (res) => {
        if (res.confirm) {
          const userId = wx.getStorageSync('userId');
          wx.request({
            url: `http://192.168.0.126:8000/api/user/wrong_book/clear?user_id=${userId}`,
            method: 'DELETE',
            success: (delRes) => {
              if (delRes.data.code === 200) {
                this.setData({ wrongList: [] });
                wx.showToast({ title: '错题本已清空', icon: 'success' });
              }
            }
          });
        }
      }
    });
  }
})