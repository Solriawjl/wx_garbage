// pages/index/index.js
Page({
  data: {
    dailyItem: '碎玻璃' // 默认占位符
  },

  // 每次进入页面刷新每日一问
  onShow: function () {
    const items = ['碎玻璃', '废弃手机', '外卖包装盒', '过期感冒药', '吃剩的骨头', '旧衣服', '易拉罐', '陶瓷碎片'];
    const randomItem = items[Math.floor(Math.random() * items.length)];
    this.setData({
      dailyItem: randomItem
    });
  },

  // 点击顶部搜索框
  goToSearch: function() {
    wx.navigateTo({
      url: '/pages/search/index'
    });
  },

  // 点击每日一问的卡片，直接跳转结果页看答案
  goToRandomResult: function() {
    wx.navigateTo({
      url: `/pages/result/result?keyword=${this.data.dailyItem}&isFromTip=true`
    });
  },

  // 🎯 核心逻辑：点击 AI 智能识别大按钮
  onTapCamera: function() {
    const that = this;
    
    // 弹出底部选择菜单 (极其原生的 iOS/Android 体验)
    wx.showActionSheet({
      itemList: ['📸 立即拍照', '🖼️ 从手机相册选择'],
      success(res) {
        let sourceType = ['camera']; // 默认相机
        if (res.tapIndex === 1) {
          sourceType = ['album']; // 如果选了第二项，则是相册
        }
        
        // 调用微信原生相机/相册接口
        wx.chooseMedia({
          count: 1, // 只能选一张
          mediaType: ['image'],
          sourceType: sourceType,
          success: (resImg) => {
            const tempFilePath = resImg.tempFiles[0].tempFilePath;
            
            // 拿到图片路径后，跳转到我们写好的结果页
            wx.navigateTo({
              url: `/pages/result/result?imagePath=${encodeURIComponent(tempFilePath)}`
            });
          }
        });
      }
    });
  }
})