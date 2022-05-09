/* @flow */

import * as nodeOps from "../../web/runtime/node-ops";
import { createPatchFunction } from "../../../core/vdom/patch";
// import baseModules from '../../../core/vdom/modules/index'
import platformModules from "../../web/runtime/modules/index";

// the directive module should be applied last, after all
// built-in modules have been applied.
// .concat(baseModules)
const modules = platformModules;

// nodeOps中是一些转真实DOM的一些操作
export const patch = createPatchFunction({ nodeOps, modules });
