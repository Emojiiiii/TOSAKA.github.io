/*
 * TOSAKA 首页 Portfolio 分类封面
 * 自动播放 / 左右箭头 / 手机左右滑动
 * 不改变卡片现有的 href 跳转逻辑
 */
(() => {
  "use strict";

  const INTERVAL = 4500;
  const SWIPE_DISTANCE = 45;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const hoverCapable = window.matchMedia("(hover: hover)");

  document.querySelectorAll(".portfolio-cover-carousel").forEach((carousel) => {
    const images = Array.from(carousel.querySelectorAll(".portfolio-cover-slide"));
    const link = carousel.closest("a.portfolio-card-link");
    const card = carousel.closest("article.card");

    // 无图或只有一张时，保留原样，不创建箭头。
    if (images.length < 2 || !link || !card) return;

    let current = images.findIndex((image) => image.classList.contains("is-active"));
    if (current < 0) current = 0;
    let timer;
    let touchStart = null;
    let suppressClickUntil = 0;

    const title = card.querySelector(".card-body h3")?.textContent.trim() || "作品";

    function preloadNeighbors() {
      [current, (current + 1) % images.length,
        (current - 1 + images.length) % images.length].forEach((index) => {
        images[index].loading = "eager";
      });
    }

    function scheduleNext() {
      window.clearTimeout(timer);
      // 减少动态效果：停止自动轮播，但仍允许主动翻页。
      if (reducedMotion.matches) return;

      timer = window.setTimeout(() => {
        const hovering = hoverCapable.matches && card.matches(":hover");
        const keyboardFocus = Boolean(card.querySelector(":focus-visible"));

        if (document.hidden || hovering || keyboardFocus) {
          scheduleNext();
          return;
        }

        showSlide(current + 1);
      }, INTERVAL);
    }

    function showSlide(index) {
      images[current].classList.remove("is-active");
      current = (index + images.length) % images.length;
      images[current].classList.add("is-active");
      preloadNeighbors();
      scheduleNext(); // 手动翻页后自动播放重新计时
    }

    // 按钮放在 <a> 之外，避免无效的“链接内嵌按钮”结构。
    const controls = document.createElement("div");
    controls.className = "portfolio-cover-controls";

    function createArrow(direction, symbol, label) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `portfolio-cover-arrow portfolio-cover-arrow-${direction}`;
      button.textContent = symbol;
      button.setAttribute("aria-label", `${title}：${label}`);
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        showSlide(current + (direction === "prev" ? -1 : 1));
      });
      return button;
    }

    controls.append(
      createArrow("prev", "‹", "上一张封面"),
      createArrow("next", "›", "下一张封面")
    );
    card.appendChild(controls);

    // 移动端：水平手势翻页，垂直手势仍然正常滚动网页。
    carousel.addEventListener("touchstart", (event) => {
      suppressClickUntil = 0;
      if (event.touches.length !== 1) {
        touchStart = null;
        return;
      }
      touchStart = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
    }, { passive: true });

    carousel.addEventListener("touchend", (event) => {
      const start = touchStart;
      touchStart = null;
      if (!start || event.changedTouches.length !== 1) return;

      const dx = event.changedTouches[0].clientX - start.x;
      const dy = event.changedTouches[0].clientY - start.y;

      if (Math.abs(dx) < SWIPE_DISTANCE ||
          Math.abs(dx) <= Math.abs(dy) * 1.25) return;

      // 只拦截确认成立的左右滑动，避免误打开作品分类。
      if (event.cancelable) event.preventDefault();
      suppressClickUntil = Date.now() + 650;
      showSlide(current + (dx < 0 ? 1 : -1));
    }, { passive: false });

    carousel.addEventListener("touchcancel", () => {
      touchStart = null;
    }, { passive: true });

    link.addEventListener("click", (event) => {
      if (Date.now() < suppressClickUntil) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);

    if (typeof reducedMotion.addEventListener === "function") {
      reducedMotion.addEventListener("change", scheduleNext);
    }

    preloadNeighbors();
    scheduleNext();
  });
})();
