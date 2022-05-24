import { noop, isReserved, isPlainObject } from "../util/index";
import { observe } from "../observer/index";
import Dep, { pushTarget, popTarget } from "../observer/dep";
import Watcher from "../observer/watcher";

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
  if (opts.watch) {
    initWatch(vm, opts.watch);
  }
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

// watch 数组
function initWatch(vm, watch) {
  for (const key in watch) {
    // handler 每个watch对应的函数
    const handler = watch[key];
    // watch有数组写法
    // watch:{
    //   a: [()=>{console.log(1)},()=>{console.log(2)}]
    // },
    if (Array.isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i]);
      }
    } else {
      createWatcher(vm, key, handler);
    }
  }
}

function createWatcher(vm, expOrFn, handler, options) {
  // watch的对象写法
  if (isPlainObject(handler)) {
    options = handler;
    handler = handler.handler;
  }
  // watch有字符串写法
  // watch:{
  //   a: 'watchFuc'
  // },
  // methods:{
  //   watchFuc(){
  //     console.log('2')
  //   }
  // }
  if (typeof handler === "string") {
    handler = vm[handler];
  }
  // 到这一步  handle 可能为 () => vm.xxx  或者watch对应的函数名  handler为watcher函数 相当于cb
  return vm.$watch(expOrFn, handler, options);
}

export function stateMixin(Vue) {
  // flow somehow has problems with directly declared definition object
  // when using Object.defineProperty, so we have to procedurally build up
  // the object here.
  const dataDef = {};
  dataDef.get = function () {
    return this._data;
  };
  const propsDef = {};
  propsDef.get = function () {
    return this._props;
  };
  Object.defineProperty(Vue.prototype, "$data", dataDef);
  Object.defineProperty(Vue.prototype, "$props", propsDef);

  // Vue.prototype.$set = set
  // Vue.prototype.$delete = del

  Vue.prototype.$watch = function (expOrFn, cb, options) {
    const vm = this;
    // 手动调用this.watch 传的还是对象形式的handler 就处理一下
    if (isPlainObject(cb)) {
      return createWatcher(vm, expOrFn, cb, options);
    }
    // 普通的options 除了handle的watch外 都没options  如果是手动外部直接this.$watch可以传options 例如(deep, immediate)
    options = options || {};
    options.user = true;
    // 这一步开始正式进入到watcher中
    // expOrFn 可能为函数名  也可能为函数  如果为函数名 则包装为返回值是vm.xxx的函数等待后续调用
    // 无论computed还是data中的属性都已被观察  这里new的时候已经会调用this.getter方法  也就是从vm中取需要监视的值
    // 相当于调用了监视属性的getter方法  触发其收集依赖 也就是当前的watcher  并将this.value赋值为监视属性最开始的值
    // 之后如果监视的属性发生变化 则会触发属性上的setter 触发事件通知 最后会调用到watcher上的run 方法  
    // 触发run方法时 会调用get方法也就是上面提到的expOrFn 并返回监视属性的最新值 因为此处设置user标识为true 然后将oldValue和newValue传递给cb函数
    // computed和watch 都依赖与watcher  思路都是一样  watch这里给我的感觉是 它并不太依赖于渲染watch 他更多的感觉是触发属性收集回调依赖  然后回传数据

    const watcher = new Watcher(vm, expOrFn, cb, options);
    if (options.immediate) {
      pushTarget();
      cb.apply(vm, [watcher.value])
      popTarget();
    }
    return function unwatchFn() {
      watcher.teardown();
    };
  };
}
