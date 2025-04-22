import {
  createStore,
  require_react
} from "./chunk-LUT3BZ3Z.js";
import {
  __commonJS,
  __toESM
} from "./chunk-5WRI5ZAA.js";

// optional-peer-dep:__vite-optional-peer-dep:use-sync-external-store/shim/with-selector.js:zustand
var require_with_selector = __commonJS({
  "optional-peer-dep:__vite-optional-peer-dep:use-sync-external-store/shim/with-selector.js:zustand"() {
    throw new Error(`Could not resolve "use-sync-external-store/shim/with-selector.js" imported by "zustand". Is it installed?`);
  }
});

// node_modules/zustand/esm/traditional.mjs
var import_react = __toESM(require_react(), 1);
var import_with_selector = __toESM(require_with_selector(), 1);
var { useSyncExternalStoreWithSelector } = import_with_selector.default;
var identity = (arg) => arg;
function useStoreWithEqualityFn(api, selector = identity, equalityFn) {
  const slice = useSyncExternalStoreWithSelector(
    api.subscribe,
    api.getState,
    api.getInitialState,
    selector,
    equalityFn
  );
  import_react.default.useDebugValue(slice);
  return slice;
}
var createWithEqualityFnImpl = (createState, defaultEqualityFn) => {
  const api = createStore(createState);
  const useBoundStoreWithEqualityFn = (selector, equalityFn = defaultEqualityFn) => useStoreWithEqualityFn(api, selector, equalityFn);
  Object.assign(useBoundStoreWithEqualityFn, api);
  return useBoundStoreWithEqualityFn;
};
var createWithEqualityFn = (createState, defaultEqualityFn) => createState ? createWithEqualityFnImpl(createState, defaultEqualityFn) : createWithEqualityFnImpl;
export {
  createWithEqualityFn,
  useStoreWithEqualityFn
};
//# sourceMappingURL=zustand_traditional.js.map
