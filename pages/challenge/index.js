// pages/challenge/index.js
Page({
  data: {
    userScore: 0,
    userTitle: '环保新手' // 默认称号
  },

  // onShow，积分能实时刷新。
  onShow: function () {
    const score = wx.getStorageSync('totalScore') || 0;
    
    // 增加一个 titleClass 变量来控制颜色
    let title = '环保新手';
    let tClass = 'title-level-1'; // 默认：青铜/大地色

    if (score >= 100) {
      title = '环保王者';
      tClass = 'title-level-4';   // 王者：耀眼橙金
    } else if (score >= 50) {
      title = '环保达人';
      tClass = 'title-level-3';   // 达人：钻石亮蓝
    } else if (score >= 20) {
      title = '环保卫士';
      tClass = 'title-level-2';   // 卫士：生机亮绿
    }

    this.setData({
      userScore: score,
      userTitle: title,
      titleClass: tClass // 将动态计算的类名存入 data
    });
  },

  // 点击开始挑战，跳转到真正的答题页
  goToQuiz: function() {
    wx.navigateTo({
      // 注意：这里的路径要对应我们刚才写的答题页的真实路径
      url: '/pages/challenge/quiz' 
    });
  }
})