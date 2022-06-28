import { isDef, isUndef, isPrimitive, isTrue } from "../util/index";
import VNode, { cloneVNode } from "./vnode";
import { isTextInputType } from "../../platforms/web/util/index";

const hooks = ["create", "activate", "update", "remove", "destroy"];

export const emptyNode = new VNode("", {}, []);

function sameVnode(a, b) {
  return (
    a.key === b.key &&
    a.asyncFactory === b.asyncFactory &&
    ((a.tag === b.tag &&
      a.isComment === b.isComment &&
      isDef(a.data) === isDef(b.data) &&
      sameInputType(a, b)) ||
      (isTrue(a.isAsyncPlaceholder) && isUndef(b.asyncFactory.error)))
  );
}

function sameInputType(a, b) {
  if (a.tag !== "input") return true;
  let i;
  const typeA = isDef((i = a.data)) && isDef((i = i.attrs)) && i.type;
  const typeB = isDef((i = b.data)) && isDef((i = i.attrs)) && i.type;
  return typeA === typeB || (isTextInputType(typeA) && isTextInputType(typeB));
}

function createKeyToOldIdx (children, beginIdx, endIdx) {
  let i, key
  const map = {}
  for (i = beginIdx; i <= endIdx; ++i) {
    key = children[i].key
    if (isDef(key)) map[key] = i
  }
  return map
}

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

  // parent：父节点 elm：将要插入的节点 ref：被参照的节点
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

  function findIdxInOld (node, oldCh, start, end) {
    for (let i = start; i < end; i++) {
      const c = oldCh[i]
      if (isDef(c) && sameVnode(node, c)) return i
    }
  }

  function addVnodes(
    parentElm,
    refElm,
    vnodes,
    startIdx,
    endIdx,
    insertedVnodeQueue
  ) {
    for (; startIdx <= endIdx; ++startIdx) {
      createElm(
        vnodes[startIdx],
        insertedVnodeQueue,
        parentElm,
        refElm,
        false,
        vnodes,
        startIdx
      );
    }
  }

  function removeNode(el) {
    const parent = nodeOps.parentNode(el);
    // element may have already been removed due to v-html / v-text
    if (isDef(parent)) {
      nodeOps.removeChild(parent, el);
    }
  }

  function updateChildren(
    parentElm,
    oldCh,
    newCh,
    insertedVnodeQueue,
    removeOnly
  ) {
    let oldStartIdx = 0;
    let newStartIdx = 0;
    let oldEndIdx = oldCh.length - 1;
    let oldStartVnode = oldCh[0];
    let oldEndVnode = oldCh[oldEndIdx];
    let newEndIdx = newCh.length - 1;
    let newStartVnode = newCh[0];
    let newEndVnode = newCh[newEndIdx];
    let oldKeyToIdx, idxInOld, vnodeToMove, refElm;
    // removeOnly is a special flag used only by <transition-group>
    // to ensure removed elements stay in correct relative positions
    // during leaving transitions
    const canMove = !removeOnly
    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      if (isUndef(oldStartVnode)) {
        oldStartVnode = oldCh[++oldStartIdx] // Vnode has been moved left
      } 
      else if (isUndef(oldEndVnode)) {
        oldEndVnode = oldCh[--oldEndIdx]
      } 
      // 比较头部 头部相同
      else if (sameVnode(oldStartVnode, newStartVnode)) {
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
        oldStartVnode = oldCh[++oldStartIdx]
        newStartVnode = newCh[++newStartIdx]
      } 
      // 比较尾部 尾部相同
      else if (sameVnode(oldEndVnode, newEndVnode)) {
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx)
        oldEndVnode = oldCh[--oldEndIdx]
        newEndVnode = newCh[--newEndIdx]
      }
      // 开始交叉比对
      // 比较旧节点头部与新节点尾部 此时交叉对比
      else if (sameVnode(oldStartVnode, newEndVnode)) {
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx)
        // 将匹配到的旧节点头元素插入到旧节点尾指针对应的元素前面  如果oldEndVnode.elm为null也就是最后一个位置时 insertBefore默认会在父节点末尾添加oldStartVnode.elm
        canMove && nodeOps.insertBefore(parentElm, oldStartVnode.elm, nodeOps.nextSibling(oldEndVnode.elm))
        oldStartVnode = oldCh[++oldStartIdx]
        newEndVnode = newCh[--newEndIdx]
      }
      // 交叉比对
      // 比较旧节点头部与新节点尾部 此时交叉对比
      else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
        canMove && nodeOps.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm)
        oldEndVnode = oldCh[--oldEndIdx]
        newStartVnode = newCh[++newStartIdx]
      }
      // 如果正反交叉都匹配不到  通过旧节点的key作为映射表的key 索引值作为value去创建映射表  用新节点key去在表中找 找不到直接创建新节点 找到了复用并移动旧节点节点位置
      else {
        if (isUndef(oldKeyToIdx)) oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx) // 映射有key值的
        // 开始将oldCh的key映射成对象 通过新元素头结点 去映射关系中查找 尽可能复用原则 
        idxInOld = isDef(newStartVnode.key)
          ? oldKeyToIdx[newStartVnode.key] // 新节点key在映射表中 根据key取出索引（前面映射 走到这里 说明找到了 这里找到在oldCh中索引 方便接下来要操作）
          : findIdxInOld(newStartVnode, oldCh, oldStartIdx, oldEndIdx) // 没有匹配到key的 也要尽可能复用
        // 映射关系中找不到  说明是新节点  因为是从新街元素头结点开始  所以直接创建新元素插入到旧节点oldStartVnode前面
        if (isUndef(idxInOld)) { // New element
          createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx)
        } else {
          // 找到和新节点相同的旧节点（要移动的旧节点）
          vnodeToMove = oldCh[idxInOld]
          // 判断相同节点
          if (sameVnode(vnodeToMove, newStartVnode)) {
            patchVnode(vnodeToMove, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
            // 将旧节点元素置空 所以才会有while循环开头前两步空判断
            oldCh[idxInOld] = undefined
            // 插入元素
            canMove && nodeOps.insertBefore(parentElm, vnodeToMove.elm, oldStartVnode.elm)
          } else {
            // same key but different element. treat as new element
            createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx)
          }
        }
        // 只需移动新节点头指针即可 因为走到这步判断 是正反交叉都没有匹配上 现在通过映射去找
        // 这里只移动新节点头指针 是因为要按新节点排列的DOM顺序去排 通过直接移动旧节点DOM位置并且置undefined操作 为接下来如果旧节点还有多余的就删除掉做了准备
        newStartVnode = newCh[++newStartIdx]
      }
    }

    if (oldStartIdx > oldEndIdx) {
      refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm
      addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx, insertedVnodeQueue)
    } else if (newStartIdx > newEndIdx) {
      removeVnodes(oldCh, oldStartIdx, oldEndIdx)
    }
  }

  // 首次调用时patchVnode(oldVnode, vnode, insertedVnodeQueue, null, null, removeOnly);
  function patchVnode(
    oldVnode,
    vnode,
    insertedVnodeQueue,
    ownerArray,
    index,
    removeOnly
  ) {
    if (oldVnode === vnode) {
      return;
    }
    if (isDef(vnode.elm) && isDef(ownerArray)) {
      // clone reused vnode
      vnode = ownerArray[index] = cloneVNode(vnode)
    }

    // 继承老节点的elm(即之前的DOM结构) 因为新的vnode经render函数处理第一次时没有elm的  旧节点已经被处理过一次了 是有elm的 后被作为vm的$el
    const elm = (vnode.elm = oldVnode.elm);

    // 处理异步组件 暂不考虑
    if (isTrue(oldVnode.isAsyncPlaceholder)) {
      if (isDef(vnode.asyncFactory.resolved)) {
        hydrate(oldVnode.elm, vnode, insertedVnodeQueue);
      } else {
        vnode.isAsyncPlaceholder = true;
      }
      return;
    }

    // 重用元素的静态树 暂不考虑
    // reuse element for static trees.
    // note we only do this if the vnode is cloned -
    // if the new node is not cloned it means the render functions have been
    // reset by the hot-reload-api and we need to do a proper re-render.
    if (
      isTrue(vnode.isStatic) &&
      isTrue(oldVnode.isStatic) &&
      vnode.key === oldVnode.key &&
      (isTrue(vnode.isCloned) || isTrue(vnode.isOnce))
    ) {
      vnode.componentInstance = oldVnode.componentInstance;
      return;
    }

    // 更新组件 组件生命周期有一个prepatch  暂不考虑
    let i;
    const data = vnode.data;
    if (isDef(data) && isDef((i = data.hook)) && isDef((i = i.prepatch))) {
      i(oldVnode, vnode);
    }

    const oldCh = oldVnode.children;
    const ch = vnode.children;
    if (isDef(data) && isPatchable(vnode)) {
      // 触发各个update  在src\platforms\web\runtime\modules
      // updateAttrs、updateClass、updateDOMListeners、updateDOMProps、updateStyle、update(其实是更新ref)、updateDirectives
      // updateAttrs: 处理节点上上各种属性 新的添加 旧节点有新节点没有则删除
      // updateClass: 始终更新class 可以把它当作attrs看  新的添加 旧节点有新节点没有则删除  class有字符串 数组 对象写法哦
      // updateDOMListeners: 替换新旧function
      // updateDOMProps: 替换新旧节点的值 同理attrs一样 处理的是domProps
      // updateStyle: 同理updateAttrs 新的添加 旧节点有新节点没有则删除
      // update, updateDirectives先暂不考虑 测试源码运行用的不多 几乎和上面思想一致
      for (i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode);
      if (isDef((i = data.hook)) && isDef((i = i.update))) i(oldVnode, vnode);
    }
    // 当新节点没有text
    if (isUndef(vnode.text)) {
      // 当新节点有child旧节点也有child 就需要比较不同了
      if (isDef(oldCh) && isDef(ch)) {
        if (oldCh !== ch)
          updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly);
      }
      // 当只有新child 代表新增操作了  之前没有child 现在有了
      else if (isDef(ch)) {
        if (isDef(oldVnode.text)) nodeOps.setTextContent(elm, "");
        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
      }
      // 当只有就节点 代表删除操作了 没有新节点
      else if (isDef(oldCh)) {
        removeVnodes(oldCh, 0, oldCh.length - 1);
      }
      // 当新节点没有text 旧节点没有child但是有text 需要清空
      else if (isDef(oldVnode.text)) {
        nodeOps.setTextContent(elm, "");
      }
    }
    // 当新节点有text 说明是一个文本节点  要跟之前的旧比较 不同则给elm添加文本节点 （之前如果是有旧节点child 也不必考虑了 这里直接新节点必是文本节点 直接替换）
    else if (oldVnode.text !== vnode.text) {
      nodeOps.setTextContent(elm, vnode.text);
    }
    // 更新指令的生命周期
    // if (isDef(data)) {
    //   if (isDef(i = data.hook) && isDef(i = i.postpatch)) i(oldVnode, vnode)
    // }
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
      // 更新节点 diff入口
      if (!isRealElement && sameVnode(oldVnode, vnode)) {
        // patch existing root node
        patchVnode(oldVnode, vnode, insertedVnodeQueue, null, null, removeOnly);
      } else {
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
    }
    return vnode.elm;
  };
}
