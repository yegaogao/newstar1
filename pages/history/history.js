const store = require('../../utils/storage.js');

Page({
  data: {
    list: []
  },

  onShow() {
    this.loadList();
  },

  loadList() {
    const records = store.getRecords();
    const bulkDaily = store.bulkDailyAllocation();
    const stallFee = store.getStallFee();
    const arr = Object.keys(records).map(function (date) {
      const rec = records[date];
      const items = store.normalizeVariableItems(rec);
      let variableNum = 0;
      const displayItems = items.map(function (it) {
        const amt = parseFloat(it.amount) || 0;
        variableNum += amt;
        return { id: it.id, name: it.name, amount: store.fmt(amt) };
      });
      const totalNum = variableNum + bulkDaily + stallFee;

      const price = parseFloat(rec.price) || 0;
      const servings = Number(rec.servings) || 0;
      const salesNum = price * servings;
      const netNum = salesNum - totalNum;

      return {
        date: date,
        variableItems: displayItems,
        variableCost: store.fmt(variableNum),
        bulkDaily: store.fmt(bulkDaily),
        stallFee: store.fmt(stallFee),
        totalCost: store.fmt(totalNum),
        price: store.fmt(price),
        servings: servings,
        sales: store.fmt(salesNum),
        netProfit: store.fmt(netNum),
        profitClass: netNum >= 0 ? 'red' : 'green',
        open: false
      };
    });
    arr.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    this.setData({ list: arr });
  },

  toggle(e) {
    const idx = e.currentTarget.dataset.index;
    const key = 'list[' + idx + '].open';
    this.setData({ [key]: !this.data.list[idx].open });
  },

  clearAll() {
    wx.showModal({
      title: '确认清空',
      content: '将删除全部摆摊记录、大宗采购和摊位费设置，且无法恢复。',
      confirmColor: '#d84315',
      success: function (res) {
        if (res.confirm) {
          wx.removeStorageSync(store.KEY_RECORDS);
          wx.removeStorageSync(store.KEY_BULK);
          wx.removeStorageSync(store.KEY_STALL);
          this.setData({ list: [] });
          wx.showToast({ title: '已清空', icon: 'success' });
        }
      }.bind(this)
    });
  }
});
