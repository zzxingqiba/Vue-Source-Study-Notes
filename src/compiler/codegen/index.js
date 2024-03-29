import { camelize, no, extend } from "../../shared/util";
import baseDirectives from "../directives/index";
import { pluckModuleFunction } from "../helpers";
import { genHandlers } from "./events";

export class CodegenState {
  constructor(options) {
    this.options = options;
    this.transforms = pluckModuleFunction(options.modules, "transformCode");
    this.dataGenFns = pluckModuleFunction(options.modules, "genData");
    this.directives = extend(extend({}, baseDirectives), options.directives);
    const isReservedTag = options.isReservedTag || no;
    this.maybeComponent = (el) => !!el.component || !isReservedTag(el.tag);
    this.onceId = 0;
    this.staticRenderFns = [];
    this.pre = false;
  }
}

export function generate(ast, options) {
  const state = new CodegenState(options);
  // fix #11483, Root level <script> tags should not be rendered.
  const code = ast
    ? ast.tag === "script"
      ? "null"
      : genElement(ast, state)
    : '_c("div")';
  return {
    render: `with(this){return ${code}}`,
    staticRenderFns: state.staticRenderFns,
  };
}

export function genElement(el, state) {
  if (el.parent) {
    el.pre = el.pre || el.parent.pre;
  }
  if (el.staticRoot && !el.staticProcessed) {
    return genStatic(el, state);
  } else if (el.for && !el.forProcessed) {
    // code: // _c('div',{attrs:{"id":"hh"}},_l((list),function(item,index){return _c('span',[_v("222")])}),0)
    return genFor(el, state);
  } else if (el.if && !el.ifProcessed) {
    return genIf(el, state);
  } else {
    // component or element
    let code;
    if (el.component) {
      code = genComponent(el.component, el, state);
    } else {
      let data;
      if (!el.plain || (el.pre && state.maybeComponent(el))) {
        data = genData(el, state);
      }
      const children = el.inlineTemplate ? null : genChildren(el, state, true);
      code = `_c('${el.tag}'${
        data ? `,${data}` : "" // data
      }${
        children ? `,${children}` : "" // children
      })`;
    }
    // module transforms
    for (let i = 0; i < state.transforms.length; i++) {
      code = state.transforms[i](el, code);
    }
    return code;
  }
}

// hoist static sub-trees out
function genStatic(el, state) {
  el.staticProcessed = true;
  // Some elements (templates) need to behave differently inside of a v-pre
  // node.  All pre nodes are static roots, so we can use this as a location to
  // wrap a state change and reset it upon exiting the pre node.
  const originalPreState = state.pre;
  if (el.pre) {
    state.pre = el.pre;
  }
  state.staticRenderFns.push(`with(this){return ${genElement(el, state)}}`);
  state.pre = originalPreState;
  return `_m(${state.staticRenderFns.length - 1}${
    el.staticInFor ? ",true" : ""
  })`;
}

export function genFor(el, state, altGen, altHelper) {
  const exp = el.for;
  const alias = el.alias;
  const iterator1 = el.iterator1 ? `,${el.iterator1}` : "";
  const iterator2 = el.iterator2 ? `,${el.iterator2}` : "";

  el.forProcessed = true; // avoid recursion
  return (
    `${altHelper || "_l"}((${exp}),` +
    `function(${alias}${iterator1}${iterator2}){` +
    `return ${(altGen || genElement)(el, state)}` +
    "})"
  );
}

export function genIf(el, state, altGen, altEmpty) {
  el.ifProcessed = true; // avoid recursion
  // 这里通过el.ifConditions.slice()创建了一个新的副本 确保不会接下来删除操作影响到源数据
  return genIfConditions(el.ifConditions.slice(), state, altGen, altEmpty);
}

function genIfConditions(conditions, state, altGen, altEmpty) {
  if (!conditions.length) {
    return altEmpty || "_e()";
  }
  // shift返回删除数组第一位值 并改变原数组
  const condition = conditions.shift();
  // exp: 表示写的判断表达式
  // block: 表示IfConditions中的节点  将为true的节点放入genElement作为el参数传入
  if (condition.exp) {
    return `(${condition.exp})?${genTernaryExp(
      condition.block
    )}:${genIfConditions(conditions, state, altGen, altEmpty)}`;
  } else {
    return `${genTernaryExp(condition.block)}`;
  }

  // v-if with v-once should generate code like (a)?_m(0):_m(1)
  function genTernaryExp(el) {
    return altGen
      ? altGen(el, state)
      : el.once
      ? genOnce(el, state)
      : genElement(el, state);
  }
}

// componentName is el.component, take it as argument to shun flow's pessimistic refinement
function genComponent(componentName, el, state) {
  const children = el.inlineTemplate ? null : genChildren(el, state, true);
  return `_c(${componentName},${genData(el, state)}${
    children ? `,${children}` : ""
  })`;
}

export function genChildren(el, state, checkSkip, altGenElement, altGenNode) {
  const children = el.children;
  if (children.length) {
    const el = children[0];
    // optimize single v-for
    if (
      children.length === 1 &&
      el.for &&
      el.tag !== "template" &&
      el.tag !== "slot"
    ) {
      const normalizationType = checkSkip
        ? state.maybeComponent(el)
          ? `,1`
          : `,0`
        : ``;
      return `${(altGenElement || genElement)(el, state)}${normalizationType}`;
    }
    const normalizationType = checkSkip
      ? getNormalizationType(children, state.maybeComponent)
      : 0;
    const gen = altGenNode || genNode;
    return `[${children.map((c) => gen(c, state)).join(",")}]${
      normalizationType ? `,${normalizationType}` : ""
    }`;
  }
}

// determine the normalization needed for the children array.
// 0: no normalization needed
// 1: simple normalization needed (possible 1-level deep nested array)
// 2: full normalization needed
function getNormalizationType(children, maybeComponent) {
  let res = 0;
  for (let i = 0; i < children.length; i++) {
    const el = children[i];
    if (el.type !== 1) {
      continue;
    }
    if (
      needsNormalization(el) ||
      (el.ifConditions &&
        el.ifConditions.some((c) => needsNormalization(c.block)))
    ) {
      res = 2;
      break;
    }
    if (
      maybeComponent(el) ||
      (el.ifConditions && el.ifConditions.some((c) => maybeComponent(c.block)))
    ) {
      res = 1;
    }
  }
  return res;
}

function needsNormalization(el) {
  return el.for !== undefined || el.tag === "template" || el.tag === "slot";
}

// 这里静态的与动态的属性会有个JOSN.stringify()的操作  注意下
export function genData(el, state) {
  let data = "{";

  // directives first.
  // directives may mutate the el's other properties before they are generated.

  // 看下v-model如何处理
  // "{directives:[{name:"model",rawName:"v-model",value:(text),expression:"text"}],"
  const dirs = genDirectives(el, state);
  
  if (dirs) data += dirs + ",";

  // key
  if (el.key) {
    data += `key:${el.key},`;
  }
  // ref
  if (el.ref) {
    data += `ref:${el.ref},`;
  }
  if (el.refInFor) {
    data += `refInFor:true,`;
  }
  // pre
  if (el.pre) {
    data += `pre:true,`;
  }
  // record original tag name for components using "is" attribute
  if (el.component) {
    data += `tag:"${el.tag}",`;
  }
  // module data generation functions  // 处理class style
  for (let i = 0; i < state.dataGenFns.length; i++) {
    data += state.dataGenFns[i](el);
  }
  // attributes
  if (el.attrs) {
    data += `attrs:${genProps(el.attrs)},`;
  }
  // DOM props
  if (el.props) {
    data += `domProps:${genProps(el.props)},`;
  }
  // event handlers
  if (el.events) {
    data += `${genHandlers(el.events, false)},`;
  }
  if (el.nativeEvents) {
    data += `${genHandlers(el.nativeEvents, true)},`;
  }
  // slot target
  // only for non-scoped slots
  if (el.slotTarget && !el.slotScope) {
    data += `slot:${el.slotTarget},`;
  }
  // scoped slots
  // if (el.scopedSlots) {
  //   data += `${genScopedSlots(el, el.scopedSlots, state)},`;
  // }
  // component v-model
  if (el.model) {
    data += `model:{value:${el.model.value},callback:${el.model.callback},expression:${el.model.expression}},`;
  }
  // inline-template
  // if (el.inlineTemplate) {
  //   const inlineTemplate = genInlineTemplate(el, state);
  //   if (inlineTemplate) {
  //     data += `${inlineTemplate},`;
  //   }
  // }
  // 移除末尾逗号
  data = data.replace(/,$/, "") + "}";
  // v-bind dynamic argument wrap
  // v-bind with dynamic arguments must be applied using the same v-bind object
  // merge helper so that class/style/mustUseProp attrs are handled correctly.
  // if (el.dynamicAttrs) {
  //   data = `_b(${data},"${el.tag}",${genProps(el.dynamicAttrs)})`;
  // }
  // v-bind data wrap
  if (el.wrapData) {
    data = el.wrapData(data);
  }
  // v-on data wrap
  if (el.wrapListeners) {
    data = el.wrapListeners(data);
  }
  return data;
}

function genDirectives(el, state) {
  const dirs = el.directives;
  if (!dirs) return;
  let res = "directives:[";
  let hasRuntime = false;
  let i, l, dir, needRuntime;
  for (i = 0, l = dirs.length; i < l; i++) {
    dir = dirs[i];
    needRuntime = true;
    const gen = state.directives[dir.name];
    if (gen) {
      // compile-time directive that manipulates AST.
      // returns true if it also needs a runtime counterpart.
      // 进入到了src\platforms\web\compiler\directives\model.js
      needRuntime = !!gen(el, dir, state.warn);
    }
    if (needRuntime) {
      hasRuntime = true;
      // "directives:[{name:"model",rawName:"v-model",value:(text),expression:"text"},"
      res += `{name:"${dir.name}",rawName:"${dir.rawName}"${
        dir.value
          ? `,value:(${dir.value}),expression:${JSON.stringify(dir.value)}`
          : ""
      }${dir.arg ? `,arg:${dir.isDynamicArg ? dir.arg : `"${dir.arg}"`}` : ""}${
        dir.modifiers ? `,modifiers:${JSON.stringify(dir.modifiers)}` : ""
      }},`;
    }
  }
  if (hasRuntime) {
    return res.slice(0, -1) + "]";
  }
}

function genProps(props) {
  let staticProps = ``;
  let dynamicProps = ``;
  for (let i = 0; i < props.length; i++) {
    const prop = props[i];
    const value = transformSpecialNewlines(prop.value);
    if (prop.dynamic) {
      dynamicProps += `${prop.name},${value},`;
    } else {
      staticProps += `"${prop.name}":${value},`;
    }
  }
  // slice(0, -1) 移除末尾逗号
  staticProps = `{${staticProps.slice(0, -1)}}`;
  if (dynamicProps) {
    return `_d(${staticProps},[${dynamicProps.slice(0, -1)}])`;
  } else {
    return staticProps;
  }
}

// #3895, #4268
function transformSpecialNewlines(text) {
  return text.replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

function genNode(node, state) {
  if (node.type === 1) {
    return genElement(node, state);
  } else if (node.type === 3 && node.isComment) {
    return genComment(node);
  } else {
    return genText(node);
  }
}

// text-parser文件中已经处理过_s()包裹了 其实接下来会调用toString
export function genText(text) {
  return `_v(${
    text.type === 2
      ? text.expression // no need for () because already wrapped in _s()
      : transformSpecialNewlines(JSON.stringify(text.text))
  })`;
}

export function genComment(comment) {
  return `_e(${JSON.stringify(comment.text)})`;
}
