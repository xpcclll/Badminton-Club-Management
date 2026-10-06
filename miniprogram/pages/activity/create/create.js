const api = require('../../../utils/api')

Page({
  data: {
    title: '',
    date: '',
    startTime: '19:00',
    endTime: '21:00',
    location: '',
    courts: ['1号场', '2号场'],
    courtInput: '',
    capacityPerCourt: 6,
    ballsPerBucket: 12,
    buckets: 2,
    bucketPrice: 75,
    courtFee: 180,
    deadlineDate: '',
    deadlineTime: '20:00',
    remark: '',
    submitting: false
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    const data = {}
    data[field] = e.detail.value
    this.setData(data)
  },

  onDate(e) {
    this.setData({ date: e.detail.value })
  },

  onStart(e) {
    this.setData({ startTime: e.detail.value })
  },

  onEnd(e) {
    this.setData({ endTime: e.detail.value })
  },

  onDeadlineDate(e) {
    this.setData({ deadlineDate: e.detail.value })
  },

  onDeadlineTime(e) {
    this.setData({ deadlineTime: e.detail.value })
  },

  onCourtInput(e) {
    this.setData({ courtInput: e.detail.value })
  },

  addCourt() {
    const c = this.data.courtInput.trim()
    if (!c) return
    if (this.data.courts.indexOf(c) >= 0) {
      wx.showToast({ title: '场地已存在', icon: 'none' })
      return
    }
    this.setData({
      courts: this.data.courts.concat(c),
      courtInput: ''
    })
  },

  removeCourt(e) {
    const i = e.currentTarget.dataset.index
    const courts = this.data.courts.slice()
    courts.splice(i, 1)
    this.setData({ courts: courts })
  },

  submit() {
    const d = this.data
    if (!d.title.trim()) {
      wx.showToast({ title: '请填写活动标题', icon: 'none' })
      return
    }
    if (!d.date) {
      wx.showToast({ title: '请选择日期', icon: 'none' })
      return
    }
    if (d.courts.length === 0) {
      wx.showToast({ title: '请添加至少一个场地', icon: 'none' })
      return
    }

    const deadline = d.deadlineDate ? (d.deadlineDate + ' ' + d.deadlineTime) : ''
    const payload = {
      title: d.title.trim(),
      date: d.date,
      startTime: d.startTime,
      endTime: d.endTime,
      location: d.location.trim(),
      courts: d.courts,
      capacityPerCourt: Number(d.capacityPerCourt) || 6,
      ballsPerBucket: Number(d.ballsPerBucket) || 12,
      buckets: Number(d.buckets) || 0,
      bucketPrice: Number(d.bucketPrice) || 0,
      courtFee: Number(d.courtFee) || 0,
      signupDeadline: deadline,
      remark: d.remark
    }

    this.setData({ submitting: true })
    api.createActivity(payload)
      .then(() => {
        wx.showToast({ title: '创建成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 800)
      })
      .catch(() => {})
      .then(() => this.setData({ submitting: false }))
  }
})

