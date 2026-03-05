// pages/user/challengeHistory.js
Page({
  data: {
    historyList: [
      {
        id: '1',
        score: 10,
        correctCount: 10,
        title: '环保王者',
        titleClass: 'level-4', // 对应 CSS 里的动态配色
        date: '2026-03-05 14:30',
        wrongList: [] // 满分没有错题
      },
      {
        id: '2',
        score: 8,
        correctCount: 8,
        title: '环保小达人',
        titleClass: 'level-3',
        date: '2026-03-03 10:15',
        // 模拟错题复盘数据
        wrongList: [
          { name: '废旧电池', userSelect: '其他垃圾', correctAnswer: '有害垃圾' },
          { name: '大骨头', userSelect: '厨余垃圾', correctAnswer: '其他垃圾' }
        ]
      },
      {
        id: '3',
        score: 5,
        correctCount: 5,
        title: '环保新手',
        titleClass: 'level-1',
        date: '2026-03-01 09:20',
        wrongList: [
          { name: '塑料袋', userSelect: '可回收物', correctAnswer: '其他垃圾' },
          // ... 更多错题
        ]
      }
    ]
  },

  onLoad: function (options) {
    // 实际项目中应调用 wx.getStorageSync('challengeHistoryList')
    console.log("加载挑战历史数据");
  },

  // 点击卡片，前往结果页查看明细复盘
  goToDetail: function(e) {
    const item = e.currentTarget.dataset.item;
    
    // 为了让结果页（Result）能展示这个历史记录的对错，我们把数据存入临时缓存
    wx.setStorageSync('challengeScore', item.score);
    wx.setStorageSync('challengeWrongList', item.wrongList);
    
    // 跳转到挑战结果页，实现复用！
    wx.navigateTo({
      url: '/pages/challenge/result?isFromHistory=true' 
    });
  },

  // 点击筛选
  onFilter: function() {
    wx.showActionSheet({
      itemList: ['全部挑战', '满分通关', '及格挑战', '不及格记录'],
      success: (res) => {
        console.log("用户选择了筛选条件索引：", res.tapIndex);
        wx.showToast({
          title: '筛选功能开发中',
          icon: 'none'
        });
      }
    });
  }
})