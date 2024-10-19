let e={prefix:"af-",breakpoints:{sm:"(max-width: 640px)",md:"(min-width: 641px) and (max-width: 768px)",lg:"(min-width: 769px) and (max-width: 1024px)",xl:"(min-width: 1025px) and (max-width: 1280px)",xxl:"(min-width: 1281px)"},engine:"gsap",debug:!0};const t={log:(...e)=>{n.Config.debug&&console.log("[AF]",...e)},warn:(...e)=>{n.Config.debug&&console.warn("[AF]",...e)},error:(...e)=>{n.Config.debug&&console.error("[AF]",...e)}},r={deepMergeObjects(e,t){if(Array.isArray(e)&&Array.isArray(t))return t.slice();if(Array.isArray(t))return t.slice();if(Array.isArray(e))return t;if("object"==typeof e&&"object"==typeof t&&null!==e&&null!==t){const r={...e};return Object.keys(t).forEach((s=>{r[s]=this.deepMergeObjects(e[s],t[s])})),r}return t},mergeConfig(e){n.Config=this.deepMergeObjects(n.Config,e),n.Config.breakpoints=e.breakpoints??n.Config.breakpoints},hasElementsWithAttributes:(e,t)=>e.some((e=>t.some((t=>Object.keys(e.attributes).includes(t))))),generateRandomName:()=>Math.random().toString(36).substring(2,10),kebabCase:e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),debounce(e,t){let r;return function(...s){clearTimeout(r),r=setTimeout((()=>{clearTimeout(r),e(...s)}),t)}},getBreakpointMaxWidth(e){const t=e.match(/\(max-width:\s*(\d+)px\)/),r=e.match(/\(min-width:\s*(\d+)px\)/);return t?parseInt(t[1]):r?1/0:0}},s={parsers:{timeline:{flow:["disallowEmpty","parseTimelineValue"],responsive:!0},from:{flow:["disallowEmpty","parseObjectAttribute","parseJsonToObjectOrArray","normalizeAttributeValues"],responsive:!0},to:{flow:["disallowEmpty","parseObjectAttribute","parseJsonToObjectOrArray","normalizeAttributeValues"],responsive:!0},keyframes:{flow:["disallowEmpty","parseObjectAttribute","parseJsonToObjectOrArray","normalizeAttributeValues","parseKeyframesValue"],responsive:!0},options:{flow:["disallowEmpty","parseObjectAttribute","parseJsonToObjectOrArray","normalizeAttributeValues"],responsive:!0},target:{flow:["parseSelectorValue"],responsive:!1},on:{flow:["disallowEmpty","parseOnValue"],responsive:!0},action:{flow:["disallowEmpty","parseActionValue"],responsive:!0},scroll:{flow:["parseObjectAttribute","parseJsonToObjectOrArray","normalizeAttributeValues"],responsive:!0},splittext:{flow:["parseSplitTextValue"],responsive:!0},pause:{flow:["parseEmptyValue"],responsive:!0}},parseElements(){const e=Array.from(new Set([...this.getAnimatableElements(),...this.getAnimatableElementsByPreset()]));if(e)return this.processAttributes(e)},getAnimatableElementsByPreset:()=>n.Config.presets?Object.entries(n.Config.presets).flatMap((([e,t])=>{const s=`${n.Config.prefix}${r.kebabCase(e)}`;return[...document.getElementsByClassName(s)].map((t=>(t.setAttribute(`${n.Config.prefix}preset`,e),t)))})):[],processAttributes(e){if(!e)return;let r=[];return e.forEach((e=>{try{r.push(this.parseSingleElement(e))}catch{return t.error("Can't parse element:",e),r}})),r=this.propagateBreakpoints(r),r},parseSingleElement(e){const t=this.parseElementAttributes(e);return{element:e,attributes:t,targets:this.getTargets({element:e,attributes:t})}},propagateBreakpoints(e){const t=Object.keys(n.Config.breakpoints).sort(((e,t)=>{const s=r.getBreakpointMaxWidth(n.Config.breakpoints[e]);return r.getBreakpointMaxWidth(n.Config.breakpoints[t])-s}));return e.map((e=>{for(const[s,i]of Object.entries(e.attributes))if(this.parsers[s]&&this.parsers[s].responsive){const a="default"in i;Object.keys(i).filter((e=>"default"!==e&&e in n.Config.breakpoints));let o={};a&&(o=r.deepMergeObjects({},i.default)),t.forEach((t=>{t in i&&(o=r.deepMergeObjects(o,i[t])),e.attributes[s][t]=r.deepMergeObjects({},o)})),a&&delete e.attributes[s].default}return e}))},getTargets(e){if("&"===e.attributes?.target||!e.attributes?.target)return[e.element];const t=e.attributes.target.trim(),r=t.slice(1).trim();if(t.startsWith("&")){const t=this.getMatchedElements(e.element,r);return t.length?t:[e.element]}return document.querySelectorAll(t)},getMatchedElements:(e,t)=>t.match(/^([.#\[])/)&&e.matches(t)?[e]:t.startsWith(">")?[...e.children].filter((e=>e.matches(t.slice(1).trim()))):[...e.querySelectorAll(t)],getAnimatableElements:()=>Array.from(document.querySelectorAll("*")).filter((e=>Array.from(e.attributes).some((e=>e.name.startsWith(n.Config.prefix))))),parseElementAttributes(e){let r={},s=null;if(Array.from(e.attributes).forEach((i=>{if(i.name!==`${n.Config.prefix}preset`){if(i.name.startsWith(n.Config.prefix)){const s=this.extractAttributeComponents(i.name);if(!s)return;const{type:n,breakpoint:a}=s;if(!this.parsers[n])return void t.warn(`Unknown attribute: ${i.name}`);let o=this.runParsers(e,n,i.value);o?(r[n]=r[n]??{},r[n][a]=o,r[n]=this.checkIfResponsiveAttribute(r[n],n)):t.warn(`Error parsing "${n}" attribute value: ${i.value}`)}}else s=i.value.trim()})),s){const t=this.parsePresetAttributes(s,e);this.deepMergeAttributes(r,t)}return r},extractAttributeComponents(e){const r=e.slice(n.Config.prefix.length).match(/^([a-zA-Z]+)(?:-([a-zA-Z0-9]+))?$/);return r[2]&&!n.Config.breakpoints[r[2]]?(t.warn(`Invalid breakpoint: ${r[2]}`),null):r?{type:r[1],breakpoint:r[2]||"default"}:null},runParsers(e,t,r){try{let s={},n=null;for(const i of this.parsers[t].flow)s=n?this[i](n,e):this[i](r,e),n=s;return s}catch(e){return null}},disallowEmpty(e,t){if(""===e)throw new Error("Empty value for attribute is not allowed");return e},checkIfResponsiveAttribute:(e,t)=>s.parsers[t].responsive?e:e[Object.keys(e)[0]],parsePresetAttributes(e,r){const s=n.Config.presets[e];return s?Object.entries(s).reduce(((s,[i,a])=>{if("selector"===i)return s;const[,o,l="default"]=i.match(/^([a-zA-Z]+)(?:-([a-zA-Z0-9]+))?$/)||[];if(!o||!this.parsers[o])return t.warn(`Invalid or unknown preset attribute: "${i}"`),s;if("default"!==l&&!n.Config.breakpoints[l])return t.warn(`Invalid breakpoint "${l}" in preset "${e}" for type "${o}"`),s;let u=this.runParsers(r,o,a);return u?s[o]={...s[o],[l]:u}:t.warn(`Error parsing "${o}" attribute value: ${a}`),s}),{}):(t.warn(`Preset "${e}" not found`),{})},parseObjectAttribute(e,t){return"object"==typeof e?e:(e=this.resolveVariables(e,t),e=(e=this.escapeCommas(e)).replace(/'/g,'"').replace(/\s+/g," ").trim().replace(/(^|[,{]\s*)([^\s,"'{}[\]:]+)(\s*:)/g,'$1"$2"$3').replace(/(:\s*)([^,{}\[\]\s][^,{}\[\]]*)(?=[,}\]]|$)/g,((e,t,r)=>{const s=r.trim();return s.startsWith("[")||s.startsWith("{")||/^-?\d+(\.\d+)?$/.test(s)||/^(true|false|null)$/i.test(s)?`${t}${s}`:/^".*"$/.test(s)?e:`${t}"${s}"`})).replace(/__COMMA__/g,","))},escapeCommas(e){let t="",r=0,s=!1,n="";const i={"(":")","[":"]","{":"}"},a=[];for(let o=0;o<e.length;o++){const l=e[o];s?(t+=l,l===n&&(s=!1)):'"'===l||"'"===l?(s=!0,n=l,t+=l):i[l]?(a.push(i[l]),r++,t+=l):a.length>0&&l===a[a.length-1]?(a.pop(),r--,t+=l):t+=","===l&&r>0?"__COMMA__":l}return t},deepMergeAttributes(e,t){for(const[s,n]of Object.entries(t))if(e[s])for(const[t,i]of Object.entries(n))e[s][t]?e[s][t]=r.deepMergeObjects(e[s][t],i):e[s][t]=i;else e[s]=r.deepMergeObjects({},n)},resolveVariables(e,t){let r=e.replace(/var\((--[^)]+)\)/g,((e,r)=>getComputedStyle(t).getPropertyValue(r).trim()||"undefined"));return r=r.replace(/\${([^}]+)}/g,((e,r)=>this.evaluateExpression(r.trim(),this.getElementContext(t)))),r},evaluateExpression:(()=>{const e=new Map;return(r,s)=>{e.has(r)||e.set(r,new Function('"use strict";return ('+r+")"));try{return e.get(r).call(s)}catch(e){return void t.error(`Error evaluating expression: ${r}`,e)}}})(),getElementContext:e=>({$element:e,window:window,document:document}),parseJsonToObjectOrArray(e,r){if("object"==typeof e)return e;try{return JSON.parse(`{${e}}`)}catch(r){try{return JSON.parse(`[${e}]`)}catch(r){return t.error("Error parsing attribute value:",e,r),null}}},normalizeAttributeValues(e,t=0,r=100){return t>r?(n.debug.error("Maximum recursion depth exceeded in normalizeAttributeValues"),e):Array.isArray(e)?e.map((e=>this.normalizeAttributeValues(e,t+1,r))):null!==e&&"object"==typeof e?Object.fromEntries(Object.entries(e).map((([e,s])=>[e,this.normalizeAttributeValues(s,t+1,r)]))):this.normalizeValue(e)},normalizeValue(e){if("number"==typeof e)return e;if("string"!=typeof e)return e;const t=e.trim();return/^-?\d+(\.\d+)?$/.test(t)?Number(t):/^(true|false)$/i.test(t)?"true"===t.toLowerCase():e},parseTimelineValue(e){const t=e.split(/,(?![^{}]*})/).map((e=>e.trim()));if(t.length>3)throw new Error(`Invalid timeline value: ${e}. Expected format: name[, position][, properties]`);return 1===t.length?{name:String(t[0]),position:null}:2===t.length?{name:t[0],position:this.normalizeValue(t[1])}:{name:t[0],position:this.normalizeValue(t[1]),options:this.normalizeAttributeValues(this.parseJsonToObjectOrArray(this.parseObjectAttribute(t[2],null),null))[0]}},parseSelectorValue:(e,t)=>e.trim(),parseOnValue:(e,t)=>({events:e.split(",").map((e=>e.trim()))}),parseActionValue(e,t){const[r,s,...n]=e.split(/,(?![^{}]*})/).map((e=>e.trim()));if(!s||!r)throw new Error(`Invalid action format: "${e}", needs at least target and action.`);const i=n.join(",").trim();return{action:r,target:s,arguments:i?i.startsWith("{")&&i.endsWith("}")?this.normalizeAttributeValues(this.parseJsonToObjectOrArray(this.parseObjectAttribute(i,t),t)):this.normalizeValue(i):{}}},parseKeyframesValue:(e,t)=>e,parseSplitTextValue(e,t){if("object"==typeof e)return e;if(e.includes(":"))return e=this.parseObjectAttribute(e,t),e=this.parseJsonToObjectOrArray(e,t),e=this.normalizeAttributeValues(e);return{type:e.split(",").map((e=>e.trim())).filter((e=>e.length>0)).join(", ")}},parseEmptyValue:(e,t)=>!0,getTimelines(e){const t={},s=(e,s)=>{const{attributes:n,element:i,targets:a}=e,o=n.timeline?.[s]?.name??n.timeline?.default?.name??(i.id.length?i.id:null)??r.generateRandomName();t[s]??={},t[s][o]??={animations:[],options:{}};const l=Object.fromEntries(Object.entries(n).filter((([,e])=>e[s]||e.default&&"default"===s)).map((([e,t])=>[e,t[s]??t.default])));t[s][o].animations.push({element:i,attributes:l,targets:a}),0===Object.keys(t[s][o].options).length&&(t[s][o].options=this.getTimelineOptions(n.timeline))};return e.forEach((e=>{const t=new Set(Object.values(e.attributes).flatMap((e=>Object.keys(e))));t.has("default")&&(t.delete("default"),s(e,"default")),t.forEach((t=>s(e,t)))})),Object.fromEntries(Object.entries(t).filter((([e])=>isNaN(e))))},getTimelineOptions(e){if(!e)return{};for(const t in e)if(e[t]&&e[t].options)return e[t].options;return{}}},n={debug:t,utils:r,Parser:s,Config:e,engines:{},registerEngine(e,t,r){n.engines[e]={},n.engines[e].engineClass=t,n.engines[e].plugins=r},init(t=null){if(!n.engines)return;t&&n.utils.mergeConfig(t);const r=s.parseElements(),i=s.getTimelines(r),a=n.engines[e.engine].engineClass;if(!a)return void this.debug.error(`Incorrect animation engine: ${n.Config.engine}`);const o=new a(r,i);o.init&&"function"==typeof o.init&&o.init(n.engines[e.engine],n.Config)}};export{n as default};
//# sourceMappingURL=af-core.esm.js.map
