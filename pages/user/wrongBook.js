// pages/user/wrongBook.js
Page({
  data: {
    wrongList: []
  },

  onLoad: function (options) {
    this.fetchWrongBook();
  },

  fetchWrongBook: function() {
    const userId = wx.getStorageSync('userId');
    wx.request({
      url: `http://127.0.0.1:8000/api/user/wrong_book?user_id=${userId}`,
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200) {
          this.setData({ wrongList: res.data.data });
        }
      }
    });
  },

  removeItem: function(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.wrongList[index];
    
    wx.showModal({
      title: '提示',
      content: '确定已经记住这道题的分类了吗？',
      confirmText: '记住了',
      cancelText: '再看看',
      success: (res) => {
        if (res.confirm) {
          // 调用后端删除接口 (假设通过错题的 id 删除)
          wx.request({
            url: `http://127.0.0.1:8000/api/user/wrong_book/${item.id}`,
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
            url: `http://127.0.0.1:8000/api/user/wrong_book/clear?user_id=${userId}`,
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