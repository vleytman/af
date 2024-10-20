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
      invalidateOnRefresh: true
    },
    scrollSmoother: {
      enabled: false,
      options: {
        smooth: 1,
        effects: true,
        smoothTouch: 0.1,
      }
    },
    allDefaults: {
      force3D: true,
      lazy: false,
    },
    actions: {
      play: (target, event, args, breakpoint) => {
        const timeline = this.getTimelineByName(target, breakpoint)
        if (timeline) {
          timeline.play()
        }
      },
      pause: (target, event, args, breakpoint) => {
        const timeline = this.getTimelineByName(target, breakpoint)
        if (timeline) timeline.pause()
      },
      restart: (target, event, args, breakpoint) => {
        const timeline = this.getTimelineByName(target, breakpoint)
        if (timeline) timeline.restart()
      },
      reverse: (target, event, args, breakpoint) => {
        const timeline = this.getTimelineByName(target, breakpoint)
        if (timeline) timeline.reverse()
      },
      toggle: (target, event, args, breakpoint) => {
        const timeline = this.getTimelineByName(target, breakpoint)
        if (timeline) {
          if (!timeline.reversed()) {
            timeline.reverse()
          } else {
            timeline.play()
          }
        }
      },
    },
  }

  constructor (elements, timelines) {
    this.elements = elements
    this.timelines = timelines
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
  }

  loadRequiredPlugins (elements) {
    if (AF.utils.hasElementsWithAttributes(elements, ['scroll'])) {
      this.plugins.ScrollTrigger = this.plugins?.ScrollTrigger || ScrollTrigger
      this.gsap.registerPlugin(this.plugins.ScrollTrigger)
    }
    if (AF.utils.hasElementsWithAttributes(elements, ['splittext'])) {
      this.plugins.SplitText = this.plugins?.SplitText || SplitText
      this.gsap.registerPlugin(this.plugins.SplitText)
    }
  }

  animate () {
    if (!this.timelines) return
    this.cleanupContexts()
    this.contexts = []
    for (const [bp, timelines] of Object.entries(this.timelines)) {
      const context = this.matchMedia.add(AF.Config.breakpoints[bp], (context) => {
        const localTimelines = []

        for (let [tlName, tl] of Object.entries(timelines)) {
          tl = this.prepareTimeline(tl)
          const options = { ...this.getScrollTrigger(tl, tl?.scrollElement) }

          const tlInstance = this.gsap.timeline({ ...tl.options, ...options })
          if (tl.pause) tlInstance.pause()
          const timelineEntry = { name: tlName, breakpoint: bp, timeline: tlInstance }
          this.gsapTimelines.push(timelineEntry)
          localTimelines.push(timelineEntry)

          for (const animation of tl.animations) {
            const animationInstance = this.createSingleAnimation(animation, bp)
            tlInstance.add(animationInstance, animation.attributes?.timeline?.position ?? 0)
          }
        }
        this.setupEventActions(bp, context)
        if (this.plugins.ScrollTrigger) {
          this.plugins.ScrollTrigger.refresh()
        }
        return () => {
          localTimelines.forEach(({ timeline }) => timeline.kill())
          this.gsapTimelines = this.gsapTimelines.filter(tl => !localTimelines.includes(tl))
          if (this.plugins.ScrollTrigger) {
            this.plugins.ScrollTrigger.getAll().forEach(trigger => trigger.kill())
          }
        }
      })
      this.contexts.push(context)
    }
    this.handleResize()
    this.handlePageShow()
    this.handleLoad()
    this.handlersSet = true
  }

  cleanupContexts () {
    if (this.contexts && this.contexts.length) {
      this.contexts.forEach(context => context.revert())
      this.contexts = []
    }
  }

  setupEventActions (breakpoint, context) {
    this.elements.forEach(elementData => {
      const { element, attributes, targets } = elementData
      if (attributes?.on?.[breakpoint] && attributes?.action?.[breakpoint]) {
        const events = attributes.on[breakpoint].events
        const actionData = attributes.action[breakpoint]
        events.forEach(eventName => {
          targets.forEach(target => {
            const handler = (event) => {
              this.handleAction(actionData.action, actionData.target, actionData.arguments, event, breakpoint)
            }
            context.add(() => {
              target.addEventListener(eventName, handler)
              return () => {
                target.removeEventListener(eventName, handler)
              }
            })
          })
        })
      }
    })
  }

  handleAction (actionName, actionTarget, actionArgs, event, breakpoint) {
    if (typeof this.defaults.actions[actionName] === 'function') {
      this.defaults.actions[actionName](actionTarget, event, actionArgs, breakpoint)
    } else if (typeof AF.Config.actions[actionName] === 'function') {
      AF.Config.actions[actionName](actionTarget, event, actionArgs, breakpoint)
    } else {
      AF.debug.warn(`Action "${actionName}" not found.`)
    }
  }

  getTimelineByName (name, breakpoint) {
    const timelineEntry = this.gsapTimelines.find(tl => tl.name === name && tl.breakpoint === breakpoint)
    return timelineEntry ? timelineEntry.timeline : null
  }

  refresh () {
    window.scrollTo(0, 0)
    this.gsapTimelines.forEach(tl => tl.timeline.restart())
    this.plugins.ScrollTrigger && this.plugins.ScrollTrigger.update()
    this.plugins.ScrollTrigger && this.plugins.ScrollTrigger.refresh()
    this.plugins.ScrollTrigger && this.plugins.ScrollTrigger.getAll().forEach(trigger => {
      trigger.update()
      trigger.refresh()
    })
    console.debug('Refreshed timelines')
  }

  handleLoad () {
    if (this.handlersSet) return
    window.addEventListener('load', () => this.refresh())
  }

  handleResize () {
    if (this.handlersSet) return
    window.addEventListener('resize', AF.utils.debounce(() => {
      this.cleanup()
      this.elements = AF.Parser.parseElements()
      this.timelines = AF.Parser.getTimelines(this.elements)
      this.animate()
    }, 300), { passive: true })
  }

  handlePageShow () {
    if (this.handlersSet) return
    window.addEventListener('pageshow', (event) => event.persisted && this.refresh() && this.animate())
  }

  getConfig (key) {
    return AF.Config[key] ?? this.defaults[key] ?? null
  }

  getScrollTrigger (attributes, element) {
    if (!attributes.scroll) return {}
    let scrollAttributes = Object.keys(attributes.scroll).length === 0 ? this.getConfig('scrollTrigger') : attributes.scroll
    return { scrollTrigger: { trigger: element, ...scrollAttributes } }
  }

  getSplitText (attributes, targets) {
    if (!attributes.splittext) return targets
    const splitTextOptions = attributes.splittext
    const split = new this.plugins.SplitText(targets, splitTextOptions)
    const typeString = splitTextOptions.type || ''
    const types = typeString.split(',').map(s => s.trim())
    let animationTargets = []
    if (types.includes('chars')) animationTargets = animationTargets.concat(split.chars)
    if (types.includes('words')) animationTargets = animationTargets.concat(split.words)
    if (types.includes('lines')) animationTargets = animationTargets.concat(split.lines)
    if (animationTargets.length === 0) animationTargets = targets
    return animationTargets
  }

  prepareTimeline (tl) {
    let scrollTrigger = null
    let pause = false
    tl.animations.forEach(animation => {
      if (animation.attributes?.scroll) {
        scrollTrigger = !scrollTrigger ? { scroll: animation.attributes.scroll ?? scrollTrigger, scrollElement: animation.element ?? scrollElement } : scrollTrigger
        delete animation.attributes.scroll
      }
      if (animation.attributes?.pause) {
        pause = !pause ? { pause: true } : pause
        delete animation.attributes.pause
      }
    })
    return { ...tl, ...scrollTrigger, ...pause }
  }

  createSingleAnimation (animation, breakpoint) {
    const { element, attributes, targets } = animation
    let options = { ...this.getConfig('allDefaults') }
    let animationTargets = this.getSplitText(attributes, targets)
    if (attributes.scroll) {
      options.scrollTrigger = { trigger: element, ...attributes.scroll }
    }
    let tween
    if (attributes.keyframes) {
      tween = this.gsap.to(animationTargets, { keyframes: attributes.keyframes, ...attributes?.options, ...options })
    } else if (attributes.from && !attributes.to) {
      tween = this.gsap.from(animationTargets, { ...attributes.from, ...attributes?.options, ...options })
    } else if (attributes.to && !attributes.from) {
      tween = this.gsap.to(animationTargets, { ...attributes.to, ...attributes?.options, ...options })
    } else if (attributes.from && attributes.to) {
      tween = this.gsap.fromTo(animationTargets, attributes.from, { ...attributes.to, ...attributes?.options, ...options })
    }
    return tween
  }

  initScrollSmoother () {
    if (!this.getConfig('scrollSmoother')?.enabled) return
    this.plugins.ScrollSmoother = this.plugins?.ScrollSmoother || ScrollSmoother
    this.gsap.registerPlugin(this.plugins.ScrollSmoother)
    const content = document.querySelector('#smooth-content')
    if (!content) {
      AF.debug.error('ScrollSmoother: No #smooth-content found')
      return
    }
    this.plugins.ScrollSmoother.create({
      ...this.getConfig('scrollSmoother').options,
      wrapper: '#smooth-wrapper',
      content: '#smooth-content',
    })
  }

  cleanup () {
    this.cleanupContexts()
    if (this.gsapTimelines) {
      this.gsapTimelines.forEach(({ timeline }) => timeline.kill())
      this.gsapTimelines = []
    }
    if (this.plugins.ScrollTrigger) {
      this.plugins.ScrollTrigger.getAll().forEach(trigger => trigger.kill())
    }
  }

}

AF.registerEngine('gsap', AFEngineGSAP)

export default AF