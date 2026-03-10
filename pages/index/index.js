// pages/index/index.js

// 全局端侧推理引擎实例
let inferenceSession = null;

// 无网环境下的本地分类字典
const localCategoryDict = [
  {
    category_name: "厨余垃圾",
    category_class: "kitchen",
    eco_value: "处理后可作为天然肥料或沼气发电",
    put_guidance: "请沥干水分后投放，注意不要混入塑料袋、牙签等硬物。"
  },
  {
    category_name: "可回收物",
    category_class: "recyclable",
    eco_value: "可进入再生资源回收体系，变废为宝",
    put_guidance: "请尽量保持清洁干燥，立体包装请压扁后投放。"
  },
  {
    category_name: "有害垃圾",
    category_class: "harmful",
    eco_value: "需特殊安全处理，防止重金属和化学物质污染环境",
    put_guidance: "请轻投轻放，易碎物品连带包装或包裹后投放。"
  },
  {
    category_name: "其他垃圾",
    category_class: "other",
    eco_value: "通常通过焚烧发电或卫生填埋处理",
    put_guidance: "请沥干水分，难以分辨类别的垃圾均可投放到此桶。"
  }
];

Page({
  data: {
    // 1. 每日一签相关的状态变量
    carouselTips: [],       // 存放轮播文章列表的数组
    currentTipData: {},      // 存着完整的图文数据，准备喂给弹窗卡片
    isTipCardVisible: false,  // 控制卡片弹窗的开关状态
    isModelReady: false // 记录端侧模型是否加载完毕
  },

  // 页面加载时执行
  onLoad: function () {
    this.fetchCarouselTips();
    this.initEdgeAI(); // 启动时静默初始化端侧 AI
  },

  // 页面每次显示时执行 (用于捕捉“重新识别”的暗号)
  onShow: function () {
    // 1. 检查是否接到了“重新识别”的暗号
    const autoTrigger = wx.getStorageSync('autoTriggerCamera');
    if (autoTrigger) {
      // 2. 阅后即焚：立马把暗号删掉，防止下次正常进入首页也疯狂弹窗
      wx.removeStorageSync('autoTriggerCamera');
      // 3. 稍微延迟 300 毫秒，等页面退回的动画播完再弹窗，视觉更丝滑
      setTimeout(() => {
        // 自动调用下方的拍照/相册选择功能
        this.onTapCamera(); 
      }, 300);
    }
  },

  // ==========================================
  // 一：静默下载并挂载 ONNX 端侧大模型
  // ==========================================
  initEdgeAI: function() {
    // 腾讯云模型直链
    const modelUrl = 'https://images-1408449839.cos.ap-chengdu.myqcloud.com/weights/mobilenetv3_edge_v1_2.onnx';
    const localPath = `${wx.env.USER_DATA_PATH}/mobilenetv3_edge_v1_2.onnx`; // 微信本地缓存路径
    const fs = wx.getFileSystemManager();

    // 先检查手机里是不是已经下载过了（防止每次打开都下载）
    fs.access({
      path: localPath,
      success: () => {
        console.log("模型已在手机本地，直接挂载...");
        this.createInferenceSession(localPath);
      },
      fail: () => {
        console.log("首次运行，正在从云端静默下载端侧模型...");
        wx.downloadFile({
          url: modelUrl,
          filePath: localPath,
          success: (res) => {
            console.log("模型下载完毕！开始挂载...");
            this.createInferenceSession(localPath);
          },
          fail: (err) => {
            console.error("模型下载失败，请检查网络", err);
          }
        });
      }
    });
  },

  createInferenceSession: function(modelPath) {
    try {
      // 唤醒微信底层的 NPU/GPU 算力引擎
      inferenceSession = wx.createInferenceSession({
        model: modelPath,
        precisionLevel: 4, // 允许使用 NPU 加速
        allowNPU: true,
        allowQuantize: false
      });

      inferenceSession.onLoad(() => {
        console.log("端侧 AI 引擎点火完毕！可进行极速离线推理。");
        this.setData({ isModelReady: true });
      });

      inferenceSession.onError((err) => {
        console.error("端侧推理引擎加载失败:", err);
      });
    } catch (e) {
      console.error("创建 Session 异常，可能是微信版本过低", e);
    }
  },

  // ==========================================
  // 二：纯前端 JS 图像张量化预处理
  // 等价于 Python 的 pad_to_square + Normalize + ToTensor
  // ==========================================
  processImageToTensor: function(tempFilePath) {
    return new Promise((resolve, reject) => {
      wx.createSelectorQuery().select('#aiCanvas').fields({ node: true, size: true }).exec((res) => {
        if (!res[0]) return reject("找不到画布");
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        // 强行开启 Canvas 高质量双线性平滑缩放，防止像素丢失
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        const img = canvas.createImage(); 
        img.src = tempFilePath;
        img.onload = () => {
          const w = img.width;
          const h = img.height;
          const max_wh = Math.max(w, h);

          // 1. 铺一层纯白背景
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, 224, 224);

          // 2. 核心算法：按比例缩小并居中画图 (白边填充 pad_to_square)
          const scale = 224 / max_wh;
          const drawW = w * scale;
          const drawH = h * scale;
          const dx = (224 - drawW) / 2;
          const dy = (224 - drawH) / 2;
          ctx.drawImage(img, dx, dy, drawW, drawH);

          // 3. 提取 RGBA 像素阵列
          const imageData = ctx.getImageData(0, 0, 224, 224);
          const data = imageData.data; 

          // 4. 归一化 (Normalize) 并转为 PyTorch 需要的 [1, 3, 224, 224] 扁平数组
          const mean = [0.485, 0.456, 0.406];
          const std = [0.229, 0.224, 0.225];
          const float32Data = new Float32Array(3 * 224 * 224);

          let j = 0;
          for (let i = 0; i < data.length; i += 4) {
            float32Data[j] = ((data[i] / 255.0) - mean[0]) / std[0];             // R通道
            float32Data[j + 224*224] = ((data[i+1] / 255.0) - mean[1]) / std[1]; // G通道
            float32Data[j + 2*224*224] = ((data[i+2] / 255.0) - mean[2]) / std[2]; // B通道
            j++;
          }
          resolve(float32Data.buffer); // 返回内存地址！
        };
        img.onerror = (e) => reject(e);
      });
    });
  },

  // ==========================================
  // 点击AI智能识别大按钮 (端云协同流)
  // ==========================================
  onTapCamera: function() {
    const that = this;
    const userId = wx.getStorageSync('userId');
    if (!userId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    if (!this.data.isModelReady) {
      wx.showToast({ title: 'AI引擎初始化中，请稍后...', icon: 'none' });
      return;
    }
    
    wx.showActionSheet({
      itemList: ['📸 立即拍照', '🖼️ 从手机相册选择'],
      success(res) {
        let sourceType = res.tapIndex === 1 ? ['album'] : ['camera']; 
        
        wx.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sourceType: sourceType,
          sizeType: ['compressed'], // 尽量使用原图保证准确率
          success: async (resImg) => {
            const tempFilePath = resImg.tempFiles[0].tempFilePath;
            
            wx.showLoading({ title: '手机端极速推理中...', mask: true });

            try {
              // 🌟 1. 前端处理图像张量
              const tensorBuffer = await that.processImageToTensor(tempFilePath);

              // 🌟 2. 前端脱机推理 (瞬间完成)
              inferenceSession.run({
                'input': { // 对应 ONNX 导出的 input_names
                  type: 'float32',
                  data: tensorBuffer,
                  shape: [1, 3, 224, 224]
                }
              }).then(inferRes => {
                // 提取 output 层的张量结果
                const outputs = new Float32Array(inferRes['output'].data);
                
                // 🌟 3. JS 实现 Softmax 与最大值提取
                const maxVal = Math.max(...outputs);
                let sumExp = 0;
                let probs = [];
                for(let i=0; i<outputs.length; i++) {
                  const e = Math.exp(outputs[i] - maxVal);
                  probs.push(e);
                  sumExp += e;
                }
                probs = probs.map(p => p / sumExp);
                
                // 找出概率最高的分类索引和置信度
                let maxProb = -1;
                let predictedIdx = -1;
                for(let i=0; i<probs.length; i++){
                  if(probs[i] > maxProb){
                    maxProb = probs[i];
                    predictedIdx = i;
                  }
                }
                const confidence = parseFloat((maxProb * 100).toFixed(2));
                
                console.log(`端侧推理完成！预测索引:${predictedIdx}, 置信度:${confidence}%`);

                // 🌟 4. 重构：优先使用本地字典快速组装结果
                const localResult = localCategoryDict[predictedIdx];
                const aiResultData = {
                  image_path: tempFilePath, // 本地图片临时路径
                  category_name: localResult.category_name,
                  category_class: localResult.category_class,
                  confidence: confidence,
                  eco_value: localResult.eco_value,
                  put_guidance: localResult.put_guidance
                };

                // 先把组装好的结果塞入缓存，准备跳转
                wx.setStorageSync('tempAiResult', aiResultData);
                wx.hideLoading(); // 关掉 loading，因为本地推理极快

                // 🌟 5. 立即跳转到结果页 (实现无网秒开)
                wx.navigateTo({
                  url: `/pages/result/result?imagePath=${encodeURIComponent(tempFilePath)}`
                });

                // 🌟 6. 异步静默同步给后端 (用于收集强化训练数据)
                // 注意：这里不需要 showLoading，用户已经无感跳转了
                wx.getNetworkType({
                  success (res) {
                    if (res.networkType !== 'none') {
                      console.log("检测到有网络，开始静默上传识别记录...");
                      wx.uploadFile({
                        url: 'http://192.168.0.126:8000/api/recognize/edge', 
                        filePath: tempFilePath,
                        name: 'file', 
                        formData: {
                          'user_id': userId,
                          'predicted_idx': predictedIdx,
                          'confidence': confidence
                        },
                        success: (uploadRes) => {
                           console.log("静默上传历史记录成功");
                        },
                        fail: (err) => {
                           console.log("静默上传失败(可能是弱网)，不影响前端显示");
                        }
                      });
                    } else {
                      console.log("当前无网络，纯离线模式运行");
                    }
                  }
                });

              }).catch(err => {
                wx.hideLoading();
                console.error("推理异常", err);
                wx.showToast({ title: '端侧推理失败', icon: 'none' });
              });

            } catch (err) {
              wx.hideLoading();
              console.error("图像预处理失败", err);
            }
          }
        });
      }
    });
  },

  // 获取科普轮播列表
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
  // 点击顶部搜索框
  goToSearch: function() {
    wx.navigateTo({
      url: '/pages/search/index'
    });
  },
})