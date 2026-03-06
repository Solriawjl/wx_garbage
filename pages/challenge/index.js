// pages/challenge/index.js
Page({
  data: {
    userScore: 0,
    userTitle: '环保新手',
    titleClass: 'title-level-1' 
  },

  onShow: function () {
    // 每次显示页面时，读取后端同步过来的最新数据
    const score = wx.getStorageSync('totalScore') || 0;
    const title = wx.getStorageSync('currentTitle') || '环保新手';
    
    // 颜色样式我们还是在前端根据名字动态匹配一下
    let tClass = 'title-level-1'; 
    if (title === '环保宗师' || title === '环保王者') tClass = 'title-level-4';
    else if (title === '环保达人') tClass = 'title-level-3';
    else if (title === '环保卫士') tClass = 'title-level-2';

    this.setData({
      userScore: score,
      userTitle: title,
      titleClass: tClass
    });
  },

  goToQuiz: function() {
    wx.navigateTo({
      url: '/pages/challenge/quiz' 
    });
  }
})