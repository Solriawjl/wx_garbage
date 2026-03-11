// pages/login/login.js
Page({
  onLoad() {
    // 如果检查到已经登录过，直接放行，瞬间跳转到首页
    const isLoggedIn = wx.getStorageSync('isLoggedIn');
    const userId = wx.getStorageSync('userId');
    if (isLoggedIn && userId) {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }
  },

  handleLogin() {
    wx.showLoading({ title: '安全登录中...', mask: true });
    
    wx.login({
      success: (res) => {
        if (res.code) {
          wx.request({
            url: 'http://192.168.0.126:8000/api/user/login', 
            method: 'POST',
            data: { code: res.code },
            success: (serverRes) => {
              wx.hideLoading();
              if (serverRes.statusCode === 200 && serverRes.data.id) {
                // 登录成功！写下“通行证”
                wx.setStorageSync('userId', serverRes.data.id);
                wx.setStorageSync('isLoggedIn', true);
                
                wx.showToast({ title: '登录成功', icon: 'success' });
                
                // 延迟半秒跳转，让用户看清成功提示
                setTimeout(() => {
                  wx.switchTab({ url: '/pages/index/index' });
                }, 500);
              } else {
                wx.showToast({ title: '服务器开小差了', icon: 'error' });
              }
            },
            fail: () => {
              wx.hideLoading();
              wx.showToast({ title: '网络请求失败', icon: 'error' });
            }
          })
        }
      }
    });
  }
})