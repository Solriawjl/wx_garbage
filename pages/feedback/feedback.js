// pages/feedback/feedback.js
Page({
  data: {
    imagePath: '',
    originalItemName: '', // 原物品名（如：废电池）
    originalCategory: '', // 原分类名（如：可回收物）用于判断是否重复
    displayResult: '',    // 用于页面红框展示（如：废电池 —— 可回收物）
    categories: ['可回收物', '厨余垃圾', '有害垃圾', '其他垃圾'],
    selectedCategory: '',// 用户选中的正确分类
    realItemName: '',// 用户填写的具体物品名
    isSearch: false // 记录这到底是搜索还是拍照
  },

  onLoad: function (options) {
    // 1. 获取物品名称 (兼容 itemName 或 keyword)
    let rawItemName = options.itemName || options.keyword || '';
    let decodedItemName = rawItemName ? decodeURIComponent(rawItemName) : '';
    // 2. 获取原分类结果 (兼容 categoryName 或 result)
    let rawCategory = options.categoryName || options.result || '';
    let decodedCategory = rawCategory ? decodeURIComponent(rawCategory) : '';

    // 接收上个页面传来的暗号
    let isSearch = options.isSearch === 'true';

    // 3. 拼接展示结果 (物体名称 —— 类型)
    let displayStr = '未知分类';
    if (isSearch) {
      // 搜索/知识库进来的：名字 —— 分类
      displayStr = `${decodedItemName.replace(' (查询中...)', '')} —— ${decodedCategory}`;
    } else {
      // 拍照识别进来的：只存大类名字，干净利落
      displayStr = decodedCategory || decodedItemName || '未知分类'; 
    }

    let rawImageUrl = options.imageUrl || options.imagePath || '';

    this.setData({
      imagePath: rawImageUrl ? decodeURIComponent(rawImageUrl) : '/images/null.png',
      originalItemName: decodedItemName,
      originalCategory: decodedCategory,
      displayResult: displayStr,
      isSearch: isSearch // 存入 data 备用
    });
  },
  // 点击九宫格选择分类
  onSelectCategory: function(e) {
    const cat = e.currentTarget.dataset.category;
    this.setData({ selectedCategory: cat });
  },
  // 监听物品名称输入
  onInputItemName: function(e) {
    this.setData({ realItemName: e.detail.value });
  },
  // 提交反馈到真实的 FastAPI 后端
  submitFeedback: function() {
    if (!this.data.selectedCategory) {
      wx.showToast({ title: '请先选择正确的分类', icon: 'none' });
      return;
    }
    if (this.data.selectedCategory === this.data.originalCategory) {
      wx.showToast({ title: '纠错分类不能与原分类相同', icon: 'none' });
      return;
    }

    const userId = wx.getStorageSync('userId');
    if (!userId) {
      wx.showToast({ title: '登录异常，请重新登录', icon: 'none' });
      return;
    }

    // 现在只看暗号，不看有没有图片
    let fbType = this.data.isSearch ? 'text' : 'image';
    let imgUrl = null;
    
    // 只有是真正的拍照识别，才把图片发给后端保存
    if (fbType === 'image' && this.data.imagePath && !this.data.imagePath.includes('null.png')) {
      imgUrl = this.data.imagePath;
    }

    let finalSuggestion = this.data.selectedCategory;
    if (this.data.realItemName.trim()) {
      finalSuggestion += ` (实际物品：${this.data.realItemName.trim()})`;
    }

    const payload = {
      user_id: parseInt(userId),
      type: fbType,
      image_url: imgUrl,
      item_name: this.data.displayResult, 
      suggestion: finalSuggestion
    };

    wx.showLoading({ title: '提交中...', mask: true });

    wx.request({
      url: 'http://192.168.0.126:8000/api/feedback/submit',
      method: 'POST',
      data: payload,
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          wx.showToast({
            title: '提交成功，采纳后发奖',
            icon: 'success',
            duration: 2000,
            success: () => {
              setTimeout(() => { wx.navigateBack({ delta: 1 }); }, 2000);
            }
          });
        } else {
          wx.showToast({ title: res.data.message || '提交失败', icon: 'error' });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({ title: '网络连接失败', icon: 'error' });
      }
    });
  }
})