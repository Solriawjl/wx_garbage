// pages/index/index.js
Page({
  data: {
    // 1. 每日一签相关的状态变量
    carouselTips: [],       // 存放轮播文章列表的数组
    currentTipData: {},                        // 存着完整的图文数据，准备喂给弹窗卡片
    isTipCardVisible: false                    // 控制卡片弹窗的开关状态
  },

  // 页面加载时执行
  onLoad: function () {
    this.fetchCarouselTips();
  },

  // ==========================================
  // 获取科普轮播列表
  // ==========================================
  fetchCarouselTips: function() {
    wx.request({
      url: 'http://192.168.0.126:8000/api/tips/carousel', // 调取新的批量随机接口
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200) {
          this.setData({
            carouselTips: res.data.data // 将5条数据塞入轮播数组
          });
        }
      },
      fail: (err) => {
        console.error("获取科普轮播失败", err);
      }
    });
  },

  // 点击轮播里的某一条，弹出科普卡片
  showTipCard: function(e) {
    // 从点击的标签上（wxml里的 data-tip="{{item}}"）拿到这一条的具体数据
    const clickedTip = e.currentTarget.dataset.tip;
    
    if (clickedTip) {
      this.setData({ 
        currentTipData: clickedTip,
        isTipCardVisible: true 
      });
    }
  },

  // 接收卡片组件的关闭事件，隐藏卡片
  hideTipCard: function() {
    this.setData({ isTipCardVisible: false });
  },

  // ==========================================
  // 搜索与 AI 拍照识别
  // ==========================================

  // 点击顶部搜索框
  goToSearch: function() {
    wx.navigateTo({
      url: '/pages/search/index'
    });
  },

  // 点击AI智能识别大按钮 (完全保留你的原始代码)
  onTapCamera: function() {
    const that = this;
    
    wx.showActionSheet({
      itemList: ['📸 立即拍照', '🖼️ 从手机相册选择'],
      success(res) {
        let sourceType = ['camera']; 
        if (res.tapIndex === 1) {
          sourceType = ['album']; 
        }
        
        wx.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sourceType: sourceType,
          success: (resImg) => {
            const tempFilePath = resImg.tempFiles[0].tempFilePath;
            
            const userId = wx.getStorageSync('userId');
            if (!userId) {
              wx.showToast({ title: '登录状态异常，请重启小程序', icon: 'none' });
              return;
            }

            wx.showLoading({ title: 'AI 引擎识别中...', mask: true });

            wx.uploadFile({
              url: 'http://192.168.0.126:8000/api/recognize', 
              filePath: tempFilePath,
              name: 'file', 
              formData: {
                'user_id': userId 
              },
              success: (uploadRes) => {
                wx.hideLoading(); 
                
                const resData = JSON.parse(uploadRes.data);
                console.log("FastAPI 后端返回的识别结果：", resData);

                if (resData.code === 200) {
                  const aiResult = resData.data; 
                  
                  wx.setStorageSync('tempAiResult', aiResult);
                  
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