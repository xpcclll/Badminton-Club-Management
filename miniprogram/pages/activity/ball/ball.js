const app = getApp()
const api = require('../../../utils/api')

Page({
  data: {
    activityId: '',
    courts: [],
    courtIndex: 0,
    people: [],
    personIndex: 0,
    count: 1,
    loading: true
  },

  onLoad(options) {
    this.activityId = options.id
    const preselect = options.court || ''
    app.ensureLogin()
      .then(() => {
        this.isAdmin = app.globalData.isAdmin
        return api.getActivity(this.activityId)
      })
      .then(data => {
        const courts = data.activity.courts || []
        let courtIndex = 0
        if (preselect) {
          const i = courts.indexOf(preselect)
          if (i >= 0) courtIndex = i
        }
        this.courts = courts
        this.signups = data.signups || []
        this.setData({ courts: courts, courtIndex: courtIndex, loading: false })
        this.updatePeople()
      })
      .catch(() => this.setData({ loading: false }))
  },

  updatePeople() {
    const court = this.courts[this.data.courtIndex]
    let people = this.signups.filter(s => s.court === court && s.status === 'active')
    if (!this.isAdmin) {
      people = people.filter(s => s._openid === app.globalData.openid)
    }
    this.setData({ people: people, personIndex: 0 })
  },

  onCourt(e) {
    this.setData({ courtIndex: Number(e.detail.value) })
    this.updatePeople()
  },

  onPerson(e) {
    this.setData({ personIndex: Number(e.detail.value) })
  },

  dec() {
    if (this.data.count > 1) {
      this.setData({ count: this.data.count - 1 })
    }
  },

  inc() {
    this.setData({ count: this.data.count + 1 })
  },

  submit() {
    if (this.data.people.length === 0) {
      wx.showToast({ title: '该场地暂无报名成员', icon: 'none' })
      return
    }
    const p = this.data.people[this.data.personIndex]
    const court = this.courts[this.data.courtIndex]
    api.addBall({
      activityId: this.activityId,
      court: court,
      targetOpenid: p._openid,
      count: this.data.count
    })
      .then(() => {
        wx.showToast({ title: '记录成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 600)
      })
      .catch(() => {})
  }
})
