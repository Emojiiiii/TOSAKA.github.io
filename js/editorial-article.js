/* =============================================================
   TOSAKA / Journal + Portfolio 自动文章目录 v2

   功能：
   1. 自动识别 h2/h3/h4 中以 YYYY.MM.DD、YYYY-MM-DD、
      YYYY/MM/DD 或 YYYY年MM月DD日 开头的日期标题。
   2. 含日期标题：左侧改为详细日期与对应主题，点击直达日期。
   3. 无日期标题：继续使用原有 h2 章节导航（兼容 Work）。
   4. 目录随滚动高亮当前位置，移动端保留原来的单栏布局。
   5. 不需要手动修改 Jekyll 模板或 CMS 配置。
   ============================================================= */
(() => {
  "use strict";

  const article = document.querySelector(".article-main > .article-content");
  if (!article || !article.parentElement || article.closest(".editorial-reading")) return;

  const isWork = Boolean(document.querySelector(".journal-nav .journal-edit"));
  document.body.classList.toggle("editorial-work", isWork);

  // 从标题前部识别“完整日期”，并验证日期是否真实存在。
  function parseDateHeading(title) {
    const text = title.replace(/\s+/g, " ").trim();
    const match = text.match(
      /^((?:19|20)\d{2})\s*(?:[./-]\s*|年\s*)(0?[1-9]|1[0-2])\s*(?:[./-]\s*|月\s*)(0?[1-9]|[12]\d|3[01])\s*(?:日)?(?=$|[\s|｜:：—–-])/
    );
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const check = new Date(Date.UTC(year, month - 1, day));
    if (check.getUTCFullYear() !== year ||
        check.getUTCMonth() !== month - 1 ||
        check.getUTCDate() !== day) return null;

    const pad = n => String(n).padStart(2, "0");
    const date = `${year}.${pad(month)}.${pad(day)}`;
    const subject = text.slice(match[0].length)
      .replace(/^[\s|｜:：—–-]+/, "")
      .trim();

    return { date, subject };
  }

  const allHeadings = Array.from(article.querySelectorAll("h2, h3, h4"));
  const dated = allHeadings
    .map(heading => ({ heading, detail: parseDateHeading(heading.textContent) }))
    .filter(item => item.detail !== null);

  // 文章有日期时只列日期；否则沿用以前的二级标题目录。
  const hasDates = dated.length > 0;
  const entries = hasDates
    ? dated
    : allHeadings.filter(h => h.tagName === "H2" && h.textContent.trim())
        .map(heading => ({ heading, detail: null }));

  const wrapper = document.createElement("div");
  wrapper.className = "editorial-reading";

  const rail = document.createElement("aside");
  rail.className = "editorial-rail";
  rail.setAttribute("aria-label", hasDates ? "按开发日期跳转" : "本文目录");

  const label = document.createElement("p");
  label.className = "editorial-rail-label";
  label.textContent = hasDates ? "DEVELOPMENT LOG" :
    (isWork ? "PROJECT SECTIONS" : "ON THIS PAGE");

  const toc = document.createElement("nav");
  toc.className = "editorial-toc";
  toc.setAttribute("aria-label", hasDates ? "开发日期列表" : "跳转到文章章节");

  const links = [];
  entries.forEach(({ heading, detail }, index) => {
    // Kramdown 通常会给标题生成 id；只有缺少 id 时才补充。
    if (!heading.id) {
      const base = `tosaka-section-${index + 1}`;
      let id = base;
      let suffix = 2;
      while (document.getElementById(id)) id = `${base}-${suffix++}`;
      heading.id = id;
    }

    const link = document.createElement("a");
    link.href = `#${encodeURIComponent(heading.id)}`;

    if (detail) {
      link.classList.add("editorial-toc-date");
      // 使用原生 strong / small 元素，旧版 CSS 下也能正确分行。
      const dateText = document.createElement("strong");
      dateText.textContent = detail.date;
      link.appendChild(dateText);
      if (detail.subject) {
        link.appendChild(document.createElement("br"));
        const subjectText = document.createElement("small");
        subjectText.textContent = detail.subject;
        link.appendChild(subjectText);
      }
      link.setAttribute("aria-label", `${detail.date}${detail.subject ? "，" + detail.subject : ""}`);
    } else {
      link.textContent = heading.textContent.trim();
    }

    link.addEventListener("click", () => setActive(index));
    toc.appendChild(link);
    links.push(link);
  });

  article.parentNode.insertBefore(wrapper, article);
  wrapper.appendChild(rail);
  wrapper.appendChild(article);

  if (!entries.length) {
    rail.hidden = true;
    wrapper.classList.add("no-rail");
    return;
  }

  rail.appendChild(label);
  rail.appendChild(toc);

  let previousActive = -1;
  function setActive(index) {
    if (index === previousActive) return;
    previousActive = index;
    links.forEach((link, i) => {
      if (i === index) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });

    // 日期很多时，左侧目录内部自动滚动到选中条目。
    // 小屏幕目录被隐藏，不需要调整。
    if (window.matchMedia("(min-width: 901px)").matches) {
      const rect = links[index].getBoundingClientRect();
      const area = rail.getBoundingClientRect();
      if (rect.top < area.top + 8) rail.scrollTop -= area.top + 8 - rect.top;
      else if (rect.bottom > area.bottom - 8) rail.scrollTop += rect.bottom - area.bottom + 8;
    }
  }

  function updateActive() {
    // 根据当前可视区顶部最近经过的标题来确定高亮日期。
    const threshold = Math.min(180, Math.max(110, window.innerHeight * 0.22));
    let active = 0;
    entries.forEach(({ heading }, i) => {
      if (heading.getBoundingClientRect().top <= threshold) active = i;
    });
    const scrollEnd = window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 4;
    if (scrollEnd) active = entries.length - 1;
    setActive(active);
  }

  let queued = false;
  function scheduleUpdate() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(() => {
      queued = false;
      updateActive();
    });
  }

  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  window.addEventListener("hashchange", scheduleUpdate);
  scheduleUpdate();
})();
