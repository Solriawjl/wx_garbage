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

  // 点击AI智能识别大按钮
  onTapCamera: function() {
    const that = this;
    
    // 1. 弹出底部选择菜单
    wx.showActionSheet({
      itemList: ['📸 立即拍照', '🖼️ 从手机相册选择'],
      success(res) {
        let sourceType = ['camera']; // 默认相机
        if (res.tapIndex === 1) {
          sourceType = ['album']; // 如果选了第二项，则是相册
        }
        
        // 2. 调用微信原生相机/相册接口获取图片
        wx.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sourceType: sourceType,
          success: (resImg) => {
            const tempFilePath = resImg.tempFiles[0].tempFilePath;
            
            // 3. 从本地缓存获取登录时存的 userId
            const userId = wx.getStorageSync('userId');
            if (!userId) {
              wx.showToast({ title: '登录状态异常，请重启小程序', icon: 'none' });
              return;
            }

            // 4. 开启炫酷的加载动画
            wx.showLoading({ title: 'AI 引擎识别中...', mask: true });

            // 5. 真正发起网络请求，把图片扔给你的 FastAPI 后端
            wx.uploadFile({
              url: 'http://127.0.0.1:8000/api/recognize', // 你的本地后端接口地址
              filePath: tempFilePath,
              name: 'file', // 这里的'file'必须跟FastAPI里的`file: UploadFile = File(...)`名字一模一样！
              formData: {
                'user_id': userId // 这里的key必须跟FastAPI里的`user_id: int = Form(...)`一模一样！
              },
              success: (uploadRes) => {
                wx.hideLoading(); // 关掉加载动画
                
                // wx.uploadFile 返回的 data 是字符串，必须手动解析成 JSON 对象
                const resData = JSON.parse(uploadRes.data);
                console.log("FastAPI 后端返回的识别结果：", resData);

                if (resData.code === 200) {
                  const aiResult = resData.data; // 拿到在后端mock_result里的假数据
                  
                  // 由于大段文本不适合放进 URL，把它存进临时缓存
                  wx.setStorageSync('tempAiResult', aiResult);
                  
                  // 6、 URL 里只带图片路径即可，其他数据去缓存里拿
                  wx.navigateTo({
                    url: `/pages/result/result?imagePath=${encodeURIComponent(tempFilePath)}`
                  });
                } else {
                  wx.showToast({ title: '识别失败', icon: 'error' });
                }
              },
              fail: (err) => {
                wx.hideLoading();
                console.error("上传失败，请检查 FastAPI 是否报错：", err);
                wx.showToast({ title: '网络连接失败', icon: 'error' });
              }
            });
          }
        });
      }
    });
  }
})