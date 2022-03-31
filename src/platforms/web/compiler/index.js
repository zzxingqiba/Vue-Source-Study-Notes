import { baseOptions } from './options'
import { createCompiler } from '../../../../src/compiler/index'
console.log(baseOptions)
const { compile, compileToFunctions } = createCompiler(baseOptions)

export { compile, compileToFunctions }