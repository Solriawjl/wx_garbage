// pages/index/index.js

let inferenceSession = null;

// 本地离线分类字典兜底
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
    carouselTips: [],       // 首页滚动科普提示词
    currentTipData: {},     // 当前弹出的科普卡片数据 
    isTipCardVisible: false,  // 控制科普卡片显隐
    isModelReady: false,    // AI 模型是否加载完毕
    
    // 🚀 通知模块全新状态
    noticeList: [],            // 存储未读通知列表
    showNoticeListModal: false // 控制消息中心列表弹窗显隐
  },

  onLoad: function () {
    this.fetchCarouselTips();
    this.initEdgeAI(); 
  },

  onShow: function () {
    this.setGreeting(); 
    this.checkUserInfo(); 
    this.fetchNotices(); // 🚀 每次回到首页都静默刷新通知列表

    // 检查是否需要自动触发拍照（例如从其他页面刚授权返回）
    const autoTrigger = wx.getStorageSync('autoTriggerCamera');
    if (autoTrigger) {
      wx.removeStorageSync('autoTriggerCamera');
      setTimeout(() => { this.onTapCamera(); }, 300);
    }
  },

  checkUserInfo: function() {
    const userId = wx.getStorageSync('userId');
    const isLoggedIn = wx.getStorageSync('isLoggedIn');
    
    if (userId && isLoggedIn) {
      const savedAvatar = wx.getStorageSync('avatarUrl');
      const savedNickname = wx.getStorageSync('nickname');
      
      if (savedAvatar || savedNickname) {
        this.setData({
          userInfo: {
            avatarUrl: savedAvatar || '', 
            nickName: savedNickname || '环保小卫士' 
          }
        });
      } else {
        this.setData({ userInfo: null });
      }
    } else {
      this.setData({ userInfo: null }); 
    }
  },

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

  // ==========================================
  // 🧠 端侧 AI 核心逻辑
  // ==========================================
  
  initEdgeAI: function() {
    const modelUrl = 'https://images-1408449839.cos.ap-chengdu.myqcloud.com/weights/mobilenetv3_edge_v1_5_1.onnx';
    const localPath = `${wx.env.USER_DATA_PATH}/mobilenetv3_edge_v1_5_1.onnx`; 
    const fs = wx.getFileSystemManager();
    
    fs.access({
      path: localPath,
      success: () => { 
        console.log("✅ 加载本地缓存的 ONNX 模型");
        this.createInferenceSession(localPath); 
      },
      fail: () => {
        console.log("☁️ 本地无模型，开始下载...");
        wx.downloadFile({
          url: modelUrl, filePath: localPath,
          success: (res) => { 
            console.log("✅ 模型下载成功");
            this.createInferenceSession(localPath); 
          }
        });
      }
    });
  },

  createInferenceSession: function(modelPath) {
    try {
      inferenceSession = wx.createInferenceSession({ model: modelPath, precisionLevel: 4, allowNPU: true, allowQuantize: false });
      inferenceSession.onLoad(() => { 
        console.log("⚡ AI 引擎初始化完成");
        this.setData({ isModelReady: true }); 
      });
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
    
    // 环境嗅探
    const platform = wx.getSystemInfoSync().platform;
    const isSimulator = platform === 'devtools';

    if (!isSimulator && !this.data.isModelReady) { 
      wx.showToast({ title: 'AI引擎初始化中，请稍后...', icon: 'none' }); 
      return; 
    }
    
    wx.showActionSheet({
      itemList: ['立即拍照', '从手机相册选择'],
      success(res) {
        let sourceType = res.tapIndex === 1 ? ['album'] : ['camera']; 
        wx.chooseMedia({
          count: 1, mediaType: ['image'], sourceType: sourceType, sizeType: ['compressed'],
          success: async (resImg) => {
            const tempFilePath = resImg.tempFiles[0].tempFilePath;

            // 💻 模拟器纯云端分支
            if (isSimulator) {
              console.log("💻 检测到模拟器环境，强制走云端 API...");
              that.forceCloudRecognizeForSimulator(tempFilePath, userId);
              return; 
            }

            // 📱 真机端云协同分支
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
                      const CONFIDENCE_THRESHOLD = 80.0;
                      if (confidence >= CONFIDENCE_THRESHOLD) {
                        console.log(`📱 本地极度自信(${confidence}%)，走极速接口`);
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
                             } else { that.fallbackToLocalData(predictedIdx, tempFilePath, confidence); }
                          },
                          fail: () => { wx.hideLoading(); that.fallbackToLocalData(predictedIdx, tempFilePath, confidence); }
                        });
                      } else {
                        console.log(`☁️ 本地犹豫(${confidence}%)，触发云端高精度复核`);
                        wx.showLoading({ title: '深度分析中...', mask: true });
                        wx.uploadFile({
                          url: 'http://192.168.0.126:8000/api/recognize', 
                          filePath: tempFilePath, name: 'file', 
                          formData: { 'user_id': userId }, 
                          success: (uploadRes) => {
                             wx.hideLoading(); 
                             const backendData = JSON.parse(uploadRes.data);
                             if (backendData.code === 200) {
                               const cloudData = backendData.data;
                               const localName = localCategoryDict[predictedIdx] ? localCategoryDict[predictedIdx].category_name : '未知';
                               console.log(`
┏━━━━━━━━━━━━━━━━━━ 端云识别对比 ━━━━━━━━━━━━━━━━━━┓
  【端侧本地推理】
   - 预测分类: ${localName}
   - 置信度:   ${confidence}%
  --------------------------------------------------
  【云端大模型复核】
   - 预测分类: ${cloudData.category_name}
   - 置信度:   ${cloudData.confidence}%
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`);
                               wx.setStorageSync('tempAiResult', cloudData);
                               wx.navigateTo({ url: `/pages/result/result?imagePath=${encodeURIComponent(tempFilePath)}` });
                             } else { that.fallbackToLocalData(predictedIdx, tempFilePath, confidence); }
                          },
                          fail: () => { wx.hideLoading(); that.fallbackToLocalData(predictedIdx, tempFilePath, confidence); }
                        });
                      }
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

  forceCloudRecognizeForSimulator: function(tempFilePath, userId) {
    const that = this;
    wx.showLoading({ title: '💻 云端识别中...', mask: true });
    wx.uploadFile({
      url: 'http://192.168.0.126:8000/api/recognize', 
      filePath: tempFilePath, name: 'file', formData: { 'user_id': userId }, 
      success: (uploadRes) => {
         wx.hideLoading(); 
         try {
           const backendData = JSON.parse(uploadRes.data);
           if (backendData.code === 200) {
             wx.setStorageSync('tempAiResult', backendData.data);
             wx.navigateTo({ url: `/pages/result/result?imagePath=${encodeURIComponent(tempFilePath)}` });
           } else { wx.showToast({ title: backendData.message || '识别失败', icon: 'none' }); }
         } catch(e) { wx.showToast({ title: '异常', icon: 'none' }); }
      },
      fail: () => { wx.hideLoading(); wx.showToast({ title: '网络异常', icon: 'none' }); }
    });
  },

  fallbackToLocalData: function(predictedIdx, tempFilePath, confidence) {
    const localResult = localCategoryDict[predictedIdx] || localCategoryDict[3]; 
    const aiResultData = {
      image_path: tempFilePath, category_name: localResult.category_name, category_class: localResult.category_class,
      confidence: confidence, eco_value: localResult.eco_value, put_guidance: localResult.put_guidance
    };
    wx.setStorageSync('tempAiResult', aiResultData);
    wx.navigateTo({ url: `/pages/result/result?imagePath=${encodeURIComponent(tempFilePath)}` });
  },

  // ==========================================
  // 💡 日常科普任务模块
  // ==========================================
  
  fetchCarouselTips: function() {
    wx.request({
      url: 'http://192.168.0.126:8000/api/tips/carousel', 
      method: 'GET',
      success: (res) => { if (res.data.code === 200) this.setData({ carouselTips: res.data.data }); }
    });
  },

  showTipCard: function(e) {
    const clickedTip = e.currentTarget.dataset.tip;
    if (clickedTip) {
      this.setData({ currentTipData: clickedTip, isTipCardVisible: true });
      const userId = wx.getStorageSync('userId');
      if (userId) {
        wx.request({
          url: 'http://192.168.0.126:8000/api/task/read_tip', 
          method: 'POST', data: { user_id: parseInt(userId) },
          success: (res) => {
            if (res.data.code === 200 && res.data.data.reward_points > 0) {
              wx.setStorageSync('totalScore', res.data.data.total_score);
              wx.setStorageSync('currentTitle', res.data.data.title);
              wx.showToast({ title: `每日阅读 +${res.data.data.reward_points} 小红花`, icon: 'success' });
            }
          }
        });
      }
    }
  },

  hideTipCard: function() { this.setData({ isTipCardVisible: false }); },
  goToSearch: function() { wx.navigateTo({ url: '/pages/search/index' }); },
  goToChallenge: function() { wx.switchTab({ url: '/pages/challenge/index' }); },

  // ==========================================
  // 📢 升级版：通知中心模块
  // ==========================================
  
  fetchNotices: function() {
    const userId = wx.getStorageSync('userId');
    if (!userId) return;

    wx.request({
      url: `http://192.168.0.126:8000/api/user/notifications?user_id=${userId}`,
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200) {
          this.setData({ noticeList: res.data.data });
        }
      }
    });
  },

  openNoticeList: function() {
    // 只有在有通知时，点击才打开弹窗
    if (this.data.noticeList.length > 0) {
      this.setData({ showNoticeListModal: true });
    }
  },

  closeNoticeList: function() {
    this.setData({ showNoticeListModal: false });
  },

  clearAllNotices: function() {
    wx.showModal({
      title: '标为已读',
      content: '确定要把所有消息标为已读吗？',
      confirmColor: '#4CAF50',
      success: (res) => {
        if (res.confirm) {
          const ids = this.data.noticeList.map(n => n.id);
          
          // 乐观更新：立刻关掉弹窗清空列表，享受无延迟交互
          this.setData({ 
            noticeList: [],
            showNoticeListModal: false 
          });

          // 后台默默发请求更新数据库状态
          ids.forEach(id => {
            wx.request({ 
              url: `http://192.168.0.126:8000/api/user/notifications/${id}/read`, 
              method: 'POST' 
            });
          });
        }
      }
    });
  }
})