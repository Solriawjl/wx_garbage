// pages/knowledge/index.js
Page({
  data: {
    currentTab: 0, // 0: 分类图谱, 1: 环保小知识
    
    // 图谱模式下的四个大类数据
    categories: [
      { 
        id: 'recycle', 
        categoryId: 1, // 对应后端的 1-可回收
        name: '可回收物', 
        icon: 'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/knowledge/blue.png', 
        color: '#4c84ff', 
        bgColor: '#e3efff', 
        description: '是指在日常生活中产生的、未经污染且适宜回收利用的废弃物。这类垃圾通常具有可循环再生的物理或化学特性，能够通过规范的回收、分拣和处理流程，重新转化为原材料或新产品，从而减少资源消耗和环境污染。',
        guidance: '请尽量保持清洁干燥，避免污染；立体包装请清空内容物，清洁后压扁投放；有尖锐边角的，应包裹后投放。',
        subGroups: [] // 留空，等后端来填
      },
      { 
        id: 'kitchen', 
        categoryId: 3, // 对应后端的 3-厨余
        name: '厨余垃圾', 
        icon: 'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/knowledge/green.png',
        color: '#8bc34a', 
        bgColor: '#f1f8e9',
        description: '是指居民日常生活及食品加工、饮食服务、单位供餐等活动中产生的垃圾，包括丢弃不用的菜叶、剩菜、剩饭、果皮、蛋壳、茶渣、骨头等。',
        guidance: '厨余垃圾应当沥干水分后投放；坚硬的骨头（如猪腿骨）及贝壳类由于不易降解，通常归类为其他垃圾，请注意区分。',
        subGroups: []
      },
      { 
        id: 'other', 
        categoryId: 4, // 对应后端的 4-其他
        name: '其他垃圾', 
        icon: 'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/knowledge/yellow.png',
        color: '#ffb300', 
        bgColor: '#fff8e1',
        description: '危害较小，但无再次利用价值，如建筑垃圾类，生活垃圾类等，一般采取填埋、焚烧、卫生分解等方法，部分还可以使用生物解决。',
        guidance: '尽量沥干水分；难以辨识类别的生活垃圾，均可投入其他垃圾收集容器内。',
        subGroups: []
      },
      { 
        id: 'harmful', 
        categoryId: 2, // 对应后端的 2-有害
        name: '有害垃圾', 
        icon: 'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/knowledge/red.png',
        color: '#e53935', 
        bgColor: '#ffebee',
        description: '含有对人体健康有害的重金属、有毒的物质或者对环境造成现实危害或者潜在危害的废弃物。',
        guidance: '投放时请注意轻放，易破损的请连带包装或包裹后投放；如易挥发，请密封后投放。',
        subGroups: []
      }
    ],
    currentCategory: {}, // 当前选中的垃圾分类

    // 环保小知识的分页数据流
    tipList: [],           // 存放后端请求回来的真实文章列表
    page: 1,               // 当前第几页
    size: 10,              // 每页请求多少条
    isLoading: false,      // 请求锁，防止重复加载
    hasMore: true,         // 是否还有下一页

    currentTipData: {},     // 存着当前被点击的完整图文数据
    isTipCardVisible: false // 控制卡片弹窗开关
  },

  onLoad: function (options) {
    if(this.data.categories && this.data.categories.length > 0) {
      this.setData({ currentCategory: this.data.categories[0] });
      // 页面加载时，自动去拉取第一个分类（可回收物）的物品数据
      this.fetchKnowledgeItems(this.data.categories[0].categoryId);
    }
    this.fetchTipsList(true);
  },

  // 切换顶部 Tab
  switchTab: function(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({ currentTab: index });
  },

  // 分类图谱的相关逻辑
  selectCategory: function(e) {
    const id = e.currentTarget.dataset.id;
    const selected = this.data.categories.find(item => item.id === id);
    // 先清空上一个分类的物品，防止视觉残留，然后再去拉取新的
    this.setData({ 
      currentCategory: { ...selected, subGroups: [] }
    });
    // 去拉取用户选中的新分类下的物品数据
    this.fetchKnowledgeItems(selected.categoryId);
  },

  // ==========================================
  // 从后端获取物品字典并注入
  // ==========================================
  fetchKnowledgeItems: function(categoryId) {
    wx.showLoading({ title: '加载中...', mask: true });
    wx.request({
      url: `http://192.168.0.126:8000/api/knowledge/items?category_type=${categoryId}`, // ⚠️ 记得换 IP
      method: 'GET',
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          // 后端返回的是 {subCategory: '纸张类', items: [...]}
          // 我们把它转成 WXML 原本期待的 {title: '纸张类', items: [...]}
          const backendData = res.data.data;
          const formattedSubGroups = backendData.map(group => {
            return {
              title: group.subCategory, 
              items: group.items
            };
          });

          // 把组合好的数据塞回当前的 currentCategory 里，页面瞬间渲染
          this.setData({
            'currentCategory.subGroups': formattedSubGroups
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({ title: '请求物品失败', icon: 'error' });
      }
    });
  },

  onItemTap: function(e) {
    const itemName = e.currentTarget.dataset.name;
    wx.navigateTo({
      url: '/pages/result/result?keyword=' + encodeURIComponent(itemName) 
    });
  },

  // 后端分页加载 环保小知识
  fetchTipsList: function(isRefresh = false) {
    if (this.data.isLoading || (!this.data.hasMore && !isRefresh)) return;

    this.setData({ isLoading: true });
    let targetPage = isRefresh ? 1 : this.data.page;

    wx.request({
      url: `http://192.168.0.126:8000/api/tips/list?page=${targetPage}&size=${this.data.size}`,
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200) {
          const newData = res.data.data;
          this.setData({
            tipList: isRefresh ? newData : this.data.tipList.concat(newData),
            page: targetPage + 1,
            hasMore: newData.length === this.data.size,
            isLoading: false
          });
        }
      },
      fail: (err) => {
        this.setData({ isLoading: false });
        wx.showToast({ title: '网络请求失败', icon: 'error' });
      },
      complete: () => {
        if (isRefresh) wx.stopPullDownRefresh(); 
      }
    });
  },

  // 页面自带监听：用户下拉动作
  onPullDownRefresh: function () {
    if (this.data.currentTab === 1) {
      this.setData({ hasMore: true });
      this.fetchTipsList(true);
    } else {
      wx.stopPullDownRefresh();
    }
  },

  // 页面自带监听：用户上拉触底动作
  onReachBottom: function () {
    if (this.data.currentTab === 1) {
      this.fetchTipsList(false);
    }
  },

  // 点击科普文章触发
  showTipCard: function(e) {
    const clickedTip = e.currentTarget.dataset.tip;
    if (clickedTip) {
      // 1. 保持原有的弹窗展示逻辑不变
      this.setData({ 
        currentTipData: clickedTip,
        isTipCardVisible: true 
      });

      // 静默触发每日科普阅读打卡任务
      const userId = wx.getStorageSync('userId');
      if (userId) {
        wx.request({
          // 注意：如果你的后端 IP 有变动，请修改这里
          url: 'http://192.168.0.126:8000/api/task/read_tip', 
          method: 'POST',
          data: { user_id: parseInt(userId) },
          success: (res) => {
            if (res.data.code === 200) {
              const taskData = res.data.data;
              
              // 只有当获得了实际积分（即今天第一次读）时才弹窗表扬
              if (taskData.reward_points > 0) {
                // 更新本地缓存，防止个人中心的段位和积分没同步刷新
                wx.setStorageSync('totalScore', taskData.total_score);
                wx.setStorageSync('currentTitle', taskData.title);

                // 弹出让小朋友极度舒适的加分提示！
                wx.showToast({
                  title: `每日阅读 +${taskData.reward_points} 积分`,
                  icon: 'success',
                  duration: 2500
                });
              }
            }
          },
          fail: (err) => {
            console.error('阅读任务打卡请求失败', err);
          }
        });
      }
    }
  },

  hideTipCard: function() {
    this.setData({ isTipCardVisible: false });
  }
})