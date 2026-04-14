import * as echarts from '../../components/ec-canvas/echarts';

function formatNames(names) {
  if (!names || names.length === 0) return '暂无名单';
  let str = '';
  for (let i = 0; i < names.length; i++) {
    str += names[i] + (i === names.length - 1 ? '' : '，');
    if ((i + 1) % 3 === 0 && i !== names.length - 1) {
      str += '\n'; 
    }
  }
  return str;
}

const tooltipStyle = {
  show: true,
  triggerOn: 'click', 
  confine: true, 
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  borderColor: '#e0e0e0',
  borderWidth: 1,
  textStyle: { color: '#333', fontSize: 12, lineHeight: 22 }, 
  padding: [10, 15]
};

Page({
  data: {
    dashboardData: null,
    ecRadar: { lazyLoad: true },
    ecInteraction: { lazyLoad: true }, 
    ecDau: { lazyLoad: true },         
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

          this.setData({ dashboardData: res.data.data }, () => {
            wx.nextTick(() => {
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
      complete: () => { if (cb) cb(); }
    });
  },

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
          center: ['50%', '52%'], radius: '45%', splitNumber: 4, axisNameGap: 22, 
          axisName: { color: '#555', fontSize: 13, fontWeight: 'bold' },
          splitArea: { areaStyle: { color: ['#FFF8E1', '#FFECB3', '#FFE082', '#FFD54F'].reverse() } }
        },
        series: [{
          type: 'radar', data: [{ value: values, name: '达标率' }],
          areaStyle: { color: 'rgba(255, 152, 0, 0.4)' }, lineStyle: { width: 2.5 },
          label: { show: true, formatter: '{c}%', color: '#D84315', fontSize: 11, fontWeight: 'bold', distance: 6 }
        }]
      };
      chart.setOption(option);
      return chart;
    });
  },

  initInteractionChart: function (trendData) {
    const ecComponent = this.selectComponent('#mychart-dom-interaction');
    if (!ecComponent) return;

    ecComponent.init((canvas, width, height, dpr) => {
      const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
      const option = {
        backgroundColor: "#ffffff",
        tooltip: {
          ...tooltipStyle,
          trigger: 'axis', axisPointer: { type: 'shadow' }
        },
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

  initDauChart: function (trendData) {
    const ecComponent = this.selectComponent('#mychart-dom-dau');
    if (!ecComponent) return;

    ecComponent.init((canvas, width, height, dpr) => {
      const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
      const option = {
        backgroundColor: "#ffffff",
        tooltip: {
          ...tooltipStyle,
          trigger: 'axis',
          formatter: function (params) {
            let p = params[0];
            let names = trendData.dau_names[p.dataIndex] || [];
            return `${p.name} 活跃名单 (${names.length}人)\n\n${formatNames(names)}`;
          }
        },
        grid: { left: '3%', right: '5%', bottom: '10%', top: '15%', containLabel: true },
        xAxis: { type: 'category', boundaryGap: false, data: trendData.dates, axisLabel: { color: '#666' } },
        yAxis: { type: 'value', name: '活跃人数(人)', minInterval: 1, splitLine: { lineStyle: { type: 'dashed' } } },
        series: [{
          name: '日活人数', type: 'line', smooth: true,
          data: trendData.dau, itemStyle: { color: '#E91E63' }, lineStyle: { width: 3 }, symbolSize: 8,
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

  initHabitChart: function (habitData) {
    const ecComponent = this.selectComponent('#mychart-dom-habit');
    if (!ecComponent) return;

    ecComponent.init((canvas, width, height, dpr) => {
      const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
      const option = {
        backgroundColor: "#ffffff",
        color: ['#4CAF50', '#FF9800', '#2196F3', '#9C27B0', '#9e9e9e'],
        tooltip: {
          ...tooltipStyle,
          trigger: 'item',
          formatter: function (params) {
            let names = params.data.students || [];
            return `${params.name} (${names.length}人 - ${params.percent}%)\n\n${formatNames(names)}`;
          }
        },
        series: [{
          name: '人群画像', type: 'pie',
          radius: '60%', center: ['50%', '50%'],
          label: { show: true, formatter: '{b}\n{c}人 ({d}%)', fontSize: 11, color: '#555', lineHeight: 16 },
          labelLine: { length: 10, length2: 15, smooth: true },
          data: habitData
        }]
      };
      chart.setOption(option);
      return chart;
    });
  },

  initClearanceChart: function (clearanceData) {
    const ecComponent = this.selectComponent('#mychart-dom-clearance');
    if (!ecComponent) return;

    ecComponent.init((canvas, width, height, dpr) => {
      const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
      const option = {
        backgroundColor: "#ffffff",
        tooltip: {
          ...tooltipStyle,
          trigger: 'axis', axisPointer: { type: 'shadow' },
          formatter: function (params) {
            let p = params[0];
            let title = p.name.replace('\n', ' '); 
            let names = clearanceData.students[p.dataIndex] || [];
            return `${title}名单 (${names.length}人)\n\n${formatNames(names)}`;
          }
        },
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