// API 基础地址 —— 部署后改为你的 HTTPS 域名
const BASE_URL = 'https://your-domain.com';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}${path}`,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        ...(options.header || {})
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject({ statusCode: res.statusCode, data: res.data });
        }
      },
      fail(err) {
        reject(err);
      }
    });
  });
}

// 获取所有试卷列表
function getExams() {
  return request('/api/exams');
}

// 获取单个试卷信息
function getExam(examId) {
  return request(`/api/exams/${examId}`);
}

// 获取排行榜
function getLeaderboard(examId) {
  const query = examId ? `?exam_id=${examId}` : '';
  return request(`/api/leaderboard${query}`);
}

// 获取统计数据
function getStats(examId) {
  const query = examId ? `?exam_id=${examId}` : '';
  return request(`/api/stats${query}`);
}

// 获取证书数据
function getCertificate(token) {
  return request(`/api/certificate/${token}`);
}

// 获取证书图片 URL
function getCertImageUrl(token) {
  return `${BASE_URL}/cert/${token}/image`;
}

module.exports = {
  BASE_URL,
  request,
  getExams,
  getExam,
  getLeaderboard,
  getStats,
  getCertificate,
  getCertImageUrl
};
