import Vue from "./runtime/index.js";
import { cached } from "../../core/util/index";

import { query } from "./util/index";
// import { compileToFunctions } from './compiler/index'

const idToTemplate = cached((id) => {
  const el = query(id);
  return el && el.innerHTML;
});

// import Vue from './runtime/index.js'通过一系列引入 最终会流向到src/core/instance/index.js 那里定义了function Vue
// 故这里可以使用Vue.prototype.$mount进行对Vue原型对象绑定属性方法操作
// 这里Vue.prototype.$mount再runtime/index文件中已经赋值 此处目的可能是想拓展一下$mount
const mount = Vue.prototype.$mount;
Vue.prototype.$mount = function (el, hydrating) {
  // 此处处理el Function query查找el的dom节点 若el有值且找不到dom节点，兼容处理为div节点 el为空就返回空
  el = el && query(el);

  // 不允许el为根节点
  if (el === document.body || el === document.documentElement) {
    return this;
  }
  // this.$options在src/core/instance/init.js被赋值， 包含了传入new Vue时的参数
  const options = this.$options;
  console.log(options, "options");
  // 因为new Vue时可以通过传入render函数进行渲染，这里是全部处理成render形式
  if (!options.render) {
    let template = options.template;
    if (template) {
      // template === 'string'时目的就是取innerHTML
      if (typeof template === "string") {
        //  此处判断传入的options中tmeplate是否为id选择器
        if (template.charAt(0) === "#") {
          // cached函数相当于使用闭包创建了一个对象，将id作为key，el的innerHTML作为value存放进去 读取时先找缓存 否则查找选择器然后添加进去  （相当于缓存了一下）
          template = idToTemplate(template);
        }
      } else if (template.nodeType) {
        // 如果是节点的话 直接去其中innerHTML
        template = template.innerHTML;
      } else {
        return this;
      }
    } else if (el) {
      // 查找.$mount(id)中id的标签 无包含则创建div将el下所有节点拷贝进去
      template = getOuterHTML(el);
    }
    if (template) {
      // const { render, staticRenderFns } = compileToFunctions(template, {
      //   outputSourceRange: process.env.NODE_ENV !== 'production',
      //   shouldDecodeNewlines,
      //   shouldDecodeNewlinesForHref,
      //   delimiters: options.delimiters,
      //   comments: options.comments
      // }, this)
      // options.render = render
      // options.staticRenderFns = staticRenderFns
      const render = function (h) {
        return h("div", {}, [h("span", "xxx3424")]);
      };
      options.render = render;
    }
  }
  return mount.call(this, el, hydrating); // mount为runtime/index的方法 返回值为vm
};

// innerHTML 和 outerHTML有什么区别
// 一、区别：
// 1）innerHTML:
// 　　从对象的起始位置到终止位置的全部内容, 不包括HTML标签。
// 2）outerHTML:
// 　　除了包含innerHTML的全部内容外, 还包含对象标签本身。

// 二、例子：
// <div id="test">
//  <span style="color:red">test1</span> test2
// </div>
// 1）innerHTML的值是 <span style="color:red">test1</span> test2
// 2）outerHTML的值是 <div id="test"><span style="color:red">test1</span> test2</div>
function getOuterHTML(el) {
  if (el.outerHTML) {
    return el.outerHTML;
  } else {
    const container = document.createElement("div");
    // cloneNode() 方法可创建指定的节点的精确拷贝。
    // cloneNode() 方法 拷贝所有属性和值。
    // 该方法将复制并返回调用它的节点的副本。如果传递给它的参数是 true，它还将递归复制当前节点的所有子孙节点。否则，它只复制当前节点。
    container.appendChild(el.cloneNode(true));
    return container.innerHTML;
  }
}
export default Vue;
