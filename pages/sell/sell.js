// 售卖记账页：支持多种商品（售卖物品种类）
// 计算逻辑与原公式一致：总销售额 = Σ(各商品 单价 × 份数)；总成本 = 变动成本 + 大宗分摊 + 摊位费；净利润 = 总销售额 − 总成本
const store = require('../../utils/storage.js');

// 在商品列表中按 id 查找下标（不用箭头函数，兼顾老基础库）
function indexOfProduct(arr, id) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].id === id) return i;
  }
  return -1;
}

Page({
  data: {
    date: '',
    products: [],          // 商品列表 [{id, name, price}]
    selectedId: '',        // 当前选中商品 id
    selectedIndex: 0,      // 下拉选择器索引
    selectedName: '',
    selectedPrice: '',     // 当前商品单份售价（可编辑）
    servings: 0,           // 当前商品当日卖出份数
    selectedSales: '0.00', // 当前商品销售小计（单价×份数）
    totalSales: '0.00',    // 当日总销售额（所有商品求和）
    totalCost: '0.00',     // 当日总成本
    netProfit: '0.00',     // 总净利润
    profitClass: 'red',
    newName: '',           // 新增商品：名称
    newPrice: '',          // 新增商品：售价
    hasProducts: false
  },

  onLoad() {
    this.setData({ date: store.todayStr() });
    this.loadAll();
  },
  onShow() {
    this.loadAll();
  },

  // 载入商品列表 + 选中项 + 当日数据
  loadAll() {
    const date = this.data.date;
    const products = store.getProducts();
    let selectedId = store.getSelectedProductId();
    if (indexOfProduct(products, selectedId) < 0) {
      selectedId = products.length ? products[0].id : '';
    }
    this.setData({ products: products, hasProducts: products.length > 0 });
    this.syncSelected(date, selectedId);
  },

  // 切换/载入某个商品：同步名称、售价、当日份数，并重新计算
  syncSelected(date, id) {
    const products = this.data.products;
    const idx = indexOfProduct(products, id);
    this.setData({ selectedId: id, selectedIndex: idx < 0 ? 0 : idx });
    if (!id) {
      this.setData({ selectedName: '', selectedPrice: '', servings: 0 });
    } else {
      const prod = products[idx];
      const rec = store.getRecords()[date] || {};
      const prodMap = rec.products || {};
      this.setData({
        selectedName: prod.name,
        selectedPrice: String(prod.price),
        servings: Number(prodMap[id]) || 0
      });
    }
    this.recompute(date);
  },

  onDateChange(e) {
    const date = e.detail.value;
    this.setData({ date: date });
    this.syncSelected(date, this.data.selectedId);
  },

  // 下拉切换商品
  onProductChange(e) {
    const idx = Number(e.detail.value);
    const products = this.data.products;
    if (!products[idx]) return;
    const id = products[idx].id;
    store.setSelectedProductId(id);
    this.syncSelected(this.data.date, id);
  },

  // 编辑当前商品售价 -> 更新全局商品列表中的售价
  onPriceInput(e) {
    const price = e.detail.value;
    const id = this.data.selectedId;
    this.setData({ selectedPrice: price });
    if (id) {
      const arr = store.getProducts().map(function (p) {
        return p.id === id ? Object.assign({}, p, { price: parseFloat(price) || 0 }) : p;
      });
      store.setProducts(arr);
      this.setData({ products: arr });
    }
    this.recompute(this.data.date);
  },

  inc() {
    this.setData({ servings: this.data.servings + 1 });
    this.persistServings();
    this.recompute(this.data.date);
  },
  dec() {
    this.setData({ servings: Math.max(0, this.data.servings - 1) });
    this.persistServings();
    this.recompute(this.data.date);
  },
  addN(e) {
    const n = parseInt(e.currentTarget.dataset.n);
    this.setData({ servings: this.data.servings + n });
    this.persistServings();
    this.recompute(this.data.date);
  },

  // 把当前商品份数实时写回当日记录（无需点保存也已在本地落盘）
  persistServings() {
    const id = this.data.selectedId;
    if (!id) return;
    const records = store.getRecords();
    const d = this.data.date;
    const rec = records[d] || { date: d };
    const prodMap = rec.products || {};
    prodMap[id] = this.data.servings;
    rec.products = prodMap;
    records[d] = rec;
    store.setRecords(records);
  },

  // 统一重算：当前商品小计 + 当日总销售额/总成本/净利润
  recompute(date) {
    const products = store.getProducts();
    const totals = store.computeDailyTotals(date);
    const prod = products[indexOfProduct(products, this.data.selectedId)];
    const price = prod ? (parseFloat(prod.price) || 0) : 0;
    const servings = this.data.servings || 0;
    const selectedSales = price * servings;
    this.setData({
      totalSales: totals.totalSales,
      totalCost: totals.totalCost,
      netProfit: totals.netProfit,
      profitClass: totals.profitClass,
      selectedSales: store.fmt(selectedSales)
    });
  },

  // 新增商品
  onNewName(e) { this.setData({ newName: e.detail.value }); },
  onNewPrice(e) { this.setData({ newPrice: e.detail.value }); },
  addProduct() {
    const name = (this.data.newName || '').trim();
    const price = parseFloat(this.data.newPrice);
    if (!name) { wx.showToast({ title: '请填写商品名称', icon: 'none' }); return; }
    if (!(price >= 0)) { wx.showToast({ title: '请填写有效售价', icon: 'none' }); return; }
    const arr = store.saveProduct(name, price);
    const newId = arr[arr.length - 1].id;
    store.setSelectedProductId(newId);
    this.setData({ products: arr, hasProducts: true, newName: '', newPrice: '' });
    this.syncSelected(this.data.date, newId);
    wx.showToast({ title: '已添加', icon: 'success' });
  },

  // 删除当前选中的商品：从商品列表移除，并清除当日该商品的销售份数，自动切换到下一个商品
  deleteProduct() {
    const id = this.data.selectedId;
    const name = this.data.selectedName;
    if (!id) { wx.showToast({ title: '请先选择商品', icon: 'none' }); return; }
    const that = this;
    wx.showModal({
      title: '删除商品',
      content: '确定删除「' + (name || '该商品') + '」吗？该商品当日已记录的卖出份数也会一并清除，且无法恢复。',
      confirmColor: '#e53935',
      success: function (res) {
        if (!res.confirm) return;
        // 1) 从商品列表移除
        const arr = store.deleteProduct(id);
        // 2) 清除当日记录中该商品的份数，避免汇总仍计入
        const records = store.getRecords();
        const d = that.data.date;
        const rec = records[d] || {};
        if (rec.products && rec.products[id] !== undefined) {
          delete rec.products[id];
          records[d] = rec;
          store.setRecords(records);
        }
        // 3) 重新选择（选第一项，列表空则清空）
        const nextId = arr.length ? arr[0].id : '';
        store.setSelectedProductId(nextId);
        that.setData({ products: arr, hasProducts: arr.length > 0 });
        that.syncSelected(that.data.date, nextId);
        wx.showToast({ title: '已删除', icon: 'success' });
      }
    });
  },

  // 保存（份数已实时落盘，这里再保一次并提示）
  saveSell() {
    this.persistServings();
    wx.showToast({ title: '已保存', icon: 'success' });
  }
});
