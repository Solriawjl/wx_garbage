// index.js
Page({
  data: {
    // 预置的每日科普词汇列表
    tips: [
      '棉柔巾',
      '废旧电池',
      '碎玻璃',
      '没吃完的外卖',
      '过期的感冒药',
      '用过的纸巾'
    ],
    // 预置的 Banner 图片数组
    banners: [
      'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/page_index/banner/banner1.jpg', // 你原型图里的主插画
      'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/page_index/banner/banner2.jpg',     
      'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/page_index/banner/banner3.jpg',
      'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/page_index/banner/banner4.jpg',
      'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/page_index/banner/banner5.jpg'
    ]
  },

  onLoad: function (options) {
    // 页面加载时的逻辑
  },

  // 👇 添加这个跳转到搜索页的函数
  goToSearch: function() {
    wx.navigateTo({
      url: '/pages/search/search',
      success: function(res) {
        console.log("成功跳转到搜索页");
      },
      fail: function(err) {
        console.error("跳转失败，请检查 app.json 中是否注册了该页面", err);
      }
    })
  },

// 👇 1. 拍照识别
takePhoto: function() {
  wx.chooseMedia({
    count: 1, // 每次只允许拍摄 1 张图片
    mediaType: ['image'], // 限制只能选择图片
    sourceType: ['camera'], // 核心：强制调起手机相机
    camera: 'back', // 默认使用后置摄像头
    success: (res) => {
      // 获取拍摄照片的本地临时路径
      const tempFilePath = res.tempFiles[0].tempFilePath;
      console.log("拍照成功，图片路径：", tempFilePath);
      
      // 携带图片路径跳转到结果页进行识别
      wx.navigateTo({
        url: `/pages/result/result?imagePath=${encodeURIComponent(tempFilePath)}`
      });
    },
    fail: (err) => {
      console.log("用户取消了拍照或发生错误", err);
    }
  });
},

// 👇 2. 上传图片识别 [cite: 28]
uploadImage: function() {
  wx.chooseMedia({
    count: 1, // 每次只允许选择 1 张图片
    mediaType: ['image'], // 限制只能选择图片
    sourceType: ['album'], // 核心：强制调起手机本地相册
    success: (res) => {
      // 获取相册选取照片的本地临时路径
      const tempFilePath = res.tempFiles[0].tempFilePath;
      console.log("从相册选取成功，图片路径：", tempFilePath);
      
      // 同样携带图片路径跳转到结果页
      wx.navigateTo({
        url: `/pages/result/result?imagePath=${encodeURIComponent(tempFilePath)}`
      });
    },
    fail: (err) => {
      console.log("用户取消了选择相册或发生错误", err);
    }
  });
}
})
