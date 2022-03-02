import Watcher from '../observer/watcher'
import {
  noop,
} from '../util/index'

export function lifecycleMixin (Vue) {
  Vue.prototype._update = function (vnode, hydrating) {
    const vm = this
    vm._vnode = vnode

    vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false)
  }
}

// 从src/platforms/web/runtime/index.js来 
export function mountComponent (vm, el, hydrating){
  // el为new Vue时的el DOM节点  例: <div id="hh"></div>
  vm.$el = el
  if (!vm.$options.render) {
    // vm.$options.render = createEmptyVNode()
  }
  let updateComponent
  updateComponent = () => {
    vm._update(vm._render(), hydrating)
  }
  console.log('暂时调用充当Watch', vm._render())
  new Watcher(vm, updateComponent, noop, {} ,true)
  return vm
}