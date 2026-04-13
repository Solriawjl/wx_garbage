import * as echarts from '../../components/ec-canvas/echarts';

Page({
  data: {
    dashboardData: null,
    ecRadar: { lazyLoad: true },
    ecInteraction: { lazyLoad: true }, // 🚀 拆分1：交互构成柱状图
    ecDau: { lazyLoad: true },         // 🚀 拆分2：活跃人数折线图
    ecHabit: { lazyLoad: true },
    ecClearance: { lazyLoad: true }
  },

  onLoad: function () {
    this.fetchDashboardData();
  },

  onPullDownRefresh: function () {
    this.fetchDashboardData(() => {
      wx.stopPullDownRefresh();
    });
  },

  fetchDashboardData: function (cb) {
    wx.showLoading({ title: '加载大盘数据...' });
    const teacherId = wx.getStorageSync('userId');
    wx.request({
      url: `http://192.168.0.126:8000/api/teacher/dashboard?teacher_id=${teacherId}`,
      method: 'GET',
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          
          const rawAvgRate = res.data.data.clearance_dist.avg_rate;
          res.data.data.clearance_dist.avg_rate_int = Math.round(rawAvgRate * 100);

          // 1. 先触发页面结构的渲染 (wx:if)
          this.setData({ dashboardData: res.data.data }, () => {
            // 2. wx.nextTick 确保这 5 个 Canvas 节点已经切实挂载到真实的 DOM 树上
            wx.nextTick(() => {
              // 3. 稍微增加一点缓冲时间 (从 300ms 改为 500ms)，并且给每个图表一点微小的时差，防止瞬间卡死主线程
              setTimeout(() => { this.initRadarChart(res.data.data.class_radar); }, 400);
              setTimeout(() => { this.initInteractionChart(res.data.data.class_activity); }, 500);
              setTimeout(() => { this.initDauChart(res.data.data.class_activity); }, 600);
              setTimeout(() => { this.initHabitChart(res.data.data.habit_pie); }, 700);
              setTimeout(() => { this.initClearanceChart(res.data.data.clearance_dist); }, 800);
            });
          });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '网络异常', icon: 'none' });
      },
      complete: () => {
        if (cb) cb();
      }
    });
  },

  // 1. 🚀 雷达图：修复文字重合问题
  initRadarChart: function (radarData) {
    const indicator = radarData.map(item => ({ name: item.name, max: 100 }));
    const values = radarData.map(item => item.value); 

    const ecComponent = this.selectComponent('#mychart-dom-radar');
    if (!ecComponent) return;

    ecComponent.init((canvas, width, height, dpr) => {
      const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
      const option = {
        backgroundColor: "#ffffff",
        color: ["#FF9800"], 
        radar: {
          indicator: indicator,
          // 🚀 优化点：缩小雷达半径至 45%，给四周留出更多空间
          center: ['50%', '52%'], radius: '45%', splitNumber: 4,
          // 🚀 优化点：增加文字到雷达图的距离（默认15，加大到22）
          axisNameGap: 22, 
          axisName: { color: '#555', fontSize: 13, fontWeight: 'bold' },
          splitArea: { areaStyle: { color: ['#FFF8E1', '#FFECB3', '#FFE082', '#FFD54F'].reverse() } }
        },
        series: [{
          type: 'radar',
          data: [{ value: values, name: '达标率' }],
          areaStyle: { color: 'rgba(255, 152, 0, 0.4)' },
          lineStyle: { width: 2.5 },
          // 🚀 优化点：让数值标签稍微往外扩，避免和顶点圆点重合
          label: { show: true, formatter: '{c}%', color: '#D84315', fontSize: 11, fontWeight: 'bold', distance: 6 }
        }]
      };
      chart.setOption(option);
      return chart;
    });
  },

  // 2. 🚀 新增：单独的学习交互构成图 (堆叠柱状)
  initInteractionChart: function (trendData) {
    const ecComponent = this.selectComponent('#mychart-dom-interaction');
    if (!ecComponent) return;

    ecComponent.init((canvas, width, height, dpr) => {
      const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
      const option = {
        backgroundColor: "#ffffff",
        legend: { bottom: 0, textStyle: { fontSize: 11 } },
        grid: { left: '3%', right: '5%', bottom: '15%', top: '15%', containLabel: true },
        xAxis: { type: 'category', data: trendData.dates, axisLabel: { color: '#666' } },
        yAxis: { type: 'value', name: '交互次数', minInterval: 1, splitLine: { lineStyle: { type: 'dashed' } } },
        series: [
          { name: '实景拍照', type: 'bar', stack: 'total', barWidth: '40%', data: trendData.recognize, itemStyle: { color: '#4CAF50' } },
          { name: '挑战答题', type: 'bar', stack: 'total', data: trendData.quiz, itemStyle: { color: '#FF9800' } },
          { name: '科普阅读', type: 'bar', stack: 'total', data: trendData.read, itemStyle: { color: '#2196F3', borderRadius: [4, 4, 0, 0] } }
        ]
      };
      chart.setOption(option);
      return chart;
    });
  },

  // 3. 🚀 新增：单独的活跃人数走势图 (面积折线)
  initDauChart: function (trendData) {
    const ecComponent = this.selectComponent('#mychart-dom-dau');
    if (!ecComponent) return;

    ecComponent.init((canvas, width, height, dpr) => {
      const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
      const option = {
        backgroundColor: "#ffffff",
        grid: { left: '3%', right: '5%', bottom: '10%', top: '15%', containLabel: true },
        xAxis: { type: 'category', boundaryGap: false, data: trendData.dates, axisLabel: { color: '#666' } },
        yAxis: { type: 'value', name: '活跃人数(人)', minInterval: 1, splitLine: { lineStyle: { type: 'dashed' } } },
        series: [{
          name: '日活人数', type: 'line', smooth: true,
          data: trendData.dau, 
          itemStyle: { color: '#E91E63' }, 
          lineStyle: { width: 3 }, 
          symbolSize: 8,
          // 增加一点面积渐变色，显得更高级
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(233, 30, 99, 0.3)' },
              { offset: 1, color: 'rgba(233, 30, 99, 0.05)' }
            ])
          }
        }]
      };
      chart.setOption(option);
      return chart;
    });
  },

  // 4. 人群画像饼图
  initHabitChart: function (habitData) {
    const ecComponent = this.selectComponent('#mychart-dom-habit');
    if (!ecComponent) return;

    ecComponent.init((canvas, width, height, dpr) => {
      const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
      const option = {
        backgroundColor: "#ffffff",
        color: ['#4CAF50', '#FF9800', '#2196F3', '#9C27B0', '#9e9e9e'],
        series: [{
          name: '人群画像', type: 'pie',
          radius: '60%', center: ['50%', '50%'],
          label: { show: true, formatter: '{b}\n{c}人 ({d}%)', fontSize: 11, color: '#555', lineHeight: 16 },
          labelLine: { length: 10, length2: 15, smooth: true },
          data: habitData,
          //itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.1)' }
        }]
      };
      chart.setOption(option);
      return chart;
    });
  },

  // 5. 消化率区间分布柱状图
  initClearanceChart: function (clearanceData) {
    const ecComponent = this.selectComponent('#mychart-dom-clearance');
    if (!ecComponent) return;

    ecComponent.init((canvas, width, height, dpr) => {
      const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
      const option = {
        backgroundColor: "#ffffff",
        grid: { left: '5%', right: '5%', bottom: '5%', top: '15%', containLabel: true },
        xAxis: { type: 'category', data: clearanceData.categories, axisLabel: { interval: 0, fontSize: 10, color: '#666' } },
        yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { type: 'dashed' } } },
        series: [{
          name: '人数', type: 'bar', barWidth: '45%',
          data: clearanceData.values,
          itemStyle: { 
            borderRadius: [6, 6, 0, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#81C784' },
              { offset: 1, color: '#388E3C' }
            ])
          },
          label: { show: true, position: 'top', formatter: '{c}人', fontSize: 12, fontWeight: 'bold', color: '#333' }
        }]
      };
      chart.setOption(option);
      return chart;
    });
  },

  viewStudentReport: function(e) {
    const studentId = e.currentTarget.dataset.uid;
    wx.navigateTo({ url: `/pages/user/report?uid=${studentId}` });
  }
});