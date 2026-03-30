// pages/user/index.js
Page({
  data: {
    isLoggedIn: false,
    avatarUrl: 'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/user/head.png',
    nickname: '',
    totalScore: 0,
    ecoCoin: 0, // 🚀 新增：初始化环保币字段，防止渲染报错
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
        // 如果虽然标记了已登录，但丢了 userId，直接退回登录页兜底
        wx.showToast({ title: '登录状态异常，请重新登录', icon: 'none' });
        setTimeout(() => { wx.reLaunch({ url: '/pages/login/login' }); }, 1000);
      } else {
        // 1. 读取该账号专属的缓存头像和昵称！
        const savedAvatar = wx.getStorageSync(`avatar_${userId}`);
        const savedNickname = wx.getStorageSync(`nickname_${userId}`);
        
        // 只要有专属缓存就显示，没有才显示默认
        this.setData({ 
          avatarUrl: savedAvatar ? savedAvatar : 'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/user/head.png',
          nickname: savedNickname ? savedNickname : ''
        });

        // 2. 拉取云端积分数据
        this.fetchUserData(userId);
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
      // 1. 存入专属本地缓存兜底
      wx.setStorageSync(`avatar_${userId}`, avatarUrl);
      
      // 2. 显示上传中的提示
      wx.showLoading({ title: '同步云端中...', mask: true });
      
      // 3. 将真实的图片文件上传给 Python 后端
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
            wx.setStorageSync(`avatar_${userId}`, realCloudUrl);
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
      wx.setStorageSync(`nickname_${userId}`, value);
      
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

  // 🚀 核心修复：拉取用户数据
  fetchUserData: function(userId) {
    wx.request({
      url: `http://192.168.0.126:8000/api/user/info?user_id=${userId}`, 
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200) {
          const info = res.data.data; // 后端返回的数据体
          
          // 🚀 修复点：将 userData.eco_coin 全部修正为 info.eco_coin
          this.setData({
            totalScore: info.total_score,
            ecoCoin: info.eco_coin, 
            userTitle: info.title,
            recognizeCount: info.recognize_count,
            challengeCount: info.challenge_count
          });
          
          wx.setStorageSync('ecoCoin', info.eco_coin);
          wx.setStorageSync('totalScore', info.total_score);
          wx.setStorageSync('currentTitle', info.title);
        }
      },
      fail: (err) => {
        console.error("获取用户数据失败", err);
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
  
  // 前往积分兑换商城
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

  // 清除缓存：保护云端数据
  clearCache: function() {
    wx.showModal({
      title: '清除本地缓存',
      content: '点击确定后，AI识别产生的临时图片等冗余缓存将被清空。\n\n请放心，您的云端账号数据（头像、昵称、总积分、历史记录等）和登录状态将安全保留。',
      confirmText: '确认清理',
      confirmColor: '#4CAF50',
      success: (res) => {
        if (res.confirm) {
          const userId = wx.getStorageSync('userId');
          const isLoggedIn = wx.getStorageSync('isLoggedIn'); 
          const savedAvatar = wx.getStorageSync(`avatar_${userId}`);
          const savedNickname = wx.getStorageSync(`nickname_${userId}`);
          
          wx.clearStorageSync(); 
          
          if (userId) wx.setStorageSync('userId', userId);
          if (isLoggedIn) wx.setStorageSync('isLoggedIn', isLoggedIn);
          if (savedAvatar) wx.setStorageSync(`avatar_${userId}`, savedAvatar);
          if (savedNickname) wx.setStorageSync(`nickname_${userId}`, savedNickname);

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