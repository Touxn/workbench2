/* ============================================================
   图寻工作台 启动与路由
   职责：环境自检、存储初始化、hash 路由、视图切换、导航高亮
   ============================================================ */
(function (global) {
  'use strict';

  var TW = global.TW = global.TW || {};

  var ROUTES = ['overview', 'money', 'todos', 'ideas', 'backup'];
  var DEFAULT_ROUTE = 'overview';

  var TITLES = {
    overview: '概览',
    money: '收支',
    todos: '待办',
    ideas: '灵感',
    backup: '备份'
  };

  var nav = document.getElementById('nav');
  var views = {};

  ROUTES.forEach(function (name) {
    views[name] = document.getElementById('view-' + name);
  });

  function rawHash() {
    return String(global.location.hash || '').replace(/^#\/?/, '');
  }

  /* 取当前页面名。地址为空或不在名单内时返回 null */
  function readRoute() {
    var raw = rawHash();
    return ROUTES.indexOf(raw) > -1 ? raw : null;
  }

  function setActiveNav(route) {
    var items = nav.querySelectorAll('[data-route]');
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var on = item.getAttribute('data-route') === route;
      item.classList.toggle('active', on);
      if (on) {
        item.setAttribute('aria-current', 'page');
      } else {
        item.removeAttribute('aria-current');
      }
    }
  }

  function show(route) {
    ROUTES.forEach(function (name) {
      views[name].hidden = name !== route;
    });
    setActiveNav(route);
    document.title = TITLES[route] + ' · 图寻工作台';
  }

  /* 只换页面名并让对应视图重绘。视图可以是同步也可以是异步的 */
  function render(route) {
    show(route);
    global.scrollTo(0, 0);

    var view = TW.Views && TW.Views[route];
    if (!view || typeof view.render !== 'function') return;

    Promise.resolve().then(function () {
      return view.render();
    }).then(function () {
      TW.UI.clearBanner('view');
    }).catch(function (err) {
      /* 单个视图出错不该拖垮整页，顶部给一条可读的提示 */
      if (global.console) global.console.error('视图渲染失败：' + route, err);
      TW.UI.banner('view', '这个页面显示出了点问题，刷新页面试试。');
    });
  }

  /* 地址变化时统一入口。非法地址用 replace 改回默认页，不留历史记录 */
  function onRouteChange() {
    var route = readRoute();
    if (!route) {
      global.location.replace('#/' + DEFAULT_ROUTE);
      return;
    }
    render(route);
    TW.Store.setPref('route', route);
  }

  /* 导航点击：只改地址，由 hashchange 统一处理，避免两套逻辑 */
  nav.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-route]');
    if (!btn || !nav.contains(btn)) return;
    var route = btn.getAttribute('data-route');
    if (readRoute() === route) return;
    global.location.hash = '#/' + route;
  });

  global.addEventListener('hashchange', onRouteChange);

  /* 环境自检，通过后进路由。任一步失败都先把原因说清楚，不留白屏 */
  function boot() {
    if (!global.indexedDB) {
      TW.UI.fatal(
        '这个浏览器打不开工作台',
        '当前浏览器不支持本地存储能力，工作台的数据没地方放。请换用新版本的 Chrome、Edge 或 Safari 再打开。'
      );
      return;
    }

    var isFile = global.location.protocol === 'file:';
    if (isFile) {
      TW.UI.banner(
        'protocol',
        '当前是用文件方式打开的，数据不会出现在这里。请先双击 start.command，再打开 http://127.0.0.1:8765/'
      );
    }

    TW.Store.init().then(function () {
      /* 首次打开没有地址时，回到上次停留的页面 */
      if (rawHash() === '') {
        var last = TW.Store.pref('route');
        global.location.replace('#/' + (ROUTES.indexOf(last) > -1 ? last : DEFAULT_ROUTE));
        return;
      }
      onRouteChange();
    }).catch(function (err) {
      /* 文件方式打开时数据库必然不可用，上面的提示已经说明原因，不重复报错 */
      if (!isFile) {
        TW.UI.banner(
          'storage',
          err && err.code === 'E_DB_OPEN'
            ? '浏览器存储不可用，记录保存不了。请关闭无痕模式或允许本站保存数据后刷新。'
            : '本地数据读取失败，刷新页面试试。'
        );
      }
      onRouteChange();
    });
  }

  TW.App = {
    routes: ROUTES,
    readRoute: readRoute,
    render: render,
    go: function (route) {
      if (ROUTES.indexOf(route) === -1) return;
      if (readRoute() === route) {
        render(route);
        return;
      }
      global.location.hash = '#/' + route;
    }
  };

  boot();

})(window);
