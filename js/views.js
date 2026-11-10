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
        TW.Store.money.summary(month)
      ]).then(function (res) {
        var todayRows = res[0];
        var sum = res[1];

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
              empty('bulb', '还没有灵感', '文字、链接、照片都能收进来', true) +
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

  /* 弹层内的关闭按钮统一处理，写 data-close 指向要关的弹层 id */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-close]');
    if (btn) UI.closeDialog(btn.getAttribute('data-close'));
  });

})(window);
