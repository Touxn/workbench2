/* ============================================================
   图寻工作台 领域层
   初始化、偏好读写。业务读写接口随功能分批补入
   ============================================================ */
(function (global) {
  'use strict';

  var TW = global.TW = global.TW || {};
  var DB = TW.DB;

  var PREF = {
    route: 'tw.lastRoute',
    month: 'tw.lastMonth'
  };

  var memoryPrefs = {};
  var ready = false;

  /* localStorage 在无痕模式或存储被禁用时会抛异常，退到内存里，至少当前会话不崩 */
  function readRaw(key) {
    try {
      var value = global.localStorage.getItem(key);
      if (value !== null) return value;
    } catch (e) { /* 落到内存兜底 */ }
    return Object.prototype.hasOwnProperty.call(memoryPrefs, key) ? memoryPrefs[key] : null;
  }

  function writeRaw(key, value) {
    try {
      global.localStorage.setItem(key, String(value));
    } catch (e) {
      memoryPrefs[key] = String(value);
    }
  }

  /* 申请持久化存储，降低浏览器自动清理的概率。失败不影响使用 */
  function requestPersist() {
    var storage = global.navigator && global.navigator.storage;
    if (!storage || typeof storage.persist !== 'function') return;
    try {
      var out = storage.persist();
      if (out && typeof out.catch === 'function') out.catch(function () {});
    } catch (e) { /* 忽略 */ }
  }

  function init() {
    return DB.open().then(function () {
      ready = true;
      requestPersist();
      return true;
    });
  }

  function isReady() {
    return ready;
  }

  /* 两项偏好：停留的页面、查看的月份。月份缺省取本月 */
  function pref(name) {
    if (name === 'route') return readRaw(PREF.route) || 'overview';
    if (name === 'month') return readRaw(PREF.month) || TW.Utils.date.monthOf(TW.Utils.date.today());
    return null;
  }

  function setPref(name, value) {
    if (!Object.prototype.hasOwnProperty.call(PREF, name)) return;
    writeRaw(PREF[name], value);
  }

  /* ---------- 常量 ---------- */

  var CATEGORIES = {
    expense: ['餐饮', '交通', '购物', '居住', '娱乐', '医疗', '其他'],
    income: ['工资', '项目', '副业', '其他']
  };

  var AMOUNT_MAX = 100000000;   /* 一百万元，单位分 */
  var NOTE_MAX = 60;

  function invalid(message) {
    var err = new Error(message);
    err.code = 'E_INVALID_INPUT';
    return err;
  }

  function notFound(message) {
    var err = new Error(message || '记录不存在');
    err.code = 'E_NOT_FOUND';
    return err;
  }

  /* ---------- 收支 ---------- */

  function moneyCreate(input) {
    var date = String(input.date || '');
    var type = input.type === 'income' ? 'income' : 'expense';
    var list = CATEGORIES[type];

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Promise.reject(invalid('请选择一个日期'));
    if (date > TW.Utils.date.today()) return Promise.reject(invalid('日期不能晚于今天'));

    var cents = TW.Utils.money.toCents(input.amountYuan);
    if (!isFinite(cents) || cents <= 0) return Promise.reject(invalid('金额必须大于 0'));
    if (cents > AMOUNT_MAX) return Promise.reject(invalid('金额过大'));

    if (list.indexOf(input.category) === -1) return Promise.reject(invalid('类别不正确'));

    var now = Date.now();
    var record = {
      id: TW.Utils.id('tx'),
      date: date,
      month: TW.Utils.date.monthOf(date),
      type: type,
      amountCents: cents,
      category: input.category,
      note: String(input.note || '').slice(0, NOTE_MAX),
      createdAt: now,
      updatedAt: now
    };

    return DB.put('transactions', record).then(function () {
      return record;
    });
  }

  /* 某月全部记录，日期倒序，同一天内新的在前 */
  function moneyListByMonth(month) {
    return DB.byIndex('transactions', 'by_month', IDBKeyRange.only(month)).then(function (rows) {
      return rows.sort(function (a, b) {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return b.createdAt - a.createdAt;
      });
    });
  }

  function moneyRemove(id) {
    return DB.get('transactions', id).then(function (rec) {
      if (!rec) throw notFound('这笔记录已经不在了');
      return DB.remove('transactions', id);
    });
  }

  function moneyListByDate(date) {
    return DB.byIndex('transactions', 'by_date', IDBKeyRange.only(date)).then(function (rows) {
      return rows.sort(function (a, b) {
        return b.createdAt - a.createdAt;
      });
    });
  }

  /* 月度汇总：三个合计与支出按类别的金额，类别已按金额降序 */
  function moneySummary(month) {
    return moneyListByMonth(month).then(function (rows) {
      var income = 0;
      var expense = 0;
      var byCat = {};

      rows.forEach(function (r) {
        if (r.type === 'income') {
          income += r.amountCents;
        } else {
          expense += r.amountCents;
          byCat[r.category] = (byCat[r.category] || 0) + r.amountCents;
        }
      });

      var byCategory = Object.keys(byCat).map(function (key) {
        return { category: key, cents: byCat[key] };
      }).sort(function (a, b) {
        return b.cents - a.cents;
      });

      return {
        income: income,
        expense: expense,
        net: income - expense,
        byCategory: byCategory,
        count: rows.length
      };
    });
  }

  TW.Store = {
    categories: CATEGORIES,
    amountMax: AMOUNT_MAX,
    noteMax: NOTE_MAX,
    init: init,
    isReady: isReady,
    pref: pref,
    setPref: setPref,
    money: {
      create: moneyCreate,
      listByMonth: moneyListByMonth,
      listByDate: moneyListByDate,
      summary: moneySummary,
      remove: moneyRemove
    }
  };

})(window);
