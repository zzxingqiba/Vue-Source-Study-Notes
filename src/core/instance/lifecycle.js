import Watcher from '../observer/watcher'
import {
  noop,
} from '../util/index'


export function lifecycleMixin (Vue) {
  Vue.prototype._update = function (vnode, hydrating) {
    const vm = this
    const prevEl = vm.$el // 下方mountComponent函数赋值的$el
    const prevVnode = vm._vnode
    vm._vnode = vnode
    
    if (!prevVnode) {
      // initial render
      vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false)
    }else{
      // updates
      vm.$el = vm.__patch__(prevVnode, vnode)
    }
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
    // vm._render()在src\core\instance\index.js初始化时被调用renderMixin 挂载至Vue.prototype
    // 此处是在遍历render函数节点 转为DOM层级结构 
    vm._update(vm._render(), hydrating)
  }
  console.log('暂时调用充当Watch', updateComponent())
  new Watcher(vm, updateComponent, noop, {} ,true)
  return vm
}