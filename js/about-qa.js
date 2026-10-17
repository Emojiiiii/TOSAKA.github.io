
/*
 * TOSAKA Q&A
 * 匿名提问提交模块
 *
 * 通过 Cloudflare Worker 接收问题，
 * 验证结果由服务器处理。
 */

(() => {
  "use strict";

  const form = document.getElementById("qa-form");
  if (!form) return;

  const button = form.querySelector(
    'button[type="submit"]'
  );

  const status = document.getElementById(
    "qa-form-status"
  );

  function showStatus(message, state = "error") {
    status.textContent = message;
    status.dataset.state = state;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (button.disabled || !form.reportValidity()) {
      return;
    }

    // 确认 Turnstile 已生成验证令牌
    const token = form.querySelector(
      '[name="cf-turnstile-response"]'
    );

    if (!token || !token.value) {
      showStatus("请先完成人机验证，然后再提交。");
      return;
    }

    button.disabled = true;
    showStatus("正在提交问题……", "loading");

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(
            "验证失败或已过期，请重新验证。"
          );
        }

        if (response.status === 429) {
          throw new Error(
            "提交过于频繁，请稍后再试。"
          );
        }

        if (response.status === 503) {
          throw new Error(
            "提问服务暂时不可用，请稍后重试。"
          );
        }

        throw new Error(
          "提交失败，请检查内容后重试。"
        );
      }

      form.reset();

      showStatus(
        "提交成功！感谢你的提问，我会选择部分问题进行公开回答。",
        "success"
      );

    } catch (error) {
      showStatus(
        error instanceof Error
          ? error.message
          : "网络连接失败，请稍后重试。"
      );

    } finally {
      // Token 只能使用一次，需要重新生成
      if (window.turnstile) {
        window.turnstile.reset();
      }

      button.disabled = false;
    }
  });
})();
