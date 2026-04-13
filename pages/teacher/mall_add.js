Page({
  data: {
    imageUrl: '',      // 奖品图片 URL
    name: '',          // 奖品名称
    pointsPrice: '',   // 所需积分
    desc: '',          // 描述
    stockType: 'unlimited', // unlimited-无限量, limited-限量
    stockNum: ''       // 限量时的具体数字
  },

  // --- 输入双向绑定 ---
  onInputName(e) { this.setData({ name: e.detail.value }); },
  onInputPrice(e) { this.setData({ pointsPrice: e.detail.value }); },
  onInputDesc(e) { this.setData({ desc: e.detail.value }); },
  onInputStock(e) { this.setData({ stockNum: e.detail.value }); },

  changeStockType(e) {
    this.setData({ stockType: e.currentTarget.dataset.type });
  },

  // --- 📷 选择并上传图片 ---
  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.uploadImageToBackend(tempFilePath);
      }
    });
  },

  // 将图片上传到服务器并获取在线 COS 链接
  uploadImageToBackend(filePath) {
    wx.showLoading({ title: '图片上传中...' });

    wx.uploadFile({
      // 这里换成你后端的真实文件上传接口（复用你之前的即可）
      url: 'http://192.168.0.126:8000/api/upload', 
      filePath: filePath,
      name: 'file', // 后端接收文件的字段名
      success: (res) => {
        wx.hideLoading();
        try {
          const data = JSON.parse(res.data);
          if (data.code === 200 && data.data && data.data.url) {
            // 假设你后端返回的是 {code: 200, data: { url: 'https://...' }}
            this.setData({ imageUrl: data.data.url });
            wx.showToast({ title: '上传成功', icon: 'success' });
          } else {
            wx.showToast({ title: '图片上传失败', icon: 'none' });
          }
        } catch (e) {
          // 如果你的后端没有专门的 /api/upload，在毕设阶段可以直接把 imageUrl 设置为一个默认的网图兜底：
          // this.setData({ imageUrl: 'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/default_gift.png' });
          wx.showToast({ title: '服务器未响应正确格式', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '网络或上传异常', icon: 'none' });
      }
    });
  },

  // --- 🚀 提交表单发布奖品 ---
  submitForm() {
    const { imageUrl, name, pointsPrice, desc, stockType, stockNum } = this.data;

    // 1. 基础表单校验
    if (!imageUrl) return wx.showToast({ title: '请上传奖品图片', icon: 'none' });
    if (!name.trim()) return wx.showToast({ title: '请填写奖品名称', icon: 'none' });
    if (!pointsPrice || pointsPrice <= 0) return wx.showToast({ title: '请填写正确的积分', icon: 'none' });
    
    let finalStock = -1; // 默认 -1 表示无限量
    if (stockType === 'limited') {
      if (!stockNum || stockNum <= 0) return wx.showToast({ title: '请填写有效的库存数', icon: 'none' });
      finalStock = parseInt(stockNum);
    }

    const teacherId = wx.getStorageSync('userId');

    wx.showLoading({ title: '发布中...', mask: true });

    // 2. 调用后端发布接口
    wx.request({
      url: `http://192.168.0.126:8000/api/teacher/mall/add?teacher_id=${teacherId}`,
      method: 'POST',
      data: {
        name: name,
        desc: desc || '',
        points_price: parseInt(pointsPrice),
        image_url: imageUrl,
        stock: finalStock,
        teacher_id: teacherId
      },
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          wx.showToast({ title: '🎉 发布成功', icon: 'success' });
          // 延迟返回上一页，体验更好
          setTimeout(() => {
            wx.navigateBack({ delta: 1 }); 
            // 返回后，上一页(mall_manage)的 onShow 会自动触发，从而刷新列表显示新奖品！
          }, 1500);
        } else {
          wx.showToast({ title: res.data.message || '发布失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '网络异常', icon: 'none' });
      }
    });
  }
});