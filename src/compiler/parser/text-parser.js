import { parseFilters } from './filter-parser'

const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g;

export function parseText(text) {
  // text 标签中的文本
  const tagRE = defaultTagRE;
  if (!tagRE.test(text)) {
    return;
  }
  const tokens = [];
  const rawTokens = [];
  let lastIndex = (tagRE.lastIndex = 0);
  let match, index, tokenValue;
  // <span v-for="(item) in list" >123 {{name}}222{{name}}</span>  这种情况可以循环截取

  while ((match = tagRE.exec(text))) {
    index = match.index;
    // push text token
    if (index > lastIndex) {
      rawTokens.push((tokenValue = text.slice(lastIndex, index)));
      tokens.push(JSON.stringify(tokenValue));
    }
    // parseFilters处理filter |
    // 例： <span v-for="(item) in list" >123 {{name}}222{{name | filterName}}</span>
    // 会处理成 _f("filterName")(name)
    // <span v-for="(item) in list" >123 {{name}}222{{name | filterName(11,22)}}</span>
    // 会处理成 _f("filterName")(name,11,22)
    // 无则不处理 原值返回{{}}中的值 name
    const exp = parseFilters(match[1].trim());
    tokens.push(`_s(${exp})`);
    rawTokens.push({ "@binding": exp });
    // index是找的 { 的位置 +match[0].length是为了跳过{{}} 因为已经处理过了 要继续向后处理 
    lastIndex = index + match[0].length;
    // console.log(tokens, "tokens");  ['"123 "', '_s(name)', '"222"', '_s(_f("filterName")(name,11,22))']
    // console.log(rawTokens, "rawTokens"); ['"123 "',  {@binding: 'name'}, '"222"', {@binding: '_f("filterName")(name,11,22)'}]
  }

  // <span v-for="(item) in list" >123 {{name}}222</span>  只要不是{{}}结尾
  if (lastIndex < text.length) {
    rawTokens.push((tokenValue = text.slice(lastIndex)));
    tokens.push(JSON.stringify(tokenValue));
  }
  return {
    expression: tokens.join("+"), //"123 "+_s(name)+"2"
    tokens: rawTokens, // 上面有
  };
}
