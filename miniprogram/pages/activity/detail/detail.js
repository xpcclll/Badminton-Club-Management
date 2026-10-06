const app = getApp()
const api = require('../../../utils/api')
const fmt = require('../../../utils/format')

Page({
  data: {
    activity: null,
    signups: [],
    balls: [],
    expenses: [],
    isAdmin: false,
    myOpenid: '',
    mySignup: null,
    tab: 'signup',
    courtGroups: [],
    expenseTotal: '0.00',
    participantCount: 0,
    aaPerPerson: '0.00',
    ballTotal: 0,
    buckets: 0,
    statusLabel: ''
  },

  onLoad(options) {
    this.activityId = options.id
  },

  onShow() {
    app.ensureLogin().then(() => this.load()).catch(() => {})
  },

  load() {
    return api.getActivity(this.activityId)
      .then(data => this.build(data))
      .catch(() => {})
  },

  build(data) {
    const a = data.activity
    const courts = a.courts || []
    const signups = data.signups || []
    const balls = data.balls || []
    const expenses = data.expenses || []

    const courtGroups = courts.map(c => {
      const members = signups.filter(s => s.court === c)
      const ballsByPerson = {}
      let courtBalls = 0
      balls.filter(b => b.court === c).forEach(b => {
        const k = b._openid
        ballsByPerson[k] = (ballsByPerson[k] || 0) + b.count
        courtBalls += b.count
      })
      return {
        court: c,
        members: members,
        ballsByPerson: ballsByPerson,
        courtBalls: courtBalls,
        count: members.length,
        full: members.length >= (Number(a.capacityPerCourt) || 6)
      }
    })

    const expenseRaw = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
    const participantCount = signups.length
    const aa = participantCount ? expenseRaw / participantCount : 0
    const ballTotal = balls.reduce((s, b) => s + (Number(b.count) || 0), 0)

    this.setData({
      activity: a,
      signups: signups,
      balls: balls,
      expenses: expenses,
      isAdmin: data.isAdmin,
      myOpenid: app.globalData.openid,
      mySignup: data.mySignup,
      courtGroups: courtGroups,
      expenseTotal: fmt.money(expenseRaw),
      participantCount: participantCount,
      aaPerPerson: fmt.money(aa),
      ballTotal: ballTotal,
      buckets: Number(a.buckets) || 0,
      statusLabel: fmt.statusLabel(a.status)
    })
  },

  switchTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab })
  },

  signup(e) {
    const court = e.currentTarget.dataset.court
    api.signup(this.activityId, court)
      .then(() => {
        wx.showToast({ title: '报名成功', icon: 'success' })
        this.load()
      })
      .catch(() => {})
  },

  cancel() {
    wx.showModal({
      title: '取消报名',
      content: '确定取消本次报名吗？',
      success: r => {
        if (r.confirm) {
          api.cancelSignup(this.activityId)
            .then(() => {
              wx.showToast({ title: '已取消', icon: 'none' })
              this.load()
            })
            .catch(() => {})
        }
      }
    })
  },

  quickBall(e) {
    const court = e.currentTarget.dataset.court
    const openid = e.currentTarget.dataset.openid
    api.addBall({ activityId: this.activityId, court: court, targetOpenid: openid, count: 1 })
      .then(() => {
        wx.showToast({ title: '已记录', icon: 'none' })
        this.load()
      })
      .catch(() => {})
  },

  removeBall(e) {
    const id = e.currentTarget.dataset.id
    api.removeBall(id)
      .then(() => this.load())
      .catch(() => {})
  },

  goBall(e) {
    const court = e.currentTarget.dataset.court || ''
    wx.navigateTo({ url: '/pages/activity/ball/ball?id=' + this.activityId + '&court=' + court })
  },

  goExpense() {
    wx.navigateTo({ url: '/pages/activity/expense/expense?id=' + this.activityId })
  },

  finish() {
    wx.showModal({
      title: '结束活动',
      content: '结束后将无法继续报名，确定结束？',
      success: r => {
        if (r.confirm) {
          api.finishActivity(this.activityId)
            .then(() => this.load())
            .catch(() => {})
        }
      }
    })
  },

  remove() {
    wx.showModal({
      title: '取消活动',
      content: '确定取消该活动吗？',
      success: r => {
        if (r.confirm) {
          api.removeActivity(this.activityId)
            .then(() => {
              wx.showToast({ title: '已取消', icon: 'none' })
              this.load()
            })
            .catch(() => {})
        }
      }
    })
  }
})

