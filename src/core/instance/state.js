import { noop, isReserved } from "../util/index";
import { observe } from "../observer/index";
import Dep, { pushTarget, popTarget } from "../observer/dep";
import Watcher from '../observer/watcher'

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
  if (opts.computed) initComputed(vm, opts.computed);
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

const computedWatcherOptions = { lazy: true };

function initComputed(vm, computed) {
  const watchers = (vm._computedWatchers = Object.create(null));

  for (const key in computed) {
    const userDef = computed[key];
    const getter = typeof userDef === "function" ? userDef : userDef.get;

    // create internal watcher for the computed property.
    watchers[key] = new Watcher(
      vm,
      getter || noop,
      noop,
      computedWatcherOptions // 标识初次不执行get方法
    );
    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    if (!(key in vm)) {
      defineComputed(vm, key, userDef);
    }
  }
}

export function defineComputed(target, key, userDef) {
  const shouldCache = true;
  if (typeof userDef === "function") {
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key)
      : createGetterInvoker(userDef);
    sharedPropertyDefinition.set = noop;
  } else {
    // 不考虑computed对象情况
    // sharedPropertyDefinition.get = userDef.get
    //   ? shouldCache && userDef.cache !== false
    //     ? createComputedGetter(key)
    //     : createGetterInvoker(userDef.get)
    //   : noop
    // sharedPropertyDefinition.set = userDef.set || noop
  }
  Object.defineProperty(target, key, sharedPropertyDefinition);
}

function createComputedGetter(key) {
  return function computedGetter() {
    const watcher = this._computedWatchers && this._computedWatchers[key];
    if (watcher) {
      //dirty 会在watcher.evaluate(); 执行后变为false  因为computed是有缓存的  模板中取值多个 不会重复计算
      if (watcher.dirty) {
        // 调用这里执行的是computed对应key值的函数  当前watcher被调用get方法pushTarget(this)中的this是当前watchers[key]中的watcher  并不是渲染watcher
        // 内部watcher调用时 会触发computed内部对应的key值函数执行 从而去触发在data中被观察的数据的getter收集依赖  
        // 注意因为此前调用了pushTarget(this)此时的Dep.target为watchers[key]中的watcher  也就代表属性收集的是这个
        // 在这里我们梳理下流程  首先这个函数代表一个getter  然后他的触发条件时取值computed中的值this.xxx会走到这里
        // 那么我们第一次触发时 是初次模板渲染时调用  lifecycle文件中new Watcher 触发了渲染watcher中的this.get(); 
        // this.get调用首先触发了pushTarget(this)  之后走到这里又pushTarget(this)一次  故而targetStack栈中有两个watcher  分别是第一次的渲染watcher和当前计算属性的user watcher
        watcher.evaluate();
      }
      // 从上面的流程可以得知  在渲染阶段当前Dep.target为渲染watcher了  targetStack栈中只有一个渲染watcher  
      if (Dep.target) {
        // 触发依赖当前watcher的属性（因为每一个属性都有自己的dep，在上面的evaluate()中已经被收集在user watcher中了） 所以触发watcher的depend 使属性再次收集渲染watcher  
        // 至此和计算属性相关的属性中 有两个watcher了  [user watcher, render watcher]
        // 所以当属性改变时 属性会循环遍历他自身的watcher触发update更新  
        // 第一个watcher update时将watcher.dirty置为true 再无任何操作， 
        // 第二个渲染watcher重新渲染  当模板解析到计算属性时，因为watcher.dirty为true  所以再次计算computed对应的函数 改变watcher.value的值 从而形成属性值变化计算属性也随之变化
        watcher.depend();
      }
      return watcher.value;
    }
  };
}

function createGetterInvoker(fn) {
  return function computedGetter() {
    return fn.call(this, this);
  };
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
