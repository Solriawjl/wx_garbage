// pages/search/index.js

let searchTimer = null; // 全局防抖定时器

Page({
  data: {
    inputValue: '',
    historyList: [],   // 本地历史记录
    hotList: [],
    suggestList: [] // 🚀 存放后端返回的联想词
  },

  onLoad: function (options) {
    // 页面加载时，从本地缓存读取搜索历史
    const history = wx.getStorageSync('searchHistory') || [];
    this.setData({ historyList: history });
    // 页面加载时，去拉取真实热搜榜
    this.fetchHotList();
  },

  // 获取热搜的函数
  fetchHotList: function() {
    wx.request({
      url: 'http://192.168.0.126:8000/api/search/hot', 
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200) {
          this.setData({
            hotList: res.data.data
          });
        }
      }
    });
  },

  // 监听输入框变化并加入防抖联想
  onInput: function(e) {
    const val = e.detail.value;
    this.setData({ inputValue: val });

    // 如果把字删光了，清空联想列表
    if (!val.trim()) {
      this.setData({ suggestList: [] });
      return;
    }

    // 防抖机制：每次打字先清除上一次的定时器
    if (searchTimer) clearTimeout(searchTimer);
    
    // 停顿 300 毫秒后，才去向后端请求联想词
    searchTimer = setTimeout(() => {
      this.fetchSuggestions(val.trim());
    }, 300);
  },

  // 去后端拉取联想词
  fetchSuggestions: function(keyword) {
    wx.request({
      url: `http://192.168.0.126:8000/api/search/suggest?keyword=${encodeURIComponent(keyword)}`, // ⚠️ 记得换 IP
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200) {
          this.setData({ suggestList: res.data.data });
        }
      }
    });
  },

  // 点击联想词列表中的某一项
  onTapSuggest: function(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({ 
      inputValue: keyword, 
      suggestList: [] // 选完后收起联想列表
    });
    this.executeSearch(keyword);
  },

  // 清空输入框
  clearInput: function() {
    this.setData({
      inputValue: '',
      suggestList: [] // 同步清空联想
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
    this.setData({ inputValue: keyword }); 
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