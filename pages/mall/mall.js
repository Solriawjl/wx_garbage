// pages/mall/mall.js
Page({
  data: {
    currentPoints: 0, 
    productList: [] // 初始为空，等待从后端加载
  },

  onShow: function () {
    // 商城只认小红花
    const currentScore = wx.getStorageSync('ecoCoin') || 0; 
    this.setData({ currentPoints: currentScore });
    this.loadMallItems();
  },

  // ==========================================
  // 获取真实的商品列表
  // ==========================================
  loadMallItems: function() {
    const userId = wx.getStorageSync('userId');
    wx.request({
      // 注意：确保这里的 IP 和你本地的 FastAPI 运行地址一致
      url: `http://192.168.0.126:8000/api/mall/items?user_id=${userId}`,
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200) {
          this.setData({
            productList: res.data.data
          });
        }
      },
      fail: (err) => {
        console.error("加载商品失败", err);
        wx.showToast({ title: '网络异常', icon: 'none' });
      }
    });
  },

  // ==========================================
  // 向后端发送真实的兑换请求
  // ==========================================
  handleRedeem: function (e) {
    const item = e.currentTarget.dataset.item;
    const currentPoints = this.data.currentPoints;

    // 1. 前端基础校验：是否还有库存
    if (item.stock === 0) {
      wx.showToast({ title: '手慢啦，商品已兑完', icon: 'none' });
      return;
    }

    // 2. 前端基础校验：小红花是否足够
    if (currentPoints < item.points) {
      wx.showToast({ title: '小红花不足，快去赚小红花吧！', icon: 'none' });
      return;
    }

    const userId = wx.getStorageSync('userId');
    if (!userId) {
      wx.showToast({ title: '请先登录哦', icon: 'none' });
      return;
    }

    // 3. 弹出确认框
    wx.showModal({
      title: '🎁 确认兑换',
      content: `将消耗 ${item.points} 小红花兑换【${item.name}】，是否继续？`,
      confirmColor: '#4CAF50',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '兑换中...' });
          
          // 4. 发起真实扣分和生成订单请求
          wx.request({
            url: 'http://192.168.0.126:8000/api/mall/redeem',
            method: 'POST',
            data: {
              user_id: parseInt(userId),
              item_id: item.id
            },
            success: (redeemRes) => {
              wx.hideLoading();
              if (redeemRes.data.code === 200) {
                wx.showToast({ title: '兑换成功！', icon: 'success', duration: 2500 });
                
                // 获取后端返回的最新小红花和称号，更新本地状态
                const newData = redeemRes.data.data;
                this.setData({ currentPoints: newData.new_score });
                wx.setStorageSync('totalScore', newData.new_score);
                wx.setStorageSync('currentTitle', newData.new_title);
                
                // 重新拉取商品列表（因为库存可能发生了变化）
                this.loadMallItems();
              } else {
                // 如果后端校验失败（比如并发导致的库存不足）
                wx.showToast({ title: redeemRes.data.message, icon: 'none', duration: 2000 });
              }
            },
            fail: () => {
              wx.hideLoading();
              wx.showToast({ title: '服务器开小差了', icon: 'none' });
            }
          });
        }
      }
    });
  },
  // 前往兑换记录页面
  goToHistory: function() {
    wx.navigateTo({
      url: '/pages/user/redemptionHistory' // 我们下一步要建的页面
    });
  },
})