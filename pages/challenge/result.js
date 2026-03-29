// pages/challenge/result.js
const PERFORMANCE_COLORS = {
  // 0-3题：再接再厉 (灰色/气馁的颜色)
  '再接再厉': 'linear-gradient(135deg, #CFD8DC 0%, #90A4AE 100%)',
  // 5-7题：渐入佳境 (蓝色/鼓励的颜色)
  '渐入佳境': 'linear-gradient(135deg, #81D4FA 0%, #03A9F4 100%)',
  // 8-9题：火眼金睛 (橙色/优秀的颜色)
  '火眼金睛': 'linear-gradient(135deg, #FFD54F 0%, #FF9800 100%)',
  // 10题满分：完美通关 (紫红色/极致荣誉的颜色)
  '完美通关': 'linear-gradient(135deg, #CE93D8 0%, #9C27B0 100%)'
};
Page({
  data: {
    currentScore: 0,   // 本次得分
    totalScore: 0,     // 累计积分
    performance: '',         // 表现
    titleColor: '',    // 环保挑战卡片的动态渐变色
    wrongList: [],      // 错题本
    isFromHistory: false // 是否来自历史记录页的标记
  },

  onLoad: function (options) {
    // 0. 判断是否是从历史记录页跳转过来的
    const fromHistory = options.isFromHistory === 'true';

    // 1. 获取本次挑战的得分和错题本,直接从缓存中读取后端算好的数据
    const score = wx.getStorageSync('challengeScore') || 0;
    const wrongs = wx.getStorageSync('challengeWrongList') || [];
    const newTotalScore = wx.getStorageSync('totalScore') || 0;
    const currentPerf = wx.getStorageSync('currentPerformance') || '再接再厉';

    // 2. 渲染页面
    this.setData({
      isFromHistory: fromHistory,
      currentScore: score,
      totalScore: newTotalScore,
      performance: currentPerf,
      titleColor: PERFORMANCE_COLORS[currentPerf] || 'linear-gradient(135deg, #CFD8DC 0%, #90A4AE 100%)',
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
  },

  // 点击错题，跳转到搜索页查看详情（教育闭环）
  goToSearchDetail: function(e) {
    const keyword = e.currentTarget.dataset.keyword;
    if (keyword) {
      wx.navigateTo({
        // 直接跳转到识别结果详情页
        url: `/pages/result/result?keyword=${keyword}`
      });
    }
  },
})