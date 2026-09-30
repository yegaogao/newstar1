// 本地缓存工具：所有数据仅保存在微信小程序本地 storage，无云开发/无后端
const KEY_RECORDS = 'fd_records';   // 每日摆摊记录 { 'YYYY-MM-DD': {variableItems:[{id,name,amount}], products:{[productId]:servings}, price, servings(旧兼容)} }
const KEY_BULK = 'fd_bulk';         // 一次性大宗采购列表 [{id,name,totalCost,days,daily,date}]
const KEY_STALL = 'fd_stall_fee';   // 每日固定摊位费（元/天）
const KEY_PRODUCTS = 'fd_products'; // 售卖商品列表 [{id,name,price}]（全局，所有商品种类）
const KEY_SELECTED = 'fd_selected_product'; // 当前选中商品 id

function getRecords() {
  return wx.getStorageSync(KEY_RECORDS) || {};
}
function setRecords(obj) {
  wx.setStorageSync(KEY_RECORDS, obj);
}
function getBulk() {
  return wx.getStorageSync(KEY_BULK) || [];
}
function setBulk(list) {
  wx.setStorageSync(KEY_BULK, list);
}
function getStallFee() {
  const v = wx.getStorageSync(KEY_STALL);
  return (v === '' || v === undefined || v === null) ? 0 : Number(v);
}
function setStallFee(v) {
  wx.setStorageSync(KEY_STALL, v);
}

// 大宗物料每日分摊金额 = Σ(每笔总花费 / 预计摆摊天数)
function bulkDailyAllocation() {
  const list = getBulk();
  let sum = 0;
  list.forEach(function (b) {
    const days = Number(b.days) || 0;
    const cost = Number(b.totalCost) || 0;
    if (days > 0) sum += cost / days;
  });
  return sum;
}

function todayStr() {
  const d = new Date();
  const m = ('0' + (d.getMonth() + 1)).slice(-2);
  const day = ('0' + d.getDate()).slice(-2);
  return d.getFullYear() + '-' + m + '-' + day;
}

function fmt(n) {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return v.toFixed(2);
}

// 归一化当日变动成本项目：优先用 variableItems，兼容旧数据(rouPian/qingCai/cong)
function normalizeVariableItems(rec) {
  rec = rec || {};
  if (Array.isArray(rec.variableItems)) return rec.variableItems;
  const out = [];
  if (rec.rouPian !== undefined) out.push({ id: 'legacy_roupian', name: '肉片', amount: rec.rouPian });
  if (rec.qingCai !== undefined) out.push({ id: 'legacy_qingcai', name: '青菜', amount: rec.qingCai });
  if (rec.cong !== undefined) out.push({ id: 'legacy_cong', name: '葱', amount: rec.cong });
  return out;
}

// ===================== 售卖物品种类（多商品支持） =====================
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getProducts() {
  return wx.getStorageSync(KEY_PRODUCTS) || [];
}
function setProducts(arr) {
  wx.setStorageSync(KEY_PRODUCTS, arr);
}
// 新增商品（名称 + 单份售价），返回最新列表
function saveProduct(name, price) {
  const arr = getProducts();
  arr.push({ id: uid(), name: name, price: price });
  setProducts(arr);
  return arr;
}
// 删除商品
function deleteProduct(id) {
  const arr = getProducts().filter(function (p) { return p.id !== id; });
  setProducts(arr);
  return arr;
}
function getSelectedProductId() {
  return wx.getStorageSync(KEY_SELECTED) || '';
}
function setSelectedProductId(id) {
  wx.setStorageSync(KEY_SELECTED, id);
}

// 取某日各商品销售明细：[{productId,name,price,servings,sales}]
// 兼容旧数据：若记录为顶层 price/servings，则当作单个商品处理（命名为"招牌肉片"）
function getRecordProductSales(record, products) {
  record = record || {};
  products = products || getProducts();
  if (record.products && typeof record.products === 'object') {
    return products.map(function (p) {
      const servings = Number(record.products[p.id]) || 0;
      return { productId: p.id, name: p.name, price: p.price, servings: servings, sales: p.price * servings };
    });
  }
  if (record.price !== undefined || record.servings !== undefined) {
    const price = parseFloat(record.price) || 0;
    const servings = Number(record.servings) || 0;
    return [{ productId: '__legacy__', name: '招牌肉片', price: price, servings: servings, sales: price * servings }];
  }
  return [];
}

// 统一计算当日汇总
// 计算逻辑与原公式完全一致：总成本 = 变动成本 + 大宗分摊 + 摊位费；
// 销售额扩展为多商品求和：总销售额 = Σ(各商品 单价 × 份数)；净利润 = 总销售额 − 总成本
function computeDailyTotals(date) {
  const rec = getRecords()[date] || {};
  const products = getProducts();
  const vItems = normalizeVariableItems(rec);
  let variableNum = 0;
  vItems.forEach(function (it) { variableNum += parseFloat(it.amount) || 0; });
  const bulkDaily = bulkDailyAllocation();
  const stallFee = getStallFee();
  const totalCost = variableNum + bulkDaily + stallFee;

  const productSales = getRecordProductSales(rec, products);
  let totalSales = 0;
  productSales.forEach(function (p) { totalSales += p.sales; });
  const netProfit = totalSales - totalCost;

  return {
    variableCost: fmt(variableNum),
    bulkDaily: fmt(bulkDaily),
    stallFee: fmt(stallFee),
    totalCost: fmt(totalCost),
    productSales: productSales,
    totalSales: fmt(totalSales),
    netProfit: fmt(netProfit),
    profitClass: netProfit >= 0 ? 'red' : 'green'
  };
}

module.exports = {
  KEY_RECORDS: KEY_RECORDS,
  KEY_BULK: KEY_BULK,
  KEY_STALL: KEY_STALL,
  getRecords: getRecords,
  setRecords: setRecords,
  getBulk: getBulk,
  setBulk: setBulk,
  getStallFee: getStallFee,
  setStallFee: setStallFee,
  bulkDailyAllocation: bulkDailyAllocation,
  todayStr: todayStr,
  fmt: fmt,
  normalizeVariableItems: normalizeVariableItems,
  KEY_PRODUCTS: KEY_PRODUCTS,
  KEY_SELECTED: KEY_SELECTED,
  getProducts: getProducts,
  setProducts: setProducts,
  saveProduct: saveProduct,
  deleteProduct: deleteProduct,
  getSelectedProductId: getSelectedProductId,
  setSelectedProductId: setSelectedProductId,
  getRecordProductSales: getRecordProductSales,
  computeDailyTotals: computeDailyTotals
};
