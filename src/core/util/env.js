export const inBrowser = typeof window !== 'undefined'
// can we use __proto__?
export const hasProto = '__proto__' in {}

/* istanbul ignore next */
export function isNative (Ctor) {
  return typeof Ctor === 'function' && /native code/.test(Ctor.toString())
}

export const hasSymbol =
  typeof Symbol !== 'undefined' && isNative(Symbol) &&
  typeof Reflect !== 'undefined' && isNative(Reflect.ownKeys)