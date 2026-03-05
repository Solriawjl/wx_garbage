// app.js 
// 全局逻辑：初始化配置、全局变量（如用户积分、登录状态）
// app.json               
// 全局配置：页面路由注册、底部 TabBar 配置
// app.wxss               

// app.js
App({
  onLaunch() {
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