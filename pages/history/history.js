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
    const arr = Object.keys(records).map(function (date) {
      const rec = records[date];
      const t = store.computeDailyTotals(date);

      const items = store.normalizeVariableItems(rec);
      const displayItems = items.map(function (it) {
        return { id: it.id, name: it.name, amount: store.fmt(parseFloat(it.amount) || 0) };
      });

      // 各商品销售明细（仅显示有卖出的）
      const productRows = t.productSales
        .filter(function (p) { return p.servings > 0; })
        .map(function (p) {
          return { name: p.name, servings: p.servings, sales: store.fmt(p.sales) };
        });

      return {
        date: date,
        variableItems: displayItems,
        variableCost: t.variableCost,
        bulkDaily: t.bulkDaily,
        stallFee: t.stallFee,
        totalCost: t.totalCost,
        productRows: productRows,
        totalSales: t.totalSales,
        netProfit: t.netProfit,
        profitClass: t.profitClass,
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
      content: '将删除全部摆摊记录、商品、大宗采购和摊位费设置，且无法恢复。',
      confirmColor: '#d84315',
      success: function (res) {
        if (res.confirm) {
          wx.removeStorageSync(store.KEY_RECORDS);
          wx.removeStorageSync(store.KEY_BULK);
          wx.removeStorageSync(store.KEY_STALL);
          wx.removeStorageSync(store.KEY_PRODUCTS);
          wx.removeStorageSync(store.KEY_SELECTED);
          this.setData({ list: [] });
          wx.showToast({ title: '已清空', icon: 'success' });
        }
      }.bind(this)
    });
  }
});
