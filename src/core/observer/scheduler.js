import { nextTick } from "../util/index";

const queue = []; // 为存放watcher的数组
let has = {}; // 防止重复的watcher 批处理
let flushing = false;
let waiting = false;
let index = 0;
const activatedChildren = [];

/**
 * Reset the scheduler's state.
 */
function resetSchedulerState() {
  index = queue.length = activatedChildren.length = 0;
  has = {};
  waiting = flushing = false;
}

// Async edge case #6566 requires saving the timestamp when event listeners are
// attached. However, calling performance.now() has a perf overhead especially
// if the page has thousands of event listeners. Instead, we take a timestamp
// every time the scheduler flushes and use that for all event listeners
// attached during that flush.
export let currentFlushTimestamp = 0;
// Async edge case fix requires storing an event listener's attach timestamp.
let getNow = Date.now;

/**
 * Flush both queues and run the watchers.
 */
function flushSchedulerQueue() {
  currentFlushTimestamp = getNow();
  flushing = true;
  let watcher, id;

  // Sort queue before flush.
  // This ensures that:
  // 1. Components are updated from parent to child. (because parent is always
  //    created before the child)
  // 2. A component's user watchers are run before its render watcher (because
  //    user watchers are created before the render watcher)
  // 3. If a component is destroyed during a parent component's watcher run,
  //    its watchers can be skipped.
  // 在刷新前对队列排序。
  // 这确保:
  // 1。组件从父组件更新到子组件。(因为父母总是
  // 在child之前创建)
  // 2。组件的用户观察者在它的渲染观察者之前运行(因为
  // 用户观察者是在渲染观察者之前创建的)
  // 3。如果一个组件在父组件的监视程序运行期间被销毁，
  // 它的监视器可以跳过。
  queue.sort((a, b) => a.id - b.id);

  // do not cache length because more watchers might be pushed
  // as we run existing watchers
  for (index = 0; index < queue.length; index++) {
    watcher = queue[index];
    if (watcher.before) {
      watcher.before();
    }
    id = watcher.id;
    // 从has中移除watcher的id
    has[id] = null;
    // 执行watcher的get函数
    watcher.run();
    
  }

  // 重置全局数据 以便下次调用
  resetSchedulerState();
}

/**
 * Push a watcher into the watcher queue.
 * Jobs with duplicate IDs will be skipped unless it's
 * pushed when the queue is being flushed.
 */
export function queueWatcher(watcher) {
  const id = watcher.id;
  // 判断全局变量has中是否有相同watcher  多个相同的watcher只需要执行一次
  if (has[id] == null) {
    has[id] = true;
    if (!flushing) {
      queue.push(watcher);
    } else {
      // if already flushing, splice the watcher based on its id
      // if already past its id, it will be run next immediately.
      let i = queue.length - 1;
      while (i > index && queue[i].id > watcher.id) {
        i--;
      }
      queue.splice(i + 1, 0, watcher);
    }
    // 不管update执行了多少次  最终只执行一轮刷新操作   因为nextTick是异步操作  优先执行同步代码  waiting在第一次时已经锁住 只会执行一次
    // queue the flush
    if (!waiting) {
      waiting = true;
      nextTick(flushSchedulerQueue);
    }
  }
}
