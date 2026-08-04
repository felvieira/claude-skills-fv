// share.js — copy-to-clipboard for the LinkedIn share block. No deps.
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("button.copy-share");
  if (!btn) return;
  const block = btn.closest(".share-block");
  const text = block?.querySelector(".share-text")?.textContent?.trim();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for non-secure contexts / older browsers
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  const original = btn.dataset.label || btn.textContent;
  btn.dataset.label = original;
  btn.textContent = "✓ Copiado!";
  btn.classList.add("copied");
  setTimeout(() => {
    btn.textContent = original;
    btn.classList.remove("copied");
  }, 2000);
});
