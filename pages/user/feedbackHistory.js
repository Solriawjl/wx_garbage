// pages/user/feedbackHistory.js
Page({
  data: {
    feedbackList: [
      {
        id: '104',
        type: 'image', // 标记这是拍照反馈
        imageUrl: '/images/temp_bottle.png', // 假设你传了一张塑料瓶的照片
        itemName: '玻璃瓶', // AI 当时误判的结果
        suggestion: '可回收物 (这是个塑料瓶，不是玻璃)', // 用户的意见
        status: 0, 
        adminReply: '', 
        date: '2026-03-05 18:00'
      },
      {
        id: '103',
        type: 'text', // 新增：标记这是文字搜索反馈
        itemName: '外卖塑料盒', // 原搜索词
        suggestion: '其他垃圾',
        status: 0, 
        adminReply: '', 
        date: '2026-03-05 16:30'
      },
      {
        id: '102',
        type: 'image',
        imageUrl: '/images/temp_kitchen.png', // 假设这是大骨头的照片
        itemName: '厨余垃圾',
        suggestion: '其他垃圾 (大骨头很难降解)',
        status: 1, 
        adminReply: '感谢纠错！大骨头确实属于其他垃圾，我们已用您提供的图片对 AI 进行了重新训练，并为您补偿 5 积分！',
        date: '2026-03-02 09:15'
      }
    ]
  },

  onLoad: function (options) {
    console.log("加载反馈历史数据");
  },

  // 微信原生体验：点击缩略图全屏放大查看
  previewImage: function(e) {
    const currentUrl = e.currentTarget.dataset.url;
    wx.previewImage({
      urls: [currentUrl], // 可以传入一个数组，支持滑动切换，这里只有一张
      current: currentUrl 
    });
  }
})