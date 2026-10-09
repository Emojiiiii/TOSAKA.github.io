/* ==========================================
   Journal 正文图片路径修复

   功能：
   1. 自动处理 Markdown 正文图片路径
   2. 适配 GitHub Pages 子目录部署
   3. 不影响文章封面
========================================== */

document.addEventListener("DOMContentLoaded", () => {

  const images = document.querySelectorAll(".article-content img");

  // 从 HTML 读取网站基础路径
  const base = document.body.dataset.baseurl || "";

  images.forEach((img) => {

    const src = img.getAttribute("src");

    if (!src) return;

    // 忽略外部图片、Data URL 和特殊协议
    if (/^(https?:|data:|blob:|\/\/)/i.test(src)) return;

    // 已经包含基础路径，不重复添加
    if (base && (src === base || src.startsWith(base + "/"))) {
      return;
    }

    // 根目录形式：/images/journal/...
    if (src.startsWith("/")) {
      img.src = base + src;
      return;
    }

    // 相对路径形式：images/journal/...
    if (src.startsWith("images/")) {
      img.src = base + "/" + src;
    }

  });

});
