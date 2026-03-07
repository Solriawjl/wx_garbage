// pages/user/challengeHistory.js
Page({
  data: {
    historyList: [],
    
    // 左滑控制参数
    startX: 0,
    isMoving: false
  },

  onLoad: function (options) {
    this.fetchChallengeHistory();
  },

  fetchChallengeHistory: function() {
    const userId = wx.getStorageSync('userId');
    wx.showLoading({ title: '加载中...' });

    wx.request({
      url: `http://192.168.0.126:8000/api/user/challenge_history?user_id=${userId}`,
      method: 'GET',
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          // 初始化时给每个 item 增加 offsetX: 0
          let list = res.data.data.map(item => {
            return { ...item, offsetX: 0 };
          });
          this.setData({ historyList: list });
        }
      }
    });
  },

  // -----------------------------------------
  // 🚀 新增：一键归位所有的滑动卡片
  // -----------------------------------------
  recoverSwipe: function() {
    let list = this.data.historyList;
    let hasOpen = false;
    
    list.forEach(item => {
      if (item.offsetX < 0) {
        item.offsetX = 0; 
        hasOpen = true;
      }
    });
    
    if (hasOpen) {
      this.setData({ historyList: list });
      return true; 
    }
    return false;
  },

  // -----------------------------------------
  // 🚀 左滑删除核心算法
  // -----------------------------------------
  touchS: function (e) {
    if (e.touches.length === 1) {
      let list = this.data.historyList;
      let currentIndex = e.currentTarget.dataset.index;
      
      // 滑动新卡片时，自动收起其他卡片
      list.forEach((item, index) => {
        if (index !== currentIndex && item.offsetX < 0) {
          item.offsetX = 0;
        }
      });

      this.setData({
        historyList: list,
        startX: e.touches[0].clientX,
        isMoving: true 
      });
    }
  },

  touchM: function (e) {
    if (e.touches.length === 1) {
      let moveX = e.touches[0].clientX;
      let disX = this.data.startX - moveX;
      let list = this.data.historyList;
      let index = e.currentTarget.dataset.index;
      
      if (disX <= 0) { list[index].offsetX = 0; }
      else { list[index].offsetX = -disX >= -140 ? -disX : -140; }
      
      this.setData({ historyList: list });
    }
  },

  touchE: function (e) {
    if (e.changedTouches.length === 1) {
      let endX = e.changedTouches[0].clientX;
      let disX = this.data.startX - endX;
      let list = this.data.historyList;
      let index = e.currentTarget.dataset.index;
      
      list[index].offsetX = disX > 70 ? -140 : 0;
      this.setData({ historyList: list, isMoving: false });
    }
  },

  // -----------------------------------------
  // 🗑️ 单条删除与一键清空
  // -----------------------------------------
  removeItem: function(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.historyList[index];
    
    wx.showModal({
      title: '⚠️ 扣分预警',
      content: `删除该记录将同步扣除您在此局获得的 ${item.score} 积分，可能会导致环保称号降级！确定要删除吗？`,
      confirmColor: '#F44336', // 使用红色确认按钮警告用户
      success: (res) => {
        if (res.confirm) {
          wx.request({
            url: `http://192.168.0.126:8000/api/user/challenge_history/${item.id}`,
            method: 'DELETE',
            success: (delRes) => {
              if (delRes.data.code === 200) {
                // 1. 从列表移除UI
                let newList = this.data.historyList;
                newList.splice(index, 1);
                this.setData({ historyList: newList });
                
                // 2. 同步更新本地缓存，这样回到个人中心时分数就真的掉了
                const newData = delRes.data.data;
                if (newData) {
                  wx.setStorageSync('totalScore', newData.total_score);
                  wx.setStorageSync('currentTitle', newData.title);
                }

                wx.showToast({ title: `已删除，扣除 ${item.score} 分`, icon: 'none' });
              }
            }
          });
        } else {
          // 取消时自动弹回卡片
          let list = this.data.historyList;
          list[index].offsetX = 0;
          this.setData({ historyList: list });
        }
      }
    });
  },

  clearAll: function() {
    wx.showModal({
      title: '🚨 危险操作预警',
      content: '清空历史将扣除这些记录产生的【全部积分】，您的称号可能直接掉回原形！确定要继续吗？',
      confirmColor: '#F44336',
      success: (res) => {
        if (res.confirm) {
          const userId = wx.getStorageSync('userId');
          wx.request({
            url: `http://192.168.0.126:8000/api/user/challenge_history/clear?user_id=${userId}`,
            method: 'DELETE',
            success: (delRes) => {
              if (delRes.data.code === 200) {
                this.setData({ historyList: [] });
                
                // 同步更新本地缓存
                const newData = delRes.data.data;
                if (newData) {
                  wx.setStorageSync('totalScore', newData.total_score);
                  wx.setStorageSync('currentTitle', newData.title);
                }

                wx.showToast({ title: '记录与积分已全部清空', icon: 'none' });
              }
            }
          });
        }
      }
    });
  },

  // -----------------------------------------
  // 原有点击跳转详情逻辑
  // -----------------------------------------
  goToDetail: function(e) {
    // 如果存在被滑开的卡片，点击卡片时优先缩回，不触发跳转
    if (this.recoverSwipe()) {
      return; 
    }

    const item = e.currentTarget.dataset.item;
    wx.setStorageSync('challengeScore', item.score);
    wx.setStorageSync('challengeWrongList', item.wrongList);
    
    wx.navigateTo({
      url: '/pages/challenge/result?isFromHistory=true' 
    });
  }
})