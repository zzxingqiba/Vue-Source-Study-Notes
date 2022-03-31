import { isDef, isUndef, isTrue, isObject } from "../util/index";
import VNode from "./vnode";
import { activeInstance } from "../instance/lifecycle";

const componentVNodeHooks = {
  init(vnode, hydrating) {
    if (
      vnode.componentInstance &&
      !vnode.componentInstance._isDestroyed &&
      vnode.data.keepAlive
    ) {
      // kept-alive components, treat as a patch
      const mountedNode = vnode; // work around flow
      componentVNodeHooks.prepatch(mountedNode, mountedNode);
    } else {
      const child = (vnode.componentInstance = createComponentInstanceForVnode(
        vnode,
        activeInstance
      ));

      // $mount为src\platforms\web\entry-runtime-with-compiler.js的$mount方法
      child.$mount(hydrating ? vnode.elm : undefined, hydrating);
    }
  },
  prepatch() {
    console.log("prepatch");
  },
  insert() {
    console.log("insert");
  },
  destroy() {
    console.log("destroy");
  },
};

export function createComponentInstanceForVnode(
  // we know it's MountedComponentVNode but flow doesn't
  vnode,
  // activeInstance in lifecycle state
  parent
) {
  const options = {
    _isComponent: true,
    _parentVnode: vnode,
    parent,
  };
  // check inline-template render functions
  const inlineTemplate = vnode.data.inlineTemplate;
  if (isDef(inlineTemplate)) {
    options.render = inlineTemplate.render;
    options.staticRenderFns = inlineTemplate.staticRenderFns;
  }
  return new vnode.componentOptions.Ctor(options); // 此处相当于src\core\global-api\extend.js的Sub 调用init方法
}

// Ctor 为 new Vue时components传入的对象  context为Vue实例
export function createComponent(Ctor, data, context, children, tag) {
  if (isUndef(Ctor)) {
    return;
  }
  const baseCtor = context.$options._base;
  // plain options object: turn it into a constructor
  if (isObject(Ctor)) {
    Ctor = baseCtor.extend(Ctor); //处理成src\core\global-api\extend.js 中的sub函数
  }
  if (typeof Ctor !== "function") {
    return;
  }
  // async component
  let asyncFactory;
  data = data || {};
  let propsData = {};
  const listeners = data.on;

  // install component management hooks onto the placeholder node
  installComponentHooks(data);

  // return a placeholder vnode
  const name = Ctor.options.name || tag;
  const vnode = new VNode(
    `vue-component-${Ctor.cid}${name ? `-${name}` : ""}`,
    data,
    undefined,
    undefined,
    undefined,
    context,
    { Ctor, propsData, listeners, tag, children },
    asyncFactory
  );
  return vnode;
}

const hooksToMerge = Object.keys(componentVNodeHooks);

function installComponentHooks(data) {
  const hooks = data.hook || (data.hook = {});
  for (let i = 0; i < hooksToMerge.length; i++) {
    const key = hooksToMerge[i];
    const existing = hooks[key];
    const toMerge = componentVNodeHooks[key];
    if (existing !== toMerge && !(existing && existing._merged)) {
      // hooks[key] = existing ? mergeHook(toMerge, existing) : toMerge; //暂不考虑 简写
      hooks[key] = toMerge;
    }
  }
}
