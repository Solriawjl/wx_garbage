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
    this.fetchQuestions();
  },

  // 1：从后端动态获取题目
  fetchQuestions: function() {
    wx.showLoading({ title: '题目生成中...', mask: true });
    
    wx.request({
      url: 'http://127.0.0.1:8000/api/challenge/questions?limit=10',
      method: 'GET',
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200 && res.data.data.length > 0) {
          // 将后端返回的数据格式化为前端需要的格式
          const mappedQuestions = res.data.data.map(q => ({
            name: q.item_name,
            category: this.data.categoryMap[q.correct_category_id], // 转换为 'recycle' 等
            correctName: q.correct_category_name // 后端直接传回来的中文名
          }));

          this.setData({
            questions: mappedQuestions,
            totalQuestions: mappedQuestions.length,
            currentIndex: 0,
            currentQuestion: mappedQuestions[0],
            score: 0,
            wrongList: [],
            isAnswering: false,
            showAnswer: false,
            selectedId: ''
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
        item_name: this.data.currentQuestion.name,
        user_answer: this.getCategoryName(userSelectedId),
        correct_answer: this.data.currentQuestion.correctName,
        name: this.data.currentQuestion.name,
        userSelect: this.getCategoryName(userSelectedId),
        correctAnswer: this.data.currentQuestion.correctName
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
      this.submitGame();
    }
  },


  // 2：游戏结束，向后端交卷！
  submitGame: function() {
    wx.showLoading({ title: '阅卷中...', mask: true });
    
    const userId = wx.getStorageSync('userId');
    if (!userId) {
      wx.hideLoading();
      wx.showToast({ title: '未登录', icon: 'error' });
      return;
    }

    // 组装符合后端 pydantic 要求的答题卡包
    const payload = {
      user_id: parseInt(userId),
      score: this.data.score,
      correct_count: this.data.score,
      wrong_answers: this.data.wrongList
    };

    wx.request({
      url: 'http://127.0.0.1:8000/api/challenge/submit',
      method: 'POST',
      data: payload,
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          // 将后端的权威判定结果存入缓存，给 result 页使用
          wx.setStorageSync('challengeScore', this.data.score);
          wx.setStorageSync('challengeWrongList', this.data.wrongList);
          wx.setStorageSync('totalScore', res.data.data.total_score); // 更新最新总分
          wx.setStorageSync('currentTitle', res.data.data.current_title); // 更新最新称号

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