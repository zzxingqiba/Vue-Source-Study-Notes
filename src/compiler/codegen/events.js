const fnExpRE = /^([\w$_]+|\([^)]*?\))\s*=>|^function(?:\s+[\w$]+)?\s*\(/;
const fnInvokeRE = /\([^)]*?\);*$/;
const simplePathRE =
  /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\['[^']*?']|\["[^"]*?"]|\[\d+]|\[[A-Za-z_$][\w$]*])*$/;

export function genHandlers(events, isNative) {
  const prefix = isNative ? "nativeOn:" : "on:";
  let staticHandlers = ``;
  let dynamicHandlers = ``;
  for (const name in events) {
    // events[name]值为  {value: 'hh', dynamic: false}
    const handlerCode = genHandler(events[name]);
    if (events[name] && events[name].dynamic) {
      dynamicHandlers += `${name},${handlerCode},`;
    } else {
      staticHandlers += `"${name}":${handlerCode},`;
    }
  }
  staticHandlers = `{${staticHandlers.slice(0, -1)}}`;
  if (dynamicHandlers) {
    return prefix + `_d(${staticHandlers},[${dynamicHandlers.slice(0, -1)}])`;
  } else {
    return prefix + staticHandlers;
  }
}

// #4868: modifiers that prevent the execution of the listener
// need to explicitly return null so that we can determine whether to remove
// the listener for .once
const genGuard = (condition) => `if(${condition})return null;`;

function genKeyFilter(keys) {
  return (
    // make sure the key filters only apply to KeyboardEvents
    // #9441: can't use 'keyCode' in $event because Chrome autofill fires fake
    // key events that do not have keyCode property...
    `if(!$event.type.indexOf('key')&&` +
    `${keys.map(genFilterCode).join("&&")})return null;`
  );
}

function genHandler(handler) {
  if (!handler) {
    return "function(){}";
  }

  if (Array.isArray(handler)) {
    return `[${handler.map((handler) => genHandler(handler)).join(",")}]`;
  }

  const isMethodPath = simplePathRE.test(handler.value);
  const isFunctionExpression = fnExpRE.test(handler.value);
  const isFunctionInvocation = simplePathRE.test(
    handler.value.replace(fnInvokeRE, "")
  );
  if (!handler.modifiers) {
    if (isMethodPath || isFunctionExpression) {
      return handler.value;
    }
    return `function($event){${
      isFunctionInvocation ? `return ${handler.value}` : handler.value
    }}`; // inline statement
  } else {
    let code = "";
    let genModifierCode = "";
    const keys = [];
    for (const key in handler.modifiers) {
      if (modifierCode[key]) {
        genModifierCode += modifierCode[key];
        // left/right
        if (keyCodes[key]) {
          keys.push(key);
        }
      } else if (key === "exact") {
        const modifiers = handler.modifiers;
        genModifierCode += genGuard(
          ["ctrl", "shift", "alt", "meta"]
            .filter((keyModifier) => !modifiers[keyModifier])
            .map((keyModifier) => `$event.${keyModifier}Key`)
            .join("||")
        );
      } else {
        keys.push(key);
      }
    }
    if (keys.length) {
      code += genKeyFilter(keys);
    }
    // Make sure modifiers like prevent and stop get executed after key filtering
    if (genModifierCode) {
      code += genModifierCode;
    }
    const handlerCode = isMethodPath
      ? `return ${handler.value}.apply(null, arguments)`
      : isFunctionExpression
      ? `return (${handler.value}).apply(null, arguments)`
      : isFunctionInvocation
      ? `return ${handler.value}`
      : handler.value;
    return `function($event){${code}${handlerCode}}`;
  }
}

function genFilterCode(key) {
  const keyVal = parseInt(key, 10);
  if (keyVal) {
    return `$event.keyCode!==${keyVal}`;
  }
  const keyCode = keyCodes[key];
  const keyName = keyNames[key];
  return (
    `_k($event.keyCode,` +
    `${JSON.stringify(key)},` +
    `${JSON.stringify(keyCode)},` +
    `$event.key,` +
    `${JSON.stringify(keyName)}` +
    `)`
  );
}
