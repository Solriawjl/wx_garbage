// pages/challenge/quiz.js
Page({
  data: {
    // 固定的四个垃圾桶选项 (国家标准统一术语)
    options: [
      { id: 'recycle', name: '可回收物', icon: 'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/knowledge/blue.png' },
      { id: 'kitchen', name: '厨余垃圾', icon: 'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/knowledge/green.png' },
      { id: 'other', name: '其他垃圾', icon: 'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/knowledge/yellow.png' },
      { id: 'harmful', name: '有害垃圾', icon: 'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/knowledge/red.png' }
    ],
    
    // 原始题库 (实际开发中可以从后端接口获取更多)
    questionPool: [
      { name: '纸巾', category: 'other' },
      { name: '易拉罐', category: 'recycle' },
      { name: '苹果核', category: 'kitchen' },
      { name: '废电池', category: 'harmful' },
      { name: '塑料瓶', category: 'recycle' },
      { name: '剩饭', category: 'kitchen' },
      { name: '陶瓷碎片', category: 'other' },
      { name: '过期感冒药', category: 'harmful' },
      { name: '旧衣服', category: 'recycle' },
      { name: '鱼骨头', category: 'kitchen' },
      { name: '污染的塑料袋', category: 'other' },
      { name: '废旧灯管', category: 'harmful' }
    ],
    
    // 游戏状态
    questions: [],        // 本次挑战抽取的10道题
    totalQuestions: 10,   // 总题数
    currentIndex: 0,      // 当前答到了第几题 (0-9)
    currentQuestion: {},  // 当前题目的对象
    
    score: 0,             // 当前得分
    wrongList: [],        // 错题本 (记录选错的题目以便复盘)
    
    // 界面反馈控制
    isAnswering: false,   // 是否正在展示答案 (锁定屏幕防止连点)
    showAnswer: false,    // 是否显示正确答案
    selectedId: '',       // 用户选中的类别 ID
    isCorrect: false      // 用户是否选对
  },

  onLoad: function (options) {
    this.initGame();
  },

  // 初始化游戏 (随机抽题)
  initGame: function() {
    // 1. 打乱原始题库
    let shuffled = this.data.questionPool.sort(() => 0.5 - Math.random());
    // 2. 截取前 10 道题
    let selectedQuestions = shuffled.slice(0, this.data.totalQuestions);
    
    this.setData({
      questions: selectedQuestions,
      currentIndex: 0,
      currentQuestion: selectedQuestions[0],
      score: 0,
      wrongList: [],
      isAnswering: false,
      showAnswer: false,
      selectedId: ''
    });
  },

  // 用户点击选项
  onSelectOption: function(e) {
    // 如果已经被锁定了（正在展示上一题的对错），则不允许点击
    if (this.data.isAnswering) return;

    const userSelectedId = e.currentTarget.dataset.id;
    const correctId = this.data.currentQuestion.category;
    const isRight = (userSelectedId === correctId);

    // 1. 立即锁定界面，记录用户选择，并判断对错
    this.setData({
      isAnswering: true,
      showAnswer: true,
      selectedId: userSelectedId,
      isCorrect: isRight
    });

    // 2. 积分与错题本逻辑
    if (isRight) {
      this.setData({ score: this.data.score + 1 });
    } else {
      // 答错了，记录到错题本里，方便结果页展示
      let wrongItem = {
        name: this.data.currentQuestion.name,
        userSelect: this.getCategoryName(userSelectedId),
        correctAnswer: this.getCategoryName(correctId)
      };
      this.data.wrongList.push(wrongItem);
    }

    // 3. 延时 1.2 秒后自动进入下一题，给用户留出看清对错的时间
    setTimeout(() => {
      this.nextQuestion();
    }, 1200);
  },

  // 切换到下一题
  nextQuestion: function() {
    let nextIndex = this.data.currentIndex + 1;

    if (nextIndex < this.data.totalQuestions) {
      // 还没答完，刷新状态进入下一题
      this.setData({
        currentIndex: nextIndex,
        currentQuestion: this.data.questions[nextIndex],
        isAnswering: false,
        showAnswer: false,
        selectedId: ''
      });
    } else {
      // 10道题答完了，游戏结束！
      this.gameOver();
    }
  },

  // 游戏结束，跳转结算页
  gameOver: function() {
    console.log("挑战结束！得分：", this.data.score);
    console.log("错题本：", this.data.wrongList);

    // 因为错题本数组比较复杂，在页面间传递最好使用全局数据或本地缓存
    wx.setStorageSync('challengeScore', this.data.score);
    wx.setStorageSync('challengeWrongList', this.data.wrongList);

    // 跳转到挑战结果页 (由于不需要回退到答题页，使用 redirectTo)
    wx.redirectTo({
      url: '/pages/challenge/result'
    });
  },

  // 辅助函数：通过 ID 获取中文名称
  getCategoryName: function(id) {
    const item = this.data.options.find(opt => opt.id === id);
    return item ? item.name : '未知';
  }
})