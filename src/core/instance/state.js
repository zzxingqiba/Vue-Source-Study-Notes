import { noop, isReserved } from "../util/index";
import { observe } from "../observer/index";
import Dep, { pushTarget, popTarget } from "../observer/dep";

const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop,
};

export function proxy(target, sourceKey, key) {
  sharedPropertyDefinition.get = function proxyGetter() {
    return this[sourceKey][key];
  };
  sharedPropertyDefinition.set = function proxySetter(val) {
    this[sourceKey][key] = val;
  };
  Object.defineProperty(target, key, sharedPropertyDefinition);
}

export function initState(vm) {
  vm._watchers = [];
  const opts = vm.$options;
  // props暂搁
  // if (opts.props) initProps(vm, opts.props)

  if (opts.methods) initMethods(vm, opts.methods);
  if (opts.data) {
    initData(vm);
  } else {
    observe((vm._data = {}), true /* asRootData */);
  }
  // if (opts.computed) initComputed(vm, opts.computed);
  // if (opts.watch && opts.watch !== nativeWatch) {
  //   initWatch(vm, opts.watch);
  // }
}

function initData(vm) {
  let data = vm.$options.data;
  data = vm._data = typeof data === "function" ? getData(data, vm) : data || {};
  // proxy data on instance
  const keys = Object.keys(data);
  let i = keys.length;
  while (i--) {
    const key = keys[i];
    if (!isReserved(key)) {
      // 数据代理至vm
      proxy(vm, `_data`, key);
    }
  }
  // observe data
  observe(data, true /* asRootData */);
}

export function getData(data, vm) {
  // 在调用数据获取器时禁用dep收集
  // #7573 disable dep collection when invoking data getters
  pushTarget();
  try {
    return data.call(vm, vm);
  } catch (e) {
    handleError(e, vm, `data()`);
    return {};
  } finally {
    popTarget();
  }
}

function initMethods(vm, methods) {
  for (const key in methods) {
    vm[key] =
      typeof methods[key] !== "function"
        ? function () {}
        : bind(methods[key], vm);
  }
}

function bind(fn, ctx) {
  return fn.bind(ctx);
}
