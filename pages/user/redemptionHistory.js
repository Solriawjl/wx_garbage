Page({
  data: {
    historyList: []
  },

  onShow: function () {
    this.loadHistory();
  },

  loadHistory: function() {
    const userId = wx.getStorageSync('userId');
    if (!userId) return;

    wx.showLoading({ title: '加载中...' });
    wx.request({
      url: 'http://192.168.0.126:8000/api/user/redemption_history',
      data: { user_id: userId },
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          this.setData({ historyList: res.data.data });
        }
      }
    });
  },
  // 处理退货反悔逻辑 (防刷)
  handleRefund: function (e) {
    const { id, name, points } = e.currentTarget.dataset;
    const userId = wx.getStorageSync('userId');
    if (!userId) return;

    // 1. 弹出让用户确认的“反悔”提示框
    wx.showModal({
      title: '🎁 确认退货？',
      content: `是否要把用 ${points} 积分兑换的【${name}】退货？积分将原路返回。`,
      confirmText: '确定反悔',
      confirmColor: '#e53935', // 使用刺眼的红色作为确认，提醒用户
      cancelText: '算了',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '退款中...' });
          
          // 2. 发起真实扣分和生成订单请求
          wx.request({
            // 注意：如果你后端运行地址不同，请修改这里
            url: 'http://192.168.0.126:8000/api/mall/refund', 
            method: 'POST',
            data: {
              user_id: parseInt(userId),
              redemption_id: parseInt(id)
            },
            success: (refundRes) => {
              wx.hideLoading();
              if (refundRes.data.code === 200) {
                // 退货成功，弹个表扬提示
                wx.showToast({
                  title: '反悔成功！积分已退回',
                  icon: 'none',
                  duration: 2500
                });
                
                // 3. 核心：更新本地缓存，防止个人中心积分不同步
                const newData = refundRes.data.data;
                wx.setStorageSync('totalScore', newData.new_score);
                wx.setStorageSync('currentTitle', newData.new_title);
                
                // 4. 核心：重新拉取最新记录列表 (已退款的订单会变成灰色)
                this.loadHistory();
              } else {
                // 如果后端校验失败（比如并并发导致的库存不足）
                wx.showToast({
                  title: refundRes.data.message,
                  icon: 'none',
                  duration: 2000
                });
              }
            },
            fail: () => {
              wx.hideLoading();
              wx.showToast({ title: '网络开小差了，退款失败', icon: 'none' });
            }
          });
        }
      }
    });
  }
})