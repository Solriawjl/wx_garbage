// pages/result/result.js
// 引入同声传译插件和内部音频上下文
const plugin = requirePlugin("WechatSI");
const innerAudioContext = wx.createInnerAudioContext();

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
    putGuidance: '',
    
    // 教育闭环与细分指导字段
    harmDescription: '',
    processMethod: '',
    subGuidance: '',
    
    // 猜你想扔的具体物品列表
    recommendItems: [],
    
    // 用于控制专属提示弹窗的变量
    showTipModal: false,
    currentTipTitle: '',
    currentTipContent: ''
  },

  onLoad: function (options) {
    const fromHistory = options.isFromHistory === 'true';    // 获取历史页面传来的标记
    const fromTip = options.isFromTip === 'true'; // 获取小贴士标记
    const that = this; // 保存 this 指向
    // 将加密的参数解密回中文！
    const realKeyword = decodeURIComponent(options.keyword);
    
    // 微信小程序中，上个页面 url 里带的参数会放在 options 里
    if (options.keyword) {
      // 场景 A：如果是文字搜索过来的
      console.log("执行搜索逻辑，关键词：", realKeyword);
      this.setData({
        isFromSearch: true,
        isFromHistory: fromHistory, //存入data
        isFromTip: fromTip,
        itemName: realKeyword + ' (查询中...)',
        itemImageUrl: '/images/null.png', // 搜索时可以用一个通用图标占位
      });

      wx.showLoading({ title: '检索中...' });

      // 2. 发起真实的 GET 请求调用后端搜索接口
      wx.request({
        url: 'http://192.168.0.126:8000/api/search', // 你的 FastAPI 后端地址
        method: 'GET',
        data: {
          keyword: realKeyword
        },
        success: (res) => {
          wx.hideLoading();
          const resData = res.data;

          if (resData.code === 200) {
            // 查到了，把后端返回的真实数据渲染到页面上
            const searchResult = resData.data;
            // 优先获取特定物品的 tips，没有则用大类指导兜底
            const finalGuidance = searchResult.tips ? searchResult.tips : searchResult.put_guidance;
            
            that.setData({
              itemName: searchResult.item_name, 
              itemImageUrl: searchResult.image_url,
              categoryName: searchResult.category_name,
              categoryClass: searchResult.category_class,
              ecoValue: searchResult.eco_value,
              putGuidance: finalGuidance, // 使用判断后的指导文本
              
              // ✨ 接收教育闭环新字段（修复换行符问题）
              harmDescription: searchResult.harm_description || '',
              processMethod: searchResult.process_method || '',
              subGuidance: (searchResult.sub_guidance || '').replace(/\\n/g, '\n')
            });       
            // 让语音播报也读专属的 tips
            that.generateAndPlayVoice(searchResult.item_name, searchResult.category_name, finalGuidance, true, true);
          } else if (resData.code === 404) {
            // 没查到该物品
            that.setData({ 
              itemName: realKeyword + ' (未收录)' ,
              categoryClass:'harmful',
              categoryName:"未知"
            });
            // 触发语音：未收录
            that.generateAndPlayVoice(realKeyword, "未知", false, true);
            wx.showModal({
              title: '抱歉',
              content: resData.message, 
              confirmText: '去反馈',
              cancelText: '取消',
              success(modalRes) {
                if (modalRes.confirm) {
                  wx.navigateTo({ url: '/pages/feedback/feedback' });
                }
              }
            });
          }
        },
        fail: (err) => {
          wx.hideLoading();
          wx.showToast({ title: '网络请求失败', icon: 'error' });
        }
      });
    } else if (options.imagePath) {
      // 场景 B：如果是拍照或上传图片过来的
      console.log("执行图片识别逻辑，图片路径：", decodeURIComponent(options.imagePath));
      // 从缓存中捞出刚才存的后端返回的完整结果
      const aiResult = wx.getStorageSync('tempAiResult') || {};
      console.log("前端接收到的完整 AI 结果:", aiResult);
      this.setData({
        isFromSearch: false, // 切换为拍照模式视图
        isFromHistory: fromHistory, // 存入data
        itemImageUrl: aiResult.image_path || decodeURIComponent(options.imagePath),
        categoryName: aiResult.category_name || '未知', 
        categoryClass: aiResult.category_class || '未知',
        accuracy: aiResult.confidence || '0', 
        ecoValue: aiResult.eco_value || '未知',
        putGuidance: aiResult.put_guidance || '未知',
        
        // 接收教育闭环与推荐新字段（修复换行符问题）
        harmDescription: aiResult.harm_description || '',
        processMethod: aiResult.process_method || '',
        subGuidance: (aiResult.sub_guidance || '').replace(/\\n/g, '\n'),
        recommendItems: aiResult.recommend_items || []
      });
      wx.removeStorageSync('tempAiResult');
      // 触发语音：AI 识别成功 (没有具体物品名，只报大类)
      this.generateAndPlayVoice('', this.data.categoryName, this.data.putGuidance, true, false);
    }
  },

  // 点击推荐物品展示专属 Tip 弹窗
  showRecommendTip: function(e) {
    const item = e.currentTarget.dataset.item;
    this.setData({
      showTipModal: true,
      currentTipTitle: item.item_name,
      currentTipContent: item.tips || '请按照大类规范进行投放哦。'
    });
  },

  // 关闭弹窗
  closeTipModal: function() {
    this.setData({ showTipModal: false });
  },

  // 页面卸载时（点左上角返回），立刻停止语音，防止在别的页面继续说话
  onUnload: function () {
    innerAudioContext.stop();
  },

  // 生成并播放语音
  generateAndPlayVoice: function(itemName, categoryName, putGuidance, isSuccess, isSearch) {
    let speakText = "";
    
    // 智能组合文案 (增加教育语气和目标垃圾桶提示)
    if (!isSuccess) {
      speakText = `抱歉，AI 小助手暂未收录 ${itemName}，您可以尝试提交反馈。`;
    } else if (isSearch) {
      speakText = `为您查到：${itemName}，是我们的${categoryName}。请将它投入【${categoryName}桶】中。投放建议：${putGuidance}`;
    } else {
      speakText = `AI 小助手观察发现，这是${categoryName}。请将它投入【${categoryName}桶】中。投放建议：${putGuidance}`;
    }

    // 调用腾讯同声传译接口
    plugin.textToSpeech({
      lang: "zh_CN", 
      tts: true,
      content: speakText,
      success: (res) => {
        console.log("语音合成成功，准备播放：", speakText);
        innerAudioContext.src = res.filename; 
        innerAudioContext.playbackRate = 1.2;
        innerAudioContext.play();             
      },
      fail: (res) => {
        console.error("语音合成失败", res);
      }
    });
  },

  // 绑定给 WXML 中“重播语音”按钮的方法
  playVoice: function() {
    if (innerAudioContext.src) {
      innerAudioContext.stop(); // 先停止当前的
      innerAudioContext.play(); // 重新开始播放
      wx.showToast({ title: '重新播报', icon: 'none' });
    } else {
      wx.showToast({ title: '语音加载中', icon: 'loading' });
    }
  },

  // 点击放大全屏预览图片
  previewImage: function() {
    const url = this.data.itemImageUrl;
    if (!url) return; // 如果图片还没加载出来，就不执行
    
    wx.previewImage({
      current: url,  
      urls: [url]    
    });
  },

  // 统一的返回上一页操作
  goBack: function() {
    if (!this.data.isFromSearch && !this.data.isFromHistory && !this.data.isFromTip) {
      wx.setStorageSync('autoTriggerCamera', true);
    }
    wx.navigateBack({ delta: 1 });
  },

  // 跳转到纠错反馈页
  goToFeedback: function() {
    const itemName = this.data.itemName || this.data.keyword || '未知物品'; 
    const categoryName = this.data.categoryName || '未知分类';
    const imagePath = this.data.itemImageUrl ? encodeURIComponent(this.data.itemImageUrl) : '';
    const isSearch = this.data.isFromSearch ? 'true' : 'false';
    wx.navigateTo({
      url: `/pages/feedback/feedback?itemName=${encodeURIComponent(itemName)}&categoryName=${encodeURIComponent(categoryName)}&imagePath=${imagePath}&isSearch=${isSearch}`
    });
  }
})