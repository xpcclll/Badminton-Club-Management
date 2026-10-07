const app = getApp()
const api = require('../../utils/api')

Page({
  data: {
    summary: null,
    isAdmin: false,
    loading: true,
    quantity: '',
    buckets: '',
    unitPrice: '',
    note: '',
    submitting: false
  },

  onShow() {
    app.ensureLogin().then(() => this.load()).catch(() => this.setData({ loading: false }))
  },

  load() {
    this.setData({ loading: true })
    return api.inventorySummary()
      .then(data => this.setData({ summary: data, isAdmin: data.isAdmin, loading: false }))
      .catch(() => this.setData({ loading: false }))
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    const d = {}
    d[field] = e.detail.value
    this.setData(d)
  },

  submit() {
    const q = Number(this.data.quantity) || 0
    if (q <= 0) {
      wx.showToast({ title: '请输入入库数量（颗）', icon: 'none' })
      return
    }
    this.setData({ submitting: true })
    api.stockIn({
      quantity: q,
      buckets: Number(this.data.buckets) || 0,
      unitPrice: Number(this.data.unitPrice) || 0,
      note: this.data.note
    }).then(() => {
      wx.showToast({ title: '已入库', icon: 'success' })
      this.setData({ quantity: '', buckets: '', unitPrice: '', note: '', submitting: false })
      this.load()
    }).catch(() => this.setData({ submitting: false }))
  }
})

