/* ============================================================
   图寻工作台 存储适配层
   只封装 IndexedDB 的连接与通用读写，不认识业务字段
   失败时抛出带 code 的 Error，由上层决定怎么呈现
   ============================================================ */
(function (global) {
  'use strict';

  var TW = global.TW = global.TW || {};

  var DB_NAME = 'tuxun_workbench';
  var DB_VERSION = 1;
  var STORES = ['transactions', 'todos', 'ideas', 'ideaImages'];

  var conn = null;
  var opening = null;

  function makeError(code, message) {
    var err = new Error(message || code);
    err.code = code;
    return err;
  }

  function mapError(raw, fallback) {
    if (!raw) return makeError(fallback);
    if (raw.name === 'QuotaExceededError') return makeError('E_QUOTA', '存储空间已满');
    return makeError(fallback, raw.message);
  }

  /* 建表。后续加字段时在 switch 末尾追加 case，不改动已有分支 */
  function upgrade(db, oldVersion) {
    switch (oldVersion) {
      case 0: {
        var tx = db.createObjectStore('transactions', { keyPath: 'id' });
        tx.createIndex('by_month', 'month');
        tx.createIndex('by_date', 'date');
        tx.createIndex('by_created', 'createdAt');

        var todo = db.createObjectStore('todos', { keyPath: 'id' });
        todo.createIndex('by_due', 'dueDate');
        todo.createIndex('by_created', 'createdAt');

        var idea = db.createObjectStore('ideas', { keyPath: 'id' });
        idea.createIndex('by_created', 'createdAt');
        idea.createIndex('by_kind', 'kind');

        db.createObjectStore('ideaImages', { keyPath: 'id' });
        break;
      }
    }
  }

  function open() {
    if (conn) return Promise.resolve(conn);
    if (opening) return opening;

    opening = new Promise(function (resolve, reject) {
      var req;
      try {
        req = global.indexedDB.open(DB_NAME, DB_VERSION);
      } catch (e) {
        opening = null;
        reject(makeError('E_DB_OPEN', '打不开本地数据库'));
        return;
      }

      req.onupgradeneeded = function (e) {
        upgrade(req.result, e.oldVersion);
      };

      req.onsuccess = function () {
        var db = req.result;
        /* 别的标签页要升级版本时让出连接，避免升级被阻塞 */
        db.onversionchange = function () {
          try { db.close(); } catch (e) { /* 忽略 */ }
          conn = null;
          opening = null;
        };
        conn = db;
        opening = null;
        resolve(db);
      };

      req.onerror = function () {
        opening = null;
        reject(mapError(req.error, 'E_DB_OPEN'));
      };

      /* 同一时刻只保证单标签页使用，被阻塞时不额外处理 */
      req.onblocked = function () {};
    });

    return opening;
  }

  function request(req) {
    return new Promise(function (resolve, reject) {
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(mapError(req.error, 'E_DB_WRITE')); };
    });
  }

  /* 跨仓库事务的唯一入口。回调返回请求或普通值，事务提交后才算成功 */
  function run(storeNames, mode, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx;
        try {
          tx = db.transaction(storeNames, mode);
        } catch (e) {
          reject(mapError(e, 'E_DB_WRITE'));
          return;
        }

        var out;
        try {
          out = fn(tx);
        } catch (e) {
          try { tx.abort(); } catch (ignore) { /* 忽略 */ }
          reject(mapError(e, 'E_DB_WRITE'));
          return;
        }

        tx.oncomplete = function () {
          Promise.resolve(out).then(resolve, reject);
        };
        tx.onerror = function () {
          reject(mapError(tx.error, 'E_DB_WRITE'));
        };
        tx.onabort = function () {
          reject(mapError(tx.error, 'E_DB_WRITE'));
        };
      });
    });
  }

  function get(store, key) {
    return run([store], 'readonly', function (tx) {
      return request(tx.objectStore(store).get(key));
    }).then(function (value) {
      /* IndexedDB 查不到时给的是 undefined，统一成 null，调用方只需判空一次 */
      return value === undefined ? null : value;
    });
  }

  function getAll(store) {
    return run([store], 'readonly', function (tx) {
      return request(tx.objectStore(store).getAll());
    });
  }

  function byIndex(store, index, range) {
    return run([store], 'readonly', function (tx) {
      var idx = tx.objectStore(store).index(index);
      return request(range ? idx.getAll(range) : idx.getAll());
    });
  }

  function put(store, value) {
    return run([store], 'readwrite', function (tx) {
      return request(tx.objectStore(store).put(value));
    });
  }

  function putMany(store, values) {
    return run([store], 'readwrite', function (tx) {
      var os = tx.objectStore(store);
      for (var i = 0; i < values.length; i++) os.put(values[i]);
      return values.length;
    });
  }

  function remove(store, key) {
    return run([store], 'readwrite', function (tx) {
      return request(tx.objectStore(store).delete(key));
    });
  }

  function clear(store) {
    return run([store], 'readwrite', function (tx) {
      return request(tx.objectStore(store).clear());
    });
  }

  TW.DB = {
    stores: STORES,
    open: open,
    run: run,
    get: get,
    getAll: getAll,
    byIndex: byIndex,
    put: put,
    putMany: putMany,
    remove: remove,
    clear: clear
  };

})(window);
