/**
 * 予約フォームの送信モジュール。
 *
 * 予約は /api/reservations（Next.js の API）に送り、サーバー側で検証してから Supabase に保存します。
 * 受付番号もサーバーが発行して返します。ブラウザには何も保存しません。
 * 一覧・編集は管理画面（/admin/reservations）で行います。
 */
(function (global) {
  "use strict";

  var ENDPOINT = "/api/reservations";
  var TIMEOUT_MS = 15000;

  var MESSAGES = {
    failed: "送信に失敗しました。時間をおいて再度お試しください。",
    network: "通信エラーが発生しました。電波の良い場所で再度お試しください。",
    timeout: "通信がタイムアウトしました。時間をおいて再度お試しください。",
  };

  /**
   * 予約を送信し、受付番号を返す。
   * 失敗時は、画面にそのまま出せる日本語のメッセージを持った Error で reject する。
   */
  function submit(data) {
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, TIMEOUT_MS) : null;

    return fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: controller ? controller.signal : undefined,
    })
      .then(
        function (res) {
          return res
            .json()
            .catch(function () { return {}; })
            .then(function (body) {
              if (res.ok && body && body.receptionNo) return body.receptionNo;
              throw new Error((body && body.error) || MESSAGES.failed);
            });
        },
        function (err) {
          throw new Error(err && err.name === "AbortError" ? MESSAGES.timeout : MESSAGES.network);
        }
      )
      .finally(function () {
        if (timer) clearTimeout(timer);
      });
  }

  global.ReservationStore = { submit: submit };
})(window);
