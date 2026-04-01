// pages/challenge/quiz.js
Page({
  data: {
    // 固定的四个垃圾桶选项 (国家标准统一术语)
    options: [
      { id: 'recycle', name: '可回收物', icon: 'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/knowledge/blue.png' },
      { id: 'kitchen', name: '厨余垃圾', icon: 'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/knowledge/green.png' },
      { id: 'other', name: '其他垃圾', icon: 'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/knowledge/yellow.png' },
      { id: 'harmful', name: '有害垃圾', icon: 'https://images-1408449839.cos.ap-chengdu.myqcloud.com/images/knowledge/red.png' },
    ],
    // 建立后端数字 ID 到前端字母 ID 的映射关系
    categoryMap: {
      1: 'recycle',
      2: 'harmful',
      3: 'kitchen',
      4: 'other'
    },
    
    // 游戏状态
    questions: [],        // 本次挑战抽取的题
    totalQuestions: 10,   // 总题数
    currentIndex: 0,      // 当前答到了第几题
    currentQuestion: {},  // 当前题目的对象
    
    score: 0,             // 🚀 注意：这里的 score 现在仅代表“答对的题数”，不再代表最终积分
    wrongList: [],        // 错题本 
    
    // 界面反馈控制
    isAnswering: false,   // 是否正在展示答案 (锁定屏幕防止连点)
    showAnswer: false,    // 是否显示正确答案
    selectedId: '',       // 用户选中的类别 ID
    isCorrect: false,     // 用户是否选对

    mode: 'classic',      // 默认经典模式
    totalTime: 60,        // 🚀 新增：限时模式的总时长 (秒)
    timeLeft: 60,         // 剩余时间
    timerId: null         // 定时器句柄
  },

  onLoad: function (options) {
    // 接收模式参数
    this.setData({ mode: options.mode || 'classic' });
    this.fetchQuestions();
  },

  // 1：从后端动态获取题目
  fetchQuestions: function() {
    wx.showLoading({ title: '题目生成中...', mask: true });
    // 经典模式 10 题，限时模式 25 题
    const limit = this.data.mode === 'timed' ? 25 : 10;
    wx.request({
      url: `http://192.168.0.126:8000/api/challenge/questions?limit=${limit}`,
      method: 'GET',
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200 && res.data.data.length > 0) {
          const mappedQuestions = res.data.data.map(q => ({
            name: q.item_name,
            imageUrl: q.image_url || '/images/null.png',
            category: this.data.categoryMap[q.correct_category_id],
            correctName: q.correct_category_name
          }));

          this.setData({
            questions: mappedQuestions,
            totalQuestions: mappedQuestions.length,
            currentIndex: 0,
            currentQuestion: mappedQuestions[0],
            score: 0, // 初始化答对题数为 0
            wrongList: [],
            isAnswering: false,
            showAnswer: false,
            selectedId: '',
            timeLeft: this.data.totalTime // 初始化倒计时
          });
          
          if (this.data.mode === 'timed') {
            this.startTimer();
          }
          
          wx.enableAlertBeforeUnload({
            message: '挑战尚未结束，现在退出将不保存本次成绩与错题，确认要放弃吗？'
          });
        } else {
          wx.showToast({ title: '题库获取失败', icon: 'none' });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({ title: '网络请求失败', icon: 'none' });
      }
    });
  },

  onSelectOption: function(e) {
    if (this.data.isAnswering) return;

    const userSelectedId = e.currentTarget.dataset.id;
    const correctId = this.data.currentQuestion.category;
    const isRight = (userSelectedId === correctId);

    this.setData({
      isAnswering: true,
      showAnswer: true,
      selectedId: userSelectedId,
      isCorrect: isRight
    });

    if (isRight) {
      this.setData({ score: this.data.score + 1 });
    } else {
      let wrongItem = {
        item_name: this.data.currentQuestion.name,
        user_answer: this.getCategoryName(userSelectedId),
        correct_answer: this.data.currentQuestion.correctName,
        name: this.data.currentQuestion.name,
        userSelect: this.getCategoryName(userSelectedId),
        correctAnswer: this.data.currentQuestion.correctName
      };
      this.data.wrongList.push(wrongItem);
    }

    setTimeout(() => {
      this.nextQuestion();
    }, 1200);
  },

  nextQuestion: function() {
    let nextIndex = this.data.currentIndex + 1;

    if (nextIndex < this.data.totalQuestions) {
      this.setData({
        currentIndex: nextIndex,
        currentQuestion: this.data.questions[nextIndex],
        isAnswering: false,
        showAnswer: false,
        selectedId: ''
      });
    } else {
      // 题目全部答完，向后端交卷
      this.submitGame();
    }
  },

  startTimer: function() {
    this.data.timerId = setInterval(() => {
      let current = this.data.timeLeft - 1;
      this.setData({ timeLeft: current });
      
      if (current <= 0) {
        clearInterval(this.data.timerId);
        wx.showToast({ title: '时间到！', icon: 'error' });
        this.submitGame(); 
      }
    }, 1000);
  },

  onUnload: function() {
    if (this.data.timerId) {
      clearInterval(this.data.timerId);
    }
  },

  // 2：游戏结束，向后端交卷！
  submitGame: function() {
    if (this.data.timerId) clearInterval(this.data.timerId);
    wx.showLoading({ title: 'AI 判卷中...', mask: true });
    
    const userId = wx.getStorageSync('userId');
    if (!userId) {
      wx.hideLoading();
      wx.showToast({ title: '未登录', icon: 'error' });
      return;
    }

    // 🚀 核心修改 1：计算实际耗时
    let timeUsed = 0;
    if (this.data.mode === 'timed') {
      timeUsed = this.data.totalTime - this.data.timeLeft;
      if (timeUsed < 0) timeUsed = this.data.totalTime;
    }

    // 🚀 核心修改 2：组装包含时间与模式的新版答题卡
    const payload = {
      user_id: parseInt(userId),
      score: 0,                           // 后端已废弃前端传的分数，这里传 0 即可
      correct_count: this.data.score,     // 前端的 score 实际代表了答对的题数
      wrong_answers: this.data.wrongList,
      
      mode: this.data.mode,
      total_count: this.data.totalQuestions,
      time_used: timeUsed,
      total_time: this.data.totalTime
    };

    wx.request({
      url: 'http://192.168.0.126:8000/api/challenge/submit',
      method: 'POST',
      data: payload,
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          const resData = res.data.data;
          
          // 🚀 核心修改 3：使用后端返回的真实得分 (earned_score)
          wx.setStorageSync('challengeScore', resData.earned_score); 
          wx.setStorageSync('challengeWrongList', this.data.wrongList);
          wx.setStorageSync('totalScore', resData.total_score); 
          wx.setStorageSync('currentTitle', resData.current_title); 
          wx.setStorageSync('currentPerformance', resData.performance);
          wx.setStorageSync('rewardEcoCoin', resData.reward_eco_coin || 0);
          wx.setStorageSync('challengeMode', this.data.mode);
          
          wx.disableAlertBeforeUnload();

          wx.redirectTo({
            url: '/pages/challenge/result'
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({ title: '交卷失败', icon: 'error' });
      }
    });
  },

  getCategoryName: function(id) {
    const item = this.data.options.find(opt => opt.id === id);
    return item ? item.name : '未知';
  }
})