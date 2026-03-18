// pages/index/index.js

let inferenceSession = null;

const localCategoryDict = [
  { category_name: "厨余垃圾", category_class: "kitchen", eco_value: "处理后可作为天然肥料或沼气发电", put_guidance: "请沥干水分后投放，注意不要混入塑料袋等硬物。" },
  { category_name: "可回收物", category_class: "recyclable", eco_value: "可进入再生资源回收体系，变废为宝", put_guidance: "请尽量保持清洁干燥，立体包装请压扁后投放。" },
  { category_name: "有害垃圾", category_class: "harmful", eco_value: "需特殊安全处理，防止污染环境", put_guidance: "请轻投轻放，易碎物品连带包装或包裹后投放。" },
  { category_name: "其他垃圾", category_class: "other", eco_value: "通常通过焚烧发电或卫生填埋处理", put_guidance: "请沥干水分，难以分辨类别的垃圾均可投放到此桶。" }
];

Page({
  data: {
    greetingText: '你好',     // 动态问候语
    userInfo: null,         // 用于存储用户真实的头像和昵称
    carouselTips: [],       
    currentTipData: {},      
    isTipCardVisible: false,  
    isModelReady: false 
  },

  onLoad: function () {
    this.fetchCarouselTips();
    this.initEdgeAI(); 
  },

  // 把获取时间问候和获取用户信息都放在 onShow 里，保证每次回到首页都是最新状态
  onShow: function () {
    this.setGreeting(); 
    this.checkUserInfo(); 

    const autoTrigger = wx.getStorageSync('autoTriggerCamera');
    if (autoTrigger) {
      wx.removeStorageSync('autoTriggerCamera');
      setTimeout(() => { this.onTapCamera(); }, 300);
    }
  },

  // 对齐个人页的数据存储逻辑，使用 userId 专属缓存
  checkUserInfo: function() {
    const userId = wx.getStorageSync('userId');
    
    // 如果存在 userId，说明处于登录状态
    if (userId) {
      // 用个人页保存时一模一样的钥匙去取数据
      const savedAvatar = wx.getStorageSync(`avatar_${userId}`);
      const savedNickname = wx.getStorageSync(`nickname_${userId}`);
      
      // 只要存了头像或昵称中的任意一个，我们就把它展示出来
      if (savedAvatar || savedNickname) {
        this.setData({
          userInfo: {
            avatarUrl: savedAvatar || '', // 取不到就传空，WXML 会自动降级显示小绿芽
            nickName: savedNickname || '' // 取不到就传空，WXML 会自动显示"环保小卫士"
          }
        });
      } else {
        // 登录了但什么都没设置，依然显示默认
        this.setData({ userInfo: null });
      }
    } else {
      // 未登录状态
      this.setData({ userInfo: null }); 
    }
  },

  // 动态时间问候逻辑 (保持不变，只是挪了调用位置)
  setGreeting: function() {
    const hour = new Date().getHours();
    let text = '你好';
    if (hour < 9) text = '早上好';
    else if (hour < 12) text = '上午好';
    else if (hour < 14) text = '中午好';
    else if (hour < 18) text = '下午好';
    else text = '晚上好';
    this.setData({ greetingText: text });
  },

  // --- 端侧 AI 初始化 ---
  initEdgeAI: function() {
    const modelUrl = 'https://images-1408449839.cos.ap-chengdu.myqcloud.com/weights/mobilenetv3_edge_v1_2.onnx';
    const localPath = `${wx.env.USER_DATA_PATH}/mobilenetv3_edge_v1_2.onnx`; 
    const fs = wx.getFileSystemManager();
    fs.access({
      path: localPath,
      success: () => { this.createInferenceSession(localPath); },
      fail: () => {
        wx.downloadFile({
          url: modelUrl, filePath: localPath,
          success: (res) => { this.createInferenceSession(localPath); }
        });
      }
    });
  },

  createInferenceSession: function(modelPath) {
    try {
      inferenceSession = wx.createInferenceSession({ model: modelPath, precisionLevel: 4, allowNPU: true, allowQuantize: false });
      inferenceSession.onLoad(() => { this.setData({ isModelReady: true }); });
    } catch (e) { console.error("Session 异常", e); }
  },

  processImageToTensor: function(tempFilePath) {
    return new Promise((resolve, reject) => {
      wx.createSelectorQuery().select('#aiCanvas').fields({ node: true, size: true }).exec((res) => {
        if (!res[0]) return reject("找不到画布");
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        const img = canvas.createImage(); 
        img.src = tempFilePath;
        img.onload = () => {
          const w = img.width; const h = img.height; const max_wh = Math.max(w, h);
          ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, 224, 224);
          const scale = 224 / max_wh;
          const drawW = w * scale; const drawH = h * scale;
          const dx = (224 - drawW) / 2; const dy = (224 - drawH) / 2;
          ctx.drawImage(img, dx, dy, drawW, drawH);
          const imageData = ctx.getImageData(0, 0, 224, 224);
          const data = imageData.data; 
          const mean = [0.485, 0.456, 0.406]; const std = [0.229, 0.224, 0.225];
          const float32Data = new Float32Array(3 * 224 * 224);
          let j = 0;
          for (let i = 0; i < data.length; i += 4) {
            float32Data[j] = ((data[i] / 255.0) - mean[0]) / std[0];             
            float32Data[j + 224*224] = ((data[i+1] / 255.0) - mean[1]) / std[1]; 
            float32Data[j + 2*224*224] = ((data[i+2] / 255.0) - mean[2]) / std[2]; 
            j++;
          }
          resolve(float32Data.buffer); 
        };
        img.onerror = (e) => reject(e);
      });
    });
  },

  onTapCamera: function() {
    const that = this;
    const userId = wx.getStorageSync('userId');
    if (!userId) { wx.showToast({ title: '请先登录', icon: 'none' }); return; }
    if (!this.data.isModelReady) { wx.showToast({ title: 'AI引擎初始化中，请稍后...', icon: 'none' }); return; }
    
    wx.showActionSheet({
      itemList: ['立即拍照', '从手机相册选择'],
      success(res) {
        let sourceType = res.tapIndex === 1 ? ['album'] : ['camera']; 
        wx.chooseMedia({
          count: 1, mediaType: ['image'], sourceType: sourceType, sizeType: ['compressed'],
          success: async (resImg) => {
            const tempFilePath = resImg.tempFiles[0].tempFilePath;
            wx.showLoading({ title: 'AI 识别中...', mask: true }); 
            try {
              const tensorBuffer = await that.processImageToTensor(tempFilePath);
              inferenceSession.run({
                'input': { type: 'float32', data: tensorBuffer, shape: [1, 3, 224, 224] }
              }).then(inferRes => {
                const outputs = new Float32Array(inferRes['output'].data);
                const maxVal = Math.max(...outputs);
                let sumExp = 0; let probs = [];
                for(let i=0; i<outputs.length; i++) { const e = Math.exp(outputs[i] - maxVal); probs.push(e); sumExp += e; }
                probs = probs.map(p => p / sumExp);
                let maxProb = -1; let predictedIdx = -1;
                for(let i=0; i<probs.length; i++){ if(probs[i] > maxProb){ maxProb = probs[i]; predictedIdx = i; } }
                const confidence = parseFloat((maxProb * 100).toFixed(2));
                
                wx.getNetworkType({
                  success (res) {
                    if (res.networkType !== 'none') {
                      wx.uploadFile({
                        url: 'http://192.168.0.126:8000/api/recognize/edge', 
                        filePath: tempFilePath, name: 'file', 
                        formData: { 'user_id': userId, 'predicted_idx': predictedIdx, 'confidence': confidence },
                        success: (uploadRes) => {
                           wx.hideLoading(); 
                           const backendData = JSON.parse(uploadRes.data);
                           if (backendData.code === 200) {
                             wx.setStorageSync('tempAiResult', backendData.data);
                             wx.navigateTo({ url: `/pages/result/result?imagePath=${encodeURIComponent(tempFilePath)}` });
                           } else {
                             wx.showToast({ title: '获取科普数据失败', icon: 'none' });
                             that.fallbackToLocalData(predictedIdx, tempFilePath, confidence);
                           }
                        },
                        fail: () => { wx.hideLoading(); that.fallbackToLocalData(predictedIdx, tempFilePath, confidence); }
                      });
                    } else {
                      wx.hideLoading(); that.fallbackToLocalData(predictedIdx, tempFilePath, confidence);
                    }
                  }
                });
              }).catch(err => { wx.hideLoading(); wx.showToast({ title: '端侧推理失败', icon: 'none' }); });
            } catch (err) { wx.hideLoading(); }
          }
        });
      }
    });
  },

  fetchCarouselTips: function() {
    wx.request({
      url: 'http://192.168.0.126:8000/api/tips/carousel', 
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200) { this.setData({ carouselTips: res.data.data }); }
      }
    });
  },

  showTipCard: function(e) {
    const clickedTip = e.currentTarget.dataset.tip;
    if (clickedTip) { this.setData({ currentTipData: clickedTip, isTipCardVisible: true }); }
  },
  hideTipCard: function() { this.setData({ isTipCardVisible: false }); },
  goToSearch: function() { wx.navigateTo({ url: '/pages/search/index' }); },
  goToChallenge: function() { wx.switchTab({ url: '/pages/challenge/index' }); },

  fallbackToLocalData: function(predictedIdx, tempFilePath, confidence) {
    const localResult = localCategoryDict[predictedIdx] || localCategoryDict[3]; 
    const aiResultData = {
      image_path: tempFilePath, category_name: localResult.category_name, category_class: localResult.category_class,
      confidence: confidence, eco_value: localResult.eco_value, put_guidance: localResult.put_guidance
    };
    wx.setStorageSync('tempAiResult', aiResultData);
    wx.navigateTo({ url: `/pages/result/result?imagePath=${encodeURIComponent(tempFilePath)}` });
  }
})