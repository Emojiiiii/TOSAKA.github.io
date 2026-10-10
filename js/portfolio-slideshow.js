
/*
 * TOSAKA 首页作品封面自动播放
 * 每 4.5 秒切换一次
 * 只有至少两张封面时才轮播
 * 不改变卡片原有的点击跳转
 */
(() => {
  const cards = document.querySelectorAll(
    ".portfolio-cover-carousel"
  );

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  cards.forEach((card) => {
    const images = card.querySelectorAll(
      ".portfolio-cover-slide"
    );

    if (images.length < 2 || reduceMotion.matches) {
      return;
    }

    let current = 0;

    setInterval(() => {
      if (document.hidden || reduceMotion.matches) return;

      // 鼠标放在卡片上时暂停切换
      if (card.closest("a")?.matches(":hover, :focus-within")) {
        return;
      }

      images[current].classList.remove("is-active");

      current = (current + 1) % images.length;

      images[current].classList.add("is-active");
    }, 4500);
  });
})();

