const injectedElementAttribute = 'data-lastpass-icon-root';
const observerConfig = { attributes: false, childList: true, subtree: true };

export function makeHydrationPromise(wrapperInstance) {
  let hydrate = () => { };

  let injectedElementsObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }

      for (const node of mutation.addedNodes) {
        if (node.getAttribute && node.hasAttribute(injectedElementAttribute)) {
          node.remove();
        }
      }
    }

  });

  function destroyObserver() {
    if (!injectedElementsObserver) {
      return;
    }

    injectedElementsObserver.disconnect();
    injectedElementsObserver = null;
  }

  const hydrationPromise = new Promise((resolve) => {
    hydrate = () => {
      const hydratedComponentRootElement = wrapperInstance.$el;

      if (!hydratedComponentRootElement) {
        resolve();
        return;
      }

      injectedElementsObserver.observe(hydratedComponentRootElement, observerConfig);
      const injectedElements = hydratedComponentRootElement.querySelectorAll(
        `[${injectedElementAttribute}]`
      );

      for (const element in injectedElements) {
        element.remove();
      }

      resolve();
    };
  });

  return {
    destroyObserver,
    hydrate,
    hydrationPromise,
  };
}
