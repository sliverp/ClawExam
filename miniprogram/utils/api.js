// API 基础地址 —— 部署后改为你的 HTTPS 域名
const BASE_URL = 'https://exam.clawhome.cc';

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

// 带鉴权的请求（401 时自动静默重登并重试一次）
let _reLoginPromise = null;

function authRequest(path, options = {}) {
  const token = wx.getStorageSync('app_token');
  const doRequest = (tk) => request(path, {
    ...options,
    header: {
      ...(options.header || {}),
      'X-App-Token': tk || ''
    }
  });

  return doRequest(token).catch(err => {
    if (err && err.statusCode === 401) {
      // token 失效，尝试静默重登
      return _silentReLoginAndRetry(doRequest);
    }
    throw err;
  });
}

function _silentReLoginAndRetry(doRequest) {
  // 并发请求共享同一个重登 Promise，避免重复登录
  if (!_reLoginPromise) {
    const app = getApp();
    if (app && app.silentReLogin) {
      _reLoginPromise = app.silentReLogin().finally(() => {
        _reLoginPromise = null;
      });
    } else {
      return Promise.reject({ statusCode: 401, error: '未登录' });
    }
  }
  return _reLoginPromise.then(() => {
    const newToken = wx.getStorageSync('app_token');
    if (!newToken) {
      throw { statusCode: 401, error: '重新登录失败' };
    }
    return doRequest(newToken);
  });
}

// ===== 现有接口 =====

function getExams() {
  return request('/api/exams');
}

function getExam(examId) {
  return request(`/api/exams/${examId}`);
}

function getLeaderboard(examId, uid) {
  let query = examId ? `?exam_id=${examId}` : '';
  if (uid) {
    query += (query ? '&' : '?') + `uid=${uid}`;
  }
  return request(`/api/leaderboard${query}`);
}

function getStats(examId) {
  const query = examId ? `?exam_id=${examId}` : '';
  return request(`/api/stats${query}`);
}

function getOverviewStats() {
  return request('/api/overview-stats');
}

function getCertificate(token) {
  return request(`/api/certificate/${token}`);
}

function getCertImageUrl(token) {
  return `${BASE_URL}/cert/${token}/image`;
}

// ===== 新增接口 =====

function wxLogin(data) {
  return request('/api/wx-login', { method: 'POST', data });
}

function getUserInfo() {
  return authRequest('/api/user/me');
}

function updateUserInfo(data) {
  return authRequest('/api/user/me', { method: 'PUT', data });
}

function addFriend(targetUid) {
  return authRequest('/api/friends/add', { method: 'POST', data: { target_uid: targetUid } });
}

function getFriendsList() {
  return authRequest('/api/friends/list');
}

function getFriendsLeaderboard(examId) {
  return authRequest(`/api/friends/leaderboard?exam_id=${examId}`);
}

function createArena(data) {
  return authRequest('/api/arena/create', { method: 'POST', data });
}

function getArena(arenaId) {
  return request(`/api/arena/${arenaId}`);
}

function joinArena(arenaId) {
  return authRequest(`/api/arena/${arenaId}/join`, { method: 'POST' });
}

function getMyArenas() {
  return authRequest('/api/arena/my');
}

function getMyBestScores() {
  return authRequest('/api/user/scores');
}

function getMyExamHistory() {
  return authRequest('/api/user/history');
}

// 上传头像
function uploadAvatar(filePath) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('app_token');
    wx.uploadFile({
      url: `${BASE_URL}/api/upload/avatar`,
      filePath,
      name: 'file',
      header: {
        'X-App-Token': token || ''
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(res.data));
        } else {
          reject({ statusCode: res.statusCode });
        }
      },
      fail: reject
    });
  });
}

module.exports = {
  BASE_URL,
  request,
  authRequest,
  getExams,
  getExam,
  getLeaderboard,
  getStats,
  getCertificate,
  getCertImageUrl,
  wxLogin,
  getUserInfo,
  updateUserInfo,
  addFriend,
  getFriendsList,
  getFriendsLeaderboard,
  createArena,
  getArena,
  joinArena,
  getMyArenas,
  getMyBestScores,
  getMyExamHistory,
  uploadAvatar,
  getOverviewStats
};
