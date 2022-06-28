import { renderStatic } from "./render-static";
import { createTextVNode, createEmptyVNode } from "../../vdom/vnode";
import { toString } from "../../../shared/util";
import { renderList } from './render-list'
export function installRenderHelpers(target) {
  // target._o = markOnce;
  // target._n = toNumber;
  target._s = toString;
  target._l = renderList;
  // target._t = renderSlot;
  // target._q = looseEqual;
  // target._i = looseIndexOf;
  target._m = renderStatic;
  // target._f = resolveFilter;
  // target._k = checkKeyCodes;
  // target._b = bindObjectProps;
  target._v = createTextVNode;
  target._e = createEmptyVNode;
  // target._u = resolveScopedSlots;
  // target._g = bindObjectListeners;
  // target._d = bindDynamicKeys;
  // target._p = prependModifier;
}
