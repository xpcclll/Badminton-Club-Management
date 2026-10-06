const app = getApp()
const api = require('../../utils/api')
const fmt = require('../../utils/format')

Page({
  data: {
    activities: [],
    loading: true,
    isAdmin: false
  },

  onShow() {
    app.ensureLogin()
      .then(() => this.load())
      .catch(() => this.setData({ loading: false }))
  },

  onPullDownRefresh() {
    this.load().then(() => wx.stopPullDownRefresh())
  },

  load() {
    this.setData({ loading: true })
    return api.listActivities()
      .then(list => {
        const activities = list.map(a => Object.assign({}, a, {
          statusLabel: fmt.statusLabel(a.status),
          dateLabel: fmt.dateCN(a.date),
          capacity: (a.courts ? a.courts.length : 0) * (Number(a.capacityPerCourt) || 6)
        }))
        this.setData({
          activities: activities,
          loading: false,
          isAdmin: app.globalData.isAdmin
        })
      })
      .catch(() => {
        this.setData({ loading: false })
      })
  },

  goDetail(e) {
    wx.navigateTo({ url: '/pages/activity/detail/detail?id=' + e.currentTarget.dataset.id })
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/activity/create/create' })
  }
})

