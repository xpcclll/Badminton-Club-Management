const app = getApp()
const api = require('../../utils/api')
const fmt = require('../../utils/format')

Page({
  data: {
    tab: 'me',
    isAdmin: false,
    loading: true,
    my: {},
    overall: []
  },

  onShow() {
    app.ensureLogin().then(() => this.load()).catch(() => this.setData({ loading: false }))
  },

  load() {
    this.setData({ loading: true, isAdmin: app.globalData.isAdmin })
    const my = api.myStats().then(data => this.setData({ my: data }))
    let overall = Promise.resolve()
    if (app.globalData.isAdmin) {
      overall = api.overallStats().then(list => this.setData({ overall: list }))
    }
    return Promise.all([my, overall])
      .then(() => this.setData({ loading: false }))
      .catch(() => this.setData({ loading: false }))
  },

  switchTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab })
  }
})

