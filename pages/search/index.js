// pages/search/index.js
Page({
  data: {
    searchValue: '', // 用于实时保存用户输入的内容
    // 对应原型图中的历史搜索记录
    historyList: ['纸巾', '盒子', '苹果', '玻璃', '易拉罐', '绳子']
  },

  // 监听输入框的输入事件，实时更新 searchValue
  onInput: function(e) {
    this.setData({
      searchValue: e.detail.value
    });
  },

  // 点击搜索按钮或键盘搜索键时触发
  onSearch: function() {
    // 获取当前输入的值，并去除首尾空格
    const word = this.data.searchValue.trim(); 
    
    // 如果输入为空，给个提示并拦截跳转
    if (!word) {
      wx.showToast({
        title: '请输入垃圾名称',
        icon: 'none'
      });
      return; 
    }

    console.log("执行搜索逻辑，关键词：", word);

    // 将新搜索的词自动加入到历史记录的最前面
    let currentHistory = this.data.historyList;
    // 去重：如果历史记录里已经有这个词，先把它删掉，再放到最前面
    const index = currentHistory.indexOf(word);
    if (index > -1) {
      currentHistory.splice(index, 1);
    }
    currentHistory.unshift(word); // 放到数组头部
    
    this.setData({
      historyList: currentHistory
    });
    // 注意：实际项目中还可以加上 wx.setStorageSync('history', currentHistory) 将其保存在手机本地缓存中

    // 逻辑：跳转到结果页，并带上 keyword 参数
    wx.navigateTo({
      url: '/pages/result/result?keyword=' + word
    });
  },

  // 点击历史标签直接搜索
  onTagTap: function(e) {
    const word = e.currentTarget.dataset.word;
    console.log("点击历史标签搜索：", word);

    // 将点击的词重新移到历史记录的最前面
    let currentHistory = this.data.historyList;
    const index = currentHistory.indexOf(word);
    
    if (index > -1) {
      currentHistory.splice(index, 1); // 先把这个词从原来的位置删掉
    }
    currentHistory.unshift(word); // 再把它插到数组的最前面

    // 更新页面数据
    this.setData({
      historyList: currentHistory
    });

    // 携带参数跳转到结果页
    wx.navigateTo({
      url: '/pages/result/result?keyword=' + word
    });
  },

  // 清除历史记录
  clearHistory: function() {
    wx.showModal({
      title: '提示',
      content: '确定要清空搜索历史吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ historyList: [] });
        }
      }
    });
  }
})