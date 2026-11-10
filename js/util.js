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

  /* 元转分。只接受纯数字与小数点，最多两位小数，其他一律返回 NaN 交给调用方判断 */
  function toCents(input) {
    var raw = String(input == null ? '' : input).replace(/[¥,\s]/g, '');
    if (!/^\d+(\.\d{0,2})?$/.test(raw)) return NaN;
    return Math.round(Number(raw) * 100);
  }

  /* 2026-11 → 2026 年 11 月 */
  function monthLabel(month) {
    var p = String(month).split('-');
    return p[0] + ' 年 ' + Number(p[1]) + ' 月';
  }

  /* 2026-11-10 → 11 月 10 日 */
  function dayLabel(dateStr) {
    var p = String(dateStr).split('-');
    return Number(p[1]) + ' 月 ' + Number(p[2]) + ' 日';
  }

  /* 月份前后挪。用 Date 处理跨年，delta 可为负数 */
  function shiftMonth(month, delta) {
    var p = String(month).split('-');
    var d = new Date(Number(p[0]), Number(p[1]) - 1 + Number(delta), 1);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1);
  }

  /* 全局唯一 ID：前缀_时间戳36进制_四位随机 */
  function makeId(prefix) {
    var rand = Math.random().toString(36).slice(2, 6);
    return prefix + '_' + Date.now().toString(36) + '_' + (rand + '000').slice(0, 4);
  }

  TW.Utils = {
    date: {
      today: today,
      monthOf: monthOf,
      weekday: weekday,
      monthLabel: monthLabel,
      dayLabel: dayLabel,
      shiftMonth: shiftMonth
    },
    money: {
      format: formatCents,
      toCents: toCents
    },
    id: makeId
  };

})(window);
