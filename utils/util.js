// utils/util.js

/**
 * 环保称号解析引擎
 * @param {String} title 后端返回的中文称号
 * @returns {Object} 包含 css类名 和 emoji图标 的对象
 */
const parseTitleStyle = (title) => {
  if (!title) return { cssClass: 'badge-mengxin', icon: '🌱' };
  if (title.includes('宗师')) return { cssClass: 'badge-zongshi', icon: '👑' };
  if (title.includes('大师')) return { cssClass: 'badge-dashi', icon: '💎' };
  if (title.includes('达人')) return { cssClass: 'badge-daren', icon: '🏅' };
  if (title.includes('卫士')) return { cssClass: 'badge-weishi', icon: '🛡️' };
  
  return { cssClass: 'badge-mengxin', icon: '🌱' }; // 兜底
}

module.exports = {
  // ...你原有的其他方法
  parseTitleStyle: parseTitleStyle
}