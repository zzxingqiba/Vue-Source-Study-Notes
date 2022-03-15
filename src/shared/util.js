export function noop (a, b, c) {}

export function isPrimitive (value) {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'symbol' ||
    typeof value === 'boolean'
  )
}

export function isUndef (v) {
  return v === undefined || v === null
}

export function isDef (v) {
  return v !== undefined && v !== null
}

export function isTrue (v) {
  return v === true
}

export function isFalse (v) {
  return v === false
}

/**
 * Create a cached version of a pure function.
 */
export function cached(fn){
  const cache = Object.create(null)
  return (function cachedFn (str) {
    const hit = cache[str]
    return hit || (cache[str] = fn(str))
  })
}
  
/**
 * Get the raw type string of a value, e.g., [object Object].
 */
 const _toString = Object.prototype.toString

 export function toRawType (value) {
   return _toString.call(value).slice(8, -1)
 }

/**
 * Strict object type check. Only returns true
 * for plain JavaScript objects.
 */
 export function isPlainObject (obj) {
  return _toString.call(obj) === '[object Object]'
}

// 函数用来将-链接的字符串转为大写 例 text-ee  ==》  textEe
 const camelizeRE = /-(\w)/g
 export const camelize = cached((str) => {
   return str.replace(camelizeRE, (_, c) => {
    // _ 匹配到的字符串
    // c 正则分组内的内容 这里指(\w)
     return c ? c.toUpperCase() : ''
   })
 })
 
 export const capitalize = cached((str) => {
   return str.charAt(0).toUpperCase() + str.slice(1)
 })