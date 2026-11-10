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

  /* 取星期几。用年月日新建日期，不经过字符串解析，避免时区偏移 */
  function weekday(dateStr) {
    var p = String(dateStr).split('-');
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    return '星期' + '日一二三四五六'.charAt(d.getDay());
  }

  /* 分转元，保留两位小数并加千分位。负数保留前置减号 */
  function formatCents(cents) {
    var value = Number(cents || 0) / 100;
    var parts = Math.abs(value).toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (value < 0 ? '-' : '') + parts.join('.');
  }

  TW.Utils = {
    date: {
      today: today,
      monthOf: monthOf,
      weekday: weekday
    },
    money: {
      format: formatCents
    }
  };

})(window);
