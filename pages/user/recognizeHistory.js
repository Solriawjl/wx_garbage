// pages/user/recognizeHistory.js
Page({
  data: {
    // 模拟的识别历史数据 (结合了你原型中的时间和物品)
    historyList: [
      {
        id: '1',
        itemName: '钱币',
        categoryName: '可回收物',
        categoryClass: 'recycle', 
        imageUrl: '/images/temp_money.png', // 之前存的钱币占位图
        date: '2026-03-03 14:30'
      },
      {
        id: '2',
        itemName: '剩饭剩菜',
        categoryName: '厨余垃圾',
        categoryClass: 'kitchen',
        imageUrl: '/images/temp_kitchen.png', 
        date: '2026-03-02 18:15'
      },
      {
        id: '3',
        itemName: '废旧干电池',
        categoryName: '有害垃圾',
        categoryClass: 'harmful',
        imageUrl: '/images/temp_battery.png',
        date: '2026-03-01 09:42'
      },
      {
        id: '4',
        itemName: '用过的餐巾纸',
        categoryName: '其他垃圾',
        categoryClass: 'other',
        imageUrl: '/images/temp_paper.png',
        date: '2026-02-28 12:05'
      }
    ]
  },

  onLoad: function (options) {
    // 实际项目中，这里应该调用 wx.getStorageSync('recognizeHistory') 获取真实数据
    console.log("加载识别历史数据");
  },

  // 点击卡片，重新查看该物品的识别结果
  goToDetail: function(e) {
    const item = e.currentTarget.dataset.item;
    // 新增：带着 isFromHistory=true 的标记跳转到结果页
    wx.navigateTo({
      url: `/pages/result/result?keyword=${item.itemName}&isFromHistory=true`
    });
  },

  // 点击筛选按钮
  onFilter: function() {
    wx.showActionSheet({
      itemList: ['全部记录', '可回收物', '厨余垃圾', '有害垃圾', '其他垃圾'],
      success: (res) => {
        console.log("用户选择了筛选条件索引：", res.tapIndex);
        // 这里可以编写过滤 historyList 数组的逻辑
        wx.showToast({
          title: '筛选功能开发中',
          icon: 'none'
        });
      }
    });
  }
})