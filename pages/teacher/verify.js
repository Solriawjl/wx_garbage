const app = getApp();

Page({
  data: {
    pendingOrders: [],
    isLoading: true
  },

  // 每次进入页面都刷新，确保数据最新
  onShow: function () {
    this.fetchPendingOrders();
  },

  onPullDownRefresh: function () {
    this.fetchPendingOrders(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 获取待核销列表
  fetchPendingOrders: function (cb) {
    wx.showLoading({ title: '加载订单中...' });
    const teacherId = wx.getStorageSync('userId');
    // 注意替换为真实后端 IP
    wx.request({
      url: `http://192.168.0.126:8000/api/teacher/pending_orders?teacher_id=${teacherId}`,
      method: 'GET',
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          this.setData({ 
            pendingOrders: res.data.data,
            isLoading: false
          });
        } else {
          wx.showToast({ title: '获取列表失败', icon: 'none' });
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

  // 🚀 核心交互：确认发放奖品 (防手抖防误触)
  handleVerify: function(e) {
    const orderId = e.currentTarget.dataset.id;
    const studentName = e.currentTarget.dataset.name;
    const itemName = e.currentTarget.dataset.item;
    const teacherId = wx.getStorageSync('userId');

    wx.showModal({
      title: '核销确认',
      content: `确定已将【${itemName}】发给【${studentName}】了吗？此操作不可撤销。`,
      confirmText: '确认发放',
      confirmColor: '#4CAF50',
      success: (res) => {
        if (res.confirm) {
          this.executeVerify(orderId, teacherId);
        }
      }
    });
  },

  // 执行真实核销请求
  executeVerify: function(orderId, teacherId) {
    wx.showLoading({ title: '处理中...', mask: true });

    wx.request({
      url: `http://192.168.0.126:8000/api/teacher/verify`,
      method: 'POST',
      data: {
        order_id: orderId,
        teacher_id: teacherId
      },
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          wx.showToast({ title: '🎉 发放成功', icon: 'success' });
          // 重新拉取列表，核销掉的订单会自动消失
          this.fetchPendingOrders();
        } else {
          wx.showToast({ title: res.data.message || '操作失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '网络异常', icon: 'none' });
      }
    });
  }
});