
import { initProxy } from './proxy'
import { initRender } from './render'
import { mergeOptions } from '../util/index'

let uid = 0
export function initMixin(Vue){
  Vue.prototype._init = function (options){
    const vm = this
    vm._uid = uid++
    vm._isVue = true

    
    vm.$options = mergeOptions(
      resolveConstructorOptions(vm.constructor),
      options || {},
      vm
    )
    initProxy(vm)
    initRender(vm)

    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}
export function resolveConstructorOptions (Ctor) {
  // src\core\global-api\index.js 赋值了Vue.options相当于Vue.prototype.constructor.options Vue.prototsype.constructor本身就是指向原函数的
  // Ctor相当于vm从隐式原型链找到Vue原型对象 原型对象都有一个constructor属性指回原函数 故vm.constructor == Vue.prototype.constructor
  
  let options = Ctor.options
  // if (Ctor.super) { // 此处应该与extend有关 暂不考虑
  //   const superOptions = resolveConstructorOptions(Ctor.super)
  //   const cachedSuperOptions = Ctor.superOptions
  //   if (superOptions !== cachedSuperOptions) {
  //     Ctor.superOptions = superOptions
  //     const modifiedOptions = resolveModifiedOptions(Ctor)
  //     if (modifiedOptions) {
  //       extend(Ctor.extendOptions, modifiedOptions)
  //     }
  //     options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
  //     if (options.name) {
  //       options.components[options.name] = Ctor
  //     }
  //   }
  // }
  return options
}