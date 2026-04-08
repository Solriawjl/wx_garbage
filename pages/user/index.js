// pages/user/index.js
Page({
  data: {
    isLoggedIn: false,
    avatarUrl: 'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/user/head.png',
    nickname: '',
    totalScore: 0,
    ecoCoin: 0, // 🚀 初始化小红花字段
    userTitle: '未登录',
    recognizeCount: 0, 
    challengeCount: 0  
  },

  onShow: function () {
    const isLoggedIn = wx.getStorageSync('isLoggedIn') || false;
    this.setData({ isLoggedIn });

    if (isLoggedIn) {
      const userId = wx.getStorageSync('userId');
      if (!userId) {
        wx.showToast({ title: '登录状态异常，请重新登录', icon: 'none' });
        setTimeout(() => { wx.reLaunch({ url: '/pages/login/login' }); }, 1000);
      } else {
        // 统一使用 'avatarUrl' 和 'nickname' 读取缓存
        const savedAvatar = wx.getStorageSync('avatarUrl');
        const savedNickname = wx.getStorageSync('nickname');
        
        // 只要有专属缓存就显示，没有才显示默认
        this.setData({ 
          avatarUrl: savedAvatar ? savedAvatar : 'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/user/head.png',
          nickname: savedNickname ? savedNickname : '环保小卫士'
        });

        // 2. 从后端获取最新的环保星和统计数据
        this.getUserDashboardData(userId);
      }
    }
  },

  // 获取微信头像 (深度绑定账号 + 同步云端)
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail; 
    
    // 先让页面瞬间显示出新头像（体验好）
    this.setData({ avatarUrl });
    
    const userId = wx.getStorageSync('userId');
    if (userId) {
      // 🚀 修复点：使用统一的全局键名存入本地缓存
      wx.setStorageSync('avatarUrl', avatarUrl);
      
      // 显示上传中的提示
      wx.showLoading({ title: '同步云端中...', mask: true });
      
      // 将真实的图片文件上传给 Python 后端
      wx.uploadFile({
        url: 'http://192.168.0.126:8000/api/user/update_avatar', 
        filePath: avatarUrl,
        name: 'file', 
        formData: {
          'user_id': userId 
        },
        success: (res) => {
          wx.hideLoading();
          const backendData = JSON.parse(res.data);
          if (backendData.code === 200) {
            const realCloudUrl = backendData.data.avatar_url;
            // 🚀 修复点：使用统一键名覆盖为云端真实 URL
            wx.setStorageSync('avatarUrl', realCloudUrl);
            wx.showToast({ title: '头像已同步', icon: 'success' });
          } else {
            wx.showToast({ title: '头像同步失败', icon: 'error' });
          }
        },
        fail: (err) => {
          wx.hideLoading();
          wx.showToast({ title: '网络请求失败', icon: 'error' });
        }
      });
    }
  },

  // 修改昵称 (深度绑定账号 + 同步云端)
  onNicknameBlur(e) {
    const { value } = e.detail;
    if (!value.trim()) return; 
    
    this.setData({ nickname: value });
    
    const userId = wx.getStorageSync('userId');
    if (userId) {
      // 🚀 修复点：使用统一的全局键名存入本地缓存
      wx.setStorageSync('nickname', value);
      
      wx.request({
        url: 'http://192.168.0.126:8000/api/user/update_nickname',
        method: 'POST',
        data: {
          user_id: userId,
          nickname: value
        },
        success: (res) => {
          if (res.data.code === 200) {
            console.log("昵称云端同步成功");
          }
        }
      });
    }
  },

  // 🚀 核心修复：函数名对齐 onShow 中的调用，并完善 GET 请求参数拼接
  getUserDashboardData: function(userId) {
    wx.request({
      url: `http://192.168.0.126:8000/api/user/info?user_id=${userId}`, 
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200) {
          const info = res.data.data; // 后端返回的数据体
          
          this.setData({
            totalScore: info.total_score,
            ecoCoin: info.eco_coin, 
            userTitle: info.title || '环保新手',
            recognizeCount: info.recognize_count,
            challengeCount: info.challenge_count
          });
          
          // 同步最新环保星到缓存，以便其他页面（如商城、首页）使用
          wx.setStorageSync('ecoCoin', info.eco_coin);
          wx.setStorageSync('totalScore', info.total_score);
          wx.setStorageSync('currentTitle', info.title || '环保新手');
        } else {
          console.error("后端返回异常", res.data.message);
        }
      },
      fail: (err) => {
        console.error("获取用户大盘数据失败", err);
      }
    });
  },

  // 操作前检查是否登录
  checkLoginStatus: function() {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return false;
    }
    return true;
  },
  
  // 前往环保星兑换商城
  goToMall: function() {
    if (!this.checkLoginStatus()) return;
    wx.navigateTo({
      url: '/pages/mall/mall'
    });
  },
  
  goToHistory: function(e) {
    if (!this.checkLoginStatus()) return;
    const type = e.currentTarget.dataset.type; 
    if (type === 'recognize') {
      wx.navigateTo({ url: '/pages/user/recognizeHistory' });
    } else if (type === 'challenge') {
      wx.navigateTo({ url: '/pages/user/challengeHistory' });
    }
  },

  goToWrongBook: function() {
    if (!this.checkLoginStatus()) return;
    wx.navigateTo({ url: '/pages/user/wrongBook' });
  },

  goToFeedbackHistory: function() {
    if (!this.checkLoginStatus()) return;
    wx.navigateTo({ url: '/pages/user/feedbackHistory' });
  },

  showAbout: function() {
    wx.showModal({
      title: '关于我们',
      content: '基于移动端的智能垃圾分类系统 v1.2\n开发者：wjl',
      showCancel: false
    });
  },

  // 清理缓存 (防掉线保护机制)
  clearCache: function() {
    wx.showModal({
      title: '清理缓存',
      content: '点击确定后，AI识别产生的临时图片等冗余缓存将被清空。\n\n请放心，您的云端账号数据（头像、昵称、总环保星、历史记录等）和登录状态将安全保留。',
      confirmText: '确认清理',
      confirmColor: '#4CAF50',
      success: (res) => {
        if (res.confirm) {
          // 1. 清理前：先读取核心数据进行保护
          const userId = wx.getStorageSync('userId');
          const isLoggedIn = wx.getStorageSync('isLoggedIn'); 
          const role = wx.getStorageSync('role'); 
          
          // 读取新的头像和昵称键名
          const savedAvatar = wx.getStorageSync('avatarUrl');
          const savedNickname = wx.getStorageSync('nickname');
          
          // 2. 无差别清空所有本地缓存
          wx.clearStorageSync(); 
          
          // 3. 清理后：将受保护的核心数据重新写回
          if (userId) wx.setStorageSync('userId', userId);
          if (isLoggedIn) wx.setStorageSync('isLoggedIn', isLoggedIn);
          if (role) wx.setStorageSync('role', role); 
          
          if (savedAvatar) wx.setStorageSync('avatarUrl', savedAvatar);
          if (savedNickname) wx.setStorageSync('nickname', savedNickname);

          // 重新触发页面渲染
          this.onShow(); 
          wx.showToast({ title: '清理完毕', icon: 'success' });
        }
      }
    });
  },

  // 退出登录
  logout: function() {
    wx.showModal({
      title: '退出登录',
      content: '退出后将返回登录界面，确定退出吗？',
      confirmColor: '#F44336',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('isLoggedIn');
          wx.removeStorageSync('userId'); 
          
          wx.showToast({ title: '已退出', icon: 'success' });
          
          setTimeout(() => {
            wx.reLaunch({
              url: '/pages/login/login'
            });
          }, 800);
        }
      }
    });
  }
})