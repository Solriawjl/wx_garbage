// pages/user/wrongBook.js
Page({
  data: {
    // 模拟的全局错题本数据（原型阶段使用）
    wrongList: [
      { name: '废旧干电池', userSelect: '其他垃圾', correctAnswer: '有害垃圾' },
      { name: '大骨头', userSelect: '厨余垃圾', correctAnswer: '其他垃圾' },
      { name: '用过的纸巾', userSelect: '可回收物', correctAnswer: '其他垃圾' },
      { name: '碎玻璃', userSelect: '其他垃圾', correctAnswer: '可回收物' },
      { name: '过期感冒药', userSelect: '其他垃圾', correctAnswer: '有害垃圾' }
    ]
  },

  onLoad: function (options) {
    // 真实项目中，这里应调用 wx.getStorageSync('globalWrongBook')
    console.log("加载错题本数据");
  },

  // 移除单道错题
  removeItem: function(e) {
    const index = e.currentTarget.dataset.index;
    
    // 弹窗二次确认
    wx.showModal({
      title: '提示',
      content: '确定已经记住这道题的分类了吗？',
      confirmText: '记住了',
      cancelText: '再看看',
      success: (res) => {
        if (res.confirm) {
          // 从数组中删除这一项
          let newList = this.data.wrongList;
          newList.splice(index, 1);
          
          this.setData({
            wrongList: newList
          });

          // 真实项目中需要将 newList 存回 Storage
          wx.showToast({
            title: '已移除',
            icon: 'success'
          });
        }
      }
    });
  },

  // 一键清空错题本
  clearAll: function() {
    wx.showModal({
      title: '一键清空',
      content: '确定要清空所有错题记录吗？清空后无法恢复哦。',
      confirmColor: '#F44336', // 红色警告色
      success: (res) => {
        if (res.confirm) {
          this.setData({
            wrongList: []
          });
          // 真实项目中清理 Storage
          wx.showToast({
            title: '错题本已清空',
            icon: 'success'
          });
        }
      }
    });
  }
})