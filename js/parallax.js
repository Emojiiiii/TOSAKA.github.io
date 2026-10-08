
/* ==================================================
   parallax.js — 首页背景视差滚动模块
   ==================================================

   主要功能：

   1. 检测首页背景区域
   2. 根据滚动距离移动背景图片
   3. 自动适配电脑和手机
   4. 尊重用户的减少动画设置

   注意：
   本文件只负责视差滚动。
   不负责控制页面翻页。
   ================================================== */

// 获取首页背景区域
const parallaxHero = document.querySelector(
  ".parallax-hero"
);

// 检查用户是否希望减少动态效果
const parallaxReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
);

// 控制动画更新，减少重复计算
let parallaxTicking = false;

/*
  更新背景视差位置

  页面向下滚动时：
  背景跟随滚动产生缓慢位移。
*/
function updateParallax() {

  // 找不到首页则停止
  if (!parallaxHero) return;

  /*
    手机端关闭视差。

    原因：
    手机通常使用手指滑动，
    关闭背景位移能提高稳定性。
  */
  if (
    window.innerWidth <= 768 ||
    parallaxReducedMotion.matches
  ) {
    parallaxHero.style.setProperty(
      "--parallax-offset",
      "0px"
    );

    return;
  }

  // 获取首页相对于浏览器窗口的位置
  const rect = parallaxHero.getBoundingClientRect();

  /*
    计算背景位移。

    0.22 = 视差强度
    60 = 最大位移距离，单位 px

    想让背景移动更明显：
    可以适当增加 0.22。

    注意：
    最大位移不宜超过背景预留空间。
  */
  const offset = Math.max(
    -60,
    Math.min(60, -rect.top * 0.22)
  );

  // 将偏移值传递给 CSS
  parallaxHero.style.setProperty(
    "--parallax-offset",
    `${offset}px`
  );
}

/*
  监听网页滚动

  requestAnimationFrame：
  让浏览器在合适的时机更新动画，
  避免每次滚轮事件都直接修改样式。
*/
window.addEventListener("scroll", () => {

  if (parallaxTicking) return;

  parallaxTicking = true;

  requestAnimationFrame(() => {

    updateParallax();

    parallaxTicking = false;
  });

}, { passive: true });

/*
  当浏览器窗口大小变化时，
  重新计算背景位置。
*/
window.addEventListener(
  "resize",
  updateParallax
);

// 页面首次加载时初始化
updateParallax();
