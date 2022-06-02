import { emptyObject } from "../shared/util";
import { parseFilters } from "./parser/filter-parser";

export function pluckModuleFunction(modules, key) {
  return modules ? modules.map((m) => m[key]).filter((_) => _) : [];
}

export function addDirective(
  el,
  name,
  rawName,
  value,
  arg,
  isDynamicArg,
  modifiers,
  range
) {
  (el.directives || (el.directives = [])).push(
    rangeSetItem(
      {
        name,
        rawName,
        value,
        arg,
        isDynamicArg,
        modifiers,
      },
      range
    )
  );
  el.plain = false;
}

export function addAttr(el, name, value, range, dynamic) {
  const attrs = dynamic
    ? el.dynamicAttrs || (el.dynamicAttrs = [])
    : el.attrs || (el.attrs = []);
  attrs.push(rangeSetItem({ name, value, dynamic }, range));
  el.plain = false;
}

// note: this only removes the attr from the Array (attrsList) so that it
// doesn't get processed by processAttrs.
// By default it does NOT remove it from the map (attrsMap) because the map is
// needed during codegen.
// 从attrsList中删除
export function getAndRemoveAttr(el, name, removeFromMap) {
  let val;
  if ((val = el.attrsMap[name]) != null) {
    const list = el.attrsList;
    for (let i = 0, l = list.length; i < l; i++) {
      if (list[i].name === name) {
        list.splice(i, 1);
        break;
      }
    }
  }
  if (removeFromMap) {
    delete el.attrsMap[name];
  }
  return val;
}

export function getBindingAttr(el, name, getStatic) {
  // el.attrsList中key放入el.attrsMap中 并删除el.attrsList中的key
  const dynamicValue =
    getAndRemoveAttr(el, ":" + name) || getAndRemoveAttr(el, "v-bind:" + name);
  if (dynamicValue != null) {
    return parseFilters(dynamicValue); //走这里 值为字符串 index
  } else if (getStatic !== false) {
    const staticValue = getAndRemoveAttr(el, name);
    if (staticValue != null) {
      return JSON.stringify(staticValue);
    }
  }
}

function prependModifierMarker(symbol, name, dynamic) {
  return dynamic ? `_p(${name},"${symbol}")` : symbol + name; // mark the event as captured
}

export function addHandler(
  el,
  name,
  value,
  modifiers, // 修饰符
  important,
  warn,
  range,
  dynamic
) {
  modifiers = modifiers || emptyObject;

  // normalize click.right and click.middle since they don't actually fire
  // this is technically browser-specific, but at least for now browsers are
  // the only target envs that have right/middle clicks.
  if (modifiers.right) {
    if (dynamic) {
      name = `(${name})==='click'?'contextmenu':(${name})`;
    } else if (name === "click") {
      name = "contextmenu";
      delete modifiers.right;
    }
  } else if (modifiers.middle) {
    if (dynamic) {
      name = `(${name})==='click'?'mouseup':(${name})`;
    } else if (name === "click") {
      name = "mouseup";
    }
  }

  // check capture modifier
  if (modifiers.capture) {
    delete modifiers.capture;
    name = prependModifierMarker("!", name, dynamic);
  }
  if (modifiers.once) {
    delete modifiers.once;
    name = prependModifierMarker("~", name, dynamic);
  }
  /* istanbul ignore if */
  if (modifiers.passive) {
    delete modifiers.passive;
    name = prependModifierMarker("&", name, dynamic);
  }

  let events;
  if (modifiers.native) {
    delete modifiers.native;
    events = el.nativeEvents || (el.nativeEvents = {});
  } else {
    events = el.events || (el.events = {});
  }

  const newHandler = rangeSetItem({ value: value.trim(), dynamic }, range);
  if (modifiers !== emptyObject) {
    newHandler.modifiers = modifiers;
  }

  const handlers = events[name];
  /* istanbul ignore if */
  if (Array.isArray(handlers)) {
    important ? handlers.unshift(newHandler) : handlers.push(newHandler);
  } else if (handlers) {
    events[name] = important ? [newHandler, handlers] : [handlers, newHandler];
  } else {
    events[name] = newHandler;
  }
  el.plain = false;
}

function rangeSetItem(item, range) {
  // 不管是不是修饰符 都会调用addHandler 到这里都会执行以下  记录下start end而已
  // item: {value: '$set(map, "a", $event)', dynamic: undefined}
  // range: {name: ':a-prop.sync', value: 'map.a', start: 215, end: 235}
  // item: {name: 'id', value: '"hh"', dynamic: undefined}
  // range: {name: 'id', value: 'hh', start: 5, end: 12}
  if (range) {
    if (range.start != null) {
      item.start = range.start;
    }
    if (range.end != null) {
      item.end = range.end;
    }
  }
  return item;
}
