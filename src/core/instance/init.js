
import { initProxy } from './proxy'
import { initRender } from './render'


let uid = 0
export function initMixin(Vue){
  Vue.prototype._init = function (options){
    const vm = this
    vm._uid = uid++
    vm._isVue = true

    
    vm.$options = options || {}
   
    initProxy(vm)
    initRender(vm)

    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}