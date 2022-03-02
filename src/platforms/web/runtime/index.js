import Vue from '../../../core/index.js'
import { noop } from '../../../shared/util'
import { query } from '../util/index'
import { mountComponent } from '../../../core/instance/lifecycle'


Vue.prototype.__patch__ = noop


Vue.prototype.$mount = function (el, hydrating){
  el = el? query(el) : undefined
  return mountComponent(this, el, hydrating)
}

export default Vue
