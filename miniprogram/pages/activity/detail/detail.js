const app = getApp()
const api = require('../../../utils/api')
const fmt = require('../../../utils/format')
const bill = require('../../../utils/bill')

Page({
  data: {
    activity: null,
    signups: [],
    balls: [],
    expenses: [],
    attendance: [],
    isAdmin: false,
    myOpenid: '',
    mySignup: null,
    myAttendance: null,
    tab: 'signup',
    courtGroups: [],
    presentMap: {},
    activeCount: 0,
    waitingCount: 0,
    attendeeCount: 0,
    expenseTotal: '0.00',
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
    const attendance = data.attendance || []

    const activeSignups = signups.filter(s => s.status === 'active')
    const waitingSignups = signups.filter(s => s.status === 'waiting')
    const presentMap = {}
    attendance.forEach(x => { presentMap[x._openid] = 1 })

    const courtGroups = courts.map(c => {
      const members = activeSignups.filter(s => s.court === c)
      const waiting = waitingSignups.filter(s => s.court === c)
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
        waiting: waiting,
        ballsByPerson: ballsByPerson,
        courtBalls: courtBalls,
        count: members.length,
        waitingCount: waiting.length,
        full: members.length >= (Number(a.capacityPerCourt) || 6)
      }
    })

    const expenseRaw = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
    const activeCount = activeSignups.length
    const attendeeCount = attendance.length || activeCount
    const aa = attendeeCount ? expenseRaw / attendeeCount : 0
    const ballTotal = balls.reduce((s, b) => s + (Number(b.count) || 0), 0)

    this.setData({
      activity: a,
      signups: signups,
      balls: balls,
      expenses: expenses,
      attendance: attendance,
      isAdmin: data.isAdmin,
      myOpenid: app.globalData.openid,
      mySignup: data.mySignup,
      myAttendance: data.myAttendance,
      courtGroups: courtGroups,
      presentMap: presentMap,
      activeCount: activeCount,
      waitingCount: waitingSignups.length,
      attendeeCount: attendeeCount,
      expenseTotal: fmt.money(expenseRaw),
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
      .then(res => {
        wx.showToast({ title: res.status === 'waiting' ? '已加入候补' : '报名成功', icon: 'success' })
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

  checkinSelf() {
    api.checkin(this.activityId)
      .then(() => {
        wx.showToast({ title: '签到成功', icon: 'success' })
        this.load()
      })
      .catch(() => {})
  },

  cancelCheckinSelf() {
    api.cancelCheckin(this.activityId)
      .then(() => {
        wx.showToast({ title: '已取消签到', icon: 'none' })
        this.load()
      })
      .catch(() => {})
  },

  adminCheckin(e) {
    api.checkin(this.activityId, e.currentTarget.dataset.openid)
      .then(() => this.load())
      .catch(() => {})
  },

  adminCancelCheckin(e) {
    api.cancelCheckin(this.activityId, e.currentTarget.dataset.openid)
      .then(() => this.load())
      .catch(() => {})
  },

  exportBill() {
    const activeSignups = this.data.signups.filter(s => s.status === 'active')
    const text = bill.buildBill(this.data.activity, activeSignups, this.data.attendance, this.data.expenses, this.data.balls)
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: '账单已复制', icon: 'none' })
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
