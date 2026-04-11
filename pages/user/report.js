// pages/user/report.js
import * as echarts from '../../components/ec-canvas/echarts';

Page({
  data: {
    reportData: null,
    targetUid: null,
    ecRadar: { lazyLoad: true },
    ecLine: { lazyLoad: true },
    ecHabit: { lazyLoad: true },   // 🚀 行为偏好饼图
    ecMistake: { lazyLoad: true }  // 🚀 错题分布饼图
  },

  onLoad: function (options) {
    const uid = options.uid || null;
    this.setData({ targetUid: uid });
    this.fetchGrowthReport();
  },

  fetchGrowthReport: function () {
    const userId = this.data.targetUid || wx.getStorageSync('userId');
    if (!userId) {
      wx.showToast({ title: '未获取到用户信息', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '生成多维报告中...' });
    wx.request({
      url: `http://192.168.0.126:8000/api/user/growth_report/${userId}`,
      method: 'GET',
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          this.setData({ reportData: res.data.data }, () => {
            // 延迟渲染，确保节点已挂载
            setTimeout(() => {
              this.initRadarChart(res.data.data.radar_data);
              this.initBarChart(res.data.data.activity_trend);
              this.initHabitChart(res.data.data.learning_habit);
              
              if (res.data.data.mistake_analysis.total_wrong > 0) {
                this.initMistakeChart(res.data.data.mistake_analysis.distribution);
              }
            }, 300);
          });
        }
      }
    });
  },

  // 1. 矩阵雷达图 (🚀 改进：加入准确率百分比标签)
  initRadarChart: function (radarData) {
    // 因为后端传了 0-100 的整数，所以这里 max 设为 100
    const indicator = radarData.map(item => ({ name: item.name, max: 100 }));
    const values = radarData.map(item => item.value); 
    const ecComponent = this.selectComponent('#mychart-dom-radar');
    if (!ecComponent) return;

    ecComponent.init((canvas, width, height, dpr) => {
      const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
      const option = {
        backgroundColor: "#ffffff",
        color: ["#4CAF50"],
        radar: {
          indicator: indicator,
          center: ['50%', '52%'], radius: '55%', splitNumber: 4,
          axisName: { color: '#555', fontSize: 13, fontWeight: 'bold' }
        },
        series: [{
          type: 'radar',
          data: [{ value: values, name: '正确率' }],
          areaStyle: { color: 'rgba(76, 175, 80, 0.4)' }, 
          lineStyle: { width: 2.5 }, symbolSize: 6,
          // 🚀 核心修改：在雷达图顶点显示数值
          label: { show: true, formatter: '{c}%', color: '#333', fontSize: 10 }
        }]
      };
      chart.setOption(option);
      return chart;
    });
  },

  // 2. 堆叠柱状图 (🚀 原折线图全面重构)
  initBarChart: function (trendData) {
    const ecComponent = this.selectComponent('#mychart-dom-line');
    if (!ecComponent) return;

    ecComponent.init((canvas, width, height, dpr) => {
      const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
      const option = {
        backgroundColor: "#ffffff",
        legend: { bottom: 0, textStyle: { fontSize: 12 } },
        grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
        xAxis: { type: 'category', data: trendData.dates, axisLabel: { color: '#666' } },
        yAxis: { type: 'value', minInterval: 1 },
        // 🚀 核心：使用 stack 属性让三个柱子叠在一起
        series: [
          { name: '实景拍照', type: 'bar', stack: 'total', barWidth: '40%', data: trendData.recognize, itemStyle: { color: '#4CAF50', borderRadius: [0,0,0,0] } },
          { name: '挑战答题', type: 'bar', stack: 'total', data: trendData.quiz, itemStyle: { color: '#FF9800' } },
          { name: '科普阅读', type: 'bar', stack: 'total', data: trendData.read, itemStyle: { color: '#2196F3', borderRadius: [4,4,0,0] } }
        ]
      };
      chart.setOption(option);
      return chart;
    });
  },

  // 3. 学习基因偏好图 (🚀 修复：增加数据与百分比显示)
  initHabitChart: function (habitData) {
    const ecComponent = this.selectComponent('#mychart-dom-habit');
    if (!ecComponent) return;

    ecComponent.init((canvas, width, height, dpr) => {
      const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
      const option = {
        backgroundColor: "#ffffff",
        color: ['#4CAF50', '#FF9800', '#2196F3'],
        legend: { top: '5%', left: 'center' },
        // 核心：在空心环中间加入标签
        graphic: {
          type: 'text',
          left: 'center', top: '55%', // 与饼图的 center 保持一致
          style: { text: habitData.preference_tag, textAlign: 'center', fill: '#333', fontSize: 14, fontWeight: 'bold' }
        },
        series: [{
          name: '学习偏好', type: 'pie',
          // 🚀 修改点1：稍微缩小外圈半径 (从70%降到60%)，给外部的文字和指引线留出空间
          radius: ['40%', '60%'], 
          center: ['50%', '55%'], // 空心环形
          avoidLabelOverlap: true, // 开启防重叠策略
          
          // 🚀 修改点2：开启标签显示，并配置炫酷的格式化输出
          label: { 
            show: true,
            // {b}代表名称, {c}代表数值, {d}代表百分比
            formatter: '{b}\n{c}次 ({d}%)', 
            fontSize: 11,
            color: '#666',
            lineHeight: 16, // 增加行高让多行文字看起来更透气
            alignTo: 'labelLine' // 让文字对齐到指引线边缘，更整齐
          },
          // 🚀 修改点3：配置指引线
          labelLine: {
            show: true,
            length: 10,   // 第一段线长
            length2: 15,  // 第二段横线长
            smooth: true  // 让折线带一点平滑的圆角
          },
          data: [
            { value: habitData.recognize_count, name: '实景拍照' },
            { value: habitData.quiz_count, name: '挑战答题' },
            { value: habitData.read_count, name: '科普阅读' }
          ]
        }]
      };
      chart.setOption(option);
      return chart;
    });
  },

  // 4. 错题分布分析图 (🚀 新增：实心饼图)
  initMistakeChart: function (mistakeData) {
    const ecComponent = this.selectComponent('#mychart-dom-mistake');
    if (!ecComponent) return;

    ecComponent.init((canvas, width, height, dpr) => {
      const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
      const option = {
        backgroundColor: "#ffffff",
        // 对应：可回收物(蓝), 有害垃圾(红), 厨余垃圾(绿), 其他垃圾(黄/灰) - 会根据名字自动分配
        color: ['#4c84ff', '#e53935', '#8bc34a', '#ffb300'],
        series: [{
          name: '错题分布', type: 'pie',
          radius: '65%', center: ['50%', '50%'],
          label: { show: true, formatter: '{b}\n{c}次' },
          data: mistakeData, // 后端已传好格式 [{name: '厨余垃圾', value: 10}]
          //itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.1)' }
        }]
      };
      chart.setOption(option);
      return chart;
    });
  }
});