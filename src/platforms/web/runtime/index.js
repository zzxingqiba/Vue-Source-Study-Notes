import Vue from "../../../core/index.js";
import { noop } from "../../../shared/util";
import { query } from "../util/index";
import { mountComponent } from "../../../core/instance/lifecycle";
import { inBrowser } from "../../../core/util/index";
import { patch } from "./patch";

Vue.prototype.__patch__ = inBrowser ? patch : noop;

Vue.prototype.$mount = function (el, hydrating) {
  el = el ? query(el) : undefined; //取到el的DOM节点
  return mountComponent(this, el, hydrating);
};

export default Vue;
