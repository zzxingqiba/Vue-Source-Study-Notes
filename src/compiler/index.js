/* @flow */

import { parse } from "./parser/index";
import { optimize } from "./optimizer";
import { generate } from "./codegen/index";
import { createCompilerCreator } from "./create-compiler";

// `createCompilerCreator` allows creating compilers that use alternative
// parser/optimizer/codegen, e.g the SSR optimizing compiler.
// Here we just export a default compiler using the default parts.
export const createCompiler = createCompilerCreator(function baseCompile(
  template,
  options
) {
  const ast = parse(template.trim(), options);
  // optimize优化器的目标:遍历生成的模板AST树并检测纯静态的子树，即DOM中永远不需要更改的部分。
  // 一旦我们检测到这些子树，我们就可以:将它们提升为常量，这样我们就不再需要
  // 1.在每次重新渲染时为它们创建新的节点;2. 在打补丁过程中完全跳过它们。
  optimize(ast, options);
  const code = generate(ast, options);
  console.log(code)
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns,
  };
});
