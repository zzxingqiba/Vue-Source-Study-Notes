import {
  isTrue,
  isPrimitive,
} from '../util/index'
import VNode from './vnode'
import {
  normalizeChildren,
} from './helpers/index'

const SIMPLE_NORMALIZE = 1
const ALWAYS_NORMALIZE = 2

// context为vm 其余参数为render函数参数
export function createElement (
  context,
  tag,
  data,
  children,
  normalizationType,
  alwaysNormalize
){
  //兼容处理data属性无值情况 错位赋值一下 例：render:(h) => h('div', {} , [h('span', '哈哈哈')]) ， render:(h) => h('div', [h('span', '哈哈哈')]) 
  if (Array.isArray(data) || isPrimitive(data)) {
    normalizationType = children
    children = data
    data = undefined
  }
  if (isTrue(alwaysNormalize)) {
    normalizationType = ALWAYS_NORMALIZE
  }
  return _createElement(context, tag, data, children, normalizationType)
}

// 例：render:(h) => h('div', {} , [h('span', '哈哈哈')])  此处经过调用render 将一层层的h函数更改为vnode数组赋值给children 最终返回嵌套关系的vnode总层级
export function _createElement (context, tag, data, children, normalizationType){
  let vnode
  if (normalizationType === ALWAYS_NORMALIZE) {
    // 在这一步设置了vnode.text 以便在src\core\vdom\patch.js createChildren函数中使用
    children = normalizeChildren(children)
  } 
  if (typeof tag === 'string') {
    vnode = new VNode(
      tag, data, children,
      undefined, undefined, context
    )
  }
  return vnode
}