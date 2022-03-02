import {
  isTrue,
  isPrimitive,
} from '../util/index'
import VNode from './vnode'

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

export function _createElement (context, tag, data, children, normalizationType){
  let vnode
  if (typeof tag === 'string') {
    vnode = new VNode(
      tag, data, children,
      undefined, undefined, context
    )
  }
  return vnode
}