import { isDef, isUndef, isPrimitive } from "../util/index";
import VNode, { cloneVNode } from "./vnode";

const hooks = ["create", "activate", "update", "remove", "destroy"];

export const emptyNode = new VNode("", {}, []);

export function createPatchFunction(backend) {
  let i, j;
  const cbs = {};

  // nodeOps操作节点的一些方法 来自src\platforms\web\runtime\node-ops.js
  const { modules, nodeOps } = backend;

  for (i = 0; i < hooks.length; ++i) {
    cbs[hooks[i]] = [];
    for (j = 0; j < modules.length; ++j) {
      if (isDef(modules[j][hooks[i]])) {
        cbs[hooks[i]].push(modules[j][hooks[i]]);
      }
    }
  }

  function emptyNodeAt(elm) {
    // elm为el的DOM节点
    return new VNode(
      nodeOps.tagName(elm).toLowerCase(),
      {},
      [],
      undefined,
      elm
    );
  }

  function createChildren(vnode, children, insertedVnodeQueue) {
    if (Array.isArray(children)) {
      for (let i = 0; i < children.length; ++i) {
        createElm(
          children[i],
          insertedVnodeQueue,
          vnode.elm,
          null,
          true,
          children,
          i
        );
      }
    } else if (isPrimitive(vnode.text)) {
      // 这里暂不知有什么作用
      nodeOps.appendChild(
        vnode.elm,
        nodeOps.createTextNode(String(vnode.text))
      );
    }
  }

  // parent：父节点 elm：当前节点空标签 ref：el同级紧跟的节点
  function insert(parent, elm, ref) {
    if (isDef(parent)) {
      if (isDef(ref)) {
        if (nodeOps.parentNode(ref) === parent) {
          nodeOps.insertBefore(parent, elm, ref);
        }
      } else {
        nodeOps.appendChild(parent, elm);
      }
    }
  }

  function isPatchable(vnode) {
    while (vnode.componentInstance) {
      vnode = vnode.componentInstance._vnode;
    }
    return isDef(vnode.tag);
  }

  function invokeCreateHooks(vnode, insertedVnodeQueue) {
    // debugger
    for (let i = 0; i < cbs.create.length; ++i) {
      cbs.create[i](emptyNode, vnode);
    }
    i = vnode.data.hook; // Reuse variable
    if (isDef(i)) {
      if (isDef(i.create)) i.create(emptyNode, vnode);
      if (isDef(i.insert)) insertedVnodeQueue.push(vnode);
    }
  }

  function initComponent(vnode, insertedVnodeQueue) {
    if (isDef(vnode.data.pendingInsert)) {
      insertedVnodeQueue.push.apply(
        insertedVnodeQueue,
        vnode.data.pendingInsert
      );
      vnode.data.pendingInsert = null;
    }
    vnode.elm = vnode.componentInstance.$el;
  }

  function createElm(
    vnode,
    insertedVnodeQueue,
    parentElm,
    refElm,
    nested,
    ownerArray,
    index
  ) {
    // 这里的意思应该是render过一次的vnode 他这里重新clone vnode了一份重新赋值vnode 暂不知应用场景
    if (isDef(vnode.elm) && isDef(ownerArray)) {
      vnode = ownerArray[index] = cloneVNode(vnode);
    }

    vnode.isRootInsert = !nested;
    if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
      return;
    }

    const data = vnode.data;
    const children = vnode.children;
    const tag = vnode.tag;
    if (isDef(tag)) {
      // 第一次进来根据传递的render函数 根据第一个参数tag 创建一个节点 给render函数的elm赋值
      // 往下执行会发现这里的用意是为了让嵌套的render函数创建一个和自身元素一样的标签 应该是为了这个函数的一个判断条件做一个标识吧
      vnode.elm = nodeOps.createElement(tag, vnode);
      createChildren(vnode, children, insertedVnodeQueue);
      // 为节点添加属性 style attrs class之类的
      if (isDef(data)) {
        invokeCreateHooks(vnode, insertedVnodeQueue);
      }
      // refElm为 el的nextSibling可返回某个元素之后紧跟的节点 这个参数只有第一次的时候传入了 createChildren时不需要，就想知道el一个外节点就好了 render里面的知道也没意义
      insert(parentElm, vnode.elm, refElm);
    } else {
      vnode.elm = nodeOps.createTextNode(vnode.text);
      insert(parentElm, vnode.elm, refElm);
    }
  }

  function createComponent(vnode, insertedVnodeQueue, parentElm, refElm) {
    let i = vnode.data;
    if (isDef(i)) {
      if (isDef((i = i.hook)) && isDef((i = i.init))) {
        i(vnode, false /* hydrating */); //此处对vnode.componentInstance赋值   调用src\core\vdom\create-component.js的人init方法
      }
      // after calling the init hook, if the vnode is a child component
      // it should've created a child instance and mounted it. the child
      // component also has set the placeholder vnode's elm.
      // in that case we can just return the element and be done.
      if (isDef(vnode.componentInstance)) {
        initComponent(vnode, insertedVnodeQueue);
        insert(parentElm, vnode.elm, refElm);
        return true;
      }
    }
  }

  function removeVnodes(vnodes, startIdx, endIdx) {
    for (; startIdx <= endIdx; ++startIdx) {
      const ch = vnodes[startIdx];
      if (isDef(ch)) {
        if (isDef(ch.tag)) {
          removeAndInvokeRemoveHook(ch);
          // invokeDestroyHook(ch);
        } else {
          // Text node
          removeNode(ch.elm);
        }
      }
    }
  }

  function removeAndInvokeRemoveHook(vnode, rm) {
    // if (isDef(rm) || isDef(vnode.data)) {
    //   let i
    //   const listeners = cbs.remove.length + 1
    //   if (isDef(rm)) {
    //     // we have a recursively passed down rm callback
    //     // increase the listeners count
    //     rm.listeners += listeners
    //   } else {
    //     // directly removing
    //     rm = createRmCb(vnode.elm, listeners)
    //   }
    //   // recursively invoke hooks on child component root node
    //   if (isDef(i = vnode.componentInstance) && isDef(i = i._vnode) && isDef(i.data)) {
    //     removeAndInvokeRemoveHook(i, rm)
    //   }
    //   for (i = 0; i < cbs.remove.length; ++i) {
    //     cbs.remove[i](vnode, rm)
    //   }
    //   if (isDef(i = vnode.data.hook) && isDef(i = i.remove)) {
    //     i(vnode, rm)
    //   } else {
    //     rm()
    //   }
    // } else {

    removeNode(vnode.elm);
    // }
  }

  function removeNode(el) {
    const parent = nodeOps.parentNode(el);
    // element may have already been removed due to v-html / v-text
    if (isDef(parent)) {
      nodeOps.removeChild(parent, el);
    }
  }

  // 参数来自src\core\instance\lifecycle.js  这个函数主要除里vnode.elm为真实节点
  return function patch(oldVnode, vnode, hydrating, removeOnly) {
    // oldVnode指的就是el的DOM节点 vnode指的是解析render生成的vnode树
    // 如果vnode不存在 暂不考虑
    // if (isUndef(vnode)) {
    //   if (isDef(oldVnode)) invokeDestroyHook(oldVnode)
    //   return
    // }
    let isInitialPatch = false;
    const insertedVnodeQueue = [];
    if (isUndef(oldVnode)) {
      // 自定义的component走这里
      // empty mount (likely as component), create new root element
      isInitialPatch = true;
      createElm(vnode, insertedVnodeQueue);
    } else {
      const isRealElement = isDef(oldVnode.nodeType);
      // 好像是在判断是不是同一节点 先不管这里
      // if (!isRealElement && sameVnode(oldVnode, vnode)) {
      //   // patch existing root node
      //   patchVnode(oldVnode, vnode, insertedVnodeQueue, null, null, removeOnly)
      // }
      if (isRealElement) {
        oldVnode = emptyNodeAt(oldVnode); // 处理el为vnode节点
      }
      const oldElm = oldVnode.elm; // el的DOM节点
      const parentElm = nodeOps.parentNode(oldElm); // el的DOM节点父节点
      // create new node
      createElm(
        vnode,
        insertedVnodeQueue,
        // extremely rare edge case: do not insert if old element is in a
        // leaving transition. Only happens when combining transition +
        // keep-alive + HOCs. (#4590) 看意思应该是过渡时候怕有bug吧
        oldElm._leaveCb ? null : parentElm,
        nodeOps.nextSibling(oldElm)
      );

      // destroy old node  删除旧节点
      if (isDef(parentElm)) {
        removeVnodes([oldVnode], 0, 0);
      }
      // else if (isDef(oldVnode.tag)) {
      //   invokeDestroyHook(oldVnode)
      // }
    }
    return vnode.elm;
  };
}
