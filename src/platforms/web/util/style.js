import { cached, extend, toObject } from "../../../shared/util";

export const parseStyleText = cached(function (cssText) {
  const res = {};
  const listDelimiter = /;(?![^(]*\))/g;
  const propertyDelimiter = /:(.+)/;
  // 'font-weight: bold;color:red' ;分割遍历 循环中分割:得到key value
  cssText.split(listDelimiter).forEach(function (item) {
    if (item) {
      const tmp = item.split(propertyDelimiter);
      tmp.length > 1 && (res[tmp[0].trim()] = tmp[1].trim());
    }
  });
  return res;
});

// merge static and dynamic style data on the same vnode
function normalizeStyleData(data) {
  const style = normalizeStyleBinding(data.style);
  // static style is pre-processed into an object during compilation
  // and is always a fresh object, so it's safe to merge into it
  return data.staticStyle ? extend(data.staticStyle, style) : style;
}

// normalize possible array / string values into Object
// 标准化为Object形式 以便后续处理原生属性赋值
export function normalizeStyleBinding(bindingStyle) {
  // <span :style="[{display: 'flex'},{color:'red'}]">222</span>
  // 将vnode.data.style即bindingStyle 转化为{display: 'flex', color:'red'}
  if (Array.isArray(bindingStyle)) {
    return toObject(bindingStyle);
  }
  // 'font-weight: bold;color:red'
  // 将非静态的字符串style属性（data中定义）转换为{fontWeight: 'bold', color:'red'}
  if (typeof bindingStyle === "string") {
    return parseStyleText(bindingStyle);
  }
  return bindingStyle;
}

/**
 * parent component style should be after child's
 * so that parent component's style could override it
 */
export function getStyle(vnode, checkChild) {
  const res = {};
  let styleData;

  if (checkChild) {
    let childNode = vnode;
    while (childNode.componentInstance) {
      childNode = childNode.componentInstance._vnode;
      if (
        childNode &&
        childNode.data &&
        (styleData = normalizeStyleData(childNode.data))
      ) {
        extend(res, styleData);
      }
    }
  }

  if ((styleData = normalizeStyleData(vnode.data))) {
    extend(res, styleData);
  }

  let parentNode = vnode;
  while ((parentNode = parentNode.parent)) {
    if (parentNode.data && (styleData = normalizeStyleData(parentNode.data))) {
      extend(res, styleData);
    }
  }
  return res;
}
