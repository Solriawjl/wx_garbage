// pages/user/recognizeHistory.js
Page({
  data: {
    historyList: [],
    showDetailModal: false, // 控制详情弹窗的开关
    currentDetailItem: {}   // 存放当前点击的历史记录数据
  },

  onLoad: function (options) {
    this.fetchHistory();
  },

  fetchHistory: function() {
    const userId = wx.getStorageSync('userId');
    wx.showLoading({ title: '加载中...' });
    
    wx.request({
      url: `http://127.0.0.1:8000/api/user/recognize_history?user_id=${userId}`,
      method: 'GET',
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          this.setData({ historyList: res.data.data });
        }
      }
    });
  },

  // 打开弹窗
  goToDetail: function(e) {
    const item = e.currentTarget.dataset.item;
    this.setData({
      currentDetailItem: item,
      showDetailModal: true
    });
  },

  // 关闭弹窗
  closeDetail: function() {
    this.setData({ showDetailModal: false });
  },

  // 防止点击卡片内部穿透关闭弹窗
  preventTouch: function() {

  },

  //跳转反馈界面
  goToFeedback: function() {
    this.closeDetail(); // 先关闭当前弹窗
    
    const item = this.data.currentDetailItem;
    wx.navigateTo({
      url: `/pages/feedback/feedback?imageUrl=${encodeURIComponent(item.imageUrl)}&itemName=${encodeURIComponent(item.itemName)}`
    });
  },

  // 点击筛选按钮
  onFilter: function() {
    wx.showActionSheet({
      itemList: ['全部记录', '可回收物', '厨余垃圾', '有害垃圾', '其他垃圾'],
      success: (res) => {
        console.log("用户选择了筛选条件索引：", res.tapIndex);
        // 这里可以编写过滤 historyList 数组的逻辑
        wx.showToast({
          title: '筛选功能开发中',
          icon: 'none'
        });
      }
    });
  }
})