import { isReservedTag } from "../util/index";
import modules from './modules/index'
import { genStaticKeys } from '../../../shared/util'
/* @flow */
export const baseOptions = {
  expectHTML: true,
  modules,
  isReservedTag,
  staticKeys: genStaticKeys(modules)
};
