const app = getApp()
const api = require('../../../utils/api')
const fmt = require('../../../utils/format')

const typeLabel = {
  ball: '羽毛球',
  court: '场地费',
  other: '其他'
}

const typeKeys = ['ball', 'court', 'other']

Page({
  data: {
    activityId: '',
    expenses: [],
    total: '0.00',
    aaPerPerson: '0.00',
    participantCount: 0,
    isAdmin: false,
    typeList: ['羽毛球', '场地费', '其他'],
    typeIndex: 0,
    description: '',
    quantity: '2',
    unitPrice: '75',
    amount: '',
    submitting: false
  },

  onLoad(options) {
    this.setData({ activityId: options.id })
  },

  onShow() {
    app.ensureLogin().then(() => this.load()).catch(() => {})
  },

  load() {
    return api.getActivity(this.data.activityId)
      .then(data => {
        const expenses = data.expenses || []
        const raw = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
        const n = (data.signups || []).length
        const aa = n ? raw / n : 0
        this.setData({
          expenses: expenses,
          total: fmt.money(raw),
          aaPerPerson: fmt.money(aa),
          participantCount: n,
          isAdmin: data.isAdmin
        })
      })
      .catch(() => {})
  },

  onType(e) {
    this.setData({ typeIndex: Number(e.detail.value) })
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    const data = {}
    data[field] = e.detail.value
    this.setData(data)
  },

  calcAmount() {
    const d = this.data
    if (d.typeIndex === 0) {
      const a = Number(d.quantity) * Number(d.unitPrice)
      this.setData({ amount: a ? String(a) : '' })
    }
  },

  submit() {
    const d = this.data
    const amount = d.amount === '' ? (Number(d.quantity) * Number(d.unitPrice)) : Number(d.amount)
    if (!(amount > 0)) {
      wx.showToast({ title: '请输入正确金额', icon: 'none' })
      return
    }
    const typeKey = typeKeys[this.data.typeIndex] || 'other'
    this.setData({ submitting: true })
    api.addExpense({
      activityId: d.activityId,
      type: typeKey,
      description: d.description.trim() || typeLabel[typeKey],
      amount: amount,
      quantity: Number(d.quantity) || 0,
      unitPrice: Number(d.unitPrice) || 0
    })
      .then(() => {
        wx.showToast({ title: '已添加', icon: 'success' })
        this.setData({ description: '', amount: '', submitting: false })
        this.load()
      })
      .catch(() => this.setData({ submitting: false }))
  },

  remove(e) {
    api.removeExpense(e.currentTarget.dataset.id)
      .then(() => this.load())
      .catch(() => {})
  }
})
