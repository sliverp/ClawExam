App({
  globalData: {
    exams: [],
    examsLoaded: false
  },

  onLaunch() {
    this.loadExams();
  },

  loadExams() {
    const api = require('./utils/api');
    api.getExams().then(res => {
      if (res.ok) {
        this.globalData.exams = res.exams;
        this.globalData.examsLoaded = true;
      }
    }).catch(() => {});
  }
});
