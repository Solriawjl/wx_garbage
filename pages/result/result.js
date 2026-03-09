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
    putGuidance: ''
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
            that.setData({
              itemName: searchResult.item_name, 
              itemImageUrl: searchResult.image_url,
              categoryName: searchResult.category_name,
              categoryClass: searchResult.category_class,
              ecoValue: searchResult.eco_value,
              putGuidance: searchResult.put_guidance
            });
            // 触发语音：搜索成功
            that.generateAndPlayVoice(searchResult.item_name, searchResult.category_name, searchResult.put_guidance, true, true);
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
              content: resData.message, // 弹出后端传来的提示：“抱歉，词库暂未收录...”
              confirmText: '去反馈',
              cancelText: '取消',
              success(modalRes) {
                if (modalRes.confirm) {
                  // 用户点击去反馈，可以跳转到我们之前的反馈提交页
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
      this.setData({
        isFromSearch: false, // 切换为拍照模式视图
        isFromHistory: fromHistory, // 存入data
        itemImageUrl: aiResult.image_path || decodeURIComponent(options.imagePath),
        categoryName: aiResult.category_name || '未知', 
        categoryClass: aiResult.category_class || '未知',
        accuracy: aiResult.confidence || '0', // 填入模型返回的置信度
        ecoValue: aiResult.eco_value || '未知',
        putGuidance: aiResult.put_guidance || '未知'
      });
      wx.removeStorageSync('tempAiResult');
      // 触发语音：AI 识别成功 (没有具体物品名，只报大类)
      this.generateAndPlayVoice('', this.data.categoryName, this.data.putGuidance, true, false);
    }
  },

  // 页面卸载时（点左上角返回），立刻停止语音，防止在别的页面继续说话
  onUnload: function () {
    innerAudioContext.stop();
  },

  // 生成并播放语音
  generateAndPlayVoice: function(itemName, categoryName, putGuidance, isSuccess, isSearch) {
    let speakText = "";
    
    // 智能组合文案
    if (!isSuccess) {
      speakText = `抱歉，词库暂未收录 ${itemName}，您可以尝试提交反馈。`;
    } else if (isSearch) {
      speakText = `为您查到：${itemName}，它属于 ${categoryName}。投放建议：${putGuidance}`;
    } else {
      speakText = `AI 识别结果为：${categoryName}。投放建议：${putGuidance}`;
    }

    // 调用腾讯同声传译接口
    plugin.textToSpeech({
      lang: "zh_CN", 
      tts: true,
      content: speakText,
      success: (res) => {
        console.log("语音合成成功，准备播放：", speakText);
        innerAudioContext.src = res.filename; // 设置音频源为云端生成的临时文件
        // 调整播放倍速（范围 0.5 ~ 2.0，默认 1.0）
        innerAudioContext.playbackRate = 1.2;
        innerAudioContext.play();             // 自动播放！
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

  // 统一的返回上一页操作
  goBack: function() {
    // 如果不是搜索、不是历史、不是贴士，说明就是“拍照识别”进来的
    if (!this.data.isFromSearch && !this.data.isFromHistory && !this.data.isFromTip) {
      // 回到首页，弹出拍照页
      wx.setStorageSync('autoTriggerCamera', true);
    }

    wx.navigateBack({
      delta: 1 
    });
  },

  // 跳转到纠错反馈页
  goToFeedback: function() {
    // 1. 获取当前页面所需的数据 (兼容不同的命名习惯)
    const itemName = this.data.itemName || this.data.keyword || '未知物品'; 
    const categoryName = this.data.categoryName || '未知分类';
    
    // 2. 对图片路径进行安全编码（如果没有图片路径，则传空）
    const imagePath = this.data.itemImageUrl ? encodeURIComponent(this.data.itemImageUrl) : '';
    // 3. 带着完整的上下文参数跳转到反馈页
    wx.navigateTo({
      url: `/pages/feedback/feedback?itemName=${encodeURIComponent(itemName)}&categoryName=${encodeURIComponent(categoryName)}&imagePath=${imagePath}`
    });
  }
})