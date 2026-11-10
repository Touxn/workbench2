/* ============================================================
   图寻工作台 基础工具
   纯函数，不读全局状态，不碰 DOM
   ============================================================ */
(function (global) {
  'use strict';

  var TW = global.TW = global.TW || {};

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  /* 本地时区的今天。刻意不用 toISOString，避免被换算成 UTC 后差一天 */
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  /* 从 YYYY-MM-DD 取 YYYY-MM，也用于直接传月份 */
  function monthOf(dateStr) {
    return String(dateStr).slice(0, 7);
  }

  TW.Utils = {
    date: {
      today: today,
      monthOf: monthOf
    }
  };

})(window);
