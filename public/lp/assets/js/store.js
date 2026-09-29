/**
 * 予約データの保存・読み込みを行う共通モジュール。
 *
 * デフォルトではブラウザの localStorage に保存します（デモ・社内利用向け）。
 * 本番運用時は CONFIG.endpoint に Google Apps Script / Formspree 等の
 * 受信URLを設定すると、予約内容をそのURLへ POST します。
 */
(function (global) {
  "use strict";

  var CONFIG = {
    // 例: "https://script.google.com/macros/s/XXXXXXXX/exec"
    endpoint: "",
    storageKey: "tsumugi_reservations_v1",
  };

  var STATUSES = [
    { value: "new", label: "新規" },
    { value: "contacted", label: "連絡済" },
    { value: "scheduled", label: "日程確定" },
    { value: "done", label: "面談完了" },
    { value: "canceled", label: "キャンセル" },
  ];

  function load() {
    try {
      var raw = localStorage.getItem(CONFIG.storageKey);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function save(list) {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(list));
      return true;
    } catch (e) {
      return false;
    }
  }

  // 受付番号: R-YYMMDD-XXXX（別端末から同時に予約されても重複しにくい形式）
  function nextId(list) {
    var d = new Date();
    var p = function (n) { return String(n).padStart(2, "0"); };
    var date = String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate());
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var id;
    do {
      var rand = "";
      for (var i = 0; i < 4; i++) rand += chars[Math.floor(Math.random() * chars.length)];
      id = "R-" + date + "-" + rand;
    } while (list.some(function (r) { return r.id === id; }));
    return id;
  }

  function add(data, opts) {
    var list = load();
    var record = Object.assign(
      { id: nextId(list), createdAt: new Date().toISOString(), status: "new", owner: "", memo: "" },
      data
    );
    list.push(record);
    save(list);

    if (CONFIG.endpoint && !(opts && opts.localOnly)) {
      // 送信失敗してもローカルには残るので、ユーザー体験は止めない
      fetch(CONFIG.endpoint, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(record),
      }).catch(function () {});
    }
    return record;
  }

  function update(id, patch) {
    var list = load();
    var idx = list.findIndex(function (r) { return r.id === id; });
    if (idx === -1) return null;
    list[idx] = Object.assign({}, list[idx], patch, { updatedAt: new Date().toISOString() });
    save(list);
    return list[idx];
  }

  function remove(id) {
    save(load().filter(function (r) { return r.id !== id; }));
  }

  function statusLabel(value) {
    var s = STATUSES.find(function (x) { return x.value === value; });
    return s ? s.label : value;
  }

  function formatDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d)) return String(iso);
    var p = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  global.ReservationStore = {
    CONFIG: CONFIG,
    STATUSES: STATUSES,
    load: load,
    save: save,
    add: add,
    update: update,
    remove: remove,
    statusLabel: statusLabel,
    formatDate: formatDate,
  };
})(window);
