import { baseOptions } from "./options";
import { createCompiler } from "../../../../src/compiler/index";

const { compile, compileToFunctions } = createCompiler(baseOptions);

export { compile, compileToFunctions };
