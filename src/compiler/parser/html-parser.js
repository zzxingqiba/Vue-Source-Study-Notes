import { unicodeRegExp } from "../../core/util/lang";
import { makeMap, no } from "../../shared/util";

// Regular Expressions for parsing tags and attributes
const attribute =
  /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;
const dynamicArgAttribute =
  /^\s*((?:v-[\w-]+:|@|:|#)\[[^=]+?\][^\s"'<>\/=]*)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;
const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z${unicodeRegExp.source}]*`;
const qnameCapture = `((?:${ncname}\\:)?${ncname})`;
const startTagOpen = new RegExp(`^<${qnameCapture}`);
const startTagClose = /^\s*(\/?)>/;
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`);
const doctype = /^<!DOCTYPE [^>]+>/i;

export const isPlainTextElement = makeMap("script,style,textarea", true);
var decodingMap = {
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&amp;": "&",
  "&#10;": "\n",
  "&#9;": "\t",
  "&#39;": "'",
};
var encodedAttr = /&(?:lt|gt|quot|amp|#39);/g;
var encodedAttrWithNewLines = /&(?:lt|gt|quot|amp|#39|#10|#9);/g;

function decodeAttr(value, shouldDecodeNewlines) {
  var re = shouldDecodeNewlines ? encodedAttrWithNewLines : encodedAttr;
  return value.replace(re, function (match) {
    return decodingMap[match];
  });
}
export function parseHTML(html, options) {
  const stack = [];
  const isUnaryTag = options.isUnaryTag || no
  let index = 0;
  let last, lastTag;
  while (html) {
    last = html;
    if (!lastTag || !isPlainTextElement(lastTag)) {
      let textEnd = html.indexOf("<");
      if (textEnd === 0) {
        // End tag:
        const endTagMatch = html.match(endTag);
        if (endTagMatch) {
          const curIndex = index;
          advance(endTagMatch[0].length);
          parseEndTag(endTagMatch[1], curIndex, index);
          continue;
        }

        // Start tag:
        const startTagMatch = parseStartTag();
        if (startTagMatch) {
          handleStartTag(startTagMatch);
          continue;
        }
      }
      let text, rest, next;
      if (textEnd >= 0) {
        rest = html.slice(textEnd);
        //暂不知下方循环应用场景  没进去
        while (!endTag.test(rest) && !startTagOpen.test(rest)) {
          // < in plain text, be forgiving and treat it as text
          next = rest.indexOf("<", 1);
          if (next < 0) {
            break;
          }
          textEnd += next;
          rest = html.slice(textEnd);
        }
        // 截取纯文本 以便保存、删除
        text = html.substring(0, textEnd);
        if (text) {
          advance(text.length);
        }
      }
      if (textEnd < 0) {
        text = html;
      }
      if (options.chars && text) {
        options.chars(text, index - text.length, index);
      }
    }

    if (html === last) {
      options.chars && options.chars(html);
      break;
    }
  }

  function advance(n) {
    index += n;
    html = html.substring(n);
  }

  function parseEndTag(tagName, start, end) {
    let pos, lowerCasedTagName;
    if (start == null) start = index;
    if (end == null) end = index;
    // Find the closest opened tag of the same type
    if (tagName) {
      lowerCasedTagName = tagName.toLowerCase();
      // 取到数组最后一个值作为初始值 后续会进行删除 目的是
      for (pos = stack.length - 1; pos >= 0; pos--) {
        if (stack[pos].lowerCasedTag === lowerCasedTagName) {
          break;
        }
      }
    } else {
      // If no tag name is provided, clean shop
      pos = 0;
    }

    if (pos >= 0) {
      // Close all the open elements, up the stack
      for (let i = stack.length - 1; i >= pos; i--) {
        if (options.end) {
          options.end(stack[i].tag, start, end);
        }
      }

      // Remove the open elements from the stack
      stack.length = pos;
      lastTag = pos && stack[pos - 1].tag;
    }
  }

  function parseStartTag() {
    const start = html.match(startTagOpen);
    if (start) {
      const match = {
        tagName: start[1],
        attrs: [],
        start: index,
      };
      advance(start[0].length);
      let end, attr;
      // dynamicArgAttribute 匹配v-bind:[name]="xxx.zhang" :[name]="xxx.zhang" :[name] = "xxx.zhang"  @[dosomething]="handleCallme"
      // 下面只要分解标签的属性 id="name"  分成id="name" id , = , name等
      while (
        !(end = html.match(startTagClose)) &&
        (attr = html.match(dynamicArgAttribute) || html.match(attribute))
      ) {
        attr.start = index;
        advance(attr[0].length);
        attr.end = index;
        match.attrs.push(attr);
      }
      // console.log(match.attrs); [[],[]]
      if (end) {
        match.unarySlash = end[1];
        advance(end[0].length);
        match.end = index;
        return match;
      }
    }
  }

  function handleStartTag(match) {

    const tagName = match.tagName;
    const unarySlash = match.unarySlash;

    // var isUnaryTag = makeMap(
    //   'area,base,br,col,embed,frame,hr,img,input,isindex,keygen,' +
    //   'link,meta,param,source,track,wbr'
    // );
    const unary = isUnaryTag(tagName) || !!unarySlash; // 判断上面这些
    const l = match.attrs.length;

    const attrs = new Array(l);
    for (let i = 0; i < l; i++) {
      const args = match.attrs[i];
      const value = args[3] || args[4] || args[5] || ""; // 这里目的主要是处理startTag（<div id="name"></div>） 中的像id之类的属性而已  将这些属性处理成key value形式
      attrs[i] = {
        name: args[1],
        value: decodeAttr(value, false),
      };
    }

    if (!unary) {
      stack.push({
        tag: tagName,
        lowerCasedTag: tagName.toLowerCase(),
        attrs: attrs,
        start: match.start,
        end: match.end,
      });
      lastTag = tagName;
    }

    if (options.start) {
      options.start(tagName, attrs, unary, match.start, match.end);
    }
  }
}
