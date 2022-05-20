import Dep from "./dep";
import { hasOwn, isObject, def, hasProto } from "../util/index";
import VNode from "../vdom/vnode";

import { arrayMethods } from "./array";

// Observer类型只有Object和Array进来
export class Observer {
  constructor(value) {
    this.value = value;
    // 当前Observe类  每一个对象（包含数组）都有自己的dep实例, 目的是为了$set $delete 或者调用数组push之类的方法同样可以出发视图更新操作
    this.dep = new Dep();
    this.vmCount = 0;
    // 给当前属性添加当前Observer类实例 __ob__代表当前的Observer类  为不可枚举
    def(value, "__ob__", this);

    //处理数组数据类型
    if (Array.isArray(value)) {
      if (hasProto) {
        // 原型链赋值
        protoAugment(value, arrayMethods);
      } else {
        // 浏览器不支持__proto__就直接赋值
        copyAugment(value, arrayMethods, arrayKeys);
      }
      this.observeArray(value);
    } else {
      // 处理对象数据类型 重写属性
      this.walk(value);
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  walk(obj) {
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i]);
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray(items) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i]);
    }
  }
}

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment(target, src) {
  /* eslint-disable no-proto */
  target.__proto__ = src;
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment(target, src, keys) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i];
    def(target, key, src[key]);
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */
// 尝试为一个值创建一个观察者实例，如果成功观察，则返回新的观察者，如果值已经有一个观察者，则返回现有的观察者。
// observe为Object添加响应式所需依赖  为对象{}添加get set方法（每一个属性都有自己的dep实例）
// 同时也会给当前值添加__ob__属性（当前Observe类  每一个对象（包含数组）都有自己的dep实例, 目的是为了$set $delete 或者调用数组push之类的方法同样可以出发视图更新操作）
export function observe(value, asRootData) {
  if (!isObject(value) || value instanceof VNode) {
    return;
  }
  let ob;
  // 如果有__ob__属性 则代表已被观察无需再次处理
  if (hasOwn(value, "__ob__") && value.__ob__ instanceof Observer) {
    ob = value.__ob__;
  } else {
    // 创建Observer实例
    ob = new Observer(value);
  }
  if (asRootData && ob) {
    ob.vmCount++;
  }
  return ob;
}

/**
 * Define a reactive property on an Object.
 */
export function defineReactive(obj, key, val, customSetter, shallow) {
  // 每个属性都有自己的dep收集者
  const dep = new Dep();

  // 得到一些原生属性 排除不可枚举 例如Observe添加的__ob__属性
  const property = Object.getOwnPropertyDescriptor(obj, key);
  if (property && property.configurable === false) {
    return;
  }

  // cater for pre-defined getter/setters
  const getter = property && property.get;
  const setter = property && property.set;
  if ((!getter || setter) && arguments.length === 2) {
    // 取到传过来对象的值
    val = obj[key];
  }
  // 防止val为引用类型的值  递归调用observe 确保重写每一个对象属性
  // 这里childOb返回值为val所对应的自身的Observe实例
  // 这里如果有嵌套形式
  // 例: val为 { a: { b: 1 } }
  // 会依旧走上面的observe方法  从val为 1 开始添加 childOb为false， 然后往回 childOb为 { b: 1 }的Observe实例 然后往回 childOb为 { a: { b: 1 } }的Observe实例递归嘛
  // 经过处理 val: { a: { b: 1 , __ob__: Observe }, __ob__: Observe } （val对应的那个对象自身也有__ob__，他并不是最外层的 这里只是举例子）
  // childOb 的目要从初始的data数据开始梳理 就方便理解    例: { a: { b: 1, c: [ 1, { d: 1 } ] } }
  // 对于嵌套复杂数据 首先会判断对象和数组 对于对象进行definedProperty重写setter getter
  // 对于数组类型数据遍历数组添加重写数组方法(push方法等...) 而后对于引用数据类型调用observe方法进行逐个观察  也就是说到最后无论是嵌套几层或者数组中的嵌套对象 都会被重写setter getter
  // 当调用数组push方法时 会调用数组上面的 this.__ob__.dep.notify 进行视图更新   至于对象添加不存在data中的属性时需要出发视图更新操作时，使用$set方法原理也是这个
  let childOb = !shallow && observe(val);
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter() {
      const value = getter ? getter.call(obj) : val;
      if (Dep.target) {
        dep.depend();
        if (childOb) {
          childOb.dep.depend();
          // 观察[ 1, { d: 1 }, [ 1, 2 ] ]时 遍历到[ 1, 2 ]这里时按obsever([ 1, 2 ]) 是不会触发依赖收集的 也就用不了this.__ob__.dep.notify
          // 所以应该在val为[ 1, { d: 1 }, [ 1, 2 ] ]时  childOb为[ 1, { d: 1 }, [ 1, 2 ] ]的Observe实例  下方判断value也就是[ 1, { d: 1 }, [ 1, 2 ] ]为数组  遍历为每个Obeserve实例收集依赖
          // 此处针对数组嵌套数组 操作push [ 1, 2]现在不会触发视图更新 所以应该为[ 1, 2]收集依赖
          // 例: { a: { b: 1, c: [ 1, { d: 1 }, [ 1, 2 ] ] } }
          // this.a.c[2].push(3) 也应会出发视图更新
          if (Array.isArray(value)) {
            dependArray(value);
          }
        }
      }
      return value;
    },
    set: function reactiveSetter(newVal) {
      const value = getter ? getter.call(obj) : val;
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return;
      }
      // #7981: for accessor properties without setter
      if (getter && !setter) return;
      if (setter) {
        setter.call(obj, newVal);
      } else {
        val = newVal;
      }
      childOb = !shallow && observe(newVal);
      dep.notify();
    },
  });
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray(value) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i];
    e && e.__ob__ && e.__ob__.dep.depend();
    if (Array.isArray(e)) {
      dependArray(e);
    }
  }
}
