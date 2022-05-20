export function invokeWithErrorHandling(handler, context, args, vm, info) {
  let res;
  try {
    res = args ? handler.apply(context, args) : handler.call(context);
  } catch (e) {}
  return res;
}
