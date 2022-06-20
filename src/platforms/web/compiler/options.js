import { isReservedTag } from "../util/index";
import modules from './modules/index'
import { genStaticKeys } from '../../../shared/util'
import directives from './directives/index'
import { isUnaryTag } from './util'

/* @flow */
export const baseOptions = {
  expectHTML: true,
  modules,
  directives,
  isUnaryTag,
  isReservedTag,
  staticKeys: genStaticKeys(modules)
};
