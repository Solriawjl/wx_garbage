import * as echarts from '../../components/ec-canvas/echarts';

Page({
  data: {
    dashboardData: null,
    ecRadar: { lazyLoad: true },
    ecLine: { lazyLoad: true }
  },

  onLoad: function () {
    this.fetchDashboardData();
  },

  onPullDownRefresh: function () {
    this.fetchDashboardData(() => {
      wx.stopPullDownRefresh(); // 数据拉取完毕后停止下拉动画
    });
  },

  fetchDashboardData: function (cb) {
    wx.showLoading({ title: '加载大盘数据...' });
    
    // 注意替换为你的真实后端 IP
    wx.request({
      url: `http://192.168.0.126:8000/api/teacher/dashboard`,
      method: 'GET',
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          this.setData({ dashboardData: res.data.data }, () => {
            // 给画布 300ms 的渲染时间防白板
            setTimeout(() => {
              this.initRadarChart(res.data.data.class_radar);
              this.initLineChart(res.data.data.class_activity);
            }, 300);
          });
        } else {
          wx.showToast({ title: '获取大盘失败', icon: 'none' });
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

  // 渲染全班平均雷达图
  initRadarChart: function (radarData) {
    const indicator = radarData.map(item => ({ name: item.name, max: 1 }));
    const values = radarData.map(item => item.accuracy);

    const ecComponent = this.selectComponent('#mychart-dom-radar');
    if (!ecComponent) return;

    ecComponent.init((canvas, width, height, dpr) => {
      const chart = echarts.init(canvas, null, { width: width, height: height, devicePixelRatio: dpr });
      const option = {
        backgroundColor: "#ffffff",
        color: ["#FF9800"], // 全班图表用橙色调，与个人的绿色区分
        radar: {
          indicator: indicator,
          center: ['50%', '52%'], radius: '55%', splitNumber: 4,
          axisName: { color: '#555', fontSize: 13, fontWeight: 'bold' },
          splitArea: { areaStyle: { color: ['#FFF8E1', '#FFECB3', '#FFE082', '#FFD54F'].reverse() } }
        },
        series: [{
          type: 'radar',
          data: [{ value: values, name: '全校平均正确率' }],
          areaStyle: { color: 'rgba(255, 152, 0, 0.4)' },
          lineStyle: { width: 2.5 }
        }]
      };
      chart.setOption(option);
      return chart;
    });
  },

  // 渲染近7天活跃折线图
  initLineChart: function (activityData) {
    const ecComponent = this.selectComponent('#mychart-dom-line');
    if (!ecComponent) return;

    ecComponent.init((canvas, width, height, dpr) => {
      const chart = echarts.init(canvas, null, { width: width, height: height, devicePixelRatio: dpr });
      const option = {
        backgroundColor: "#ffffff",
        color: ["#4CAF50"],
        grid: { left: '2%', right: '8%', bottom: '5%', top: '15%', containLabel: true },
        xAxis: {
          type: 'category', boundaryGap: false, data: activityData.dates,
          axisLabel: { color: '#666', fontSize: 11, margin: 12 }
        },
        yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { type: 'dashed' } } },
        series: [{
          name: '全班活跃总计', type: 'line', smooth: true, data: activityData.counts,
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(76, 175, 80, 0.4)' },
              { offset: 1, color: 'rgba(76, 175, 80, 0.05)' }
            ])
          },
          lineStyle: { width: 3 }, symbolSize: 8, itemStyle: { borderWidth: 2, borderColor: '#fff' }
        }]
      };
      chart.setOption(option);
      return chart;
    });
  },

  // 🚀 核心交互：点击学生查看他的专属档案
  viewStudentReport: function(e) {
    const studentId = e.currentTarget.dataset.uid;
    wx.navigateTo({
      // 把学生 ID 通过 URL 参数传给报告页面！
      url: `/pages/user/report?uid=${studentId}`
    });
  }
});