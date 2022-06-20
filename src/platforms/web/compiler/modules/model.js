import {
  addRawAttr,
  getBindingAttr,
  getAndRemoveAttr
} from '../../../../compiler/helpers'
import {
  processFor,
  processElement,
  addIfCondition,
  createASTElement
} from '../../../../compiler/parser/index'

function preTransformNode (el, options) {
  if (el.tag === 'input') {
    const map = el.attrsMap
    if (!map['v-model']) {
      return
    }
    let typeBinding
    if (map[':type'] || map['v-bind:type']) {
      typeBinding = getBindingAttr(el, 'type')
    }
    if (!map.type && !typeBinding && map['v-bind']) {
      typeBinding = `(${map['v-bind']}).type`
    }
  }
}

function cloneASTElement (el) {
  return createASTElement(el.tag, el.attrsList.slice(), el.parent)
}

export default {
  preTransformNode
}