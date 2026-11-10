/* ============================================================
   图寻工作台 视图层
   五个视图各占一段：空状态与静态结构，交互随功能分批补入
   ============================================================ */
(function (global) {
  'use strict';

  var TW = global.TW = global.TW || {};
  var U = TW.Utils;

  var ICON = {
    receipt: '<path d="M6 3.5h12v17l-3-1.8-3 1.8-3-1.8-3 1.8z"/><path d="M9 8.5h6"/><path d="M9 12.5h4"/>',
    check: '<circle cx="12" cy="12" r="8.5"/><path d="M8.4 12.2l2.5 2.4 4.6-4.8"/>',
    bulb: '<path d="M9.5 18h5"/><path d="M10.5 21h3"/><path d="M12 3a6 6 0 0 0-3.7 10.7c.6.5.9 1.2.9 1.9h5.6c0-.7.3-1.4.9-1.9A6 6 0 0 0 12 3z"/>',
    box: '<path d="M12 3.2l8 4.3v9L12 20.8l-8-4.3v-9z"/><path d="M4 7.5l8 4.3 8-4.3"/><path d="M12 11.8V20.4"/>'
  };

  function icon(name, size) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + ICON[name] + '</svg>';
  }

  function money(cents) {
    return U.money.format(cents);
  }

  /* 空状态统一三件套：图标、一句说明、一句引导 */
  function empty(ico, title, sub, compact) {
    return '<div class="empty' + (compact ? ' compact' : '') + '">' +
      '<div class="e-ico">' + icon(ico, 19) + '</div>' +
      '<div class="e-title">' + title + '</div>' +
      '<div class="e-sub">' + sub + '</div>' +
      '</div>';
  }

  function setBody(route, html) {
    var box = document.querySelector('#view-' + route + ' .view-body');
    if (box) box.innerHTML = html;
  }

  var Views = TW.Views = {};

  /* ---------- 概览 ---------- */
  Views.overview = {
    render: function () {
      var today = U.date.today();
      var head = document.getElementById('ov-sub');
      if (head) {
        head.textContent = Number(today.slice(5, 7)) + ' 月 ' + Number(today.slice(8)) + ' 日 · ' + U.date.weekday(today);
      }

      setBody('overview',
        '<div class="stats">' +
          '<div class="card stat">' +
            '<div class="label">今日支出</div>' +
            '<div class="num"><small>¥</small>' + money(0) + '</div>' +
            '<div class="sub">共 0 笔</div>' +
          '</div>' +
          '<div class="card stat income">' +
            '<div class="label">今日收入</div>' +
            '<div class="num"><small>¥</small>' + money(0) + '</div>' +
            '<div class="sub">暂无</div>' +
          '</div>' +
          '<div class="card stat">' +
            '<div class="label">本月结余</div>' +
            '<div class="num"><small>¥</small>' + money(0) + '</div>' +
            '<div class="sub">收入 ' + money(0) + ' · 支出 ' + money(0) + '</div>' +
          '</div>' +
          '<div class="card stat">' +
            '<div class="label">待办剩余</div>' +
            '<div class="num">0</div>' +
            '<div class="sub">无逾期</div>' +
          '</div>' +
        '</div>' +

        '<div class="grid-2">' +
          '<section class="card block">' +
            '<div class="block-head"><h2>本月收支</h2><a href="#/money">查看明细</a></div>' +
            '<div class="sum-row"><div class="sum-top"><span class="k">收入</span><span class="v in">¥' + money(0) + '</span></div></div>' +
            '<div class="sum-row"><div class="sum-top"><span class="k">支出</span><span class="v">¥' + money(0) + '</span></div></div>' +
            '<div class="sum-row"><div class="sum-top"><span class="k">结余</span><span class="v">¥' + money(0) + '</span></div></div>' +
            '<div class="top-cats">' +
              '<div class="tc-h">支出前三</div>' +
              '<div class="tc-empty">本月还没有支出记录</div>' +
            '</div>' +
          '</section>' +
          '<section class="card block">' +
            '<div class="block-head"><h2>最近灵感</h2><a href="#/ideas">全部</a></div>' +
            empty('bulb', '还没有灵感', '文字、链接、照片都能收进来', true) +
          '</section>' +
        '</div>' +

        '<p class="foot-note">数据只保存在这台电脑的浏览器里，不会上传到任何服务器。</p>'
      );
    }
  };

  /* ---------- 收支 ---------- */
  Views.money = {
    render: function () {
      setBody('money',
        '<section class="card list-card">' +
          empty('receipt', '这个月还没有记录', '记下的每一笔会按日期排在这里，收入带加号，支出带减号') +
        '</section>'
      );
    }
  };

  /* ---------- 待办 ---------- */
  Views.todos = {
    render: function () {
      setBody('todos',
        '<section class="card todo-wrap">' +
          '<div class="group-title">未完成<span class="n">0</span></div>' +
          empty('check', '暂无待办', '记下的事情会按截止日期排好，过期没做的会标红') +
        '</section>'
      );
    }
  };

  /* ---------- 灵感 ---------- */
  Views.ideas = {
    render: function () {
      setBody('ideas',
        '<div class="card">' +
          empty('bulb', '还没有灵感', '文字、链接、照片都可以收进来，回头找得到') +
        '</div>'
      );
    }
  };

  /* ---------- 备份 ---------- */
  Views.backup = {
    render: function () {
      setBody('backup',
        '<section class="card bk-body">' +
          '<h2>还没有可以备份的内容</h2>' +
          '<p>收支、待办、灵感和图片都只存在这台电脑的浏览器里。备份会把它们打包成一个文件，方便放到网盘或移动硬盘。</p>' +
        '</section>'
      );
    }
  };

})(window);
