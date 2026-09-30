// 本地缓存工具：所有数据仅保存在微信小程序本地 storage，无云开发/无后端
const KEY_RECORDS = 'fd_records';   // 每日摆摊记录 { 'YYYY-MM-DD': {variableItems:[{id,name,amount}],price,servings} }
const KEY_BULK = 'fd_bulk';         // 一次性大宗采购列表 [{id,name,totalCost,days,daily,date}]
const KEY_STALL = 'fd_stall_fee';   // 每日固定摊位费（元/天）

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
  normalizeVariableItems: normalizeVariableItems
};
