
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


/* ==================================================
   TOSAKA / 公开 Q&A 自动加载
   从 Cloudflare D1 获取已经发布的问答
   ================================================== */

(() => {
  "use strict";

  const feed = document.getElementById("qa-public-feed");
  if (!feed) return;

  const API_URL =
    "https://tosaka-qa-api.lin-xinyuan.workers.dev/public/questions";

  // 创建安全的文本元素，避免 HTML 注入
  function makeElement(tag, className, content) {
    const element = document.createElement(tag);

    if (className) {
      element.className = className;
    }

    element.textContent = content ?? "";
    return element;
  }

  // 将数据库时间转换为 YYYY.MM.DD
  function formatDate(value) {
    if (typeof value !== "string") return "";

    const match = value.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

    if (!match) return "";

    return `${match[1]}.${match[2]}.${match[3]}`;
  }

  // 创建一条公开问答
  function createQuestion(item, index) {
    const article = document.createElement("article");
    article.className = "qa-entry";

    const meta = document.createElement("div");
    meta.className = "qa-entry-meta";

    const number = makeElement(
      "span",
      "",
      `Q${String(index + 1).padStart(2, "0")}`
    );

    const time = document.createElement("time");
    const date = formatDate(item.published_at);

    time.textContent = date;

    if (date) {
      time.dateTime = date.replace(/\./g, "-");
    }

    meta.append(number, time);

    const question = makeElement(
      "h3",
      "",
      item.question
    );

    const answer = makeElement(
      "p",
      "qa-answer",
      item.answer
    );

    // 保留回答中的手动换行
    answer.style.whiteSpace = "pre-line";

    article.append(meta, question, answer);

    return article;
  }

  async function loadPublicQuestions() {
    try {
      const response = await fetch(API_URL, {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("API request failed");
      }

      const data = await response.json();

      if (
        !data.success ||
        !Array.isArray(data.questions)
      ) {
        throw new Error("Invalid API response");
      }

      // 只显示包含完整问题与答案的记录
      const questions = data.questions.filter(item =>
        typeof item.question === "string" &&
        typeof item.answer === "string" &&
        item.question.trim() &&
        item.answer.trim()
      );

      feed.replaceChildren();

      if (questions.length === 0) {
        feed.appendChild(
          makeElement(
            "p",
            "qa-empty",
            "目前还没有公开的问答，欢迎留下第一个问题。"
          )
        );
        return;
      }

      questions.forEach((item, index) => {
        feed.appendChild(createQuestion(item, index));
      });

    } catch (error) {
      console.error("Q&A loading failed:", error);

      feed.replaceChildren(
        makeElement(
          "p",
          "qa-empty",
          "问答暂时无法加载，请稍后重试。"
        )
      );
    }
  }

  loadPublicQuestions();
})();

