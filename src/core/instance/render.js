import { createElement } from '../vdom/create-element'

// initRender函数已经在src\core\instance\init.js引入被调用赋值 发生在$mount之前
export function initRender (vm) {
  vm._vnode = null // the root of the child tree
  vm._staticTrees = null // v-once cached trees
  // 将vm传入 这个true暂时不知有何作用  前往create-element文件
  vm.$createElement = (a, b, c, d) => createElement(vm, a, b, c, d, true)
}


export function renderMixin (Vue) {
  Vue.prototype.$nextTick = function (fn) {
    console.log(fn, '$nextTick')
  },

  Vue.prototype._render = function () {
    const vm = this
    const { render, _parentVnode } = vm.$options
    vm.$vnode = _parentVnode
    let vnode

    // 这里vm._renderProxy 已经在src\core\instance\init.js引入被调用赋值 发生在$mount之前
    // 这里vm._renderProxy在src\core\instance\proxy.js文件中我们简单赋值为vm
    // $createElement解释在本文件initRender函数中
    // 下面函数返回值为vnode
    vnode = render.call(vm._renderProxy, vm.$createElement)
    // console.log(vnode,'vnode')
    return vnode
  }
}