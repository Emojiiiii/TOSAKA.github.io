/* =============================================================
   TOSAKA / 文章目录增强（无第三方库）
   - 将正文自动排成“侧栏目录 + 正文”
   - 只读取 Markdown 产生的 h2 标题
   - 标题为空时仍能阅读；手机端自动隐藏侧栏
   - 不更改 CMS 内容，不影响原来的图片 / 视频 / 代码功能
   ============================================================= */
(() => {
  "use strict";

  const article = document.querySelector(".article-main > .article-content");
  if (!article || !article.parentElement || article.closest(".editorial-reading")) return;

  // Portfolio 详情有 EDIT + CONTACT；Journal 详情原本没有。
  const isWork = Boolean(document.querySelector(".journal-nav .journal-edit"));
  document.body.classList.toggle("editorial-work", isWork);

  const wrapper = document.createElement("div");
  wrapper.className = "editorial-reading";

  const rail = document.createElement("aside");
  rail.className = "editorial-rail";
  rail.setAttribute("aria-label", "本文目录");

  const label = document.createElement("p");
  label.className = "editorial-rail-label";
  label.textContent = isWork ? "PROJECT SECTIONS" : "ON THIS PAGE";

  const toc = document.createElement("nav");
  toc.className = "editorial-toc";
  toc.setAttribute("aria-label", "跳转到文章章节");

  const headings = [...article.querySelectorAll("h2")]
    .filter(h => h.textContent.trim().length > 0);

  const links = [];
  headings.forEach((heading, index) => {
    // Jekyll/Kramdown 通常已经生成标题 ID；没有时安全地补一个。
    if (!heading.id) {
      let id = `tosaka-section-${index + 1}`;
      let suffix = 2;
      while (document.getElementById(id)) id = `tosaka-section-${index + 1}-${suffix++}`;
      heading.id = id;
    }
    const link = document.createElement("a");
    link.href = `#${encodeURIComponent(heading.id)}`;
    link.textContent = heading.textContent.trim();
    toc.appendChild(link);
    links.push(link);
  });

  article.parentNode.insertBefore(wrapper, article);
  wrapper.appendChild(rail);
  wrapper.appendChild(article);

  if (!headings.length) {
    rail.hidden = true;
    wrapper.classList.add("no-rail");
    return;
  }

  rail.appendChild(label);
  rail.appendChild(toc);
  links[0].setAttribute("aria-current", "location");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(item => item.isIntersecting);
      if (!visible.length) return;
      const index = headings.indexOf(visible[0].target);
      if (index < 0) return;
      links.forEach((link, i) => {
        if (i === index) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }, { rootMargin: "-10% 0px -70% 0px", threshold: 0 });
    headings.forEach(h => observer.observe(h));
  }
})();
