// components/tip-card/tip-card.js
Component({
  /**
   * 组件的属性列表 (父页面传进来的数据)
   */
  properties: {
    // 控制弹窗是否显示
    visible: {
      type: Boolean,
      value: false
    },
    // 卡片的完整数据对象 (title, content, image_url 等)
    tipData: {
      type: Object,
      value: {}
    }
  },

  /**
   * 组件的初始数据
   */
  data: {

  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 点击关闭按钮或遮罩层时触发
    onClose() {
      // 触发父页面的 custom 事件，让父页面把 visible 设为 false
      this.triggerEvent('close');
    },

    // 阻止事件冒泡的空函数
    preventTouch() {
      // 什么都不做，仅仅是为了挡住点击事件不让它穿透到遮罩层
    }
  }
})