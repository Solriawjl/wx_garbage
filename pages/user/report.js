// pages/user/report.js
import * as echarts from '../../components/ec-canvas/echarts';

Page({
  data: {
    reportData: null,
    targetUid: null, // 🚀 新增：保存目标用户的ID
    ecRadar: { lazyLoad: true },
    ecLine: { lazyLoad: true }
  },

  onLoad: function (options) {
    // 🚀 核心逻辑：判断是自己看（无uid）还是老师看（有uid）
    const uid = options.uid || null;
    this.setData({ targetUid: uid });
    
    this.fetchGrowthReport();
  },

  fetchGrowthReport: function () {
    // 🚀 核心修改：如果 targetUid 有值，说明是老师在看学生；否则才是学生看自己
    const userId = this.data.targetUid || wx.getStorageSync('userId');
    
    if (!userId) {
      wx.showToast({ title: '未获取到用户信息', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '拉取数据中...' });

    wx.request({
      // 这里的路径会自动根据传进去的 userId 拿到对应学生的数据
      url: `http://192.168.0.126:8000/api/user/growth_report/${userId}`,
      method: 'GET',
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          this.setData({ reportData: res.data.data }, () => {
            // 给视图层 300ms 渲染缓冲，防止 ECharts 节点未就绪
            setTimeout(() => {
              this.initRadarChart(res.data.data.radar_data);
              this.initLineChart(res.data.data.activity_7_days);
            }, 300);
          });
        } else {
          wx.showToast({ title: '获取报告失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '网络异常', icon: 'none' });
      }
    });
  },

  // 渲染雷达图 (保持原有配置)
  initRadarChart: function (radarData) {
    const indicator = radarData.map(item => ({ name: item.name, max: 1 }));
    const values = radarData.map(item => item.accuracy);
    const ecComponent = this.selectComponent('#mychart-dom-radar');
    if (!ecComponent) return;

    ecComponent.init((canvas, width, height, dpr) => {
      const chart = echarts.init(canvas, null, { width: width, height: height, devicePixelRatio: dpr });
      const option = {
        backgroundColor: "#ffffff",
        color: ["#4CAF50"],
        radar: {
          indicator: indicator,
          center: ['50%', '52%'], 
          radius: '55%', 
          splitNumber: 4,
          axisName: { color: '#555', fontSize: 13, fontWeight: 'bold', padding: [3, 5] },
          splitArea: { areaStyle: { color: ['#f8f9fa', '#e9ecef', '#dee2e6', '#ced4da'].reverse() } }
        },
        series: [{
          type: 'radar',
          data: [{ value: values, name: '正确率' }],
          areaStyle: { color: 'rgba(76, 175, 80, 0.4)' }, 
          lineStyle: { width: 2.5 },
          symbolSize: 6 
        }]
      };
      chart.setOption(option);
      return chart;
    });
  },

  // 渲染折线图 (保持原有配置)
  initLineChart: function (activityData) {
    const ecComponent = this.selectComponent('#mychart-dom-line');
    if (!ecComponent) return;

    ecComponent.init((canvas, width, height, dpr) => {
      const chart = echarts.init(canvas, null, { width: width, height: height, devicePixelRatio: dpr });
      const option = {
        backgroundColor: "#ffffff",
        color: ["#2196F3"],
        grid: { left: '2%', right: '8%', bottom: '5%', top: '15%', containLabel: true },
        xAxis: {
          type: 'category', boundaryGap: false, data: activityData.dates,
          axisLabel: { color: '#666', fontSize: 11, margin: 12 }
        },
        yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { type: 'dashed', color: '#f0f0f0' } } },
        series: [{
          name: '活跃次数', type: 'line', smooth: true, data: activityData.counts,
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(33, 150, 243, 0.4)' },
              { offset: 1, color: 'rgba(33, 150, 243, 0.05)' }
            ])
          },
          lineStyle: { width: 3 }, symbolSize: 8, itemStyle: { borderWidth: 2, borderColor: '#fff' }
        }]
      };
      chart.setOption(option);
      return chart;
    });
  }
});