let e={prefix:"af-",breakpoints:{sm:"(max-width: 640px)",md:"(min-width: 641px) and (max-width: 768px)",lg:"(min-width: 769px) and (max-width: 1024px)",xl:"(min-width: 1025px) and (max-width: 1280px)",xxl:"(min-width: 1281px)"},engine:"gsap",debug:!0};const t={log:(...e)=>{s.Config.debug&&console.log("[AF]",...e)},warn:(...e)=>{s.Config.debug&&console.warn("[AF]",...e)},error:(...e)=>{s.Config.debug&&console.error("[AF]",...e)}},r={deepMergeObjects(e,t){if(Array.isArray(e)&&Array.isArray(t))return t.slice();if(Array.isArray(t))return t.slice();if(Array.isArray(e))return t;if("object"==typeof e&&"object"==typeof t&&null!==e&&null!==t){const r={...e};return Object.keys(t).forEach((i=>{r[i]=this.deepMergeObjects(e[i],t[i])})),r}return t},mergeConfig(e){s.Config=this.deepMergeObjects(s.Config,e),s.Config.breakpoints=e.breakpoints??s.Config.breakpoints},hasElementsWithAttributes:(e,t)=>e.some((e=>t.some((t=>Object.keys(e.attributes).includes(t))))),generateRandomName:()=>Math.random().toString(36).substring(2,10),kebabCase:e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),debounce(e,t){let r;return function(...i){clearTimeout(r),r=setTimeout((()=>{clearTimeout(r),e(...i)}),t)}},getBreakpointMaxWidth(e){const t=e.match(/\(max-width:\s*(\d+)px\)/),r=e.match(/\(min-width:\s*(\d+)px\)/);return t?parseInt(t[1]):r?1/0:0}},i={parsers:{timeline:{flow:["disallowEmpty","parseTimelineValue"],responsive:!0},from:{flow:["disallowEmpty","parseObjectAttribute","parseJsonToObjectOrArray","normalizeAttributeValues"],responsive:!0},to:{flow:["disallowEmpty","parseObjectAttribute","parseJsonToObjectOrArray","normalizeAttributeValues"],responsive:!0},keyframes:{flow:["disallowEmpty","parseObjectAttribute","parseJsonToObjectOrArray","normalizeAttributeValues","parseKeyframesValue"],responsive:!0},options:{flow:["disallowEmpty","parseObjectAttribute","parseJsonToObjectOrArray","normalizeAttributeValues"],responsive:!0},target:{flow:["parseSelectorValue"],responsive:!1},on:{flow:["disallowEmpty","parseOnValue"],responsive:!0},action:{flow:["disallowEmpty","parseActionValue"],responsive:!0},scroll:{flow:["parseObjectAttribute","parseJsonToObjectOrArray","normalizeAttributeValues"],responsive:!0},splittext:{flow:["parseSplitTextValue"],responsive:!0},pause:{flow:["parseEmptyValue"],responsive:!0}},parseElements(){const e=Array.from(new Set([...this.getAnimatableElements(),...this.getAnimatableElementsByPreset()]));if(e)return this.processAttributes(e)},getAnimatableElementsByPreset:()=>s.Config.presets?Object.entries(s.Config.presets).flatMap((([e,t])=>{const i=`${s.Config.prefix}${r.kebabCase(e)}`;return[...document.getElementsByClassName(i)].map((t=>(t.setAttribute(`${s.Config.prefix}preset`,e),t)))})):[],processAttributes(e){if(!e)return;let r=[];return e.forEach((e=>{try{r.push(this.parseSingleElement(e))}catch{return t.error("Can't parse element:",e),r}})),r=this.propagateBreakpoints(r),r},parseSingleElement(e){const t=this.parseElementAttributes(e);return{element:e,attributes:t,targets:this.getTargets({element:e,attributes:t})}},propagateBreakpoints(e){const t=Object.keys(s.Config.breakpoints).sort(((e,t)=>{const i=r.getBreakpointMaxWidth(s.Config.breakpoints[e]);return r.getBreakpointMaxWidth(s.Config.breakpoints[t])-i}));return e.map((e=>{for(const[i,n]of Object.entries(e.attributes))if(this.parsers[i]&&this.parsers[i].responsive){const o="default"in n;Object.keys(n).filter((e=>"default"!==e&&e in s.Config.breakpoints));let a={};o&&(a=r.deepMergeObjects({},n.default)),t.forEach((t=>{t in n&&(a=r.deepMergeObjects(a,n[t])),e.attributes[i][t]=r.deepMergeObjects({},a)})),o&&delete e.attributes[i].default}return e}))},getTargets(e){if("&"===e.attributes?.target||!e.attributes?.target)return[e.element];const t=e.attributes.target.trim(),r=t.slice(1).trim();if(t.startsWith("&")){const t=this.getMatchedElements(e.element,r);return t.length?t:[e.element]}return document.querySelectorAll(t)},getMatchedElements:(e,t)=>t.match(/^([.#\[])/)&&e.matches(t)?[e]:t.startsWith(">")?[...e.children].filter((e=>e.matches(t.slice(1).trim()))):[...e.querySelectorAll(t)],getAnimatableElements:()=>Array.from(document.querySelectorAll("*")).filter((e=>Array.from(e.attributes).some((e=>e.name.startsWith(s.Config.prefix))))),parseElementAttributes(e){let r={},i=null;if(Array.from(e.attributes).forEach((n=>{if(n.name!==`${s.Config.prefix}preset`){if(n.name.startsWith(s.Config.prefix)){const i=this.extractAttributeComponents(n.name);if(!i)return;const{type:s,breakpoint:o}=i;if(!this.parsers[s])return void t.warn(`Unknown attribute: ${n.name}`);let a=this.runParsers(e,s,n.value);a?(r[s]=r[s]??{},r[s][o]=a,r[s]=this.checkIfResponsiveAttribute(r[s],s)):t.warn(`Error parsing "${s}" attribute value: ${n.value}`)}}else i=n.value.trim()})),i){const t=this.parsePresetAttributes(i,e);this.deepMergeAttributes(r,t)}return r},extractAttributeComponents(e){const r=e.slice(s.Config.prefix.length).match(/^([a-zA-Z]+)(?:-([a-zA-Z0-9]+))?$/);return r[2]&&!s.Config.breakpoints[r[2]]?(t.warn(`Invalid breakpoint: ${r[2]}`),null):r?{type:r[1],breakpoint:r[2]||"default"}:null},runParsers(e,t,r){try{let i={},s=null;for(const n of this.parsers[t].flow)i=s?this[n](s,e):this[n](r,e),s=i;return i}catch(e){return null}},disallowEmpty(e,t){if(""===e)throw new Error("Empty value for attribute is not allowed");return e},checkIfResponsiveAttribute:(e,t)=>i.parsers[t].responsive?e:e[Object.keys(e)[0]],parsePresetAttributes(e,r){const i=s.Config.presets[e];return i?Object.entries(i).reduce(((i,[n,o])=>{if("selector"===n)return i;const[,a,l="default"]=n.match(/^([a-zA-Z]+)(?:-([a-zA-Z0-9]+))?$/)||[];if(!a||!this.parsers[a])return t.warn(`Invalid or unknown preset attribute: "${n}"`),i;if("default"!==l&&!s.Config.breakpoints[l])return t.warn(`Invalid breakpoint "${l}" in preset "${e}" for type "${a}"`),i;let u=this.runParsers(r,a,o);return u?i[a]={...i[a],[l]:u}:t.warn(`Error parsing "${a}" attribute value: ${o}`),i}),{}):(t.warn(`Preset "${e}" not found`),{})},parseObjectAttribute(e,t){return"object"==typeof e?e:(e=this.resolveVariables(e,t),e=(e=this.escapeCommas(e)).replace(/'/g,'"').replace(/\s+/g," ").trim().replace(/(^|[,{]\s*)([^\s,"'{}[\]:]+)(\s*:)/g,'$1"$2"$3').replace(/(:\s*)([^,{}\[\]\s][^,{}\[\]]*)(?=[,}\]]|$)/g,((e,t,r)=>{const i=r.trim();return i.startsWith("[")||i.startsWith("{")||/^-?\d+(\.\d+)?$/.test(i)||/^(true|false|null)$/i.test(i)?`${t}${i}`:/^".*"$/.test(i)?e:`${t}"${i}"`})).replace(/__COMMA__/g,","))},escapeCommas(e){let t="",r=0,i=!1,s="";const n={"(":")","[":"]","{":"}"},o=[];for(let a=0;a<e.length;a++){const l=e[a];i?(t+=l,l===s&&(i=!1)):'"'===l||"'"===l?(i=!0,s=l,t+=l):n[l]?(o.push(n[l]),r++,t+=l):o.length>0&&l===o[o.length-1]?(o.pop(),r--,t+=l):t+=","===l&&r>0?"__COMMA__":l}return t},deepMergeAttributes(e,t){for(const[i,s]of Object.entries(t))if(e[i])for(const[t,n]of Object.entries(s))e[i][t]?e[i][t]=r.deepMergeObjects(e[i][t],n):e[i][t]=n;else e[i]=r.deepMergeObjects({},s)},resolveVariables(e,t){let r=e.replace(/var\((--[^)]+)\)/g,((e,r)=>getComputedStyle(t).getPropertyValue(r).trim()||"undefined"));return r=r.replace(/\${([^}]+)}/g,((e,r)=>this.evaluateExpression(r.trim(),this.getElementContext(t)))),r},evaluateExpression:(()=>{const e=new Map;return(r,i)=>{e.has(r)||e.set(r,new Function('"use strict";return ('+r+")"));try{return e.get(r).call(i)}catch(e){return void t.error(`Error evaluating expression: ${r}`,e)}}})(),getElementContext:e=>({$element:e,window:window,document:document}),parseJsonToObjectOrArray(e,r){if("object"==typeof e)return e;try{return JSON.parse(`{${e}}`)}catch(r){try{return JSON.parse(`[${e}]`)}catch(r){return t.error("Error parsing attribute value:",e,r),null}}},normalizeAttributeValues(e,t=0,r=100){return t>r?(s.debug.error("Maximum recursion depth exceeded in normalizeAttributeValues"),e):Array.isArray(e)?e.map((e=>this.normalizeAttributeValues(e,t+1,r))):null!==e&&"object"==typeof e?Object.fromEntries(Object.entries(e).map((([e,i])=>[e,this.normalizeAttributeValues(i,t+1,r)]))):this.normalizeValue(e)},normalizeValue(e){if("number"==typeof e)return e;if("string"!=typeof e)return e;const t=e.trim();return/^-?\d+(\.\d+)?$/.test(t)?Number(t):/^(true|false)$/i.test(t)?"true"===t.toLowerCase():e},parseTimelineValue(e){const t=e.split(/,(?![^{}]*})/).map((e=>e.trim()));if(t.length>3)throw new Error(`Invalid timeline value: ${e}. Expected format: name[, position][, properties]`);return 1===t.length?{name:String(t[0]),position:null}:2===t.length?{name:t[0],position:this.normalizeValue(t[1])}:{name:t[0],position:this.normalizeValue(t[1]),options:this.normalizeAttributeValues(this.parseJsonToObjectOrArray(this.parseObjectAttribute(t[2],null),null))[0]}},parseSelectorValue:(e,t)=>e.trim(),parseOnValue:(e,t)=>({events:e.split(",").map((e=>e.trim()))}),parseActionValue(e,t){const[r,i,...s]=e.split(/,(?![^{}]*})/).map((e=>e.trim()));if(!i||!r)throw new Error(`Invalid action format: "${e}", needs at least target and action.`);const n=s.join(",").trim();return{action:r,target:i,arguments:n?n.startsWith("{")&&n.endsWith("}")?this.normalizeAttributeValues(this.parseJsonToObjectOrArray(this.parseObjectAttribute(n,t),t)):this.normalizeValue(n):{}}},parseKeyframesValue:(e,t)=>e,parseSplitTextValue(e,t){if("object"==typeof e)return e;if(e.includes(":"))return e=this.parseObjectAttribute(e,t),e=this.parseJsonToObjectOrArray(e,t),e=this.normalizeAttributeValues(e);return{type:e.split(",").map((e=>e.trim())).filter((e=>e.length>0)).join(", ")}},parseEmptyValue:(e,t)=>!0,getTimelines(e){const t={},i=(e,i)=>{const{attributes:s,element:n,targets:o}=e,a=s.timeline?.[i]?.name??s.timeline?.default?.name??(n.id.length?n.id:null)??r.generateRandomName();t[i]??={},t[i][a]??={animations:[],options:{}};const l=Object.fromEntries(Object.entries(s).filter((([,e])=>e[i]||e.default&&"default"===i)).map((([e,t])=>[e,t[i]??t.default])));t[i][a].animations.push({element:n,attributes:l,targets:o}),0===Object.keys(t[i][a].options).length&&(t[i][a].options=this.getTimelineOptions(s.timeline))};return e.forEach((e=>{const t=new Set(Object.values(e.attributes).flatMap((e=>Object.keys(e))));t.has("default")&&(t.delete("default"),i(e,"default")),t.forEach((t=>i(e,t)))})),Object.fromEntries(Object.entries(t).filter((([e])=>isNaN(e))))},getTimelineOptions(e){if(!e)return{};for(const t in e)if(e[t]&&e[t].options)return e[t].options;return{}}},s={debug:t,utils:r,Parser:i,Config:e,engines:{},registerEngine(e,t,r){s.engines[e]={},s.engines[e].engineClass=t,s.engines[e].plugins=r},init(t=null){if(!s.engines)return;t&&s.utils.mergeConfig(t);const r=i.parseElements(),n=i.getTimelines(r),o=s.engines[e.engine].engineClass;if(!o)return void this.debug.error(`Incorrect animation engine: ${s.Config.engine}`);const a=new o(r,n);a.init&&"function"==typeof a.init&&a.init(s.Config)}};s.registerEngine("gsap",class{gsapTimelines=[];elements=[];timelines={};matchMedia=null;gsap=null;plugins=null;handlersSet=!1;defaults={scrollTrigger:{start:"top 90%",end:"bottom 10%",toggleActions:"play reverse play reverse",scrub:!1,invalidateOnRefresh:!0},scrollSmoother:{enabled:!1,options:{smooth:1,effects:!0,smoothTouch:.1}},allDefaults:{force3D:!0,lazy:!1},actions:{}};constructor(e,t){this.elements=e,this.timelines=t,this.defaults.actions={play:this.createTimelineAction("play"),pause:this.createTimelineAction("pause"),restart:this.createTimelineAction("restart"),reverse:this.createTimelineAction("reverse"),toggle:(e,t,r,i)=>{const s=this.getTimelineByName(e,i);s&&(s.reversed()?s.play():s.reverse())}}}createTimelineAction(e){return(t,r,i,s)=>{const n=this.getTimelineByName(t,s);n&&"function"==typeof n[e]&&n[e]()}}init(e){s.Config=e,s.Config?.plugins?.gsap||window.gsap?(this.gsap=s.Config?.plugins?.gsap||window.gsap,this.plugins=s.Config?.plugins||{},this.loadRequiredPlugins(this.elements),this.initScrollSmoother(),this.matchMedia=this.gsap.matchMedia(),this.animate(),this.initMutationObserver()):s.debug.error("GSAP core not found")}loadRequiredPlugins(e){const t={scroll:"ScrollTrigger",splittext:"SplitText"};for(const[r,i]of Object.entries(t))s.utils.hasElementsWithAttributes(e,[r])&&(this.plugins[i]=this.plugins?.[i]||window[i],this.gsap.registerPlugin(this.plugins[i]))}animate(){if(this.timelines){this.cleanupContexts(),this.contexts=[];for(const[e,t]of Object.entries(this.timelines)){const r=this.matchMedia.add(s.Config.breakpoints[e],(r=>{for(let[r,i]of Object.entries(t)){i=this.prepareTimeline(i);const t={...this.getScrollTrigger(i,i?.scrollElement)},s=this.gsap.timeline({...i.options,...t});i.pause&&s.pause(),this.gsapTimelines.push({name:r,breakpoint:e,timeline:s}),i.animations.forEach((e=>{const t=this.createSingleAnimation(e);s.add(t,e.attributes?.timeline?.position??0)}))}this.setupEventActions(e,r),this.plugins.ScrollTrigger?.refresh()}));this.contexts.push(r)}this.handleResize(),this.handlePageShow(),this.handleLoad(),this.handlersSet=!0}}cleanupContexts(){this.contexts?.forEach((e=>e.revert())),this.contexts=[]}setupEventActions(e,t){this.elements.forEach((({attributes:r,targets:i})=>{const s=r?.on?.[e],n=r?.action?.[e];if(s&&n){s.events.forEach((r=>{i.forEach((i=>{const s=t=>{this.handleAction(n.action,n.target,n.arguments,t,e)};t.add((()=>(i.addEventListener(r,s),()=>i.removeEventListener(r,s))))}))}))}}))}handleAction(e,t,r,i,n){const o=this.defaults.actions[e]||s.Config.actions?.[e];if("function"==typeof o)return o(t,i,r,n);s.debug.warn(`Action "${e}" not found.`)}getTimelineByName(e,t){return this.gsapTimelines.find((r=>r.name===e&&r.breakpoint===t))?.timeline||null}refresh(){window.scrollTo(0,0),this.gsapTimelines.forEach((e=>e.timeline.restart())),this.plugins.ScrollTrigger?.update(),this.plugins.ScrollTrigger?.refresh(),this.plugins.ScrollTrigger?.getAll().forEach((e=>{e.update(),e.refresh()}))}handleLoad(){this.handlersSet||window.addEventListener("load",(()=>this.refresh()))}handleResize(){this.handlersSet||window.addEventListener("resize",s.utils.debounce((()=>this.reinitializeAnimations()),100),{passive:!0})}handlePageShow(){this.handlersSet||window.addEventListener("pageshow",(e=>e.persisted&&(this.refresh(),this.animate())))}getConfig(e){return s.Config[e]??this.defaults[e]??null}getScrollTrigger(e,t){const r=e.scroll;if(!r)return{};return{scrollTrigger:{trigger:t,...Object.keys(r).length?r:this.getConfig("scrollTrigger")}}}getSplitText(e,t){const r=e.splittext;if(!r)return t;const i=new this.plugins.SplitText(t,r),s=(r.type||"").split(",").map((e=>e.trim())),n={chars:i.chars,words:i.words,lines:i.lines},o=s.reduce(((e,t)=>e.concat(n[t]||[])),[]);return o.length?o:t}prepareTimeline(e){let t=null,r=!1;for(const i of e.animations){const{attributes:e}=i;e?.scroll&&!t&&(t={scroll:e.scroll,scrollElement:i.element},delete e.scroll),e?.pause&&!r&&(r=!0,delete e.pause)}return{...e,...t,pause:r}}createSingleAnimation(e){const{element:t,attributes:r,targets:i}=e,s={...this.getConfig("allDefaults")},n=this.getSplitText(r,i);r.scroll&&(s.scrollTrigger={trigger:t,...r.scroll});const{from:o,to:a,keyframes:l}=r,u=l?"to":o&&a?"fromTo":o?"from":"to",c={...r.options,...s};switch(u){case"to":return this.gsap.to(n,{...l?{keyframes:l}:a,...c});case"from":return this.gsap.from(n,{...o,...c});case"fromTo":return this.gsap.fromTo(n,o,{...a,...c})}}initScrollSmoother(){const e=this.getConfig("scrollSmoother");if(!e?.enabled)return;this.plugins.ScrollSmoother=this.plugins?.ScrollSmoother||window.ScrollSmoother,this.gsap.registerPlugin(this.plugins.ScrollSmoother);document.querySelector("#smooth-content")?this.plugins.ScrollSmoother.create({...e.options,wrapper:"#smooth-wrapper",content:"#smooth-content"}):s.debug.error("ScrollSmoother: No #smooth-content found")}initMutationObserver(){this.mutationObserver=new MutationObserver((e=>{const t=[],r=[];e.forEach((e=>{"childList"===e.type&&["addedNodes","removedNodes"].forEach((i=>{e[i].forEach((e=>{if(e.nodeType===Node.ELEMENT_NODE){const s=this.getAnimatableElements(e);s.length&&("addedNodes"===i?t:r).push(...s)}}))}))})),t.length&&this.initializeAnimationsForElements(t),r.length&&this.cleanupAnimationsForElements(r)})),this.mutationObserver.observe(document.body,{childList:!0,subtree:!0,attributes:!0})}initializeAnimationsForElements(e){requestAnimationFrame((()=>{e.forEach((e=>e.offsetHeight));const t=s.Parser.processAttributes(e),r=s.Parser.getTimelines(t),i=Object.entries(s.Config.breakpoints).find((([e,t])=>window.matchMedia(t).matches))?.[0];if(!i)return void s.debug.warn("No matching breakpoint found for current viewport");const n=r[i]||r.default;if(n){for(let[e,t]of Object.entries(n)){t=this.prepareTimeline(t);const r={...this.getScrollTrigger(t,t?.scrollElement)},s=this.gsap.timeline({...t.options,...r});t.pause&&s.pause(),this.gsapTimelines.push({name:e,breakpoint:i,timeline:s}),t.animations.forEach((e=>{const t=this.createSingleAnimation(e);s.add(t,e.attributes?.timeline?.position??0)}))}this.plugins.ScrollTrigger?.refresh(!0)}else s.debug.warn(`No timelines found for current breakpoint: ${i}`)}))}getAnimatableElements(e){const t=this.isAnimatableElement(e)?[e]:[];return t.push(...e.querySelectorAll(`[${s.Config.prefix}from], [${s.Config.prefix}to], [${s.Config.prefix}keyframes]`)),t}isAnimatableElement(e){return e.attributes&&[...e.attributes].some((e=>e.name.startsWith(s.Config.prefix)))}cleanupAnimationsForElements(e){e?.length&&(e.forEach((e=>{this.gsapTimelines=this.gsapTimelines.filter((({timeline:t})=>!t.getChildren().some((t=>t.targets().includes(e)))||(t.kill(),!1)))})),this.plugins.ScrollTrigger?.refresh())}reinitializeAnimations(){this.cleanup(),this.elements=s.Parser.parseElements(),this.timelines=s.Parser.getTimelines(this.elements),this.animate(),this.initMutationObserver()}cleanup(){this.cleanupContexts(),this.gsapTimelines.forEach((({timeline:e})=>e.kill())),this.gsapTimelines=[],this.plugins.ScrollTrigger?.getAll().forEach((e=>e.kill())),this.mutationObserver?.disconnect(),this.mutationObserver=null}});export{s as default};
//# sourceMappingURL=af-gsap.esm.js.map
