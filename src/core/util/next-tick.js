/* @flow */
/* globals MutationObserver */

export let isUsingMicroTask = false;

const callbacks = [];
let pending = false;

// 执行完后初始化全局数据
function flushCallbacks() {
  pending = false;
  const copies = callbacks.slice(0);
  callbacks.length = 0;
  // 栈执行一次 清空 又进来  再清空的情况下
  // 传入的时候执行了一次  然后内部触发修改属性  再一次notify  执行了watcher的update操作 又进来了一次  两次是独立的
  // this.$nextTick(()=>{
  //   this.zz = {
  //     name:'2233'
  //   }
  // })
  for (let i = 0; i < copies.length; i++) {
    copies[i]();
  }
}

// Here we have async deferring wrappers using microtasks.
// In 2.5 we used (macro) tasks (in combination with microtasks).
// However, it has subtle problems when state is changed right before repaint
// (e.g. #6813, out-in transitions).
// Also, using (macro) tasks in event handler would cause some weird behaviors
// that cannot be circumvented (e.g. #7109, #7153, #7546, #7834, #8109).
// So we now use microtasks everywhere, again.
// A major drawback of this tradeoff is that there are some scenarios
// where microtasks have too high a priority and fire in between supposedly
// sequential events (e.g. #4521, #6690, which have workarounds)
// or even between bubbling of the same event (#6566).
let timerFunc;

// The nextTick behavior leverages the microtask queue, which can be accessed
// via either native Promise.then or MutationObserver.
// MutationObserver has wider support, however it is seriously bugged in
// UIWebView in iOS >= 9.3.3 when triggered in touch event handlers. It
// completely stops working after triggering a few times... so, if native
// Promise is available, we will use it:
/* istanbul ignore next, $flow-disable-line */

// 浏览器不同 所以做了些兼容处理 判断有无Promise  这里只考虑有的情况下
if (typeof Promise !== "undefined") {
  const p = Promise.resolve();
  timerFunc = () => {
    p.then(flushCallbacks);
  };
  isUsingMicroTask = true;
}

// callbacks是数组的原因是 外面可能手动会调this.$nextTick
export function nextTick(cb, ctx) {
  let _resolve;
  callbacks.push(() => {
    if (cb) {
      try {
        cb.call(ctx);
      } catch (e) {
        console.log(e, ctx, "nextTick-error");
      }
    } else if (_resolve) {
      _resolve(ctx);
    }
  });
  // pending是批处理标记  只执行第一次  会在同步代码都执行完  也就是 callbacks都收集完了 再执行timerFunc（Promise微任务）
  if (!pending) {
    pending = true;
    timerFunc();
  }
  // $flow-disable-line
  if (!cb && typeof Promise !== "undefined") {
    return new Promise((resolve) => {
      _resolve = resolve;
    });
  }
}
