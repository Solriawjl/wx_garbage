// pages/login/login.js
const API_BASE_URL = 'http://192.168.0.126:8000'; 

Page({
  data: {
    showRegisterModal: false, // 🚀 升级为通用注册弹窗
    registerRole: '',         // 当前注册身份
    inviteCode: '',
    tempOpenid: '',
    
    // 🚀 新增：班级选择器相关数据
    classOptions: [],         // 后端返回的原始树状数据
    pickerArray: [[], []],    // 给 Picker 显示用的二维数组：[[一年级, 二年级], [1班, 2班]]
    pickerIndex: [0, 0],      // 当前选中的索引
    selectedClassId: 1        // 最终选中的班级ID
  },

  onLoad() {
    if (wx.getStorageSync('isLoggedIn')) {
      this.redirectByRole(wx.getStorageSync('role'));
    }
    // 🚀 页面加载时提前拉取学校班级列表
    this.fetchClassOptions();
  },

  // 🚀 获取全校班级字典树
  fetchClassOptions() {
    wx.request({
      url: `${API_BASE_URL}/api/common/class_options`,
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200 && res.data.data.length > 0) {
          const options = res.data.data;
          const grades = options.map(opt => opt.grade_name);
          const classes = options[0].classes.map(c => c.name);
          
          this.setData({
            classOptions: options,
            pickerArray: [grades, classes],
            selectedClassId: options[0].classes[0].id // 默认选中第一个
          });
        }
      }
    });
  },

  // 🚀 Picker 某列滚动时的联动逻辑
  onPickerColumnChange(e) {
    const { column, value } = e.detail;
    let { pickerArray, pickerIndex, classOptions } = this.data;
    
    pickerIndex[column] = value;
    
    // 如果滚动的是第一列（年级），必须动态更新第二列（班级）的数据
    if (column === 0) {
      const currentGrade = classOptions[value];
      pickerArray[1] = currentGrade.classes.map(c => c.name);
      pickerIndex[1] = 0; // 重置班级索引到第一个
    }
    this.setData({ pickerArray, pickerIndex });
  },

  // 🚀 Picker 点击确定时的逻辑
  onPickerChange(e) {
    const { value } = e.detail;
    const { classOptions } = this.data;
    
    const selectedGrade = classOptions[value[0]];
    const selectedClass = selectedGrade.classes[value[1]];
    
    this.setData({
      pickerIndex: value,
      selectedClassId: selectedClass.id
    });
  },

  // 统一的登录动作
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
                const userData = serverRes.data.data;
                if (userData.role !== clickedRole) {
                  const realRole = userData.role === 'teacher' ? '【指导老师】' : '【环保小卫士】';
                  return wx.showModal({ title: '身份验证失败', content: `该微信已绑定为 ${realRole}，请点击对应的身份卡片登录哦！`, showCancel: false });
                }
                wx.showToast({ title: '验证成功', icon: 'none' });
                this.handleLoginSuccess(userData);

              } else if (serverRes.data.code === 404) {
                // 🚀 核心修改：如果是新用户，统一弹出包含班级选择的注册框
                const openid = serverRes.data.data.openid;
                this.setData({ 
                  showRegisterModal: true, 
                  tempOpenid: openid,
                  registerRole: clickedRole
                });
              }
            }
          })
        }
      }
    });
  },

  selectStudent() { this.loginAction('student'); },
  selectTeacher() { this.loginAction('teacher'); },
  inputInviteCode(e) { this.setData({ inviteCode: e.detail.value }); },
  cancelRegister() { this.setData({ showRegisterModal: false, inviteCode: '' }); },

  // 🚀 确认注册按钮
  confirmRegister() {
    if (this.data.registerRole === 'teacher' && !this.data.inviteCode.trim()) {
      return wx.showToast({ title: '请输入邀请码', icon: 'none' });
    }
    // 发起带班级ID的注册请求
    this.doRegister(this.data.tempOpenid, this.data.registerRole, this.data.inviteCode.trim(), this.data.selectedClassId);
  },

  // === 发起注册请求 ===
  doRegister(openid, role, inviteCode, classId) {
    wx.showLoading({ title: '创建档案中...', mask: true });
    wx.request({
      url: `${API_BASE_URL}/api/user/register`,
      method: 'POST',
      data: { openid: openid, role: role, invite_code: inviteCode, class_id: classId }, // 🚀 携带班级ID
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          wx.showToast({ title: '注册成功！', icon: 'success' });
          this.setData({ showRegisterModal: false });
          this.handleLoginSuccess(res.data.data);
        } else {
          wx.showToast({ title: res.data.message || '注册失败', icon: 'none' });
        }
      }
    });
  },

  // === 统一的成功后置处理 ===
  handleLoginSuccess(userData) {
    wx.setStorageSync('userId', userData.id);
    wx.setStorageSync('role', userData.role);
    wx.setStorageSync('nickname', userData.nickname || '环保小卫士');
    wx.setStorageSync('avatarUrl', userData.avatar_url || 'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/user/head.png');
    wx.setStorageSync('fullClassName', userData.full_class_name || '未分配班级'); // 🚀 缓存完整的班级名称
    wx.setStorageSync('isLoggedIn', true);
    
    setTimeout(() => { this.redirectByRole(userData.role); }, 800);
  },

  redirectByRole(role) {
    if (role === 'teacher') { wx.switchTab({ url: '/pages/user/index' }); } 
    else { wx.switchTab({ url: '/pages/index/index' }); }
  }
})