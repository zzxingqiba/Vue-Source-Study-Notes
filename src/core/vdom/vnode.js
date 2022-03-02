export default class VNode {
  constructor (
    tag,
    data,
    children,
    text,
    elm,
    context,
  ){
    this.tag = tag
    this.data = data
    this.children = children
    this.text = text
    this.elm = elm
    this.context = context
  }
}