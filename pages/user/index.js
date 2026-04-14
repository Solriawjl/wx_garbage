// pages/user/index.js
Page({
  data: {
    isLoggedIn: false,
    role: 'student', // 默认身份为学生
    avatarUrl: 'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/user/head.png',
    nickname: '',
    totalScore: 0,
    ecoCoin: 0, // 🚀 初始化小红花字段
    userTitle: '未登录',
    recognizeCount: 0, 
    challengeCount: 0,
    fullClassName: '未分配班级', // 🚀 新增展示字段
    classOptions: [],
    pickerArray: [[], []],
    pickerIndex: [0, 0],
    // 🚀 新增：通知中心模块专属状态
    showNoticeModal: false,  // 控制弹窗显隐
    targetList: [],          // 接收对象列表
    targetIndex: 0,          // 当前选中的对象索引
    
    typeList: ['日常提醒', '任务布置', '奖励通报'],
    typeIndex: 0,
    
    durationList: ['12小时', '24小时', '3天', '7天', '永久'],
    durationIndex: 1,        // 默认选中 24小时
    
    noticeContent: ''        // 老师填写的通知内容
  },

  onShow: function () {
    const isLoggedIn = wx.getStorageSync('isLoggedIn') || false;
    // 每次页面显示时，从缓存中读取当前用户的真实身份
    const role = wx.getStorageSync('role') || 'student';
    // 从缓存读取最新班级名字
    const savedClassName = wx.getStorageSync('fullClassName') || '未分配班级';
    this.setData({ isLoggedIn, role, fullClassName: savedClassName });

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
        this.fetchClassOptions(); // 获取班级字典供修改使用
      }
    }
  },

  // 获取全校班级字典 (逻辑与 login.js 一致)
  fetchClassOptions() {
    wx.request({
      url: `http://192.168.0.126:8000/api/common/class_options`,
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200 && res.data.data.length > 0) {
          const options = res.data.data;
          const grades = options.map(opt => opt.grade_name);
          const classes = options[0].classes.map(c => c.name);
          this.setData({ classOptions: options, pickerArray: [grades, classes] });
        }
      }
    });
  },

  onClassPickerColumnChange(e) {
    const { column, value } = e.detail;
    let { pickerArray, pickerIndex, classOptions } = this.data;
    pickerIndex[column] = value;
    if (column === 0) {
      pickerArray[1] = classOptions[value].classes.map(c => c.name);
      pickerIndex[1] = 0; 
    }
    this.setData({ pickerArray, pickerIndex });
  },

  // 用户在个人中心提交班级修改
  onClassPickerChange(e) {
    const { value } = e.detail;
    const { classOptions } = this.data;
    const selectedClass = classOptions[value[0]].classes[value[1]];
    const userId = wx.getStorageSync('userId');

    wx.showLoading({ title: '切换学情域...', mask: true });
    wx.request({
      url: `http://192.168.0.126:8000/api/user/update_class`,
      method: 'POST',
      data: { user_id: userId, class_id: selectedClass.id },
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          const newName = res.data.data.full_class_name;
          wx.setStorageSync('fullClassName', newName); // 更新缓存
          this.setData({ fullClassName: newName, pickerIndex: value });
          
          wx.showToast({ title: '班级切换成功', icon: 'success' });
          // 班级改变了，强行刷新一次本页的数据
          this.getUserDashboardData(userId);
        }
      }
    });
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

  // 函数名对齐 onShow 中的调用，并完善 GET 请求参数拼接
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
  
  // 前往学情成长报告页面
  goToReport: function() {
    if (!this.checkLoginStatus()) return; // 必须登录才能看报告
    wx.navigateTo({ 
      url: '/pages/user/report'  // 这里确保路径跟你新建的 report 页面路径一致
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
  },
  // ==========================================
  // 老师端专属跳转路由
  // ==========================================
  goToTeacherDashboard: function() {
    if (!this.checkLoginStatus()) return;
    wx.navigateTo({ url: '/pages/teacher/dashboard' });
  },

  goToTeacherVerify: function() {
    if (!this.checkLoginStatus()) return;
    wx.navigateTo({ url: '/pages/teacher/verify' });
  },

  goToTeacherMallManage: function() {
    if (!this.checkLoginStatus()) return;
    wx.navigateTo({ url: '/pages/teacher/mall_manage' });
  },
  // ==========================================
  // 📢 核心：发布班级通知模块 (老师专属)
  // ==========================================

  // 1. 点击入口，打开弹窗并拉取班级人员名单
  openNoticeModal: function() {
    const teacherId = wx.getStorageSync('userId');
    wx.showLoading({ title: '加载名单中...' });
    
    // 调取后端字典接口
    wx.request({
      url: `http://192.168.0.126:8000/api/teacher/students?teacher_id=${teacherId}`,
      method: 'GET',
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          this.setData({
            targetList: res.data.data,
            targetIndex: 0,     // 默认选全体
            typeIndex: 0,       // 默认选日常提醒
            durationIndex: 1,   // 默认选 24小时
            noticeContent: '',  // 清空文本框
            showNoticeModal: true
          });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '获取名单失败', icon: 'none' });
      }
    });
  },

  // 2. 关闭弹窗
  closeNoticeModal: function() {
    this.setData({ showNoticeModal: false });
  },

  // 3. 表单联动数据绑定
  onTargetChange: function(e) { this.setData({ targetIndex: e.detail.value }); },
  onTypeChange: function(e) { this.setData({ typeIndex: e.detail.value }); },
  onDurationChange: function(e) { this.setData({ durationIndex: e.detail.value }); },
  onNoticeInput: function(e) { this.setData({ noticeContent: e.detail.value }); },

  // 4. 提交发布通知
  submitNotice: function() {
    const content = this.data.noticeContent.trim();
    if (!content) {
      wx.showToast({ title: '通知内容不能为空', icon: 'none' });
      return;
    }

    // 提取纯净类型和时长（数字）
    const noticeType = this.data.typeList[this.data.typeIndex];
    const durationMap = { '12小时': 12, '24小时': 24, '3天': 72, '7天': 168, '永久': 0 };
    const durationHours = durationMap[this.data.durationList[this.data.durationIndex]];

    const teacherId = wx.getStorageSync('userId');
    const selectedUserId = this.data.targetList[this.data.targetIndex].id;

    wx.showLoading({ title: '正在发布...' });

    wx.request({
      url: `http://192.168.0.126:8000/api/teacher/send_notice?teacher_id=${teacherId}`,
      method: 'POST',
      data: {
        user_id: selectedUserId,
        type: noticeType,
        duration: durationHours,
        content: content
      },
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          this.closeNoticeModal();
          wx.showToast({ title: '发布成功', icon: 'success', duration: 2000 });
        } else {
          wx.showToast({ title: '发布失败，请重试', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '网络异常，请检查服务', icon: 'none' });
      }
    });
  }
})