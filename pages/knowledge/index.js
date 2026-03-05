// pages/knowledge/index.js
Page({
  data: {
    currentTab: 0, // 0: 分类图谱, 1: 环保小知识
    
    // 图谱模式下的四个大类数据
    categories: [
      { 
        id: 'recycle', 
        name: '可回收物', 
        icon: 'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/knowledge/blue.png', 
        color: '#4c84ff', 
        bgColor: '#e3efff', 
        description: '是指在日常生活中产生的、未经污染且适宜回收利用的废弃物。这类垃圾通常具有可循环再生的物理或化学特性，能够通过规范的回收、分拣和处理流程，重新转化为原材料或新产品，从而减少资源消耗和环境污染。',
        guidance: '请尽量保持清洁干燥，避免污染；立体包装请清空内容物，清洁后压扁投放；有尖锐边角的，应包裹后投放。',
        subGroups: [
          {
            title: '纸张类',
            items: ['报纸', '纸箱', '传单', '旧书本', '复印纸', '纸袋']
          },
          {
            title: '塑料类',
            items: ['塑料瓶', '洗发水瓶', '塑料玩具', '塑料衣架', '食用油桶']
          },
          {
            title: '玻璃与金属',
            items: ['玻璃罐', '碎玻璃(需包裹)', '易拉罐', '金属罐', '螺丝钉']
          },
          {
            title: '织物与其他',
            items: ['旧衣服', '床单', '包包', '毛绒玩具', '插线板', '路由器']
          }
        ]
      },
      { 
        id: 'kitchen', 
        name: '厨余垃圾', 
        icon: 'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/knowledge/green.png',
        color: '#8bc34a', 
        bgColor: '#f1f8e9',
        description: '是指居民日常生活及食品加工、饮食服务、单位供餐等活动中产生的垃圾，包括丢弃不用的菜叶、剩菜、剩饭、果皮、蛋壳、茶渣、骨头等。',
        guidance: '厨余垃圾应当沥干水分后投放；坚硬的骨头（如猪腿骨）及贝壳类由于不易降解，通常归类为其他垃圾，请注意区分。',
        subGroups: [
          {
            title: '食材废料',
            items: ['菜叶', '菜帮', '果皮', '果核', '蛋壳', '茶渣', '咖啡渣']
          },
          {
            title: '剩菜剩饭',
            items: ['剩饭', '剩菜', '碎骨头', '动物内脏', '过期食品']
          }
        ]
      },
      { 
        id: 'other', 
        name: '其他垃圾', 
        icon: 'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/knowledge/yellow.png',
        color: '#ffb300', 
        bgColor: '#fff8e1',
        description: '危害较小，但无再次利用价值，如建筑垃圾类，生活垃圾类等，一般采取填埋、焚烧、卫生分解等方法，部分还可以使用生物解决。',
        guidance: '尽量沥干水分；难以辨识类别的生活垃圾，均可投入其他垃圾收集容器内。',
        subGroups: [
          {
            title: '生活用品',
            items: ['卫生纸', '面巾纸', '湿巾', '纸尿裤', '妇女用品', '烟蒂']
          },
          {
            title: '难以降解',
            items: ['陶瓷碗碟', '大骨头', '贝壳', '花盆', '一次性餐盒', '污染的塑料袋']
          }
        ]
      },
      { 
        id: 'harmful', 
        name: '有害垃圾', 
        icon: 'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/knowledge/red.png',
        color: '#e53935', 
        bgColor: '#ffebee',
        description: '含有对人体健康有害的重金属、有毒的物质或者对环境造成现实危害或者潜在危害的废弃物。',
        guidance: '投放时请注意轻放，易破损的请连带包装或包裹后投放；如易挥发，请密封后投放。',
        subGroups: [
          {
            title: '电池与灯管',
            items: ['废干电池', '充电电池', '纽扣电池', '节能灯', '荧光灯管']
          },
          {
            title: '医药与日化',
            items: ['过期药品', '药片包装', '水银温度计', '杀虫剂', '染发剂外壳', '废油漆桶']
          }
        ]
      }
    ],
    currentCategory: {}, // 当前选中的垃圾分类

    // 环保小知识的模拟数据
    articles: [
      { id: 1, title: '你知道一节废电池污染多少水吗？', summary: '一节1号电池烂在地里，能使1平方米的土壤永久丧失利用价值...', date: '2026-03-05', image: '/images/article1.png' },
      { id: 2, title: '变废为宝：咖啡渣的5个神仙妙用', summary: '喝完咖啡别急着倒掉，它可是纯天然的去味剂和植物肥料。', date: '2026-03-04', image: '/images/article2.png' },
      { id: 3, title: '外卖盒到底属于什么垃圾？', summary: '洗干净的外卖盒是可回收物，但沾满油污的只能算其他垃圾...', date: '2026-03-01', image: '/images/article3.png' }
    ]
  },

  onLoad: function (options) {
    // 页面加载时，默认选中第一个分类（可回收物）
    this.setData({
      currentCategory: this.data.categories[0]
    });
  },

  // 切换顶部 Tab (分类图谱 / 环保小知识)
  switchTab: function(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({
      currentTab: index
    });
  },

  // 点击顶部垃圾桶，切换当前图谱大类
  selectCategory: function(e) {
    const id = e.currentTarget.dataset.id;
    const selected = this.data.categories.find(item => item.id === id);
    this.setData({
      currentCategory: selected
    });
  },

  // 点击具体的百科词条（如：报纸、易拉罐）
  onItemTap: function(e) {
    const itemName = e.currentTarget.dataset.name;
    console.log("点击了知识库词条：", itemName);
    
    // 直接带着词条名称，跳转到搜索结果页进行查询展示
    wx.navigateTo({
      url: '/pages/result/result?keyword=' + itemName
    });
  },

  // 跳转到文章详情页 (后续可扩展)
  goToArticleDetail: function(e) {
    const id = e.currentTarget.dataset.id;
    console.log("准备跳转到文章详情，ID:", id);
    wx.showToast({
      title: '正在打开文章...',
      icon: 'none'
    });
  }
})