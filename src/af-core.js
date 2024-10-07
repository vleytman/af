let Config = {
  prefix: 'af-',
  breakpoints: {
    sm: '(max-width: 640px)',
    md: '(min-width: 641px) and (max-width: 768px)',
    lg: '(min-width: 769px) and (max-width: 1024px)',
    xl: '(min-width: 1025px) and (max-width: 1280px)',
    xxl: '(min-width: 1281px)',
  },
  engine: 'gsap',
  debug: true,
}

let AnimationEngine = {}

const debug = {
  log: (...args) => { AF.Config.debug && console.log('[AF]', ...args) },
  warn: (...args) => { AF.Config.debug && console.warn('[AF]', ...args) },
  error: (...args) => { AF.Config.debug && console.error('[AF]', ...args) },
}

const utils = {

  deepMergeObjects (target, source) {
    if (Array.isArray(target) && Array.isArray(source)) {
      return source.slice()
    } else if (Array.isArray(source)) {
      return source.slice()
    } else if (Array.isArray(target)) {
      return source
    } else if (typeof target === 'object' && typeof source === 'object' && target !== null && source !== null) {
      const output = { ...target }
      Object.keys(source).forEach(key => {
        output[key] = this.deepMergeObjects(target[key], source[key])
      })
      return output
    } else {
      return source
    }
  },

  mergeConfig (config) {
    AF.Config = this.deepMergeObjects(AF.Config, config)
    AF.Config.breakpoints = config.breakpoints ?? AF.Config.breakpoints
  },

  hasElementsWithAttributes (elements, attributes) {
    return elements.some(element => attributes.some(attr => Object.keys(element.attributes).includes(attr)))
  },

  generateRandomName () {
    return Math.random().toString(36).substring(2, 10)
  },

  kebabCase (str) {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
  },

  debounce (func, wait) {
    let timeout
    return function executedFunction (...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  },

  getBreakpointMaxWidth (query) {
    const maxWidthMatch = query.match(/\(max-width:\s*(\d+)px\)/)
    const minWidthMatch = query.match(/\(min-width:\s*(\d+)px\)/)
    if (maxWidthMatch) {
      return parseInt(maxWidthMatch[1])
    } else if (minWidthMatch) {
      return Infinity
    }
    return 0
  },

}

const Parser = {

  parsers: {
    timeline: { flow: ['disallowEmpty', 'parseTimelineValue'], responsive: true },
    from: { flow: ['disallowEmpty', 'parseObjectAttribute', 'parseJsonToObjectOrArray', 'normalizeAttributeValues'], responsive: true },
    to: { flow: ['disallowEmpty', 'parseObjectAttribute', 'parseJsonToObjectOrArray', 'normalizeAttributeValues'], responsive: true },
    keyframes: { flow: ['disallowEmpty', 'parseObjectAttribute', 'parseJsonToObjectOrArray', 'normalizeAttributeValues', 'parseKeyframesValue'], responsive: true },
    options: { flow: ['disallowEmpty', 'parseObjectAttribute', 'parseJsonToObjectOrArray', 'normalizeAttributeValues'], responsive: true },
    target: { flow: ['parseSelectorValue'], responsive: false },
    on: { flow: ['disallowEmpty', 'parseOnValue'], responsive: true },
    action: { flow: ['disallowEmpty', 'parseActionValue'], responsive: true },
    scroll: { flow: ['parseObjectAttribute', 'parseJsonToObjectOrArray', 'normalizeAttributeValues'], responsive: true },
    splittext: { flow: ['parseSplitTextValue'], responsive: true },
    pause: { flow: ['parseEmptyValue'], responsive: true },
  },

  parseElements () {
    const elements = Array.from(new Set([...this.getAnimatableElements(), ...this.getAnimatableElementsByPreset()]))
    if (!elements) return
    return this.processAttributes(elements)
  },

  getAnimatableElementsByPreset () {
    if (!AF.Config.presets) return []
    return Object.entries(AF.Config.presets).flatMap(([presetName, preset]) => {
      const className = `${AF.Config.prefix}${utils.kebabCase(presetName)}`
      return [...document.getElementsByClassName(className)].map(element => {
        element.setAttribute(`${AF.Config.prefix}preset`, presetName)
        return element
      })
    })
  },

  processAttributes (elements) {
    if (!elements) return
    let parsedElements = []
    elements.forEach(element => {
      try {
        parsedElements.push(this.parseSingleElement(element))
      } catch {
        debug.error(`Can't parse element:`, element)
        return parsedElements
      }
    })
    parsedElements = this.propagateBreakpoints(parsedElements)
    return parsedElements
  },

  parseSingleElement (element) {
    const attributes = this.parseElementAttributes(element)
    const targets = this.getTargets({ element, attributes })
    return { element, attributes, targets }
  },

  propagateBreakpoints (data) {
    const configBreakpoints = Object.keys(AF.Config.breakpoints).sort((a, b) => {
      const aWidth = utils.getBreakpointMaxWidth(AF.Config.breakpoints[a])
      const bWidth = utils.getBreakpointMaxWidth(AF.Config.breakpoints[b])
      return bWidth - aWidth
    })
    return data.map(element => {
      for (const [attrKey, attrValue] of Object.entries(element.attributes)) {
        if (this.parsers[attrKey] && this.parsers[attrKey].responsive) {
          const hasDefault = 'default' in attrValue
          const presentBreakpoints = Object.keys(attrValue).filter(bp => bp !== 'default' && bp in AF.Config.breakpoints)
          let propagatedValues = {}
          if (hasDefault) {
            propagatedValues = utils.deepMergeObjects({}, attrValue.default)
          }
          configBreakpoints.forEach(bp => {
            if (bp in attrValue) {
              propagatedValues = utils.deepMergeObjects(propagatedValues, attrValue[bp])
            }
            element.attributes[attrKey][bp] = utils.deepMergeObjects({}, propagatedValues)
          })
          if (hasDefault) {
            delete element.attributes[attrKey].default
          }
        }
      }
      return element
    })
  },

  getTargets (elementData) {
    if (elementData.attributes?.target === '&' || !elementData.attributes?.target) return [elementData.element]
    const targetSelector = elementData.attributes.target.trim()
    const subSelector = targetSelector.slice(1).trim()
    if (targetSelector.startsWith('&')) {
      const matchedElements = this.getMatchedElements(elementData.element, subSelector)
      return matchedElements.length ? matchedElements : [elementData.element]
    }
    return document.querySelectorAll(targetSelector)
  },

  getMatchedElements (element, subSelector) {
    if (subSelector.match(/^([.#\[])/) && element.matches(subSelector)) return [element]
    if (subSelector.startsWith('>')) return [...element.children].filter(child => child.matches(subSelector.slice(1).trim()))
    return [...element.querySelectorAll(subSelector)]
  },

  getAnimatableElements () {
    const elements = Array.from(document.querySelectorAll('*'))
    return elements.filter(element =>
      Array.from(element.attributes).some(attr => attr.name.startsWith(AF.Config.prefix))
    )
  },

  parseElementAttributes (element) {
    let parsedAttributes = {}
    let presetName = null
    Array.from(element.attributes).forEach(attr => {
      if (attr.name === `${AF.Config.prefix}preset`) {
        presetName = attr.value.trim()
        return
      }
      if (attr.name.startsWith(AF.Config.prefix)) {
        const components = this.extractAttributeComponents(attr.name)
        if (!components) return
        const { type, breakpoint } = components
        if (!this.parsers[type]) {
          debug.warn(`Unknown attribute: ${attr.name}`)
          return
        }
        let parsedData = this.runParsers(element, type, attr.value)
        if (parsedData) {
          parsedAttributes[type] = parsedAttributes[type] ?? {}
          parsedAttributes[type][breakpoint] = parsedData
          parsedAttributes[type] = this.checkIfResponsiveAttribute(parsedAttributes[type], type)
        } else {
          debug.warn(`Error parsing "${type}" attribute value: ${attr.value}`)
        }
      }
    })
    if (presetName) {
      const presetAttributes = this.parsePresetAttributes(presetName, element)
      this.deepMergeAttributes(parsedAttributes, presetAttributes)
    }
    return parsedAttributes
  },

  extractAttributeComponents (attrName) {
    const attrUnprefixedName = attrName.slice(AF.Config.prefix.length)
    const match = attrUnprefixedName.match(/^([a-zA-Z]+)(?:-([a-zA-Z0-9]+))?$/)
    if (match[2] && !AF.Config.breakpoints[match[2]]) {
      debug.warn(`Invalid breakpoint: ${match[2]}`)
      return null
    }
    return match ? { type: match[1], breakpoint: match[2] || 'default' } : null
  },

  runParsers (element, type, value) {
    try {
      let parsedData = {}
      let lastValue = null
      for (const parser of this.parsers[type].flow) {
        parsedData = lastValue ? this[parser](lastValue, element) : this[parser](value, element)
        lastValue = parsedData
      }
      return parsedData
    } catch (error) {
      return null
    }
  },

  disallowEmpty (value, element) {
    if (value === '') throw new Error(`Empty value for attribute is not allowed`)
    return value
  },

  checkIfResponsiveAttribute (data, type) {
    return !Parser.parsers[type].responsive ? data[Object.keys(data)[0]] : data
  },

  parsePresetAttributes (presetName, element) {
    const preset = AF.Config.presets[presetName]
    if (!preset) {
      debug.warn(`Preset "${presetName}" not found`)
      return {}
    }
    return Object.entries(preset).reduce((presetAttrs, [attrName, attrValue]) => {
      if (attrName === 'selector') return presetAttrs
      const [, type, breakpoint = 'default'] = attrName.match(/^([a-zA-Z]+)(?:-([a-zA-Z0-9]+))?$/) || []
      if (!type || !this.parsers[type]) {
        debug.warn(`Invalid or unknown preset attribute: "${attrName}"`)
        return presetAttrs
      }
      if (breakpoint !== 'default' && !AF.Config.breakpoints[breakpoint]) {
        debug.warn(`Invalid breakpoint "${breakpoint}" in preset "${presetName}" for type "${type}"`)
        return presetAttrs
      }
      let parsedData = this.runParsers(element, type, attrValue)
      if (parsedData) {
        presetAttrs[type] = { ...presetAttrs[type], [breakpoint]: parsedData }
      } else {
        debug.warn(`Error parsing "${type}" attribute value: ${attrValue}`)
      }
      return presetAttrs
    }, {})
  },

  parseObjectAttribute (value, element) {
    if (typeof value === 'object') return value // Already parsed
    value = this.resolveVariables(value, element) // Resolve variables
    value = this.escapeCommas(value) // Escape commas inside brackets
    value = value.replace(/'/g, '"') // Single quotes => double quotes
      .replace(/\s+/g, ' ').trim() // Normalize whitespace
      .replace(/(^|[,{]\s*)([^\s,"'{}[\]:]+)(\s*:)/g, '$1"$2"$3') // Quote keys (including at the start of the string)
      .replace(/(:\s*)([^,{}\[\]\s][^,{}\[\]]*)(?=[,}\]]|$)/g, (match, p1, p2) => { // Quote values, skipping arrays and objects
        const trimmedValue = p2.trim()
        if (trimmedValue.startsWith('[') || trimmedValue.startsWith('{')) return `${p1}${trimmedValue}` // Skip arrays and objects
        if (/^-?\d+(\.\d+)?$/.test(trimmedValue) || /^(true|false|null)$/i.test(trimmedValue)) return `${p1}${trimmedValue}` // Do not quote numbers, booleans, null
        if (!/^".*"$/.test(trimmedValue)) return `${p1}"${trimmedValue}"` // Quote if not already quoted
        return match
      })
      .replace(/__COMMA__/g, ',')

    return value
  },

  escapeCommas (str) {
    let result = ''
    let depth = 0
    let inQuote = false
    let quoteChar = ''
    const brackets = {
      '(': ')',
      '[': ']',
      '{': '}',
    }
    const stack = []

    for (let i = 0; i < str.length; i++) {
      const c = str[i]

      if (inQuote) {
        result += c
        if (c === quoteChar) {
          inQuote = false
        }
      } else if (c === '"' || c === '\'') {
        inQuote = true
        quoteChar = c
        result += c
      } else if (brackets[c]) {
        stack.push(brackets[c])
        depth++
        result += c
      } else if (stack.length > 0 && c === stack[stack.length - 1]) {
        stack.pop()
        depth--
        result += c
      } else if (c === ',' && depth > 0) {
        result += '__COMMA__'
      } else {
        result += c
      }
    }
    return result
  },

  deepMergeAttributes (target, source) {
    for (const [type, typeData] of Object.entries(source)) {
      if (!target[type]) {
        target[type] = utils.deepMergeObjects({}, typeData)
        continue
      }
      for (const [breakpoint, value] of Object.entries(typeData)) {
        if (!target[type][breakpoint]) {
          target[type][breakpoint] = value
        } else {
          target[type][breakpoint] = utils.deepMergeObjects(target[type][breakpoint], value)
        }
      }
    }
  },

  resolveVariables (str, element) {
    let resolvedStr = str.replace(/var\((--[^)]+)\)/g, (match, varName) => {
      const computedValue = getComputedStyle(element).getPropertyValue(varName).trim()
      return computedValue || 'undefined'
    })
    resolvedStr = resolvedStr.replace(/\${([^}]+)}/g, (_, p1) => this.evaluateExpression(p1.trim(), this.getElementContext(element)))
    return resolvedStr
  },

  evaluateExpression: (() => {
    const cache = new Map()
    return (expression, context) => {
      if (!cache.has(expression)) cache.set(expression, new Function('"use strict";return (' + expression + ')'))
      try {
        return cache.get(expression).call(context)
      } catch (error) {
        debug.error(`Error evaluating expression: ${expression}`, error)
        return undefined
      }
    }
  })(),

  getElementContext (element) {
    return {
      $element: element,
      window,
      document,
    }
  },

  parseJsonToObjectOrArray (value, element) {
    if (typeof value === 'object') return value
    try {
      return JSON.parse(`{${value}}`)
    } catch (error1) {
      try {
        return JSON.parse(`[${value}]`)
      } catch (error2) {
        debug.error('Error parsing attribute value:', value, error2)
        return null
      }
    }
  },

  normalizeAttributeValues (data, depth = 0, maxDepth = 100) {
    if (depth > maxDepth) {
      AF.debug.error('Maximum recursion depth exceeded in normalizeAttributeValues')
      return data
    }
    if (Array.isArray(data)) {
      return data.map(value => this.normalizeAttributeValues(value, depth + 1, maxDepth))
    }
    if (data !== null && typeof data === 'object') {
      return Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, this.normalizeAttributeValues(value, depth + 1, maxDepth)])
      )
    }
    return this.normalizeValue(data)
  },

  normalizeValue (value) {
    if (typeof value === 'number') return value
    if (typeof value !== 'string') return value
    const trimmed = value.trim()
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed)
    if (/^(true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === 'true'
    return value
  },

  parseTimelineValue (value) {
    const parts = value.split(/,(?![^{}]*})/).map(s => s.trim())
    if (parts.length > 3) throw new Error(`Invalid timeline value: ${value}. Expected format: name[, position][, properties]`)
    return parts.length === 1 ? { name: String(parts[0]), position: null } : parts.length === 2 ? { name: parts[0], position: this.normalizeValue(parts[1]) } : {
      name: parts[0],
      position: this.normalizeValue(parts[1]),
      options: this.normalizeAttributeValues(this.parseJsonToObjectOrArray(this.parseObjectAttribute(parts[2], null), null))[0]
    }
  },

  parseSelectorValue (value, element) {
    return value.trim()
  },

  parseOnValue (value, element) {
    const parts = value.split(',').map(s => s.trim())
    return { events: parts }
  },

  parseActionValue (value, element) {
    const [action, target, ...argParts] = value.split(/,(?![^{}]*})/).map(s => s.trim())
    if (!target || !action) {
      throw new Error(`Invalid action format: "${value}", needs at least target and action.`)
    }
    const argStr = argParts.join(',').trim()
    const args = argStr ? argStr.startsWith('{') && argStr.endsWith('}')
      ? this.normalizeAttributeValues(this.parseJsonToObjectOrArray(this.parseObjectAttribute(argStr, element), element))
      : this.normalizeValue(argStr) : {}
    return {
      action, target,
      arguments: args
    }
  },

  parseKeyframesValue (value, element) {
    return value
  },

  parseSplitTextValue (value, element) {
    if (typeof value === 'object') return value
    if (value.includes(':')) {
      value = this.parseObjectAttribute(value, element)
      value = this.parseJsonToObjectOrArray(value, element)
      value = this.normalizeAttributeValues(value)
      return value
    }
    const types = value.split(',').map(s => s.trim()).filter(s => s.length > 0)
    return { type: types.join(', ') }
  },

  parseEmptyValue (value, element) {
    return true
  },

  getTimelines (elements) {
    const timelines = {}
    const processBreakpoint = (item, bp) => {
      const { attributes, element, targets } = item
      const timelineName = attributes.timeline?.[bp]?.name ?? attributes.timeline?.default?.name ?? (element.id.length ? element.id : null) ?? utils.generateRandomName()
      timelines[bp] ??= {}
      timelines[bp][timelineName] ??= { animations: [], options: {} }
      const bpAttrs = Object.fromEntries(
        Object.entries(attributes)
          .filter(([, value]) => value[bp] || (value.default && bp === 'default'))
          .map(([key, value]) => [key, value[bp] ?? value.default])
      )
      timelines[bp][timelineName].animations.push({ element, attributes: bpAttrs, targets })
      if (Object.keys(timelines[bp][timelineName].options).length === 0) {
        timelines[bp][timelineName].options = this.getTimelineOptions(attributes.timeline)
      }
    }
    elements.forEach(item => {
      const usedBreakpoints = new Set(Object.values(item.attributes).flatMap(attr => Object.keys(attr)))
      if (usedBreakpoints.has('default')) {
        usedBreakpoints.delete('default')
        processBreakpoint(item, 'default')
      }
      usedBreakpoints.forEach(bp => processBreakpoint(item, bp))
    })
    return Object.fromEntries(Object.entries(timelines).filter(([key]) => isNaN(key)))
  },

  getTimelineOptions (timeline) {
    if (!timeline) return {}
    for (const key in timeline) {
      if (timeline[key] && timeline[key].options) return timeline[key].options
    }
    return {}
  },

}

const AF = {

  debug,
  utils,
  Parser,
  Config,
  engines: {},

  registerEngine (name, engineClass, plugins) {
    AF.engines[name] = {}
    AF.engines[name].engineClass = engineClass
    AF.engines[name].plugins = plugins
  },

  init (config = null) {
    if (!AF.engines) return
    if (config) AF.utils.mergeConfig(config)
    const elements = Parser.parseElements()
    const timelines = Parser.getTimelines(elements)
    const EngineClass = AF.engines[Config.engine].engineClass
    if (!EngineClass) {
      this.debug.error(`Incorrect animation engine: ${AF.Config.engine}`)
      return
    }
    const animationEngine = new EngineClass(elements, timelines)
    if (animationEngine.init && typeof animationEngine.init === 'function') {
      animationEngine.init(AF.engines[Config.engine], AF.Config)
    }
  },

}

export default AF