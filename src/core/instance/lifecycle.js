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
      // const vm = new Vue({
      //   el: '#hh',
      //   components:{
      //     'my-button': {
      //       template: '<button>内部组件</button>'
      //     }
      //   },
      // })
      // 组件的编译到这里vm.$el为undefined 此处的vm为组件实例 例如：vue-component-2-my-button 因为在解析模板触发了组件的init 进而组件重新调用了$mount
      // 这里的vnode是button的vnode  因为组件$mount解析的是他自己的template  所以此处vm.__patch__(vm.$el, vnode, hydrating, false);返回的vnode.elm是button DOM
      // 所以这里给组件的实例添加了$el为button的DOM  在src\core\vdom\patch.js中
      // vnode.componentInstance就相当于button节点  vnode就是组件 添加了个属性而已  调用$mount是vnode.componentInstance调的  所以下面是取vnode.componentInstance.$el
      // 调用完组件init  操作了vnode.elm = vnode.componentInstance.$el;  而后将vnode.elm插入到了之前保存的DOM中（不是组件哦 是组件的父亲节点）所以最后DOM结构看不见你的自定义组件标签
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
  new Watcher(
    vm,
    updateComponent,
    noop,
    {
      before() {
        // if (vm._isMounted && !vm._isDestroyed) {
        //   callHook(vm, "beforeUpdate");
        // }
      },
    },
    true
  );
  return vm;
}
