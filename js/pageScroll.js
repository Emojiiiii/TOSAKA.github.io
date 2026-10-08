
/* ==================================================
   pageScroll.js — 全屏翻页动画控制模块
   ==================================================

   功能：
   1. 鼠标滚轮切换主要页面
   2. 使用 2 秒缓入缓出动画
   3. Portfolio 和 Strengths 作为同一页
   4. About 内容过长时允许自然滚动
   5. Contact 不参与翻页动画
   6. 手机端保留自然滚动

   注意：
   本文件只负责页面滚动控制。
   首页背景视差由 parallax.js 负责。
   ================================================== */

(() => {
  "use strict";

  /* ---------- 01 动画参数 ---------- */

  // 翻页持续时间：2000 毫秒
  const PAGE_DURATION = 2000;

  // 小于这个滚动距离时忽略事件，减少误触
  const MIN_WHEEL_DELTA = 2;

  // 电脑端启用翻页的最小宽度
  const DESKTOP_MIN_WIDTH = 769;

  /* ---------- 02 获取页面元素 ---------- */

  // 只有三个主要页面参与动画
  const pages = [
    document.querySelector("#home"),
    document.querySelector("#projects"),
    document.querySelector("#about")
  ].filter(Boolean);

  // 顶部导航栏
  const navbar = document.querySelector(".navbar");

  // 检测系统是否要求减少动态效果
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  // 标记当前是否正在翻页
  let pageAnimating = false;

  /* ---------- 03 动画速度曲线 ---------- */

  /*
    easeInOutCubic：

    开始时缓慢加速，
    中间速度最快，
    结束时缓慢减速。

    让翻页更接近电影式转场。
  */
  function easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /* ---------- 04 计算页面位置 ---------- */

  function getPageTop(element) {

    // 获取导航栏实际高度
    const navHeight = navbar
      ? navbar.getBoundingClientRect().height
      : 0;

    // 获取章节在整个网页中的位置
    const top =
      element.getBoundingClientRect().top +
      window.scrollY;

    // 首页从顶部开始，其余章节避开导航栏
    const target = element.id === "home"
      ? 0
      : top - navHeight;

    // 防止滚动超过网页底部
    const maxScroll = Math.max(
      0,
      document.documentElement.scrollHeight -
      window.innerHeight
    );

    return Math.max(
      0,
      Math.min(target, maxScroll)
    );
  }

  /* ---------- 05 执行翻页动画 ---------- */

  function animatePageScroll(target) {

    // 记录动画起点
    const startY = window.scrollY;

    // 计算总移动距离
    const distance = target - startY;

    // 距离过小，不需要翻页
    if (Math.abs(distance) < 2) return;

    // 锁定动画，防止重复触发
    pageAnimating = true;

    // 动画起始时间
    let startTime = null;

    function animate(timestamp) {

      if (startTime === null) {
        startTime = timestamp;
      }

      // 已经过了多少毫秒
      const elapsed = timestamp - startTime;

      // 当前动画进度：0 到 1
      const progress = Math.min(
        elapsed / PAGE_DURATION,
        1
      );

      // 应用缓入缓出曲线
      const eased = easeInOutCubic(progress);

      // 更新网页滚动位置
      window.scrollTo({
        top: startY + distance * eased,
        behavior: "instant"
      });

      // 动画尚未结束，继续下一帧
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        pageAnimating = false;
      }
    }

    requestAnimationFrame(animate);
  }

  /* ---------- 06 鼠标滚轮控制 ---------- */

  window.addEventListener("wheel", (event) => {

    /*
      以下情况不拦截原生滚动：
      - 手机或窄屏幕
      - 用户开启减少动态效果
      - Ctrl + 滚轮缩放网页
      - 当前页面缺少必要章节
    */
    if (
      window.innerWidth < DESKTOP_MIN_WIDTH ||
      reducedMotion.matches ||
      event.ctrlKey ||
      pages.length < 2
    ) {
      return;
    }

    // 动画播放中，阻止再次滚动
    if (pageAnimating) {
      event.preventDefault();
      return;
    }

    // 忽略极小滚动和水平滚动
    if (
      Math.abs(event.deltaY) < MIN_WHEEL_DELTA ||
      Math.abs(event.deltaY) <= Math.abs(event.deltaX)
    ) {
      return;
    }

    const movingDown = event.deltaY > 0;
    const currentY = window.scrollY;

    // 获取各章节起始位置
    const positions = pages.map(getPageTop);

    // 判断用户当前所在的章节
    let currentIndex = 0;

    for (let i = 0; i < positions.length; i++) {
      if (currentY >= positions[i] - 5) {
        currentIndex = i;
      }
    }

    /* ---------- 向下翻页 ---------- */

    if (movingDown) {

      const nextIndex = currentIndex + 1;

      /*
        如果已经到达 About：
        不再触发整屏翻页，
        允许正常滚动到 Contact。
      */
      if (nextIndex >= pages.length) {
        return;
      }

      /*
        当前章节如果比一屏更长，
        先允许用户阅读剩余内容。
      */
      const readableBottom =
        positions[nextIndex] - window.innerHeight;

      if (currentY < readableBottom - 5) {
        return;
      }

      // 阻止浏览器原生滚动
      event.preventDefault();

      // 切换到下一屏
      animatePageScroll(positions[nextIndex]);
    }

    /* ---------- 向上翻页 ---------- */

    else {

      /*
        如果还没有回到本章节顶部，
        先允许自然向上滚动。
      */
      if (currentY > positions[currentIndex] + 5) {
        return;
      }

      // 已经是首页时不再向上翻
      if (currentIndex <= 0) return;

      event.preventDefault();

      // 切换到上一屏
      animatePageScroll(
        positions[currentIndex - 1]
      );
    }

  }, { passive: false });

})();
