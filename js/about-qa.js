/* ==========================================================
   TOSAKA / 访客提问提交功能
   只向站长配置的 Formspree 表单提交，不公开到 GitHub。
   网络错误、表单额度限制等情况会给访客可读的提示。
   ========================================================== */
(() => {
  "use strict";

  const form = document.getElementById("qa-form");
  if (!form) return;

  const button = form.querySelector('button[type="submit"]');
  const status = document.getElementById("qa-form-status");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity() || button.disabled) return;

    status.textContent = "正在提交问题……";
    status.removeAttribute("data-state");
    button.disabled = true;

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" }
      });

      if (response.status === 429) {
        throw new Error("提交次数过多，请稍后再试。");
      }
      if (!response.ok) {
        throw new Error("提交失败，请稍后再试。");
      }

      form.reset();
      status.dataset.state = "success";
      status.textContent = "问题已提交！我会查看收到的提问，并选择部分进行公开回答。";
    } catch (error) {
      status.dataset.state = "error";
      status.textContent = error instanceof Error
        ? error.message
        : "网络连接异常，请稍后重试。";
    } finally {
      button.disabled = false;
    }
  });
})();
