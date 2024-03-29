/* @flow */

import { getStyle, normalizeStyleBinding } from "../../../web/util/style";
import {
  cached,
  camelize,
  extend,
  isDef,
  isUndef,
  hyphenate,
} from "../../../../shared/util";

const cssVarRE = /^--/;
const importantRE = /\s*!important$/;
const setProp = (el, name, val) => {
  /* istanbul ignore if */
  if (cssVarRE.test(name)) {
    el.style.setProperty(name, val);
  } else if (importantRE.test(val)) {
    el.style.setProperty(
      hyphenate(name),
      val.replace(importantRE, ""),
      "important"
    );
  } else {
    const normalizedName = normalize(name);
    if (Array.isArray(val)) {
      // Support values array created by autoprefixer, e.g.
      // {display: ["-webkit-box", "-ms-flexbox", "flex"]}
      // Set them one by one, and the browser will only set those it can recognize
      for (let i = 0, len = val.length; i < len; i++) {
        el.style[normalizedName] = val[i];
      }
    } else {
      el.style[normalizedName] = val;
    }
  }
};

const vendorNames = ["Webkit", "Moz", "ms"];

let emptyStyle;
const normalize = cached(function (prop) {
  emptyStyle = emptyStyle || document.createElement("div").style;
  prop = camelize(prop);
  if (prop !== "filter" && prop in emptyStyle) {
    return prop;
  }
  const capName = prop.charAt(0).toUpperCase() + prop.slice(1);
  for (let i = 0; i < vendorNames.length; i++) {
    const name = vendorNames[i] + capName;
    if (name in emptyStyle) {
      return name;
    }
  }
});

function updateStyle(oldVnode, vnode) {
  const data = vnode.data;
  const oldData = oldVnode.data;

  if (
    isUndef(data.staticStyle) &&
    isUndef(data.style) &&
    isUndef(oldData.staticStyle) &&
    isUndef(oldData.style)
  ) {
    return;
  }

  let cur, name;
  const el = vnode.elm;
  const oldStaticStyle = oldData.staticStyle;
  const oldStyleBinding = oldData.normalizedStyle || oldData.style || {};

  // if static style exists, stylebinding already merged into it when doing normalizeStyleData
  const oldStyle = oldStaticStyle || oldStyleBinding;
  const style = normalizeStyleBinding(vnode.data.style) || {};

  // store normalized style under a different key for next diff
  // make sure to clone it if it's reactive, since the user likely wants
  // to mutate it.
  vnode.data.normalizedStyle = isDef(style.__ob__) ? extend({}, style) : style;

  const newStyle = getStyle(vnode, true);

  // 比较新旧节点 如果旧节点key不在新节点中  说明被移除了 那么应该将原生style置为空
  for (name in oldStyle) {
    if (isUndef(newStyle[name])) {
      setProp(el, name, "");
    }
  }
  // 新旧节点比较同一key下值是否相同 不同则更新节点
  for (name in newStyle) {
    cur = newStyle[name];
    if (cur !== oldStyle[name]) {
      // ie9 setting to null has no effect, must use empty string
      setProp(el, name, cur == null ? "" : cur);
    }
  }
}

export default {
  create: updateStyle,
  update: updateStyle,
};
