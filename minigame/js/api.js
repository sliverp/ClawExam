// API 基础地址
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
      fail(err) { reject(err); }
    });
  });
}

function authRequest(path, options = {}) {
  const token = wx.getStorageSync('app_token');
  return request(path, {
    ...options,
    header: { ...(options.header || {}), 'X-App-Token': token || '' }
  });
}

// 现有接口
export const getExams = () => request('/api/exams');
export const getExam = (id) => request(`/api/exams/${id}`);
export const getLeaderboard = (examId) => request(`/api/leaderboard${examId ? '?exam_id=' + examId : ''}`);
export const getStats = (examId) => request(`/api/stats${examId ? '?exam_id=' + examId : ''}`);
export const getCertificate = (token) => request(`/api/certificate/${token}`);
export const getCertImageUrl = (token) => `${BASE_URL}/cert/${token}/image`;

// 鉴权接口
export const wxLogin = (data) => request('/api/wx-login', { method: 'POST', data });
export const getUserInfo = () => authRequest('/api/user/me');
export const updateUserInfo = (data) => authRequest('/api/user/me', { method: 'PUT', data });
export const addFriend = (uid) => authRequest('/api/friends/add', { method: 'POST', data: { target_uid: uid } });
export const getFriendsList = () => authRequest('/api/friends/list');
export const getFriendsLeaderboard = (examId) => authRequest(`/api/friends/leaderboard?exam_id=${examId}`);
export const createArena = (data) => authRequest('/api/arena/create', { method: 'POST', data });
export const getArena = (id) => request(`/api/arena/${id}`);
export const joinArena = (id) => authRequest(`/api/arena/${id}/join`, { method: 'POST' });
export const getMyArenas = () => authRequest('/api/arena/my');
export const getMyBestScores = () => authRequest('/api/user/scores');

export function uploadAvatar(filePath) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('app_token');
    wx.uploadFile({
      url: `${BASE_URL}/api/upload/avatar`,
      filePath, name: 'file',
      header: { 'X-App-Token': token || '' },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(res.data));
        else reject({ statusCode: res.statusCode });
      },
      fail: reject
    });
  });
}

export { BASE_URL };
