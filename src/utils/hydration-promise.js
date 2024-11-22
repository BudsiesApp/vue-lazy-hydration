const unwantedElementsAttribute = 'data-lastpass-icon-root';
const observerConfig = { attributes: false, childList: true, subtree: true };

function mutationObserverFactory() {
  if (typeof MutationObserver === 'undefined') {
    return;
  }

  return new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }

      for (const node of mutation.addedNodes) {
        if (node.getAttribute && node.hasAttribute(unwantedElementsAttribute)) {
          node.remove();
        }
      }
    }
  });
}

export function makeHydrationPromise(wrapperInstance) {
  let hydrate = () => { };

  let injectedElementsObserver;

  function destroyObserver() {
    if (!injectedElementsObserver) {
      return;
    }

    injectedElementsObserver.disconnect();
    injectedElementsObserver = undefined;
  }

  const hydrationPromise = new Promise((resolve) => {
    hydrate = () => {
      const hydratedComponentRootElement = wrapperInstance.$el;

      if (!hydratedComponentRootElement || typeof hydratedComponentRootElement.querySelectorAll !== 'function') {
        resolve();
        return;
      }

      injectedElementsObserver = mutationObserverFactory();

      if (!injectedElementsObserver) {
        resolve();
        return;
      }

      injectedElementsObserver.observe(hydratedComponentRootElement, observerConfig);
      const injectedElements = hydratedComponentRootElement.querySelectorAll(
        `[${unwantedElementsAttribute}]`
      );

      for (const element of injectedElements) {
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
