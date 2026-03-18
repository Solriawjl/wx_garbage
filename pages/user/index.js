// pages/user/index.js
Page({
  data: {
    isLoggedIn: false,
    avatarUrl: 'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/user/head.png',
    nickname: '',
    totalScore: 0,
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
        // 兜底防错
        this.doSilentLogin(true);
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
    const { avatarUrl } = e.detail; // 这里拿到的是微信的临时路径 wxfile://...
    
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
        name: 'file', // 对应后端 File(...) 的参数名
        formData: {
          'user_id': userId // 告诉后端是哪个用户在换头像
        },
        success: (res) => {
          wx.hideLoading();
          const backendData = JSON.parse(res.data);
          if (backendData.code === 200) {
            // 上传成功后，把后端返回的真正腾讯云公网 URL 替换掉本地缓存
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
    if (!value.trim()) return; // 防止存入空名字
    
    this.setData({ nickname: value });
    
    const userId = wx.getStorageSync('userId');
    if (userId) {
      // 1. 存入专属本地缓存兜底
      wx.setStorageSync(`nickname_${userId}`, value);
      
      // 2. 发起网络请求，告诉后端改名字了
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

  fetchUserData: function(userId) {
    wx.request({
      url: `http://192.168.0.126:8000/api/user/info?user_id=${userId}`, 
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200) {
          const info = res.data.data;
          this.setData({
            totalScore: info.total_score,
            userTitle: info.title,
            recognizeCount: info.recognize_count,
            challengeCount: info.challenge_count
          });
          wx.setStorageSync('totalScore', info.total_score);
          wx.setStorageSync('currentTitle', info.title);
        }
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

  // 各类跳转逻辑保持不变
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
      // 1. 打消用户顾虑，强调头像和昵称很安全
      content: '点击确定后，AI识别产生的临时图片等冗余缓存将被清空。\n\n请放心，您的云端账号数据（头像、昵称、总积分、历史记录等）和登录状态将安全保留。',
      confirmText: '确认清理',
      confirmColor: '#4CAF50',
      success: (res) => {
        if (res.confirm) {
          // 2. 扩大“保护伞”范围：把头像和昵称也捞出来
          const userId = wx.getStorageSync('userId');
          const isLoggedIn = wx.getStorageSync('isLoggedIn'); 
          const savedAvatar = wx.getStorageSync(`avatar_${userId}`);
          const savedNickname = wx.getStorageSync(`nickname_${userId}`);
          
          // 3. 无差别清理本地空间（清空冗余图片和识别结果）
          wx.clearStorageSync(); 
          
          // 4. 瞬间把保护的数据恢复回去
          if (userId) wx.setStorageSync('userId', userId);
          if (isLoggedIn) wx.setStorageSync('isLoggedIn', isLoggedIn);
          if (savedAvatar) wx.setStorageSync(`avatar_${userId}`, savedAvatar);
          if (savedNickname) wx.setStorageSync(`nickname_${userId}`, savedNickname);

          // 5. 刷新当前页面，由于缓存被恢复了，头像和昵称依然稳如泰山
          this.onShow(); 
          wx.showToast({ title: '清理完毕', icon: 'success' });
        }
      }
    });
  },

  // 退出登录：改写保护逻辑
  logout: function() {
    wx.showModal({
      title: '退出登录',
      content: '退出后将返回登录界面，确定退出吗？',
      confirmColor: '#F44336',
      success: (res) => {
        if (res.confirm) {
          // 只移除通行证状态，坚决不清理 avatar_xxx 缓存
          wx.removeStorageSync('isLoggedIn');
          wx.removeStorageSync('userId'); 
          
          wx.showToast({ title: '已退出', icon: 'success' });
          
          // 回到登录黑屋
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