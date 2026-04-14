Page({
  data: {
    itemList: [],
    activeCount: 0,
    isLoading: true
  },

  onShow: function () {
    this.fetchMallItems();
  },

  onPullDownRefresh: function () {
    this.fetchMallItems(() => {
      wx.stopPullDownRefresh();
    });
  },

  fetchMallItems: function (cb) {
    wx.showLoading({ title: '加载库房中...' });
    const teacherId = wx.getStorageSync('userId');
    wx.request({
      url: `http://192.168.0.126:8000/api/teacher/mall/list?teacher_id=${teacherId}`,
      method: 'GET',
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          const items = res.data.data || [];
          const activeCount = items.filter(item => item.is_active).length;
          
          this.setData({ 
            itemList: items,
            activeCount: activeCount,
            isLoading: false
          });
        } else {
          wx.showToast({ title: '获取数据失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '网络异常', icon: 'none' });
      },
      complete: () => {
        if (cb) cb();
      }
    });
  },

  onToggleChange: function(e) {
    const itemId = e.currentTarget.dataset.id;
    const isChecked = e.detail.value; 

    wx.request({
      url: `http://192.168.0.126:8000/api/teacher/mall/toggle/${itemId}`,
      method: 'POST',
      success: (res) => {
        if (res.data.code === 200) {
          wx.showToast({ 
            title: isChecked ? '上架成功' : '已下架', 
            icon: 'success' 
          });
          this.recalculateActiveCount(itemId, isChecked);
        } else {
          wx.showToast({ title: '操作失败', icon: 'none' });
          this.fetchMallItems(); 
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'none' });
        this.fetchMallItems(); 
      }
    });
  },

  recalculateActiveCount: function(itemId, newStatus) {
    let list = this.data.itemList;
    let newCount = 0;
    
    list.forEach(item => {
      if (item.id === itemId) {
        item.is_active = newStatus;
      }
      if (item.is_active) newCount++;
    });

    this.setData({
      itemList: list,
      activeCount: newCount
    });
  },

  // ==========================================
  // 🚀 新增：删除已下架商品
  // ==========================================
  onDeleteItem: function(e) {
    const { id, name } = e.currentTarget.dataset;
    const teacherId = wx.getStorageSync('userId');

    wx.showModal({
      title: '永久删除确认',
      content: `确定要从库房删除【${name}】吗？删除后不可恢复。`,
      confirmColor: '#F44336', // 警示色
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '正在清理库房...' });
          
          wx.request({
            url: `http://192.168.0.126:8000/api/teacher/mall/items/${id}?teacher_id=${teacherId}`,
            method: 'DELETE',
            success: (res) => {
              wx.hideLoading();
              if (res.data.code === 200) {
                wx.showToast({ title: '已永久删除', icon: 'success' });
                this.fetchMallItems(); // 删除成功，重新拉取列表刷新页面
              } else {
                // 如果后端查出状态不对等被拦截，弹出提示
                wx.showModal({ title: '操作被拦截', content: res.data.message, showCancel: false });
              }
            },
            fail: () => {
              wx.hideLoading();
              wx.showToast({ title: '网络异常', icon: 'none' });
            }
          });
        }
      }
    });
  },

  goToAddMallItem: function() {
    wx.navigateTo({
      url: '/pages/teacher/mall_add'
    });
  }
});