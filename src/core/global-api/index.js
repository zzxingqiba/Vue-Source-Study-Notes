import { ASSET_TYPES } from "../../shared/constants";
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'

export function initGlobalAPI(Vue) {
  Vue.options = Object.create(null);
  ASSET_TYPES.forEach((type) => {
    Vue.options[type + "s"] = Object.create(null);
  });
  Vue.options._base = Vue;

  initExtend(Vue)
  // 全局组件 指令 过滤器定义
  initAssetRegisters(Vue)
}
