// app.js 
// 全局逻辑：初始化配置、全局变量（如用户积分、登录状态）
// app.json               
// 全局配置：页面路由注册、底部 TabBar 配置
// app.wxss               

// app.js
App({
  onLaunch() {
    // 小程序一启动，立刻静默获取 code
    wx.login({
      success: res => {
        if (res.code) {
          console.log("1. 成功获取到微信 code:", res.code);
          
          // 2. 把 code 发送给我们刚刚写好的 FastAPI 后端
          wx.request({
            url: 'http://127.0.0.1:8000/api/user/login', // 本地后端地址
            method: 'POST',
            data: {
              code: res.code
            },
            success: (serverRes) => {
              console.log("3. 后端返回的用户信息：", serverRes.data);
              // 4. 把后端的 user_id 或整个用户信息存进本地缓存，以后请求其他接口都能带上！
              wx.setStorageSync('userInfo', serverRes.data);
              wx.setStorageSync('userId', serverRes.data.id);
            },
            fail: (err) => {
              console.error("请求后端失败，请检查 FastAPI 是否启动", err);
            }
          })
        }
      }
    })
    // 1. 获取本地缓存中的总积分
    let currentTotalScore = wx.getStorageSync('totalScore');
    
    // 2. 如果之前没有存过（即第一次使用小程序），则初始化为 0
    if (currentTotalScore === '') {
      wx.setStorageSync('totalScore', 0);
      console.log("初始化用户总积分为：0");
    } else {
      console.log("读取到用户当前总积分为：", currentTotalScore);
    }
  },

  globalData: {
    userInfo: null
  }
})