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
  var IDEA_TEXT_MAX = 2000;
  var IDEA_KINDS = ['text', 'link', 'image'];

  /* field 指向出问题的表单项，视图层据此把红字标在对应位置 */
  function invalid(message, field) {
    var err = new Error(message);
    err.code = 'E_INVALID_INPUT';
    if (field) err.field = field;
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

  /* 连续若干个月的支出合计，末月由调用方指定，用于趋势图 */
  function moneyMonthlyExpense(endMonth, count) {
    var months = [];
    for (var i = Number(count) - 1; i >= 0; i--) {
      months.push(TW.Utils.date.shiftMonth(endMonth, -i));
    }
    return Promise.all(months.map(function (m) {
      return moneySummary(m);
    })).then(function (list) {
      return list.map(function (sum, idx) {
        return { month: months[idx], expense: sum.expense };
      });
    });
  }

  /* ---------- 灵感 ---------- */

  /* 新的在前。列表只带缩略图，原图留在 ideaImages 里按需读 */
  function ideaList() {
    return DB.getAll('ideas').then(function (rows) {
      return rows.sort(function (a, b) {
        return b.createdAt - a.createdAt;
      });
    });
  }

  function ideaGetImage(imageId) {
    if (!imageId) return Promise.resolve(null);
    return DB.get('ideaImages', imageId).then(function (rec) {
      return rec ? rec.blob : null;
    });
  }

  function ideaCreate(input) {
    var kind = input.kind;
    if (IDEA_KINDS.indexOf(kind) === -1) return Promise.reject(invalid('形态不正确', 'text'));

    var text = String(input.text == null ? '' : input.text).trim();
    if (text.length > IDEA_TEXT_MAX) {
      return Promise.reject(invalid('正文最多 ' + IDEA_TEXT_MAX + ' 字', 'text'));
    }

    var url = '';
    if (kind === 'link') {
      url = String(input.url == null ? '' : input.url).trim();
      if (!/^https?:\/\/\S+$/i.test(url)) {
        return Promise.reject(invalid('请输入完整网址，以 http 开头', 'url'));
      }
    }

    /* BR-4.3 正文只有在图片形态下才允许为空 */
    if (kind !== 'image' && !text) {
      return Promise.reject(invalid(kind === 'link' ? '写一句这个链接是什么' : '写点内容再保存', 'text'));
    }

    var prepared = kind === 'image' ? TW.Image.compress(input.file) : Promise.resolve(null);

    return prepared.then(function (img) {
      var now = Date.now();
      var record = {
        id: TW.Utils.id('idea'),
        kind: kind,
        text: text,
        url: url,
        imageId: img ? TW.Utils.id('img') : null,
        thumb: img ? img.thumb : null,
        imageWidth: img ? img.width : null,
        imageHeight: img ? img.height : null,
        imageBytes: img ? img.bytes : null,
        createdAt: now,
        updatedAt: now
      };

      var image = img ? {
        id: record.imageId,
        blob: img.blob,
        mime: 'image/jpeg',
        bytes: img.bytes,
        createdAt: now
      } : null;

      /* 元数据与图片必须一起成功，任一失败整笔回滚 */
      return DB.run(['ideas', 'ideaImages'], 'readwrite', function (tx) {
        if (image) tx.objectStore('ideaImages').put(image);
        tx.objectStore('ideas').put(record);
        return record;
      });
    });
  }

  function ideaRemove(id) {
    return DB.get('ideas', id).then(function (rec) {
      if (!rec) throw notFound('这条灵感已经不在了');
      return DB.run(['ideas', 'ideaImages'], 'readwrite', function (tx) {
        tx.objectStore('ideas').delete(id);
        if (rec.imageId) tx.objectStore('ideaImages').delete(rec.imageId);
      });
    });
  }

  TW.Store = {
    categories: CATEGORIES,
    amountMax: AMOUNT_MAX,
    noteMax: NOTE_MAX,
    ideaTextMax: IDEA_TEXT_MAX,
    init: init,
    isReady: isReady,
    pref: pref,
    setPref: setPref,
    money: {
      create: moneyCreate,
      listByMonth: moneyListByMonth,
      listByDate: moneyListByDate,
      summary: moneySummary,
      monthlyExpense: moneyMonthlyExpense,
      remove: moneyRemove
    },
    ideas: {
      create: ideaCreate,
      list: ideaList,
      getImage: ideaGetImage,
      remove: ideaRemove
    }
  };

})(window);
