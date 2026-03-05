// pages/feedback/feedback.js
Page({
  data: {
    imagePath: '',       // 出错的图片路径
    originalResult: '',  // 原来的错误识别结果
    categories: ['可回收物', '厨余垃圾', '有害垃圾', '其他垃圾'], // 四大类
    selectedCategory: '', // 用户选中的正确分类
    realItemName: ''      // 用户填写的具体物品名
  },

  onLoad: function (options) {
    // 接收从结果页传过来的参数
    // 假设在上一个页面的跳转是：url: `/pages/feedback/feedback?imagePath=xxx&result=可回收物`
    this.setData({
      imagePath: options.imagePath ? decodeURIComponent(options.imagePath) : '/images/temp_money.png',
      originalResult: options.result || '未知分类'
    });
  },

  // 点击九宫格选择分类
  onSelectCategory: function(e) {
    const cat = e.currentTarget.dataset.category;
    this.setData({
      selectedCategory: cat
    });
  },

  // 监听物品名称输入
  onInputItemName: function(e) {
    this.setData({
      realItemName: e.detail.value
    });
  },

  // 提交反馈
  submitFeedback: function() {
    // 防呆拦截：必须选择一个分类才能提交
    if (!this.data.selectedCategory) {
      wx.showToast({
        title: '请先选择正确的分类',
        icon: 'none'
      });
      return;
    }

    // 这里是模拟数据提交到服务器的动作
    const feedbackData = {
      image: this.data.imagePath,
      wrongResult: this.data.originalResult,
      correctCategory: this.data.selectedCategory,
      itemName: this.data.realItemName
    };
    
    console.log("即将提交的纠错数据（非常适合用来重训练）：", feedbackData);

    // 提交成功的反馈动画
    wx.showToast({
      title: '感谢您的纠错！',
      icon: 'success',
      duration: 2000,
      success: () => {
        // 2秒后自动返回结果页或首页
        setTimeout(() => {
          wx.navigateBack({ delta: 1 });
        }, 2000);
      }
    });
  }
})