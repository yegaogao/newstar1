const store = require('../../utils/storage.js');

Page({
  data: {
    date: '',
    variableItems: [],
    variableCost: '0.00',
    bulkName: '',
    bulkCost: '',
    bulkDays: '',
    bulkList: [],
    bulkDaily: '0.00',
    stallFee: '',
    estimatedTotal: '0.00'
  },

  onLoad() {
    const date = store.todayStr();
    this.setData({ date: date });
    this.loadBulk();
    this.loadStall();
    this.loadDate(date);
  },

  onShow() {
    this.loadBulk();
    this.loadStall();
    this.loadDate(this.data.date);
  },

  loadDate(date) {
    const rec = store.getRecords()[date] || {};
    let items = store.normalizeVariableItems(rec);
    if (items.length === 0) {
      // 原有三项作为默认条目
      items = [
        { id: 'def_roupian', name: '肉', amount: '' },
        { id: 'def_qingcai', name: '青菜', amount: '' },
        { id: 'def_cong', name: '葱', amount: '' }
      ];
    } else {
      items = items.map(function (it) {
        return {
          id: it.id,
          name: it.name,
          amount: (it.amount === undefined || it.amount === null) ? '' : String(it.amount)
        };
      });
    }
    this.setData({ variableItems: items });
    this.recomputeCost();
  },

  onDateChange(e) {
    const date = e.detail.value;
    this.setData({ date: date });
    this.loadDate(date);
  },

  onVarName(e) {
    const id = e.currentTarget.dataset.id;
    const items = this.data.variableItems.map(function (it) {
      return it.id === id ? { id: it.id, name: e.detail.value, amount: it.amount } : it;
    });
    this.setData({ variableItems: items });
  },

  onVarAmount(e) {
    const id = e.currentTarget.dataset.id;
    const items = this.data.variableItems.map(function (it) {
      return it.id === id ? { id: it.id, name: it.name, amount: e.detail.value } : it;
    });
    this.setData({ variableItems: items });
    this.recomputeCost();
  },

  addVar() {
    const items = this.data.variableItems.concat([{
      id: 'v_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name: '',
      amount: ''
    }]);
    this.setData({ variableItems: items });
  },

  delVar(e) {
    const id = e.currentTarget.dataset.id;
    const items = this.data.variableItems.filter(function (it) { return it.id !== id; });
    this.setData({ variableItems: items });
    this.recomputeCost();
  },

  recomputeCost() {
    let variableNum = 0;
    this.data.variableItems.forEach(function (it) {
      variableNum += parseFloat(it.amount) || 0;
    });
    const bulkNum = parseFloat(this.data.bulkDaily) || 0;
    const stallNum = parseFloat(this.data.stallFee) || 0;
    this.setData({
      variableCost: store.fmt(variableNum),
      estimatedTotal: store.fmt(variableNum + bulkNum + stallNum)
    });
  },

  saveVariable() {
    const records = store.getRecords();
    const d = this.data.date;
    const rec = records[d] || { date: d };
    rec.date = d;
    rec.variableItems = this.data.variableItems.map(function (it) {
      return { id: it.id, name: it.name, amount: parseFloat(it.amount) || 0 };
    });
    delete rec.rouPian;
    delete rec.qingCai;
    delete rec.cong;
    records[d] = rec;
    store.setRecords(records);
    wx.showToast({ title: '已保存', icon: 'success' });
  },

  onBulkName(e) { this.setData({ bulkName: e.detail.value }); },
  onBulkCost(e) { this.setData({ bulkCost: e.detail.value }); },
  onBulkDays(e) { this.setData({ bulkDays: e.detail.value }); },

  addBulk() {
    const name = (this.data.bulkName || '').trim();
    const cost = parseFloat(this.data.bulkCost);
    const days = parseInt(this.data.bulkDays);
    if (!name) { wx.showToast({ title: '请填写物料名称', icon: 'none' }); return; }
    if (!(cost > 0)) { wx.showToast({ title: '请填写有效总花费', icon: 'none' }); return; }
    if (!(days > 0)) { wx.showToast({ title: '请填写有效天数', icon: 'none' }); return; }
    const list = store.getBulk();
    list.push({
      id: Date.now().toString(),
      name: name,
      totalCost: cost,
      days: days,
      daily: store.fmt(cost / days),
      date: this.data.date
    });
    store.setBulk(list);
    this.setData({ bulkName: '', bulkCost: '', bulkDays: '' });
    this.loadBulk();
    wx.showToast({ title: '已添加', icon: 'success' });
  },

  loadBulk() {
    const list = store.getBulk();
    let sum = 0;
    list.forEach(function (b) {
      const days = Number(b.days) || 0;
      const cost = Number(b.totalCost) || 0;
      if (days > 0) sum += cost / days;
      b.daily = store.fmt(cost / days);
    });
    this.setData({ bulkList: list, bulkDaily: store.fmt(sum) });
    this.recomputeCost();
  },

  delBulk(e) {
    const id = e.currentTarget.dataset.id;
    const list = store.getBulk().filter(function (b) { return b.id !== id; });
    store.setBulk(list);
    this.loadBulk();
  },

  onStallInput(e) { this.setData({ stallFee: e.detail.value }); },

  saveStall() {
    const v = parseFloat(this.data.stallFee) || 0;
    store.setStallFee(v);
    this.setData({ stallFee: v ? String(v) : '' });
    this.recomputeCost();
    wx.showToast({ title: '已保存', icon: 'success' });
  },

  loadStall() {
    const v = store.getStallFee();
    this.setData({ stallFee: v ? String(v) : '' });
  }
});
