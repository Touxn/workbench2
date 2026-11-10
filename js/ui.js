/* ============================================================
   图寻工作台 界面辅助
   常驻提示条、整页说明。弹层与轻提示随对应功能补入
   ============================================================ */
(function (global) {
  'use strict';

  var TW = global.TW = global.TW || {};

  var host = null;

  /* 提示条占掉的高度，交给样式表调整侧栏，避免侧栏底部被挤出可视区 */
  function syncBannerHeight() {
    var h = host ? host.offsetHeight : 0;
    document.body.style.setProperty('--banner-h', h + 'px');
  }

  function bannerHost() {
    if (!host || !document.body.contains(host)) {
      host = document.createElement('div');
      host.className = 'banners';
      document.body.insertBefore(host, document.body.firstChild);
    }
    return host;
  }

  /* 同一 id 只保留一条，重复调用只更新文字 */
  function banner(id, text) {
    var el = document.getElementById('banner-' + id);
    if (!el) {
      el = document.createElement('div');
      el.id = 'banner-' + id;
      el.className = 'banner';
      el.setAttribute('role', 'status');
      bannerHost().appendChild(el);
    }
    el.textContent = text;
    syncBannerHeight();
  }

  function clearBanner(id) {
    var el = document.getElementById('banner-' + id);
    if (el) el.remove();
    if (host && !host.children.length) syncBannerHeight();
  }

  /* 环境根本不支持时的整页说明，不留一个点不动的假界面 */
  function fatal(title, text) {
    document.body.innerHTML = '';
    var page = document.createElement('div');
    page.className = 'fatal';

    var card = document.createElement('div');
    card.className = 'fatal-card';

    var h = document.createElement('h1');
    h.textContent = title;

    var p = document.createElement('p');
    p.textContent = text;

    card.appendChild(h);
    card.appendChild(p);
    page.appendChild(card);
    document.body.appendChild(page);
  }

  /* 轻提示：屏幕下方居中的一行黑底白字，两秒自动消失 */
  var toastEl = null;
  var toastTimer = 0;

  function toast(text) {
    if (!toastEl || !document.body.contains(toastEl)) {
      toastEl = document.createElement('div');
      toastEl.id = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = text;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('show');
    }, 2000);
  }

  function openDialog(id) {
    var d = document.getElementById(id);
    if (!d) return;
    if (typeof d.showModal === 'function') {
      if (!d.open) d.showModal();
    } else {
      d.setAttribute('open', '');
    }
  }

  function closeDialog(id) {
    var d = document.getElementById(id);
    if (!d) return;
    if (typeof d.close === 'function' && d.open) {
      d.close();
    } else {
      d.removeAttribute('open');
    }
  }

  /* 字段级错误：给 .field 加 invalid，错误文字写在里面的 .err */
  function fieldError(fieldId, message) {
    var field = document.getElementById(fieldId);
    if (!field) return;
    field.classList.add('invalid');
    var err = field.querySelector('.err');
    if (err && message) err.textContent = message;
  }

  function clearFieldError(fieldId) {
    var field = document.getElementById(fieldId);
    if (field) field.classList.remove('invalid');
  }

  function clearFieldErrors(scope) {
    var box = scope || document;
    var fields = box.querySelectorAll('.field.invalid');
    for (var i = 0; i < fields.length; i++) fields[i].classList.remove('invalid');
  }

  /* 二次确认：正文写清要删什么，按钮写「删除」，不写「确定」 */
  var confirmAction = null;

  function confirmBox(opts) {
    var o = opts || {};
    document.getElementById('cf-title').textContent = o.title || '确定要删除吗？';
    document.getElementById('cf-text').textContent = o.text || '删掉之后就找不回来了。';

    var quote = document.getElementById('cf-quote');
    quote.textContent = o.quote || '';
    quote.hidden = !o.quote;

    var ok = document.getElementById('cf-ok');
    ok.textContent = o.okText || '删除';
    ok.disabled = false;

    confirmAction = typeof o.onOk === 'function' ? o.onOk : null;
    openDialog('dlg-confirm');
  }

  function bindConfirm() {
    var ok = document.getElementById('cf-ok');
    if (!ok) return;
    ok.addEventListener('click', function () {
      var action = confirmAction;
      if (!action) {
        closeDialog('dlg-confirm');
        return;
      }
      ok.disabled = true;
      Promise.resolve().then(action).catch(function (err) {
        if (global.console) global.console.error('确认操作失败', err);
      }).then(function () {
        ok.disabled = false;
        confirmAction = null;
        closeDialog('dlg-confirm');
      });
    });
  }

  TW.UI = {
    banner: banner,
    clearBanner: clearBanner,
    fatal: fatal,
    toast: toast,
    confirm: confirmBox,
    openDialog: openDialog,
    closeDialog: closeDialog,
    fieldError: fieldError,
    clearFieldError: clearFieldError,
    clearFieldErrors: clearFieldErrors
  };

  bindConfirm();

  /* 窗口变化时提示条可能换行，高度要跟着重算 */
  global.addEventListener('resize', function () {
    if (host) syncBannerHeight();
  });

})(window);
