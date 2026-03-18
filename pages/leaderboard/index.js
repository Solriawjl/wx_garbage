Page({
  data: {
    leaderboardList: []
  },

  onLoad: function () {
    this.fetchLeaderboard();
  },

  fetchLeaderboard: function () {
    wx.showLoading({ title: '加载中...' });
    wx.request({
      url: 'http://192.168.0.126:8000/api/leaderboard', // 你的后端地址
      method: 'GET',
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          
          // 遍历后端返回的列表，根据称号关键字分配不同的 CSS 类名
          const processedList = res.data.data.map(item => {
            let tClass = 'title-default'; // 兜底颜色
            if (item.title.includes('王者')) tClass = 'title-king';
            else if (item.title.includes('达人')) tClass = 'title-master';
            else if (item.title.includes('卫士')) tClass = 'title-expert';
            else if (item.title.includes('新手')) tClass = 'title-star';
            
            return {
              ...item,
              titleClass: tClass // 把算好的类名存进去
            };
          });

          this.setData({
            leaderboardList: processedList
          });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '网络请求失败', icon: 'none' });
      }
    });
  }
})