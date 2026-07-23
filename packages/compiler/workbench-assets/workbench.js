var __defProp = Object.defineProperty;
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key2, value) => key2 in obj ? __defProp(obj, key2, { enumerable: true, configurable: true, writable: true, value }) : obj[key2] = value;
var __publicField = (obj, key2, value) => __defNormalProp(obj, typeof key2 !== "symbol" ? key2 + "" : key2, value);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var _a, _anchor, _hydrate_open, _props, _children, _effect, _main_effect, _pending_effect, _failed_effect, _offscreen_fragment, _local_pending_count, _pending_count, _pending_count_update_queued, _dirty_effects, _maybe_dirty_effects, _effect_pending, _effect_pending_subscriber, _Boundary_instances, hydrate_resolved_content_fn, hydrate_failed_content_fn, hydrate_pending_content_fn, render_fn, resolve_fn, run_fn, update_pending_count_fn, handle_error_fn, _started, _prev, _next, _commit_callbacks, _discard_callbacks, _pending, _blocking_pending, _deferred, _roots, _new_effects, _dirty_effects2, _maybe_dirty_effects2, _skipped_branches, _unskipped_branches, _decrement_queued, _Batch_instances, is_deferred_fn, process_fn, traverse_fn, find_earlier_batch_fn, merge_fn, defer_effects_fn, commit_fn, unlink_fn, _b, _batches, _onscreen, _offscreen, _outroing, _transition, _commit, _discard, _c;
(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link2 of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link2);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link2) {
    const fetchOpts = {};
    if (link2.integrity) fetchOpts.integrity = link2.integrity;
    if (link2.referrerPolicy) fetchOpts.referrerPolicy = link2.referrerPolicy;
    if (link2.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link2.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link2) {
    if (link2.ep)
      return;
    link2.ep = true;
    const fetchOpts = getFetchOpts(link2);
    fetch(link2.href, fetchOpts);
  }
})();
const DEV = false;
var is_array = Array.isArray;
var index_of = Array.prototype.indexOf;
var includes = Array.prototype.includes;
var array_from = Array.from;
var define_property = Object.defineProperty;
var get_descriptor = Object.getOwnPropertyDescriptor;
var get_descriptors = Object.getOwnPropertyDescriptors;
var object_prototype = Object.prototype;
var array_prototype = Array.prototype;
var get_prototype_of = Object.getPrototypeOf;
var is_extensible = Object.isExtensible;
const noop = () => {
};
function run_all(arr) {
  for (var i = 0; i < arr.length; i++) {
    arr[i]();
  }
}
function deferred() {
  var resolve;
  var reject;
  var promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
function to_array(value, n) {
  if (Array.isArray(value)) {
    return value;
  }
  if (!(Symbol.iterator in value)) {
    return Array.from(value);
  }
  const array = [];
  for (const element of value) {
    array.push(element);
    if (array.length === n) break;
  }
  return array;
}
const DERIVED = 1 << 1;
const EFFECT = 1 << 2;
const RENDER_EFFECT = 1 << 3;
const MANAGED_EFFECT = 1 << 24;
const BLOCK_EFFECT = 1 << 4;
const BRANCH_EFFECT = 1 << 5;
const ROOT_EFFECT = 1 << 6;
const BOUNDARY_EFFECT = 1 << 7;
const CONNECTED = 1 << 9;
const CLEAN = 1 << 10;
const DIRTY = 1 << 11;
const MAYBE_DIRTY = 1 << 12;
const INERT = 1 << 13;
const DESTROYED = 1 << 14;
const REACTION_RAN = 1 << 15;
const DESTROYING = 1 << 25;
const EFFECT_TRANSPARENT = 1 << 16;
const EAGER_EFFECT = 1 << 17;
const HEAD_EFFECT = 1 << 18;
const EFFECT_PRESERVED = 1 << 19;
const USER_EFFECT = 1 << 20;
const EFFECT_OFFSCREEN = 1 << 25;
const WAS_MARKED = 1 << 16;
const REACTION_IS_UPDATING = 1 << 21;
const ASYNC = 1 << 22;
const ERROR_VALUE = 1 << 23;
const STATE_SYMBOL = Symbol("$state");
const LOADING_ATTR_SYMBOL = Symbol("");
const ATTRIBUTES_CACHE = Symbol("attributes");
const CLASS_CACHE = Symbol("class");
const STYLE_CACHE = Symbol("style");
const TEXT_CACHE = Symbol("text");
const FORM_RESET_HANDLER = Symbol("form reset");
const STALE_REACTION = new class StaleReactionError extends Error {
  constructor() {
    super(...arguments);
    __publicField(this, "name", "StaleReactionError");
    __publicField(this, "message", "The reaction that called `getAbortSignal()` was re-run or destroyed");
  }
}();
const IS_XHTML = (
  // We gotta write it like this because after downleveling the pure comment may end up in the wrong location
  !!((_a = globalThis.document) == null ? void 0 : _a.contentType) && /* @__PURE__ */ globalThis.document.contentType.includes("xml")
);
function async_derived_orphan() {
  {
    throw new Error(`https://svelte.dev/e/async_derived_orphan`);
  }
}
function each_key_duplicate(a, b, value) {
  {
    throw new Error(`https://svelte.dev/e/each_key_duplicate`);
  }
}
function effect_in_teardown(rune) {
  {
    throw new Error(`https://svelte.dev/e/effect_in_teardown`);
  }
}
function effect_in_unowned_derived() {
  {
    throw new Error(`https://svelte.dev/e/effect_in_unowned_derived`);
  }
}
function effect_orphan(rune) {
  {
    throw new Error(`https://svelte.dev/e/effect_orphan`);
  }
}
function effect_update_depth_exceeded() {
  {
    throw new Error(`https://svelte.dev/e/effect_update_depth_exceeded`);
  }
}
function state_descriptors_fixed() {
  {
    throw new Error(`https://svelte.dev/e/state_descriptors_fixed`);
  }
}
function state_prototype_fixed() {
  {
    throw new Error(`https://svelte.dev/e/state_prototype_fixed`);
  }
}
function state_unsafe_mutation() {
  {
    throw new Error(`https://svelte.dev/e/state_unsafe_mutation`);
  }
}
function svelte_boundary_reset_onerror() {
  {
    throw new Error(`https://svelte.dev/e/svelte_boundary_reset_onerror`);
  }
}
const EACH_ITEM_REACTIVE = 1;
const EACH_INDEX_REACTIVE = 1 << 1;
const EACH_IS_CONTROLLED = 1 << 2;
const EACH_IS_ANIMATED = 1 << 3;
const EACH_ITEM_IMMUTABLE = 1 << 4;
const TEMPLATE_FRAGMENT = 1;
const TEMPLATE_USE_IMPORT_NODE = 1 << 1;
const UNINITIALIZED = Symbol("uninitialized");
const NAMESPACE_HTML = "http://www.w3.org/1999/xhtml";
function derived_inert() {
  {
    console.warn(`https://svelte.dev/e/derived_inert`);
  }
}
function select_multiple_invalid_value() {
  {
    console.warn(`https://svelte.dev/e/select_multiple_invalid_value`);
  }
}
function svelte_boundary_reset_noop() {
  {
    console.warn(`https://svelte.dev/e/svelte_boundary_reset_noop`);
  }
}
function equals(value) {
  return value === this.v;
}
function safe_not_equal(a, b) {
  return a != a ? b == b : a !== b || a !== null && typeof a === "object" || typeof a === "function";
}
function safe_equals(value) {
  return !safe_not_equal(value, this.v);
}
let tracing_mode_flag = false;
let component_context = null;
function set_component_context(context) {
  component_context = context;
}
function push(props, runes = false, fn) {
  component_context = {
    p: component_context,
    i: false,
    c: null,
    e: null,
    s: props,
    x: null,
    r: (
      /** @type {Effect} */
      active_effect
    ),
    l: null
  };
}
function pop(component) {
  var context = (
    /** @type {ComponentContext} */
    component_context
  );
  var effects = context.e;
  if (effects !== null) {
    context.e = null;
    for (var fn of effects) {
      create_user_effect(fn);
    }
  }
  context.i = true;
  component_context = context.p;
  return (
    /** @type {T} */
    {}
  );
}
function is_runes() {
  return true;
}
let micro_tasks = [];
function run_micro_tasks() {
  var tasks = micro_tasks;
  micro_tasks = [];
  run_all(tasks);
}
function queue_micro_task(fn) {
  if (micro_tasks.length === 0 && !is_flushing_sync) {
    var tasks = micro_tasks;
    queueMicrotask(() => {
      if (tasks === micro_tasks) run_micro_tasks();
    });
  }
  micro_tasks.push(fn);
}
function flush_tasks() {
  while (micro_tasks.length > 0) {
    run_micro_tasks();
  }
}
function handle_error(error) {
  var effect2 = active_effect;
  if (effect2 === null) {
    active_reaction.f |= ERROR_VALUE;
    return error;
  }
  if ((effect2.f & REACTION_RAN) === 0 && (effect2.f & EFFECT) === 0) {
    throw error;
  }
  invoke_error_boundary(error, effect2);
}
function invoke_error_boundary(error, effect2) {
  if (effect2 !== null && (effect2.f & DESTROYED) !== 0) {
    return;
  }
  while (effect2 !== null) {
    if ((effect2.f & BOUNDARY_EFFECT) !== 0) {
      if ((effect2.f & REACTION_RAN) === 0) {
        throw error;
      }
      try {
        effect2.b.error(error);
        return;
      } catch (e) {
        error = e;
      }
    }
    effect2 = effect2.parent;
  }
  throw error;
}
const STATUS_MASK = -7169;
function set_signal_status(signal, status) {
  signal.f = signal.f & STATUS_MASK | status;
}
function update_derived_status(derived2) {
  if ((derived2.f & CONNECTED) !== 0 || derived2.deps === null) {
    set_signal_status(derived2, CLEAN);
  } else {
    set_signal_status(derived2, MAYBE_DIRTY);
  }
}
function clear_marked(deps) {
  if (deps === null) return;
  for (const dep of deps) {
    if ((dep.f & DERIVED) === 0 || (dep.f & WAS_MARKED) === 0) {
      continue;
    }
    dep.f ^= WAS_MARKED;
    clear_marked(
      /** @type {Derived} */
      dep.deps
    );
  }
}
function defer_effect(effect2, dirty_effects, maybe_dirty_effects) {
  if ((effect2.f & DIRTY) !== 0) {
    dirty_effects.add(effect2);
  } else if ((effect2.f & MAYBE_DIRTY) !== 0) {
    maybe_dirty_effects.add(effect2);
  }
  clear_marked(effect2.deps);
  set_signal_status(effect2, CLEAN);
}
let listening_to_form_reset = false;
function add_form_reset_listener() {
  if (!listening_to_form_reset) {
    listening_to_form_reset = true;
    document.addEventListener(
      "reset",
      (evt) => {
        Promise.resolve().then(() => {
          var _a2;
          if (!evt.defaultPrevented) {
            for (
              const e of
              /**@type {HTMLFormElement} */
              evt.target.elements
            ) {
              (_a2 = e[FORM_RESET_HANDLER]) == null ? void 0 : _a2.call(e);
            }
          }
        });
      },
      // In the capture phase to guarantee we get noticed of it (no possibility of stopPropagation)
      { capture: true }
    );
  }
}
function without_reactive_context(fn) {
  var previous_reaction = active_reaction;
  var previous_effect = active_effect;
  set_active_reaction(null);
  set_active_effect(null);
  try {
    return fn();
  } finally {
    set_active_reaction(previous_reaction);
    set_active_effect(previous_effect);
  }
}
function listen_to_event_and_reset_event(element, event2, handler, on_reset = handler) {
  element.addEventListener(event2, () => without_reactive_context(handler));
  const prev = (
    /** @type {any} */
    element[FORM_RESET_HANDLER]
  );
  if (prev) {
    element[FORM_RESET_HANDLER] = () => {
      prev();
      on_reset(true);
    };
  } else {
    element[FORM_RESET_HANDLER] = () => on_reset(true);
  }
  add_form_reset_listener();
}
function createSubscriber(start2) {
  let subscribers = 0;
  let version = source(0);
  let stop;
  return () => {
    if (effect_tracking()) {
      get(version);
      render_effect(() => {
        if (subscribers === 0) {
          stop = untrack(() => start2(() => increment(version)));
        }
        subscribers += 1;
        return () => {
          queue_micro_task(() => {
            subscribers -= 1;
            if (subscribers === 0) {
              stop == null ? void 0 : stop();
              stop = void 0;
              increment(version);
            }
          });
        };
      });
    }
  };
}
var flags = EFFECT_TRANSPARENT | EFFECT_PRESERVED;
function boundary(node, props, children, transform_error) {
  new Boundary(node, props, children, transform_error);
}
class Boundary {
  /**
   * @param {TemplateNode} node
   * @param {BoundaryProps} props
   * @param {((anchor: Node) => void)} children
   * @param {((error: unknown) => unknown) | undefined} [transform_error]
   */
  constructor(node, props, children, transform_error) {
    __privateAdd(this, _Boundary_instances);
    /** @type {Boundary | null} */
    __publicField(this, "parent");
    __publicField(this, "is_pending", false);
    /**
     * API-level transformError transform function. Transforms errors before they reach the `failed` snippet.
     * Inherited from parent boundary, or defaults to identity.
     * @type {(error: unknown) => unknown}
     */
    __publicField(this, "transform_error");
    /** @type {TemplateNode} */
    __privateAdd(this, _anchor);
    /** @type {TemplateNode | null} */
    __privateAdd(this, _hydrate_open, null);
    /** @type {BoundaryProps} */
    __privateAdd(this, _props);
    /** @type {((anchor: Node) => void)} */
    __privateAdd(this, _children);
    /** @type {Effect} */
    __privateAdd(this, _effect);
    /** @type {Effect | null} */
    __privateAdd(this, _main_effect, null);
    /** @type {Effect | null} */
    __privateAdd(this, _pending_effect, null);
    /** @type {Effect | null} */
    __privateAdd(this, _failed_effect, null);
    /** @type {DocumentFragment | null} */
    __privateAdd(this, _offscreen_fragment, null);
    __privateAdd(this, _local_pending_count, 0);
    __privateAdd(this, _pending_count, 0);
    __privateAdd(this, _pending_count_update_queued, false);
    /** @type {Set<Effect>} */
    __privateAdd(this, _dirty_effects, /* @__PURE__ */ new Set());
    /** @type {Set<Effect>} */
    __privateAdd(this, _maybe_dirty_effects, /* @__PURE__ */ new Set());
    /**
     * A source containing the number of pending async deriveds/expressions.
     * Only created if `$effect.pending()` is used inside the boundary,
     * otherwise updating the source results in needless `Batch.ensure()`
     * calls followed by no-op flushes
     * @type {Source<number> | null}
     */
    __privateAdd(this, _effect_pending, null);
    __privateAdd(this, _effect_pending_subscriber, createSubscriber(() => {
      __privateSet(this, _effect_pending, source(__privateGet(this, _local_pending_count)));
      return () => {
        __privateSet(this, _effect_pending, null);
      };
    }));
    var _a2;
    __privateSet(this, _anchor, node);
    __privateSet(this, _props, props);
    __privateSet(this, _children, (anchor) => {
      var effect2 = (
        /** @type {Effect} */
        active_effect
      );
      effect2.b = this;
      effect2.f |= BOUNDARY_EFFECT;
      children(anchor);
    });
    this.parent = /** @type {Effect} */
    active_effect.b;
    this.transform_error = transform_error ?? ((_a2 = this.parent) == null ? void 0 : _a2.transform_error) ?? ((e) => e);
    __privateSet(this, _effect, block(() => {
      {
        __privateMethod(this, _Boundary_instances, render_fn).call(this);
      }
    }, flags));
  }
  /**
   * Defer an effect inside a pending boundary until the boundary resolves
   * @param {Effect} effect
   */
  defer_effect(effect2) {
    defer_effect(effect2, __privateGet(this, _dirty_effects), __privateGet(this, _maybe_dirty_effects));
  }
  /**
   * Returns `false` if the effect exists inside a boundary whose pending snippet is shown
   * @returns {boolean}
   */
  is_rendered() {
    return !this.is_pending && (!this.parent || this.parent.is_rendered());
  }
  has_pending_snippet() {
    return !!__privateGet(this, _props).pending;
  }
  /**
   * Update the source that powers `$effect.pending()` inside this boundary,
   * and controls when the current `pending` snippet (if any) is removed.
   * Do not call from inside the class
   * @param {1 | -1} d
   * @param {Batch} batch
   */
  update_pending_count(d, batch) {
    __privateMethod(this, _Boundary_instances, update_pending_count_fn).call(this, d, batch);
    __privateSet(this, _local_pending_count, __privateGet(this, _local_pending_count) + d);
    if (!__privateGet(this, _effect_pending) || __privateGet(this, _pending_count_update_queued)) return;
    __privateSet(this, _pending_count_update_queued, true);
    queue_micro_task(() => {
      __privateSet(this, _pending_count_update_queued, false);
      if (__privateGet(this, _effect_pending)) {
        internal_set(__privateGet(this, _effect_pending), __privateGet(this, _local_pending_count));
      }
    });
  }
  get_effect_pending() {
    __privateGet(this, _effect_pending_subscriber).call(this);
    return get(
      /** @type {Source<number>} */
      __privateGet(this, _effect_pending)
    );
  }
  /** @param {unknown} error */
  error(error) {
    if (!__privateGet(this, _props).onerror && !__privateGet(this, _props).failed) {
      throw error;
    }
    if (current_batch == null ? void 0 : current_batch.is_fork) {
      if (__privateGet(this, _main_effect)) current_batch.skip_effect(__privateGet(this, _main_effect));
      if (__privateGet(this, _pending_effect)) current_batch.skip_effect(__privateGet(this, _pending_effect));
      if (__privateGet(this, _failed_effect)) current_batch.skip_effect(__privateGet(this, _failed_effect));
      current_batch.oncommit(() => {
        __privateMethod(this, _Boundary_instances, handle_error_fn).call(this, error);
      });
    } else {
      __privateMethod(this, _Boundary_instances, handle_error_fn).call(this, error);
    }
  }
}
_anchor = new WeakMap();
_hydrate_open = new WeakMap();
_props = new WeakMap();
_children = new WeakMap();
_effect = new WeakMap();
_main_effect = new WeakMap();
_pending_effect = new WeakMap();
_failed_effect = new WeakMap();
_offscreen_fragment = new WeakMap();
_local_pending_count = new WeakMap();
_pending_count = new WeakMap();
_pending_count_update_queued = new WeakMap();
_dirty_effects = new WeakMap();
_maybe_dirty_effects = new WeakMap();
_effect_pending = new WeakMap();
_effect_pending_subscriber = new WeakMap();
_Boundary_instances = new WeakSet();
hydrate_resolved_content_fn = function() {
  try {
    __privateSet(this, _main_effect, branch(() => __privateGet(this, _children).call(this, __privateGet(this, _anchor))));
  } catch (error) {
    this.error(error);
  }
};
/**
 * @param {unknown} error The deserialized error from the server's hydration comment
 */
hydrate_failed_content_fn = function(error) {
  const failed = __privateGet(this, _props).failed;
  if (!failed) return;
  __privateSet(this, _failed_effect, branch(() => {
    failed(
      __privateGet(this, _anchor),
      () => error,
      () => () => {
      }
    );
  }));
};
hydrate_pending_content_fn = function() {
  const pending = __privateGet(this, _props).pending;
  if (!pending) return;
  this.is_pending = true;
  __privateSet(this, _pending_effect, branch(() => pending(__privateGet(this, _anchor))));
  queue_micro_task(() => {
    var fragment = __privateSet(this, _offscreen_fragment, document.createDocumentFragment());
    var anchor = create_text();
    fragment.append(anchor);
    __privateSet(this, _main_effect, __privateMethod(this, _Boundary_instances, run_fn).call(this, () => {
      return branch(() => __privateGet(this, _children).call(this, anchor));
    }));
    if (__privateGet(this, _pending_count) === 0) {
      __privateGet(this, _anchor).before(fragment);
      __privateSet(this, _offscreen_fragment, null);
      pause_effect(
        /** @type {Effect} */
        __privateGet(this, _pending_effect),
        () => {
          __privateSet(this, _pending_effect, null);
        }
      );
      __privateMethod(this, _Boundary_instances, resolve_fn).call(
        this,
        /** @type {Batch} */
        current_batch
      );
    }
  });
};
render_fn = function() {
  try {
    this.is_pending = this.has_pending_snippet();
    __privateSet(this, _pending_count, 0);
    __privateSet(this, _local_pending_count, 0);
    __privateSet(this, _main_effect, branch(() => {
      __privateGet(this, _children).call(this, __privateGet(this, _anchor));
    }));
    if (__privateGet(this, _pending_count) > 0) {
      var fragment = __privateSet(this, _offscreen_fragment, document.createDocumentFragment());
      move_effect(__privateGet(this, _main_effect), fragment);
      const pending = (
        /** @type {(anchor: Node) => void} */
        __privateGet(this, _props).pending
      );
      __privateSet(this, _pending_effect, branch(() => pending(__privateGet(this, _anchor))));
    } else {
      __privateMethod(this, _Boundary_instances, resolve_fn).call(
        this,
        /** @type {Batch} */
        current_batch
      );
    }
  } catch (error) {
    this.error(error);
  }
};
/**
 * @param {Batch} batch
 */
resolve_fn = function(batch) {
  this.is_pending = false;
  batch.transfer_effects(__privateGet(this, _dirty_effects), __privateGet(this, _maybe_dirty_effects));
};
/**
 * @template T
 * @param {() => T} fn
 */
run_fn = function(fn) {
  var previous_effect = active_effect;
  var previous_reaction = active_reaction;
  var previous_ctx = component_context;
  set_active_effect(__privateGet(this, _effect));
  set_active_reaction(__privateGet(this, _effect));
  set_component_context(__privateGet(this, _effect).ctx);
  try {
    Batch.ensure();
    return fn();
  } catch (e) {
    handle_error(e);
    return null;
  } finally {
    set_active_effect(previous_effect);
    set_active_reaction(previous_reaction);
    set_component_context(previous_ctx);
  }
};
/**
 * Updates the pending count associated with the currently visible pending snippet,
 * if any, such that we can replace the snippet with content once work is done
 * @param {1 | -1} d
 * @param {Batch} batch
 */
update_pending_count_fn = function(d, batch) {
  var _a2;
  if (!this.has_pending_snippet()) {
    if (this.parent) {
      __privateMethod(_a2 = this.parent, _Boundary_instances, update_pending_count_fn).call(_a2, d, batch);
    }
    return;
  }
  __privateSet(this, _pending_count, __privateGet(this, _pending_count) + d);
  if (__privateGet(this, _pending_count) === 0) {
    __privateMethod(this, _Boundary_instances, resolve_fn).call(this, batch);
    if (__privateGet(this, _pending_effect)) {
      pause_effect(__privateGet(this, _pending_effect), () => {
        __privateSet(this, _pending_effect, null);
      });
    }
    if (__privateGet(this, _offscreen_fragment)) {
      __privateGet(this, _anchor).before(__privateGet(this, _offscreen_fragment));
      __privateSet(this, _offscreen_fragment, null);
    }
  }
};
/**
 * @param {unknown} error
 */
handle_error_fn = function(error) {
  if (__privateGet(this, _main_effect)) {
    destroy_effect(__privateGet(this, _main_effect));
    __privateSet(this, _main_effect, null);
  }
  if (__privateGet(this, _pending_effect)) {
    destroy_effect(__privateGet(this, _pending_effect));
    __privateSet(this, _pending_effect, null);
  }
  if (__privateGet(this, _failed_effect)) {
    destroy_effect(__privateGet(this, _failed_effect));
    __privateSet(this, _failed_effect, null);
  }
  var onerror = __privateGet(this, _props).onerror;
  let failed = __privateGet(this, _props).failed;
  var did_reset = false;
  var calling_on_error = false;
  const reset = () => {
    if (did_reset) {
      svelte_boundary_reset_noop();
      return;
    }
    did_reset = true;
    if (calling_on_error) {
      svelte_boundary_reset_onerror();
    }
    if (__privateGet(this, _failed_effect) !== null) {
      pause_effect(__privateGet(this, _failed_effect), () => {
        __privateSet(this, _failed_effect, null);
      });
    }
    __privateMethod(this, _Boundary_instances, run_fn).call(this, () => {
      __privateMethod(this, _Boundary_instances, render_fn).call(this);
    });
  };
  const handle_error_result = (transformed_error) => {
    try {
      calling_on_error = true;
      onerror == null ? void 0 : onerror(transformed_error, reset);
      calling_on_error = false;
    } catch (error2) {
      invoke_error_boundary(error2, __privateGet(this, _effect) && __privateGet(this, _effect).parent);
    }
    if (failed) {
      __privateSet(this, _failed_effect, __privateMethod(this, _Boundary_instances, run_fn).call(this, () => {
        try {
          return branch(() => {
            var effect2 = (
              /** @type {Effect} */
              active_effect
            );
            effect2.b = this;
            effect2.f |= BOUNDARY_EFFECT;
            failed(
              __privateGet(this, _anchor),
              () => transformed_error,
              () => reset
            );
          });
        } catch (error2) {
          invoke_error_boundary(
            error2,
            /** @type {Effect} */
            __privateGet(this, _effect).parent
          );
          return null;
        }
      }));
    }
  };
  queue_micro_task(() => {
    var result;
    try {
      result = this.transform_error(error);
    } catch (e) {
      invoke_error_boundary(e, __privateGet(this, _effect) && __privateGet(this, _effect).parent);
      return;
    }
    if (result !== null && typeof result === "object" && typeof /** @type {any} */
    result.then === "function") {
      result.then(
        handle_error_result,
        /** @param {unknown} e */
        (e) => invoke_error_boundary(e, __privateGet(this, _effect) && __privateGet(this, _effect).parent)
      );
    } else {
      handle_error_result(result);
    }
  });
};
function flatten(blockers, sync, async, fn) {
  const d = derived;
  var pending = blockers.filter((b) => !b.settled);
  var deriveds = sync.map(d);
  if (async.length === 0 && pending.length === 0) {
    fn(deriveds);
    return;
  }
  var parent = (
    /** @type {Effect} */
    active_effect
  );
  var restore = capture();
  var blocker_promise = pending.length === 1 ? pending[0].promise : pending.length > 1 ? Promise.all(pending.map((b) => b.promise)) : null;
  function finish(async2) {
    if ((parent.f & DESTROYED) !== 0) {
      return;
    }
    restore();
    try {
      fn([...deriveds, ...async2]);
    } catch (error) {
      invoke_error_boundary(error, parent);
    }
    unset_context();
  }
  var decrement_pending = increment_pending();
  if (async.length === 0) {
    blocker_promise.then(() => finish([])).finally(decrement_pending);
    return;
  }
  function run() {
    Promise.all(async.map((expression) => /* @__PURE__ */ async_derived(expression))).then(finish).catch((error) => invoke_error_boundary(error, parent)).finally(decrement_pending);
  }
  if (blocker_promise) {
    blocker_promise.then(() => {
      restore();
      run();
      unset_context();
    });
  } else {
    run();
  }
}
function capture() {
  var previous_effect = (
    /** @type {Effect} */
    active_effect
  );
  var previous_reaction = active_reaction;
  var previous_component_context = component_context;
  var previous_batch2 = (
    /** @type {Batch} */
    current_batch
  );
  return function restore(activate_batch = true) {
    set_active_effect(previous_effect);
    set_active_reaction(previous_reaction);
    set_component_context(previous_component_context);
    if (activate_batch && (previous_effect.f & DESTROYED) === 0) {
      previous_batch2 == null ? void 0 : previous_batch2.activate();
      previous_batch2 == null ? void 0 : previous_batch2.apply();
    }
  };
}
function unset_context(deactivate_batch = true) {
  set_active_effect(null);
  set_active_reaction(null);
  set_component_context(null);
  if (deactivate_batch) current_batch == null ? void 0 : current_batch.deactivate();
}
function increment_pending() {
  var effect2 = (
    /** @type {Effect} */
    active_effect
  );
  var boundary2 = effect2.b;
  var batch = (
    /** @type {Batch} */
    current_batch
  );
  var blocking = !!(boundary2 == null ? void 0 : boundary2.is_rendered());
  boundary2 == null ? void 0 : boundary2.update_pending_count(1, batch);
  batch.increment(blocking, effect2);
  return () => {
    boundary2 == null ? void 0 : boundary2.update_pending_count(-1, batch);
    batch.decrement(blocking, effect2);
  };
}
// @__NO_SIDE_EFFECTS__
function derived(fn) {
  var flags2 = DERIVED | DIRTY;
  if (active_effect !== null) {
    active_effect.f |= EFFECT_PRESERVED;
  }
  const signal = {
    ctx: component_context,
    deps: null,
    effects: null,
    equals,
    f: flags2,
    fn,
    reactions: null,
    rv: 0,
    v: (
      /** @type {V} */
      UNINITIALIZED
    ),
    wv: 0,
    parent: active_effect,
    ac: null
  };
  return signal;
}
const OBSOLETE = Symbol("obsolete");
// @__NO_SIDE_EFFECTS__
function async_derived(fn, label, location2) {
  let parent = (
    /** @type {Effect | null} */
    active_effect
  );
  if (parent === null) {
    async_derived_orphan();
  }
  var promise = (
    /** @type {Promise<V>} */
    /** @type {unknown} */
    void 0
  );
  var signal = source(
    /** @type {V} */
    UNINITIALIZED
  );
  var should_suspend = !active_reaction;
  var deferreds = /* @__PURE__ */ new Set();
  async_effect(() => {
    var _a2, _b2;
    var effect2 = (
      /** @type {Effect} */
      active_effect
    );
    var d = deferred();
    promise = d.promise;
    try {
      Promise.resolve(fn()).then(d.resolve, (e) => {
        if (e !== STALE_REACTION) d.reject(e);
      }).finally(unset_context);
    } catch (error) {
      d.reject(error);
      unset_context();
    }
    var batch = (
      /** @type {Batch} */
      current_batch
    );
    if (should_suspend) {
      if ((effect2.f & REACTION_RAN) !== 0) {
        var decrement_pending = increment_pending();
      }
      if (
        // boundary can be null if the async derived is inside an $effect.root not connected to the component render tree
        (_a2 = parent.b) == null ? void 0 : _a2.is_rendered()
      ) {
        (_b2 = batch.async_deriveds.get(effect2)) == null ? void 0 : _b2.reject(OBSOLETE);
      } else {
        for (const d2 of deferreds.values()) {
          d2.reject(OBSOLETE);
        }
      }
      deferreds.add(d);
      batch.async_deriveds.set(effect2, d);
    }
    const handler = (value, error = void 0) => {
      decrement_pending == null ? void 0 : decrement_pending();
      deferreds.delete(d);
      if (error === OBSOLETE) return;
      batch.activate();
      if (error) {
        signal.f |= ERROR_VALUE;
        internal_set(signal, error);
      } else {
        if ((signal.f & ERROR_VALUE) !== 0) {
          signal.f ^= ERROR_VALUE;
        }
        internal_set(signal, value);
      }
      batch.deactivate();
    };
    d.promise.then(handler, (e) => handler(null, e || "unknown"));
  });
  teardown(() => {
    for (const d of deferreds) {
      d.reject(OBSOLETE);
    }
  });
  return new Promise((fulfil) => {
    function next(p) {
      function go() {
        if (p === promise) {
          fulfil(signal);
        } else {
          next(promise);
        }
      }
      p.then(go, go);
    }
    next(promise);
  });
}
// @__NO_SIDE_EFFECTS__
function user_derived(fn) {
  const d = /* @__PURE__ */ derived(fn);
  push_reaction_value(d);
  return d;
}
// @__NO_SIDE_EFFECTS__
function derived_safe_equal(fn) {
  const signal = /* @__PURE__ */ derived(fn);
  signal.equals = safe_equals;
  return signal;
}
function destroy_derived_effects(derived2) {
  var effects = derived2.effects;
  if (effects !== null) {
    derived2.effects = null;
    for (var i = 0; i < effects.length; i += 1) {
      destroy_effect(
        /** @type {Effect} */
        effects[i]
      );
    }
  }
}
function execute_derived(derived2) {
  var value;
  var prev_active_effect = active_effect;
  var parent = derived2.parent;
  if (!is_destroying_effect && parent !== null && derived2.v !== UNINITIALIZED && // if it was never evaluated before, it's guaranteed to fail downstream, so we try to execute instead
  (parent.f & (DESTROYED | INERT)) !== 0) {
    derived_inert();
    return derived2.v;
  }
  set_active_effect(parent);
  {
    try {
      derived2.f &= ~WAS_MARKED;
      destroy_derived_effects(derived2);
      value = update_reaction(derived2);
    } finally {
      set_active_effect(prev_active_effect);
    }
  }
  return value;
}
function update_derived(derived2) {
  var value = execute_derived(derived2);
  if (!derived2.equals(value)) {
    derived2.wv = increment_write_version();
    if (!(current_batch == null ? void 0 : current_batch.is_fork) || derived2.deps === null) {
      if (current_batch !== null) {
        current_batch.capture(derived2, value, true);
        previous_batch == null ? void 0 : previous_batch.capture(derived2, value, true);
      } else {
        derived2.v = value;
      }
      if (derived2.deps === null) {
        set_signal_status(derived2, CLEAN);
        return;
      }
    }
  }
  if (is_destroying_effect) {
    return;
  }
  if (batch_values !== null) {
    if (effect_tracking() || (current_batch == null ? void 0 : current_batch.is_fork)) {
      batch_values.set(derived2, value);
    }
  } else {
    update_derived_status(derived2);
  }
}
function freeze_derived_effects(derived2) {
  var _a2;
  if (derived2.effects === null) return;
  for (const e of derived2.effects) {
    if (e.teardown || e.ac) {
      (_a2 = e.teardown) == null ? void 0 : _a2.call(e);
      if (e.ac !== null) {
        without_reactive_context(() => {
          e.ac.abort(STALE_REACTION);
          e.ac = null;
        });
      }
      if (e.fn !== null) e.teardown = noop;
      remove_reactions(e, 0);
      destroy_effect_children(e);
    }
  }
}
function unfreeze_derived_effects(derived2) {
  if (derived2.effects === null) return;
  for (const e of derived2.effects) {
    if (e.teardown && e.fn !== null) {
      update_effect(e);
    }
  }
}
let first_batch = null;
let last_batch = null;
let current_batch = null;
let previous_batch = null;
let batch_values = null;
let last_scheduled_effect = null;
let is_flushing_sync = false;
let is_processing = false;
let collected_effects = null;
let legacy_updates = null;
var flush_count = 0;
var source_stacks = /* @__PURE__ */ new Set();
let uid = 1;
const _Batch = class _Batch {
  constructor() {
    __privateAdd(this, _Batch_instances);
    __publicField(this, "id", uid++);
    /** True as soon as `#process` was called */
    __privateAdd(this, _started, false);
    __publicField(this, "linked", true);
    /** @type {Batch | null} */
    __privateAdd(this, _prev, null);
    /** @type {Batch | null} */
    __privateAdd(this, _next, null);
    /** @type {Map<Effect, ReturnType<typeof deferred<any>>>} */
    __publicField(this, "async_deriveds", /* @__PURE__ */ new Map());
    /**
     * The current values of any signals that are updated in this batch.
     * Tuple format: [value, is_derived] (note: is_derived is false for deriveds, too, if they were overridden via assignment)
     * They keys of this map are identical to `this.#previous`
     * @type {Map<Value, [any, boolean]>}
     */
    __publicField(this, "current", /* @__PURE__ */ new Map());
    /**
     * The values of any signals (sources and deriveds) that are updated in this batch _before_ those updates took place.
     * They keys of this map are identical to `this.#current`
     * @type {Map<Value, any>}
     */
    __publicField(this, "previous", /* @__PURE__ */ new Map());
    /**
     * When the batch is committed (and the DOM is updated), we need to remove old branches
     * and append new ones by calling the functions added inside (if/each/key/etc) blocks
     * @type {Set<(batch: Batch) => void>}
     */
    __privateAdd(this, _commit_callbacks, /* @__PURE__ */ new Set());
    /**
     * If a fork is discarded, we need to destroy any effects that are no longer needed
     * @type {Set<(batch: Batch) => void>}
     */
    __privateAdd(this, _discard_callbacks, /* @__PURE__ */ new Set());
    /**
     * The number of async effects that are currently in flight
     */
    __privateAdd(this, _pending, 0);
    /**
     * Async effects that are currently in flight, _not_ inside a pending boundary
     * @type {Map<Effect, number>}
     */
    __privateAdd(this, _blocking_pending, /* @__PURE__ */ new Map());
    /**
     * A deferred that resolves when the batch is committed, used with `settled()`
     * TODO replace with Promise.withResolvers once supported widely enough
     * @type {{ promise: Promise<void>, resolve: (value?: any) => void, reject: (reason: unknown) => void } | null}
     */
    __privateAdd(this, _deferred, null);
    /**
     * The root effects that need to be flushed
     * @type {Effect[]}
     */
    __privateAdd(this, _roots, []);
    /**
     * Effects created while this batch was active.
     * @type {Effect[]}
     */
    __privateAdd(this, _new_effects, []);
    /**
     * Deferred effects (which run after async work has completed) that are DIRTY
     * @type {Set<Effect>}
     */
    __privateAdd(this, _dirty_effects2, /* @__PURE__ */ new Set());
    /**
     * Deferred effects that are MAYBE_DIRTY
     * @type {Set<Effect>}
     */
    __privateAdd(this, _maybe_dirty_effects2, /* @__PURE__ */ new Set());
    /**
     * A map of branches that still exist, but will be destroyed when this batch
     * is committed — we skip over these during `process`.
     * The value contains child effects that were dirty/maybe_dirty before being reset,
     * so they can be rescheduled if the branch survives.
     * @type {Map<Effect, { d: Effect[], m: Effect[] }>}
     */
    __privateAdd(this, _skipped_branches, /* @__PURE__ */ new Map());
    /**
     * Inverse of #skipped_branches which we need to tell prior batches to unskip them when committing
     * @type {Set<Effect>}
     */
    __privateAdd(this, _unskipped_branches, /* @__PURE__ */ new Set());
    __publicField(this, "is_fork", false);
    __privateAdd(this, _decrement_queued, false);
    if (last_batch === null) {
      first_batch = last_batch = this;
    } else {
      __privateSet(last_batch, _next, this);
      __privateSet(this, _prev, last_batch);
    }
    last_batch = this;
  }
  /**
   * Add an effect to the #skipped_branches map and reset its children
   * @param {Effect} effect
   */
  skip_effect(effect2) {
    if (!__privateGet(this, _skipped_branches).has(effect2)) {
      __privateGet(this, _skipped_branches).set(effect2, { d: [], m: [] });
    }
    __privateGet(this, _unskipped_branches).delete(effect2);
  }
  /**
   * Remove an effect from the #skipped_branches map and reschedule
   * any tracked dirty/maybe_dirty child effects
   * @param {Effect} effect
   * @param {(e: Effect) => void} callback
   */
  unskip_effect(effect2, callback = (e) => this.schedule(e)) {
    var tracked = __privateGet(this, _skipped_branches).get(effect2);
    if (tracked) {
      __privateGet(this, _skipped_branches).delete(effect2);
      for (var e of tracked.d) {
        set_signal_status(e, DIRTY);
        callback(e);
      }
      for (e of tracked.m) {
        set_signal_status(e, MAYBE_DIRTY);
        callback(e);
      }
    }
    __privateGet(this, _unskipped_branches).add(effect2);
  }
  /**
   * Associate a change to a given source with the current
   * batch, noting its previous and current values
   * @param {Value} source
   * @param {any} value
   * @param {boolean} [is_derived]
   */
  capture(source2, value, is_derived = false) {
    if (source2.v !== UNINITIALIZED && !this.previous.has(source2)) {
      this.previous.set(source2, source2.v);
    }
    if ((source2.f & ERROR_VALUE) === 0) {
      this.current.set(source2, [value, is_derived]);
      batch_values == null ? void 0 : batch_values.set(source2, value);
    }
    if (!this.is_fork) {
      source2.v = value;
    }
  }
  activate() {
    current_batch = this;
  }
  deactivate() {
    current_batch = null;
    batch_values = null;
  }
  flush() {
    try {
      if (DEV) ;
      is_processing = true;
      current_batch = this;
      __privateMethod(this, _Batch_instances, process_fn).call(this);
    } finally {
      flush_count = 0;
      last_scheduled_effect = null;
      collected_effects = null;
      legacy_updates = null;
      is_processing = false;
      current_batch = null;
      batch_values = null;
      old_values.clear();
    }
  }
  discard() {
    var _a2;
    for (const fn of __privateGet(this, _discard_callbacks)) fn(this);
    __privateGet(this, _discard_callbacks).clear();
    for (const deferred2 of this.async_deriveds.values()) {
      deferred2.reject(OBSOLETE);
    }
    __privateMethod(this, _Batch_instances, unlink_fn).call(this);
    (_a2 = __privateGet(this, _deferred)) == null ? void 0 : _a2.resolve();
  }
  /**
   * @param {Effect} effect
   */
  register_created_effect(effect2) {
    __privateGet(this, _new_effects).push(effect2);
  }
  /**
   * @param {boolean} blocking
   * @param {Effect} effect
   */
  increment(blocking, effect2) {
    __privateSet(this, _pending, __privateGet(this, _pending) + 1);
    if (blocking) {
      let blocking_pending_count = __privateGet(this, _blocking_pending).get(effect2) ?? 0;
      __privateGet(this, _blocking_pending).set(effect2, blocking_pending_count + 1);
    }
  }
  /**
   * @param {boolean} blocking
   * @param {Effect} effect
   */
  decrement(blocking, effect2) {
    __privateSet(this, _pending, __privateGet(this, _pending) - 1);
    if (blocking) {
      let blocking_pending_count = __privateGet(this, _blocking_pending).get(effect2) ?? 0;
      if (blocking_pending_count === 1) {
        __privateGet(this, _blocking_pending).delete(effect2);
      } else {
        __privateGet(this, _blocking_pending).set(effect2, blocking_pending_count - 1);
      }
    }
    if (__privateGet(this, _decrement_queued)) return;
    __privateSet(this, _decrement_queued, true);
    queue_micro_task(() => {
      __privateSet(this, _decrement_queued, false);
      if (this.linked) {
        this.flush();
      }
    });
  }
  /**
   * @param {Set<Effect>} dirty_effects
   * @param {Set<Effect>} maybe_dirty_effects
   */
  transfer_effects(dirty_effects, maybe_dirty_effects) {
    for (const e of dirty_effects) {
      __privateGet(this, _dirty_effects2).add(e);
    }
    for (const e of maybe_dirty_effects) {
      __privateGet(this, _maybe_dirty_effects2).add(e);
    }
    dirty_effects.clear();
    maybe_dirty_effects.clear();
  }
  /** @param {(batch: Batch) => void} fn */
  oncommit(fn) {
    __privateGet(this, _commit_callbacks).add(fn);
  }
  /** @param {(batch: Batch) => void} fn */
  ondiscard(fn) {
    __privateGet(this, _discard_callbacks).add(fn);
  }
  settled() {
    return (__privateGet(this, _deferred) ?? __privateSet(this, _deferred, deferred())).promise;
  }
  static ensure() {
    if (current_batch === null) {
      const batch = current_batch = new _Batch();
      if (!is_processing && !is_flushing_sync) {
        queue_micro_task(() => {
          if (!__privateGet(batch, _started)) {
            batch.flush();
          }
        });
      }
    }
    return current_batch;
  }
  apply() {
    {
      batch_values = null;
      return;
    }
  }
  /**
   *
   * @param {Effect} effect
   */
  schedule(effect2) {
    var _a2;
    last_scheduled_effect = effect2;
    if (((_a2 = effect2.b) == null ? void 0 : _a2.is_pending) && (effect2.f & (EFFECT | RENDER_EFFECT | MANAGED_EFFECT)) !== 0 && (effect2.f & REACTION_RAN) === 0) {
      effect2.b.defer_effect(effect2);
      return;
    }
    var e = effect2;
    while (e.parent !== null) {
      e = e.parent;
      var flags2 = e.f;
      if (collected_effects !== null && e === active_effect) {
        if ((active_reaction === null || (active_reaction.f & DERIVED) === 0) && true) {
          return;
        }
      }
      if ((flags2 & (ROOT_EFFECT | BRANCH_EFFECT)) !== 0) {
        if ((flags2 & CLEAN) === 0) {
          return;
        }
        e.f ^= CLEAN;
      }
    }
    __privateGet(this, _roots).push(e);
  }
};
_started = new WeakMap();
_prev = new WeakMap();
_next = new WeakMap();
_commit_callbacks = new WeakMap();
_discard_callbacks = new WeakMap();
_pending = new WeakMap();
_blocking_pending = new WeakMap();
_deferred = new WeakMap();
_roots = new WeakMap();
_new_effects = new WeakMap();
_dirty_effects2 = new WeakMap();
_maybe_dirty_effects2 = new WeakMap();
_skipped_branches = new WeakMap();
_unskipped_branches = new WeakMap();
_decrement_queued = new WeakMap();
_Batch_instances = new WeakSet();
is_deferred_fn = function() {
  if (this.is_fork) return true;
  for (const effect2 of __privateGet(this, _blocking_pending).keys()) {
    var e = effect2;
    var skipped = false;
    while (e.parent !== null) {
      if (__privateGet(this, _skipped_branches).has(e)) {
        skipped = true;
        break;
      }
      e = e.parent;
    }
    if (!skipped) {
      return true;
    }
  }
  return false;
};
process_fn = function() {
  var _a2, _b2, _c2, _d;
  __privateSet(this, _started, true);
  if (flush_count++ > 1e3) {
    __privateMethod(this, _Batch_instances, unlink_fn).call(this);
    infinite_loop_guard();
  }
  for (const e of __privateGet(this, _dirty_effects2)) {
    __privateGet(this, _maybe_dirty_effects2).delete(e);
    set_signal_status(e, DIRTY);
    this.schedule(e);
  }
  for (const e of __privateGet(this, _maybe_dirty_effects2)) {
    set_signal_status(e, MAYBE_DIRTY);
    this.schedule(e);
  }
  const roots = __privateGet(this, _roots);
  __privateSet(this, _roots, []);
  this.apply();
  var effects = collected_effects = [];
  var render_effects = [];
  var updates = legacy_updates = [];
  for (const root2 of roots) {
    try {
      __privateMethod(this, _Batch_instances, traverse_fn).call(this, root2, effects, render_effects);
    } catch (e) {
      reset_all(root2);
      if (!__privateMethod(this, _Batch_instances, is_deferred_fn).call(this)) this.discard();
      throw e;
    }
  }
  current_batch = null;
  if (updates.length > 0) {
    var batch = _Batch.ensure();
    for (const e of updates) {
      batch.schedule(e);
    }
  }
  collected_effects = null;
  legacy_updates = null;
  if (__privateMethod(this, _Batch_instances, is_deferred_fn).call(this)) {
    __privateMethod(this, _Batch_instances, defer_effects_fn).call(this, render_effects);
    __privateMethod(this, _Batch_instances, defer_effects_fn).call(this, effects);
    for (const [e, t] of __privateGet(this, _skipped_branches)) {
      reset_branch(e, t);
    }
    if (updates.length > 0) {
      /** @type {unknown} */
      __privateMethod(_a2 = current_batch, _Batch_instances, process_fn).call(_a2);
    }
    return;
  }
  const earlier_batch = __privateMethod(this, _Batch_instances, find_earlier_batch_fn).call(this);
  if (earlier_batch) {
    __privateMethod(this, _Batch_instances, defer_effects_fn).call(this, render_effects);
    __privateMethod(this, _Batch_instances, defer_effects_fn).call(this, effects);
    __privateMethod(_b2 = earlier_batch, _Batch_instances, merge_fn).call(_b2, this);
    return;
  }
  __privateGet(this, _dirty_effects2).clear();
  __privateGet(this, _maybe_dirty_effects2).clear();
  for (const fn of __privateGet(this, _commit_callbacks)) fn(this);
  __privateGet(this, _commit_callbacks).clear();
  previous_batch = this;
  flush_queued_effects(render_effects);
  flush_queued_effects(effects);
  previous_batch = null;
  (_c2 = __privateGet(this, _deferred)) == null ? void 0 : _c2.resolve();
  var next_batch = (
    /** @type {Batch | null} */
    /** @type {unknown} */
    current_batch
  );
  if (__privateGet(this, _pending) === 0 && (__privateGet(this, _roots).length === 0 || next_batch !== null)) {
    __privateMethod(this, _Batch_instances, unlink_fn).call(this);
  }
  if (__privateGet(this, _roots).length > 0) {
    if (next_batch !== null) {
      const batch2 = next_batch;
      __privateGet(batch2, _roots).push(...__privateGet(this, _roots).filter((r) => !__privateGet(batch2, _roots).includes(r)));
    } else {
      next_batch = this;
    }
  }
  if (next_batch !== null) {
    __privateMethod(_d = next_batch, _Batch_instances, process_fn).call(_d);
  }
};
/**
 * Traverse the effect tree, executing effects or stashing
 * them for later execution as appropriate
 * @param {Effect} root
 * @param {Effect[]} effects
 * @param {Effect[]} render_effects
 */
traverse_fn = function(root2, effects, render_effects) {
  root2.f ^= CLEAN;
  var effect2 = root2.first;
  while (effect2 !== null) {
    var flags2 = effect2.f;
    var is_branch = (flags2 & (BRANCH_EFFECT | ROOT_EFFECT)) !== 0;
    var is_skippable_branch = is_branch && (flags2 & CLEAN) !== 0;
    var skip = is_skippable_branch || (flags2 & INERT) !== 0 || __privateGet(this, _skipped_branches).has(effect2);
    if (!skip && effect2.fn !== null) {
      if (is_branch) {
        effect2.f ^= CLEAN;
      } else if ((flags2 & EFFECT) !== 0) {
        effects.push(effect2);
      } else if (is_dirty(effect2)) {
        if ((flags2 & BLOCK_EFFECT) !== 0) __privateGet(this, _maybe_dirty_effects2).add(effect2);
        update_effect(effect2);
      }
      var child2 = effect2.first;
      if (child2 !== null) {
        effect2 = child2;
        continue;
      }
    }
    while (effect2 !== null) {
      var next = effect2.next;
      if (next !== null) {
        effect2 = next;
        break;
      }
      effect2 = effect2.parent;
    }
  }
};
find_earlier_batch_fn = function() {
  var batch = __privateGet(this, _prev);
  while (batch !== null) {
    if (!batch.is_fork) {
      for (const [value, [, is_derived]] of this.current) {
        if (batch.current.has(value) && !is_derived) {
          return batch;
        }
      }
    }
    batch = __privateGet(batch, _prev);
  }
  return null;
};
/**
 * @param {Batch} batch
 */
merge_fn = function(batch) {
  var _a2;
  for (const [source2, value] of batch.current) {
    if (!this.previous.has(source2) && batch.previous.has(source2)) {
      this.previous.set(source2, batch.previous.get(source2));
    }
    this.current.set(source2, value);
  }
  for (const [effect2, deferred2] of batch.async_deriveds) {
    const d = this.async_deriveds.get(effect2);
    if (d) deferred2.promise.then(d.resolve).catch(d.reject);
  }
  batch.async_deriveds.clear();
  this.transfer_effects(__privateGet(batch, _dirty_effects2), __privateGet(batch, _maybe_dirty_effects2));
  const mark = (value) => {
    var reactions = value.reactions;
    if (reactions === null) return;
    if ((value.f & DERIVED) !== 0 && (value.f & (DIRTY | MAYBE_DIRTY)) === 0) {
      return;
    }
    for (const reaction of reactions) {
      var flags2 = reaction.f;
      if ((flags2 & DERIVED) !== 0) {
        mark(
          /** @type {Derived} */
          reaction
        );
      } else {
        var effect2 = (
          /** @type {Effect} */
          reaction
        );
        if (flags2 & (ASYNC | BLOCK_EFFECT) && !this.async_deriveds.has(effect2)) {
          __privateGet(this, _maybe_dirty_effects2).delete(effect2);
          set_signal_status(effect2, DIRTY);
          this.schedule(effect2);
        }
      }
    }
  };
  for (const source2 of this.current.keys()) {
    mark(source2);
  }
  this.oncommit(() => batch.discard());
  __privateMethod(_a2 = batch, _Batch_instances, unlink_fn).call(_a2);
  current_batch = this;
  __privateMethod(this, _Batch_instances, process_fn).call(this);
};
/**
 * @param {Effect[]} effects
 */
defer_effects_fn = function(effects) {
  for (var i = 0; i < effects.length; i += 1) {
    defer_effect(effects[i], __privateGet(this, _dirty_effects2), __privateGet(this, _maybe_dirty_effects2));
  }
};
commit_fn = function() {
  var _a2;
  for (let batch = first_batch; batch !== null; batch = __privateGet(batch, _next)) {
    var is_earlier = batch.id < this.id;
    var sources = [];
    for (const [source3, [value, is_derived]] of this.current) {
      if (batch.current.has(source3)) {
        var batch_value = (
          /** @type {[any, boolean]} */
          batch.current.get(source3)[0]
        );
        if (is_earlier && value !== batch_value) {
          batch.current.set(source3, [value, is_derived]);
        } else {
          continue;
        }
      }
      sources.push(source3);
    }
    if (is_earlier) {
      for (const [effect2, deferred2] of this.async_deriveds) {
        const d = batch.async_deriveds.get(effect2);
        if (d) deferred2.promise.then(d.resolve).catch(d.reject);
      }
    }
    var current = [...batch.current.keys()].filter(
      (source3) => !/** @type {[any, boolean]} */
      batch.current.get(source3)[1]
    );
    if (!__privateGet(batch, _started) || current.length === 0) continue;
    var others = current.filter((source3) => !this.current.has(source3));
    if (others.length === 0) {
      if (is_earlier) {
        batch.discard();
      }
    } else if (sources.length > 0) {
      if (is_earlier) {
        for (const unskipped of __privateGet(this, _unskipped_branches)) {
          batch.unskip_effect(unskipped, (e) => {
            var _a3;
            if ((e.f & (BLOCK_EFFECT | ASYNC)) !== 0) {
              batch.schedule(e);
            } else {
              __privateMethod(_a3 = batch, _Batch_instances, defer_effects_fn).call(_a3, [e]);
            }
          });
        }
      }
      batch.activate();
      var marked = /* @__PURE__ */ new Set();
      var checked = /* @__PURE__ */ new Map();
      for (var source2 of sources) {
        mark_effects(source2, others, marked, checked);
      }
      checked = /* @__PURE__ */ new Map();
      var current_unequal = [...batch.current].filter(([c, v1]) => {
        const v2 = this.current.get(c);
        if (!v2) return true;
        return v2[0] !== v1[0] || v2[1] !== v1[1];
      }).map(([c]) => c);
      if (current_unequal.length > 0) {
        for (const effect2 of __privateGet(this, _new_effects)) {
          if ((effect2.f & (DESTROYED | INERT | EAGER_EFFECT)) === 0 && depends_on(effect2, current_unequal, checked)) {
            if ((effect2.f & (ASYNC | BLOCK_EFFECT)) !== 0) {
              set_signal_status(effect2, DIRTY);
              batch.schedule(effect2);
            } else {
              __privateGet(batch, _dirty_effects2).add(effect2);
            }
          }
        }
      }
      if (__privateGet(batch, _roots).length > 0 && !__privateGet(batch, _decrement_queued)) {
        batch.apply();
        for (var root2 of __privateGet(batch, _roots)) {
          __privateMethod(_a2 = batch, _Batch_instances, traverse_fn).call(_a2, root2, [], []);
        }
        __privateSet(batch, _roots, []);
      }
      batch.deactivate();
    }
  }
};
unlink_fn = function() {
  if (!this.linked) return;
  var prev = __privateGet(this, _prev);
  var next = __privateGet(this, _next);
  if (prev === null) {
    first_batch = next;
  } else {
    __privateSet(prev, _next, next);
  }
  if (next === null) {
    last_batch = prev;
  } else {
    __privateSet(next, _prev, prev);
  }
  this.linked = false;
};
let Batch = _Batch;
function flushSync(fn) {
  var was_flushing_sync = is_flushing_sync;
  is_flushing_sync = true;
  try {
    var result;
    if (fn) ;
    while (true) {
      flush_tasks();
      if (current_batch === null) {
        return (
          /** @type {T} */
          result
        );
      }
      current_batch.flush();
    }
  } finally {
    is_flushing_sync = was_flushing_sync;
  }
}
function infinite_loop_guard() {
  try {
    effect_update_depth_exceeded();
  } catch (error) {
    invoke_error_boundary(error, last_scheduled_effect);
  }
}
let eager_block_effects = null;
function flush_queued_effects(effects) {
  var length = effects.length;
  if (length === 0) return;
  var i = 0;
  while (i < length) {
    var effect2 = effects[i++];
    if ((effect2.f & (DESTROYED | INERT)) === 0 && is_dirty(effect2)) {
      eager_block_effects = /* @__PURE__ */ new Set();
      update_effect(effect2);
      if (effect2.deps === null && effect2.first === null && effect2.nodes === null && effect2.teardown === null && effect2.ac === null) {
        unlink_effect(effect2);
      }
      if ((eager_block_effects == null ? void 0 : eager_block_effects.size) > 0) {
        old_values.clear();
        for (const e of eager_block_effects) {
          if ((e.f & (DESTROYED | INERT)) !== 0) continue;
          const ordered_effects = [e];
          let ancestor = e.parent;
          while (ancestor !== null) {
            if (eager_block_effects.has(ancestor)) {
              eager_block_effects.delete(ancestor);
              ordered_effects.push(ancestor);
            }
            ancestor = ancestor.parent;
          }
          for (let j = ordered_effects.length - 1; j >= 0; j--) {
            const e2 = ordered_effects[j];
            if ((e2.f & (DESTROYED | INERT)) !== 0) continue;
            update_effect(e2);
          }
        }
        eager_block_effects.clear();
      }
    }
  }
  eager_block_effects = null;
}
function mark_effects(value, sources, marked, checked) {
  if (marked.has(value)) return;
  marked.add(value);
  if (value.reactions !== null) {
    for (const reaction of value.reactions) {
      const flags2 = reaction.f;
      if ((flags2 & DERIVED) !== 0) {
        mark_effects(
          /** @type {Derived} */
          reaction,
          sources,
          marked,
          checked
        );
      } else if ((flags2 & (ASYNC | BLOCK_EFFECT)) !== 0 && (flags2 & DIRTY) === 0 && depends_on(reaction, sources, checked)) {
        set_signal_status(reaction, DIRTY);
        schedule_effect(
          /** @type {Effect} */
          reaction
        );
      }
    }
  }
}
function depends_on(reaction, sources, checked) {
  const depends = checked.get(reaction);
  if (depends !== void 0) return depends;
  if (reaction.deps !== null) {
    for (const dep of reaction.deps) {
      if (includes.call(sources, dep)) {
        return true;
      }
      if ((dep.f & DERIVED) !== 0 && depends_on(
        /** @type {Derived} */
        dep,
        sources,
        checked
      )) {
        checked.set(
          /** @type {Derived} */
          dep,
          true
        );
        return true;
      }
    }
  }
  checked.set(reaction, false);
  return false;
}
function schedule_effect(effect2) {
  current_batch.schedule(effect2);
}
function reset_branch(effect2, tracked) {
  if ((effect2.f & BRANCH_EFFECT) !== 0 && (effect2.f & CLEAN) !== 0) {
    return;
  }
  if ((effect2.f & DIRTY) !== 0) {
    tracked.d.push(effect2);
  } else if ((effect2.f & MAYBE_DIRTY) !== 0) {
    tracked.m.push(effect2);
  }
  set_signal_status(effect2, CLEAN);
  var e = effect2.first;
  while (e !== null) {
    reset_branch(e, tracked);
    e = e.next;
  }
}
function reset_all(effect2) {
  set_signal_status(effect2, CLEAN);
  var e = effect2.first;
  while (e !== null) {
    reset_all(e);
    e = e.next;
  }
}
let eager_effects = /* @__PURE__ */ new Set();
const old_values = /* @__PURE__ */ new Map();
let eager_effects_deferred = false;
function source(v, stack) {
  var signal = {
    f: 0,
    // TODO ideally we could skip this altogether, but it causes type errors
    v,
    reactions: null,
    equals,
    rv: 0,
    wv: 0
  };
  return signal;
}
// @__NO_SIDE_EFFECTS__
function state(v, stack) {
  const s = source(v);
  push_reaction_value(s);
  return s;
}
// @__NO_SIDE_EFFECTS__
function mutable_source(initial_value, immutable = false, trackable = true) {
  const s = source(initial_value);
  if (!immutable) {
    s.equals = safe_equals;
  }
  return s;
}
function set(source2, value, should_proxy = false) {
  if (active_reaction !== null && // since we are untracking the function inside `$inspect.with` we need to add this check
  // to ensure we error if state is set inside an inspect effect
  (!untracking || (active_reaction.f & EAGER_EFFECT) !== 0) && is_runes() && (active_reaction.f & (DERIVED | BLOCK_EFFECT | ASYNC | EAGER_EFFECT)) !== 0 && (current_sources === null || !current_sources.has(source2))) {
    state_unsafe_mutation();
  }
  let new_value = should_proxy ? proxy(value) : value;
  return internal_set(source2, new_value, legacy_updates);
}
function internal_set(source2, value, updated_during_traversal = null) {
  if (!source2.equals(value)) {
    old_values.set(source2, is_destroying_effect ? value : source2.v);
    var batch = Batch.ensure();
    batch.capture(source2, value);
    if ((source2.f & DERIVED) !== 0) {
      const derived2 = (
        /** @type {Derived} */
        source2
      );
      if ((source2.f & DIRTY) !== 0) {
        execute_derived(derived2);
      }
      if (batch_values === null) {
        update_derived_status(derived2);
      }
    }
    source2.wv = increment_write_version();
    mark_reactions(source2, DIRTY, updated_during_traversal);
    if (active_effect !== null && (active_effect.f & CLEAN) !== 0 && (active_effect.f & (BRANCH_EFFECT | ROOT_EFFECT)) === 0) {
      if (untracked_writes === null) {
        set_untracked_writes([source2]);
      } else {
        untracked_writes.push(source2);
      }
    }
    if (!batch.is_fork && eager_effects.size > 0 && !eager_effects_deferred) {
      flush_eager_effects();
    }
  }
  return value;
}
function flush_eager_effects() {
  eager_effects_deferred = false;
  for (const effect2 of eager_effects) {
    if ((effect2.f & CLEAN) !== 0) {
      set_signal_status(effect2, MAYBE_DIRTY);
    }
    let dirty;
    try {
      dirty = is_dirty(effect2);
    } catch {
      dirty = true;
    }
    if (dirty) {
      update_effect(effect2);
    }
  }
  eager_effects.clear();
}
function increment(source2) {
  set(source2, source2.v + 1);
}
function mark_reactions(signal, status, updated_during_traversal) {
  var reactions = signal.reactions;
  if (reactions === null) return;
  var length = reactions.length;
  for (var i = 0; i < length; i++) {
    var reaction = reactions[i];
    var flags2 = reaction.f;
    var not_dirty = (flags2 & DIRTY) === 0;
    if (not_dirty) {
      set_signal_status(reaction, status);
    }
    if ((flags2 & EAGER_EFFECT) !== 0) {
      eager_effects.add(
        /** @type {Effect} */
        reaction
      );
    } else if ((flags2 & DERIVED) !== 0) {
      var derived2 = (
        /** @type {Derived} */
        reaction
      );
      batch_values == null ? void 0 : batch_values.delete(derived2);
      if ((flags2 & WAS_MARKED) === 0) {
        if (flags2 & CONNECTED && (active_effect === null || (active_effect.f & REACTION_IS_UPDATING) === 0)) {
          reaction.f |= WAS_MARKED;
        }
        mark_reactions(derived2, MAYBE_DIRTY, updated_during_traversal);
      }
    } else if (not_dirty) {
      var effect2 = (
        /** @type {Effect} */
        reaction
      );
      if ((flags2 & BLOCK_EFFECT) !== 0 && eager_block_effects !== null) {
        eager_block_effects.add(effect2);
      }
      if (updated_during_traversal !== null) {
        updated_during_traversal.push(effect2);
      } else {
        schedule_effect(effect2);
      }
    }
  }
}
function proxy(value) {
  if (typeof value !== "object" || value === null || STATE_SYMBOL in value) {
    return value;
  }
  const prototype = get_prototype_of(value);
  if (prototype !== object_prototype && prototype !== array_prototype) {
    return value;
  }
  var sources = /* @__PURE__ */ new Map();
  var is_proxied_array = is_array(value);
  var version = /* @__PURE__ */ state(0);
  var parent_version = update_version;
  var with_parent = (fn) => {
    if (update_version === parent_version) {
      return fn();
    }
    var reaction = active_reaction;
    var version2 = update_version;
    set_active_reaction(null);
    set_update_version(parent_version);
    var result = fn();
    set_active_reaction(reaction);
    set_update_version(version2);
    return result;
  };
  if (is_proxied_array) {
    sources.set("length", /* @__PURE__ */ state(
      /** @type {any[]} */
      value.length
    ));
  }
  return new Proxy(
    /** @type {any} */
    value,
    {
      defineProperty(_, prop2, descriptor) {
        if (!("value" in descriptor) || descriptor.configurable === false || descriptor.enumerable === false || descriptor.writable === false) {
          state_descriptors_fixed();
        }
        var s = sources.get(prop2);
        if (s === void 0) {
          with_parent(() => {
            var s2 = /* @__PURE__ */ state(descriptor.value);
            sources.set(prop2, s2);
            return s2;
          });
        } else {
          set(s, descriptor.value, true);
        }
        return true;
      },
      deleteProperty(target2, prop2) {
        var s = sources.get(prop2);
        if (s === void 0) {
          if (prop2 in target2) {
            const s2 = with_parent(() => /* @__PURE__ */ state(UNINITIALIZED));
            sources.set(prop2, s2);
            increment(version);
          }
        } else {
          set(s, UNINITIALIZED);
          increment(version);
        }
        return true;
      },
      get(target2, prop2, receiver) {
        var _a2;
        if (prop2 === STATE_SYMBOL) {
          return value;
        }
        var s = sources.get(prop2);
        var exists = prop2 in target2;
        if (s === void 0 && (!exists || ((_a2 = get_descriptor(target2, prop2)) == null ? void 0 : _a2.writable))) {
          s = with_parent(() => {
            var p = proxy(exists ? target2[prop2] : UNINITIALIZED);
            var s2 = /* @__PURE__ */ state(p);
            return s2;
          });
          sources.set(prop2, s);
        }
        if (s !== void 0) {
          var v = get(s);
          return v === UNINITIALIZED ? void 0 : v;
        }
        return Reflect.get(target2, prop2, receiver);
      },
      getOwnPropertyDescriptor(target2, prop2) {
        var descriptor = Reflect.getOwnPropertyDescriptor(target2, prop2);
        if (descriptor && "value" in descriptor) {
          var s = sources.get(prop2);
          if (s) descriptor.value = get(s);
        } else if (descriptor === void 0) {
          var source2 = sources.get(prop2);
          var value2 = source2 == null ? void 0 : source2.v;
          if (source2 !== void 0 && value2 !== UNINITIALIZED) {
            return {
              enumerable: true,
              configurable: true,
              value: value2,
              writable: true
            };
          }
        }
        return descriptor;
      },
      has(target2, prop2) {
        var _a2;
        if (prop2 === STATE_SYMBOL) {
          return true;
        }
        var s = sources.get(prop2);
        var has = s !== void 0 && s.v !== UNINITIALIZED || Reflect.has(target2, prop2);
        if (s !== void 0 || active_effect !== null && (!has || ((_a2 = get_descriptor(target2, prop2)) == null ? void 0 : _a2.writable))) {
          if (s === void 0) {
            s = with_parent(() => {
              var p = has ? proxy(target2[prop2]) : UNINITIALIZED;
              var s2 = /* @__PURE__ */ state(p);
              return s2;
            });
            sources.set(prop2, s);
          }
          var value2 = get(s);
          if (value2 === UNINITIALIZED) {
            return false;
          }
        }
        return has;
      },
      set(target2, prop2, value2, receiver) {
        var _a2;
        var s = sources.get(prop2);
        var has = prop2 in target2;
        if (is_proxied_array && prop2 === "length") {
          for (var i = value2; i < /** @type {Source<number>} */
          s.v; i += 1) {
            var other_s = sources.get(i + "");
            if (other_s !== void 0) {
              set(other_s, UNINITIALIZED);
            } else if (i in target2) {
              other_s = with_parent(() => /* @__PURE__ */ state(UNINITIALIZED));
              sources.set(i + "", other_s);
            }
          }
        }
        if (s === void 0) {
          if (!has || ((_a2 = get_descriptor(target2, prop2)) == null ? void 0 : _a2.writable)) {
            s = with_parent(() => /* @__PURE__ */ state(void 0));
            set(s, proxy(value2));
            sources.set(prop2, s);
          }
        } else {
          has = s.v !== UNINITIALIZED;
          var p = with_parent(() => proxy(value2));
          set(s, p);
        }
        var descriptor = Reflect.getOwnPropertyDescriptor(target2, prop2);
        if (descriptor == null ? void 0 : descriptor.set) {
          descriptor.set.call(receiver, value2);
        }
        if (!has) {
          if (is_proxied_array && typeof prop2 === "string") {
            var ls = (
              /** @type {Source<number>} */
              sources.get("length")
            );
            var n = Number(prop2);
            if (Number.isInteger(n) && n >= ls.v) {
              set(ls, n + 1);
            }
          }
          increment(version);
        }
        return true;
      },
      ownKeys(target2) {
        get(version);
        var own_keys = Reflect.ownKeys(target2).filter((key3) => {
          var source3 = sources.get(key3);
          return source3 === void 0 || source3.v !== UNINITIALIZED;
        });
        for (var [key2, source2] of sources) {
          if (source2.v !== UNINITIALIZED && !(key2 in target2)) {
            own_keys.push(key2);
          }
        }
        return own_keys;
      },
      setPrototypeOf() {
        state_prototype_fixed();
      }
    }
  );
}
function get_proxied_value(value) {
  try {
    if (value !== null && typeof value === "object" && STATE_SYMBOL in value) {
      return value[STATE_SYMBOL];
    }
  } catch {
  }
  return value;
}
function is(a, b) {
  return Object.is(get_proxied_value(a), get_proxied_value(b));
}
var $window;
var is_firefox;
var first_child_getter;
var next_sibling_getter;
function init_operations() {
  if ($window !== void 0) {
    return;
  }
  $window = window;
  is_firefox = /Firefox/.test(navigator.userAgent);
  var element_prototype = Element.prototype;
  var node_prototype = Node.prototype;
  var text_prototype = Text.prototype;
  first_child_getter = get_descriptor(node_prototype, "firstChild").get;
  next_sibling_getter = get_descriptor(node_prototype, "nextSibling").get;
  if (is_extensible(element_prototype)) {
    element_prototype[CLASS_CACHE] = void 0;
    element_prototype[ATTRIBUTES_CACHE] = null;
    element_prototype[STYLE_CACHE] = void 0;
    element_prototype.__e = void 0;
  }
  if (is_extensible(text_prototype)) {
    text_prototype[TEXT_CACHE] = void 0;
  }
}
function create_text(value = "") {
  return document.createTextNode(value);
}
// @__NO_SIDE_EFFECTS__
function get_first_child(node) {
  return (
    /** @type {TemplateNode | null} */
    first_child_getter.call(node)
  );
}
// @__NO_SIDE_EFFECTS__
function get_next_sibling(node) {
  return (
    /** @type {TemplateNode | null} */
    next_sibling_getter.call(node)
  );
}
function child(node, is_text) {
  {
    return /* @__PURE__ */ get_first_child(node);
  }
}
function first_child(node, is_text = false) {
  {
    var first = /* @__PURE__ */ get_first_child(node);
    if (first instanceof Comment && first.data === "") return /* @__PURE__ */ get_next_sibling(first);
    return first;
  }
}
function sibling(node, count = 1, is_text = false) {
  let next_sibling = node;
  while (count--) {
    next_sibling = /** @type {TemplateNode} */
    /* @__PURE__ */ get_next_sibling(next_sibling);
  }
  {
    return next_sibling;
  }
}
function clear_text_content(node) {
  node.textContent = "";
}
function should_defer_append() {
  return false;
}
function create_element(tag, namespace, is2) {
  {
    return (
      /** @type {T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T] : Element} */
      is2 ? document.createElement(tag, { is: is2 }) : document.createElement(tag)
    );
  }
}
function validate_effect(rune) {
  if (active_effect === null) {
    if (active_reaction === null) {
      effect_orphan();
    }
    effect_in_unowned_derived();
  }
  if (is_destroying_effect) {
    effect_in_teardown();
  }
}
function push_effect(effect2, parent_effect) {
  var parent_last = parent_effect.last;
  if (parent_last === null) {
    parent_effect.last = parent_effect.first = effect2;
  } else {
    parent_last.next = effect2;
    effect2.prev = parent_last;
    parent_effect.last = effect2;
  }
}
function create_effect(type, fn) {
  var parent = active_effect;
  if (parent !== null && (parent.f & INERT) !== 0) {
    type |= INERT;
  }
  var effect2 = {
    ctx: component_context,
    deps: null,
    nodes: null,
    f: type | DIRTY | CONNECTED,
    first: null,
    fn,
    last: null,
    next: null,
    parent,
    b: parent && parent.b,
    prev: null,
    teardown: null,
    wv: 0,
    ac: null
  };
  current_batch == null ? void 0 : current_batch.register_created_effect(effect2);
  var e = effect2;
  if ((type & EFFECT) !== 0) {
    if (collected_effects !== null) {
      collected_effects.push(effect2);
    } else {
      Batch.ensure().schedule(effect2);
    }
  } else if (fn !== null) {
    try {
      update_effect(effect2);
    } catch (e2) {
      destroy_effect(effect2);
      throw e2;
    }
    if (e.deps === null && e.teardown === null && e.nodes === null && e.first === e.last && // either `null`, or a singular child
    (e.f & EFFECT_PRESERVED) === 0) {
      e = e.first;
      if ((type & BLOCK_EFFECT) !== 0 && (type & EFFECT_TRANSPARENT) !== 0 && e !== null) {
        e.f |= EFFECT_TRANSPARENT;
      }
    }
  }
  if (e !== null) {
    e.parent = parent;
    if (parent !== null) {
      push_effect(e, parent);
    }
    if (active_reaction !== null && (active_reaction.f & DERIVED) !== 0 && (type & ROOT_EFFECT) === 0) {
      var derived2 = (
        /** @type {Derived} */
        active_reaction
      );
      (derived2.effects ?? (derived2.effects = [])).push(e);
    }
  }
  return effect2;
}
function effect_tracking() {
  return active_reaction !== null && !untracking;
}
function teardown(fn) {
  const effect2 = create_effect(RENDER_EFFECT, null);
  set_signal_status(effect2, CLEAN);
  effect2.teardown = fn;
  return effect2;
}
function user_effect(fn) {
  validate_effect();
  var flags2 = (
    /** @type {Effect} */
    active_effect.f
  );
  var defer = !active_reaction && (flags2 & BRANCH_EFFECT) !== 0 && component_context !== null && !component_context.i;
  if (defer) {
    var context = (
      /** @type {ComponentContext} */
      component_context
    );
    (context.e ?? (context.e = [])).push(fn);
  } else {
    return create_user_effect(fn);
  }
}
function create_user_effect(fn) {
  return create_effect(EFFECT | USER_EFFECT, fn);
}
function component_root(fn) {
  Batch.ensure();
  const effect2 = create_effect(ROOT_EFFECT | EFFECT_PRESERVED, fn);
  return (options = {}) => {
    return new Promise((fulfil) => {
      if (options.outro) {
        pause_effect(effect2, () => {
          destroy_effect(effect2);
          fulfil(void 0);
        });
      } else {
        destroy_effect(effect2);
        fulfil(void 0);
      }
    });
  };
}
function effect(fn) {
  return create_effect(EFFECT, fn);
}
function async_effect(fn) {
  return create_effect(ASYNC | EFFECT_PRESERVED, fn);
}
function render_effect(fn, flags2 = 0) {
  return create_effect(RENDER_EFFECT | flags2, fn);
}
function template_effect(fn, sync = [], async = [], blockers = []) {
  flatten(blockers, sync, async, (values) => {
    create_effect(RENDER_EFFECT, () => {
      fn(...values.map(get));
    });
  });
}
function block(fn, flags2 = 0) {
  var effect2 = create_effect(BLOCK_EFFECT | flags2, fn);
  return effect2;
}
function branch(fn) {
  return create_effect(BRANCH_EFFECT | EFFECT_PRESERVED, fn);
}
function execute_effect_teardown(effect2) {
  var teardown2 = effect2.teardown;
  if (teardown2 !== null) {
    const previously_destroying_effect = is_destroying_effect;
    const previous_reaction = active_reaction;
    set_is_destroying_effect(true);
    set_active_reaction(null);
    try {
      teardown2.call(null);
    } finally {
      set_is_destroying_effect(previously_destroying_effect);
      set_active_reaction(previous_reaction);
    }
  }
}
function destroy_effect_children(signal, remove_dom = false) {
  var effect2 = signal.first;
  signal.first = signal.last = null;
  while (effect2 !== null) {
    const controller = effect2.ac;
    if (controller !== null) {
      without_reactive_context(() => {
        controller.abort(STALE_REACTION);
      });
    }
    var next = effect2.next;
    if ((effect2.f & ROOT_EFFECT) !== 0) {
      effect2.parent = null;
    } else {
      destroy_effect(effect2, remove_dom);
    }
    effect2 = next;
  }
}
function destroy_block_effect_children(signal) {
  var effect2 = signal.first;
  while (effect2 !== null) {
    var next = effect2.next;
    if ((effect2.f & BRANCH_EFFECT) === 0) {
      destroy_effect(effect2);
    }
    effect2 = next;
  }
}
function destroy_effect(effect2, remove_dom = true) {
  var removed = false;
  if ((remove_dom || (effect2.f & HEAD_EFFECT) !== 0) && effect2.nodes !== null && effect2.nodes.end !== null) {
    remove_effect_dom(
      effect2.nodes.start,
      /** @type {TemplateNode} */
      effect2.nodes.end
    );
    removed = true;
  }
  effect2.f |= DESTROYING;
  destroy_effect_children(effect2, remove_dom && !removed);
  remove_reactions(effect2, 0);
  var transitions = effect2.nodes && effect2.nodes.t;
  if (transitions !== null) {
    for (const transition of transitions) {
      transition.stop();
    }
  }
  execute_effect_teardown(effect2);
  effect2.f ^= DESTROYING;
  effect2.f |= DESTROYED;
  var parent = effect2.parent;
  if (parent !== null && parent.first !== null) {
    unlink_effect(effect2);
  }
  effect2.next = effect2.prev = effect2.teardown = effect2.ctx = effect2.deps = effect2.fn = effect2.nodes = effect2.ac = effect2.b = null;
}
function remove_effect_dom(node, end) {
  while (node !== null) {
    var next = node === end ? null : /* @__PURE__ */ get_next_sibling(node);
    node.remove();
    node = next;
  }
}
function unlink_effect(effect2) {
  var parent = effect2.parent;
  var prev = effect2.prev;
  var next = effect2.next;
  if (prev !== null) prev.next = next;
  if (next !== null) next.prev = prev;
  if (parent !== null) {
    if (parent.first === effect2) parent.first = next;
    if (parent.last === effect2) parent.last = prev;
  }
}
function pause_effect(effect2, callback, destroy = true) {
  var transitions = [];
  pause_children(effect2, transitions, true);
  var fn = () => {
    if (destroy) destroy_effect(effect2);
    if (callback) callback();
  };
  var remaining = transitions.length;
  if (remaining > 0) {
    var check = () => --remaining || fn();
    for (var transition of transitions) {
      transition.out(check);
    }
  } else {
    fn();
  }
}
function pause_children(effect2, transitions, local) {
  if ((effect2.f & INERT) !== 0) return;
  effect2.f ^= INERT;
  var t = effect2.nodes && effect2.nodes.t;
  if (t !== null) {
    for (const transition of t) {
      if (transition.is_global || local) {
        transitions.push(transition);
      }
    }
  }
  var child2 = effect2.first;
  while (child2 !== null) {
    var sibling2 = child2.next;
    if ((child2.f & ROOT_EFFECT) === 0) {
      var transparent = (child2.f & EFFECT_TRANSPARENT) !== 0 || // If this is a branch effect without a block effect parent,
      // it means the parent block effect was pruned. In that case,
      // transparency information was transferred to the branch effect.
      (child2.f & BRANCH_EFFECT) !== 0 && (effect2.f & BLOCK_EFFECT) !== 0;
      pause_children(child2, transitions, transparent ? local : false);
    }
    child2 = sibling2;
  }
}
function resume_effect(effect2) {
  resume_children(effect2, true);
}
function resume_children(effect2, local) {
  if ((effect2.f & INERT) === 0) return;
  effect2.f ^= INERT;
  if ((effect2.f & CLEAN) === 0) {
    set_signal_status(effect2, DIRTY);
    Batch.ensure().schedule(effect2);
  }
  var child2 = effect2.first;
  while (child2 !== null) {
    var sibling2 = child2.next;
    var transparent = (child2.f & EFFECT_TRANSPARENT) !== 0 || (child2.f & BRANCH_EFFECT) !== 0;
    resume_children(child2, transparent ? local : false);
    child2 = sibling2;
  }
  var t = effect2.nodes && effect2.nodes.t;
  if (t !== null) {
    for (const transition of t) {
      if (transition.is_global || local) {
        transition.in();
      }
    }
  }
}
function move_effect(effect2, fragment) {
  if (!effect2.nodes) return;
  var node = effect2.nodes.start;
  var end = effect2.nodes.end;
  while (node !== null) {
    var next = node === end ? null : /* @__PURE__ */ get_next_sibling(node);
    fragment.append(node);
    node = next;
  }
}
let is_updating_effect = false;
let is_destroying_effect = false;
function set_is_destroying_effect(value) {
  is_destroying_effect = value;
}
let active_reaction = null;
let untracking = false;
function set_active_reaction(reaction) {
  active_reaction = reaction;
}
let active_effect = null;
function set_active_effect(effect2) {
  active_effect = effect2;
}
let current_sources = null;
function push_reaction_value(value) {
  if (active_reaction !== null && true) {
    (current_sources ?? (current_sources = /* @__PURE__ */ new Set())).add(value);
  }
}
let new_deps = null;
let skipped_deps = 0;
let untracked_writes = null;
function set_untracked_writes(value) {
  untracked_writes = value;
}
let write_version = 1;
let read_version = 0;
let update_version = read_version;
function set_update_version(value) {
  update_version = value;
}
function increment_write_version() {
  return ++write_version;
}
function is_dirty(reaction) {
  var flags2 = reaction.f;
  if ((flags2 & DIRTY) !== 0) {
    return true;
  }
  if (flags2 & DERIVED) {
    reaction.f &= ~WAS_MARKED;
  }
  if ((flags2 & MAYBE_DIRTY) !== 0) {
    var dependencies = (
      /** @type {Value[]} */
      reaction.deps
    );
    var length = dependencies.length;
    for (var i = 0; i < length; i++) {
      var dependency = dependencies[i];
      if (is_dirty(
        /** @type {Derived} */
        dependency
      )) {
        update_derived(
          /** @type {Derived} */
          dependency
        );
      }
      if (dependency.wv > reaction.wv) {
        return true;
      }
    }
    if ((flags2 & CONNECTED) !== 0 && // During time traveling we don't want to reset the status so that
    // traversal of the graph in the other batches still happens
    batch_values === null) {
      set_signal_status(reaction, CLEAN);
    }
  }
  return false;
}
function schedule_possible_effect_self_invalidation(signal, effect2, root2 = true) {
  var reactions = signal.reactions;
  if (reactions === null) return;
  if (current_sources !== null && current_sources.has(signal)) {
    return;
  }
  for (var i = 0; i < reactions.length; i++) {
    var reaction = reactions[i];
    if ((reaction.f & DERIVED) !== 0) {
      schedule_possible_effect_self_invalidation(
        /** @type {Derived} */
        reaction,
        effect2,
        false
      );
    } else if (effect2 === reaction) {
      if (root2) {
        set_signal_status(reaction, DIRTY);
      } else if ((reaction.f & CLEAN) !== 0) {
        set_signal_status(reaction, MAYBE_DIRTY);
      }
      schedule_effect(
        /** @type {Effect} */
        reaction
      );
    }
  }
}
function update_reaction(reaction) {
  var _a2;
  var previous_deps = new_deps;
  var previous_skipped_deps = skipped_deps;
  var previous_untracked_writes = untracked_writes;
  var previous_reaction = active_reaction;
  var previous_sources = current_sources;
  var previous_component_context = component_context;
  var previous_untracking = untracking;
  var previous_update_version = update_version;
  var flags2 = reaction.f;
  new_deps = /** @type {null | Value[]} */
  null;
  skipped_deps = 0;
  untracked_writes = null;
  active_reaction = (flags2 & (BRANCH_EFFECT | ROOT_EFFECT)) === 0 ? reaction : null;
  current_sources = null;
  set_component_context(reaction.ctx);
  untracking = false;
  update_version = ++read_version;
  if (reaction.ac !== null) {
    without_reactive_context(() => {
      reaction.ac.abort(STALE_REACTION);
    });
    reaction.ac = null;
  }
  try {
    reaction.f |= REACTION_IS_UPDATING;
    var fn = (
      /** @type {Function} */
      reaction.fn
    );
    var result = fn();
    reaction.f |= REACTION_RAN;
    var deps = reaction.deps;
    var is_fork = current_batch == null ? void 0 : current_batch.is_fork;
    if (new_deps !== null) {
      var i;
      if (!is_fork) {
        remove_reactions(reaction, skipped_deps);
      }
      if (deps !== null && skipped_deps > 0) {
        deps.length = skipped_deps + new_deps.length;
        for (i = 0; i < new_deps.length; i++) {
          deps[skipped_deps + i] = new_deps[i];
        }
      } else {
        reaction.deps = deps = new_deps;
      }
      if (effect_tracking() && (reaction.f & CONNECTED) !== 0) {
        for (i = skipped_deps; i < deps.length; i++) {
          ((_a2 = deps[i]).reactions ?? (_a2.reactions = [])).push(reaction);
        }
      }
    } else if (!is_fork && deps !== null && skipped_deps < deps.length) {
      remove_reactions(reaction, skipped_deps);
      deps.length = skipped_deps;
    }
    if (is_runes() && untracked_writes !== null && !untracking && deps !== null && (reaction.f & (DERIVED | MAYBE_DIRTY | DIRTY)) === 0) {
      for (i = 0; i < /** @type {Source[]} */
      untracked_writes.length; i++) {
        schedule_possible_effect_self_invalidation(
          untracked_writes[i],
          /** @type {Effect} */
          reaction
        );
      }
    }
    if (previous_reaction !== null && previous_reaction !== reaction) {
      read_version++;
      if (previous_reaction.deps !== null) {
        for (let i2 = 0; i2 < previous_skipped_deps; i2 += 1) {
          previous_reaction.deps[i2].rv = read_version;
        }
      }
      if (previous_deps !== null) {
        for (const dep of previous_deps) {
          dep.rv = read_version;
        }
      }
      if (untracked_writes !== null) {
        if (previous_untracked_writes === null) {
          previous_untracked_writes = untracked_writes;
        } else {
          previous_untracked_writes.push(.../** @type {Source[]} */
          untracked_writes);
        }
      }
    }
    if ((reaction.f & ERROR_VALUE) !== 0) {
      reaction.f ^= ERROR_VALUE;
    }
    return result;
  } catch (error) {
    return handle_error(error);
  } finally {
    reaction.f ^= REACTION_IS_UPDATING;
    new_deps = previous_deps;
    skipped_deps = previous_skipped_deps;
    untracked_writes = previous_untracked_writes;
    active_reaction = previous_reaction;
    current_sources = previous_sources;
    set_component_context(previous_component_context);
    untracking = previous_untracking;
    update_version = previous_update_version;
  }
}
function remove_reaction(signal, dependency) {
  let reactions = dependency.reactions;
  if (reactions !== null) {
    var index2 = index_of.call(reactions, signal);
    if (index2 !== -1) {
      var new_length = reactions.length - 1;
      if (new_length === 0) {
        reactions = dependency.reactions = null;
      } else {
        reactions[index2] = reactions[new_length];
        reactions.pop();
      }
    }
  }
  if (reactions === null && (dependency.f & DERIVED) !== 0 && // Destroying a child effect while updating a parent effect can cause a dependency to appear
  // to be unused, when in fact it is used by the currently-updating parent. Checking `new_deps`
  // allows us to skip the expensive work of disconnecting and immediately reconnecting it
  (new_deps === null || !includes.call(new_deps, dependency))) {
    var derived2 = (
      /** @type {Derived} */
      dependency
    );
    if ((derived2.f & CONNECTED) !== 0) {
      derived2.f ^= CONNECTED;
      derived2.f &= ~WAS_MARKED;
    }
    if (derived2.v !== UNINITIALIZED) {
      update_derived_status(derived2);
    }
    if (derived2.ac !== null) {
      without_reactive_context(() => {
        derived2.ac.abort(STALE_REACTION);
        derived2.ac = null;
        set_signal_status(derived2, DIRTY);
      });
    }
    freeze_derived_effects(derived2);
    remove_reactions(derived2, 0);
  }
}
function remove_reactions(signal, start_index) {
  var dependencies = signal.deps;
  if (dependencies === null) return;
  for (var i = start_index; i < dependencies.length; i++) {
    remove_reaction(signal, dependencies[i]);
  }
}
function update_effect(effect2) {
  var flags2 = effect2.f;
  if ((flags2 & DESTROYED) !== 0) {
    return;
  }
  set_signal_status(effect2, CLEAN);
  var previous_effect = active_effect;
  var was_updating_effect = is_updating_effect;
  active_effect = effect2;
  is_updating_effect = (flags2 & (BRANCH_EFFECT | ROOT_EFFECT)) === 0;
  try {
    if ((flags2 & (BLOCK_EFFECT | MANAGED_EFFECT)) !== 0) {
      destroy_block_effect_children(effect2);
    } else {
      destroy_effect_children(effect2);
    }
    execute_effect_teardown(effect2);
    var teardown2 = update_reaction(effect2);
    effect2.teardown = typeof teardown2 === "function" ? teardown2 : null;
    effect2.wv = write_version;
    var dep;
    if (DEV && tracing_mode_flag && (effect2.f & DIRTY) !== 0 && effect2.deps !== null) ;
  } finally {
    is_updating_effect = was_updating_effect;
    active_effect = previous_effect;
  }
}
async function tick() {
  await Promise.resolve();
  flushSync();
}
function get(signal) {
  var flags2 = signal.f;
  var is_derived = (flags2 & DERIVED) !== 0;
  if (active_reaction !== null && !untracking) {
    var destroyed = active_effect !== null && (active_effect.f & DESTROYED) !== 0;
    if (!destroyed && (current_sources === null || !current_sources.has(signal))) {
      var deps = active_reaction.deps;
      if ((active_reaction.f & REACTION_IS_UPDATING) !== 0) {
        if (signal.rv < read_version) {
          signal.rv = read_version;
          if (new_deps === null && deps !== null && deps[skipped_deps] === signal) {
            skipped_deps++;
          } else if (new_deps === null) {
            new_deps = [signal];
          } else {
            new_deps.push(signal);
          }
        }
      } else {
        active_reaction.deps ?? (active_reaction.deps = []);
        if (!includes.call(active_reaction.deps, signal)) {
          active_reaction.deps.push(signal);
        }
        var reactions = signal.reactions;
        if (reactions === null) {
          signal.reactions = [active_reaction];
        } else if (!includes.call(reactions, active_reaction)) {
          reactions.push(active_reaction);
        }
      }
    }
  }
  if (is_destroying_effect && old_values.has(signal)) {
    return old_values.get(signal);
  }
  if (is_derived) {
    var derived2 = (
      /** @type {Derived} */
      signal
    );
    if (is_destroying_effect) {
      var value = derived2.v;
      if ((derived2.f & CLEAN) === 0 && derived2.reactions !== null || depends_on_old_values(derived2)) {
        value = execute_derived(derived2);
      }
      old_values.set(derived2, value);
      return value;
    }
    var should_connect = (derived2.f & CONNECTED) === 0 && !untracking && active_reaction !== null && (is_updating_effect || (active_reaction.f & CONNECTED) !== 0);
    var is_new = (derived2.f & REACTION_RAN) === 0;
    if (is_dirty(derived2)) {
      if (should_connect) {
        derived2.f |= CONNECTED;
      }
      update_derived(derived2);
    }
    if (should_connect && !is_new) {
      unfreeze_derived_effects(derived2);
      reconnect(derived2);
    }
  }
  if (batch_values == null ? void 0 : batch_values.has(signal)) {
    return batch_values.get(signal);
  }
  if ((signal.f & ERROR_VALUE) !== 0) {
    throw signal.v;
  }
  return signal.v;
}
function reconnect(derived2) {
  derived2.f |= CONNECTED;
  if (derived2.deps === null) return;
  for (const dep of derived2.deps) {
    (dep.reactions ?? (dep.reactions = [])).push(derived2);
    if ((dep.f & DERIVED) !== 0 && (dep.f & CONNECTED) === 0) {
      unfreeze_derived_effects(
        /** @type {Derived} */
        dep
      );
      reconnect(
        /** @type {Derived} */
        dep
      );
    }
  }
}
function depends_on_old_values(derived2) {
  if (derived2.v === UNINITIALIZED) return true;
  if (derived2.deps === null) return false;
  for (const dep of derived2.deps) {
    if (old_values.has(dep)) {
      return true;
    }
    if ((dep.f & DERIVED) !== 0 && depends_on_old_values(
      /** @type {Derived} */
      dep
    )) {
      return true;
    }
  }
  return false;
}
function untrack(fn) {
  var previous_untracking = untracking;
  try {
    untracking = true;
    return fn();
  } finally {
    untracking = previous_untracking;
  }
}
const PASSIVE_EVENTS = ["touchstart", "touchmove"];
function is_passive_event(name) {
  return PASSIVE_EVENTS.includes(name);
}
const event_symbol = Symbol("events");
const all_registered_events = /* @__PURE__ */ new Set();
const root_event_handles = /* @__PURE__ */ new Set();
function create_event(event_name, dom, handler, options = {}) {
  function target_handler(event2) {
    if (!options.capture) {
      handle_event_propagation.call(dom, event2);
    }
    if (!event2.cancelBubble) {
      return without_reactive_context(() => {
        return handler == null ? void 0 : handler.call(this, event2);
      });
    }
  }
  if (event_name.startsWith("pointer") || event_name.startsWith("touch") || event_name === "wheel") {
    queue_micro_task(() => {
      dom.addEventListener(event_name, target_handler, options);
    });
  } else {
    dom.addEventListener(event_name, target_handler, options);
  }
  return target_handler;
}
function event(event_name, dom, handler, capture2, passive) {
  var options = { capture: capture2, passive };
  var target_handler = create_event(event_name, dom, handler, options);
  if (dom === document.body || // @ts-ignore
  dom === window || // @ts-ignore
  dom === document || // Firefox has quirky behavior, it can happen that we still get "canplay" events when the element is already removed
  dom instanceof HTMLMediaElement) {
    teardown(() => {
      dom.removeEventListener(event_name, target_handler, options);
    });
  }
}
function delegated(event_name, element, handler) {
  (element[event_symbol] ?? (element[event_symbol] = {}))[event_name] = handler;
}
function delegate(events) {
  for (var i = 0; i < events.length; i++) {
    all_registered_events.add(events[i]);
  }
  for (var fn of root_event_handles) {
    fn(events);
  }
}
let last_propagated_event = null;
function handle_event_propagation(event2) {
  var _a2, _b2;
  var handler_element = this;
  var owner_document = (
    /** @type {Node} */
    handler_element.ownerDocument
  );
  var event_name = event2.type;
  var path = ((_a2 = event2.composedPath) == null ? void 0 : _a2.call(event2)) || [];
  var current_target = (
    /** @type {null | Element} */
    path[0] || event2.target
  );
  last_propagated_event = event2;
  var path_idx = 0;
  var handled_at = last_propagated_event === event2 && event2[event_symbol];
  if (handled_at) {
    var at_idx = path.indexOf(handled_at);
    if (at_idx !== -1 && (handler_element === document || handler_element === /** @type {any} */
    window)) {
      event2[event_symbol] = handler_element;
      return;
    }
    var handler_idx = path.indexOf(handler_element);
    if (handler_idx === -1) {
      return;
    }
    if (at_idx <= handler_idx) {
      path_idx = at_idx;
    }
  }
  current_target = /** @type {Element} */
  path[path_idx] || event2.target;
  if (current_target === handler_element) return;
  define_property(event2, "currentTarget", {
    configurable: true,
    get() {
      return current_target || owner_document;
    }
  });
  var previous_reaction = active_reaction;
  var previous_effect = active_effect;
  set_active_reaction(null);
  set_active_effect(null);
  try {
    var throw_error;
    var other_errors = [];
    while (current_target !== null) {
      if (current_target === handler_element) break;
      try {
        var delegated2 = (_b2 = current_target[event_symbol]) == null ? void 0 : _b2[event_name];
        if (delegated2 != null && (!/** @type {any} */
        current_target.disabled || // DOM could've been updated already by the time this is reached, so we check this as well
        // -> the target could not have been disabled because it emits the event in the first place
        event2.target === current_target)) {
          delegated2.call(current_target, event2);
        }
      } catch (error) {
        if (throw_error) {
          other_errors.push(error);
        } else {
          throw_error = error;
        }
      }
      if (event2.cancelBubble) break;
      path_idx++;
      current_target = path_idx < path.length ? (
        /** @type {Element} */
        path[path_idx]
      ) : null;
    }
    if (throw_error) {
      for (let error of other_errors) {
        queueMicrotask(() => {
          throw error;
        });
      }
      throw throw_error;
    }
  } finally {
    event2[event_symbol] = handler_element;
    delete event2.currentTarget;
    set_active_reaction(previous_reaction);
    set_active_effect(previous_effect);
  }
}
const policy = (
  // We gotta write it like this because after downleveling the pure comment may end up in the wrong location
  ((_b = globalThis == null ? void 0 : globalThis.window) == null ? void 0 : _b.trustedTypes) && /* @__PURE__ */ globalThis.window.trustedTypes.createPolicy("svelte-trusted-html", {
    /** @param {string} html */
    createHTML: (html) => {
      return html;
    }
  })
);
function create_trusted_html(html) {
  return (
    /** @type {string} */
    (policy == null ? void 0 : policy.createHTML(html)) ?? html
  );
}
function create_fragment_from_html(html) {
  var elem = create_element("template");
  elem.innerHTML = create_trusted_html(html.replaceAll("<!>", "<!---->"));
  return elem.content;
}
function assign_nodes(start2, end) {
  var effect2 = (
    /** @type {Effect} */
    active_effect
  );
  if (effect2.nodes === null) {
    effect2.nodes = { start: start2, end, a: null, t: null };
  }
}
// @__NO_SIDE_EFFECTS__
function from_html(content, flags2) {
  var is_fragment = (flags2 & TEMPLATE_FRAGMENT) !== 0;
  var use_import_node = (flags2 & TEMPLATE_USE_IMPORT_NODE) !== 0;
  var node;
  var has_start = !content.startsWith("<!>");
  return () => {
    if (node === void 0) {
      node = create_fragment_from_html(has_start ? content : "<!>" + content);
      if (!is_fragment) node = /** @type {TemplateNode} */
      /* @__PURE__ */ get_first_child(node);
    }
    var clone = (
      /** @type {TemplateNode} */
      use_import_node || is_firefox ? document.importNode(node, true) : node.cloneNode(true)
    );
    if (is_fragment) {
      var start2 = (
        /** @type {TemplateNode} */
        /* @__PURE__ */ get_first_child(clone)
      );
      var end = (
        /** @type {TemplateNode} */
        clone.lastChild
      );
      assign_nodes(start2, end);
    } else {
      assign_nodes(clone, clone);
    }
    return clone;
  };
}
function comment() {
  var frag = document.createDocumentFragment();
  var start2 = document.createComment("");
  var anchor = create_text();
  frag.append(start2, anchor);
  assign_nodes(start2, anchor);
  return frag;
}
function append(anchor, dom) {
  if (anchor === null) {
    return;
  }
  anchor.before(
    /** @type {Node} */
    dom
  );
}
function set_text(text, value) {
  var str = value == null ? "" : typeof value === "object" ? `${value}` : value;
  if (str !== /** @type {any} */
  (text[TEXT_CACHE] ?? (text[TEXT_CACHE] = text.nodeValue))) {
    text[TEXT_CACHE] = str;
    text.nodeValue = `${str}`;
  }
}
function mount(component, options) {
  return _mount(component, options);
}
const listeners = /* @__PURE__ */ new Map();
function _mount(Component, { target: target2, anchor, props = {}, events, context, intro = true, transformError }) {
  init_operations();
  var component = void 0;
  var unmount = component_root(() => {
    var anchor_node = anchor ?? target2.appendChild(create_text());
    boundary(
      /** @type {TemplateNode} */
      anchor_node,
      {
        pending: () => {
        }
      },
      (anchor_node2) => {
        push({});
        var ctx = (
          /** @type {ComponentContext} */
          component_context
        );
        if (context) ctx.c = context;
        if (events) {
          props.$$events = events;
        }
        component = Component(anchor_node2, props) || {};
        pop();
      },
      transformError
    );
    var registered_events = /* @__PURE__ */ new Set();
    var event_handle = (events2) => {
      for (var i = 0; i < events2.length; i++) {
        var event_name = events2[i];
        if (registered_events.has(event_name)) continue;
        registered_events.add(event_name);
        var passive = is_passive_event(event_name);
        for (const node of [target2, document]) {
          var counts = listeners.get(node);
          if (counts === void 0) {
            counts = /* @__PURE__ */ new Map();
            listeners.set(node, counts);
          }
          var count = counts.get(event_name);
          if (count === void 0) {
            node.addEventListener(event_name, handle_event_propagation, { passive });
            counts.set(event_name, 1);
          } else {
            counts.set(event_name, count + 1);
          }
        }
      }
    };
    event_handle(array_from(all_registered_events));
    root_event_handles.add(event_handle);
    return () => {
      var _a2;
      for (var event_name of registered_events) {
        for (const node of [target2, document]) {
          var counts = (
            /** @type {Map<string, number>} */
            listeners.get(node)
          );
          var count = (
            /** @type {number} */
            counts.get(event_name)
          );
          if (--count == 0) {
            node.removeEventListener(event_name, handle_event_propagation);
            counts.delete(event_name);
            if (counts.size === 0) {
              listeners.delete(node);
            }
          } else {
            counts.set(event_name, count);
          }
        }
      }
      root_event_handles.delete(event_handle);
      if (anchor_node !== anchor) {
        (_a2 = anchor_node.parentNode) == null ? void 0 : _a2.removeChild(anchor_node);
      }
    };
  });
  mounted_components.set(component, unmount);
  return component;
}
let mounted_components = /* @__PURE__ */ new WeakMap();
class BranchManager {
  /**
   * @param {TemplateNode} anchor
   * @param {boolean} transition
   */
  constructor(anchor, transition = true) {
    /** @type {TemplateNode} */
    __publicField(this, "anchor");
    /** @type {Map<Batch, Key>} */
    __privateAdd(this, _batches, /* @__PURE__ */ new Map());
    /**
     * Map of keys to effects that are currently rendered in the DOM.
     * These effects are visible and actively part of the document tree.
     * Example:
     * ```
     * {#if condition}
     * 	foo
     * {:else}
     * 	bar
     * {/if}
     * ```
     * Can result in the entries `true->Effect` and `false->Effect`
     * @type {Map<Key, Effect>}
     */
    __privateAdd(this, _onscreen, /* @__PURE__ */ new Map());
    /**
     * Similar to #onscreen with respect to the keys, but contains branches that are not yet
     * in the DOM, because their insertion is deferred.
     * @type {Map<Key, Branch>}
     */
    __privateAdd(this, _offscreen, /* @__PURE__ */ new Map());
    /**
     * Keys of effects that are currently outroing
     * @type {Set<Key>}
     */
    __privateAdd(this, _outroing, /* @__PURE__ */ new Set());
    /**
     * Whether to pause (i.e. outro) on change, or destroy immediately.
     * This is necessary for `<svelte:element>`
     */
    __privateAdd(this, _transition, true);
    /**
     * @param {Batch} batch
     */
    __privateAdd(this, _commit, (batch) => {
      if (!__privateGet(this, _batches).has(batch)) return;
      var key2 = (
        /** @type {Key} */
        __privateGet(this, _batches).get(batch)
      );
      var onscreen = __privateGet(this, _onscreen).get(key2);
      if (onscreen) {
        resume_effect(onscreen);
        __privateGet(this, _outroing).delete(key2);
      } else {
        var offscreen = __privateGet(this, _offscreen).get(key2);
        if (offscreen) {
          resume_effect(offscreen.effect);
          __privateGet(this, _onscreen).set(key2, offscreen.effect);
          __privateGet(this, _offscreen).delete(key2);
          offscreen.fragment.lastChild.remove();
          this.anchor.before(offscreen.fragment);
          onscreen = offscreen.effect;
        }
      }
      for (const [b, k] of __privateGet(this, _batches)) {
        __privateGet(this, _batches).delete(b);
        if (b === batch) {
          break;
        }
        const offscreen2 = __privateGet(this, _offscreen).get(k);
        if (offscreen2) {
          destroy_effect(offscreen2.effect);
          __privateGet(this, _offscreen).delete(k);
        }
      }
      for (const [k, effect2] of __privateGet(this, _onscreen)) {
        if (k === key2 || __privateGet(this, _outroing).has(k)) continue;
        const on_destroy = () => {
          const keys = Array.from(__privateGet(this, _batches).values());
          if (keys.includes(k)) {
            var fragment = document.createDocumentFragment();
            move_effect(effect2, fragment);
            fragment.append(create_text());
            __privateGet(this, _offscreen).set(k, { effect: effect2, fragment });
          } else {
            destroy_effect(effect2);
          }
          __privateGet(this, _outroing).delete(k);
          __privateGet(this, _onscreen).delete(k);
        };
        if (__privateGet(this, _transition) || !onscreen) {
          __privateGet(this, _outroing).add(k);
          pause_effect(effect2, on_destroy, false);
        } else {
          on_destroy();
        }
      }
    });
    /**
     * @param {Batch} batch
     */
    __privateAdd(this, _discard, (batch) => {
      __privateGet(this, _batches).delete(batch);
      const keys = Array.from(__privateGet(this, _batches).values());
      for (const [k, branch2] of __privateGet(this, _offscreen)) {
        if (!keys.includes(k)) {
          destroy_effect(branch2.effect);
          __privateGet(this, _offscreen).delete(k);
        }
      }
    });
    this.anchor = anchor;
    __privateSet(this, _transition, transition);
  }
  /**
   *
   * @param {any} key
   * @param {null | ((target: TemplateNode) => void)} fn
   */
  ensure(key2, fn) {
    var batch = (
      /** @type {Batch} */
      current_batch
    );
    var defer = should_defer_append();
    if (fn && !__privateGet(this, _onscreen).has(key2) && !__privateGet(this, _offscreen).has(key2)) {
      if (defer) {
        var fragment = document.createDocumentFragment();
        var target2 = create_text();
        fragment.append(target2);
        __privateGet(this, _offscreen).set(key2, {
          effect: branch(() => fn(target2)),
          fragment
        });
      } else {
        __privateGet(this, _onscreen).set(
          key2,
          branch(() => fn(this.anchor))
        );
      }
    }
    __privateGet(this, _batches).set(batch, key2);
    if (defer) {
      for (const [k, effect2] of __privateGet(this, _onscreen)) {
        if (k === key2) {
          batch.unskip_effect(effect2);
        } else {
          batch.skip_effect(effect2);
        }
      }
      for (const [k, branch2] of __privateGet(this, _offscreen)) {
        if (k === key2) {
          batch.unskip_effect(branch2.effect);
        } else {
          batch.skip_effect(branch2.effect);
        }
      }
      batch.oncommit(__privateGet(this, _commit));
      batch.ondiscard(__privateGet(this, _discard));
    } else {
      __privateGet(this, _commit).call(this, batch);
    }
  }
}
_batches = new WeakMap();
_onscreen = new WeakMap();
_offscreen = new WeakMap();
_outroing = new WeakMap();
_transition = new WeakMap();
_commit = new WeakMap();
_discard = new WeakMap();
function if_block(node, fn, elseif = false) {
  var branches = new BranchManager(node);
  var flags2 = elseif ? EFFECT_TRANSPARENT : 0;
  function update_branch(key2, fn2) {
    branches.ensure(key2, fn2);
  }
  block(() => {
    var has_branch = false;
    fn((fn2, key2 = 0) => {
      has_branch = true;
      update_branch(key2, fn2);
    });
    if (!has_branch) {
      update_branch(-1, null);
    }
  }, flags2);
}
const NAN = Symbol("NaN");
function key(node, get_key, render_fn2) {
  var branches = new BranchManager(node);
  block(() => {
    var key2 = get_key();
    if (key2 !== key2) {
      key2 = /** @type {any} */
      NAN;
    }
    branches.ensure(key2, render_fn2);
  });
}
function index(_, i) {
  return i;
}
function pause_effects(state2, to_destroy, controlled_anchor) {
  var transitions = [];
  var length = to_destroy.length;
  var group;
  var remaining = to_destroy.length;
  for (var i = 0; i < length; i++) {
    let effect2 = to_destroy[i];
    pause_effect(
      effect2,
      () => {
        if (group) {
          group.pending.delete(effect2);
          group.done.add(effect2);
          if (group.pending.size === 0) {
            var groups = (
              /** @type {Set<EachOutroGroup>} */
              state2.outrogroups
            );
            destroy_effects(state2, array_from(group.done));
            groups.delete(group);
            if (groups.size === 0) {
              state2.outrogroups = null;
            }
          }
        } else {
          remaining -= 1;
        }
      },
      false
    );
  }
  if (remaining === 0) {
    var fast_path = transitions.length === 0 && controlled_anchor !== null;
    if (fast_path) {
      var anchor = (
        /** @type {Element} */
        controlled_anchor
      );
      var parent_node = (
        /** @type {Element} */
        anchor.parentNode
      );
      clear_text_content(parent_node);
      parent_node.append(anchor);
      state2.items.clear();
    }
    destroy_effects(state2, to_destroy, !fast_path);
  } else {
    group = {
      pending: new Set(to_destroy),
      done: /* @__PURE__ */ new Set()
    };
    (state2.outrogroups ?? (state2.outrogroups = /* @__PURE__ */ new Set())).add(group);
  }
}
function destroy_effects(state2, to_destroy, remove_dom = true) {
  var preserved_effects;
  if (state2.pending.size > 0) {
    preserved_effects = /* @__PURE__ */ new Set();
    for (const keys of state2.pending.values()) {
      for (const key2 of keys) {
        preserved_effects.add(
          /** @type {EachItem} */
          state2.items.get(key2).e
        );
      }
    }
  }
  for (var i = 0; i < to_destroy.length; i++) {
    var e = to_destroy[i];
    if (preserved_effects == null ? void 0 : preserved_effects.has(e)) {
      e.f |= EFFECT_OFFSCREEN;
      const fragment = document.createDocumentFragment();
      move_effect(e, fragment);
    } else {
      destroy_effect(to_destroy[i], remove_dom);
    }
  }
}
var offscreen_anchor;
function each(node, flags2, get_collection, get_key, render_fn2, fallback_fn = null) {
  var anchor = node;
  var items = /* @__PURE__ */ new Map();
  var is_controlled = (flags2 & EACH_IS_CONTROLLED) !== 0;
  if (is_controlled) {
    var parent_node = (
      /** @type {Element} */
      node
    );
    anchor = parent_node.appendChild(create_text());
  }
  var fallback = null;
  var each_array = /* @__PURE__ */ derived_safe_equal(() => {
    var collection = get_collection();
    return (
      /** @type {V[]} */
      is_array(collection) ? collection : collection == null ? [] : array_from(collection)
    );
  });
  var array;
  var pending = /* @__PURE__ */ new Map();
  var first_run = true;
  function commit(batch) {
    if ((state2.effect.f & DESTROYED) !== 0) {
      return;
    }
    state2.pending.delete(batch);
    state2.fallback = fallback;
    reconcile(state2, array, anchor, flags2, get_key);
    if (fallback !== null) {
      if (array.length === 0) {
        if ((fallback.f & EFFECT_OFFSCREEN) === 0) {
          resume_effect(fallback);
        } else {
          fallback.f ^= EFFECT_OFFSCREEN;
          move(fallback, null, anchor);
        }
      } else {
        pause_effect(fallback, () => {
          fallback = null;
        });
      }
    }
  }
  function discard(batch) {
    state2.pending.delete(batch);
  }
  var effect2 = block(() => {
    array = /** @type {V[]} */
    get(each_array);
    var length = array.length;
    var keys = /* @__PURE__ */ new Set();
    var batch = (
      /** @type {Batch} */
      current_batch
    );
    var defer = should_defer_append();
    for (var index2 = 0; index2 < length; index2 += 1) {
      var value = array[index2];
      var key2 = get_key(value, index2);
      var item = first_run ? null : items.get(key2);
      if (item) {
        if (item.v) internal_set(item.v, value);
        if (item.i) internal_set(item.i, index2);
        if (defer) {
          batch.unskip_effect(item.e);
        }
      } else {
        item = create_item(
          items,
          first_run ? anchor : offscreen_anchor ?? (offscreen_anchor = create_text()),
          value,
          key2,
          index2,
          render_fn2,
          flags2,
          get_collection
        );
        if (!first_run) {
          item.e.f |= EFFECT_OFFSCREEN;
        }
        items.set(key2, item);
      }
      keys.add(key2);
    }
    if (length === 0 && fallback_fn && !fallback) {
      if (first_run) {
        fallback = branch(() => fallback_fn(anchor));
      } else {
        fallback = branch(() => fallback_fn(offscreen_anchor ?? (offscreen_anchor = create_text())));
        fallback.f |= EFFECT_OFFSCREEN;
      }
    }
    if (length > keys.size) {
      {
        each_key_duplicate();
      }
    }
    if (!first_run) {
      pending.set(batch, keys);
      if (defer) {
        for (const [key3, item2] of items) {
          if (!keys.has(key3)) {
            batch.skip_effect(item2.e);
          }
        }
        batch.oncommit(commit);
        batch.ondiscard(discard);
      } else {
        commit(batch);
      }
    }
    get(each_array);
  });
  var state2 = { effect: effect2, items, pending, outrogroups: null, fallback };
  first_run = false;
}
function skip_to_branch(effect2) {
  while (effect2 !== null && (effect2.f & BRANCH_EFFECT) === 0) {
    effect2 = effect2.next;
  }
  return effect2;
}
function reconcile(state2, array, anchor, flags2, get_key) {
  var _a2, _b2, _c2, _d, _e, _f, _g, _h, _i;
  var is_animated = (flags2 & EACH_IS_ANIMATED) !== 0;
  var length = array.length;
  var items = state2.items;
  var current = skip_to_branch(state2.effect.first);
  var seen;
  var prev = null;
  var to_animate;
  var matched = [];
  var stashed = [];
  var value;
  var key2;
  var effect2;
  var i;
  if (is_animated) {
    for (i = 0; i < length; i += 1) {
      value = array[i];
      key2 = get_key(value, i);
      effect2 = /** @type {EachItem} */
      items.get(key2).e;
      if ((effect2.f & EFFECT_OFFSCREEN) === 0) {
        (_b2 = (_a2 = effect2.nodes) == null ? void 0 : _a2.a) == null ? void 0 : _b2.measure();
        (to_animate ?? (to_animate = /* @__PURE__ */ new Set())).add(effect2);
      }
    }
  }
  for (i = 0; i < length; i += 1) {
    value = array[i];
    key2 = get_key(value, i);
    effect2 = /** @type {EachItem} */
    items.get(key2).e;
    if (state2.outrogroups !== null) {
      for (const group of state2.outrogroups) {
        group.pending.delete(effect2);
        group.done.delete(effect2);
      }
    }
    if ((effect2.f & INERT) !== 0) {
      resume_effect(effect2);
      if (is_animated) {
        (_d = (_c2 = effect2.nodes) == null ? void 0 : _c2.a) == null ? void 0 : _d.unfix();
        (to_animate ?? (to_animate = /* @__PURE__ */ new Set())).delete(effect2);
      }
    }
    if ((effect2.f & EFFECT_OFFSCREEN) !== 0) {
      effect2.f ^= EFFECT_OFFSCREEN;
      if (effect2 === current) {
        move(effect2, null, anchor);
      } else {
        var next = prev ? prev.next : current;
        if (effect2 === state2.effect.last) {
          state2.effect.last = effect2.prev;
        }
        if (effect2.prev) effect2.prev.next = effect2.next;
        if (effect2.next) effect2.next.prev = effect2.prev;
        link(state2, prev, effect2);
        link(state2, effect2, next);
        move(effect2, next, anchor);
        prev = effect2;
        matched = [];
        stashed = [];
        current = skip_to_branch(prev.next);
        continue;
      }
    }
    if (effect2 !== current) {
      if (seen !== void 0 && seen.has(effect2)) {
        if (matched.length < stashed.length) {
          var start2 = stashed[0];
          var j;
          prev = start2.prev;
          var a = matched[0];
          var b = matched[matched.length - 1];
          for (j = 0; j < matched.length; j += 1) {
            move(matched[j], start2, anchor);
          }
          for (j = 0; j < stashed.length; j += 1) {
            seen.delete(stashed[j]);
          }
          link(state2, a.prev, b.next);
          link(state2, prev, a);
          link(state2, b, start2);
          current = start2;
          prev = b;
          i -= 1;
          matched = [];
          stashed = [];
        } else {
          seen.delete(effect2);
          move(effect2, current, anchor);
          link(state2, effect2.prev, effect2.next);
          link(state2, effect2, prev === null ? state2.effect.first : prev.next);
          link(state2, prev, effect2);
          prev = effect2;
        }
        continue;
      }
      matched = [];
      stashed = [];
      while (current !== null && current !== effect2) {
        (seen ?? (seen = /* @__PURE__ */ new Set())).add(current);
        stashed.push(current);
        current = skip_to_branch(current.next);
      }
      if (current === null) {
        continue;
      }
    }
    if ((effect2.f & EFFECT_OFFSCREEN) === 0) {
      matched.push(effect2);
    }
    prev = effect2;
    current = skip_to_branch(effect2.next);
  }
  if (state2.outrogroups !== null) {
    for (const group of state2.outrogroups) {
      if (group.pending.size === 0) {
        destroy_effects(state2, array_from(group.done));
        (_e = state2.outrogroups) == null ? void 0 : _e.delete(group);
      }
    }
    if (state2.outrogroups.size === 0) {
      state2.outrogroups = null;
    }
  }
  if (current !== null || seen !== void 0) {
    var to_destroy = [];
    if (seen !== void 0) {
      for (effect2 of seen) {
        if ((effect2.f & INERT) === 0) {
          to_destroy.push(effect2);
        }
      }
    }
    while (current !== null) {
      if ((current.f & INERT) === 0 && current !== state2.fallback) {
        to_destroy.push(current);
      }
      current = skip_to_branch(current.next);
    }
    var destroy_length = to_destroy.length;
    if (destroy_length > 0) {
      var controlled_anchor = (flags2 & EACH_IS_CONTROLLED) !== 0 && length === 0 ? anchor : null;
      if (is_animated) {
        for (i = 0; i < destroy_length; i += 1) {
          (_g = (_f = to_destroy[i].nodes) == null ? void 0 : _f.a) == null ? void 0 : _g.measure();
        }
        for (i = 0; i < destroy_length; i += 1) {
          (_i = (_h = to_destroy[i].nodes) == null ? void 0 : _h.a) == null ? void 0 : _i.fix();
        }
      }
      pause_effects(state2, to_destroy, controlled_anchor);
    }
  }
  if (is_animated) {
    queue_micro_task(() => {
      var _a3, _b3;
      if (to_animate === void 0) return;
      for (effect2 of to_animate) {
        (_b3 = (_a3 = effect2.nodes) == null ? void 0 : _a3.a) == null ? void 0 : _b3.apply();
      }
    });
  }
}
function create_item(items, anchor, value, key2, index2, render_fn2, flags2, get_collection) {
  var v = (flags2 & EACH_ITEM_REACTIVE) !== 0 ? (flags2 & EACH_ITEM_IMMUTABLE) === 0 ? /* @__PURE__ */ mutable_source(value, false, false) : source(value) : null;
  var i = (flags2 & EACH_INDEX_REACTIVE) !== 0 ? source(index2) : null;
  return {
    v,
    i,
    e: branch(() => {
      render_fn2(anchor, v ?? value, i ?? index2, get_collection);
      return () => {
        items.delete(key2);
      };
    })
  };
}
function move(effect2, next, anchor) {
  if (!effect2.nodes) return;
  var node = effect2.nodes.start;
  var end = effect2.nodes.end;
  var dest = next && (next.f & EFFECT_OFFSCREEN) === 0 ? (
    /** @type {EffectNodes} */
    next.nodes.start
  ) : anchor;
  while (node !== null) {
    var next_node = (
      /** @type {TemplateNode} */
      /* @__PURE__ */ get_next_sibling(node)
    );
    dest.before(node);
    if (node === end) {
      return;
    }
    node = next_node;
  }
}
function link(state2, prev, next) {
  if (prev === null) {
    state2.effect.first = next;
  } else {
    prev.next = next;
  }
  if (next === null) {
    state2.effect.last = prev;
  } else {
    next.prev = prev;
  }
}
const whitespace = [..." 	\n\r\f \v\uFEFF"];
function to_class(value, hash, directives) {
  var classname = value == null ? "" : "" + value;
  if (directives) {
    for (var key2 of Object.keys(directives)) {
      if (directives[key2]) {
        classname = classname ? classname + " " + key2 : key2;
      } else if (classname.length) {
        var len = key2.length;
        var a = 0;
        while ((a = classname.indexOf(key2, a)) >= 0) {
          var b = a + len;
          if ((a === 0 || whitespace.includes(classname[a - 1])) && (b === classname.length || whitespace.includes(classname[b]))) {
            classname = (a === 0 ? "" : classname.substring(0, a)) + classname.substring(b + 1);
          } else {
            a = b;
          }
        }
      }
    }
  }
  return classname === "" ? null : classname;
}
function to_style(value, styles) {
  return value == null ? null : String(value);
}
function set_class(dom, is_html, value, hash, prev_classes, next_classes) {
  var prev = (
    /** @type {any} */
    dom[CLASS_CACHE]
  );
  if (prev !== value || prev === void 0) {
    var next_class_name = to_class(value, hash, next_classes);
    {
      if (next_class_name == null) {
        dom.removeAttribute("class");
      } else {
        dom.className = next_class_name;
      }
    }
    dom[CLASS_CACHE] = value;
  } else if (next_classes && prev_classes !== next_classes) {
    for (var key2 in next_classes) {
      var is_present = !!next_classes[key2];
      if (prev_classes == null || is_present !== !!prev_classes[key2]) {
        dom.classList.toggle(key2, is_present);
      }
    }
  }
  return next_classes;
}
function set_style(dom, value, prev_styles, next_styles) {
  var prev = (
    /** @type {any} */
    dom[STYLE_CACHE]
  );
  if (prev !== value) {
    var next_style_attr = to_style(value);
    {
      if (next_style_attr == null) {
        dom.removeAttribute("style");
      } else {
        dom.style.cssText = next_style_attr;
      }
    }
    dom[STYLE_CACHE] = value;
  }
  return next_styles;
}
function select_option(select, value, mounting = false) {
  if (select.multiple) {
    if (value == void 0) {
      return;
    }
    if (!is_array(value)) {
      return select_multiple_invalid_value();
    }
    for (var option of select.options) {
      option.selected = value.includes(get_option_value(option));
    }
    return;
  }
  for (option of select.options) {
    var option_value = get_option_value(option);
    if (is(option_value, value)) {
      option.selected = true;
      return;
    }
  }
  if (!mounting || value !== void 0) {
    select.selectedIndex = -1;
  }
}
function init_select(select) {
  var observer = new MutationObserver(() => {
    select_option(select, select.__value);
  });
  observer.observe(select, {
    // Listen to option element changes
    childList: true,
    subtree: true,
    // because of <optgroup>
    // Listen to option element value attribute changes
    // (doesn't get notified of select value changes,
    // because that property is not reflected as an attribute)
    attributes: true,
    attributeFilter: ["value"]
  });
  teardown(() => {
    observer.disconnect();
  });
}
function bind_select_value(select, get2, set2 = get2) {
  var batches = /* @__PURE__ */ new WeakSet();
  var mounting = true;
  listen_to_event_and_reset_event(select, "change", (is_reset) => {
    var query = is_reset ? "[selected]" : ":checked";
    var value;
    if (select.multiple) {
      value = [].map.call(select.querySelectorAll(query), get_option_value);
    } else {
      var selected_option = select.querySelector(query) ?? // will fall back to first non-disabled option if no option is selected
      select.querySelector("option:not([disabled])");
      value = selected_option && get_option_value(selected_option);
    }
    set2(value);
    select.__value = value;
    if (current_batch !== null) {
      batches.add(current_batch);
    }
  });
  effect(() => {
    var value = get2();
    if (select === document.activeElement) {
      var batch = (
        /** @type {Batch} */
        current_batch
      );
      if (batches.has(batch)) {
        return;
      }
    }
    select_option(select, value, mounting);
    if (mounting && value === void 0) {
      var selected_option = select.querySelector(":checked");
      if (selected_option !== null) {
        value = get_option_value(selected_option);
        set2(value);
      }
    }
    select.__value = value;
    mounting = false;
  });
  init_select(select);
}
function get_option_value(option) {
  if ("__value" in option) {
    return option.__value;
  } else {
    return option.value;
  }
}
const IS_CUSTOM_ELEMENT = Symbol("is custom element");
const IS_HTML = Symbol("is html");
const PROGRESS_TAG = IS_XHTML ? "progress" : "PROGRESS";
function set_value(element, value) {
  var attributes = get_attributes(element);
  if (attributes.value === (attributes.value = // treat null and undefined the same for the initial value
  value ?? void 0) || // @ts-expect-error
  // `progress` elements always need their value set when it's `0`
  element.value === value && (value !== 0 || element.nodeName !== PROGRESS_TAG)) {
    return;
  }
  element.value = value ?? "";
}
function set_selected(element, selected) {
  if (selected) {
    if (!element.hasAttribute("selected")) {
      element.setAttribute("selected", "");
    }
  } else {
    element.removeAttribute("selected");
  }
}
function set_attribute(element, attribute, value, skip_warning) {
  var attributes = get_attributes(element);
  if (attributes[attribute] === (attributes[attribute] = value)) return;
  if (attribute === "loading") {
    element[LOADING_ATTR_SYMBOL] = value;
  }
  if (value == null) {
    element.removeAttribute(attribute);
  } else if (typeof value !== "string" && get_setters(element).includes(attribute)) {
    element[attribute] = value;
  } else {
    element.setAttribute(attribute, value);
  }
}
function get_attributes(element) {
  return (
    /** @type {Record<string | symbol, unknown>} **/
    /** @type {any} */
    element[ATTRIBUTES_CACHE] ?? (element[ATTRIBUTES_CACHE] = {
      [IS_CUSTOM_ELEMENT]: element.nodeName.includes("-"),
      [IS_HTML]: element.namespaceURI === NAMESPACE_HTML
    })
  );
}
var setters_cache = /* @__PURE__ */ new Map();
function get_setters(element) {
  var cache_key = element.getAttribute("is") || element.nodeName;
  var setters = setters_cache.get(cache_key);
  if (setters) return setters;
  setters_cache.set(cache_key, setters = []);
  var descriptors;
  var proto = element;
  var element_proto = Element.prototype;
  while (element_proto !== proto) {
    descriptors = get_descriptors(proto);
    for (var key2 in descriptors) {
      if (descriptors[key2].set && // better safe than sorry, we don't want spread attributes to mess with HTML content
      key2 !== "innerHTML" && key2 !== "textContent" && key2 !== "innerText") {
        setters.push(key2);
      }
    }
    proto = get_prototype_of(proto);
  }
  return setters;
}
function bind_value(input, get2, set2 = get2) {
  var batches = /* @__PURE__ */ new WeakSet();
  listen_to_event_and_reset_event(input, "input", async (is_reset) => {
    var value = is_reset ? input.defaultValue : input.value;
    value = is_numberlike_input(input) ? to_number(value) : value;
    set2(value);
    if (current_batch !== null) {
      batches.add(current_batch);
    }
    await tick();
    if (value !== (value = get2())) {
      var start2 = input.selectionStart;
      var end = input.selectionEnd;
      var length = input.value.length;
      input.value = value ?? "";
      if (end !== null) {
        var new_length = input.value.length;
        if (start2 === end && end === length && new_length > length) {
          input.selectionStart = new_length;
          input.selectionEnd = new_length;
        } else {
          input.selectionStart = start2;
          input.selectionEnd = Math.min(end, new_length);
        }
      }
    }
  });
  if (
    // If we are hydrating and the value has since changed,
    // then use the updated value from the input instead.
    // If defaultValue is set, then value == defaultValue
    // TODO Svelte 6: remove input.value check and set to empty string?
    untrack(get2) == null && input.value
  ) {
    set2(is_numberlike_input(input) ? to_number(input.value) : input.value);
    if (current_batch !== null) {
      batches.add(current_batch);
    }
  }
  render_effect(() => {
    var value = get2();
    if (input === document.activeElement) {
      var batch = (
        /** @type {Batch} */
        current_batch
      );
      if (batches.has(batch)) {
        return;
      }
    }
    if (is_numberlike_input(input) && value === to_number(input.value)) {
      return;
    }
    if (input.type === "date" && !value && !input.value) {
      return;
    }
    if (value !== input.value) {
      input.value = value ?? "";
    }
  });
}
function bind_checked(input, get2, set2 = get2) {
  listen_to_event_and_reset_event(input, "change", (is_reset) => {
    var value = is_reset ? input.defaultChecked : input.checked;
    set2(value);
  });
  if (
    // If we are hydrating and the value has since changed,
    // then use the update value from the input instead.
    // If defaultChecked is set, then checked == defaultChecked
    untrack(get2) == null
  ) {
    set2(input.checked);
  }
  render_effect(() => {
    var value = get2();
    input.checked = Boolean(value);
  });
}
function is_numberlike_input(input) {
  var type = input.type;
  return type === "number" || type === "range";
}
function to_number(value) {
  return value === "" ? null : +value;
}
function is_bound_this(bound_value, element_or_component) {
  return bound_value === element_or_component || (bound_value == null ? void 0 : bound_value[STATE_SYMBOL]) === element_or_component;
}
function bind_this(element_or_component = {}, update, get_value, get_parts) {
  var component_effect = (
    /** @type {ComponentContext} */
    component_context.r
  );
  var parent = (
    /** @type {Effect} */
    active_effect
  );
  effect(() => {
    var old_parts;
    var parts;
    render_effect(() => {
      old_parts = parts;
      parts = [];
      untrack(() => {
        if (!is_bound_this(get_value(...parts), element_or_component)) {
          update(element_or_component, ...parts);
          if (old_parts && is_bound_this(get_value(...old_parts), element_or_component)) {
            update(null, ...old_parts);
          }
        }
      });
    });
    return () => {
      let p = parent;
      while (p !== component_effect && p.parent !== null && p.parent.f & DESTROYING) {
        p = p.parent;
      }
      const teardown2 = () => {
        if (parts && is_bound_this(get_value(...parts), element_or_component)) {
          update(null, ...parts);
        }
      };
      const original_teardown = p.teardown;
      p.teardown = () => {
        teardown2();
        original_teardown == null ? void 0 : original_teardown();
      };
    };
  });
  return element_or_component;
}
function prop(props, key2, flags2, fallback) {
  var fallback_value = (
    /** @type {V} */
    fallback
  );
  var fallback_dirty = true;
  var get_fallback = () => {
    if (fallback_dirty) {
      fallback_dirty = false;
      fallback_value = /** @type {V} */
      fallback;
    }
    return fallback_value;
  };
  var initial_value;
  {
    initial_value = /** @type {V} */
    props[key2];
  }
  if (initial_value === void 0 && fallback !== void 0) {
    initial_value = get_fallback();
  }
  var getter;
  {
    getter = () => {
      var value = (
        /** @type {V} */
        props[key2]
      );
      if (value === void 0) return get_fallback();
      fallback_dirty = true;
      return value;
    };
  }
  {
    return getter;
  }
}
const PUBLIC_VERSION = "5";
if (typeof window !== "undefined") {
  ((_c = window.__svelte ?? (window.__svelte = {})).v ?? (_c.v = /* @__PURE__ */ new Set())).add(PUBLIC_VERSION);
}
const genericFamilies = /* @__PURE__ */ new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "emoji",
  "math",
  "fangsong"
]);
function cssFamily(value) {
  return genericFamilies.has(value.toLowerCase()) ? value : JSON.stringify(value);
}
function controlValue(control, draft) {
  const value = draft[control.path];
  return typeof value === "string" || typeof value === "number" ? value : control.value;
}
function colorStyle(reviewCase, draft, alpha = 1) {
  const values = Object.fromEntries(
    reviewCase.controls.map((control) => [control.id, Number(controlValue(control, draft))])
  );
  const l = values.l ?? reviewCase.value.l;
  const c = values.c ?? reviewCase.value.c;
  const h = values.h ?? reviewCase.value.h;
  return `oklch(${l} ${c} ${h}${alpha === 1 ? "" : ` / ${alpha}`})`;
}
function canvasVariables(modeGroups, colorMode, sizeMode) {
  var _a2, _b2;
  const selected = [
    (_a2 = modeGroups.find((group) => group.category === "color")) == null ? void 0 : _a2.modes.find((mode) => mode.name === colorMode),
    (_b2 = modeGroups.find((group) => group.category === "size")) == null ? void 0 : _b2.modes.find((mode) => mode.name === sizeMode)
  ];
  return selected.flatMap((mode) => Object.entries((mode == null ? void 0 : mode.tokens) ?? {})).map(([name, value]) => `${name}:${value}`).join(";");
}
function typographyStyle(reviewCase, draft, options = {}) {
  var _a2;
  const values = Object.fromEntries(
    reviewCase.controls.map((control) => [control.id, controlValue(control, draft)])
  );
  const sizeControl = reviewCase.controls.find(
    (control) => control.kind === "select" && control.id === "fontSize"
  );
  const sizeOption = (sizeControl == null ? void 0 : sizeControl.kind) === "select" ? sizeControl.options.find((option) => option.value === values.fontSize) : void 0;
  const weight = ((_a2 = reviewCase.availableWeights.find((entry) => entry.alias === values.weight)) == null ? void 0 : _a2.value) ?? reviewCase.weight.value;
  const primaryStack = [
    reviewCase.font.family,
    ...reviewCase.font.adjustedFallback ? [reviewCase.font.adjustedFallback] : [],
    ...reviewCase.font.fallbacks
  ];
  const fallbackStack = [
    ...reviewCase.font.adjustedFallback ? [reviewCase.font.adjustedFallback] : [],
    ...reviewCase.font.fallbacks
  ];
  return [
    `font-family:${(options.forceFallback ? fallbackStack : primaryStack).map(cssFamily).join(",")}`,
    `font-size:${(sizeOption == null ? void 0 : sizeOption.css) ?? `var(--${reviewCase.recipe.atomicFontSizeToken})`}`,
    `font-style:${reviewCase.style}`,
    `font-weight:${weight}`,
    "font-synthesis:none",
    `line-height:${options.wcagSpacing ? 1.5 : values.lineHeight}`,
    `letter-spacing:${options.wcagSpacing ? "0.12em" : values.letterSpacing === 0 ? "0" : `${values.letterSpacing}em`}`,
    ...options.wcagSpacing ? ["word-spacing:0.16em"] : [],
    `text-transform:${reviewCase.recipe.textTransform ?? "none"}`,
    ...reviewCase.recipe.fontKerningToken ? [`font-kerning:var(--${reviewCase.recipe.fontKerningToken})`] : [],
    ...reviewCase.recipe.fontOpticalSizingToken ? [`font-optical-sizing:var(--${reviewCase.recipe.fontOpticalSizingToken})`] : [],
    ...reviewCase.recipe.fontFeatureSettingsToken ? [`font-feature-settings:var(--${reviewCase.recipe.fontFeatureSettingsToken})`] : [],
    ...reviewCase.recipe.fontVariationSettingsToken ? [`font-variation-settings:var(--${reviewCase.recipe.fontVariationSettingsToken})`] : []
  ].join(";");
}
function shadowStyle(reviewCase, draft) {
  const controls = Object.fromEntries(
    reviewCase.controls.map((control) => [control.id, Number(controlValue(control, draft))])
  );
  const css = reviewCase.layers.map((layer, index2) => {
    const prefix = `layer-${index2}`;
    const x = controls[`${prefix}-x`] ?? layer.x;
    const y = controls[`${prefix}-y`] ?? layer.y;
    const blur = controls[`${prefix}-blur`] ?? layer.blur;
    const spread = reviewCase.shadowKind === "box" ? controls[`${prefix}-spread`] ?? layer.spread ?? 0 : void 0;
    return [
      layer.inset ? "inset" : "",
      `${x}${reviewCase.unit}`,
      `${y}${reviewCase.unit}`,
      `${blur}${reviewCase.unit}`,
      spread === void 0 ? "" : `${spread}${reviewCase.unit}`,
      layer.color.css
    ].filter(Boolean).join(" ");
  }).join(", ");
  return `${reviewCase.shadowKind === "box" ? "box-shadow" : "text-shadow"}:${css}`;
}
var root$7 = /* @__PURE__ */ from_html(`<div class="matrix-color"></div> <code> </code>`, 1);
var root_1$6 = /* @__PURE__ */ from_html(`<span class="matrix-type">Sphinx of black quartz, judge my vow.</span> <code> </code>`, 1);
var root_2$3 = /* @__PURE__ */ from_html(`<div class="matrix-shadow"><span>Aa</span></div> <code> </code>`, 1);
var root_3$3 = /* @__PURE__ */ from_html(`<div class="matrix-motion"><span></span></div> <code> </code>`, 1);
var root_4$2 = /* @__PURE__ */ from_html(`<div class="matrix-foundation"><strong> </strong> <span>generated tokens</span></div> <code> </code>`, 1);
var root_5$2 = /* @__PURE__ */ from_html(`<button class="matrix-card"><header><strong> </strong> <code> </code></header> <!></button>`);
var root_6$2 = /* @__PURE__ */ from_html(`<div></div>`);
function CaseMatrix($$anchor, $$props) {
  push($$props, true);
  let compact = prop($$props, "compact", 3, false);
  let domain = /* @__PURE__ */ user_derived(() => {
    var _a2;
    return ((_a2 = $$props.cases[0]) == null ? void 0 : _a2.kind) ?? "empty";
  });
  var div = root_6$2();
  let classes;
  each(div, 21, () => $$props.cases, index, ($$anchor2, reviewCase) => {
    var button = root_5$2();
    var header = child(button);
    var strong = child(header);
    var text = child(strong);
    var code = sibling(strong, 2);
    var text_1 = child(code);
    var node = sibling(header, 2);
    {
      var consequent = ($$anchor3) => {
        var fragment = root$7();
        var div_1 = first_child(fragment);
        var code_1 = sibling(div_1, 2);
        var text_2 = child(code_1);
        template_effect(
          ($0, $1) => {
            set_style(div_1, $0);
            set_text(text_2, $1);
          },
          [
            () => `--review-color:${colorStyle(get(reviewCase), $$props.draft)}`,
            () => colorStyle(get(reviewCase), $$props.draft)
          ]
        );
        append($$anchor3, fragment);
      };
      var consequent_1 = ($$anchor3) => {
        var fragment_1 = root_1$6();
        var span = first_child(fragment_1);
        var code_2 = sibling(span, 2);
        var text_3 = child(code_2);
        template_effect(
          ($0) => {
            set_style(span, $0);
            set_text(text_3, `--${get(reviewCase).recipe.atomicFontSizeToken ?? ""} · ${get(reviewCase).weight.alias ?? ""} ·
					${get(reviewCase).recipe.lineHeight ?? ""}`);
          },
          [() => typographyStyle(get(reviewCase), $$props.draft)]
        );
        append($$anchor3, fragment_1);
      };
      var consequent_2 = ($$anchor3) => {
        var fragment_2 = root_2$3();
        var div_2 = first_child(fragment_2);
        var span_1 = child(div_2);
        var code_3 = sibling(div_2, 2);
        var text_4 = child(code_3);
        template_effect(
          ($0) => {
            set_style(span_1, $0);
            set_text(text_4, get(reviewCase).css);
          },
          [() => shadowStyle(get(reviewCase), $$props.draft)]
        );
        append($$anchor3, fragment_2);
      };
      var consequent_3 = ($$anchor3) => {
        var fragment_3 = root_3$3();
        var div_3 = first_child(fragment_3);
        var span_2 = child(div_3);
        var code_4 = sibling(div_3, 2);
        var text_5 = child(code_4);
        template_effect(
          ($0) => {
            set_style(span_2, $0);
            set_text(text_5, `${get(reviewCase).duration.milliseconds ?? ""}ms · ${get(reviewCase).easing.name ?? ""}`);
          },
          [
            () => `width:${Math.max(8, Math.min(100, get(reviewCase).duration.milliseconds / 4))}%`
          ]
        );
        append($$anchor3, fragment_3);
      };
      var consequent_4 = ($$anchor3) => {
        var fragment_4 = root_4$2();
        var div_4 = first_child(fragment_4);
        var strong_1 = child(div_4);
        var text_6 = child(strong_1);
        var code_5 = sibling(div_4, 2);
        var text_7 = child(code_5);
        template_effect(
          ($0) => {
            var _a2;
            set_text(text_6, get(reviewCase).tokens.length);
            set_text(text_7, `${((_a2 = get(reviewCase).tokens[0]) == null ? void 0 : _a2.value) ?? ""} → ${$0 ?? ""}`);
          },
          [() => {
            var _a2;
            return (_a2 = get(reviewCase).tokens.at(-1)) == null ? void 0 : _a2.value;
          }]
        );
        append($$anchor3, fragment_4);
      };
      if_block(node, ($$render) => {
        if (get(reviewCase).kind === "color") $$render(consequent);
        else if (get(reviewCase).kind === "typography") $$render(consequent_1, 1);
        else if (get(reviewCase).kind === "shadow") $$render(consequent_2, 2);
        else if (get(reviewCase).kind === "motion") $$render(consequent_3, 3);
        else if (get(reviewCase).kind === "foundation") $$render(consequent_4, 4);
      });
    }
    template_effect(() => {
      set_text(text, get(reviewCase).label);
      set_text(text_1, get(reviewCase).sourcePath);
    });
    delegated("click", button, () => $$props.onselect(get(reviewCase).id));
    append($$anchor2, button);
  });
  template_effect(() => {
    classes = set_class(div, 1, "case-matrix", null, classes, { compact: compact() });
    set_attribute(div, "data-lab", get(domain));
  });
  append($$anchor, div);
  pop();
}
delegate(["click"]);
var root$6 = /* @__PURE__ */ from_html(`<article><div class="alpha-chip"></div> <strong> </strong> <small> </small> <code> </code></article>`);
var root_1$5 = /* @__PURE__ */ from_html(`<div class="color-stage"><div class="color-hero"><div class="color-chip"><strong> </strong> <span> </span> <code> </code></div></div> <div class="alpha-ramp"></div></div>`);
function ColorCase($$anchor, $$props) {
  push($$props, true);
  var div = root_1$5();
  var div_1 = child(div);
  var div_2 = child(div_1);
  var strong = child(div_2);
  var text = child(strong);
  var span = sibling(strong, 2);
  var text_1 = child(span);
  var code = sibling(span, 2);
  var text_2 = child(code);
  var div_3 = sibling(div_1, 2);
  each(div_3, 21, () => $$props.reviewCase.alphaVariants, index, ($$anchor2, alpha) => {
    var article = root$6();
    var div_4 = child(article);
    var strong_1 = sibling(div_4, 2);
    var text_3 = child(strong_1);
    var small = sibling(strong_1, 2);
    var text_4 = child(small);
    var code_1 = sibling(small, 2);
    var text_5 = child(code_1);
    template_effect(
      ($0, $1) => {
        set_style(div_4, $0);
        set_text(text_3, get(alpha).label);
        set_text(text_4, `${$1 ?? ""}%`);
        set_text(text_5, `--${get(alpha).token ?? ""}`);
      },
      [
        () => `--review-color:${colorStyle($$props.reviewCase, $$props.draft, get(alpha).alpha)}`,
        () => Math.round(get(alpha).alpha * 100)
      ]
    );
    append($$anchor2, article);
  });
  template_effect(
    ($0, $1) => {
      set_style(div_1, $0);
      set_text(text, $$props.reviewCase.color);
      set_text(text_1, $$props.reviewCase.mode);
      set_text(text_2, $1);
    },
    [
      () => `--review-color:${colorStyle($$props.reviewCase, $$props.draft)}`,
      () => colorStyle($$props.reviewCase, $$props.draft)
    ]
  );
  append($$anchor, div);
  pop();
}
function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function validateControlValue(control, value) {
  if (control.kind === "select") {
    if (typeof value !== "string" && typeof value !== "number" || !control.options.some((option) => option.value === value)) {
      throw new Error(`Patch value for ${control.path} is not an available option`);
    }
    return value;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Patch value for ${control.path} must be a finite number`);
  }
  if (value < control.min || value > control.max) {
    throw new Error(
      `Patch value for ${control.path} must be between ${control.min} and ${control.max}`
    );
  }
  return value;
}
function importReviewPatch(value, systemFingerprint, controls, caseIds) {
  if (!isObject(value)) throw new Error("Review patch must be a JSON object");
  if (value.kind !== "three-forma-styli/review-patch" || value.schemaVersion !== 1) {
    throw new Error("Unsupported review patch kind or schema version");
  }
  if (value.systemFingerprint !== systemFingerprint) {
    throw new Error("Review patch belongs to a different generated design system");
  }
  if (!Array.isArray(value.operations) || !Array.isArray(value.selectedCases)) {
    throw new Error("Review patch operations and selectedCases must be arrays");
  }
  const controlsByPath = new Map(controls.map((control) => [control.path, control]));
  const operations = [];
  const draft = {};
  for (const candidate of value.operations) {
    if (!isObject(candidate) || typeof candidate.path !== "string") {
      throw new Error("Every review patch operation must contain a path");
    }
    if (candidate.path in draft) {
      throw new Error(`Review patch contains duplicate path ${candidate.path}`);
    }
    const control = controlsByPath.get(candidate.path);
    if (!control) throw new Error(`Review patch references unknown path ${candidate.path}`);
    if (candidate.previous !== control.value) {
      throw new Error(`Review patch baseline is stale at ${candidate.path}`);
    }
    const next = validateControlValue(control, candidate.value);
    draft[candidate.path] = next;
    operations.push({
      path: candidate.path,
      previous: control.value,
      value: next
    });
  }
  const selectedCases = value.selectedCases.map((candidate) => {
    if (typeof candidate !== "string" || !caseIds.has(candidate)) {
      throw new Error(`Review patch references unknown selected case ${String(candidate)}`);
    }
    return candidate;
  });
  return {
    patch: {
      kind: "three-forma-styli/review-patch",
      schemaVersion: 1,
      systemFingerprint,
      operations,
      selectedCases: [...new Set(selectedCases)].sort(),
      ...typeof value.note === "string" ? { note: value.note } : {}
    },
    draft
  };
}
function patchFromDraft(systemFingerprint, baseValues, draft, selectedCases) {
  const operations = Object.entries(draft).filter(([path, value]) => baseValues[path] !== value).map(([path, value]) => ({
    path,
    previous: baseValues[path] ?? null,
    value
  })).sort((left, right) => left.path.localeCompare(right.path));
  return {
    kind: "three-forma-styli/review-patch",
    schemaVersion: 1,
    systemFingerprint,
    operations,
    selectedCases: [...new Set(selectedCases)].sort()
  };
}
function agentHandoff(patch, generate = "tfs build .", check = "tfs check .") {
  return {
    kind: "three-forma-styli/agent-handoff",
    schemaVersion: 1,
    patch,
    instructions: "Apply these reviewed visual decisions to the authored TFS source. Preserve helper-driven architecture, regenerate owned artifacts, run the declared checks, inspect the named review cases, and commit only the coherent source plus generated result.",
    verification: { generate, check }
  };
}
function downloadJson(name, value) {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}
`], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link2 = document.createElement("a");
  link2.href = url;
  link2.download = name;
  link2.click();
  URL.revokeObjectURL(url);
}
var root$5 = /* @__PURE__ */ from_html(`<article class="foundation-item"><div class="foundation-sample"></div> <strong> </strong> <code> </code></article>`);
var root_1$4 = /* @__PURE__ */ from_html(`<div class="foundation-stage"></div>`);
function FoundationCase($$anchor, $$props) {
  push($$props, true);
  var div = root_1$4();
  each(div, 21, () => $$props.reviewCase.tokens, index, ($$anchor2, token) => {
    var article = root$5();
    var div_1 = child(article);
    var strong = sibling(div_1, 2);
    var text = child(strong);
    var code = sibling(strong, 2);
    var text_1 = child(code);
    template_effect(() => {
      set_attribute(div_1, "data-family", $$props.reviewCase.family);
      set_style(div_1, `--review-value:var(--${get(token).name});--review-raw:${get(token).rawValue ?? 0}`);
      set_text(text, `--${get(token).name ?? ""}`);
      set_text(text_1, get(token).value);
    });
    append($$anchor2, article);
  });
  append($$anchor, div);
  pop();
}
var root$4 = /* @__PURE__ */ from_html(`<div></div>`);
var root_1$3 = /* @__PURE__ */ from_html(`<div class="motion-stage"><div class="motion-preference" aria-label="Motion preference"><button>standard</button> <button>reduced</button> <span> </span></div> <div class="motion-meta"><article><span>duration</span> <strong> </strong> <code> </code></article> <article><span>delay</span> <strong> </strong> <code> </code></article> <article><span>easing</span> <strong> </strong> <code> </code></article></div> <div class="motion-track"><!></div> <button class="motion-play">play once</button> <code class="motion-tuple"> </code></div>`);
function MotionCase($$anchor, $$props) {
  push($$props, true);
  let motionRun = /* @__PURE__ */ state(0);
  let reduced = /* @__PURE__ */ state(new URLSearchParams(location.search).get("motion") === "reduce");
  let value = /* @__PURE__ */ user_derived(() => get(reduced) ? $$props.reviewCase.reducedMotion : $$props.reviewCase);
  function setReduced(next) {
    set(reduced, next, true);
    set(motionRun, get(motionRun) + 1);
    const url = new URL(location.href);
    url.searchParams.set("motion", next ? "reduce" : "no-preference");
    history.replaceState(null, "", url);
  }
  var div = root_1$3();
  var div_1 = child(div);
  var button = child(div_1);
  let classes;
  var button_1 = sibling(button, 2);
  let classes_1;
  var span = sibling(button_1, 2);
  var text = child(span);
  var div_2 = sibling(div_1, 2);
  var article = child(div_2);
  var strong = sibling(child(article), 2);
  var text_1 = child(strong);
  var code = sibling(strong, 2);
  var text_2 = child(code);
  var article_1 = sibling(article, 2);
  var strong_1 = sibling(child(article_1), 2);
  var text_3 = child(strong_1);
  var code_1 = sibling(strong_1, 2);
  var text_4 = child(code_1);
  var article_2 = sibling(article_1, 2);
  var strong_2 = sibling(child(article_2), 2);
  var text_5 = child(strong_2);
  var code_2 = sibling(strong_2, 2);
  var text_6 = child(code_2);
  var div_3 = sibling(div_2, 2);
  var node = child(div_3);
  key(node, () => get(motionRun), ($$anchor2) => {
    var div_4 = root$4();
    let classes_2;
    template_effect(() => {
      classes_2 = set_class(div_4, 1, "motion-object", null, classes_2, { running: get(motionRun) > 0 });
      set_style(div_4, `--review-duration:${get(value).duration.milliseconds}ms;--review-delay:${get(value).delay.milliseconds}ms;--review-easing:${get(value).easing.css}`);
    });
    append($$anchor2, div_4);
  });
  var button_2 = sibling(div_3, 2);
  var code_3 = sibling(button_2, 2);
  var text_7 = child(code_3);
  template_effect(() => {
    classes = set_class(button, 1, "", null, classes, { active: !get(reduced) });
    classes_1 = set_class(button_1, 1, "", null, classes_1, { active: get(reduced) });
    set_attribute(span, "data-behavior", $$props.reviewCase.reducedMotion.behavior);
    set_text(text, $$props.reviewCase.reducedMotion.behavior);
    set_text(text_1, `${get(value).duration.milliseconds ?? ""}ms`);
    set_text(text_2, get(value).duration.token ? `--${get(value).duration.token}` : "0ms");
    set_text(text_3, `${get(value).delay.milliseconds ?? ""}ms`);
    set_text(text_4, get(value).delay.token ? `--${get(value).delay.token}` : "0ms");
    set_text(text_5, get(value).easing.name);
    set_text(text_6, `--${get(value).easing.token ?? ""}`);
    set_text(text_7, `${get(value).duration.milliseconds ?? ""}ms ${get(value).easing.css ?? ""}
		${get(value).delay.milliseconds ?? ""}ms`);
  });
  delegated("click", button, () => setReduced(false));
  delegated("click", button_1, () => setReduced(true));
  delegated("click", button_2, () => set(motionRun, get(motionRun) + 1));
  append($$anchor, div);
  pop();
}
delegate(["click"]);
var root$3 = /* @__PURE__ */ from_html(`<div class="shadow-stage"><div class="shadow-pair"><div class="shadow-object">Aa</div> <div class="clip-boundary"><div class="shadow-object">Aa</div></div></div> <pre> </pre></div>`);
function ShadowCase($$anchor, $$props) {
  push($$props, true);
  var div = root$3();
  var div_1 = child(div);
  var div_2 = child(div_1);
  var div_3 = sibling(div_2, 2);
  var div_4 = child(div_3);
  var pre = sibling(div_1, 2);
  var text = child(pre);
  template_effect(
    ($0, $1, $2) => {
      set_style(div_2, $0);
      set_style(div_4, $1);
      set_text(text, $2);
    },
    [
      () => shadowStyle($$props.reviewCase, $$props.draft),
      () => shadowStyle($$props.reviewCase, $$props.draft),
      () => shadowStyle($$props.reviewCase, $$props.draft)
    ]
  );
  append($$anchor, div);
  pop();
}
var root$2 = /* @__PURE__ */ from_html(`<label><input type="checkbox"/> adjusted fallback</label> <output> </output>`, 1);
var root_1$2 = /* @__PURE__ */ from_html(`<div class="metric-overlay" aria-hidden="true"><i class="metric-line" style="top:0"><span>line top</span></i> <i class="metric-line"><span>line bottom</span></i> <i class="metric-cap"><span>1cap</span></i> <i class="metric-ex"><span>1ex</span></i> <i class="metric-baseline"><span>baseline</span></i></div>`);
var root_2$2 = /* @__PURE__ */ from_html(`<article><code> </code> <span>Aa 0123</span></article>`);
var root_3$2 = /* @__PURE__ */ from_html(`<div><div class="type-tools"><label><input type="checkbox"/> metrics</label> <label><input type="checkbox"/> light surface</label> <label><input type="checkbox"/> WCAG spacing stress</label> <!></div> <div class="type-stage-body"><p class="eyebrow"> </p> <div><p class="type-short" contenteditable="true" aria-label="Editable typography sample" spellcheck="false">Sphinx of black quartz, judge my vow.</p> <span class="metric-probe">Hhx<span class="baseline-probe"></span><i class="cap-probe"></i><i class="ex-probe"></i></span> <!></div> <div class="type-columns"><div><span class="type-caption">narrow wrapping</span> <p>Typography becomes a system when every choice remains intentional under density, wrapping,
					different surfaces, real content and imperfect loading conditions.</p></div> <div><span class="type-caption">glyph stress</span> <p class="glyph-stress">ABCDEFGHIJKLMNOPQRSTUVWXYZ · abcdefghijklmnopqrstuvwxyz · 0123456789 · $€£¥ ₿ ± × ÷ → ← ↑
					↓ &#123; &#125; [ ] ( )</p></div></div> <div class="weight-matrix"></div></div></div>`);
function TypographyCase($$anchor, $$props) {
  push($$props, true);
  let lineDiagnostics = /* @__PURE__ */ state(false);
  let lightSurface = /* @__PURE__ */ state(false);
  let wcagSpacing = /* @__PURE__ */ state(false);
  let forceFallback = /* @__PURE__ */ state(false);
  let typeSample = /* @__PURE__ */ state(void 0);
  let wrapSample = /* @__PURE__ */ state(void 0);
  let glyphSample = /* @__PURE__ */ state(void 0);
  let metricProbe = /* @__PURE__ */ state(void 0);
  let baselineProbe = /* @__PURE__ */ state(void 0);
  let capProbe = /* @__PURE__ */ state(void 0);
  let exProbe = /* @__PURE__ */ state(void 0);
  let metricGuides = /* @__PURE__ */ state(proxy({ lineBottom: 0, baseline: 0, cap: 0, ex: 0 }));
  let fallbackEvidence = /* @__PURE__ */ state("");
  let fallbackMeasurementRun = 0;
  user_effect(() => {
    $$props.reviewCase.id;
    $$props.draft;
    get(lineDiagnostics);
    get(forceFallback);
    get(wcagSpacing);
    const frame = requestAnimationFrame(() => {
      refreshMetricGuides();
      void refreshFallbackEvidence();
    });
    return () => cancelAnimationFrame(frame);
  });
  function refreshMetricGuides() {
    if (!get(metricProbe) || !get(baselineProbe) || !get(capProbe) || !get(exProbe)) return;
    const probe = get(metricProbe).getBoundingClientRect();
    const baseline = get(baselineProbe).getBoundingClientRect().top - probe.top;
    set(
      metricGuides,
      {
        lineBottom: probe.height,
        baseline,
        cap: baseline - get(capProbe).getBoundingClientRect().height,
        ex: baseline - get(exProbe).getBoundingClientRect().height
      },
      true
    );
  }
  function renderedLineCount(element) {
    const range = document.createRange();
    range.selectNodeContents(element);
    const tops = [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0).map((rect) => Math.round(rect.top * 10) / 10);
    return new Set(tops).size;
  }
  function measureTypography(forceAdjustedFallback, text, width) {
    const style = typographyStyle($$props.reviewCase, $$props.draft, {
      forceFallback: forceAdjustedFallback,
      wcagSpacing: get(wcagSpacing)
    });
    const probe = document.createElement(width === void 0 ? "span" : "div");
    probe.textContent = text;
    probe.style.cssText = width === void 0 ? `${style};position:fixed;left:-100000px;top:0;visibility:hidden;display:inline-block;width:max-content;max-width:none;white-space:pre` : `${style};position:fixed;left:-100000px;top:0;visibility:hidden;width:${width}px`;
    document.body.append(probe);
    const result = {
      width: probe.getBoundingClientRect().width,
      lines: width === void 0 ? 1 : renderedLineCount(probe)
    };
    probe.remove();
    return result;
  }
  async function hasLoadedFace(family, style, weight, text) {
    try {
      const faces = await document.fonts.load(`${style} ${weight} 16px ${JSON.stringify(family)}`, text);
      return faces.some((face) => face.status === "loaded");
    } catch {
      return false;
    }
  }
  async function refreshFallbackEvidence() {
    var _a2;
    const run = ++fallbackMeasurementRun;
    if (!$$props.reviewCase.font.adjustedFallback) {
      set(fallbackEvidence, "");
      return;
    }
    await document.fonts.ready;
    if (run !== fallbackMeasurementRun) return;
    if (!get(typeSample) || !get(wrapSample) || !get(glyphSample)) return;
    const weightControl = $$props.reviewCase.controls.find((control) => control.id === "weight");
    const weightAlias = weightControl && typeof $$props.draft[weightControl.path] === "string" ? String($$props.draft[weightControl.path]) : $$props.reviewCase.weight.alias;
    const weight = ((_a2 = $$props.reviewCase.availableWeights.find((entry) => entry.alias === weightAlias)) == null ? void 0 : _a2.value) ?? $$props.reviewCase.weight.value;
    const sampleText = get(typeSample).textContent ?? "";
    const primaryReady = await hasLoadedFace($$props.reviewCase.font.family, $$props.reviewCase.style, weight, sampleText);
    if (run !== fallbackMeasurementRun) return;
    if (!primaryReady) {
      set(fallbackEvidence, `primary face unavailable: ${$$props.reviewCase.font.family} ${$$props.reviewCase.style} ${weight}`);
      return;
    }
    const adjustedReady = await hasLoadedFace($$props.reviewCase.font.adjustedFallback, $$props.reviewCase.style, weight, sampleText);
    if (run !== fallbackMeasurementRun) return;
    if (!adjustedReady) {
      set(fallbackEvidence, `adjusted fallback unavailable: ${$$props.reviewCase.font.adjustedFallback} ${$$props.reviewCase.style} ${weight}`);
      return;
    }
    const widthEvidence = (text) => {
      const primary = measureTypography(false, text);
      const adjusted = measureTypography(true, text);
      const delta = adjusted.width - primary.width;
      return {
        delta,
        percent: primary.width === 0 ? 0 : delta / primary.width * 100
      };
    };
    const phrase = widthEvidence(get(typeSample).textContent ?? "");
    const glyphs = widthEvidence(get(glyphSample).textContent ?? "");
    const wrapWidth = get(wrapSample).getBoundingClientRect().width;
    const primaryWrap = measureTypography(false, get(wrapSample).textContent ?? "", wrapWidth);
    const adjustedWrap = measureTypography(true, get(wrapSample).textContent ?? "", wrapWidth);
    if (run !== fallbackMeasurementRun) return;
    const signed = (value, digits) => `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
    const lineDelta = adjustedWrap.lines - primaryWrap.lines;
    set(
      fallbackEvidence,
      [
        `phrase width Δ ${signed(phrase.delta, 2)}px (${signed(phrase.percent, 2)}%)`,
        `narrow lines Δ ${lineDelta >= 0 ? "+" : ""}${lineDelta} (${primaryWrap.lines}→${adjustedWrap.lines})`,
        `glyph stress width Δ ${signed(glyphs.delta, 2)}px (${signed(glyphs.percent, 2)}%)`
      ].join(" · "),
      true
    );
  }
  var div = root_3$2();
  let classes;
  var div_1 = child(div);
  var label = child(div_1);
  var input = child(label);
  var label_1 = sibling(label, 2);
  var input_1 = child(label_1);
  var label_2 = sibling(label_1, 2);
  var input_2 = child(label_2);
  var node = sibling(label_2, 2);
  {
    var consequent = ($$anchor2) => {
      var fragment = root$2();
      var label_3 = first_child(fragment);
      var input_3 = child(label_3);
      var output = sibling(label_3, 2);
      var text_1 = child(output);
      template_effect(() => set_text(text_1, get(fallbackEvidence) || "measuring primary → adjusted fallback…"));
      bind_checked(input_3, () => get(forceFallback), ($$value) => set(forceFallback, $$value));
      append($$anchor2, fragment);
    };
    if_block(node, ($$render) => {
      if ($$props.reviewCase.font.adjustedFallback) $$render(consequent);
    });
  }
  var div_2 = sibling(div_1, 2);
  var p = child(div_2);
  var text_2 = child(p);
  var div_3 = sibling(p, 2);
  let classes_1;
  var p_1 = child(div_3);
  bind_this(p_1, ($$value) => set(typeSample, $$value), () => get(typeSample));
  var span = sibling(p_1, 2);
  var span_1 = sibling(child(span));
  bind_this(span_1, ($$value) => set(baselineProbe, $$value), () => get(baselineProbe));
  var i = sibling(span_1);
  bind_this(i, ($$value) => set(capProbe, $$value), () => get(capProbe));
  var i_1 = sibling(i);
  bind_this(i_1, ($$value) => set(exProbe, $$value), () => get(exProbe));
  bind_this(span, ($$value) => set(metricProbe, $$value), () => get(metricProbe));
  var node_1 = sibling(span, 2);
  {
    var consequent_1 = ($$anchor2) => {
      var div_4 = root_1$2();
      var i_2 = sibling(child(div_4), 2);
      var i_3 = sibling(i_2, 2);
      var i_4 = sibling(i_3, 2);
      var i_5 = sibling(i_4, 2);
      template_effect(() => {
        set_style(i_2, `top:${get(metricGuides).lineBottom}px`);
        set_style(i_3, `top:${get(metricGuides).cap}px`);
        set_style(i_4, `top:${get(metricGuides).ex}px`);
        set_style(i_5, `top:${get(metricGuides).baseline}px`);
      });
      append($$anchor2, div_4);
    };
    if_block(node_1, ($$render) => {
      if (get(lineDiagnostics)) $$render(consequent_1);
    });
  }
  var div_5 = sibling(div_3, 2);
  var div_6 = child(div_5);
  var p_2 = sibling(child(div_6), 2);
  bind_this(p_2, ($$value) => set(wrapSample, $$value), () => get(wrapSample));
  var div_7 = sibling(div_6, 2);
  var p_3 = sibling(child(div_7), 2);
  bind_this(p_3, ($$value) => set(glyphSample, $$value), () => get(glyphSample));
  var div_8 = sibling(div_5, 2);
  each(div_8, 21, () => Object.entries($$props.reviewCase.styleWeights), index, ($$anchor2, $$item) => {
    var $$array = /* @__PURE__ */ user_derived(() => to_array(get($$item), 2));
    let style = () => get($$array)[0];
    let weights = () => get($$array)[1];
    var fragment_1 = comment();
    var node_2 = first_child(fragment_1);
    each(node_2, 17, weights, index, ($$anchor3, weight) => {
      var article = root_2$2();
      var code = child(article);
      var text_3 = child(code);
      var span_2 = sibling(code, 2);
      template_effect(
        ($0) => {
          set_text(text_3, `${style() ?? ""} · ${get(weight).alias ?? ""} · ${get(weight).value ?? ""}`);
          set_style(span_2, $0);
        },
        [
          () => `${typographyStyle($$props.reviewCase, $$props.draft, {
            forceFallback: get(forceFallback),
            wcagSpacing: get(wcagSpacing)
          })};font-style:${style()};font-weight:${get(weight).value}`
        ]
      );
      append($$anchor3, article);
    });
    append($$anchor2, fragment_1);
  });
  template_effect(
    ($0, $1, $2, $3) => {
      classes = set_class(div, 1, "typography-stage", null, classes, { "light-surface": get(lightSurface) });
      set_text(text_2, `${$$props.reviewCase.role ?? ""} · ${$$props.reviewCase.variant ?? "base" ?? ""}`);
      classes_1 = set_class(div_3, 1, "metric-sample", null, classes_1, { diagnostics: get(lineDiagnostics) });
      set_style(p_1, $0);
      set_style(span, $1);
      set_style(p_2, $2);
      set_style(p_3, $3);
    },
    [
      () => typographyStyle($$props.reviewCase, $$props.draft, {
        forceFallback: get(forceFallback),
        wcagSpacing: get(wcagSpacing)
      }),
      () => typographyStyle($$props.reviewCase, $$props.draft, {
        forceFallback: get(forceFallback),
        wcagSpacing: get(wcagSpacing)
      }),
      () => typographyStyle($$props.reviewCase, $$props.draft, {
        forceFallback: get(forceFallback),
        wcagSpacing: get(wcagSpacing)
      }),
      () => typographyStyle($$props.reviewCase, $$props.draft, {
        forceFallback: get(forceFallback),
        wcagSpacing: get(wcagSpacing)
      })
    ]
  );
  bind_checked(input, () => get(lineDiagnostics), ($$value) => set(lineDiagnostics, $$value));
  bind_checked(input_1, () => get(lightSurface), ($$value) => set(lightSurface, $$value));
  bind_checked(input_2, () => get(wcagSpacing), ($$value) => set(wcagSpacing, $$value));
  delegated("input", p_1, () => {
    refreshMetricGuides();
    void refreshFallbackEvidence();
  });
  append($$anchor, div);
  pop();
}
delegate(["input"]);
function CaseView($$anchor, $$props) {
  push($$props, true);
  var fragment = comment();
  var node = first_child(fragment);
  {
    var consequent = ($$anchor2) => {
      ColorCase($$anchor2, {
        get reviewCase() {
          return $$props.reviewCase;
        },
        get draft() {
          return $$props.draft;
        }
      });
    };
    var consequent_1 = ($$anchor2) => {
      TypographyCase($$anchor2, {
        get reviewCase() {
          return $$props.reviewCase;
        },
        get draft() {
          return $$props.draft;
        }
      });
    };
    var consequent_2 = ($$anchor2) => {
      ShadowCase($$anchor2, {
        get reviewCase() {
          return $$props.reviewCase;
        },
        get draft() {
          return $$props.draft;
        }
      });
    };
    var consequent_3 = ($$anchor2) => {
      var fragment_4 = comment();
      var node_1 = first_child(fragment_4);
      key(node_1, () => $$props.reviewCase.id, ($$anchor3) => {
        MotionCase($$anchor3, {
          get reviewCase() {
            return $$props.reviewCase;
          }
        });
      });
      append($$anchor2, fragment_4);
    };
    var consequent_4 = ($$anchor2) => {
      FoundationCase($$anchor2, {
        get reviewCase() {
          return $$props.reviewCase;
        }
      });
    };
    if_block(node, ($$render) => {
      var _a2, _b2, _c2, _d, _e;
      if (((_a2 = $$props.reviewCase) == null ? void 0 : _a2.kind) === "color") $$render(consequent);
      else if (((_b2 = $$props.reviewCase) == null ? void 0 : _b2.kind) === "typography") $$render(consequent_1, 1);
      else if (((_c2 = $$props.reviewCase) == null ? void 0 : _c2.kind) === "shadow") $$render(consequent_2, 2);
      else if (((_d = $$props.reviewCase) == null ? void 0 : _d.kind) === "motion") $$render(consequent_3, 3);
      else if (((_e = $$props.reviewCase) == null ? void 0 : _e.kind) === "foundation") $$render(consequent_4, 4);
    });
  }
  append($$anchor, fragment);
  pop();
}
var root$1 = /* @__PURE__ */ from_html(`<div class="inspector-title"><div><span>matrix overview</span> <strong> </strong></div></div> <div class="empty-inspector"><strong> </strong> <p> </p></div>`, 1);
var root_1$1 = /* @__PURE__ */ from_html(`<button>reset case</button>`);
var root_2$1 = /* @__PURE__ */ from_html(`<div class="number-pair"><input type="range"/> <input type="number"/> <small> </small></div>`);
var root_3$1 = /* @__PURE__ */ from_html(`<option> </option>`);
var root_4$1 = /* @__PURE__ */ from_html(`<select></select>`);
var root_5$1 = /* @__PURE__ */ from_html(`<label><span> </span> <!> <code> </code></label>`);
var root_6$1 = /* @__PURE__ */ from_html(`<div class="controls"></div>`);
var root_7$1 = /* @__PURE__ */ from_html(
  `<strong>Playback-only review</strong> <p>This case exposes resolved timing and easing facts. Its authored references remain
						source-controlled until structured time-reference editing is designed.</p>`,
  1
);
var root_8$1 = /* @__PURE__ */ from_html(
  `<strong>Derived scale</strong> <p>These values are generated from compact authored anchors. Calibrate the source schedule
						rather than patching individual derived tokens.</p>`,
  1
);
var root_9$1 = /* @__PURE__ */ from_html(`<div class="empty-inspector"><!></div>`);
var root_10$1 = /* @__PURE__ */ from_html(`<div class="inspector-title"><div><span> </span> <strong> </strong></div> <!></div> <!>`, 1);
var root_11$1 = /* @__PURE__ */ from_html(`<div class="empty-inspector"><strong>Resolved system</strong> <p>Select a lab and case to inspect source decisions and create a non-destructive draft.</p></div>`);
var root_12$1 = /* @__PURE__ */ from_html(`<aside class="inspector" aria-label="Case inspector"><!> <div class="draft-footer"><button>discard all edits</button></div></aside>`);
function Inspector($$anchor, $$props) {
  push($$props, true);
  var aside = root_12$1();
  var node = child(aside);
  {
    var consequent = ($$anchor2) => {
      var fragment = root$1();
      var div = first_child(fragment);
      var div_1 = child(div);
      var strong = sibling(child(div_1), 2);
      var text = child(strong);
      var div_2 = sibling(div, 2);
      var strong_1 = child(div_2);
      var text_1 = child(strong_1);
      var p = sibling(strong_1, 2);
      var text_2 = child(p);
      template_effect(
        ($0) => {
          set_text(text, $$props.labLabel);
          set_text(text_1, `${$$props.visibleCaseCount ?? ""} visible cases`);
          set_text(text_2, `Compare the full ${$0 ?? ""} system at once. Filter or change modes to narrow the
				matrix, then select any specimen for precise calibration and source paths.`);
        },
        [() => {
          var _a2;
          return (_a2 = $$props.labLabel) == null ? void 0 : _a2.toLowerCase();
        }]
      );
      append($$anchor2, fragment);
    };
    var consequent_5 = ($$anchor2) => {
      var fragment_1 = root_10$1();
      var div_3 = first_child(fragment_1);
      var div_4 = child(div_3);
      var span = child(div_4);
      var text_3 = child(span);
      var strong_2 = sibling(span, 2);
      var text_4 = child(strong_2);
      var node_1 = sibling(div_4, 2);
      {
        var consequent_1 = ($$anchor3) => {
          var button = root_1$1();
          delegated("click", button, function(...$$args) {
            var _a2;
            (_a2 = $$props.resetCase) == null ? void 0 : _a2.apply(this, $$args);
          });
          append($$anchor3, button);
        };
        if_block(node_1, ($$render) => {
          if ($$props.activeCase.controls.length > 0) $$render(consequent_1);
        });
      }
      var node_2 = sibling(div_3, 2);
      {
        var consequent_3 = ($$anchor3) => {
          var div_5 = root_6$1();
          each(div_5, 21, () => $$props.activeCase.controls, index, ($$anchor4, control) => {
            var label = root_5$1();
            let classes;
            var span_1 = child(label);
            var text_5 = child(span_1);
            var node_3 = sibling(span_1, 2);
            {
              var consequent_2 = ($$anchor5) => {
                var div_6 = root_2$1();
                var input = child(div_6);
                var input_1 = sibling(input, 2);
                var small = sibling(input_1, 2);
                var text_6 = child(small);
                template_effect(
                  ($0, $1) => {
                    set_attribute(input, "aria-label", `${get(control).label} slider`);
                    set_attribute(input, "min", get(control).min);
                    set_attribute(input, "max", get(control).max);
                    set_attribute(input, "step", get(control).step);
                    set_value(input, $0);
                    set_attribute(input_1, "aria-label", `${get(control).label} value`);
                    set_attribute(input_1, "min", get(control).min);
                    set_attribute(input_1, "max", get(control).max);
                    set_attribute(input_1, "step", get(control).step);
                    set_value(input_1, $1);
                    set_text(text_6, get(control).unit);
                  },
                  [
                    () => controlValue(get(control), $$props.draft),
                    () => controlValue(get(control), $$props.draft)
                  ]
                );
                delegated("input", input, (event2) => $$props.setControl(get(control), Number(event2.currentTarget.value)));
                delegated("dblclick", input, () => $$props.resetControl(get(control)));
                delegated("input", input_1, (event2) => $$props.setControl(get(control), Number(event2.currentTarget.value)));
                append($$anchor5, div_6);
              };
              var alternate = ($$anchor5) => {
                var select = root_4$1();
                each(select, 21, () => get(control).options, index, ($$anchor6, option) => {
                  var option_1 = root_3$1();
                  var text_7 = child(option_1);
                  var option_1_value = {};
                  template_effect(
                    ($0) => {
                      set_selected(option_1, $0);
                      set_text(text_7, get(option).label);
                      if (option_1_value !== (option_1_value = get(option).value)) {
                        option_1.value = (option_1.__value = get(option).value) ?? "";
                      }
                    },
                    [
                      () => get(option).value === controlValue(get(control), $$props.draft)
                    ]
                  );
                  append($$anchor6, option_1);
                });
                var select_value;
                init_select(select);
                template_effect(
                  ($0) => {
                    set_attribute(select, "aria-label", get(control).label);
                    if (select_value !== (select_value = $0)) {
                      select.value = (select.__value = $0) ?? "", select_option(select, $0);
                    }
                  },
                  [() => controlValue(get(control), $$props.draft)]
                );
                delegated("change", select, (event2) => {
                  const option = get(control).options.find((entry) => String(entry.value) === event2.currentTarget.value);
                  if (option) $$props.setControl(get(control), option.value);
                });
                append($$anchor5, select);
              };
              if_block(node_3, ($$render) => {
                if (get(control).kind === "number") $$render(consequent_2);
                else $$render(alternate, -1);
              });
            }
            var code = sibling(node_3, 2);
            var text_8 = child(code);
            template_effect(() => {
              classes = set_class(label, 1, "", null, classes, { changed: $$props.draft[get(control).path] !== void 0 });
              set_text(text_5, get(control).label);
              set_text(text_8, get(control).path);
            });
            append($$anchor4, label);
          });
          append($$anchor3, div_5);
        };
        var alternate_2 = ($$anchor3) => {
          var div_7 = root_9$1();
          var node_4 = child(div_7);
          {
            var consequent_4 = ($$anchor4) => {
              var fragment_2 = root_7$1();
              append($$anchor4, fragment_2);
            };
            var alternate_1 = ($$anchor4) => {
              var fragment_3 = root_8$1();
              append($$anchor4, fragment_3);
            };
            if_block(node_4, ($$render) => {
              if ($$props.activeCase.kind === "motion") $$render(consequent_4);
              else $$render(alternate_1, -1);
            });
          }
          append($$anchor3, div_7);
        };
        if_block(node_2, ($$render) => {
          if ($$props.activeCase.controls.length > 0) $$render(consequent_3);
          else $$render(alternate_2, -1);
        });
      }
      template_effect(() => {
        set_text(text_3, $$props.activeCase.controls.length > 0 ? "calibration" : "resolved case");
        set_text(text_4, $$props.activeCase.label);
      });
      append($$anchor2, fragment_1);
    };
    var alternate_3 = ($$anchor2) => {
      var div_8 = root_11$1();
      append($$anchor2, div_8);
    };
    if_block(node, ($$render) => {
      if ($$props.matrix) $$render(consequent);
      else if ($$props.activeCase) $$render(consequent_5, 1);
      else $$render(alternate_3, -1);
    });
  }
  var div_9 = sibling(node, 2);
  var button_1 = child(div_9);
  template_effect(() => button_1.disabled = $$props.editCount === 0);
  delegated("click", button_1, function(...$$args) {
    var _a2;
    (_a2 = $$props.clearDraft) == null ? void 0 : _a2.apply(this, $$args);
  });
  append($$anchor, aside);
  pop();
}
delegate(["click", "input", "dblclick", "change"]);
var root = /* @__PURE__ */ from_html(`<option> </option>`);
var root_1 = /* @__PURE__ */ from_html(`<label><span>color</span> <select data-testid="color-mode" aria-label="color mode"></select></label>`);
var root_2 = /* @__PURE__ */ from_html(`<label><span>size</span> <select data-testid="size-mode" aria-label="size mode"></select></label>`);
var root_3 = /* @__PURE__ */ from_html(`<span class="action-status" aria-live="polite"> </span>`);
var root_4 = /* @__PURE__ */ from_html(`<small> </small>`);
var root_5 = /* @__PURE__ */ from_html(`<button><span> </span> <!></button>`);
var root_6 = /* @__PURE__ */ from_html(`<label class="case-filter"><span class="sr-only"> </span> <input type="search" placeholder="filter cases"/></label>`);
var root_7 = /* @__PURE__ */ from_html(`<button> </button>`);
var root_8 = /* @__PURE__ */ from_html(`<p class="no-cases">No matching cases</p>`);
var root_9 = /* @__PURE__ */ from_html(`<div class="case-list"><!> <!> <!></div>`);
var root_10 = /* @__PURE__ */ from_html(`<div class="view-switch" aria-label="Canvas view"><button>matrix</button> <button>case</button> <button>compare</button></div>`);
var root_11 = /* @__PURE__ */ from_html(`<code> </code>`);
var root_12 = /* @__PURE__ */ from_html(`<div class="comparison" data-testid="baseline-draft-comparison"><section class="comparison-frame" data-state="baseline"><header><span>immutable source</span> <strong>baseline</strong></header> <div class="comparison-body"><!></div></section> <section class="comparison-frame" data-state="draft"><header><span>review overlay</span> <strong>draft</strong></header> <div class="comparison-body"><!></div></section></div>`);
var root_13 = /* @__PURE__ */ from_html(`<article><span> </span><strong> </strong></article>`);
var root_14 = /* @__PURE__ */ from_html(`<li><span> </span> <div><strong> </strong> <!></div></li>`);
var root_15 = /* @__PURE__ */ from_html(`<section class="overview-diagnostics" aria-label="Build diagnostics"><header><div><span>build evidence</span> <strong>diagnostics</strong></div> <small> </small></header> <ul></ul></section>`);
var root_16 = /* @__PURE__ */ from_html(`<section class="overview-section"><header><div><span>system domain</span> <strong> </strong></div> <button> </button></header> <!></section>`);
var root_17 = /* @__PURE__ */ from_html(`<div class="system-overview"><div class="overview-grid"></div> <!> <!></div>`);
var root_18 = /* @__PURE__ */ from_html(`<div class="workbench" data-testid="workbench"><header class="topbar"><div class="identity"><span class="mark">TFS</span> <div><strong> </strong> <small> </small></div></div> <div class="globals"><!> <!></div> <div class="actions"><button aria-label="Undo draft">↶</button> <button aria-label="Redo draft">↷</button> <span> </span> <input class="patch-input" type="file" accept="application/json,.json" aria-label="Import review patch" data-testid="patch-input"/> <button>import</button> <button>export</button> <button>copy agent handoff</button> <!></div></header> <aside class="navigation" aria-label="Workbench labs"><nav></nav> <!></aside> <main class="canvas-shell"><div class="canvas-header"><div><span> </span> <strong> </strong></div> <!> <!></div> <section data-testid="review-canvas"><!></section></main> <!></div>`);
function App($$anchor, $$props) {
  var _a2, _b2;
  push($$props, true);
  function contractControls(value) {
    return value.labs.flatMap((lab) => lab.kind === "color" || lab.kind === "typography" || lab.kind === "shadows" || lab.kind === "motion" || lab.kind === "foundation" ? lab.cases.flatMap((reviewCase) => reviewCase.controls) : []);
  }
  function storedDraft(value) {
    const raw = localStorage.getItem(`tfs-workbench:${value.systemFingerprint}`);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
      const allowed = new Map(contractControls(value).map((control) => [control.path, control]));
      return Object.fromEntries(Object.entries(parsed).filter(([path, draftValue]) => {
        const control = allowed.get(path);
        if (!control) return false;
        return control.kind === "number" ? typeof draftValue === "number" && Number.isFinite(draftValue) : typeof draftValue === "string" || typeof draftValue === "number";
      }));
    } catch {
      return {};
    }
  }
  const initialContract = untrack(() => $$props.contract);
  const params = new URLSearchParams(location.search);
  const initialCaseId = params.get("case") ?? "";
  const initialView = params.get("view") === "matrix" ? "matrix" : params.get("view") === "compare" ? "compare" : "case";
  let draft = /* @__PURE__ */ state(proxy(storedDraft(initialContract)));
  let undo = /* @__PURE__ */ state(proxy([]));
  let redo = /* @__PURE__ */ state(proxy([]));
  let activeLabId = /* @__PURE__ */ state(proxy(params.get("lab") ?? "overview"));
  let activeCaseId = /* @__PURE__ */ state(proxy(initialCaseId));
  let caseQuery = /* @__PURE__ */ state("");
  let viewMode = /* @__PURE__ */ state(proxy(initialView));
  let colorMode = /* @__PURE__ */ state(proxy(params.get("color") ?? ((_a2 = initialContract.globals.modes.find((group) => group.category === "color")) == null ? void 0 : _a2.default) ?? ""));
  let sizeMode = /* @__PURE__ */ state(proxy(params.get("size") ?? ((_b2 = initialContract.globals.modes.find((group) => group.category === "size")) == null ? void 0 : _b2.default) ?? ""));
  let handoffStatus = /* @__PURE__ */ state("");
  let patchInput = /* @__PURE__ */ state(void 0);
  let activeLab = /* @__PURE__ */ user_derived(() => $$props.contract.labs.find((lab) => lab.id === get(activeLabId)) ?? $$props.contract.labs[0]);
  let cases = /* @__PURE__ */ user_derived(() => {
    var _a3, _b3, _c2, _d, _e;
    return ((_a3 = get(activeLab)) == null ? void 0 : _a3.kind) === "color" || ((_b3 = get(activeLab)) == null ? void 0 : _b3.kind) === "typography" || ((_c2 = get(activeLab)) == null ? void 0 : _c2.kind) === "shadows" || ((_d = get(activeLab)) == null ? void 0 : _d.kind) === "motion" || ((_e = get(activeLab)) == null ? void 0 : _e.kind) === "foundation" ? get(activeLab).cases : [];
  });
  let activeCase = /* @__PURE__ */ user_derived(() => get(cases).find((reviewCase) => reviewCase.id === get(activeCaseId)) ?? get(cases)[0]);
  let visibleTypographyMode = /* @__PURE__ */ user_derived(() => {
    var _a3, _b3, _c2;
    return ((_a3 = get(activeLab)) == null ? void 0 : _a3.kind) === "typography" ? ((_b3 = get(activeLab).cases.find((reviewCase) => reviewCase.mode === get(sizeMode))) == null ? void 0 : _b3.mode) ?? ((_c2 = get(activeLab).cases[0]) == null ? void 0 : _c2.mode) : void 0;
  });
  let visibleCases = /* @__PURE__ */ user_derived(() => get(cases).filter((reviewCase) => {
    var _a3, _b3;
    if (((_a3 = get(activeLab)) == null ? void 0 : _a3.kind) === "color" && reviewCase.kind === "color" && reviewCase.mode !== get(colorMode)) return false;
    if (((_b3 = get(activeLab)) == null ? void 0 : _b3.kind) === "typography" && reviewCase.kind === "typography" && reviewCase.mode !== get(visibleTypographyMode)) return false;
    return reviewCase.label.toLowerCase().includes(get(caseQuery).trim().toLowerCase());
  }));
  let baseValues = /* @__PURE__ */ user_derived(() => {
    const entries = [];
    for (const lab of $$props.contract.labs) {
      if (lab.kind !== "color" && lab.kind !== "typography" && lab.kind !== "shadows" && lab.kind !== "motion" && lab.kind !== "foundation") continue;
      for (const reviewCase of lab.cases) {
        for (const control of reviewCase.controls) entries.push([control.path, control.value]);
      }
    }
    return Object.fromEntries(entries);
  });
  let patch = /* @__PURE__ */ user_derived(() => patchFromDraft($$props.contract.systemFingerprint, get(baseValues), get(draft), $$props.contract.labs.flatMap((lab) => lab.kind === "overview" ? [] : lab.cases.filter((reviewCase) => reviewCase.controls.some((control) => get(draft)[control.path] !== void 0)).map((reviewCase) => reviewCase.id))));
  let modeGroups = /* @__PURE__ */ user_derived(() => $$props.contract.globals.modes);
  let colorGroup = /* @__PURE__ */ user_derived(() => get(modeGroups).find((entry) => entry.category === "color"));
  let sizeGroup = /* @__PURE__ */ user_derived(() => get(modeGroups).find((entry) => entry.category === "size"));
  let canvasStyle = /* @__PURE__ */ user_derived(() => canvasVariables(get(modeGroups), get(colorMode), get(sizeMode)));
  let activeCaseChanged = /* @__PURE__ */ user_derived(() => {
    var _a3;
    return Boolean((_a3 = get(activeCase)) == null ? void 0 : _a3.controls.some((control) => get(draft)[control.path] !== void 0));
  });
  user_effect(() => {
    localStorage.setItem(`tfs-workbench:${$$props.contract.systemFingerprint}`, JSON.stringify(get(draft)));
  });
  user_effect(() => {
    var _a3;
    const next = new URL(location.href);
    next.searchParams.set("lab", get(activeLabId));
    if ((_a3 = get(activeCase)) == null ? void 0 : _a3.id) next.searchParams.set("case", get(activeCase).id);
    else next.searchParams.delete("case");
    if (get(colorMode)) next.searchParams.set("color", get(colorMode));
    if (get(sizeMode)) next.searchParams.set("size", get(sizeMode));
    next.searchParams.set("view", get(viewMode));
    history.replaceState(null, "", next);
  });
  user_effect(() => {
    if (get(viewMode) === "compare" && !get(activeCaseChanged)) set(viewMode, "case");
  });
  user_effect(() => {
    var _a3, _b3;
    if (((_a3 = get(activeLab)) == null ? void 0 : _a3.kind) !== "color" || ((_b3 = get(activeCase)) == null ? void 0 : _b3.kind) !== "color") return;
    if (get(activeCase).mode === get(colorMode)) return;
    const replacement = get(activeLab).cases.find((reviewCase) => reviewCase.mode === get(colorMode) && reviewCase.color === get(activeCase).color) ?? get(activeLab).cases.find((reviewCase) => reviewCase.mode === get(colorMode));
    if (replacement) set(activeCaseId, replacement.id, true);
  });
  user_effect(() => {
    var _a3, _b3;
    if (((_a3 = get(activeLab)) == null ? void 0 : _a3.kind) !== "typography" || ((_b3 = get(activeCase)) == null ? void 0 : _b3.kind) !== "typography") return;
    if (get(activeCase).mode === get(visibleTypographyMode)) return;
    const replacement = get(activeLab).cases.find((reviewCase) => reviewCase.mode === get(visibleTypographyMode) && reviewCase.role === get(activeCase).role && reviewCase.variant === get(activeCase).variant) ?? get(activeLab).cases.find((reviewCase) => reviewCase.mode === get(visibleTypographyMode));
    if (replacement) set(activeCaseId, replacement.id, true);
  });
  function selectLab(lab) {
    var _a3;
    set(activeLabId, lab.id, true);
    set(caseQuery, "");
    set(viewMode, lab.kind === "overview" ? "case" : "matrix", true);
    set(activeCaseId, lab.kind === "color" || lab.kind === "typography" || lab.kind === "shadows" || lab.kind === "motion" || lab.kind === "foundation" ? ((_a3 = lab.cases[0]) == null ? void 0 : _a3.id) ?? "" : "", true);
    if (lab.kind === "color" && lab.cases[0]) set(colorMode, lab.cases[0].mode, true);
  }
  function selectCase(id) {
    set(activeCaseId, id, true);
    set(viewMode, "case");
    const selected = get(cases).find((reviewCase) => reviewCase.id === id);
    if ((selected == null ? void 0 : selected.kind) === "color") set(colorMode, selected.mode, true);
    if ((selected == null ? void 0 : selected.kind) === "typography") set(sizeMode, selected.mode, true);
  }
  function selectCaseFromLab(lab, id) {
    if (lab.kind === "overview") return;
    set(activeLabId, lab.id, true);
    set(activeCaseId, id, true);
    set(caseQuery, "");
    set(viewMode, "case");
    const selected = lab.cases.find((reviewCase) => reviewCase.id === id);
    if ((selected == null ? void 0 : selected.kind) === "color") set(colorMode, selected.mode, true);
    if ((selected == null ? void 0 : selected.kind) === "typography") set(sizeMode, selected.mode, true);
  }
  function visibleLabCases(lab) {
    var _a3, _b3;
    if (lab.kind === "overview") return [];
    if (lab.kind === "color") return lab.cases.filter((reviewCase) => reviewCase.mode === get(colorMode));
    if (lab.kind === "typography") {
      const mode = ((_a3 = lab.cases.find((reviewCase) => reviewCase.mode === get(sizeMode))) == null ? void 0 : _a3.mode) ?? ((_b3 = lab.cases[0]) == null ? void 0 : _b3.mode);
      return lab.cases.filter((reviewCase) => reviewCase.mode === mode);
    }
    return lab.cases;
  }
  function readableIdentifier(value) {
    return value.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  }
  function setControl(control, value) {
    const previous = get(draft)[control.path] ?? control.value;
    if (previous === value) return;
    set(
      undo,
      [
        ...get(undo),
        { changes: [{ path: control.path, previous, value }] }
      ],
      true
    );
    set(redo, [], true);
    set(draft, { ...get(draft), [control.path]: value }, true);
  }
  function applyDraftValue(path, value) {
    const next = { ...get(draft) };
    if (value === get(baseValues)[path]) delete next[path];
    else next[path] = value;
    set(draft, next, true);
  }
  function applyTransaction(transaction, direction) {
    const next = { ...get(draft) };
    for (const change of transaction.changes) {
      const value = direction === "undo" ? change.previous : change.value;
      if (value === get(baseValues)[change.path]) delete next[change.path];
      else next[change.path] = value;
    }
    set(draft, next, true);
  }
  function undoDraft() {
    const transaction = get(undo).at(-1);
    if (!transaction) return;
    set(undo, get(undo).slice(0, -1), true);
    set(redo, [...get(redo), transaction], true);
    applyTransaction(transaction, "undo");
  }
  function redoDraft() {
    const transaction = get(redo).at(-1);
    if (!transaction) return;
    set(redo, get(redo).slice(0, -1), true);
    set(undo, [...get(undo), transaction], true);
    applyTransaction(transaction, "redo");
  }
  function resetControl(control) {
    const previous = get(draft)[control.path];
    if (previous === void 0) return;
    set(
      undo,
      [
        ...get(undo),
        {
          changes: [{ path: control.path, previous, value: control.value }]
        }
      ],
      true
    );
    set(redo, [], true);
    applyDraftValue(control.path, control.value);
  }
  function resetCase() {
    if (!get(activeCase)) return;
    const changes = get(activeCase).controls.filter((control) => get(draft)[control.path] !== void 0).map((control) => ({
      path: control.path,
      previous: get(draft)[control.path],
      value: control.value
    }));
    if (changes.length === 0) return;
    set(undo, [...get(undo), { changes }], true);
    set(redo, [], true);
    const next = { ...get(draft) };
    for (const change of changes) delete next[change.path];
    set(draft, next, true);
  }
  function clearDraft() {
    const changes = Object.entries(get(draft)).map(([path, previous]) => ({ path, previous, value: get(baseValues)[path] ?? null }));
    if (changes.length === 0) return;
    set(undo, [...get(undo), { changes }], true);
    set(redo, [], true);
    set(draft, {}, true);
  }
  async function importPatch(event2) {
    var _a3;
    const input = event2.currentTarget;
    const file = (_a3 = input.files) == null ? void 0 : _a3[0];
    input.value = "";
    if (!file) return;
    try {
      if (file.size > 1e6) throw new Error("Review patch exceeds the 1 MB import limit");
      const imported = importReviewPatch(JSON.parse(await file.text()), $$props.contract.systemFingerprint, contractControls($$props.contract), new Set($$props.contract.labs.flatMap((lab) => lab.kind === "overview" ? [] : lab.cases.map((item) => item.id))));
      const changes = [
        .../* @__PURE__ */ new Set([...Object.keys(get(draft)), ...Object.keys(imported.draft)])
      ].map((path) => ({
        path,
        previous: get(draft)[path] ?? get(baseValues)[path] ?? null,
        value: imported.draft[path] ?? get(baseValues)[path] ?? null
      })).filter((change) => change.previous !== change.value);
      if (changes.length > 0) set(undo, [...get(undo), { changes }], true);
      set(redo, [], true);
      set(draft, imported.draft, true);
      const selectedCase = imported.patch.selectedCases[0];
      if (selectedCase) {
        const selectedLab = $$props.contract.labs.find((lab) => lab.kind !== "overview" && lab.cases.some((item) => item.id === selectedCase));
        if (selectedLab) selectCaseFromLab(selectedLab, selectedCase);
      }
      const importedCount = imported.patch.operations.length;
      set(handoffStatus, `Imported ${importedCount} reviewed edit${importedCount === 1 ? "" : "s"}`);
    } catch (error) {
      set(handoffStatus, error instanceof Error ? error.message : "Unable to import review patch", true);
    }
  }
  async function copyHandoff() {
    const handoff = agentHandoff(get(patch), $$props.contract.agent.verification.generate, $$props.contract.agent.verification.check);
    const prompt = `${handoff.instructions}

\`\`\`json
${JSON.stringify(handoff, null, 2)}
\`\`\``;
    try {
      await navigator.clipboard.writeText(prompt);
      set(handoffStatus, "Agent handoff copied");
    } catch {
      set(handoffStatus, "Clipboard unavailable; export the patch instead");
    }
  }
  var div = root_18();
  event("keydown", $window, (event2) => {
    if (!(event2.metaKey || event2.ctrlKey)) return;
    if (event2.key.toLowerCase() === "z" && event2.shiftKey) {
      event2.preventDefault();
      redoDraft();
    } else if (event2.key.toLowerCase() === "z") {
      event2.preventDefault();
      undoDraft();
    }
  });
  var header = child(div);
  var div_1 = child(header);
  var div_2 = sibling(child(div_1), 2);
  var strong = child(div_2);
  var text = child(strong);
  var small = sibling(strong, 2);
  var text_1 = child(small);
  var div_3 = sibling(div_1, 2);
  var node = child(div_3);
  {
    var consequent = ($$anchor2) => {
      var label_1 = root_1();
      var select = sibling(child(label_1), 2);
      each(select, 21, () => get(colorGroup).modes, index, ($$anchor3, mode) => {
        var option = root();
        var text_2 = child(option);
        var option_value = {};
        template_effect(() => {
          set_text(text_2, get(mode).name);
          if (option_value !== (option_value = get(mode).name)) {
            option.value = (option.__value = get(mode).name) ?? "";
          }
        });
        append($$anchor3, option);
      });
      bind_select_value(select, () => get(colorMode), ($$value) => set(colorMode, $$value));
      append($$anchor2, label_1);
    };
    if_block(node, ($$render) => {
      if (get(colorGroup)) $$render(consequent);
    });
  }
  var node_1 = sibling(node, 2);
  {
    var consequent_1 = ($$anchor2) => {
      var label_2 = root_2();
      var select_1 = sibling(child(label_2), 2);
      each(select_1, 21, () => get(sizeGroup).modes, index, ($$anchor3, mode) => {
        var option_1 = root();
        var text_3 = child(option_1);
        var option_1_value = {};
        template_effect(() => {
          set_text(text_3, get(mode).name);
          if (option_1_value !== (option_1_value = get(mode).name)) {
            option_1.value = (option_1.__value = get(mode).name) ?? "";
          }
        });
        append($$anchor3, option_1);
      });
      bind_select_value(select_1, () => get(sizeMode), ($$value) => set(sizeMode, $$value));
      append($$anchor2, label_2);
    };
    if_block(node_1, ($$render) => {
      if (get(sizeGroup)) $$render(consequent_1);
    });
  }
  var div_4 = sibling(div_3, 2);
  var button = child(div_4);
  var button_1 = sibling(button, 2);
  var span = sibling(button_1, 2);
  let classes;
  var text_4 = child(span);
  var input_1 = sibling(span, 2);
  bind_this(input_1, ($$value) => set(patchInput, $$value), () => get(patchInput));
  var button_2 = sibling(input_1, 2);
  var button_3 = sibling(button_2, 2);
  var button_4 = sibling(button_3, 2);
  var node_2 = sibling(button_4, 2);
  {
    var consequent_2 = ($$anchor2) => {
      var span_1 = root_3();
      var text_5 = child(span_1);
      template_effect(() => set_text(text_5, get(handoffStatus)));
      append($$anchor2, span_1);
    };
    if_block(node_2, ($$render) => {
      if (get(handoffStatus)) $$render(consequent_2);
    });
  }
  var aside = sibling(header, 2);
  var nav = child(aside);
  each(nav, 21, () => $$props.contract.labs, index, ($$anchor2, lab) => {
    var button_5 = root_5();
    let classes_1;
    var span_2 = child(button_5);
    var text_6 = child(span_2);
    var node_3 = sibling(span_2, 2);
    {
      var consequent_3 = ($$anchor3) => {
        var small_1 = root_4();
        var text_7 = child(small_1);
        template_effect(() => set_text(text_7, get(lab).cases.length));
        append($$anchor3, small_1);
      };
      if_block(node_3, ($$render) => {
        if (get(lab).kind === "color" || get(lab).kind === "typography" || get(lab).kind === "shadows" || get(lab).kind === "motion" || get(lab).kind === "foundation") $$render(consequent_3);
      });
    }
    template_effect(() => {
      classes_1 = set_class(button_5, 1, "", null, classes_1, { active: get(lab).id === get(activeLabId) });
      set_text(text_6, get(lab).label);
    });
    delegated("click", button_5, () => selectLab(get(lab)));
    append($$anchor2, button_5);
  });
  var node_4 = sibling(nav, 2);
  {
    var consequent_6 = ($$anchor2) => {
      var div_5 = root_9();
      var node_5 = child(div_5);
      {
        var consequent_4 = ($$anchor3) => {
          var label_3 = root_6();
          var span_3 = child(label_3);
          var text_8 = child(span_3);
          var input_2 = sibling(span_3, 2);
          template_effect(() => {
            var _a3, _b3;
            set_text(text_8, `Filter ${((_a3 = get(activeLab)) == null ? void 0 : _a3.label) ?? ""} cases`);
            set_attribute(input_2, "aria-label", `Filter ${(_b3 = get(activeLab)) == null ? void 0 : _b3.label} cases`);
          });
          bind_value(input_2, () => get(caseQuery), ($$value) => set(caseQuery, $$value));
          append($$anchor3, label_3);
        };
        if_block(node_5, ($$render) => {
          if (get(cases).length > 10) $$render(consequent_4);
        });
      }
      var node_6 = sibling(node_5, 2);
      each(node_6, 17, () => get(visibleCases), index, ($$anchor3, reviewCase) => {
        var button_6 = root_7();
        let classes_2;
        var text_9 = child(button_6);
        template_effect(() => {
          var _a3;
          set_attribute(button_6, "title", get(reviewCase).label);
          classes_2 = set_class(button_6, 1, "", null, classes_2, {
            active: get(viewMode) !== "matrix" && get(reviewCase).id === ((_a3 = get(activeCase)) == null ? void 0 : _a3.id)
          });
          set_text(text_9, get(reviewCase).label);
        });
        delegated("click", button_6, () => selectCase(get(reviewCase).id));
        append($$anchor3, button_6);
      });
      var node_7 = sibling(node_6, 2);
      {
        var consequent_5 = ($$anchor3) => {
          var p = root_8();
          append($$anchor3, p);
        };
        if_block(node_7, ($$render) => {
          if (get(visibleCases).length === 0) $$render(consequent_5);
        });
      }
      append($$anchor2, div_5);
    };
    if_block(node_4, ($$render) => {
      if (get(cases).length > 0) $$render(consequent_6);
    });
  }
  var main = sibling(aside, 2);
  var div_6 = child(main);
  var div_7 = child(div_6);
  var span_4 = child(div_7);
  var text_10 = child(span_4);
  var strong_1 = sibling(span_4, 2);
  var text_11 = child(strong_1);
  var node_8 = sibling(div_7, 2);
  {
    var consequent_7 = ($$anchor2) => {
      var div_8 = root_10();
      var button_7 = child(div_8);
      let classes_3;
      var button_8 = sibling(button_7, 2);
      let classes_4;
      var button_9 = sibling(button_8, 2);
      let classes_5;
      template_effect(() => {
        classes_3 = set_class(button_7, 1, "", null, classes_3, { active: get(viewMode) === "matrix" });
        classes_4 = set_class(button_8, 1, "", null, classes_4, { active: get(viewMode) === "case" });
        button_9.disabled = !get(activeCaseChanged);
        classes_5 = set_class(button_9, 1, "", null, classes_5, { active: get(viewMode) === "compare" });
      });
      delegated("click", button_7, () => set(viewMode, "matrix"));
      delegated("click", button_8, () => set(viewMode, "case"));
      delegated("click", button_9, () => set(viewMode, "compare"));
      append($$anchor2, div_8);
    };
    if_block(node_8, ($$render) => {
      var _a3;
      if (((_a3 = get(activeLab)) == null ? void 0 : _a3.kind) !== "overview") $$render(consequent_7);
    });
  }
  var node_9 = sibling(node_8, 2);
  {
    var consequent_8 = ($$anchor2) => {
      var code = root_11();
      var text_12 = child(code);
      template_effect(() => set_text(text_12, get(activeCase).sourcePath));
      append($$anchor2, code);
    };
    if_block(node_9, ($$render) => {
      if (get(activeCase) && get(viewMode) !== "matrix") $$render(consequent_8);
    });
  }
  var section = sibling(div_6, 2);
  let classes_6;
  var node_10 = child(section);
  {
    var consequent_9 = ($$anchor2) => {
      CaseMatrix($$anchor2, {
        get cases() {
          return get(visibleCases);
        },
        get draft() {
          return get(draft);
        },
        onselect: selectCase
      });
    };
    var consequent_10 = ($$anchor2) => {
      var div_9 = root_12();
      var section_1 = child(div_9);
      var div_10 = sibling(child(section_1), 2);
      var node_11 = child(div_10);
      CaseView(node_11, {
        get reviewCase() {
          return get(activeCase);
        },
        draft: {}
      });
      var section_2 = sibling(section_1, 2);
      var div_11 = sibling(child(section_2), 2);
      var node_12 = child(div_11);
      CaseView(node_12, {
        get reviewCase() {
          return get(activeCase);
        },
        get draft() {
          return get(draft);
        }
      });
      append($$anchor2, div_9);
    };
    var consequent_13 = ($$anchor2) => {
      var div_12 = root_17();
      var div_13 = child(div_12);
      each(div_13, 21, () => Object.entries(get(activeLab).summary), index, ($$anchor3, $$item) => {
        var $$array = /* @__PURE__ */ user_derived(() => to_array(get($$item), 2));
        let label = () => get($$array)[0];
        let value = () => get($$array)[1];
        var article = root_13();
        var span_5 = child(article);
        var text_13 = child(span_5);
        var strong_2 = sibling(span_5);
        var text_14 = child(strong_2);
        template_effect(
          ($0) => {
            set_text(text_13, $0);
            set_text(text_14, value());
          },
          [() => readableIdentifier(label())]
        );
        append($$anchor3, article);
      });
      var node_13 = sibling(div_13, 2);
      {
        var consequent_12 = ($$anchor3) => {
          var section_3 = root_15();
          var header_1 = child(section_3);
          var small_2 = sibling(child(header_1), 2);
          var text_15 = child(small_2);
          var ul = sibling(header_1, 2);
          each(ul, 21, () => $$props.contract.diagnostics, index, ($$anchor4, diagnostic) => {
            var li = root_14();
            var span_6 = child(li);
            var text_16 = child(span_6);
            var div_14 = sibling(span_6, 2);
            var strong_3 = child(div_14);
            var text_17 = child(strong_3);
            var node_14 = sibling(strong_3, 2);
            {
              var consequent_11 = ($$anchor5) => {
                var code_1 = root_11();
                var text_18 = child(code_1);
                template_effect(() => set_text(text_18, get(diagnostic).path));
                append($$anchor5, code_1);
              };
              if_block(node_14, ($$render) => {
                if (get(diagnostic).path) $$render(consequent_11);
              });
            }
            template_effect(() => {
              set_attribute(li, "data-severity", get(diagnostic).severity);
              set_text(text_16, get(diagnostic).severity);
              set_text(text_17, get(diagnostic).message);
            });
            append($$anchor4, li);
          });
          template_effect(() => set_text(text_15, $$props.contract.diagnostics.length));
          append($$anchor3, section_3);
        };
        if_block(node_13, ($$render) => {
          if ($$props.contract.diagnostics.length > 0) $$render(consequent_12);
        });
      }
      var node_15 = sibling(node_13, 2);
      each(node_15, 17, () => $$props.contract.labs.filter((lab) => lab.kind !== "overview"), index, ($$anchor3, lab) => {
        var section_4 = root_16();
        var header_2 = child(section_4);
        var div_15 = child(header_2);
        var strong_4 = sibling(child(div_15), 2);
        var text_19 = child(strong_4);
        var button_10 = sibling(div_15, 2);
        var text_20 = child(button_10);
        var node_16 = sibling(header_2, 2);
        {
          let $0 = /* @__PURE__ */ user_derived(() => visibleLabCases(get(lab)));
          CaseMatrix(node_16, {
            get cases() {
              return get($0);
            },
            get draft() {
              return get(draft);
            },
            compact: true,
            onselect: (id) => selectCaseFromLab(get(lab), id)
          });
        }
        template_effect(
          ($0) => {
            set_text(text_19, get(lab).label);
            set_text(text_20, `inspect all ${$0 ?? ""}`);
          },
          [() => visibleLabCases(get(lab)).length]
        );
        delegated("click", button_10, () => selectLab(get(lab)));
        append($$anchor3, section_4);
      });
      append($$anchor2, div_12);
    };
    var alternate = ($$anchor2) => {
      CaseView($$anchor2, {
        get reviewCase() {
          return get(activeCase);
        },
        get draft() {
          return get(draft);
        }
      });
    };
    if_block(node_10, ($$render) => {
      var _a3, _b3;
      if (get(viewMode) === "matrix" && ((_a3 = get(activeLab)) == null ? void 0 : _a3.kind) !== "overview") $$render(consequent_9);
      else if (get(viewMode) === "compare" && get(activeCase)) $$render(consequent_10, 1);
      else if (((_b3 = get(activeLab)) == null ? void 0 : _b3.kind) === "overview") $$render(consequent_13, 2);
      else $$render(alternate, -1);
    });
  }
  var node_17 = sibling(main, 2);
  {
    let $0 = /* @__PURE__ */ user_derived(() => {
      var _a3;
      return get(viewMode) === "matrix" && ((_a3 = get(activeLab)) == null ? void 0 : _a3.kind) !== "overview";
    });
    let $1 = /* @__PURE__ */ user_derived(() => {
      var _a3;
      return (_a3 = get(activeLab)) == null ? void 0 : _a3.label;
    });
    Inspector(node_17, {
      get activeCase() {
        return get(activeCase);
      },
      get matrix() {
        return get($0);
      },
      get labLabel() {
        return get($1);
      },
      get visibleCaseCount() {
        return get(visibleCases).length;
      },
      get draft() {
        return get(draft);
      },
      get editCount() {
        return get(patch).operations.length;
      },
      setControl,
      resetControl,
      resetCase,
      clearDraft
    });
  }
  template_effect(
    ($0) => {
      var _a3, _b3, _c2, _d, _e;
      set_text(text, $$props.contract.title);
      set_text(text_1, $0);
      button.disabled = get(undo).length === 0;
      button_1.disabled = get(redo).length === 0;
      classes = set_class(span, 1, "", null, classes, { dirty: get(patch).operations.length > 0 });
      set_text(text_4, `${get(patch).operations.length ?? ""} edits`);
      button_3.disabled = get(patch).operations.length === 0;
      button_4.disabled = get(patch).operations.length === 0;
      set_text(text_10, (_a3 = get(activeLab)) == null ? void 0 : _a3.label);
      set_text(text_11, get(viewMode) === "matrix" && ((_b3 = get(activeLab)) == null ? void 0 : _b3.kind) !== "overview" ? `${get(visibleCases).length} cases` : ((_c2 = get(activeCase)) == null ? void 0 : _c2.label) ?? "system overview");
      classes_6 = set_class(section, 1, "canvas", null, classes_6, {
        "matrix-view": get(viewMode) === "matrix" && ((_d = get(activeLab)) == null ? void 0 : _d.kind) !== "overview",
        "overview-view": ((_e = get(activeLab)) == null ? void 0 : _e.kind) === "overview",
        "compare-view": get(viewMode) === "compare"
      });
      set_style(section, get(canvasStyle));
    },
    [() => $$props.contract.systemFingerprint.slice(0, 10)]
  );
  delegated("click", button, undoDraft);
  delegated("click", button_1, redoDraft);
  delegated("change", input_1, importPatch);
  delegated("click", button_2, () => {
    var _a3;
    return (_a3 = get(patchInput)) == null ? void 0 : _a3.click();
  });
  delegated("click", button_3, () => downloadJson("tfs.review.patch.json", get(patch)));
  delegated("click", button_4, copyHandoff);
  append($$anchor, div);
  pop();
}
delegate(["click", "change"]);
async function loadContract() {
  const response = await fetch("./workbench.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to load workbench contract (${response.status})`);
  }
  const value = await response.json();
  if (!value || typeof value !== "object" || value.kind !== "three-forma-styli/workbench" || value.schemaVersion !== 2) {
    throw new Error("Unsupported TFS workbench contract");
  }
  return value;
}
const target = document.querySelector("#tfs-workbench");
if (!target) throw new Error("TFS workbench mount point is missing");
function loadStylesheet(href) {
  return new Promise((resolve, reject) => {
    const link2 = document.createElement("link");
    link2.rel = "stylesheet";
    link2.href = href;
    link2.dataset.tfsReviewAsset = "";
    link2.addEventListener("load", () => resolve(), { once: true });
    link2.addEventListener("error", () => reject(new Error(`Unable to load stylesheet: ${href}`)), {
      once: true
    });
    document.head.append(link2);
  });
}
async function start() {
  try {
    const contract = await loadContract();
    await Promise.all(contract.assets.stylesheets.map(loadStylesheet));
    document.title = contract.title;
    mount(App, { target, props: { contract } });
    await document.fonts.ready;
    document.documentElement.dataset.tfsWorkbenchReady = "true";
  } catch (error) {
    target.innerHTML = `<main class="fatal"><strong>Workbench unavailable</strong><pre></pre></main>`;
    const pre = target.querySelector("pre");
    if (pre) pre.textContent = error instanceof Error ? error.message : String(error);
    throw error;
  }
}
void start();
