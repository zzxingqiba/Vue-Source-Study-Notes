import { isDef, isUndef } from "../../../../shared/util";
import {
  RANGE_TOKEN,
  CHECKBOX_RADIO_TOKEN,
} from "../../compiler/directives/model";
import { updateListeners } from "../../../../core/vdom/helpers/index";
import { currentFlushTimestamp } from "../../../../core/observer/scheduler";

let target;

function createOnceHandler(event, handler, capture) {
  const _target = target; // save current target element in closure
  return function onceHandler() {
    const res = handler.apply(null, arguments);
    if (res !== null) {
      remove(event, onceHandler, capture, _target);
    }
  };
}

// #9446: Firefox <= 53 (in particular, ESR 52) has incorrect Event.timeStamp
// implementation and does not fire microtasks in between event propagation, so
// safe to exclude.
const useMicrotaskFix = true;

function add(name, handler, capture, passive) {
  // async edge case #6566: inner click event triggers patch, event handler
  // attached to outer element during patch, and triggered again. This
  // happens because browsers fire microtask ticks between event propagation.
  // the solution is simple: we save the timestamp when a handler is attached,
  // and the handler would only fire if the event passed to it was fired
  // AFTER it was attached.
  if (useMicrotaskFix) {
    const attachedTimestamp = currentFlushTimestamp;
    const original = handler;
    handler = original._wrapper = function (e) {
      if (
        // no bubbling, should always fire.
        // this is just a safety net in case event.timeStamp is unreliable in
        // certain weird environments...
        e.target === e.currentTarget ||
        // event is fired after handler attachment
        e.timeStamp >= attachedTimestamp ||
        // bail for environments that have buggy event.timeStamp implementations
        // #9462 iOS 9 bug: event.timeStamp is 0 after history.pushState
        // #9681 QtWebEngine event.timeStamp is negative value
        e.timeStamp <= 0 ||
        // #9448 bail if event is fired in another document in a multi-page
        // electron/nw.js app, since event.timeStamp will be using a different
        // starting reference
        e.target.ownerDocument !== document
      ) {
        return original.apply(this, arguments);
      }
    };
  }
  target.addEventListener(name, handler, {
    capture: capture,
    passive: passive,
  });
}

function remove(name, handler, capture, _target) {
  (_target || target).removeEventListener(
    name,
    handler._wrapper || handler,
    capture
  );
}

function updateDOMListeners(oldVnode, vnode) {
  if (isUndef(oldVnode.data.on) && isUndef(vnode.data.on)) {
    return;
  }
  const on = vnode.data.on || {};
  const oldOn = oldVnode.data.on || {};
  // vnode is empty when removing all listeners,
  // and use old vnode dom element
  target = vnode.elm || oldVnode.elm;
  updateListeners(on, oldOn, add, remove, createOnceHandler, vnode.context);
  target = undefined;
}

export default {
  create: updateDOMListeners,
  update: updateDOMListeners,
  destroy: (vnode) => updateDOMListeners(vnode, emptyNode),
};
