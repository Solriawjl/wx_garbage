// pages/search/index.js
Page({
  data: {
    inputValue: '',
    historyList: [], // 本地历史记录
    hotList: ['塑料瓶', '废电池', '过期感冒药', '大骨头', '外卖包装', '碎玻璃'] // 模拟热搜
  },

  onLoad: function (options) {
    // 页面加载时，从本地缓存读取搜索历史
    const history = wx.getStorageSync('searchHistory') || [];
    this.setData({
      historyList: history
    });
  },

  // 监听输入框变化
  onInput: function(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },

  // 清空输入框
  clearInput: function() {
    this.setData({
      inputValue: ''
    });
  },

  // 点击取消，返回上一页
  goBack: function() {
    wx.navigateBack();
  },

  // 点击软键盘上的“搜索”按钮触发
  onConfirm: function(e) {
    const keyword = e.detail.value.trim();
    if (!keyword) {
      wx.showToast({ title: '请输入物品名称', icon: 'none' });
      return;
    }
    this.executeSearch(keyword);
  },

  // 点击历史标签或热门标签触发
  onTapTag: function(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({ inputValue: keyword }); // 把词填进输入框，体验更好
    this.executeSearch(keyword);
  },

  // 核心执行搜索逻辑
  executeSearch: function(keyword) {
    // 1. 保存到本地历史记录
    this.saveHistory(keyword);

    // 2. 带着 keyword 跳转到 result 结果页
    // result 页的 onLoad 会拦截这个 keyword，并去请求后端的文字搜索接口
    wx.navigateTo({
      url: `/pages/result/result?keyword=${encodeURIComponent(keyword)}`
    });
  },

  // 保存搜索历史 (核心算法：去重、置顶、限长)
  saveHistory: function(keyword) {
    let history = this.data.historyList;
    
    // 如果已经存在这个词，先把它删掉 (为了后面把它放到最前面)
    const index = history.indexOf(keyword);
    if (index > -1) {
      history.splice(index, 1);
    }
    
    // 把新词插到数组最前面
    history.unshift(keyword);
    
    // 限制最多保留 10 条历史记录
    if (history.length > 10) {
      history = history.slice(0, 10);
    }

    // 更新 data 并持久化到手机本地缓存
    this.setData({ historyList: history });
    wx.setStorageSync('searchHistory', history);
  },

  // 清空历史记录
  clearHistory: function() {
    wx.showModal({
      title: '提示',
      content: '确定要清空搜索历史吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ historyList: [] });
          wx.removeStorageSync('searchHistory');
        }
      }
    });
  }
})