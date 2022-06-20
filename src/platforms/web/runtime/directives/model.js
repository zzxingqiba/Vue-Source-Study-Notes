const directive = {
  inserted(el, binding, vnode, oldVnode) {
    if (vnode.tag === "select") {
    } else if (vnode.tag === "textarea" || isTextInputType(el.type)) {
      el._vModifiers = binding.modifiers;
      if (!binding.modifiers.lazy) {
        el.addEventListener("compositionstart", onCompositionStart);
        el.addEventListener("compositionend", onCompositionEnd);
        // Safari < 10.2 & UIWebView doesn't fire compositionend when
        // switching focus before confirming composition choice
        // this also fixes the issue where some browsers e.g. iOS Chrome
        // fires "change" instead of "input" on autocomplete.
        el.addEventListener("change", onCompositionEnd);
      }
    }
  },
};

function onCompositionStart(e) {
  e.target.composing = true;
}

function onCompositionEnd(e) {
  // prevent triggering an input event for no reason
  if (!e.target.composing) return;
  e.target.composing = false;
  trigger(e.target, "input");
}

function trigger(el, type) {
  const e = document.createEvent("HTMLEvents");
  e.initEvent(type, true, true);
  el.dispatchEvent(e);
}

export default directive;
