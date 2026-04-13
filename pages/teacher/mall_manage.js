Page({
  data: {
    itemList: [],
    activeCount: 0,
    isLoading: true
  },

  // 使用 onShow，这样从“发布奖品页”退回来时，列表会自动刷新！
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
    // 注意替换为真实后端 IP
    wx.request({
      url: `http://192.168.0.126:8000/api/teacher/mall/list?teacher_id=${teacherId}`,
      method: 'GET',
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          const items = res.data.data || [];
          // 计算当前有多少个处于上架状态
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

  // 🚀 核心交互：拨动 Switch 开关触发上下架
  onToggleChange: function(e) {
    const itemId = e.currentTarget.dataset.id;
    // switch 组件的新状态 (true/false)
    const isChecked = e.detail.value; 

    // 调用后端接口更新状态
    wx.request({
      url: `http://192.168.0.126:8000/api/teacher/mall/toggle/${itemId}`,
      method: 'POST',
      success: (res) => {
        if (res.data.code === 200) {
          wx.showToast({ 
            title: isChecked ? '上架成功' : '已下架', 
            icon: 'success' 
          });
          // 重新计算“上架中”的数量并局部更新视图
          this.recalculateActiveCount(itemId, isChecked);
        } else {
          wx.showToast({ title: '操作失败', icon: 'none' });
          this.fetchMallItems(); // 如果失败，强行刷回原来的状态
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'none' });
        this.fetchMallItems(); // 回退状态
      }
    });
  },

  // 局部更新视图，避免每次拨动开关都向后端请求刷新整个列表，提升性能
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

  // 跳转到发布新奖品页面
  goToAddMallItem: function() {
    wx.navigateTo({
      url: '/pages/teacher/mall_add'
    });
  }
});