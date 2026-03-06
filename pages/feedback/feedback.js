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
    // 1. 获取加密的原始字符串
    let rawItemName = options.itemName || options.result || '';
    let decodedItemName = rawItemName ? decodeURIComponent(rawItemName) : '未知分类';

    // 2. 兼容 imageUrl 和 imagePath 两种参数名
    let rawImageUrl = options.imageUrl || options.imagePath || '';

    this.setData({
      imagePath: rawImageUrl ? decodeURIComponent(rawImageUrl) : '/images/null.png',
      originalResult: decodedItemName 
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

  // 提交反馈到真实的 FastAPI 后端
  submitFeedback: function() {
    // 1. 必须选择一个分类才能提交
    if (!this.data.selectedCategory) {
      wx.showToast({ title: '请先选择正确的分类', icon: 'none' });
      return;
    }

    // 2. 获取用户 ID
    const userId = wx.getStorageSync('userId');
    if (!userId) {
      wx.showToast({ title: '登录异常，请重新登录', icon: 'none' });
      return;
    }

    // 3. 判断反馈类型 (有真实图片路径就是 image，否则就是 text 文字搜索反馈)
    let fbType = 'text';
    let imgUrl = null;
    if (this.data.imagePath && !this.data.imagePath.includes('null.png')) {
      fbType = 'image';
      imgUrl = this.data.imagePath; // 已经是腾讯云的链接了
    }

    // 4. 巧妙地拼接建议：把用户手填的具体物品名附带在分类后面
    let finalSuggestion = this.data.selectedCategory;
    if (this.data.realItemName.trim()) {
      finalSuggestion += ` (实际物品：${this.data.realItemName.trim()})`;
    }

    // 5. 组装发给后端的 payload
    const payload = {
      user_id: parseInt(userId),
      type: fbType,
      image_url: imgUrl,
      item_name: this.data.originalResult,
      suggestion: finalSuggestion
    };

    wx.showLoading({ title: '提交中...', mask: true });

    // 6. 发起真实的网络请求
    wx.request({
      url: 'http://127.0.0.1:8000/api/feedback/submit', // 你的后端接口地址
      method: 'POST',
      data: payload,
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          // 提交成功，显示你精心设计的成功动画
          wx.showToast({
            title: '感谢您的纠错！',
            icon: 'success',
            duration: 2000,
            success: () => {
              // 延迟 2 秒让用户看清提示，然后返回上一页
              setTimeout(() => {
                wx.navigateBack({ delta: 1 });
              }, 2000);
            }
          });
        } else {
          wx.showToast({ title: res.data.message || '提交失败', icon: 'error' });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({ title: '网络连接失败', icon: 'error' });
        console.error('提交反馈出错:', err);
      }
    });

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