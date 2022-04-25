import { noop, extend } from "../../src/shared/util";

export function createCompileToFunctionFn(compile) {
  const cache = Object.create(null);
  return function compileToFunctions(template, options, vm) {
    options = extend({}, options);

    // compile
    const compiled = compile(template, options)
  };
}
