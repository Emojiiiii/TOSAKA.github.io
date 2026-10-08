
/* ==========================================
   contact.js — Contact 弹窗控制模块

   功能：
   1. 点击 CONTACT 打开弹窗
   2. 点击 X 或遮罩关闭弹窗
   3. 按 Escape 关闭弹窗
   4. 关闭后恢复原来的浏览位置
   5. 管理键盘焦点
   ========================================== */

(() => {
  "use strict";

  const modal = document.querySelector("#contact-modal");
  const openButton = document.querySelector("#open-contact");
  const closeButton = document.querySelector("#close-contact");
  const overlay = document.querySelector("#contact-overlay");
  const panel = modal?.querySelector(".contact-panel");

  // 缺少相关元素时，不执行
  if (!modal || !openButton || !closeButton || !panel) return;

  // 记录打开弹窗前聚焦的元素
  let previousFocus = null;

  // 打开弹窗
  function openContact(event) {
    event?.preventDefault();

    previousFocus = document.activeElement;

    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");

    // 阻止背景滚动
    document.body.classList.add("contact-open");

    // 将键盘焦点移到关闭按钮
    closeButton.focus();
  }

  // 关闭弹窗
  function closeContact() {
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");

    // 恢复背景滚动
    document.body.classList.remove("contact-open");

    // 恢复之前的键盘焦点
    if (previousFocus instanceof HTMLElement) {
      previousFocus.focus({ preventScroll: true });
    }
  }

  // 监听打开按钮
  openButton.addEventListener("click", openContact);

  // 监听关闭按钮
  closeButton.addEventListener("click", closeContact);

  // 点击遮罩关闭
  overlay?.addEventListener("click", closeContact);

  // 键盘操作
  modal.addEventListener("keydown", (event) => {

    // Escape 关闭弹窗
    if (event.key === "Escape") {
      event.preventDefault();
      closeContact();
      return;
    }

    // Tab 键焦点限制在弹窗内部
    if (event.key === "Tab") {
      const focusable = [...modal.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )].filter(el => el.getClientRects().length > 0);

      if (!focusable.length) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
})();

