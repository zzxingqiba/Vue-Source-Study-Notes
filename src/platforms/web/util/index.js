export * from './attrs'
export * from './class'
export * from './element'

export function query (el){
  if (typeof el === 'string') {
    const selected = document.querySelector(el)
    if (!selected) {
      return document.createElement('div')
    }
    return selected
  } else {
    return el
  }
}
