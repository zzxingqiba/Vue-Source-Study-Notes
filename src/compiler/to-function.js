import { noop, extend } from "../../src/shared/util";

function createFunction(code, errors) {
  try {
    // 到这一步了
    return new Function(code);
  } catch (err) {
    errors.push({ err, code });
    return noop;
  }
}

export function createCompileToFunctionFn(compile) {
  const cache = Object.create(null);
  return function compileToFunctions(template, options, vm) {
    options = extend({}, options);
    // check cache
    const key = options.delimiters
      ? String(options.delimiters) + template
      : template;
    if (cache[key]) {
      return cache[key];
    }
    // compile
    const compiled = compile(template, options);
    const res = {};
    const fnGenErrors = [];
    res.render = createFunction(compiled.render, fnGenErrors);
    res.staticRenderFns = compiled.staticRenderFns.map((code) => {
      return createFunction(code, fnGenErrors);
    });
    return (cache[key] = res);
  };
}
