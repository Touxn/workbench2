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

  TW.Store = {
    init: init,
    isReady: isReady,
    pref: pref,
    setPref: setPref
  };

})(window);
