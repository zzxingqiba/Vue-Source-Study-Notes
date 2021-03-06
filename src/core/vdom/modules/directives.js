import { emptyNode } from "../../vdom/patch";
import { resolveAsset } from "../../../core/util/index";
import { mergeVNodeHook } from '../helpers/index'

function updateDirectives(oldVnode, vnode) {
  if (oldVnode.data.directives || vnode.data.directives) {
    _update(oldVnode, vnode);
  }
}

function _update(oldVnode, vnode) {;
  const isCreate = oldVnode === emptyNode;
  const isDestroy = vnode === emptyNode;
  const oldDirs = normalizeDirectives(
    oldVnode.data.directives,
    oldVnode.context
  );
  const newDirs = normalizeDirectives(vnode.data.directives, vnode.context);
  const dirsWithInsert = [];
  const dirsWithPostpatch = [];
  let key, oldDir, dir;
  for (key in newDirs) {
    oldDir = oldDirs[key];
    dir = newDirs[key];
    if (!oldDir) {
      // new directive, bind
      callHook(dir, "bind", vnode, oldVnode);
      if (dir.def && dir.def.inserted) {
        dirsWithInsert.push(dir);
      }
    } else {
      // existing directive, update
      dir.oldValue = oldDir.value;
      dir.oldArg = oldDir.arg;
      callHook(dir, "update", vnode, oldVnode);
      if (dir.def && dir.def.componentUpdated) {
        dirsWithPostpatch.push(dir);
      }
    }
  }
  if (dirsWithInsert.length) {
    const callInsert = () => {
      for (let i = 0; i < dirsWithInsert.length; i++) {
        callHook(dirsWithInsert[i], 'inserted', vnode, oldVnode)
      }
    }
    if (isCreate) {
      mergeVNodeHook(vnode, 'insert', callInsert)
    } else {
      callInsert()
    }
  }
}

const emptyModifiers = Object.create(null);

function normalizeDirectives(dirs, vm) {
  const res = Object.create(null);
  if (!dirs) {
    // $flow-disable-line
    return res;
  }
  let i, dir;
  for (i = 0; i < dirs.length; i++) {
    dir = dirs[i];
    if (!dir.modifiers) {
      // $flow-disable-line
      dir.modifiers = emptyModifiers;
    }
    res[getRawDirName(dir)] = dir;
    dir.def = resolveAsset(vm.$options, "directives", dir.name, true);
  }
  // $flow-disable-line
  return res;
}

function getRawDirName(dir) {
  return (
    dir.rawName || `${dir.name}.${Object.keys(dir.modifiers || {}).join(".")}`
  );
}

function callHook(dir, hook, vnode, oldVnode, isDestroy) {
  const fn = dir.def && dir.def[hook];
  if (fn) {
    try {
      fn(vnode.elm, dir, vnode, oldVnode, isDestroy);
    } catch (e) {}
  }
}

export default {
  create: updateDirectives,
  update: updateDirectives,
  destroy: function unbindDirectives(vnode) {
    updateDirectives(vnode, emptyNode);
  },
};
