import {toArray} from '../../shared/util'
export function initEvents (vm) {
  vm._events = Object.create(null)
}
export function eventsMixin (Vue) {
  Vue.prototype.$on = function(event, fn){
    if(Array.isArray(event)){
      event.map(i => this.$on(i, fn))
    }else{
      (this._events[event] || (this._events[event] = [])).push(fn)
    }
    return this
  }
  Vue.prototype.$once = function(event, fn){
    const on = (...args) => {
      this.$off(event, on),
      fn.apply(this, args)
    }
    on.fn = fn
    this.$on(event, on)
    return this
  }
  Vue.prototype.$off =  function(event, fn){
    // 如果没有提供参数，则移除所有的事件监听器
    if(!arguments.length){
      this._events = Object.create(null)
      return this
    }
    // event is array
    if(Array.isArray(event)){
      event.map(i=>this.$off(i, fn))
      return this
    }
    const cbs = this._events[event]
    if(!cbs) return this
    // 如果只提供了事件，则移除该事件所有的监听器
    if(!fn) {
      this._events[event] = null
      return this
    }
    let cb;
    let i = cbs.length
    while(i--){
      cb = cbs[i]
      if(cb === fn || cb.fn === fn){
        cbs.splice(i, 1)
        break
      }
    }
    return this
  }
  Vue.prototype.$emit = function (event){
    let cbs = this._events[event]
    if(cbs){
      cbs = cbs.length > 1? toArray(cbs) : cbs
      const args = toArray(arguments, 1)
      cbs.map(fn => fn.apply(this, args))
    }
    return this
  }
}