// pages/login/login.js
const API_BASE_URL = 'http://192.168.0.126:8000'; // 确保这里是你真实的后端 IP

Page({
  data: {
    showInviteModal: false,
    inviteCode: '',
    tempOpenid: '' // 新用户准备注册时暂存的 OpenID
  },

  onLoad() {
    // 检查缓存，如果已经登录过，直接跳走，不会停留在登录页
    if (wx.getStorageSync('isLoggedIn')) {
      this.redirectByRole(wx.getStorageSync('role'));
    }
  },

  // === 核心：点击卡片后统一执行验证逻辑 ===
  loginAction(clickedRole) {
    wx.showLoading({ title: '安全验证中...', mask: true });
    
    wx.login({
      success: (res) => {
        if (res.code) {
          wx.request({
            url: `${API_BASE_URL}/api/user/login`, 
            method: 'POST',
            data: { code: res.code },
            success: (serverRes) => {
              wx.hideLoading();
              
              if (serverRes.data.code === 200) {
                // 【老用户】数据库有记录
                const userData = serverRes.data.data;
                
                // 🛑 核心修复：角色互斥拦截
                if (userData.role !== clickedRole) {
                  const realRole = userData.role === 'teacher' ? '【指导老师】' : '【环保小卫士】';
                  return wx.showModal({
                    title: '身份验证失败',
                    content: `该微信已绑定为 ${realRole}，请点击对应的身份卡片登录哦！`,
                    showCancel: false
                  });
                }

                // 角色匹配，放行登录
                wx.showToast({ title: '验证成功', icon: 'none' });
                this.handleLoginSuccess(userData);

              } else if (serverRes.data.code === 404) {
                // 【新用户】后端返回404，后续代码不变...
                const openid = serverRes.data.data.openid;
                if (clickedRole === 'student') {
                  this.doRegister(openid, 'student', '');
                } else if (clickedRole === 'teacher') {
                  this.setData({ showInviteModal: true, tempOpenid: openid });
                }
              } else {
                wx.showToast({ title: serverRes.data.message || '系统异常', icon: 'none' });
              }
            },
            fail: () => {
              wx.hideLoading();
              wx.showToast({ title: '网络请求失败', icon: 'none' });
            }
          })
        }
      }
    });
  },

  // === 绑定前端点击事件 ===
  selectStudent() {
    this.loginAction('student');
  },

  selectTeacher() {
    this.loginAction('teacher');
  },

  // === 老师弹窗处理逻辑 ===
  inputInviteCode(e) {
    this.setData({ inviteCode: e.detail.value });
  },

  cancelInvite() {
    this.setData({ showInviteModal: false, inviteCode: '' });
  },

  confirmInvite() {
    if (!this.data.inviteCode.trim()) {
      return wx.showToast({ title: '请输入邀请码', icon: 'none' });
    }
    this.doRegister(this.data.tempOpenid, 'teacher', this.data.inviteCode.trim());
  },

  // === 真正发起注册请求 ===
  doRegister(openid, role, inviteCode) {
    wx.showLoading({ title: '创建档案中...', mask: true });

    wx.request({
      url: `${API_BASE_URL}/api/user/register`,
      method: 'POST',
      data: {
        openid: openid,
        role: role,
        invite_code: inviteCode
      },
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          wx.showToast({ title: '注册成功！', icon: 'success' });
          this.setData({ showInviteModal: false });
          // 注册成功后，直接当作登录成功处理
          this.handleLoginSuccess(res.data.data);
        } else {
          wx.showToast({ title: res.data.message || '注册失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  },

  // === 统一的成功后置处理（写缓存 + 跳转） ===
  handleLoginSuccess(userData) {
    // 写入缓存，由于微信不再提供真实信息，这里写后端返回的默认值
    wx.setStorageSync('userId', userData.id);
    wx.setStorageSync('role', userData.role);
    wx.setStorageSync('nickname', userData.nickname || '环保小卫士');
    wx.setStorageSync('avatarUrl', userData.avatar_url || '/images/user/head.png');
    wx.setStorageSync('isLoggedIn', true);
    
    setTimeout(() => {
      this.redirectByRole(userData.role);
    }, 800);
  },

  redirectByRole(role) {
    if (role === 'teacher') {
      wx.showModal({
        title: '欢迎老师',
        content: '教师专属移动看板正在开发中！',
        showCancel: false
      });
    } else {
      // 家庭端跳回首页
      wx.switchTab({ url: '/pages/index/index' });
    }
  }
})