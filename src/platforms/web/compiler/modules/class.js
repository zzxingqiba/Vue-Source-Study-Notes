/* @flow */
import {
  getAndRemoveAttr,
  getBindingAttr,
} from '../../../../../src/compiler/helpers'

function transformNode (el, options) {
  const staticClass = getAndRemoveAttr(el, 'class')
  if (staticClass) {
    el.staticClass = JSON.stringify(staticClass.replace(/\s+/g, ' ').trim())
  }
  const classBinding = getBindingAttr(el, 'class', false /* getStatic */)
  if (classBinding) {
    el.classBinding = classBinding
  }
}

function genData (el) {
  let data = ''
  if (el.staticClass) {
    data += `staticClass:${el.staticClass},`
  }
  if (el.classBinding) {
    data += `class:${el.classBinding},`
  }
  return data
}

export default {
  staticKeys: ['staticClass'],
  transformNode,
  genData
}
