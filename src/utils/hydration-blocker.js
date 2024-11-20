import { makeHydrationObserver } from './hydration-observer';
import { makeHydrationPromise } from './hydration-promise';
import { makeNonce } from './nonce';

export function makeHydrationBlocker(component, options) {
  return Object.assign({
    mixins: [{
      beforeCreate() {
        this.cleanupHandlers = [];
        const { hydrate, hydrationPromise, destroyObserver } = makeHydrationPromise(this);
        this.Nonce = makeNonce({ component, hydrationPromise });
        this.hydrate = hydrate;
        this.hydrationPromise = hydrationPromise;
        this.cleanupHandlers.push(destroyObserver);
      },
      beforeDestroy() {
        this.cleanup();
      },
      mounted() {
        if (this.$el.nodeType === Node.COMMENT_NODE) {
          // No SSR rendered content, hydrate immediately.
          this.hydrate();
          return;
        }

        if (this.never) return;

        if (this.whenVisible) {
          const observerOptions = this.whenVisible !== true ? this.whenVisible : undefined;
          const observer = makeHydrationObserver(observerOptions);

          // If Intersection Observer API is not supported, hydrate immediately.
          if (!observer) {
            this.hydrate();
            return;
          }

          this.$el.hydrate = this.hydrate;
          const cleanup = () => observer.unobserve(this.$el);
          this.cleanupHandlers.push(cleanup);
          this.hydrationPromise;
          observer.observe(this.$el);
          return;
        }

        if (this.whenIdle) {
          // If `requestIdleCallback()` or `requestAnimationFrame()`
          // is not supported, hydrate immediately.
          if (!(`requestIdleCallback` in window) || !(`requestAnimationFrame` in window)) {
            this.hydrate();
            return;
          }

          // @ts-ignore
          const id = requestIdleCallback(() => {
            requestAnimationFrame(this.hydrate);
          }, { timeout: this.idleTimeout });
          // @ts-ignore
          const cleanup = () => cancelIdleCallback(id);
          this.cleanupHandlers.push(cleanup);
          this.hydrationPromise;
        }

        if (this.interactionEvents && this.interactionEvents.length) {
          const eventListenerOptions = {
            capture: true,
            once: true,
            passive: true,
          };

          this.interactionEvents.forEach((eventName) => {
            this.$el.addEventListener(eventName, this.hydrate, eventListenerOptions);
            const cleanup = () => {
              this.$el.removeEventListener(eventName, this.hydrate, eventListenerOptions);
            };
            this.cleanupHandlers.push(cleanup);
          });
        }
      },
      methods: {
        cleanup() {
          this.cleanupHandlers.forEach(handler => handler());
          this.cleanupHandlers = [];
        },
      },
      render(h) {
        return h(this.Nonce, {
          attrs: { ...this.$attrs },
          on: { ...this.$listeners, 'hook:mounted': this.cleanup },
          scopedSlots: this.$scopedSlots,
          directives: this.$vnode.data.directives,
        }, this.$slots.default);
      },
    }],
  }, options);
}
