import { initMixin } from './init.js'
import { lifecycleMixin } from './lifecycle'
import { renderMixin } from './render'

function Vue (options) {
  this._init(options)
}

initMixin(Vue)
lifecycleMixin(Vue)
renderMixin(Vue)
export default Vue