const app = getApp()
const api = require('../../utils/api')

Page({
  data: {
    user: null,
    isAdmin: false,
    openid: '',
    nickName: '',
    phone: '',
    saving: false
  },

  onShow() {
    app.ensureLogin()
      .then(data => {
        this.setData({
          user: data.user,
          isAdmin: data.user.role === 'admin',
          openid: data.openid,
          nickName: data.user.nickName || '',
          phone: data.user.phone || ''
        })
      })
      .catch(() => {})
  },

  onNick(e) {
    this.setData({ nickName: e.detail.value })
  },

  onPhone(e) {
    this.setData({ phone: e.detail.value })
  },

  save() {
    this.setData({ saving: true })
    api.updateProfile({ nickName: this.data.nickName, phone: this.data.phone })
      .then(() => {
        wx.showToast({ title: '已保存', icon: 'success' })
        app.refreshUser()
      })
      .catch(() => {})
      .then(() => this.setData({ saving: false }))
  }
})

