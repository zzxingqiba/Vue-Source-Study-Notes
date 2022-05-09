import { createCompileToFunctionFn } from "./to-function";
import { extend } from '../shared/util';

export function createCompilerCreator(baseCompile) {
  return function createCompiler(baseOptions) {
    function compile(template, options) {
      // options 是 entry-runtime-with-compiler传入的options
      const finalOptions = Object.create(baseOptions); 
      if(options){
        // merge custom modules
        if (options.modules) {
          finalOptions.modules = (baseOptions.modules || []).concat(
            options.modules
          );
        }
        // merge custom directives
        if (options.directives) {
          finalOptions.directives = extend(
            Object.create(baseOptions.directives || null),
            options.directives
          );
        }
        // copy other options
        for (const key in options) {
          if (key !== "modules" && key !== "directives") {
            finalOptions[key] = options[key];
          }
        }
      }
      const compiled = baseCompile(template.trim(), finalOptions);
      return compiled;
    }
    return {
      compile,
      compileToFunctions: createCompileToFunctionFn(compile),
    };
  };
}
