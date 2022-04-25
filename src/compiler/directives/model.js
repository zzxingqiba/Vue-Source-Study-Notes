/**
 * Cross-platform codegen helper for generating v-model value assignment code.
 */
export function genAssignmentCode(value, assignment) {
  const res = parseModel(value);
  if (res.key === null) {
    return `${value}=${assignment}`;
  } else {
    return `$set(${res.exp}, ${res.key}, ${assignment})`;
  }
}

/**
 * Parse a v-model expression into a base path and a final key segment.
 * Handles both dot-path and possible square brackets.
 * 将v-model表达式分解为基本路径和最后的关键段。处理点路径和可能的方括号
 * Possible cases:
 *
 * - test
 * - test[key]
 * - test[test1[key]]
 * - test["a"][key]
 * - xxx.test[a[a].test1[key]]
 * - test.xxx.a["asa"][test1[key]]
 *
 */

let len, str, chr, index, expressionPos, expressionEndPos;

export function parseModel(val) {
  // Fix https://github.com/vuejs/vue/pull/7730
  // allow v-model="obj.val " (trailing whitespace)
  val = val.trim();
  len = val.length;

  if (val.indexOf("[") < 0 || val.lastIndexOf("]") < len - 1) {
    index = val.lastIndexOf(".");
    if (index > -1) {
      return {
        exp: val.slice(0, index),
        key: '"' + val.slice(index + 1) + '"',
      };
    } else {
      return {
        exp: val,
        key: null,
      };
    }
  }

  str = val;
  index = expressionPos = expressionEndPos = 0;

  while (!eof()) {
    chr = next();
    /* istanbul ignore if */
    if (isStringStart(chr)) {
      parseString(chr);
    } else if (chr === 0x5b) {
      parseBracket(chr);
    }
  }

  return {
    exp: val.slice(0, expressionPos),
    key: val.slice(expressionPos + 1, expressionEndPos),
  };
}

function isStringStart(chr) {
  return chr === 0x22 || chr === 0x27;
}

function parseString(chr) {
  const stringQuote = chr;
  while (!eof()) {
    chr = next();
    if (chr === stringQuote) {
      break;
    }
  }
}

function eof() {
  return index >= len;
}

function next() {
  return str.charCodeAt(++index);
}
