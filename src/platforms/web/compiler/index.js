import { baseOptions } from "./options";
import { createCompiler } from "../../../../src/compiler/index";

const { compileToFunctions } = createCompiler(baseOptions);

export { compileToFunctions };
