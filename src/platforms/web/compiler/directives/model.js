/* @flow */

import config from '../../../../core/config'
import { addHandler, addProp } from 'compiler/helpers'
import { genAssignmentCode } from '../../../../compiler/directives/model'


// in some cases, the event used has to be determined at runtime
// so we used some reserved tokens during compile.
export const RANGE_TOKEN = '__r'
export const CHECKBOX_RADIO_TOKEN = '__c'

export default function model (
  el,
  dir,
) {
  // <input type="text" v-model="text"/> 
  // attrsMap: { type: "text", v-model: "text" }
  
  const value = dir.value
  const modifiers = dir.modifiers
  const tag = el.tag
  const type = el.attrsMap.type
  if (el.component) {
    // genComponentModel(el, value, modifiers)
    // component v-model doesn't need extra runtime
    return false
  } else if (tag === 'select') {
    // genSelect(el, value, modifiers)
  } else if (tag === 'input' && type === 'checkbox') {
    // genCheckboxModel(el, value, modifiers)
  } else if (tag === 'input' && type === 'radio') {
    // genRadioModel(el, value, modifiers)
  } else if (tag === 'input' || tag === 'textarea') {
    genDefaultModel(el, value, modifiers)
  } else if (!config.isReservedTag(tag)) {
    // genComponentModel(el, value, modifiers)
    // component v-model doesn't need extra runtime
    return false
  }

  // ensure runtime directive metadata
  return true
}

// function genCheckboxModel (
//   el: ASTElement,
//   value: string,
//   modifiers: ?ASTModifiers
// ) {
//   const number = modifiers && modifiers.number
//   const valueBinding = getBindingAttr(el, 'value') || 'null'
//   const trueValueBinding = getBindingAttr(el, 'true-value') || 'true'
//   const falseValueBinding = getBindingAttr(el, 'false-value') || 'false'
//   addProp(el, 'checked',
//     `Array.isArray(${value})` +
//     `?_i(${value},${valueBinding})>-1` + (
//       trueValueBinding === 'true'
//         ? `:(${value})`
//         : `:_q(${value},${trueValueBinding})`
//     )
//   )
//   addHandler(el, 'change',
//     `var $$a=${value},` +
//         '$$el=$event.target,' +
//         `$$c=$$el.checked?(${trueValueBinding}):(${falseValueBinding});` +
//     'if(Array.isArray($$a)){' +
//       `var $$v=${number ? '_n(' + valueBinding + ')' : valueBinding},` +
//           '$$i=_i($$a,$$v);' +
//       `if($$el.checked){$$i<0&&(${genAssignmentCode(value, '$$a.concat([$$v])')})}` +
//       `else{$$i>-1&&(${genAssignmentCode(value, '$$a.slice(0,$$i).concat($$a.slice($$i+1))')})}` +
//     `}else{${genAssignmentCode(value, '$$c')}}`,
//     null, true
//   )
// }

// function genRadioModel (
//   el: ASTElement,
//   value: string,
//   modifiers: ?ASTModifiers
// ) {
//   const number = modifiers && modifiers.number
//   let valueBinding = getBindingAttr(el, 'value') || 'null'
//   valueBinding = number ? `_n(${valueBinding})` : valueBinding
//   addProp(el, 'checked', `_q(${value},${valueBinding})`)
//   addHandler(el, 'change', genAssignmentCode(value, valueBinding), null, true)
// }

// function genSelect (
//   el: ASTElement,
//   value: string,
//   modifiers: ?ASTModifiers
// ) {
//   const number = modifiers && modifiers.number
//   const selectedVal = `Array.prototype.filter` +
//     `.call($event.target.options,function(o){return o.selected})` +
//     `.map(function(o){var val = "_value" in o ? o._value : o.value;` +
//     `return ${number ? '_n(val)' : 'val'}})`

//   const assignment = '$event.target.multiple ? $$selectedVal : $$selectedVal[0]'
//   let code = `var $$selectedVal = ${selectedVal};`
//   code = `${code} ${genAssignmentCode(value, assignment)}`
//   addHandler(el, 'change', code, null, true)
// }

function genDefaultModel (
  el,
  value,
  modifiers
) {
  // <input type="text" v-model="text"/> 
  // name: "model"
  // value: "text"
  // modifiers: undefined
  const type = el.attrsMap.type
  const { lazy, number, trim } = modifiers || {}
  const needCompositionGuard = !lazy && type !== 'range'
  const event = lazy
    ? 'change'
    : type === 'range'
      ? RANGE_TOKEN
      : 'input'

  let valueExpression = '$event.target.value'
  if (trim) {
    valueExpression = `$event.target.value.trim()`
  }
  if (number) {
    valueExpression = `_n(${valueExpression})`
  }
  // "text=$event.target.value"
  let code = genAssignmentCode(value, valueExpression)
  if (needCompositionGuard) {
    code = `if($event.target.composing)return;${code}`
  }

  // 给el.props数组添加{name: "value", value: "(text)"}
  addProp(el, 'value', `(${value})`)

  // 给el.event数组中添加 input事件(上面event得到) input: {value: 'if($event.target.composing)return;text=$event.target.value', dynamic: undefined}
  addHandler(el, event, code, null, true)
  if (trim || number) {
    addHandler(el, 'blur', '$forceUpdate()')
  }
}
