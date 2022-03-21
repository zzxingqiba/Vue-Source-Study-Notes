import Watcher from "../observer/watcher";
import { noop } from "../util/index";
export let activeInstance = null;
export function setActiveInstance(vm) {
  const prevActiveInstance = activeInstance;
  activeInstance = vm;
  return () => {
    activeInstance = prevActiveInstance;
  };
}

export function initLifecycle(vm) {
  const options = vm.$options;

  // locate first non-abstract parent
  let parent = options.parent; // VueComponent 会用到
  if (parent && !options.abstract) {
    while (parent.$options.abstract && parent.$parent) {
      parent = parent.$parent;
    }
    parent.$children.push(vm);
  }

  vm.$parent = parent;
  vm.$root = parent ? parent.$root : vm;

  vm.$children = [];
  vm.$refs = {};

  vm._watcher = null;
  vm._inactive = null;
  vm._directInactive = false;
  vm._isMounted = false;
  vm._isDestroyed = false;
  vm._isBeingDestroyed = false;
}

export function lifecycleMixin(Vue) {
  Vue.prototype._update = function (vnode, hydrating) {
    const vm = this;
    const prevEl = vm.$el; // 下方mountComponent函数赋值的$el
    const prevVnode = vm._vnode;
    const restoreActiveInstance = setActiveInstance(vm);
    vm._vnode = vnode;

    if (!prevVnode) {
      // initial render
      vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false);
    } else {
      // updates
      vm.$el = vm.__patch__(prevVnode, vnode);
    }
    restoreActiveInstance();
  };
}

// 从src/platforms/web/runtime/index.js来
export function mountComponent(vm, el, hydrating) {
  // el为new Vue时的el DOM节点  例: <div id="hh"></div>
  vm.$el = el;
  if (!vm.$options.render) {
    // vm.$options.render = createEmptyVNode()
  }
  let updateComponent;
  updateComponent = () => {
    // vm._render()在src\core\instance\index.js初始化时被调用renderMixin 挂载至Vue.prototype
    // 此处是在遍历render函数节点 vm._render()返回的处理好的render(options传入的render)总的vnode层级
    vm._update(vm._render(), hydrating);
  };
  console.log("暂时调用充当Watch", updateComponent());
  new Watcher(vm, updateComponent, noop, {}, true);
  return vm;
}
