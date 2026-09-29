(function () {
  "use strict";

  var Store = window.ReservationStore;
  var rowsEl = document.getElementById("rows");
  var emptyEl = document.getElementById("empty");
  var kpisEl = document.getElementById("kpis");
  var qEl = document.getElementById("q");
  var statusFilterEl = document.getElementById("statusFilter");
  var sortEl = document.getElementById("sort");

  Store.STATUSES.forEach(function (s) {
    var opt = document.createElement("option");
    opt.value = s.value;
    opt.textContent = s.label;
    statusFilterEl.appendChild(opt);
  });

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderKpis(list) {
    var html = '<div class="kpi"><div class="kpi__label">総予約数</div><div class="kpi__num">' + list.length + "</div></div>";
    Store.STATUSES.forEach(function (s) {
      var n = list.filter(function (r) { return r.status === s.value; }).length;
      html += '<div class="kpi"><div class="kpi__label"><span class="status status--' + s.value + '"></span>' + s.label + '</div><div class="kpi__num">' + n + "</div></div>";
    });
    kpisEl.innerHTML = html;
  }

  function filtered(list) {
    var q = qEl.value.trim().toLowerCase();
    var st = statusFilterEl.value;
    var out = list.filter(function (r) {
      if (st && r.status !== st) return false;
      if (!q) return true;
      var hay = [r.id, r.company, r.name, r.email, r.tel, r.detail, r.memo, r.owner, (r.topics || []).join(" ")].join(" ").toLowerCase();
      return hay.indexOf(q) !== -1;
    });
    var sort = sortEl.value;
    out.sort(function (a, b) {
      if (sort === "createdDesc") return String(b.createdAt).localeCompare(String(a.createdAt));
      if (sort === "createdAsc") return String(a.createdAt).localeCompare(String(b.createdAt));
      return String(a.date1 || "9999").localeCompare(String(b.date1 || "9999"));
    });
    return out;
  }

  function render() {
    var list = Store.load();
    renderKpis(list);
    var view = filtered(list);
    emptyEl.hidden = view.length > 0;

    rowsEl.innerHTML = view.map(function (r) {
      var statusOpts = Store.STATUSES.map(function (s) {
        return '<option value="' + s.value + '"' + (s.value === r.status ? " selected" : "") + ">" + s.label + "</option>";
      }).join("");
      var topics = (r.topics || []).map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("");
      return (
        '<tr data-id="' + esc(r.id) + '">' +
          '<td class="nowrap"><strong>' + esc(r.id) + "</strong></td>" +
          '<td class="nowrap">' + esc(Store.formatDate(r.createdAt)) + "</td>" +
          "<td><strong>" + esc(r.company) + "</strong><br />" + esc(r.name) + "</td>" +
          '<td><a href="mailto:' + esc(r.email) + '">' + esc(r.email) + "</a><br />" + esc(r.tel) + "</td>" +
          '<td class="nowrap">' + esc(r.size) + "<br />" + esc(r.plan || "未定") + "</td>" +
          "<td>" + topics + (r.detail ? '<div style="color:var(--muted);margin-top:4px;max-width:240px">' + esc(r.detail) + "</div>" : "") + "</td>" +
          '<td class="nowrap">①' + esc(Store.formatDate(r.date1)) + (r.date2 ? "<br />②" + esc(Store.formatDate(r.date2)) : "") + "</td>" +
          '<td class="method">' + esc(r.method) + "</td>" +
          '<td><span class="status status--' + esc(r.status) + '"></span><select class="select" data-field="status">' + statusOpts + "</select></td>" +
          '<td><input class="input memo" data-field="owner" placeholder="担当者" value="' + esc(r.owner) + '" style="margin-bottom:6px" />' +
              '<textarea class="textarea memo" data-field="memo" placeholder="社内メモ">' + esc(r.memo) + "</textarea></td>" +
          '<td><button class="icon-btn" data-action="delete" title="削除">🗑</button></td>' +
        "</tr>"
      );
    }).join("");
  }

  // インライン編集（ステータス・担当・メモ）
  rowsEl.addEventListener("change", function (e) {
    var field = e.target.getAttribute("data-field");
    if (!field) return;
    var id = e.target.closest("tr").getAttribute("data-id");
    var patch = {};
    patch[field] = e.target.value;
    Store.update(id, patch);
    if (field === "status") render();
    else renderKpis(Store.load());
  });

  rowsEl.addEventListener("click", function (e) {
    if (e.target.getAttribute("data-action") !== "delete") return;
    var id = e.target.closest("tr").getAttribute("data-id");
    if (confirm(id + " を削除しますか？")) {
      Store.remove(id);
      render();
    }
  });

  [qEl, statusFilterEl, sortEl].forEach(function (el) {
    el.addEventListener("input", render);
  });

  // CSV出力（Excelで文字化けしないようBOM付きUTF-8）
  document.getElementById("exportBtn").addEventListener("click", function () {
    var list = filtered(Store.load());
    var header = ["予約ID", "受付日時", "会社名", "担当者名", "メールアドレス", "電話番号", "従業員規模", "希望プラン", "相談カテゴリ", "第1希望日時", "第2希望日時", "相談方法", "自動化したい業務", "ステータス", "担当", "社内メモ"];
    var csvCell = function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; };
    var lines = [header.map(csvCell).join(",")].concat(list.map(function (r) {
      return [
        r.id, Store.formatDate(r.createdAt), r.company, r.name, r.email, r.tel, r.size, r.plan,
        (r.topics || []).join(" / "), Store.formatDate(r.date1), Store.formatDate(r.date2), r.method,
        r.detail, Store.statusLabel(r.status), r.owner, r.memo,
      ].map(csvCell).join(",");
    }));
    var blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "reservations_" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // サンプルデータ
  document.getElementById("sampleBtn").addEventListener("click", function () {
    var day = function (offset, h) {
      var d = new Date();
      d.setDate(d.getDate() + offset);
      d.setHours(h, 0, 0, 0);
      return d.toISOString();
    };
    [
      { company: "株式会社サンプル商事", name: "山田 太郎", email: "yamada@example.com", tel: "03-0000-0000", size: "11〜50名", plan: "スタンダード", topics: ["問い合わせ対応", "レポート自動生成"], date1: day(2, 14), date2: day(3, 10), method: "オンライン（Zoom / Google Meet）", detail: "問い合わせメールが1日50件以上あり、一次返信を自動化したい。" },
      { company: "有限会社テスト工務店", name: "佐藤 花子", email: "sato@example.com", tel: "090-0000-0000", size: "1〜10名", plan: "ライト", topics: ["書類処理・データ入力"], date1: day(4, 11), date2: "", method: "訪問（首都圏）", detail: "請求書の手入力をなくしたい。", status: "scheduled", owner: "鈴木" },
      { company: "デモ税理士法人", name: "高橋 一郎", email: "takahashi@example.com", tel: "", size: "11〜50名", plan: "", topics: ["社内ナレッジ検索", "AI研修"], date1: day(6, 16), date2: day(7, 16), method: "電話", detail: "", status: "contacted", owner: "田中" },
    ].forEach(function (r) { Store.add(Object.assign({ source: "sample" }, r), { localOnly: true }); });
    render();
  });

  document.getElementById("clearBtn").addEventListener("click", function () {
    if (confirm("すべての予約データを削除します。よろしいですか？（元に戻せません）")) {
      Store.save([]);
      render();
    }
  });

  // 別タブでLPから予約が入ったら自動更新
  window.addEventListener("storage", function (e) {
    if (e.key === Store.CONFIG.storageKey) render();
  });

  render();
})();
