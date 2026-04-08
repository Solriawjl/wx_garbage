// pages/user/challengeHistory.js
Page({
  data: {
    historyList: [],
    
    // 左滑控制参数
    startX: 0,
    isMoving: false,

    hasData: false, 

    // 🚀 核心修改 2：配置多级联动筛选器的数据字典
    subOptions: [
      ['全部称号'], // 对应：全部模式
      ['全部称号', '完美通关', '火眼金睛', '渐入佳境', '再接再厉'], // 对应：经典模式
      ['全部称号', '极限王者', '极速达人', '游刃有余', '眼疾手快']  // 对应：限时模式
    ],
    // 渲染在 picker 里的当前两列数组
    multiArray: [
      ['全部模式', '经典模式', '限时模式'],
      ['全部称号']
    ],
    // 当前选中的各列索引
    multiIndex: [0, 0]
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
          let list = res.data.data.map(item => {
            return { ...item, offsetX: 0 };
          });
          
          this.allRecordList = list;
          this.setData({ hasData: list.length > 0 });
          this.applyFilter();
        }
      }
    });
  },

  // 🚀 新增：当用户在下拉框中滑动列时触发 (实现联动效果)
  onFilterColumnChange: function(e) {
    // 只有当滑动第一列(模式列)时，才需要动态更换第二列(称号列)的选项
    if (e.detail.column === 0) {
      let multiArray = this.data.multiArray;
      let multiIndex = this.data.multiIndex;

      // 根据第一列选中的项，动态把数据字典里的数组赋给第二列
      multiArray[1] = this.data.subOptions[e.detail.value];
      
      // 更新索引状态，并将第二列重置回 0 ("全部称号")
      multiIndex[0] = e.detail.value;
      multiIndex[1] = 0; 

      this.setData({ multiArray: multiArray, multiIndex: multiIndex });
    }
  },

  // 🚀 修改：当用户点击“确定”完成选择时触发
  onFilterChange: function(e) {
    this.setData({ multiIndex: e.detail.value });
    this.applyFilter();
  },

  // 🚀 修改：支持两级叠加条件过滤的大脑
  applyFilter: function() {
    const modeIdx = this.data.multiIndex[0];
    const titleIdx = this.data.multiIndex[1];
    let filtered = this.allRecordList || [];
    
    // 1. 先按【模式】过滤大类
    if (modeIdx === 1) {
      filtered = filtered.filter(item => item.mode === 'classic' || !item.mode);
    } else if (modeIdx === 2) {
      filtered = filtered.filter(item => item.mode === 'timed');
    }

    // 2. 再按【称号】过滤子类 (如果有选择具体称号的话)
    if (titleIdx > 0) {
      // 从动态数组中取出用户选中的称号中文名称
      const selectedTitle = this.data.multiArray[1][titleIdx];
      filtered = filtered.filter(item => item.title === selectedTitle);
    }
    
    this.setData({ historyList: filtered });
  },

  // -----------------------------------------
  // 归位与左滑逻辑 (保持不变)
  // -----------------------------------------
  recoverSwipe: function() {
    let list = this.data.historyList;
    let hasOpen = false;
    list.forEach(item => {
      if (item.offsetX < 0) { item.offsetX = 0; hasOpen = true; }
    });
    if (hasOpen) { this.setData({ historyList: list }); return true; }
    return false;
  },

  touchS: function (e) {
    if (e.touches.length === 1) {
      let list = this.data.historyList;
      let currentIndex = e.currentTarget.dataset.index;
      list.forEach((item, index) => {
        if (index !== currentIndex && item.offsetX < 0) { item.offsetX = 0; }
      });
      this.setData({ historyList: list, startX: e.touches[0].clientX, isMoving: true });
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
  // 单条删除与一键清空 (保持不变)
  // -----------------------------------------
  removeItem: function(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.historyList[index];
    
    wx.showModal({
      title: '⚠️ 扣分预警',
      content: `删除该记录将同步扣除您在此局获得的 ${item.score} 环保星，可能会导致环保称号降级！确定要删除吗？`,
      confirmColor: '#F44336',
      success: (res) => {
        if (res.confirm) {
          wx.request({
            url: `http://192.168.0.126:8000/api/user/challenge_history/${item.id}`,
            method: 'DELETE',
            success: (delRes) => {
              if (delRes.data.code === 200) {
                // 同步删除底层数据并重新渲染当前分类
                this.allRecordList = this.allRecordList.filter(i => i.id !== item.id);
                this.setData({ hasData: this.allRecordList.length > 0 });
                this.applyFilter();
                
                const newData = delRes.data.data;
                if (newData) {
                  wx.setStorageSync('totalScore', newData.total_score);
                  wx.setStorageSync('currentTitle', newData.title);
                }
                wx.showToast({ title: `已扣除 ${item.score} 分`, icon: 'none' });
              }
            }
          });
        } else {
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
      content: '清空历史将扣除【全部】记录产生的环保星，包含其他模式中隐藏的记录！确定要继续吗？',
      confirmColor: '#F44336',
      success: (res) => {
        if (res.confirm) {
          const userId = wx.getStorageSync('userId');
          wx.request({
            url: `http://192.168.0.126:8000/api/user/challenge_history/clear?user_id=${userId}`,
            method: 'DELETE',
            success: (delRes) => {
              if (delRes.data.code === 200) {
                this.allRecordList = [];
                this.setData({ hasData: false });
                this.applyFilter();
                
                const newData = delRes.data.data;
                if (newData) {
                  wx.setStorageSync('totalScore', newData.total_score);
                  wx.setStorageSync('currentTitle', newData.title);
                }
                wx.showToast({ title: '记录已全部清空', icon: 'none' });
              }
            }
          });
        }
      }
    });
  },

  goToDetail: function(e) {
    if (this.recoverSwipe()) return; 

    const item = e.currentTarget.dataset.item;
    wx.setStorageSync('challengeScore', item.score);
    wx.setStorageSync('challengeWrongList', item.wrongList);
    wx.navigateTo({ url: '/pages/challenge/result?isFromHistory=true' });
  }
})