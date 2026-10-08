
/* ==========================================
   main.js — 网站公共功能

   功能：
   1. 获取导航栏高度
   2. 将高度传递给 CSS
   3. 浏览器窗口变化时自动更新
   ========================================== */

// 获取网站顶部导航栏
const navbar = document.querySelector(".navbar");

/*
  自动计算导航栏高度

  为什么需要这个功能？

  因为桌面和手机的导航栏高度可能不同。
  我们通过 JavaScript 实时获取高度，
  避免首页与导航栏发生重叠。
*/
function updateNavbarHeight() {

  // 如果找不到导航栏，停止执行
  if (!navbar) return;

  // 获取导航栏当前的实际高度
  const height = navbar.getBoundingClientRect().height;

  // 将高度保存到 CSS 自定义变量
  document.documentElement.style.setProperty(
    "--portfolio-nav-height",
    `${height}px`
  );
}

// 浏览器窗口改变时重新计算高度
window.addEventListener("resize", updateNavbarHeight);

// 页面首次加载时执行
updateNavbarHeight();
