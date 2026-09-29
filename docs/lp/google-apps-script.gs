/**
 * テマカル 予約フォーム → Googleスプレッドシート 受信スクリプト
 *
 * 使い方:
 *  1. Googleスプレッドシートを新規作成し「拡張機能 > Apps Script」を開く
 *  2. このファイルの内容を貼り付けて保存
 *  3. NOTIFY_EMAIL を通知先のアドレスに変更
 *  4. 「デプロイ > 新しいデプロイ > ウェブアプリ」
 *     - 次のユーザーとして実行: 自分
 *     - アクセスできるユーザー: 全員
 *  5. 発行されたURLを public/lp/assets/js/store.js の CONFIG.endpoint に設定
 */

var SHEET_NAME = "予約リスト";
var NOTIFY_EMAIL = "temakaru48@gmail.com"; // 空文字にすると通知しない

var HEADERS = [
  "予約ID", "受付日時", "会社名", "担当者名", "メールアドレス", "電話番号",
  "従業員規模", "希望プラン", "相談カテゴリ", "第1希望日時", "第2希望日時",
  "相談方法", "自動化したい業務", "ステータス", "担当", "社内メモ", "流入元",
];

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#eef3ff");
    // ステータス列にプルダウンを設定
    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(["新規", "連絡済", "日程確定", "面談完了", "キャンセル"], true)
      .build();
    sheet.getRange(2, 14, 1000, 1).setDataValidation(rule);
  }
  return sheet;
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var r = JSON.parse(e.postData.contents);
    var sheet = getSheet_();
    // お客様の完了画面に表示した受付番号をそのまま使う
    var id = r.id || "R-" + ("000" + sheet.getLastRow()).slice(-4);

    sheet.appendRow([
      id,
      new Date(),
      r.company || "",
      r.name || "",
      r.email || "",
      r.tel || "",
      r.size || "",
      r.plan || "",
      (r.topics || []).join(" / "),
      r.date1 ? new Date(r.date1) : "",
      r.date2 ? new Date(r.date2) : "",
      r.method || "",
      r.detail || "",
      "新規",
      "",
      "",
      r.source || "LP",
    ]);

    if (NOTIFY_EMAIL) {
      MailApp.sendEmail(
        NOTIFY_EMAIL,
        "【新規予約】" + (r.company || "") + " " + (r.name || "") + " 様",
        [
          "無料相談の予約が入りました。",
          "",
          "予約ID: " + id,
          "会社名: " + r.company,
          "氏名: " + r.name,
          "メール: " + r.email,
          "電話: " + (r.tel || "-"),
          "規模: " + r.size,
          "相談内容: " + (r.topics || []).join(" / "),
          "第1希望: " + r.date1,
          "第2希望: " + (r.date2 || "-"),
          "方法: " + r.method,
          "",
          r.detail || "",
          "",
          SpreadsheetApp.getActiveSpreadsheet().getUrl(),
        ].join("\n")
      );
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: true, id: id }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
