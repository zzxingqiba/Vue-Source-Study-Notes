import {
  camelize,
  toRawType,
  isPlainObject
} from '../../shared/util'

/**
 * 将两个选项对象合并为一个新选项。在实例化和继承中使用的核心实用程序。
 */
export function mergeOptions (
  parent,
  child,
  vm
){

  if (typeof child === 'function') {
    child = child.options
  }

  normalizeProps(child, vm) // 向options中添加处理好格式的标准化props（处理好了' - '拼接的字符串为大写，将数组和对象形式的props全部转化为对象形式）
  // normalizeInject(child, vm)
  // normalizeDirectives(child)

  // Apply extends and mixins on the child options,
  // but only if it is a raw options object that isn't
  // the result of another mergeOptions call.
  // Only merged options has the _base property.

  // if (!child._base) {
  //   if (child.extends) {
  //     parent = mergeOptions(parent, child.extends, vm)
  //   }
  //   if (child.mixins) {
  //     for (let i = 0, l = child.mixins.length; i < l; i++) {
  //       parent = mergeOptions(parent, child.mixins[i], vm)
  //     }
  //   }
  // }

  const options = {}
  // let key
  // for (key in parent) {
  //   mergeField(key)
  // }
  // for (key in child) {
  //   if (!hasOwn(parent, key)) {
  //     mergeField(key)
  //   }
  // }
  // function mergeField (key) {
  //   const strat = strats[key] || defaultStrat
  //   options[key] = strat(parent[key], child[key], vm, key)
  // }
  return options
}


function normalizeProps (options, vm) {
  // options未new Vue时传入
  const props = options.props
  if (!props) return
  const res = {}
  let i, val, name
  if (Array.isArray(props)) {
    i = props.length
    while (i--) {
      val = props[i]
      // 函数用来将-链接的字符串转为大写 例 text-ee  ==》  textEe
      // 将数组类型的props转化为对象 {text: {type:null}, disabled: {type:null}}
      if (typeof val === 'string') {
        name = camelize(val)
        res[name] = { type: null }
      }
    }
  } else if (isPlainObject(props)) { //判断props是否为对象形式
    for (const key in props) {
      val = props[key]
      name = camelize(key)
      res[name] = isPlainObject(val)
        ? val
        : { type: val } // 此处意思是将 props: { text: { default: 'hh', type: String }, disabled: Boolean } ===》 props: { text: { default: 'hh', type: String }, disabled: { type: Boolean } }
    }
    console.log(res)
  }
  options.props = res
}