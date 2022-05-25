import { mergeOptions } from "../util/index";

export function initExtend(Vue) {
  /**
   * Each instance constructor, including Vue, has a unique
   * cid. This enables us to create wrapped "child
   * constructors" for prototypal inheritance and cache them.
   */
  Vue.cid = 0;
  let cid = 1;

  Vue.extend = function (extendOptions) {
    extendOptions = extendOptions || {};
    const Super = this;
    const Sub = function VueComponent(options) {
      this._init(options);
    };
    // 这一步其实是想 拥有继承关系 想让组件可以使用vue原型上的方法 比如$mount $emit $nextTick之类的
    Sub.prototype = Object.create(Super.prototype);
    Sub.prototype.constructor = Sub;
    Sub.cid = cid++;
    // 如果是组件的话 这里会处理一个原型链\src\core\util\options.js  使全局组件作为当前components的原型链上的属性
    Sub.options = mergeOptions(Super.options, extendOptions);
    Sub["super"] = Super;
    return Sub;
  };
}
