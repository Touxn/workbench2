/* ============================================================
   图寻工作台 启动与路由
   职责：hash 路由、视图切换、导航高亮、页面标题
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

  /* 从地址里取当前页面名。取不到或不在名单内时返回 null */
  function readRoute() {
    var raw = String(global.location.hash || '').replace(/^#\/?/, '');
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

  /* 只换页面名，不重算数据。渲染交给各视图自己 */
  function render(route) {
    show(route);
    global.scrollTo(0, 0);
  }

  /* 地址变化时统一入口。非法地址用 replace 改回默认页，不留历史记录 */
  function onRouteChange() {
    var route = readRoute();
    if (!route) {
      global.location.replace('#/' + DEFAULT_ROUTE);
      return;
    }
    render(route);
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

  onRouteChange();

})(window);
