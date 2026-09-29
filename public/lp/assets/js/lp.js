(function () {
  "use strict";

  // ----- モバイルナビ -----
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("nav");
  toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  nav.addEventListener("click", function (e) {
    if (e.target.tagName === "A") {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  // ----- スクロール表示アニメーション -----
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  // ----- 予約フォーム -----
  var form = document.getElementById("reserveForm");
  var done = document.getElementById("formDone");
  var topicsError = document.getElementById("topicsError");
  var formError = document.getElementById("formError");
  var planSelect = document.getElementById("plan");
  var date1 = document.getElementById("date1");
  var date2 = document.getElementById("date2");

  // 料金プランの「相談する」ボタンからプランを引き継ぐ
  document.querySelectorAll("[data-plan]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      planSelect.value = btn.getAttribute("data-plan");
    });
  });

  // 希望日時は翌日以降のみ選択可能にする
  var tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  var p = function (n) { return String(n).padStart(2, "0"); };
  var minValue = tomorrow.getFullYear() + "-" + p(tomorrow.getMonth() + 1) + "-" + p(tomorrow.getDate()) + "T09:00";
  date1.min = minValue;
  date2.min = minValue;

  function checkedValues(name) {
    return Array.prototype.map.call(
      form.querySelectorAll('input[name="' + name + '"]:checked'),
      function (el) { return el.value; }
    );
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var topics = checkedValues("topics");
    var topicsOk = topics.length > 0;
    topicsError.style.display = topicsOk ? "none" : "block";

    var valid = form.checkValidity() && topicsOk;
    formError.style.display = valid ? "none" : "block";
    if (!valid) {
      form.reportValidity();
      return;
    }

    var fd = new FormData(form);
    var record = window.ReservationStore.add({
      company: fd.get("company").trim(),
      name: fd.get("name").trim(),
      email: fd.get("email").trim(),
      tel: (fd.get("tel") || "").trim(),
      size: fd.get("size"),
      plan: fd.get("plan") || "",
      topics: topics,
      date1: fd.get("date1"),
      date2: fd.get("date2") || "",
      method: checkedValues("method")[0] || "",
      detail: (fd.get("detail") || "").trim(),
      source: "LP",
    });

    document.getElementById("doneId").textContent = record.id;
    form.style.display = "none";
    done.style.display = "block";
    form.reset();
  });

  document.getElementById("againBtn").addEventListener("click", function () {
    done.style.display = "none";
    form.style.display = "block";
  });
})();
