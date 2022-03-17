import { isDef, isUndef, isTrue, isObject } from "../util/index";

// Ctor 为 new Vue时components传入的对象
export function createComponent(Ctor, data, context, children, tag) {
  if (isUndef(Ctor)) {
    return;
  }
  const baseCtor = context.$options._base;
  // plain options object: turn it into a constructor
  if (isObject(Ctor)) {
    Ctor = baseCtor.extend(Ctor);
  }
}
