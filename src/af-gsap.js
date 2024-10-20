import AF from './af-core.js'

class AFEngineGSAP {
  gsapTimelines = []
  elements = []
  timelines = {}
  matchMedia = null
  gsap = null
  plugins = null
  handlersSet = false

  defaults = {
    scrollTrigger: {
      start: 'top 90%',
      end: 'bottom 10%',
      toggleActions: 'play reverse play reverse',
      scrub: false,
      invalidateOnRefresh: true,
    },
    scrollSmoother: {
      enabled: false,
      options: {
        smooth: 1,
        effects: true,
        smoothTouch: 0.1,
      },
    },
    allDefaults: {
      force3D: true,
      lazy: false,
    },
    actions: {},
  }

  constructor (elements, timelines) {
    this.elements = elements
    this.timelines = timelines
    this.defaults.actions = {
      play: this.createTimelineAction('play'),
      pause: this.createTimelineAction('pause'),
      restart: this.createTimelineAction('restart'),
      reverse: this.createTimelineAction('reverse'),
      toggle: (target, event, args, breakpoint) => {
        const timeline = this.getTimelineByName(target, breakpoint)
        if (timeline) {
          timeline.reversed() ? timeline.play() : timeline.reverse()
        }
      },
    }
  }

  createTimelineAction (methodName) {
    return (target, event, args, breakpoint) => {
      const timeline = this.getTimelineByName(target, breakpoint)
      if (timeline && typeof timeline[methodName] === 'function') timeline[methodName]()
    }
  }

  init (config) {
    AF.Config = config
    if (!AF.Config?.plugins?.gsap && !window.gsap) {
      AF.debug.error('GSAP core not found')
      return
    }
    this.gsap = AF.Config?.plugins?.gsap || window.gsap
    this.plugins = AF.Config?.plugins || {}
    this.loadRequiredPlugins(this.elements)
    this.initScrollSmoother()
    this.matchMedia = this.gsap.matchMedia()
    this.animate()
    this.initMutationObserver()
  }

  loadRequiredPlugins (elements) {
    const pluginMap = {
      scroll: 'ScrollTrigger',
      splittext: 'SplitText',
    }

    for (const [attr, pluginName] of Object.entries(pluginMap)) {
      if (AF.utils.hasElementsWithAttributes(elements, [attr])) {
        this.plugins[pluginName] = this.plugins?.[pluginName] || window[pluginName]
        this.gsap.registerPlugin(this.plugins[pluginName])
      }
    }
  }

  animate () {
    if (!this.timelines) return
    this.cleanupContexts()
    this.contexts = []
    for (const [bp, timelines] of Object.entries(this.timelines)) {
      const context = this.matchMedia.add(AF.Config.breakpoints[bp], (ctx) => {
        for (let [tlName, tl] of Object.entries(timelines)) {
          tl = this.prepareTimeline(tl)
          const options = { ...this.getScrollTrigger(tl, tl?.scrollElement) }
          const tlInstance = this.gsap.timeline({ ...tl.options, ...options })
          if (tl.pause) tlInstance.pause()
          this.gsapTimelines.push({ name: tlName, breakpoint: bp, timeline: tlInstance })
          tl.animations.forEach(animation => {
            const animationInstance = this.createSingleAnimation(animation)
            tlInstance.add(animationInstance, animation.attributes?.timeline?.position ?? 0)
          })
        }
        this.setupEventActions(bp, ctx) // Using 'ctx' instead of 'context'
        this.plugins.ScrollTrigger?.refresh()
      })
      this.contexts.push(context)
    }
    this.handleResize()
    this.handlePageShow()
    this.handleLoad()
    this.handlersSet = true
  }

  cleanupContexts () {
    this.contexts?.forEach(context => context.revert())
    this.contexts = []
  }

  setupEventActions (breakpoint, context) {
    this.elements.forEach(({ attributes, targets }) => {
      const onAttrs = attributes?.on?.[breakpoint]
      const actionAttrs = attributes?.action?.[breakpoint]
      if (onAttrs && actionAttrs) {
        const events = onAttrs.events
        events.forEach(eventName => {
          targets.forEach(target => {
            const handler = event => {
              this.handleAction(actionAttrs.action, actionAttrs.target, actionAttrs.arguments, event, breakpoint)
            }
            context.add(() => {
              target.addEventListener(eventName, handler)
              return () => target.removeEventListener(eventName, handler)
            })
          })
        })
      }
    })
  }

  handleAction (actionName, actionTarget, actionArgs, event, breakpoint) {
    const action = this.defaults.actions[actionName] || AF.Config.actions?.[actionName]
    if (typeof action === 'function') return action(actionTarget, event, actionArgs, breakpoint)
    AF.debug.warn(`Action "${actionName}" not found.`)
  }

  getTimelineByName (name, breakpoint) {
    return this.gsapTimelines.find(tl => tl.name === name && tl.breakpoint === breakpoint)?.timeline || null
  }

  refresh () {
    window.scrollTo(0, 0)
    this.gsapTimelines.forEach(tl => tl.timeline.restart())
    this.plugins.ScrollTrigger?.update()
    this.plugins.ScrollTrigger?.refresh()
    this.plugins.ScrollTrigger?.getAll().forEach(trigger => {
      trigger.update()
      trigger.refresh()
    })
  }

  handleLoad () {
    if (this.handlersSet) return
    window.addEventListener('load', () => this.refresh())
  }

  handleResize () {
    if (this.handlersSet) return
    window.addEventListener('resize', AF.utils.debounce(() => this.reinitializeAnimations(), 100), { passive: true })
  }

  handlePageShow () {
    if (this.handlersSet) return
    window.addEventListener('pageshow', event => event.persisted && (this.refresh(), this.animate()))
  }

  getConfig (key) {
    return AF.Config[key] ?? this.defaults[key] ?? null
  }

  getScrollTrigger (attributes, element) {
    const scrollAttrs = attributes.scroll
    if (!scrollAttrs) return {}
    const scrollOptions = Object.keys(scrollAttrs).length ? scrollAttrs : this.getConfig('scrollTrigger')
    return { scrollTrigger: { trigger: element, ...scrollOptions } }
  }

  getSplitText (attributes, targets) {
    const splittext = attributes.splittext
    if (!splittext) return targets
    const split = new this.plugins.SplitText(targets, splittext)
    const types = (splittext.type || '').split(',').map(s => s.trim())
    const typeMap = { chars: split.chars, words: split.words, lines: split.lines }
    const animationTargets = types.reduce((acc, type) => acc.concat(typeMap[type] || []), [])
    return animationTargets.length ? animationTargets : targets
  }

  prepareTimeline (tl) {
    let scrollTrigger = null
    let pause = false
    for (const animation of tl.animations) {
      const { attributes } = animation
      if (attributes?.scroll && !scrollTrigger) {
        scrollTrigger = { scroll: attributes.scroll, scrollElement: animation.element }
        delete attributes.scroll
      }
      if (attributes?.pause && !pause) {
        pause = true
        delete attributes.pause
      }
    }
    return { ...tl, ...scrollTrigger, pause }
  }

  createSingleAnimation (animation) {
    const { element, attributes, targets } = animation
    const options = { ...this.getConfig('allDefaults') }
    const animationTargets = this.getSplitText(attributes, targets)
    if (attributes.scroll) {
      options.scrollTrigger = { trigger: element, ...attributes.scroll }
    }
    const { from, to, keyframes } = attributes
    const method = keyframes ? 'to' : from && to ? 'fromTo' : from ? 'from' : 'to'
    const tweenOptions = { ...attributes.options, ...options }
    switch (method) {
      case 'to':
        return this.gsap.to(animationTargets, { ...(keyframes ? { keyframes } : to), ...tweenOptions })
      case 'from':
        return this.gsap.from(animationTargets, { ...from, ...tweenOptions })
      case 'fromTo':
        return this.gsap.fromTo(animationTargets, from, { ...to, ...tweenOptions })
    }
  }

  initScrollSmoother () {
    const scrollSmootherConfig = this.getConfig('scrollSmoother')
    if (!scrollSmootherConfig?.enabled) return
    this.plugins.ScrollSmoother = this.plugins?.ScrollSmoother || window.ScrollSmoother
    this.gsap.registerPlugin(this.plugins.ScrollSmoother)
    const content = document.querySelector('#smooth-content')
    if (!content) {
      AF.debug.error('ScrollSmoother: No #smooth-content found')
      return
    }
    this.plugins.ScrollSmoother.create({
      ...scrollSmootherConfig.options,
      wrapper: '#smooth-wrapper',
      content: '#smooth-content',
    })
  }

  initMutationObserver () {
    const observerCallback = mutationsList => {
      const addedElements = []
      const removedElements = []
      mutationsList.forEach(mutation => {
        if (mutation.type === 'childList') {
          ['addedNodes', 'removedNodes'].forEach(action => {
            mutation[action].forEach(node => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const elements = this.getAnimatableElements(node)
                if (elements.length) {
                  (action === 'addedNodes' ? addedElements : removedElements).push(...elements)
                }
              }
            })
          })
        }
      })
      if (addedElements.length) this.initializeAnimationsForElements(addedElements)
      if (removedElements.length) this.cleanupAnimationsForElements(removedElements)
    }
    this.mutationObserver = new MutationObserver(observerCallback)
    this.mutationObserver.observe(document.body, { childList: true, subtree: true, attributes: true })
  }

  initializeAnimationsForElements (elements) {
    requestAnimationFrame(() => {
      elements.forEach(el => el.offsetHeight)
      const parsedElements = AF.Parser.processAttributes(elements)
      const newTimelines = AF.Parser.getTimelines(parsedElements)
      const currentBreakpoint = Object.entries(AF.Config.breakpoints).find(([_, query]) =>
        window.matchMedia(query).matches
      )?.[0]
      if (!currentBreakpoint) {
        AF.debug.warn('No matching breakpoint found for current viewport')
        return
      }
      const timelines = newTimelines[currentBreakpoint] || newTimelines['default']
      if (timelines) {
        for (let [tlName, tl] of Object.entries(timelines)) {
          tl = this.prepareTimeline(tl)
          const options = { ...this.getScrollTrigger(tl, tl?.scrollElement) }
          const tlInstance = this.gsap.timeline({ ...tl.options, ...options })
          if (tl.pause) tlInstance.pause()
          this.gsapTimelines.push({ name: tlName, breakpoint: currentBreakpoint, timeline: tlInstance })
          tl.animations.forEach(animation => {
            const animationInstance = this.createSingleAnimation(animation)
            tlInstance.add(animationInstance, animation.attributes?.timeline?.position ?? 0)
          })
        }
        this.plugins.ScrollTrigger?.refresh(true)
      } else {
        AF.debug.warn(`No timelines found for current breakpoint: ${currentBreakpoint}`)
      }
    })
  }

  getAnimatableElements (node) {
    const elements = this.isAnimatableElement(node) ? [node] : []
    elements.push(
      ...node.querySelectorAll(
        `[${AF.Config.prefix}from], [${AF.Config.prefix}to], [${AF.Config.prefix}keyframes]`
      )
    )
    return elements
  }

  isAnimatableElement (element) {
    return element.attributes && [...element.attributes].some(attr => attr.name.startsWith(AF.Config.prefix))
  }

  cleanupAnimationsForElements (elements) {
    if (!elements?.length) return
    elements.forEach(element => {
      this.gsapTimelines = this.gsapTimelines.filter(({ timeline }) => {
        const hasElement = timeline.getChildren().some(tween => tween.targets().includes(element))
        if (hasElement) {
          timeline.kill()
          return false
        }
        return true
      })
    })
    this.plugins.ScrollTrigger?.refresh()
  }

  reinitializeAnimations () {
    this.cleanup()
    this.elements = AF.Parser.parseElements()
    this.timelines = AF.Parser.getTimelines(this.elements)
    this.animate()
    this.initMutationObserver()
  }

  cleanup () {
    this.cleanupContexts()
    this.gsapTimelines.forEach(({ timeline }) => timeline.kill())
    this.gsapTimelines = []
    this.plugins.ScrollTrigger?.getAll().forEach(trigger => trigger.kill())
    this.mutationObserver?.disconnect()
    this.mutationObserver = null
  }
}

AF.registerEngine('gsap', AFEngineGSAP)

export default AF