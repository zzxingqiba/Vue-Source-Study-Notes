export function createElement (tagName, vnode) {
  const elm = document.createElement(tagName)
  if (tagName !== 'select') {
    return elm
  }
  // false or null will remove the attribute but undefined will not
  if (vnode.data && vnode.data.attrs && vnode.data.attrs.multiple !== undefined) {
    elm.setAttribute('multiple', 'multiple')
  }
  return elm
}

export function tagName (node) {
  return node.tagName
}

export function parentNode (node){
  return node.parentNode
}

export function nextSibling (node) {
  return node.nextSibling
}

export function insertBefore (parentNode, newNode, referenceNode) {
  parentNode.insertBefore(newNode, referenceNode)
}

export function removeChild (node, child) {
  node.removeChild(child)
}

export function appendChild (node, child) {
  node.appendChild(child)
}

export function createTextNode (text) {
  return document.createTextNode(text)
}

export function setTextContent (node, text) {
  node.textContent = text
}