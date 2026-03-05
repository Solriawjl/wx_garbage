// pages/challenge/result.js
Page({
  data: {
    currentScore: 0,   // 本次得分
    totalScore: 0,     // 累计积分
    title: '',         // 获得的称号
    wrongList: [],      // 错题本
    isFromHistory: false // 是否来自历史记录页的标记
  },

  onLoad: function (options) {
    // 0. 判断是否是从历史记录页跳转过来的
    const fromHistory = options.isFromHistory === 'true';

    // 1. 获取本次挑战的得分和错题本
    const score = wx.getStorageSync('challengeScore') || 0;
    const wrongs = wx.getStorageSync('challengeWrongList') || [];
    
    // 2. 获取之前的全局总积分
    let oldTotalScore = wx.getStorageSync('totalScore') || 0;
    let newTotalScore = oldTotalScore;
    
    // 3. 【防刷分逻辑优化】只有刚答完题（不是查历史）时，才累加总积分！
    if (!fromHistory) {
      newTotalScore = oldTotalScore + score;
      wx.setStorageSync('totalScore', newTotalScore);
    }

    // 4. 计算称号
    let currentTitle = '再接再厉';
    if (score === 10) currentTitle = '环保完美王者';
    else if (score >= 8) currentTitle = '环保小达人';
    else if (score >= 6) currentTitle = '环保小卫士';

    // 5. 渲染页面
    this.setData({
      isFromHistory: fromHistory,
      currentScore: score,
      totalScore: newTotalScore,
      title: currentTitle,
      wrongList: wrongs
    });
  },

  // 处理左侧按钮点击事件 (核心逻辑修正)
  handleLeftBtn: function() {
    if (this.data.isFromHistory) {
      // 场景 B：如果是从历史记录进来的 -> 退回上一页(即历史列表)
      wx.navigateBack({
        delta: 1
      });
    } else {
      // 场景 A：如果是刚答完题出来的 -> 直接重新开始一局！
      // 使用 redirectTo 是为了替换当前结果页，防止页面栈越来越深
      wx.redirectTo({
        url: '/pages/challenge/quiz' 
      });
    }
  },

  // 微信原生分享功能 (点击分享按钮触发)
  onShareAppMessage: function () {
    return {
      title: `我在垃圾分类挑战中获得了【${this.data.title}】称号，快来挑战我吧！`,
      path: '/pages/index/index', // 分享出去后别人点击进来的页面
      imageUrl: '/images/share_cover.png' // 可选：你可以准备一张好看的分享封面图
    }
  }
})