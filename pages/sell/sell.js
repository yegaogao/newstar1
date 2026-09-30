const store = require('../../utils/storage.js');

Page({
  data: {
    date: '',
    price: '',
    servings: 0,
    bulkDaily: '0.00',
    stallFee: '0.00',
    totalCost: '0.00',
    sales: '0.00',
    netProfit: '0.00',
    profitClass: 'red'
  },

  onLoad() {
    const date = store.todayStr();
    this.setData({ date: date });
    this.loadGlobal();
    this.loadDate(date);
  },

  onShow() {
    this.loadGlobal();
    this.loadDate(this.data.date);
  },

  loadGlobal() {
    this.setData({
      bulkDaily: store.fmt(store.bulkDailyAllocation()),
      stallFee: store.fmt(store.getStallFee())
    });
  },

  loadDate(date) {
    const rec = store.getRecords()[date] || {};
    this.setData({
      price: rec.price !== undefined ? String(rec.price) : '',
      servings: rec.servings !== undefined ? Number(rec.servings) : 0
    });
    this.recomputeSell();
  },

  onDateChange(e) {
    const date = e.detail.value;
    this.setData({ date: date });
    this.loadDate(date);
  },

  onPriceInput(e) {
    this.setData({ price: e.detail.value });
    this.recomputeSell();
  },

  inc() {
    this.setData({ servings: this.data.servings + 1 });
    this.recomputeSell();
  },
  dec() {
    this.setData({ servings: Math.max(0, this.data.servings - 1) });
    this.recomputeSell();
  },
  addN(e) {
    const n = parseInt(e.currentTarget.dataset.n);
    this.setData({ servings: this.data.servings + n });
    this.recomputeSell();
  },

  recomputeSell() {
    const rec = store.getRecords()[this.data.date] || {};
    const vItems = store.normalizeVariableItems(rec);
    let variableNum = 0;
    vItems.forEach(function (it) { variableNum += parseFloat(it.amount) || 0; });
    const bulkNum = parseFloat(this.data.bulkDaily) || 0;
    const stallNum = parseFloat(this.data.stallFee) || 0;
    const totalNum = variableNum + bulkNum + stallNum;

    const price = parseFloat(this.data.price) || 0;
    const servings = this.data.servings || 0;
    const salesNum = price * servings;
    const netNum = salesNum - totalNum;

    this.setData({
      totalCost: store.fmt(totalNum),
      sales: store.fmt(salesNum),
      netProfit: store.fmt(netNum),
      profitClass: netNum >= 0 ? 'red' : 'green'
    });
  },

  saveSell() {
    const records = store.getRecords();
    const d = this.data.date;
    const rec = records[d] || { date: d };
    rec.date = d;
    rec.price = parseFloat(this.data.price) || 0;
    rec.servings = this.data.servings || 0;
    records[d] = rec;
    store.setRecords(records);
    wx.showToast({ title: '已保存', icon: 'success' });
  }
});
