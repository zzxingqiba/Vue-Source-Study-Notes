export function noop(a, b, c) {}

export function isPrimitive(value) {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "symbol" ||
    typeof value === "boolean"
  );
}

export function isUndef(v) {
  return v === undefined || v === null;
}

export function isDef(v) {
  return v !== undefined && v !== null;
}

export function isTrue(v) {
  return v === true;
}

export function isFalse(v) {
  return v === false;
}

export function isObject(obj) {
  return obj !== null && typeof obj === "object";
}

/**
 * Check whether an object has the property.
 */
const hasOwnProperty = Object.prototype.hasOwnProperty;
export function hasOwn(obj, key) {
  return hasOwnProperty.call(obj, key);
}

/**
 * Create a cached version of a pure function.
 */
export function cached(fn) {
  const cache = Object.create(null);
  return function cachedFn(str) {
    const hit = cache[str];
    return hit || (cache[str] = fn(str));
  };
}

/**
 * Get the raw type string of a value, e.g., [object Object].
 */
const _toString = Object.prototype.toString;

/**
 * Convert a value to a string that is actually rendered.
 */
export function toString(val) {
  return val == null
    ? ""
    : Array.isArray(val) || (isPlainObject(val) && val.toString === _toString)
    ? // 第二个参数是数组
      //   const obj = {
      //     name: '张三',
      //     age: '20',
      //     school: [
      //         '某某小学', '某某中学'
      //     ]
      // }
      // const json1 = JSON.stringify(obj, ['age'])
      // console.log(json1) //{"age":"20"}
      // 第三个参数代表缩进几位 这里缩进2格
      JSON.stringify(val, null, 2)
    : String(val);
}

export function toRawType(value) {
  return _toString.call(value).slice(8, -1);
}

/**
 * Strict object type check. Only returns true
 * for plain JavaScript objects.
 */
export function isPlainObject(obj) {
  return _toString.call(obj) === "[object Object]";
}

// 函数用来将-链接的字符串转为大写 例 text-ee  ==》  textEe
const camelizeRE = /-(\w)/g;
export const camelize = cached((str) => {
  return str.replace(camelizeRE, (_, c) => {
    // _ 匹配到的字符串
    // c 正则分组内的内容 这里指(\w)
    return c ? c.toUpperCase() : "";
  });
});

export const capitalize = cached((str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
});

/**
 * Always return false.
 */
export const no = (a, b, c) => false;

export function extend(to, _from) {
  for (const key in _from) {
    to[key] = _from[key];
  }
  return to;
}

/**
 * Make a map and return a function for checking if a key
 * is in that map.
 */
export function makeMap(str, expectsLowerCase) {
  const map = Object.create(null);
  const list = str.split(",");
  for (let i = 0; i < list.length; i++) {
    map[list[i]] = true;
  }
  return expectsLowerCase ? (val) => map[val.toLowerCase()] : (val) => map[val];
}

export const emptyObject = Object.freeze({});

const hyphenateRE = /\B([A-Z])/g;
export const hyphenate = cached((str) => {
  return str.replace(hyphenateRE, "-$1").toLowerCase();
});

/**
 * Check if a tag is a built-in tag.
 */
export const isBuiltInTag = makeMap("slot,component", true);

/**
 * Generate a string containing static keys from compiler modules.
 */
export function genStaticKeys(modules) {
  return modules
    .reduce((keys, m) => {
      return keys.concat(m.staticKeys || []);
    }, [])
    .join(",");
}

/**
 * Merge an Array of Objects into a single Object.
 */
export function toObject(arr) {
  const res = {};
  for (let i = 0; i < arr.length; i++) {
    if (arr[i]) {
      extend(res, arr[i]);
    }
  }
  return res;
}
