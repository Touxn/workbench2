/* ============================================================
   图寻工作台 视图层
   五个视图各占一段。交互随功能分批补入
   ============================================================ */
(function (global) {
  'use strict';

  var TW = global.TW = global.TW || {};
  var U = TW.Utils;
  var UI = TW.UI;

  var ICON = {
    receipt: '<path d="M6 3.5h12v17l-3-1.8-3 1.8-3-1.8-3 1.8z"/><path d="M9 8.5h6"/><path d="M9 12.5h4"/>',
    check: '<circle cx="12" cy="12" r="8.5"/><path d="M8.4 12.2l2.5 2.4 4.6-4.8"/>',
    bulb: '<path d="M9.5 18h5"/><path d="M10.5 21h3"/><path d="M12 3a6 6 0 0 0-3.7 10.7c.6.5.9 1.2.9 1.9h5.6c0-.7.3-1.4.9-1.9A6 6 0 0 0 12 3z"/>',
    link: '<path d="M10 13.8a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 0 0-5.7-5.7l-1.3 1.3"/><path d="M14 10.2a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 0 0 5.7 5.7l1.3-1.3"/>',
    box: '<path d="M12 3.2l8 4.3v9L12 20.8l-8-4.3v-9z"/><path d="M4 7.5l8 4.3 8-4.3"/><path d="M12 11.8V20.4"/>'
  };

  var CAT_COLOR = {
    '餐饮': '#C08A57',
    '交通': '#6C8FA8',
    '购物': '#9B7FA6',
    '居住': '#5E7B6B',
    '娱乐': '#BFA052',
    '医疗': '#8E8E93',
    '其他': '#A9A9A2',
    '工资': '#2C8A5A',
    '项目': '#3F9D78',
    '副业': '#57A98A'
  };

  function icon(name, size) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + ICON[name] + '</svg>';
  }

  /* 用户输入一律转义后再拼进 HTML */
  function esc(text) {
    return String(text == null ? '' : text).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function money(cents) {
    return U.money.format(cents);
  }

  var KIND_NAME = { text: '文本', link: '链接', image: '图片' };

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  /* 卡片角上的短日期，例如 11-10 */
  function shortDate(ts) {
    var d = new Date(Number(ts));
    return pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function fullLabel(ts) {
    var d = new Date(Number(ts));
    return d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日';
  }

  function sizeText(bytes) {
    if (!bytes) return '';
    if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    return Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }

  function domainOf(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch (e) {
      return String(url || '');
    }
  }

  function setIdeaCount(n) {
    var el = document.getElementById('nav-idea-count');
    if (el) el.textContent = String(n);
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
      var month = U.date.monthOf(today);

      var head = document.getElementById('ov-sub');
      if (head) head.textContent = U.date.dayLabel(today) + ' · ' + U.date.weekday(today);

      return Promise.all([
        TW.Store.money.listByDate(today),
        TW.Store.money.summary(month),
        TW.Store.ideas.list()
      ]).then(function (res) {
        var todayRows = res[0];
        var sum = res[1];
        var ideas = res[2];

        var todayExpense = 0;
        var todayIncome = 0;
        var todayCount = 0;
        todayRows.forEach(function (r) {
          if (r.type === 'income') todayIncome += r.amountCents;
          else { todayExpense += r.amountCents; todayCount++; }
        });

        var tops = sum.byCategory.slice(0, 3);
        var maxFlow = Math.max(sum.income, sum.expense, 1);

        var topHtml = tops.length
          ? tops.map(function (c) {
              var pct = sum.expense ? c.cents / sum.expense * 100 : 0;
              return '<div class="tc-row">' +
                '<span class="tc-name">' + esc(c.category) + '</span>' +
                '<span class="tc-bar"><i style="width:' + Math.max(pct, 2) + '%;background:' + (CAT_COLOR[c.category] || '#A9A9A2') + '"></i></span>' +
                '<span class="tc-val">¥' + money(c.cents) + '</span>' +
              '</div>';
            }).join('')
          : '<div class="tc-empty">本月还没有支出记录</div>';

        /* 概览点开详情时要用到同一条记录，顺手把列表交给灵感模块记着 */
        ideaRows = ideas;
        setIdeaCount(ideas.length);
        /* 先释放上一批缩略图地址，再生成新的，顺序颠倒会把新地址一起放掉 */
        dropUrls();
        var recent = ideas.slice(0, 5);
        var recentHtml = recent.length
          ? recent.map(miniIdea).join('')
          : empty('bulb', '还没有灵感', '文字、链接、照片都能收进来', true);

        setBody('overview',
          '<div class="stats">' +
            '<div class="card stat">' +
              '<div class="label">今日支出</div>' +
              '<div class="num"><small>¥</small>' + money(todayExpense) + '</div>' +
              '<div class="sub">共 ' + todayCount + ' 笔</div>' +
            '</div>' +
            '<div class="card stat income">' +
              '<div class="label">今日收入</div>' +
              '<div class="num"><small>¥</small>' + money(todayIncome) + '</div>' +
              '<div class="sub">' + (todayIncome > 0 ? '已入账' : '暂无') + '</div>' +
            '</div>' +
            '<div class="card stat' + (sum.net < 0 ? ' neg' : '') + '">' +
              '<div class="label">本月结余</div>' +
              '<div class="num">' + (sum.net < 0 ? '-' : '') + '<small>¥</small>' + money(Math.abs(sum.net)) + '</div>' +
              '<div class="sub">收入 ' + money(sum.income) + ' · 支出 ' + money(sum.expense) + '</div>' +
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
              '<div class="sum-row"><div class="sum-top"><span class="k">收入</span><span class="v in">¥' + money(sum.income) + '</span></div>' +
                '<div class="bar"><i class="in" style="width:' + (sum.income / maxFlow * 100) + '%"></i></div></div>' +
              '<div class="sum-row"><div class="sum-top"><span class="k">支出</span><span class="v">¥' + money(sum.expense) + '</span></div>' +
                '<div class="bar"><i class="ex" style="width:' + (sum.expense / maxFlow * 100) + '%"></i></div></div>' +
              '<div class="sum-row"><div class="sum-top"><span class="k">结余</span><span class="v">' + (sum.net < 0 ? '-' : '') + '¥' + money(Math.abs(sum.net)) + '</span></div></div>' +
              '<div class="top-cats">' +
                '<div class="tc-h">支出前三</div>' +
                topHtml +
              '</div>' +
            '</section>' +
            '<section class="card block">' +
              '<div class="block-head"><h2>最近灵感</h2><a href="#/ideas">全部</a></div>' +
              recentHtml +
            '</section>' +
          '</div>' +

          '<p class="foot-note">数据只保存在这台电脑的浏览器里，不会上传到任何服务器。</p>'
        );
      });
    }
  };

  /* ---------- 收支 ---------- */

  var moneyState = { month: null, type: 'expense', rows: [] };

  var TRASH = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 7h15"/><path d="M9.5 7V4.8h5V7"/><path d="M6.5 7l.9 12.1h9.2L17.5 7"/><path d="M10.4 10.6v5.6M13.6 10.6v5.6"/></svg>';

  function currentMonth() {
    if (!moneyState.month) moneyState.month = TW.Store.pref('month');
    return moneyState.month;
  }

  function amountText(r) {
    return (r.type === 'income' ? '+' : '-') + money(r.amountCents);
  }

  function txRow(r) {
    return '<div class="tx-row">' +
      '<span class="dot" style="background:' + (CAT_COLOR[r.category] || '#A9A9A2') + '"></span>' +
      '<div class="tx-main">' +
        '<div class="tx-cat">' + esc(r.category) + '</div>' +
        (r.note ? '<div class="tx-note">' + esc(r.note) + '</div>' : '') +
      '</div>' +
      '<div class="tx-amt' + (r.type === 'income' ? ' in' : '') + '">' + amountText(r) + '</div>' +
      '<button class="del" type="button" data-del-tx="' + esc(r.id) + '" title="删除这条" aria-label="删除这条">' + TRASH + '</button>' +
    '</div>';
  }

  function paintMoney(month, rows, sum, trend) {
    moneyState.rows = rows;

    setBody('money',
      moneyBar(month, sum) +
      '<div class="grid-charts">' +
        catSection(sum) +
        trendChart(trend, month) +
      '</div>' +
      listCard(rows)
    );
  }

  var ARROW_L = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
  var ARROW_R = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>';

  /* 百分比：整数，不足 1% 时给一位小数，避免一堆 0% */
  function pctText(pct) {
    var p = pct * 100;
    if (p > 0 && p < 1) return p.toFixed(1) + '%';
    return Math.round(p) + '%';
  }

  function moneyBar(month, sum) {
    return '<div class="card money-bar">' +
      '<div class="month-nav">' +
        '<button class="icon-btn" type="button" data-month="-1" aria-label="上个月" title="上个月">' + ARROW_L + '</button>' +
        '<span class="m">' + U.date.monthLabel(month) + '</span>' +
        '<button class="icon-btn" type="button" data-month="1" aria-label="下个月" title="下个月">' + ARROW_R + '</button>' +
      '</div>' +
      '<div class="money-totals">' +
        '<div class="money-tot"><div class="k">收入</div><div class="v in">' + money(sum.income) + '</div></div>' +
        '<div class="money-tot"><div class="k">支出</div><div class="v">' + money(sum.expense) + '</div></div>' +
        '<div class="money-tot"><div class="k">结余</div><div class="v' + (sum.net < 0 ? ' neg' : '') + '">' + money(sum.net) + '</div></div>' +
      '</div>' +
    '</div>';
  }

  /* 类别占比用 SVG 描边画环形，不引第三方图表库 */
  function donutChart(sum) {
    var size = 132;
    var stroke = 18;
    var radius = (size - stroke) / 2;
    var len = 2 * Math.PI * radius;
    var acc = 0;

    var segs = sum.byCategory.map(function (c) {
      var dash = c.cents / sum.expense * len;
      var color = CAT_COLOR[c.category] || '#A9A9A2';
      var seg = '<circle cx="' + (size / 2) + '" cy="' + (size / 2) + '" r="' + radius + '" fill="none" ' +
        'stroke="' + color + '" stroke-width="' + stroke + '" ' +
        'stroke-dasharray="' + dash.toFixed(2) + ' ' + (len - dash).toFixed(2) + '" ' +
        'stroke-dashoffset="' + (-acc).toFixed(2) + '"></circle>';
      acc += dash;
      return seg;
    }).join('');

    var legend = sum.byCategory.map(function (c) {
      return '<div class="legend-row">' +
        '<span class="legend-dot" style="background:' + (CAT_COLOR[c.category] || '#A9A9A2') + '"></span>' +
        '<span class="legend-name">' + esc(c.category) + '</span>' +
        '<span class="legend-val">¥' + money(c.cents) + '</span>' +
        '<span class="legend-pct">' + pctText(c.cents / sum.expense) + '</span>' +
      '</div>';
    }).join('');

    return '<section class="card block cat-block">' +
      '<div class="block-head"><h2>支出分类占比</h2></div>' +
      '<div class="cat-split">' +
        '<div class="donut">' +
          '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
            '<g transform="rotate(-90 ' + (size / 2) + ' ' + (size / 2) + ')">' + segs + '</g>' +
          '</svg>' +
          '<div class="donut-center"><span>支出合计</span><b>¥' + money(sum.expense) + '</b></div>' +
        '</div>' +
        '<div class="legend">' + legend + '</div>' +
      '</div>' +
    '</section>';
  }

  /* 支出为 0 时不画环，避免出现一个空心圆占着地方 */
  function catSection(sum) {
    if (!sum.expense) {
      return '<section class="card block cat-block">' +
        '<div class="block-head"><h2>支出分类占比</h2></div>' +
        '<div class="cat-empty">本月还没有支出记录</div>' +
      '</section>';
    }
    return donutChart(sum);
  }

  /* 柱子上方的数字。上万元用「万」，避免窄列里挤成一团 */
  function trendValue(cents) {
    if (!cents) return '0';
    if (cents >= 1000000) return (cents / 1000000).toFixed(1) + ' 万';
    return money(cents);
  }

  /* 六个月柱形，选中月用主色，其余用浅灰 */
  function trendChart(months, current) {
    var max = 0;
    months.forEach(function (m) {
      if (m.expense > max) max = m.expense;
    });

    var cols = months.map(function (m) {
      var on = m.month === current;
      var h = max ? Math.max(m.expense / max * 100, m.expense ? 3 : 0) : 0;
      return '<div class="trend-col">' +
        '<div class="trend-val">' + trendValue(m.expense) + '</div>' +
        '<div class="trend-track"><i class="' + (on ? 'on' : '') + '" style="height:' + h.toFixed(1) + '%"></i></div>' +
        '<div class="trend-m' + (on ? ' on' : '') + '">' + Number(m.month.slice(5)) + ' 月</div>' +
      '</div>';
    }).join('');

    return '<section class="card block trend-block">' +
      '<div class="block-head"><h2>近六个月支出趋势</h2></div>' +
      '<div class="trend">' + cols + '</div>' +
    '</section>';
  }

  function listCard(rows) {
    if (!rows.length) {
      return '<section class="card list-card">' +
        empty('receipt', '这个月还没有记录', '点右上角「记一笔」开始，记完会出现在这里') +
      '</section>';
    }

    var groups = {};
    rows.forEach(function (r) {
      (groups[r.date] = groups[r.date] || []).push(r);
    });

    var html = Object.keys(groups).sort().reverse().map(function (date) {
      var list = groups[date];
      var net = 0;
      list.forEach(function (r) {
        net += (r.type === 'income' ? 1 : -1) * r.amountCents;
      });
      return '<div>' +
        '<div class="day-head">' +
          '<span>' + U.date.dayLabel(date) + ' ' + U.date.weekday(date) + '</span>' +
          '<span class="dn">' + (net >= 0 ? '+' : '-') + money(Math.abs(net)) + '</span>' +
        '</div>' +
        list.map(txRow).join('') +
      '</div>';
    }).join('');

    return '<section class="card list-card">' + html + '</section>';
  }

  /* 连点月份箭头时，只让最后一次渲染落到界面上，避免旧结果盖掉新结果 */
  var moneyRenderSeq = 0;

  Views.money = {
    render: function () {
      var seq = ++moneyRenderSeq;
      var month = currentMonth();
      return Promise.all([
        TW.Store.money.listByMonth(month),
        TW.Store.money.summary(month),
        TW.Store.money.monthlyExpense(month, 6)
      ]).then(function (res) {
        if (seq !== moneyRenderSeq) return;
        paintMoney(month, res[0], res[1], res[2]);
      });
    }
  };

  function shiftMonthView(delta) {
    moneyState.month = U.date.shiftMonth(currentMonth(), Number(delta));
    TW.Store.setPref('month', moneyState.month);
    return Views.money.render();
  }

  /* 删除前先确认，确认框正文要写清删的是哪一笔 */
  function askDeleteMoney(id) {
    var row = null;
    for (var i = 0; i < moneyState.rows.length; i++) {
      if (moneyState.rows[i].id === id) {
        row = moneyState.rows[i];
        break;
      }
    }
    if (!row) return;

    var quote = U.date.dayLabel(row.date) + ' · ' + row.category + ' · ' + amountText(row);
    if (row.note) quote += ' · ' + row.note;

    UI.confirm({
      title: '删除这笔记录？',
      text: '这笔会从列表和统计里一起消失，找不回来。',
      quote: quote,
      okText: '删除',
      onOk: function () {
        return TW.Store.money.remove(id).then(function () {
          return Views.money.render();
        }).then(function () {
          UI.toast('已删除 · ' + row.category + ' ' + amountText(row));
        }, function (err) {
          /* 目标已经不在了就不打扰，按最新数据重画即可 */
          if (err && err.code === 'E_NOT_FOUND') return Views.money.render();
          UI.toast('删除失败，请重试');
        });
      }
    });
  }

  /* 金额输入框只留数字与一个小数点，最多两位小数。负号保留，交给保存时提示 */
  function sanitizeAmount(raw) {
    var v = String(raw).replace(/[^\d.\-]/g, '');
    var negative = v.charAt(0) === '-';
    v = v.replace(/-/g, '');
    var dot = v.indexOf('.');
    if (dot > -1) {
      v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, '');
    }
    var parts = v.split('.');
    if (parts[0].length > 7) parts[0] = parts[0].slice(0, 7);
    if (parts[1] && parts[1].length > 2) parts[1] = parts[1].slice(0, 2);
    return (negative ? '-' : '') + parts.join('.');
  }

  function setMoneyType(type) {
    moneyState.type = type === 'income' ? 'income' : 'expense';

    var seg = document.getElementById('f-type');
    var buttons = seg.querySelectorAll('[data-type]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].classList.toggle('on', buttons[i].getAttribute('data-type') === moneyState.type);
    }

    /* 切换类型时类别整体替换，默认选第一项 */
    var select = document.getElementById('f-cat');
    select.innerHTML = TW.Store.categories[moneyState.type].map(function (c) {
      return '<option value="' + esc(c) + '">' + esc(c) + '</option>';
    }).join('');
  }

  function openMoneyDialog() {
    var today = U.date.today();
    var date = document.getElementById('f-date');
    date.value = today;
    date.max = today;
    document.getElementById('f-amount').value = '';
    document.getElementById('f-note').value = '';

    UI.clearFieldErrors(document.getElementById('dlg-money'));
    setMoneyType('expense');
    UI.openDialog('dlg-money');
    setTimeout(function () {
      document.getElementById('f-amount').focus();
    }, 60);
  }

  function saveMoney() {
    var dialog = document.getElementById('dlg-money');
    UI.clearFieldErrors(dialog);

    var date = document.getElementById('f-date').value;
    var raw = document.getElementById('f-amount').value.trim();
    var category = document.getElementById('f-cat').value;
    var note = document.getElementById('f-note').value;
    var ok = true;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      UI.fieldError('fld-date', '请选择一个日期');
      ok = false;
    } else if (date > U.date.today()) {
      UI.fieldError('fld-date', '日期不能晚于今天');
      ok = false;
    }

    var cents = U.money.toCents(raw);
    if (!raw) {
      UI.fieldError('fld-amount', '请填写金额');
      ok = false;
    } else if (/^-/.test(raw) || cents === 0) {
      UI.fieldError('fld-amount', '金额必须大于 0');
      ok = false;
    } else if (!isFinite(cents)) {
      UI.fieldError('fld-amount', '请填写正确的金额，最多两位小数');
      ok = false;
    } else if (cents > TW.Store.amountMax) {
      UI.fieldError('fld-amount', '金额过大，最多一百万');
      ok = false;
    }

    if (!ok) return;

    var btn = document.getElementById('f-save');
    btn.disabled = true;

    TW.Store.money.create({
      date: date,
      type: moneyState.type,
      amountYuan: raw,
      category: category,
      note: note
    }).then(function (rec) {
      UI.closeDialog('dlg-money');
      /* 保存后切到该笔所属月份，保证用户看得到刚记的内容 */
      moneyState.month = rec.month;
      TW.Store.setPref('month', rec.month);
      return Views.money.render().then(function () {
        UI.toast('已记一笔 · ' + (rec.type === 'income' ? '收入 ' : '支出 ') + money(rec.amountCents));
      });
    }).catch(function (err) {
      var code = err && err.code;
      if (code === 'E_QUOTA') UI.fieldError('fld-amount', '存储空间已满，先去备份页导出再清理');
      else if (code === 'E_INVALID_INPUT') UI.fieldError('fld-amount', err.message);
      else UI.fieldError('fld-amount', '保存失败，请再试一次');
    }).then(function () {
      btn.disabled = false;
    });
  }

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

  var ideaRows = [];
  var ideaUrls = [];
  var ideaCurrentId = null;
  var ideaViewUrl = '';
  var ideaViewSeq = 0;
  var compose = { kind: 'text', file: null, previewUrl: '' };

  var KIND_META = {
    text: { title: '记一条灵感', tip: '想到什么写什么，回头找得到', holder: '写点什么' },
    link: { title: '存一个链接', tip: '粘贴网址，卡片上会显示网站名', holder: '这个链接讲的是什么' },
    image: { title: '存一张图片', tip: '保存时自动压到长边 1600，原图不保留', holder: '图片说明，可以不填' }
  };

  /* 缩略图是 Blob，转成对象地址给 img 用，换一批时整批释放 */
  function takeUrl(blob) {
    var url = global.URL.createObjectURL(blob);
    ideaUrls.push(url);
    return url;
  }

  function dropUrls() {
    for (var i = 0; i < ideaUrls.length; i++) global.URL.revokeObjectURL(ideaUrls[i]);
    ideaUrls = [];
  }

  function ideaChip(it) {
    if (it.kind === 'link') return '<span class="chip link">' + esc(domainOf(it.url)) + '</span>';
    if (it.kind === 'image') return '<span class="chip img">图片</span>';
    return '<span class="chip">文本</span>';
  }

  /* 概览的最近五条：图片给缩略图，文字与链接给类型图标 */
  function miniIdea(it) {
    var thumb = it.kind === 'image' && it.thumb
      ? '<div class="mini-thumb"><img alt="" src="' + takeUrl(it.thumb) + '"></div>'
      : '<div class="mini-thumb">' + icon(it.kind === 'link' ? 'link' : 'bulb', 15) + '</div>';

    var title = it.kind === 'link' ? domainOf(it.url) : (it.text || '图片');
    return '<div class="mini-idea" data-open-idea="' + esc(it.id) + '">' + thumb +
      '<div class="mini-body">' +
        '<div class="mini-title">' + esc(title) + '</div>' +
        '<div class="mini-meta">' + shortDate(it.createdAt) + ' · ' + KIND_NAME[it.kind] + '</div>' +
      '</div></div>';
  }

  function ideaCard(it) {
    var thumb = it.kind === 'image' && it.thumb
      ? '<div class="idea-thumb"><img alt="" src="' + takeUrl(it.thumb) + '"></div>'
      : '';

    return '<article class="card idea-card" data-open-idea="' + esc(it.id) + '">' + thumb +
      '<div class="idea-body">' +
        (it.text ? '<div class="idea-text">' + esc(it.text) + '</div>' : '') +
        '<div class="idea-meta">' + ideaChip(it) + '<span>' + shortDate(it.createdAt) + '</span></div>' +
      '</div></article>';
  }

  function paintIdeas(rows) {
    ideaRows = rows;
    dropUrls();
    setIdeaCount(rows.length);

    var sub = document.getElementById('idea-sub');
    if (sub) {
      sub.textContent = rows.length
        ? '文字、链接、图片，随手收进来，共 ' + rows.length + ' 条'
        : '文字、链接、图片，随手收进来';
    }

    if (!rows.length) {
      setBody('ideas', '<div class="card">' + empty('bulb', '还没有灵感', '点右上角的按钮，把第一个想法记下来') + '</div>');
      return;
    }

    setBody('ideas', '<div class="ideas-grid">' + rows.map(ideaCard).join('') + '</div>');
  }

  Views.ideas = {
    render: function () {
      return TW.Store.ideas.list().then(paintIdeas);
    }
  };

  /* ----- 录入弹层 ----- */

  function setComposeKind(kind) {
    compose.kind = KIND_META[kind] ? kind : 'text';
    var meta = KIND_META[compose.kind];

    var btns = document.getElementById('ni-kind').querySelectorAll('[data-kind]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('on', btns[i].getAttribute('data-kind') === compose.kind);
    }

    document.getElementById('ni-title').textContent = meta.title;
    document.getElementById('ni-tip').textContent = meta.tip;
    document.getElementById('ni-text').placeholder = meta.holder;
    document.getElementById('fld-ni-url').hidden = compose.kind !== 'link';
    document.getElementById('fld-ni-image').hidden = compose.kind !== 'image';
    document.querySelector('#fld-ni-text label').textContent = compose.kind === 'image' ? '说明（可不填）' : '内容';
  }

  function clearPreview() {
    if (compose.previewUrl) global.URL.revokeObjectURL(compose.previewUrl);
    compose.previewUrl = '';
    compose.file = null;

    var img = document.getElementById('ni-preview-img');
    if (img) img.removeAttribute('src');
    document.getElementById('ni-preview').hidden = true;
    document.getElementById('ni-pick').hidden = false;
    document.getElementById('ni-file').value = '';
  }

  function setPreview(file) {
    if (compose.previewUrl) global.URL.revokeObjectURL(compose.previewUrl);
    compose.file = file;
    compose.previewUrl = global.URL.createObjectURL(file);

    document.getElementById('ni-preview-img').src = compose.previewUrl;
    document.getElementById('ni-preview-name').textContent = file.name || '已选图片';
    document.getElementById('ni-preview-size').textContent = sizeText(file.size);
    document.getElementById('ni-pick').hidden = true;
    document.getElementById('ni-preview').hidden = false;
  }

  function openCompose(kind) {
    clearPreview();
    document.getElementById('ni-text').value = '';
    document.getElementById('ni-url').value = '';
    UI.clearFieldErrors(document.getElementById('dlg-idea-new'));
    setComposeKind(kind);
    UI.openDialog('dlg-idea-new');
    setTimeout(function () {
      document.getElementById('ni-text').focus();
    }, 60);
  }

  function saveIdea() {
    var dialog = document.getElementById('dlg-idea-new');
    UI.clearFieldErrors(dialog);

    var text = document.getElementById('ni-text').value;
    var url = document.getElementById('ni-url').value;
    var ok = true;

    if (compose.kind === 'image') {
      if (!compose.file) {
        UI.fieldError('fld-ni-image', '请选择一张图片');
        ok = false;
      }
    } else if (!text.trim()) {
      UI.fieldError('fld-ni-text', compose.kind === 'link' ? '写一句这个链接是什么' : '写点内容再保存');
      ok = false;
    }

    if (compose.kind === 'link' && !/^https?:\/\/\S+$/i.test(url.trim())) {
      UI.fieldError('fld-ni-url', '请输入完整网址，以 http 开头');
      ok = false;
    }

    if (!ok) return;

    var btn = document.getElementById('ni-save');
    btn.disabled = true;
    btn.textContent = compose.kind === 'image' ? '正在压缩…' : '保存';

    TW.Store.ideas.create({
      kind: compose.kind,
      text: text,
      url: url,
      file: compose.file
    }).then(function (rec) {
      UI.closeDialog('dlg-idea-new');
      return Views.ideas.render().then(function () {
        UI.toast('已收进来 · ' + KIND_NAME[rec.kind]);
      });
    }).catch(function (err) {
      var code = err && err.code;
      if (code === 'E_IMAGE_DECODE') UI.fieldError('fld-ni-image', '这张图片打不开，先转成 JPG 再试');
      else if (code === 'E_QUOTA') UI.fieldError('fld-ni-image', '存储空间已满，先去备份页导出再清理');
      else if (code === 'E_INVALID_INPUT') UI.fieldError('fld-' + (err.field === 'url' ? 'ni-url' : err.field === 'image' ? 'ni-image' : 'ni-text'), err.message);
      else UI.fieldError('fld-ni-text', '保存失败，请再试一次');
    }).then(function () {
      btn.disabled = false;
      btn.textContent = '保存';
    });
  }

  /* ----- 详情弹层 ----- */

  function findIdea(id) {
    for (var i = 0; i < ideaRows.length; i++) {
      if (ideaRows[i].id === id) return ideaRows[i];
    }
    return null;
  }

  function paintDetail(rec, readOnly) {
    ideaCurrentId = rec.id;

    document.getElementById('vi-title').textContent = KIND_NAME[rec.kind] + '灵感';
    var meta = fullLabel(rec.createdAt) + ' · ' + KIND_NAME[rec.kind];
    if (rec.kind === 'image' && rec.imageBytes) meta += ' ' + sizeText(rec.imageBytes);
    document.getElementById('vi-meta').textContent = meta;

    var text = document.getElementById('vi-text');
    text.textContent = rec.text || '';
    text.hidden = !rec.text;

    var link = document.getElementById('vi-link');
    if (rec.kind === 'link') {
      link.href = rec.url;
      link.textContent = rec.url;
      link.hidden = false;
    } else {
      link.hidden = true;
      link.removeAttribute('href');
    }

    var box = document.getElementById('vi-image');
    var img = document.getElementById('vi-img');
    var seq = ++ideaViewSeq;

    if (ideaViewUrl) {
      global.URL.revokeObjectURL(ideaViewUrl);
      ideaViewUrl = '';
    }
    img.removeAttribute('src');
    box.hidden = rec.kind !== 'image';

    /* 原图按需读取，列表里只放了缩略图 */
    if (rec.kind === 'image') {
      TW.Store.ideas.getImage(rec.imageId).then(function (blob) {
        if (!blob || seq !== ideaViewSeq) return;
        ideaViewUrl = global.URL.createObjectURL(blob);
        img.src = ideaViewUrl;
      });
    }

    /* 从概览页点进来的详情是只读的，不给删除入口 */
    document.getElementById('vi-del').hidden = !!readOnly;
    UI.openDialog('dlg-idea');
  }

  function openIdeaDetail(id, readOnly) {
    var rec = findIdea(id);
    if (rec) {
      paintDetail(rec, readOnly);
      return;
    }
    /* 列表可能已被别处改过，重读一次再开 */
    TW.Store.ideas.list().then(function (rows) {
      ideaRows = rows;
      var again = findIdea(id);
      if (again) paintDetail(again, readOnly);
    });
  }

  function askDeleteIdea() {
    var rec = findIdea(ideaCurrentId);
    UI.closeDialog('dlg-idea');
    if (!rec) return;

    var quote = rec.kind === 'image'
      ? '图片 · ' + fullLabel(rec.createdAt)
      : (rec.kind === 'link' ? domainOf(rec.url) + ' · ' : '') +
        rec.text.slice(0, 40) + (rec.text.length > 40 ? '…' : '');

    UI.confirm({
      title: '删除这条灵感？',
      text: rec.kind === 'image' ? '图片和文字会一起删掉，找不回来。' : '删掉之后就找不回来了。',
      quote: quote,
      okText: '删除',
      onOk: function () {
        return TW.Store.ideas.remove(rec.id).then(function () {
          return Views.ideas.render();
        }).then(function () {
          UI.toast('已删除');
        }, function (err) {
          if (err && err.code === 'E_NOT_FOUND') return Views.ideas.render();
          UI.toast('删除失败，请重试');
        });
      }
    });
  }

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

  /* ---------- 事件绑定 ---------- */
  /* 这些元素属于页面骨架，脚本在 body 末尾加载，绑定一次即可 */

  document.getElementById('money-add').addEventListener('click', openMoneyDialog);

  document.getElementById('f-type').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-type]');
    if (btn) setMoneyType(btn.getAttribute('data-type'));
  });

  document.getElementById('f-amount').addEventListener('input', function () {
    var clean = sanitizeAmount(this.value);
    if (clean !== this.value) this.value = clean;
    UI.clearFieldError('fld-amount');
  });

  document.getElementById('f-date').addEventListener('change', function () {
    UI.clearFieldError('fld-date');
  });

  document.getElementById('f-save').addEventListener('click', saveMoney);

  document.getElementById('view-money').addEventListener('click', function (e) {
    var del = e.target.closest('[data-del-tx]');
    if (del) {
      askDeleteMoney(del.getAttribute('data-del-tx'));
      return;
    }
    var nav = e.target.closest('[data-month]');
    if (nav) shiftMonthView(nav.getAttribute('data-month'));
  });

  /* 灵感页的三种形态入口与卡片都在同一个区块里，用一次委托处理 */
  document.getElementById('view-ideas').addEventListener('click', function (e) {
    var kindBtn = e.target.closest('[data-idea]');
    if (kindBtn) {
      openCompose(kindBtn.getAttribute('data-idea'));
      return;
    }
    var card = e.target.closest('[data-open-idea]');
    if (card) openIdeaDetail(card.getAttribute('data-open-idea'), false);
  });

  /* 概览点的最近灵感只能看，不能删 */
  document.getElementById('view-overview').addEventListener('click', function (e) {
    var item = e.target.closest('[data-open-idea]');
    if (item) openIdeaDetail(item.getAttribute('data-open-idea'), true);
  });

  document.getElementById('ni-kind').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-kind]');
    if (btn) setComposeKind(btn.getAttribute('data-kind'));
  });

  document.getElementById('ni-text').addEventListener('input', function () {
    UI.clearFieldError('fld-ni-text');
  });

  document.getElementById('ni-url').addEventListener('input', function () {
    UI.clearFieldError('fld-ni-url');
  });

  function pickFile() {
    document.getElementById('ni-file').click();
  }

  document.getElementById('ni-pick-btn').addEventListener('click', pickFile);
  document.getElementById('ni-pick-again').addEventListener('click', pickFile);

  document.getElementById('ni-file').addEventListener('change', function () {
    var file = this.files && this.files[0];
    if (!file) return;
    setPreview(file);
    UI.clearFieldError('fld-ni-image');
  });

  document.getElementById('ni-save').addEventListener('click', saveIdea);
  document.getElementById('vi-del').addEventListener('click', askDeleteIdea);

  document.getElementById('dlg-idea-new').addEventListener('close', clearPreview);

  document.getElementById('dlg-idea').addEventListener('close', function () {
    ideaViewSeq++;
    if (ideaViewUrl) {
      global.URL.revokeObjectURL(ideaViewUrl);
      ideaViewUrl = '';
    }
    document.getElementById('vi-img').removeAttribute('src');
    ideaCurrentId = null;
  });

  /* 弹层内的关闭按钮统一处理，写 data-close 指向要关的弹层 id */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-close]');
    if (btn) UI.closeDialog(btn.getAttribute('data-close'));
  });

})(window);
