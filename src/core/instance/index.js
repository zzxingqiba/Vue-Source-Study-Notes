import { initMixin } from './init.js'
import { lifecycleMixin } from './lifecycle'
import { renderMixin } from './render'
import { stateMixin } from './state'
import { eventsMixin } from './events';

function Vue (options) {
  this._init(options)
}

initMixin(Vue)
stateMixin(Vue)
eventsMixin(Vue)
lifecycleMixin(Vue)
renderMixin(Vue)
export default Vue