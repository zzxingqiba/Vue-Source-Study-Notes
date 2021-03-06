import Vue from "../../../core/index.js";
import { noop, extend } from "../../../shared/util";
import { query } from "../util/index";
import { mountComponent } from "../../../core/instance/lifecycle";
import { inBrowser } from "../../../core/util/index";
import { patch } from "./patch";
import platformDirectives from './directives/index'

// install platform runtime directives & components
extend(Vue.options.directives, platformDirectives)
// extend(Vue.options.components, platformComponents)

Vue.prototype.__patch__ = inBrowser ? patch : noop;

extend(Vue.options.components, {});

Vue.prototype.$mount = function (el, hydrating) {
  el = el ? query(el) : undefined; //取到el的DOM节点
  return mountComponent(this, el, hydrating);
};

export default Vue;
