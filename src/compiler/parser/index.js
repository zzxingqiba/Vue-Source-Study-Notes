import { parseHTML } from "./html-parser";
import { getAndRemoveAttr, getBindingAttr } from "../helpers";
import { extend, cached } from "../../shared/util";
import { parseFilters } from "./filter-parser";
import { parseText } from "./text-parser";

export const forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/;
export const forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/;
const stripParensRE = /^\(|\)$/g;
let decoder;
const decodeHTMLCached = cached(function decode(html) {
  decoder = decoder || document.createElement("div");
  decoder.innerHTML = html;
  return decoder.textContent;
});

function processOnce(el) {
  const once = getAndRemoveAttr(el, "v-once");
  if (once != null) {
    el.once = true;
  }
}

export function addIfCondition(el, condition) {
  if (!el.ifConditions) {
    el.ifConditions = [];
  }
  el.ifConditions.push(condition);
}

function processIf(el) {
  // 向带有v-if的el（ASTElement）赋一些标识
  const exp = getAndRemoveAttr(el, "v-if");
  if (exp) {
    el.if = exp;
    addIfCondition(el, {
      exp: exp,
      block: el,
    });
  } else {
    if (getAndRemoveAttr(el, "v-else") != null) {
      el.else = true;
    }
    const elseif = getAndRemoveAttr(el, "v-else-if");
    if (elseif) {
      el.elseif = elseif;
    }
  }
}

export function parseFor(exp) {
  const inMatch = exp.match(forAliasRE); // ['(item,index) in list', '(item,index)', 'list', index: 0, input: '(item,index) in list', groups: undefined]
  if (!inMatch) return;
  const res = {};
  res.for = inMatch[2].trim();
  const alias = inMatch[1].trim().replace(stripParensRE, "");
  const iteratorMatch = alias.match(forIteratorRE);
  if (iteratorMatch) {
    res.alias = alias.replace(forIteratorRE, "").trim();
    res.iterator1 = iteratorMatch[1].trim();
    // 这里正则匹配出3个值 value,key,index  list为对象形式会出现
    if (iteratorMatch[2]) {
      res.iterator2 = iteratorMatch[2].trim();
    }
  } else {
    res.alias = alias;
  }
  // <span v-for="(key, value, index) in list" :key="index">hh</span>
  // res: {for: 'list', alias: 'key', iterator1: 'value', iterator2: 'index'}

  // <span v-for="(item, index) in list" :key="index">hh</span>
  // res: {for: 'list', alias: 'item', iterator1: 'index'}

  // <span v-for="(item) in list">hh</span>
  // res: {for: 'list', alias: 'item'}
  return res;
}

export function processFor(el) {
  //exp 取到v-for的值
  let exp;
  if ((exp = getAndRemoveAttr(el, "v-for"))) {
    const res = parseFor(exp);
    if (res) {
      extend(el, res);
    }
  }
}

function isTextTag(el) {
  return el.tag === "script" || el.tag === "style";
}

export function createASTElement(tag, attrs, parent) {
  console.log(makeAttrsMap(attrs));
  return {
    type: 1,
    tag,
    attrsList: attrs, // [{name: ':[name]', value: 'xxx.zhang'}]
    attrsMap: makeAttrsMap(attrs), // {:[name]: 'xxx.zhang', id: 'hh'}
    rawAttrsMap: {},
    parent,
    children: [],
  };
}
function makeAttrsMap(attrs) {
  const map = {};
  for (let i = 0, l = attrs.length; i < l; i++) {
    map[attrs[i].name] = attrs[i].value;
  }
  return map;
}

export function parse(template, options) {
  const stack = [];
  let root;
  let currentParent;
  let inPre = false;
  let inVPre = false;
  const whitespaceOption = false;
  const preserveWhitespace = false;

  function closeElement(element) {
    trimEndingWhitespace(element);
    element = processElement(element, options);
  }

  function trimEndingWhitespace(el) {
    // el.children[el.children.length - 1]数据格式为{type: 3, text: ' ', start: 189, end: 192}
    // 此处目的移除最后一个结束标签前换行的空格  默认移除空格的那个数据
    // 例：
    // <div :[name]="xxx.zhang" id="hh">
    //   哈哈
    //   <span>123 {{name}}2</span>
    //   <div v-for="(item,index) in list" >okok</div>
    //   <span v-if="true">1</span>
    //   <span v-else-if="false">2</span>
    //   <span v-else>3</span>
    // </div>
    // 与:
    // <div :[name]="xxx.zhang" id="hh">
    //   哈哈
    //   <span>123 {{name}}2</span>
    //   <div v-for="(item,index) in list" >okok</div>
    //   <span v-if="true">1</span>
    //   <span v-else-if="false">2</span>
    //   <span v-else>3</span></div>
    if (!inPre) {
      let lastNode;
      while (
        (lastNode = el.children[el.children.length - 1]) &&
        lastNode.type === 3 &&
        lastNode.text === " "
      ) {
        el.children.pop();
      }
    }
  }

  parseHTML(template, {
    start(tag, attrs, unary, start, end) {
      let element = createASTElement(tag, attrs, currentParent);
      // 处理下 v-for v-if v-once
      if (true) {
        // structural directives
        processFor(element);
        processIf(element);
        processOnce(element);
      }

      if (!root) {
        root = element;
      }

      if (!unary) {
        currentParent = element;
        stack.push(element);
      }
    },
    end(end) {
      // stack 在 start函数中进行填写 内部有处理好ASTElement
      // 接下来的操作会是将stack中最后一项进行出栈操作  重新赋值currentParent
      // 例：<div> <span> 1 </span> <span> 2 </span></div>
      // 此时stack中 [div,span]  进入end函数移除最后一位 stack:[div] 保证接下来的 <span> 2 </span> currentParent依然是div

      const element = stack[stack.length - 1];
      // pop stack
      stack.length -= 1;
      currentParent = stack[stack.length - 1];

      // 此处element为当前结束标签</div>  并非出栈后取值的currentParent标签
      closeElement(element);
    },
    chars(text, start, end) {
      // text 表示<div>213 {{122}} dd</div> 中 '213 {{122}} dd'
      // chars会在识别标签start之后识别到文本 进行调用
      // 接下来首先取值到children 在chars此函数中填写 currentParent的children属性 此处的currentParent在start函数中赋值为上一个标签 无论是平级标签还是父子标签  都可以正确知道此文本节点的父节点
      const children = currentParent.children;
      1;
      if (inPre || text.trim()) {
        // 去除未闭合标签中的多余空白字符
        text = isTextTag(currentParent) ? text : decodeHTMLCached(text);
      } else if (!children.length) {
        // remove the whitespace-only node right after an opening tag
        text = "";
      } else if (whitespaceOption) {
      } else {
        text = preserveWhitespace ? " " : "";
      }

      if (text) {
        let res;
        let child;
        if (!inVPre && text !== " " && (res = parseText(text, false))) {
          child = {
            type: 2, //带有变量的节点
            expression: res.expression, // "123+_s(name)+2" 拼接好的
            tokens: res.tokens, // 上方的数组形式 在parseText（text-parser文件）有例子
            text,
          };
        } else if (
          text !== " " ||
          !children.length ||
          children[children.length - 1].text !== " "
        ) {
          child = {
            type: 3, //纯文本
            text,
          };
        }
        if (child) {
          children.push(child);
        }
      }
    },
  });
}

export function processElement(element, options) {
  // 此处element为当前结束标签</div>  并非出栈后取值的currentParent标签

  // 处理下key  el.attrsList中key放入el.attrsMap中 并删除el.attrsList中的key
  processKey(element);

  // 判断是否为普通标签 无插槽 无key 无属性
  element.plain =
    !element.key && !element.scopedSlots && !element.attrsList.length;

  // processRef(element);
  // processSlotContent(element);
  // processSlotOutlet(element);
  // processComponent(element);
  // for (let i = 0; i < transforms.length; i++) {
  //   element = transforms[i](element, options) || element;
  // }
  // processAttrs(element); //吐了  明天继续
  // return element;
}

function processKey(el) {
  // el为ASTElement
  const exp = getBindingAttr(el, "key");
  if (exp) {
    el.key = exp;
  }
}
