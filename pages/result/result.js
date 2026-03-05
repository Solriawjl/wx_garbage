// pages/result/result.js
Page({
  data: {
    isFromSearch: true, // 默认假设是搜索
    isFromHistory: false, // 记录是否来自历史页面
    isFromTip: false, // 记录是否来自首页每日一问
    itemImageUrl: '',                //物品图片
    itemName: '',                     // 物品名称
    categoryName: '',           // 分类名称
    categoryClass: '',            // 控制颜色的类名
    accuracy: '0',                  // 置信度/准确率
    ecoValue: '',
    putGuidance: ''
  },

  onLoad: function (options) {
    const fromHistory = options.isFromHistory === 'true';    // 获取历史页面传来的标记
    const fromTip = options.isFromTip === 'true'; // 获取小贴士标记
    // 微信小程序中，上个页面 url 里带的参数会放在 options 里
    if (options.keyword) {
      // 场景 A：如果是文字搜索过来的
      console.log("执行搜索逻辑，关键词：", options.keyword);
      this.setData({
        isFromSearch: true,
        isFromHistory: fromHistory, //存入data
        isFromTip: fromTip,
        itemName: options.keyword,
        itemImageUrl: '/images/tab_home.png', // 搜索时可以用一个通用图标占位
        categoryName: '可回收物', // 这里后续调用后端接口获取
        categoryClass: 'recycle',
        accuracy: '--', // 搜索不需要置信度
        ecoValue: '搜索物品的特定环保价值...',
        putGuidance: '搜索物品的特定投放要求...'
      });
    } else if (options.imagePath) {
      // 场景 B：如果是拍照或上传图片过来的
      console.log("执行图片识别逻辑，图片路径：", decodeURIComponent(options.imagePath));
      this.setData({
        isFromSearch: false, // 切换为拍照模式视图
        isFromHistory: fromHistory, // 存入data
        itemImageUrl: decodeURIComponent(options.imagePath), // 直接把用户拍的图展示在卡片上
        categoryName: '厨余垃圾', // 这里后续调用模型接口获取
        categoryClass: 'kitchen',
        accuracy: '89.5', // 填入模型返回的置信度
        ecoValue: '厨余垃圾是指居民日常生活及食品加工、饮食服务、单位供餐等活动中产生的垃圾。',
        putGuidance: '请沥干水分后投放。'
      });
    }
  },

  // 重播语音
  playVoice: function() {
    console.log("播放语音：" + this.data.itemName + "属于" + this.data.categoryName);
    // 后续这里会接入 TTS 播放接口
  },

  // 统一的返回上一页操作 (无论是重新搜索还是重新识别，逻辑都是回退一页)
  goBack: function() {
    wx.navigateBack({
      delta: 1 // 如果从搜索页来，就退回搜索页；如果从首页拍照来，就退回首页
    });
  },

  // 跳转纠错反馈
  goToFeedback: function() {
    // 1. 获取当前页面所需的数据
    const isFromSearch = this.data.isFromSearch;
    const itemName = this.data.itemName;
    const categoryName = this.data.categoryName;
    
    // 如果是拍照获取的本地临时路径，URL 传参时必须用 encodeURIComponent 编码，否则可能引发解析错误
    const imagePath = encodeURIComponent(this.data.itemImageUrl);

    // 2. 动态拼接“原识别结果”
    // 搜索场景下，告诉用户是哪个词搜错了（例如：钱币 - 可回收物）
    // 拍照场景下，直接告诉用户是被错认成了什么（例如：可回收物）
    const originalResult = isFromSearch ? `${itemName} (${categoryName})` : categoryName;

    // 3. 带着完整的上下文参数跳转到反馈页
    wx.navigateTo({
      url: `/pages/feedback/feedback?isFromSearch=${isFromSearch}&itemName=${itemName}&imagePath=${imagePath}&result=${originalResult}`
    });
  }
})