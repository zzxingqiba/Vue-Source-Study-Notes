import { createElement } from "../vdom/create-element";
import { installRenderHelpers } from "./render-helpers/index";

import { nextTick } from "../util/index";

// initRender函数已经在src\core\instance\init.js引入被调用赋值 发生在$mount之前
export function initRender(vm) {
  vm._vnode = null; // the root of the child tree
  vm._staticTrees = null; // v-once cached trees

  // _c函数在此注册
  vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false);
  // 将vm传入 这个true暂时不知有何作用  前往create-element文件
  vm.$createElement = (a, b, c, d) => createElement(vm, a, b, c, d, true);
}

export function renderMixin(Vue) {
  // 处理ast为render函数的方法  加在Vue.prototype上
  // install runtime convenience helpers
  installRenderHelpers(Vue.prototype);

  Vue.prototype.$nextTick = function (fn) {
    return nextTick(fn, this);
  };
  Vue.prototype._render = function () {
    const vm = this;
    const { render, _parentVnode } = vm.$options;
    vm.$vnode = _parentVnode;
    let vnode;
    // 这里vm._renderProxy 已经在src\core\instance\init.js引入被调用赋值 发生在$mount之前
    // 这里vm._renderProxy在src\core\instance\proxy.js文件中我们简单赋值为vm
    // $createElement解释在本文件initRender函数中
    // 下面函数返回值为总的vnode层级
    vnode = render.call(vm._renderProxy, vm.$createElement);
    // set parent
    vnode.parent = _parentVnode
    return vnode;
  };
}
