function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var jsxRuntime = { exports: {} };
var reactJsxRuntime_production = {};
/**
 * @license React
 * react-jsx-runtime.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var hasRequiredReactJsxRuntime_production;
function requireReactJsxRuntime_production() {
  if (hasRequiredReactJsxRuntime_production) return reactJsxRuntime_production;
  hasRequiredReactJsxRuntime_production = 1;
  var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
  function jsxProd(type, config, maybeKey) {
    var key = null;
    void 0 !== maybeKey && (key = "" + maybeKey);
    void 0 !== config.key && (key = "" + config.key);
    if ("key" in config) {
      maybeKey = {};
      for (var propName in config)
        "key" !== propName && (maybeKey[propName] = config[propName]);
    } else maybeKey = config;
    config = maybeKey.ref;
    return {
      $$typeof: REACT_ELEMENT_TYPE,
      type,
      key,
      ref: void 0 !== config ? config : null,
      props: maybeKey
    };
  }
  reactJsxRuntime_production.Fragment = REACT_FRAGMENT_TYPE;
  reactJsxRuntime_production.jsx = jsxProd;
  reactJsxRuntime_production.jsxs = jsxProd;
  return reactJsxRuntime_production;
}
var hasRequiredJsxRuntime;
function requireJsxRuntime() {
  if (hasRequiredJsxRuntime) return jsxRuntime.exports;
  hasRequiredJsxRuntime = 1;
  {
    jsxRuntime.exports = requireReactJsxRuntime_production();
  }
  return jsxRuntime.exports;
}
var jsxRuntimeExports = requireJsxRuntime();
var react = { exports: {} };
var react_production = {};
/**
 * @license React
 * react.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var hasRequiredReact_production;
function requireReact_production() {
  if (hasRequiredReact_production) return react_production;
  hasRequiredReact_production = 1;
  var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
  function getIteratorFn(maybeIterable) {
    if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
    maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
    return "function" === typeof maybeIterable ? maybeIterable : null;
  }
  var ReactNoopUpdateQueue = {
    isMounted: function() {
      return false;
    },
    enqueueForceUpdate: function() {
    },
    enqueueReplaceState: function() {
    },
    enqueueSetState: function() {
    }
  }, assign = Object.assign, emptyObject = {};
  function Component(props, context, updater) {
    this.props = props;
    this.context = context;
    this.refs = emptyObject;
    this.updater = updater || ReactNoopUpdateQueue;
  }
  Component.prototype.isReactComponent = {};
  Component.prototype.setState = function(partialState, callback) {
    if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState)
      throw Error(
        "takes an object of state variables to update or a function which returns an object of state variables."
      );
    this.updater.enqueueSetState(this, partialState, callback, "setState");
  };
  Component.prototype.forceUpdate = function(callback) {
    this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
  };
  function ComponentDummy() {
  }
  ComponentDummy.prototype = Component.prototype;
  function PureComponent(props, context, updater) {
    this.props = props;
    this.context = context;
    this.refs = emptyObject;
    this.updater = updater || ReactNoopUpdateQueue;
  }
  var pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
  pureComponentPrototype.constructor = PureComponent;
  assign(pureComponentPrototype, Component.prototype);
  pureComponentPrototype.isPureReactComponent = true;
  var isArrayImpl = Array.isArray;
  function noop() {
  }
  var ReactSharedInternals = { H: null, A: null, T: null, S: null }, hasOwnProperty = Object.prototype.hasOwnProperty;
  function ReactElement(type, key, props) {
    var refProp = props.ref;
    return {
      $$typeof: REACT_ELEMENT_TYPE,
      type,
      key,
      ref: void 0 !== refProp ? refProp : null,
      props
    };
  }
  function cloneAndReplaceKey(oldElement, newKey) {
    return ReactElement(oldElement.type, newKey, oldElement.props);
  }
  function isValidElement(object) {
    return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
  }
  function escape(key) {
    var escaperLookup = { "=": "=0", ":": "=2" };
    return "$" + key.replace(/[=:]/g, function(match) {
      return escaperLookup[match];
    });
  }
  var userProvidedKeyEscapeRegex = /\/+/g;
  function getElementKey(element, index) {
    return "object" === typeof element && null !== element && null != element.key ? escape("" + element.key) : index.toString(36);
  }
  function resolveThenable(thenable) {
    switch (thenable.status) {
      case "fulfilled":
        return thenable.value;
      case "rejected":
        throw thenable.reason;
      default:
        switch ("string" === typeof thenable.status ? thenable.then(noop, noop) : (thenable.status = "pending", thenable.then(
          function(fulfilledValue) {
            "pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
          },
          function(error) {
            "pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
          }
        )), thenable.status) {
          case "fulfilled":
            return thenable.value;
          case "rejected":
            throw thenable.reason;
        }
    }
    throw thenable;
  }
  function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
    var type = typeof children;
    if ("undefined" === type || "boolean" === type) children = null;
    var invokeCallback = false;
    if (null === children) invokeCallback = true;
    else
      switch (type) {
        case "bigint":
        case "string":
        case "number":
          invokeCallback = true;
          break;
        case "object":
          switch (children.$$typeof) {
            case REACT_ELEMENT_TYPE:
            case REACT_PORTAL_TYPE:
              invokeCallback = true;
              break;
            case REACT_LAZY_TYPE:
              return invokeCallback = children._init, mapIntoArray(
                invokeCallback(children._payload),
                array,
                escapedPrefix,
                nameSoFar,
                callback
              );
          }
      }
    if (invokeCallback)
      return callback = callback(children), invokeCallback = "" === nameSoFar ? "." + getElementKey(children, 0) : nameSoFar, isArrayImpl(callback) ? (escapedPrefix = "", null != invokeCallback && (escapedPrefix = invokeCallback.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
        return c;
      })) : null != callback && (isValidElement(callback) && (callback = cloneAndReplaceKey(
        callback,
        escapedPrefix + (null == callback.key || children && children.key === callback.key ? "" : ("" + callback.key).replace(
          userProvidedKeyEscapeRegex,
          "$&/"
        ) + "/") + invokeCallback
      )), array.push(callback)), 1;
    invokeCallback = 0;
    var nextNamePrefix = "" === nameSoFar ? "." : nameSoFar + ":";
    if (isArrayImpl(children))
      for (var i = 0; i < children.length; i++)
        nameSoFar = children[i], type = nextNamePrefix + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(
          nameSoFar,
          array,
          escapedPrefix,
          type,
          callback
        );
    else if (i = getIteratorFn(children), "function" === typeof i)
      for (children = i.call(children), i = 0; !(nameSoFar = children.next()).done; )
        nameSoFar = nameSoFar.value, type = nextNamePrefix + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(
          nameSoFar,
          array,
          escapedPrefix,
          type,
          callback
        );
    else if ("object" === type) {
      if ("function" === typeof children.then)
        return mapIntoArray(
          resolveThenable(children),
          array,
          escapedPrefix,
          nameSoFar,
          callback
        );
      array = String(children);
      throw Error(
        "Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead."
      );
    }
    return invokeCallback;
  }
  function mapChildren(children, func, context) {
    if (null == children) return children;
    var result = [], count = 0;
    mapIntoArray(children, result, "", "", function(child) {
      return func.call(context, child, count++);
    });
    return result;
  }
  function lazyInitializer(payload) {
    if (-1 === payload._status) {
      var ctor = payload._result;
      ctor = ctor();
      ctor.then(
        function(moduleObject) {
          if (0 === payload._status || -1 === payload._status)
            payload._status = 1, payload._result = moduleObject;
        },
        function(error) {
          if (0 === payload._status || -1 === payload._status)
            payload._status = 2, payload._result = error;
        }
      );
      -1 === payload._status && (payload._status = 0, payload._result = ctor);
    }
    if (1 === payload._status) return payload._result.default;
    throw payload._result;
  }
  var reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
    if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
      var event = new window.ErrorEvent("error", {
        bubbles: true,
        cancelable: true,
        message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
        error
      });
      if (!window.dispatchEvent(event)) return;
    } else if ("object" === typeof process && "function" === typeof process.emit) {
      process.emit("uncaughtException", error);
      return;
    }
    console.error(error);
  }, Children = {
    map: mapChildren,
    forEach: function(children, forEachFunc, forEachContext) {
      mapChildren(
        children,
        function() {
          forEachFunc.apply(this, arguments);
        },
        forEachContext
      );
    },
    count: function(children) {
      var n = 0;
      mapChildren(children, function() {
        n++;
      });
      return n;
    },
    toArray: function(children) {
      return mapChildren(children, function(child) {
        return child;
      }) || [];
    },
    only: function(children) {
      if (!isValidElement(children))
        throw Error(
          "React.Children.only expected to receive a single React element child."
        );
      return children;
    }
  };
  react_production.Activity = REACT_ACTIVITY_TYPE;
  react_production.Children = Children;
  react_production.Component = Component;
  react_production.Fragment = REACT_FRAGMENT_TYPE;
  react_production.Profiler = REACT_PROFILER_TYPE;
  react_production.PureComponent = PureComponent;
  react_production.StrictMode = REACT_STRICT_MODE_TYPE;
  react_production.Suspense = REACT_SUSPENSE_TYPE;
  react_production.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
  react_production.__COMPILER_RUNTIME = {
    __proto__: null,
    c: function(size) {
      return ReactSharedInternals.H.useMemoCache(size);
    }
  };
  react_production.cache = function(fn) {
    return function() {
      return fn.apply(null, arguments);
    };
  };
  react_production.cacheSignal = function() {
    return null;
  };
  react_production.cloneElement = function(element, config, children) {
    if (null === element || void 0 === element)
      throw Error(
        "The argument must be a React element, but you passed " + element + "."
      );
    var props = assign({}, element.props), key = element.key;
    if (null != config)
      for (propName in void 0 !== config.key && (key = "" + config.key), config)
        !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
    var propName = arguments.length - 2;
    if (1 === propName) props.children = children;
    else if (1 < propName) {
      for (var childArray = Array(propName), i = 0; i < propName; i++)
        childArray[i] = arguments[i + 2];
      props.children = childArray;
    }
    return ReactElement(element.type, key, props);
  };
  react_production.createContext = function(defaultValue) {
    defaultValue = {
      $$typeof: REACT_CONTEXT_TYPE,
      _currentValue: defaultValue,
      _currentValue2: defaultValue,
      _threadCount: 0,
      Provider: null,
      Consumer: null
    };
    defaultValue.Provider = defaultValue;
    defaultValue.Consumer = {
      $$typeof: REACT_CONSUMER_TYPE,
      _context: defaultValue
    };
    return defaultValue;
  };
  react_production.createElement = function(type, config, children) {
    var propName, props = {}, key = null;
    if (null != config)
      for (propName in void 0 !== config.key && (key = "" + config.key), config)
        hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (props[propName] = config[propName]);
    var childrenLength = arguments.length - 2;
    if (1 === childrenLength) props.children = children;
    else if (1 < childrenLength) {
      for (var childArray = Array(childrenLength), i = 0; i < childrenLength; i++)
        childArray[i] = arguments[i + 2];
      props.children = childArray;
    }
    if (type && type.defaultProps)
      for (propName in childrenLength = type.defaultProps, childrenLength)
        void 0 === props[propName] && (props[propName] = childrenLength[propName]);
    return ReactElement(type, key, props);
  };
  react_production.createRef = function() {
    return { current: null };
  };
  react_production.forwardRef = function(render) {
    return { $$typeof: REACT_FORWARD_REF_TYPE, render };
  };
  react_production.isValidElement = isValidElement;
  react_production.lazy = function(ctor) {
    return {
      $$typeof: REACT_LAZY_TYPE,
      _payload: { _status: -1, _result: ctor },
      _init: lazyInitializer
    };
  };
  react_production.memo = function(type, compare) {
    return {
      $$typeof: REACT_MEMO_TYPE,
      type,
      compare: void 0 === compare ? null : compare
    };
  };
  react_production.startTransition = function(scope) {
    var prevTransition = ReactSharedInternals.T, currentTransition = {};
    ReactSharedInternals.T = currentTransition;
    try {
      var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
      null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
      "object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && returnValue.then(noop, reportGlobalError);
    } catch (error) {
      reportGlobalError(error);
    } finally {
      null !== prevTransition && null !== currentTransition.types && (prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
    }
  };
  react_production.unstable_useCacheRefresh = function() {
    return ReactSharedInternals.H.useCacheRefresh();
  };
  react_production.use = function(usable) {
    return ReactSharedInternals.H.use(usable);
  };
  react_production.useActionState = function(action, initialState, permalink) {
    return ReactSharedInternals.H.useActionState(action, initialState, permalink);
  };
  react_production.useCallback = function(callback, deps) {
    return ReactSharedInternals.H.useCallback(callback, deps);
  };
  react_production.useContext = function(Context) {
    return ReactSharedInternals.H.useContext(Context);
  };
  react_production.useDebugValue = function() {
  };
  react_production.useDeferredValue = function(value, initialValue) {
    return ReactSharedInternals.H.useDeferredValue(value, initialValue);
  };
  react_production.useEffect = function(create, deps) {
    return ReactSharedInternals.H.useEffect(create, deps);
  };
  react_production.useEffectEvent = function(callback) {
    return ReactSharedInternals.H.useEffectEvent(callback);
  };
  react_production.useId = function() {
    return ReactSharedInternals.H.useId();
  };
  react_production.useImperativeHandle = function(ref, create, deps) {
    return ReactSharedInternals.H.useImperativeHandle(ref, create, deps);
  };
  react_production.useInsertionEffect = function(create, deps) {
    return ReactSharedInternals.H.useInsertionEffect(create, deps);
  };
  react_production.useLayoutEffect = function(create, deps) {
    return ReactSharedInternals.H.useLayoutEffect(create, deps);
  };
  react_production.useMemo = function(create, deps) {
    return ReactSharedInternals.H.useMemo(create, deps);
  };
  react_production.useOptimistic = function(passthrough, reducer) {
    return ReactSharedInternals.H.useOptimistic(passthrough, reducer);
  };
  react_production.useReducer = function(reducer, initialArg, init) {
    return ReactSharedInternals.H.useReducer(reducer, initialArg, init);
  };
  react_production.useRef = function(initialValue) {
    return ReactSharedInternals.H.useRef(initialValue);
  };
  react_production.useState = function(initialState) {
    return ReactSharedInternals.H.useState(initialState);
  };
  react_production.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
    return ReactSharedInternals.H.useSyncExternalStore(
      subscribe,
      getSnapshot,
      getServerSnapshot
    );
  };
  react_production.useTransition = function() {
    return ReactSharedInternals.H.useTransition();
  };
  react_production.version = "19.2.5";
  return react_production;
}
var hasRequiredReact;
function requireReact() {
  if (hasRequiredReact) return react.exports;
  hasRequiredReact = 1;
  {
    react.exports = requireReact_production();
  }
  return react.exports;
}
var reactExports = requireReact();
const React = /* @__PURE__ */ getDefaultExportFromCjs(reactExports);
var client = { exports: {} };
var reactDomClient_production = {};
var scheduler = { exports: {} };
var scheduler_production = {};
/**
 * @license React
 * scheduler.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var hasRequiredScheduler_production;
function requireScheduler_production() {
  if (hasRequiredScheduler_production) return scheduler_production;
  hasRequiredScheduler_production = 1;
  (function(exports$1) {
    function push(heap, node) {
      var index = heap.length;
      heap.push(node);
      a: for (; 0 < index; ) {
        var parentIndex = index - 1 >>> 1, parent = heap[parentIndex];
        if (0 < compare(parent, node))
          heap[parentIndex] = node, heap[index] = parent, index = parentIndex;
        else break a;
      }
    }
    function peek(heap) {
      return 0 === heap.length ? null : heap[0];
    }
    function pop(heap) {
      if (0 === heap.length) return null;
      var first = heap[0], last = heap.pop();
      if (last !== first) {
        heap[0] = last;
        a: for (var index = 0, length = heap.length, halfLength = length >>> 1; index < halfLength; ) {
          var leftIndex = 2 * (index + 1) - 1, left = heap[leftIndex], rightIndex = leftIndex + 1, right = heap[rightIndex];
          if (0 > compare(left, last))
            rightIndex < length && 0 > compare(right, left) ? (heap[index] = right, heap[rightIndex] = last, index = rightIndex) : (heap[index] = left, heap[leftIndex] = last, index = leftIndex);
          else if (rightIndex < length && 0 > compare(right, last))
            heap[index] = right, heap[rightIndex] = last, index = rightIndex;
          else break a;
        }
      }
      return first;
    }
    function compare(a, b) {
      var diff = a.sortIndex - b.sortIndex;
      return 0 !== diff ? diff : a.id - b.id;
    }
    exports$1.unstable_now = void 0;
    if ("object" === typeof performance && "function" === typeof performance.now) {
      var localPerformance = performance;
      exports$1.unstable_now = function() {
        return localPerformance.now();
      };
    } else {
      var localDate = Date, initialTime = localDate.now();
      exports$1.unstable_now = function() {
        return localDate.now() - initialTime;
      };
    }
    var taskQueue = [], timerQueue = [], taskIdCounter = 1, currentTask = null, currentPriorityLevel = 3, isPerformingWork = false, isHostCallbackScheduled = false, isHostTimeoutScheduled = false, needsPaint = false, localSetTimeout = "function" === typeof setTimeout ? setTimeout : null, localClearTimeout = "function" === typeof clearTimeout ? clearTimeout : null, localSetImmediate = "undefined" !== typeof setImmediate ? setImmediate : null;
    function advanceTimers(currentTime2) {
      for (var timer = peek(timerQueue); null !== timer; ) {
        if (null === timer.callback) pop(timerQueue);
        else if (timer.startTime <= currentTime2)
          pop(timerQueue), timer.sortIndex = timer.expirationTime, push(taskQueue, timer);
        else break;
        timer = peek(timerQueue);
      }
    }
    function handleTimeout(currentTime2) {
      isHostTimeoutScheduled = false;
      advanceTimers(currentTime2);
      if (!isHostCallbackScheduled)
        if (null !== peek(taskQueue))
          isHostCallbackScheduled = true, isMessageLoopRunning || (isMessageLoopRunning = true, schedulePerformWorkUntilDeadline());
        else {
          var firstTimer = peek(timerQueue);
          null !== firstTimer && requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime2);
        }
    }
    var isMessageLoopRunning = false, taskTimeoutID = -1, frameInterval = 5, startTime = -1;
    function shouldYieldToHost() {
      return needsPaint ? true : exports$1.unstable_now() - startTime < frameInterval ? false : true;
    }
    function performWorkUntilDeadline() {
      needsPaint = false;
      if (isMessageLoopRunning) {
        var currentTime2 = exports$1.unstable_now();
        startTime = currentTime2;
        var hasMoreWork = true;
        try {
          a: {
            isHostCallbackScheduled = false;
            isHostTimeoutScheduled && (isHostTimeoutScheduled = false, localClearTimeout(taskTimeoutID), taskTimeoutID = -1);
            isPerformingWork = true;
            var previousPriorityLevel = currentPriorityLevel;
            try {
              b: {
                advanceTimers(currentTime2);
                for (currentTask = peek(taskQueue); null !== currentTask && !(currentTask.expirationTime > currentTime2 && shouldYieldToHost()); ) {
                  var callback = currentTask.callback;
                  if ("function" === typeof callback) {
                    currentTask.callback = null;
                    currentPriorityLevel = currentTask.priorityLevel;
                    var continuationCallback = callback(
                      currentTask.expirationTime <= currentTime2
                    );
                    currentTime2 = exports$1.unstable_now();
                    if ("function" === typeof continuationCallback) {
                      currentTask.callback = continuationCallback;
                      advanceTimers(currentTime2);
                      hasMoreWork = true;
                      break b;
                    }
                    currentTask === peek(taskQueue) && pop(taskQueue);
                    advanceTimers(currentTime2);
                  } else pop(taskQueue);
                  currentTask = peek(taskQueue);
                }
                if (null !== currentTask) hasMoreWork = true;
                else {
                  var firstTimer = peek(timerQueue);
                  null !== firstTimer && requestHostTimeout(
                    handleTimeout,
                    firstTimer.startTime - currentTime2
                  );
                  hasMoreWork = false;
                }
              }
              break a;
            } finally {
              currentTask = null, currentPriorityLevel = previousPriorityLevel, isPerformingWork = false;
            }
            hasMoreWork = void 0;
          }
        } finally {
          hasMoreWork ? schedulePerformWorkUntilDeadline() : isMessageLoopRunning = false;
        }
      }
    }
    var schedulePerformWorkUntilDeadline;
    if ("function" === typeof localSetImmediate)
      schedulePerformWorkUntilDeadline = function() {
        localSetImmediate(performWorkUntilDeadline);
      };
    else if ("undefined" !== typeof MessageChannel) {
      var channel = new MessageChannel(), port = channel.port2;
      channel.port1.onmessage = performWorkUntilDeadline;
      schedulePerformWorkUntilDeadline = function() {
        port.postMessage(null);
      };
    } else
      schedulePerformWorkUntilDeadline = function() {
        localSetTimeout(performWorkUntilDeadline, 0);
      };
    function requestHostTimeout(callback, ms) {
      taskTimeoutID = localSetTimeout(function() {
        callback(exports$1.unstable_now());
      }, ms);
    }
    exports$1.unstable_IdlePriority = 5;
    exports$1.unstable_ImmediatePriority = 1;
    exports$1.unstable_LowPriority = 4;
    exports$1.unstable_NormalPriority = 3;
    exports$1.unstable_Profiling = null;
    exports$1.unstable_UserBlockingPriority = 2;
    exports$1.unstable_cancelCallback = function(task) {
      task.callback = null;
    };
    exports$1.unstable_forceFrameRate = function(fps) {
      0 > fps || 125 < fps ? console.error(
        "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"
      ) : frameInterval = 0 < fps ? Math.floor(1e3 / fps) : 5;
    };
    exports$1.unstable_getCurrentPriorityLevel = function() {
      return currentPriorityLevel;
    };
    exports$1.unstable_next = function(eventHandler) {
      switch (currentPriorityLevel) {
        case 1:
        case 2:
        case 3:
          var priorityLevel = 3;
          break;
        default:
          priorityLevel = currentPriorityLevel;
      }
      var previousPriorityLevel = currentPriorityLevel;
      currentPriorityLevel = priorityLevel;
      try {
        return eventHandler();
      } finally {
        currentPriorityLevel = previousPriorityLevel;
      }
    };
    exports$1.unstable_requestPaint = function() {
      needsPaint = true;
    };
    exports$1.unstable_runWithPriority = function(priorityLevel, eventHandler) {
      switch (priorityLevel) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          priorityLevel = 3;
      }
      var previousPriorityLevel = currentPriorityLevel;
      currentPriorityLevel = priorityLevel;
      try {
        return eventHandler();
      } finally {
        currentPriorityLevel = previousPriorityLevel;
      }
    };
    exports$1.unstable_scheduleCallback = function(priorityLevel, callback, options) {
      var currentTime2 = exports$1.unstable_now();
      "object" === typeof options && null !== options ? (options = options.delay, options = "number" === typeof options && 0 < options ? currentTime2 + options : currentTime2) : options = currentTime2;
      switch (priorityLevel) {
        case 1:
          var timeout = -1;
          break;
        case 2:
          timeout = 250;
          break;
        case 5:
          timeout = 1073741823;
          break;
        case 4:
          timeout = 1e4;
          break;
        default:
          timeout = 5e3;
      }
      timeout = options + timeout;
      priorityLevel = {
        id: taskIdCounter++,
        callback,
        priorityLevel,
        startTime: options,
        expirationTime: timeout,
        sortIndex: -1
      };
      options > currentTime2 ? (priorityLevel.sortIndex = options, push(timerQueue, priorityLevel), null === peek(taskQueue) && priorityLevel === peek(timerQueue) && (isHostTimeoutScheduled ? (localClearTimeout(taskTimeoutID), taskTimeoutID = -1) : isHostTimeoutScheduled = true, requestHostTimeout(handleTimeout, options - currentTime2))) : (priorityLevel.sortIndex = timeout, push(taskQueue, priorityLevel), isHostCallbackScheduled || isPerformingWork || (isHostCallbackScheduled = true, isMessageLoopRunning || (isMessageLoopRunning = true, schedulePerformWorkUntilDeadline())));
      return priorityLevel;
    };
    exports$1.unstable_shouldYield = shouldYieldToHost;
    exports$1.unstable_wrapCallback = function(callback) {
      var parentPriorityLevel = currentPriorityLevel;
      return function() {
        var previousPriorityLevel = currentPriorityLevel;
        currentPriorityLevel = parentPriorityLevel;
        try {
          return callback.apply(this, arguments);
        } finally {
          currentPriorityLevel = previousPriorityLevel;
        }
      };
    };
  })(scheduler_production);
  return scheduler_production;
}
var hasRequiredScheduler;
function requireScheduler() {
  if (hasRequiredScheduler) return scheduler.exports;
  hasRequiredScheduler = 1;
  {
    scheduler.exports = requireScheduler_production();
  }
  return scheduler.exports;
}
var reactDom = { exports: {} };
var reactDom_production = {};
/**
 * @license React
 * react-dom.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var hasRequiredReactDom_production;
function requireReactDom_production() {
  if (hasRequiredReactDom_production) return reactDom_production;
  hasRequiredReactDom_production = 1;
  var React2 = requireReact();
  function formatProdErrorMessage(code) {
    var url = "https://react.dev/errors/" + code;
    if (1 < arguments.length) {
      url += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var i = 2; i < arguments.length; i++)
        url += "&args[]=" + encodeURIComponent(arguments[i]);
    }
    return "Minified React error #" + code + "; visit " + url + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function noop() {
  }
  var Internals = {
    d: {
      f: noop,
      r: function() {
        throw Error(formatProdErrorMessage(522));
      },
      D: noop,
      C: noop,
      L: noop,
      m: noop,
      X: noop,
      S: noop,
      M: noop
    },
    p: 0,
    findDOMNode: null
  }, REACT_PORTAL_TYPE = Symbol.for("react.portal");
  function createPortal$1(children, containerInfo, implementation) {
    var key = 3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : null;
    return {
      $$typeof: REACT_PORTAL_TYPE,
      key: null == key ? null : "" + key,
      children,
      containerInfo,
      implementation
    };
  }
  var ReactSharedInternals = React2.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function getCrossOriginStringAs(as, input) {
    if ("font" === as) return "";
    if ("string" === typeof input)
      return "use-credentials" === input ? input : "";
  }
  reactDom_production.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = Internals;
  reactDom_production.createPortal = function(children, container) {
    var key = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : null;
    if (!container || 1 !== container.nodeType && 9 !== container.nodeType && 11 !== container.nodeType)
      throw Error(formatProdErrorMessage(299));
    return createPortal$1(children, container, null, key);
  };
  reactDom_production.flushSync = function(fn) {
    var previousTransition = ReactSharedInternals.T, previousUpdatePriority = Internals.p;
    try {
      if (ReactSharedInternals.T = null, Internals.p = 2, fn) return fn();
    } finally {
      ReactSharedInternals.T = previousTransition, Internals.p = previousUpdatePriority, Internals.d.f();
    }
  };
  reactDom_production.preconnect = function(href, options) {
    "string" === typeof href && (options ? (options = options.crossOrigin, options = "string" === typeof options ? "use-credentials" === options ? options : "" : void 0) : options = null, Internals.d.C(href, options));
  };
  reactDom_production.prefetchDNS = function(href) {
    "string" === typeof href && Internals.d.D(href);
  };
  reactDom_production.preinit = function(href, options) {
    if ("string" === typeof href && options && "string" === typeof options.as) {
      var as = options.as, crossOrigin = getCrossOriginStringAs(as, options.crossOrigin), integrity = "string" === typeof options.integrity ? options.integrity : void 0, fetchPriority = "string" === typeof options.fetchPriority ? options.fetchPriority : void 0;
      "style" === as ? Internals.d.S(
        href,
        "string" === typeof options.precedence ? options.precedence : void 0,
        {
          crossOrigin,
          integrity,
          fetchPriority
        }
      ) : "script" === as && Internals.d.X(href, {
        crossOrigin,
        integrity,
        fetchPriority,
        nonce: "string" === typeof options.nonce ? options.nonce : void 0
      });
    }
  };
  reactDom_production.preinitModule = function(href, options) {
    if ("string" === typeof href)
      if ("object" === typeof options && null !== options) {
        if (null == options.as || "script" === options.as) {
          var crossOrigin = getCrossOriginStringAs(
            options.as,
            options.crossOrigin
          );
          Internals.d.M(href, {
            crossOrigin,
            integrity: "string" === typeof options.integrity ? options.integrity : void 0,
            nonce: "string" === typeof options.nonce ? options.nonce : void 0
          });
        }
      } else null == options && Internals.d.M(href);
  };
  reactDom_production.preload = function(href, options) {
    if ("string" === typeof href && "object" === typeof options && null !== options && "string" === typeof options.as) {
      var as = options.as, crossOrigin = getCrossOriginStringAs(as, options.crossOrigin);
      Internals.d.L(href, as, {
        crossOrigin,
        integrity: "string" === typeof options.integrity ? options.integrity : void 0,
        nonce: "string" === typeof options.nonce ? options.nonce : void 0,
        type: "string" === typeof options.type ? options.type : void 0,
        fetchPriority: "string" === typeof options.fetchPriority ? options.fetchPriority : void 0,
        referrerPolicy: "string" === typeof options.referrerPolicy ? options.referrerPolicy : void 0,
        imageSrcSet: "string" === typeof options.imageSrcSet ? options.imageSrcSet : void 0,
        imageSizes: "string" === typeof options.imageSizes ? options.imageSizes : void 0,
        media: "string" === typeof options.media ? options.media : void 0
      });
    }
  };
  reactDom_production.preloadModule = function(href, options) {
    if ("string" === typeof href)
      if (options) {
        var crossOrigin = getCrossOriginStringAs(options.as, options.crossOrigin);
        Internals.d.m(href, {
          as: "string" === typeof options.as && "script" !== options.as ? options.as : void 0,
          crossOrigin,
          integrity: "string" === typeof options.integrity ? options.integrity : void 0
        });
      } else Internals.d.m(href);
  };
  reactDom_production.requestFormReset = function(form) {
    Internals.d.r(form);
  };
  reactDom_production.unstable_batchedUpdates = function(fn, a) {
    return fn(a);
  };
  reactDom_production.useFormState = function(action, initialState, permalink) {
    return ReactSharedInternals.H.useFormState(action, initialState, permalink);
  };
  reactDom_production.useFormStatus = function() {
    return ReactSharedInternals.H.useHostTransitionStatus();
  };
  reactDom_production.version = "19.2.5";
  return reactDom_production;
}
var hasRequiredReactDom;
function requireReactDom() {
  if (hasRequiredReactDom) return reactDom.exports;
  hasRequiredReactDom = 1;
  function checkDCE() {
    if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === "undefined" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE !== "function") {
      return;
    }
    try {
      __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(checkDCE);
    } catch (err) {
      console.error(err);
    }
  }
  {
    checkDCE();
    reactDom.exports = requireReactDom_production();
  }
  return reactDom.exports;
}
/**
 * @license React
 * react-dom-client.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var hasRequiredReactDomClient_production;
function requireReactDomClient_production() {
  if (hasRequiredReactDomClient_production) return reactDomClient_production;
  hasRequiredReactDomClient_production = 1;
  var Scheduler = requireScheduler(), React2 = requireReact(), ReactDOM = requireReactDom();
  function formatProdErrorMessage(code) {
    var url = "https://react.dev/errors/" + code;
    if (1 < arguments.length) {
      url += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var i = 2; i < arguments.length; i++)
        url += "&args[]=" + encodeURIComponent(arguments[i]);
    }
    return "Minified React error #" + code + "; visit " + url + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function isValidContainer(node) {
    return !(!node || 1 !== node.nodeType && 9 !== node.nodeType && 11 !== node.nodeType);
  }
  function getNearestMountedFiber(fiber) {
    var node = fiber, nearestMounted = fiber;
    if (fiber.alternate) for (; node.return; ) node = node.return;
    else {
      fiber = node;
      do
        node = fiber, 0 !== (node.flags & 4098) && (nearestMounted = node.return), fiber = node.return;
      while (fiber);
    }
    return 3 === node.tag ? nearestMounted : null;
  }
  function getSuspenseInstanceFromFiber(fiber) {
    if (13 === fiber.tag) {
      var suspenseState = fiber.memoizedState;
      null === suspenseState && (fiber = fiber.alternate, null !== fiber && (suspenseState = fiber.memoizedState));
      if (null !== suspenseState) return suspenseState.dehydrated;
    }
    return null;
  }
  function getActivityInstanceFromFiber(fiber) {
    if (31 === fiber.tag) {
      var activityState = fiber.memoizedState;
      null === activityState && (fiber = fiber.alternate, null !== fiber && (activityState = fiber.memoizedState));
      if (null !== activityState) return activityState.dehydrated;
    }
    return null;
  }
  function assertIsMounted(fiber) {
    if (getNearestMountedFiber(fiber) !== fiber)
      throw Error(formatProdErrorMessage(188));
  }
  function findCurrentFiberUsingSlowPath(fiber) {
    var alternate = fiber.alternate;
    if (!alternate) {
      alternate = getNearestMountedFiber(fiber);
      if (null === alternate) throw Error(formatProdErrorMessage(188));
      return alternate !== fiber ? null : fiber;
    }
    for (var a = fiber, b = alternate; ; ) {
      var parentA = a.return;
      if (null === parentA) break;
      var parentB = parentA.alternate;
      if (null === parentB) {
        b = parentA.return;
        if (null !== b) {
          a = b;
          continue;
        }
        break;
      }
      if (parentA.child === parentB.child) {
        for (parentB = parentA.child; parentB; ) {
          if (parentB === a) return assertIsMounted(parentA), fiber;
          if (parentB === b) return assertIsMounted(parentA), alternate;
          parentB = parentB.sibling;
        }
        throw Error(formatProdErrorMessage(188));
      }
      if (a.return !== b.return) a = parentA, b = parentB;
      else {
        for (var didFindChild = false, child$0 = parentA.child; child$0; ) {
          if (child$0 === a) {
            didFindChild = true;
            a = parentA;
            b = parentB;
            break;
          }
          if (child$0 === b) {
            didFindChild = true;
            b = parentA;
            a = parentB;
            break;
          }
          child$0 = child$0.sibling;
        }
        if (!didFindChild) {
          for (child$0 = parentB.child; child$0; ) {
            if (child$0 === a) {
              didFindChild = true;
              a = parentB;
              b = parentA;
              break;
            }
            if (child$0 === b) {
              didFindChild = true;
              b = parentB;
              a = parentA;
              break;
            }
            child$0 = child$0.sibling;
          }
          if (!didFindChild) throw Error(formatProdErrorMessage(189));
        }
      }
      if (a.alternate !== b) throw Error(formatProdErrorMessage(190));
    }
    if (3 !== a.tag) throw Error(formatProdErrorMessage(188));
    return a.stateNode.current === a ? fiber : alternate;
  }
  function findCurrentHostFiberImpl(node) {
    var tag = node.tag;
    if (5 === tag || 26 === tag || 27 === tag || 6 === tag) return node;
    for (node = node.child; null !== node; ) {
      tag = findCurrentHostFiberImpl(node);
      if (null !== tag) return tag;
      node = node.sibling;
    }
    return null;
  }
  var assign = Object.assign, REACT_LEGACY_ELEMENT_TYPE = Symbol.for("react.element"), REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy");
  var REACT_ACTIVITY_TYPE = Symbol.for("react.activity");
  var REACT_MEMO_CACHE_SENTINEL = Symbol.for("react.memo_cache_sentinel");
  var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
  function getIteratorFn(maybeIterable) {
    if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
    maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
    return "function" === typeof maybeIterable ? maybeIterable : null;
  }
  var REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference");
  function getComponentNameFromType(type) {
    if (null == type) return null;
    if ("function" === typeof type)
      return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
    if ("string" === typeof type) return type;
    switch (type) {
      case REACT_FRAGMENT_TYPE:
        return "Fragment";
      case REACT_PROFILER_TYPE:
        return "Profiler";
      case REACT_STRICT_MODE_TYPE:
        return "StrictMode";
      case REACT_SUSPENSE_TYPE:
        return "Suspense";
      case REACT_SUSPENSE_LIST_TYPE:
        return "SuspenseList";
      case REACT_ACTIVITY_TYPE:
        return "Activity";
    }
    if ("object" === typeof type)
      switch (type.$$typeof) {
        case REACT_PORTAL_TYPE:
          return "Portal";
        case REACT_CONTEXT_TYPE:
          return type.displayName || "Context";
        case REACT_CONSUMER_TYPE:
          return (type._context.displayName || "Context") + ".Consumer";
        case REACT_FORWARD_REF_TYPE:
          var innerType = type.render;
          type = type.displayName;
          type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
          return type;
        case REACT_MEMO_TYPE:
          return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
        case REACT_LAZY_TYPE:
          innerType = type._payload;
          type = type._init;
          try {
            return getComponentNameFromType(type(innerType));
          } catch (x) {
          }
      }
    return null;
  }
  var isArrayImpl = Array.isArray, ReactSharedInternals = React2.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, ReactDOMSharedInternals = ReactDOM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, sharedNotPendingObject = {
    pending: false,
    data: null,
    method: null,
    action: null
  }, valueStack = [], index = -1;
  function createCursor(defaultValue) {
    return { current: defaultValue };
  }
  function pop(cursor) {
    0 > index || (cursor.current = valueStack[index], valueStack[index] = null, index--);
  }
  function push(cursor, value) {
    index++;
    valueStack[index] = cursor.current;
    cursor.current = value;
  }
  var contextStackCursor = createCursor(null), contextFiberStackCursor = createCursor(null), rootInstanceStackCursor = createCursor(null), hostTransitionProviderCursor = createCursor(null);
  function pushHostContainer(fiber, nextRootInstance) {
    push(rootInstanceStackCursor, nextRootInstance);
    push(contextFiberStackCursor, fiber);
    push(contextStackCursor, null);
    switch (nextRootInstance.nodeType) {
      case 9:
      case 11:
        fiber = (fiber = nextRootInstance.documentElement) ? (fiber = fiber.namespaceURI) ? getOwnHostContext(fiber) : 0 : 0;
        break;
      default:
        if (fiber = nextRootInstance.tagName, nextRootInstance = nextRootInstance.namespaceURI)
          nextRootInstance = getOwnHostContext(nextRootInstance), fiber = getChildHostContextProd(nextRootInstance, fiber);
        else
          switch (fiber) {
            case "svg":
              fiber = 1;
              break;
            case "math":
              fiber = 2;
              break;
            default:
              fiber = 0;
          }
    }
    pop(contextStackCursor);
    push(contextStackCursor, fiber);
  }
  function popHostContainer() {
    pop(contextStackCursor);
    pop(contextFiberStackCursor);
    pop(rootInstanceStackCursor);
  }
  function pushHostContext(fiber) {
    null !== fiber.memoizedState && push(hostTransitionProviderCursor, fiber);
    var context = contextStackCursor.current;
    var JSCompiler_inline_result = getChildHostContextProd(context, fiber.type);
    context !== JSCompiler_inline_result && (push(contextFiberStackCursor, fiber), push(contextStackCursor, JSCompiler_inline_result));
  }
  function popHostContext(fiber) {
    contextFiberStackCursor.current === fiber && (pop(contextStackCursor), pop(contextFiberStackCursor));
    hostTransitionProviderCursor.current === fiber && (pop(hostTransitionProviderCursor), HostTransitionContext._currentValue = sharedNotPendingObject);
  }
  var prefix, suffix;
  function describeBuiltInComponentFrame(name) {
    if (void 0 === prefix)
      try {
        throw Error();
      } catch (x) {
        var match = x.stack.trim().match(/\n( *(at )?)/);
        prefix = match && match[1] || "";
        suffix = -1 < x.stack.indexOf("\n    at") ? " (<anonymous>)" : -1 < x.stack.indexOf("@") ? "@unknown:0:0" : "";
      }
    return "\n" + prefix + name + suffix;
  }
  var reentry = false;
  function describeNativeComponentFrame(fn, construct) {
    if (!fn || reentry) return "";
    reentry = true;
    var previousPrepareStackTrace = Error.prepareStackTrace;
    Error.prepareStackTrace = void 0;
    try {
      var RunInRootFrame = {
        DetermineComponentFrameRoot: function() {
          try {
            if (construct) {
              var Fake = function() {
                throw Error();
              };
              Object.defineProperty(Fake.prototype, "props", {
                set: function() {
                  throw Error();
                }
              });
              if ("object" === typeof Reflect && Reflect.construct) {
                try {
                  Reflect.construct(Fake, []);
                } catch (x) {
                  var control = x;
                }
                Reflect.construct(fn, [], Fake);
              } else {
                try {
                  Fake.call();
                } catch (x$1) {
                  control = x$1;
                }
                fn.call(Fake.prototype);
              }
            } else {
              try {
                throw Error();
              } catch (x$2) {
                control = x$2;
              }
              (Fake = fn()) && "function" === typeof Fake.catch && Fake.catch(function() {
              });
            }
          } catch (sample) {
            if (sample && control && "string" === typeof sample.stack)
              return [sample.stack, control.stack];
          }
          return [null, null];
        }
      };
      RunInRootFrame.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
      var namePropDescriptor = Object.getOwnPropertyDescriptor(
        RunInRootFrame.DetermineComponentFrameRoot,
        "name"
      );
      namePropDescriptor && namePropDescriptor.configurable && Object.defineProperty(
        RunInRootFrame.DetermineComponentFrameRoot,
        "name",
        { value: "DetermineComponentFrameRoot" }
      );
      var _RunInRootFrame$Deter = RunInRootFrame.DetermineComponentFrameRoot(), sampleStack = _RunInRootFrame$Deter[0], controlStack = _RunInRootFrame$Deter[1];
      if (sampleStack && controlStack) {
        var sampleLines = sampleStack.split("\n"), controlLines = controlStack.split("\n");
        for (namePropDescriptor = RunInRootFrame = 0; RunInRootFrame < sampleLines.length && !sampleLines[RunInRootFrame].includes("DetermineComponentFrameRoot"); )
          RunInRootFrame++;
        for (; namePropDescriptor < controlLines.length && !controlLines[namePropDescriptor].includes(
          "DetermineComponentFrameRoot"
        ); )
          namePropDescriptor++;
        if (RunInRootFrame === sampleLines.length || namePropDescriptor === controlLines.length)
          for (RunInRootFrame = sampleLines.length - 1, namePropDescriptor = controlLines.length - 1; 1 <= RunInRootFrame && 0 <= namePropDescriptor && sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor]; )
            namePropDescriptor--;
        for (; 1 <= RunInRootFrame && 0 <= namePropDescriptor; RunInRootFrame--, namePropDescriptor--)
          if (sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor]) {
            if (1 !== RunInRootFrame || 1 !== namePropDescriptor) {
              do
                if (RunInRootFrame--, namePropDescriptor--, 0 > namePropDescriptor || sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor]) {
                  var frame = "\n" + sampleLines[RunInRootFrame].replace(" at new ", " at ");
                  fn.displayName && frame.includes("<anonymous>") && (frame = frame.replace("<anonymous>", fn.displayName));
                  return frame;
                }
              while (1 <= RunInRootFrame && 0 <= namePropDescriptor);
            }
            break;
          }
      }
    } finally {
      reentry = false, Error.prepareStackTrace = previousPrepareStackTrace;
    }
    return (previousPrepareStackTrace = fn ? fn.displayName || fn.name : "") ? describeBuiltInComponentFrame(previousPrepareStackTrace) : "";
  }
  function describeFiber(fiber, childFiber) {
    switch (fiber.tag) {
      case 26:
      case 27:
      case 5:
        return describeBuiltInComponentFrame(fiber.type);
      case 16:
        return describeBuiltInComponentFrame("Lazy");
      case 13:
        return fiber.child !== childFiber && null !== childFiber ? describeBuiltInComponentFrame("Suspense Fallback") : describeBuiltInComponentFrame("Suspense");
      case 19:
        return describeBuiltInComponentFrame("SuspenseList");
      case 0:
      case 15:
        return describeNativeComponentFrame(fiber.type, false);
      case 11:
        return describeNativeComponentFrame(fiber.type.render, false);
      case 1:
        return describeNativeComponentFrame(fiber.type, true);
      case 31:
        return describeBuiltInComponentFrame("Activity");
      default:
        return "";
    }
  }
  function getStackByFiberInDevAndProd(workInProgress2) {
    try {
      var info = "", previous = null;
      do
        info += describeFiber(workInProgress2, previous), previous = workInProgress2, workInProgress2 = workInProgress2.return;
      while (workInProgress2);
      return info;
    } catch (x) {
      return "\nError generating stack: " + x.message + "\n" + x.stack;
    }
  }
  var hasOwnProperty = Object.prototype.hasOwnProperty, scheduleCallback$3 = Scheduler.unstable_scheduleCallback, cancelCallback$1 = Scheduler.unstable_cancelCallback, shouldYield = Scheduler.unstable_shouldYield, requestPaint = Scheduler.unstable_requestPaint, now = Scheduler.unstable_now, getCurrentPriorityLevel = Scheduler.unstable_getCurrentPriorityLevel, ImmediatePriority = Scheduler.unstable_ImmediatePriority, UserBlockingPriority = Scheduler.unstable_UserBlockingPriority, NormalPriority$1 = Scheduler.unstable_NormalPriority, LowPriority = Scheduler.unstable_LowPriority, IdlePriority = Scheduler.unstable_IdlePriority, log$1 = Scheduler.log, unstable_setDisableYieldValue = Scheduler.unstable_setDisableYieldValue, rendererID = null, injectedHook = null;
  function setIsStrictModeForDevtools(newIsStrictMode) {
    "function" === typeof log$1 && unstable_setDisableYieldValue(newIsStrictMode);
    if (injectedHook && "function" === typeof injectedHook.setStrictMode)
      try {
        injectedHook.setStrictMode(rendererID, newIsStrictMode);
      } catch (err) {
      }
  }
  var clz32 = Math.clz32 ? Math.clz32 : clz32Fallback, log = Math.log, LN2 = Math.LN2;
  function clz32Fallback(x) {
    x >>>= 0;
    return 0 === x ? 32 : 31 - (log(x) / LN2 | 0) | 0;
  }
  var nextTransitionUpdateLane = 256, nextTransitionDeferredLane = 262144, nextRetryLane = 4194304;
  function getHighestPriorityLanes(lanes) {
    var pendingSyncLanes = lanes & 42;
    if (0 !== pendingSyncLanes) return pendingSyncLanes;
    switch (lanes & -lanes) {
      case 1:
        return 1;
      case 2:
        return 2;
      case 4:
        return 4;
      case 8:
        return 8;
      case 16:
        return 16;
      case 32:
        return 32;
      case 64:
        return 64;
      case 128:
        return 128;
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
        return lanes & 261888;
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return lanes & 3932160;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return lanes & 62914560;
      case 67108864:
        return 67108864;
      case 134217728:
        return 134217728;
      case 268435456:
        return 268435456;
      case 536870912:
        return 536870912;
      case 1073741824:
        return 0;
      default:
        return lanes;
    }
  }
  function getNextLanes(root2, wipLanes, rootHasPendingCommit) {
    var pendingLanes = root2.pendingLanes;
    if (0 === pendingLanes) return 0;
    var nextLanes = 0, suspendedLanes = root2.suspendedLanes, pingedLanes = root2.pingedLanes;
    root2 = root2.warmLanes;
    var nonIdlePendingLanes = pendingLanes & 134217727;
    0 !== nonIdlePendingLanes ? (pendingLanes = nonIdlePendingLanes & ~suspendedLanes, 0 !== pendingLanes ? nextLanes = getHighestPriorityLanes(pendingLanes) : (pingedLanes &= nonIdlePendingLanes, 0 !== pingedLanes ? nextLanes = getHighestPriorityLanes(pingedLanes) : rootHasPendingCommit || (rootHasPendingCommit = nonIdlePendingLanes & ~root2, 0 !== rootHasPendingCommit && (nextLanes = getHighestPriorityLanes(rootHasPendingCommit))))) : (nonIdlePendingLanes = pendingLanes & ~suspendedLanes, 0 !== nonIdlePendingLanes ? nextLanes = getHighestPriorityLanes(nonIdlePendingLanes) : 0 !== pingedLanes ? nextLanes = getHighestPriorityLanes(pingedLanes) : rootHasPendingCommit || (rootHasPendingCommit = pendingLanes & ~root2, 0 !== rootHasPendingCommit && (nextLanes = getHighestPriorityLanes(rootHasPendingCommit))));
    return 0 === nextLanes ? 0 : 0 !== wipLanes && wipLanes !== nextLanes && 0 === (wipLanes & suspendedLanes) && (suspendedLanes = nextLanes & -nextLanes, rootHasPendingCommit = wipLanes & -wipLanes, suspendedLanes >= rootHasPendingCommit || 32 === suspendedLanes && 0 !== (rootHasPendingCommit & 4194048)) ? wipLanes : nextLanes;
  }
  function checkIfRootIsPrerendering(root2, renderLanes2) {
    return 0 === (root2.pendingLanes & ~(root2.suspendedLanes & ~root2.pingedLanes) & renderLanes2);
  }
  function computeExpirationTime(lane, currentTime2) {
    switch (lane) {
      case 1:
      case 2:
      case 4:
      case 8:
      case 64:
        return currentTime2 + 250;
      case 16:
      case 32:
      case 128:
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return currentTime2 + 5e3;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return -1;
      case 67108864:
      case 134217728:
      case 268435456:
      case 536870912:
      case 1073741824:
        return -1;
      default:
        return -1;
    }
  }
  function claimNextRetryLane() {
    var lane = nextRetryLane;
    nextRetryLane <<= 1;
    0 === (nextRetryLane & 62914560) && (nextRetryLane = 4194304);
    return lane;
  }
  function createLaneMap(initial) {
    for (var laneMap = [], i = 0; 31 > i; i++) laneMap.push(initial);
    return laneMap;
  }
  function markRootUpdated$1(root2, updateLane) {
    root2.pendingLanes |= updateLane;
    268435456 !== updateLane && (root2.suspendedLanes = 0, root2.pingedLanes = 0, root2.warmLanes = 0);
  }
  function markRootFinished(root2, finishedLanes, remainingLanes, spawnedLane, updatedLanes, suspendedRetryLanes) {
    var previouslyPendingLanes = root2.pendingLanes;
    root2.pendingLanes = remainingLanes;
    root2.suspendedLanes = 0;
    root2.pingedLanes = 0;
    root2.warmLanes = 0;
    root2.expiredLanes &= remainingLanes;
    root2.entangledLanes &= remainingLanes;
    root2.errorRecoveryDisabledLanes &= remainingLanes;
    root2.shellSuspendCounter = 0;
    var entanglements = root2.entanglements, expirationTimes = root2.expirationTimes, hiddenUpdates = root2.hiddenUpdates;
    for (remainingLanes = previouslyPendingLanes & ~remainingLanes; 0 < remainingLanes; ) {
      var index$7 = 31 - clz32(remainingLanes), lane = 1 << index$7;
      entanglements[index$7] = 0;
      expirationTimes[index$7] = -1;
      var hiddenUpdatesForLane = hiddenUpdates[index$7];
      if (null !== hiddenUpdatesForLane)
        for (hiddenUpdates[index$7] = null, index$7 = 0; index$7 < hiddenUpdatesForLane.length; index$7++) {
          var update = hiddenUpdatesForLane[index$7];
          null !== update && (update.lane &= -536870913);
        }
      remainingLanes &= ~lane;
    }
    0 !== spawnedLane && markSpawnedDeferredLane(root2, spawnedLane, 0);
    0 !== suspendedRetryLanes && 0 === updatedLanes && 0 !== root2.tag && (root2.suspendedLanes |= suspendedRetryLanes & ~(previouslyPendingLanes & ~finishedLanes));
  }
  function markSpawnedDeferredLane(root2, spawnedLane, entangledLanes) {
    root2.pendingLanes |= spawnedLane;
    root2.suspendedLanes &= ~spawnedLane;
    var spawnedLaneIndex = 31 - clz32(spawnedLane);
    root2.entangledLanes |= spawnedLane;
    root2.entanglements[spawnedLaneIndex] = root2.entanglements[spawnedLaneIndex] | 1073741824 | entangledLanes & 261930;
  }
  function markRootEntangled(root2, entangledLanes) {
    var rootEntangledLanes = root2.entangledLanes |= entangledLanes;
    for (root2 = root2.entanglements; rootEntangledLanes; ) {
      var index$8 = 31 - clz32(rootEntangledLanes), lane = 1 << index$8;
      lane & entangledLanes | root2[index$8] & entangledLanes && (root2[index$8] |= entangledLanes);
      rootEntangledLanes &= ~lane;
    }
  }
  function getBumpedLaneForHydration(root2, renderLanes2) {
    var renderLane = renderLanes2 & -renderLanes2;
    renderLane = 0 !== (renderLane & 42) ? 1 : getBumpedLaneForHydrationByLane(renderLane);
    return 0 !== (renderLane & (root2.suspendedLanes | renderLanes2)) ? 0 : renderLane;
  }
  function getBumpedLaneForHydrationByLane(lane) {
    switch (lane) {
      case 2:
        lane = 1;
        break;
      case 8:
        lane = 4;
        break;
      case 32:
        lane = 16;
        break;
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        lane = 128;
        break;
      case 268435456:
        lane = 134217728;
        break;
      default:
        lane = 0;
    }
    return lane;
  }
  function lanesToEventPriority(lanes) {
    lanes &= -lanes;
    return 2 < lanes ? 8 < lanes ? 0 !== (lanes & 134217727) ? 32 : 268435456 : 8 : 2;
  }
  function resolveUpdatePriority() {
    var updatePriority = ReactDOMSharedInternals.p;
    if (0 !== updatePriority) return updatePriority;
    updatePriority = window.event;
    return void 0 === updatePriority ? 32 : getEventPriority(updatePriority.type);
  }
  function runWithPriority(priority, fn) {
    var previousPriority = ReactDOMSharedInternals.p;
    try {
      return ReactDOMSharedInternals.p = priority, fn();
    } finally {
      ReactDOMSharedInternals.p = previousPriority;
    }
  }
  var randomKey = Math.random().toString(36).slice(2), internalInstanceKey = "__reactFiber$" + randomKey, internalPropsKey = "__reactProps$" + randomKey, internalContainerInstanceKey = "__reactContainer$" + randomKey, internalEventHandlersKey = "__reactEvents$" + randomKey, internalEventHandlerListenersKey = "__reactListeners$" + randomKey, internalEventHandlesSetKey = "__reactHandles$" + randomKey, internalRootNodeResourcesKey = "__reactResources$" + randomKey, internalHoistableMarker = "__reactMarker$" + randomKey;
  function detachDeletedInstance(node) {
    delete node[internalInstanceKey];
    delete node[internalPropsKey];
    delete node[internalEventHandlersKey];
    delete node[internalEventHandlerListenersKey];
    delete node[internalEventHandlesSetKey];
  }
  function getClosestInstanceFromNode(targetNode) {
    var targetInst = targetNode[internalInstanceKey];
    if (targetInst) return targetInst;
    for (var parentNode = targetNode.parentNode; parentNode; ) {
      if (targetInst = parentNode[internalContainerInstanceKey] || parentNode[internalInstanceKey]) {
        parentNode = targetInst.alternate;
        if (null !== targetInst.child || null !== parentNode && null !== parentNode.child)
          for (targetNode = getParentHydrationBoundary(targetNode); null !== targetNode; ) {
            if (parentNode = targetNode[internalInstanceKey]) return parentNode;
            targetNode = getParentHydrationBoundary(targetNode);
          }
        return targetInst;
      }
      targetNode = parentNode;
      parentNode = targetNode.parentNode;
    }
    return null;
  }
  function getInstanceFromNode(node) {
    if (node = node[internalInstanceKey] || node[internalContainerInstanceKey]) {
      var tag = node.tag;
      if (5 === tag || 6 === tag || 13 === tag || 31 === tag || 26 === tag || 27 === tag || 3 === tag)
        return node;
    }
    return null;
  }
  function getNodeFromInstance(inst) {
    var tag = inst.tag;
    if (5 === tag || 26 === tag || 27 === tag || 6 === tag) return inst.stateNode;
    throw Error(formatProdErrorMessage(33));
  }
  function getResourcesFromRoot(root2) {
    var resources = root2[internalRootNodeResourcesKey];
    resources || (resources = root2[internalRootNodeResourcesKey] = { hoistableStyles: /* @__PURE__ */ new Map(), hoistableScripts: /* @__PURE__ */ new Map() });
    return resources;
  }
  function markNodeAsHoistable(node) {
    node[internalHoistableMarker] = true;
  }
  var allNativeEvents = /* @__PURE__ */ new Set(), registrationNameDependencies = {};
  function registerTwoPhaseEvent(registrationName, dependencies) {
    registerDirectEvent(registrationName, dependencies);
    registerDirectEvent(registrationName + "Capture", dependencies);
  }
  function registerDirectEvent(registrationName, dependencies) {
    registrationNameDependencies[registrationName] = dependencies;
    for (registrationName = 0; registrationName < dependencies.length; registrationName++)
      allNativeEvents.add(dependencies[registrationName]);
  }
  var VALID_ATTRIBUTE_NAME_REGEX = RegExp(
    "^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
  ), illegalAttributeNameCache = {}, validatedAttributeNameCache = {};
  function isAttributeNameSafe(attributeName) {
    if (hasOwnProperty.call(validatedAttributeNameCache, attributeName))
      return true;
    if (hasOwnProperty.call(illegalAttributeNameCache, attributeName)) return false;
    if (VALID_ATTRIBUTE_NAME_REGEX.test(attributeName))
      return validatedAttributeNameCache[attributeName] = true;
    illegalAttributeNameCache[attributeName] = true;
    return false;
  }
  function setValueForAttribute(node, name, value) {
    if (isAttributeNameSafe(name))
      if (null === value) node.removeAttribute(name);
      else {
        switch (typeof value) {
          case "undefined":
          case "function":
          case "symbol":
            node.removeAttribute(name);
            return;
          case "boolean":
            var prefix$10 = name.toLowerCase().slice(0, 5);
            if ("data-" !== prefix$10 && "aria-" !== prefix$10) {
              node.removeAttribute(name);
              return;
            }
        }
        node.setAttribute(name, "" + value);
      }
  }
  function setValueForKnownAttribute(node, name, value) {
    if (null === value) node.removeAttribute(name);
    else {
      switch (typeof value) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          node.removeAttribute(name);
          return;
      }
      node.setAttribute(name, "" + value);
    }
  }
  function setValueForNamespacedAttribute(node, namespace, name, value) {
    if (null === value) node.removeAttribute(name);
    else {
      switch (typeof value) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          node.removeAttribute(name);
          return;
      }
      node.setAttributeNS(namespace, name, "" + value);
    }
  }
  function getToStringValue(value) {
    switch (typeof value) {
      case "bigint":
      case "boolean":
      case "number":
      case "string":
      case "undefined":
        return value;
      case "object":
        return value;
      default:
        return "";
    }
  }
  function isCheckable(elem) {
    var type = elem.type;
    return (elem = elem.nodeName) && "input" === elem.toLowerCase() && ("checkbox" === type || "radio" === type);
  }
  function trackValueOnNode(node, valueField, currentValue) {
    var descriptor = Object.getOwnPropertyDescriptor(
      node.constructor.prototype,
      valueField
    );
    if (!node.hasOwnProperty(valueField) && "undefined" !== typeof descriptor && "function" === typeof descriptor.get && "function" === typeof descriptor.set) {
      var get = descriptor.get, set = descriptor.set;
      Object.defineProperty(node, valueField, {
        configurable: true,
        get: function() {
          return get.call(this);
        },
        set: function(value) {
          currentValue = "" + value;
          set.call(this, value);
        }
      });
      Object.defineProperty(node, valueField, {
        enumerable: descriptor.enumerable
      });
      return {
        getValue: function() {
          return currentValue;
        },
        setValue: function(value) {
          currentValue = "" + value;
        },
        stopTracking: function() {
          node._valueTracker = null;
          delete node[valueField];
        }
      };
    }
  }
  function track(node) {
    if (!node._valueTracker) {
      var valueField = isCheckable(node) ? "checked" : "value";
      node._valueTracker = trackValueOnNode(
        node,
        valueField,
        "" + node[valueField]
      );
    }
  }
  function updateValueIfChanged(node) {
    if (!node) return false;
    var tracker = node._valueTracker;
    if (!tracker) return true;
    var lastValue = tracker.getValue();
    var value = "";
    node && (value = isCheckable(node) ? node.checked ? "true" : "false" : node.value);
    node = value;
    return node !== lastValue ? (tracker.setValue(node), true) : false;
  }
  function getActiveElement(doc) {
    doc = doc || ("undefined" !== typeof document ? document : void 0);
    if ("undefined" === typeof doc) return null;
    try {
      return doc.activeElement || doc.body;
    } catch (e) {
      return doc.body;
    }
  }
  var escapeSelectorAttributeValueInsideDoubleQuotesRegex = /[\n"\\]/g;
  function escapeSelectorAttributeValueInsideDoubleQuotes(value) {
    return value.replace(
      escapeSelectorAttributeValueInsideDoubleQuotesRegex,
      function(ch) {
        return "\\" + ch.charCodeAt(0).toString(16) + " ";
      }
    );
  }
  function updateInput(element, value, defaultValue, lastDefaultValue, checked, defaultChecked, type, name) {
    element.name = "";
    null != type && "function" !== typeof type && "symbol" !== typeof type && "boolean" !== typeof type ? element.type = type : element.removeAttribute("type");
    if (null != value)
      if ("number" === type) {
        if (0 === value && "" === element.value || element.value != value)
          element.value = "" + getToStringValue(value);
      } else
        element.value !== "" + getToStringValue(value) && (element.value = "" + getToStringValue(value));
    else
      "submit" !== type && "reset" !== type || element.removeAttribute("value");
    null != value ? setDefaultValue(element, type, getToStringValue(value)) : null != defaultValue ? setDefaultValue(element, type, getToStringValue(defaultValue)) : null != lastDefaultValue && element.removeAttribute("value");
    null == checked && null != defaultChecked && (element.defaultChecked = !!defaultChecked);
    null != checked && (element.checked = checked && "function" !== typeof checked && "symbol" !== typeof checked);
    null != name && "function" !== typeof name && "symbol" !== typeof name && "boolean" !== typeof name ? element.name = "" + getToStringValue(name) : element.removeAttribute("name");
  }
  function initInput(element, value, defaultValue, checked, defaultChecked, type, name, isHydrating2) {
    null != type && "function" !== typeof type && "symbol" !== typeof type && "boolean" !== typeof type && (element.type = type);
    if (null != value || null != defaultValue) {
      if (!("submit" !== type && "reset" !== type || void 0 !== value && null !== value)) {
        track(element);
        return;
      }
      defaultValue = null != defaultValue ? "" + getToStringValue(defaultValue) : "";
      value = null != value ? "" + getToStringValue(value) : defaultValue;
      isHydrating2 || value === element.value || (element.value = value);
      element.defaultValue = value;
    }
    checked = null != checked ? checked : defaultChecked;
    checked = "function" !== typeof checked && "symbol" !== typeof checked && !!checked;
    element.checked = isHydrating2 ? element.checked : !!checked;
    element.defaultChecked = !!checked;
    null != name && "function" !== typeof name && "symbol" !== typeof name && "boolean" !== typeof name && (element.name = name);
    track(element);
  }
  function setDefaultValue(node, type, value) {
    "number" === type && getActiveElement(node.ownerDocument) === node || node.defaultValue === "" + value || (node.defaultValue = "" + value);
  }
  function updateOptions(node, multiple, propValue, setDefaultSelected) {
    node = node.options;
    if (multiple) {
      multiple = {};
      for (var i = 0; i < propValue.length; i++)
        multiple["$" + propValue[i]] = true;
      for (propValue = 0; propValue < node.length; propValue++)
        i = multiple.hasOwnProperty("$" + node[propValue].value), node[propValue].selected !== i && (node[propValue].selected = i), i && setDefaultSelected && (node[propValue].defaultSelected = true);
    } else {
      propValue = "" + getToStringValue(propValue);
      multiple = null;
      for (i = 0; i < node.length; i++) {
        if (node[i].value === propValue) {
          node[i].selected = true;
          setDefaultSelected && (node[i].defaultSelected = true);
          return;
        }
        null !== multiple || node[i].disabled || (multiple = node[i]);
      }
      null !== multiple && (multiple.selected = true);
    }
  }
  function updateTextarea(element, value, defaultValue) {
    if (null != value && (value = "" + getToStringValue(value), value !== element.value && (element.value = value), null == defaultValue)) {
      element.defaultValue !== value && (element.defaultValue = value);
      return;
    }
    element.defaultValue = null != defaultValue ? "" + getToStringValue(defaultValue) : "";
  }
  function initTextarea(element, value, defaultValue, children) {
    if (null == value) {
      if (null != children) {
        if (null != defaultValue) throw Error(formatProdErrorMessage(92));
        if (isArrayImpl(children)) {
          if (1 < children.length) throw Error(formatProdErrorMessage(93));
          children = children[0];
        }
        defaultValue = children;
      }
      null == defaultValue && (defaultValue = "");
      value = defaultValue;
    }
    defaultValue = getToStringValue(value);
    element.defaultValue = defaultValue;
    children = element.textContent;
    children === defaultValue && "" !== children && null !== children && (element.value = children);
    track(element);
  }
  function setTextContent(node, text) {
    if (text) {
      var firstChild = node.firstChild;
      if (firstChild && firstChild === node.lastChild && 3 === firstChild.nodeType) {
        firstChild.nodeValue = text;
        return;
      }
    }
    node.textContent = text;
  }
  var unitlessNumbers = new Set(
    "animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(
      " "
    )
  );
  function setValueForStyle(style2, styleName, value) {
    var isCustomProperty = 0 === styleName.indexOf("--");
    null == value || "boolean" === typeof value || "" === value ? isCustomProperty ? style2.setProperty(styleName, "") : "float" === styleName ? style2.cssFloat = "" : style2[styleName] = "" : isCustomProperty ? style2.setProperty(styleName, value) : "number" !== typeof value || 0 === value || unitlessNumbers.has(styleName) ? "float" === styleName ? style2.cssFloat = value : style2[styleName] = ("" + value).trim() : style2[styleName] = value + "px";
  }
  function setValueForStyles(node, styles, prevStyles) {
    if (null != styles && "object" !== typeof styles)
      throw Error(formatProdErrorMessage(62));
    node = node.style;
    if (null != prevStyles) {
      for (var styleName in prevStyles)
        !prevStyles.hasOwnProperty(styleName) || null != styles && styles.hasOwnProperty(styleName) || (0 === styleName.indexOf("--") ? node.setProperty(styleName, "") : "float" === styleName ? node.cssFloat = "" : node[styleName] = "");
      for (var styleName$16 in styles)
        styleName = styles[styleName$16], styles.hasOwnProperty(styleName$16) && prevStyles[styleName$16] !== styleName && setValueForStyle(node, styleName$16, styleName);
    } else
      for (var styleName$17 in styles)
        styles.hasOwnProperty(styleName$17) && setValueForStyle(node, styleName$17, styles[styleName$17]);
  }
  function isCustomElement(tagName) {
    if (-1 === tagName.indexOf("-")) return false;
    switch (tagName) {
      case "annotation-xml":
      case "color-profile":
      case "font-face":
      case "font-face-src":
      case "font-face-uri":
      case "font-face-format":
      case "font-face-name":
      case "missing-glyph":
        return false;
      default:
        return true;
    }
  }
  var aliases = /* @__PURE__ */ new Map([
    ["acceptCharset", "accept-charset"],
    ["htmlFor", "for"],
    ["httpEquiv", "http-equiv"],
    ["crossOrigin", "crossorigin"],
    ["accentHeight", "accent-height"],
    ["alignmentBaseline", "alignment-baseline"],
    ["arabicForm", "arabic-form"],
    ["baselineShift", "baseline-shift"],
    ["capHeight", "cap-height"],
    ["clipPath", "clip-path"],
    ["clipRule", "clip-rule"],
    ["colorInterpolation", "color-interpolation"],
    ["colorInterpolationFilters", "color-interpolation-filters"],
    ["colorProfile", "color-profile"],
    ["colorRendering", "color-rendering"],
    ["dominantBaseline", "dominant-baseline"],
    ["enableBackground", "enable-background"],
    ["fillOpacity", "fill-opacity"],
    ["fillRule", "fill-rule"],
    ["floodColor", "flood-color"],
    ["floodOpacity", "flood-opacity"],
    ["fontFamily", "font-family"],
    ["fontSize", "font-size"],
    ["fontSizeAdjust", "font-size-adjust"],
    ["fontStretch", "font-stretch"],
    ["fontStyle", "font-style"],
    ["fontVariant", "font-variant"],
    ["fontWeight", "font-weight"],
    ["glyphName", "glyph-name"],
    ["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
    ["glyphOrientationVertical", "glyph-orientation-vertical"],
    ["horizAdvX", "horiz-adv-x"],
    ["horizOriginX", "horiz-origin-x"],
    ["imageRendering", "image-rendering"],
    ["letterSpacing", "letter-spacing"],
    ["lightingColor", "lighting-color"],
    ["markerEnd", "marker-end"],
    ["markerMid", "marker-mid"],
    ["markerStart", "marker-start"],
    ["overlinePosition", "overline-position"],
    ["overlineThickness", "overline-thickness"],
    ["paintOrder", "paint-order"],
    ["panose-1", "panose-1"],
    ["pointerEvents", "pointer-events"],
    ["renderingIntent", "rendering-intent"],
    ["shapeRendering", "shape-rendering"],
    ["stopColor", "stop-color"],
    ["stopOpacity", "stop-opacity"],
    ["strikethroughPosition", "strikethrough-position"],
    ["strikethroughThickness", "strikethrough-thickness"],
    ["strokeDasharray", "stroke-dasharray"],
    ["strokeDashoffset", "stroke-dashoffset"],
    ["strokeLinecap", "stroke-linecap"],
    ["strokeLinejoin", "stroke-linejoin"],
    ["strokeMiterlimit", "stroke-miterlimit"],
    ["strokeOpacity", "stroke-opacity"],
    ["strokeWidth", "stroke-width"],
    ["textAnchor", "text-anchor"],
    ["textDecoration", "text-decoration"],
    ["textRendering", "text-rendering"],
    ["transformOrigin", "transform-origin"],
    ["underlinePosition", "underline-position"],
    ["underlineThickness", "underline-thickness"],
    ["unicodeBidi", "unicode-bidi"],
    ["unicodeRange", "unicode-range"],
    ["unitsPerEm", "units-per-em"],
    ["vAlphabetic", "v-alphabetic"],
    ["vHanging", "v-hanging"],
    ["vIdeographic", "v-ideographic"],
    ["vMathematical", "v-mathematical"],
    ["vectorEffect", "vector-effect"],
    ["vertAdvY", "vert-adv-y"],
    ["vertOriginX", "vert-origin-x"],
    ["vertOriginY", "vert-origin-y"],
    ["wordSpacing", "word-spacing"],
    ["writingMode", "writing-mode"],
    ["xmlnsXlink", "xmlns:xlink"],
    ["xHeight", "x-height"]
  ]), isJavaScriptProtocol = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
  function sanitizeURL(url) {
    return isJavaScriptProtocol.test("" + url) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : url;
  }
  function noop$1() {
  }
  var currentReplayingEvent = null;
  function getEventTarget(nativeEvent) {
    nativeEvent = nativeEvent.target || nativeEvent.srcElement || window;
    nativeEvent.correspondingUseElement && (nativeEvent = nativeEvent.correspondingUseElement);
    return 3 === nativeEvent.nodeType ? nativeEvent.parentNode : nativeEvent;
  }
  var restoreTarget = null, restoreQueue = null;
  function restoreStateOfTarget(target) {
    var internalInstance = getInstanceFromNode(target);
    if (internalInstance && (target = internalInstance.stateNode)) {
      var props = target[internalPropsKey] || null;
      a: switch (target = internalInstance.stateNode, internalInstance.type) {
        case "input":
          updateInput(
            target,
            props.value,
            props.defaultValue,
            props.defaultValue,
            props.checked,
            props.defaultChecked,
            props.type,
            props.name
          );
          internalInstance = props.name;
          if ("radio" === props.type && null != internalInstance) {
            for (props = target; props.parentNode; ) props = props.parentNode;
            props = props.querySelectorAll(
              'input[name="' + escapeSelectorAttributeValueInsideDoubleQuotes(
                "" + internalInstance
              ) + '"][type="radio"]'
            );
            for (internalInstance = 0; internalInstance < props.length; internalInstance++) {
              var otherNode = props[internalInstance];
              if (otherNode !== target && otherNode.form === target.form) {
                var otherProps = otherNode[internalPropsKey] || null;
                if (!otherProps) throw Error(formatProdErrorMessage(90));
                updateInput(
                  otherNode,
                  otherProps.value,
                  otherProps.defaultValue,
                  otherProps.defaultValue,
                  otherProps.checked,
                  otherProps.defaultChecked,
                  otherProps.type,
                  otherProps.name
                );
              }
            }
            for (internalInstance = 0; internalInstance < props.length; internalInstance++)
              otherNode = props[internalInstance], otherNode.form === target.form && updateValueIfChanged(otherNode);
          }
          break a;
        case "textarea":
          updateTextarea(target, props.value, props.defaultValue);
          break a;
        case "select":
          internalInstance = props.value, null != internalInstance && updateOptions(target, !!props.multiple, internalInstance, false);
      }
    }
  }
  var isInsideEventHandler = false;
  function batchedUpdates$1(fn, a, b) {
    if (isInsideEventHandler) return fn(a, b);
    isInsideEventHandler = true;
    try {
      var JSCompiler_inline_result = fn(a);
      return JSCompiler_inline_result;
    } finally {
      if (isInsideEventHandler = false, null !== restoreTarget || null !== restoreQueue) {
        if (flushSyncWork$1(), restoreTarget && (a = restoreTarget, fn = restoreQueue, restoreQueue = restoreTarget = null, restoreStateOfTarget(a), fn))
          for (a = 0; a < fn.length; a++) restoreStateOfTarget(fn[a]);
      }
    }
  }
  function getListener(inst, registrationName) {
    var stateNode = inst.stateNode;
    if (null === stateNode) return null;
    var props = stateNode[internalPropsKey] || null;
    if (null === props) return null;
    stateNode = props[registrationName];
    a: switch (registrationName) {
      case "onClick":
      case "onClickCapture":
      case "onDoubleClick":
      case "onDoubleClickCapture":
      case "onMouseDown":
      case "onMouseDownCapture":
      case "onMouseMove":
      case "onMouseMoveCapture":
      case "onMouseUp":
      case "onMouseUpCapture":
      case "onMouseEnter":
        (props = !props.disabled) || (inst = inst.type, props = !("button" === inst || "input" === inst || "select" === inst || "textarea" === inst));
        inst = !props;
        break a;
      default:
        inst = false;
    }
    if (inst) return null;
    if (stateNode && "function" !== typeof stateNode)
      throw Error(
        formatProdErrorMessage(231, registrationName, typeof stateNode)
      );
    return stateNode;
  }
  var canUseDOM = !("undefined" === typeof window || "undefined" === typeof window.document || "undefined" === typeof window.document.createElement), passiveBrowserEventsSupported = false;
  if (canUseDOM)
    try {
      var options = {};
      Object.defineProperty(options, "passive", {
        get: function() {
          passiveBrowserEventsSupported = true;
        }
      });
      window.addEventListener("test", options, options);
      window.removeEventListener("test", options, options);
    } catch (e) {
      passiveBrowserEventsSupported = false;
    }
  var root = null, startText = null, fallbackText = null;
  function getData() {
    if (fallbackText) return fallbackText;
    var start, startValue = startText, startLength = startValue.length, end, endValue = "value" in root ? root.value : root.textContent, endLength = endValue.length;
    for (start = 0; start < startLength && startValue[start] === endValue[start]; start++) ;
    var minEnd = startLength - start;
    for (end = 1; end <= minEnd && startValue[startLength - end] === endValue[endLength - end]; end++) ;
    return fallbackText = endValue.slice(start, 1 < end ? 1 - end : void 0);
  }
  function getEventCharCode(nativeEvent) {
    var keyCode = nativeEvent.keyCode;
    "charCode" in nativeEvent ? (nativeEvent = nativeEvent.charCode, 0 === nativeEvent && 13 === keyCode && (nativeEvent = 13)) : nativeEvent = keyCode;
    10 === nativeEvent && (nativeEvent = 13);
    return 32 <= nativeEvent || 13 === nativeEvent ? nativeEvent : 0;
  }
  function functionThatReturnsTrue() {
    return true;
  }
  function functionThatReturnsFalse() {
    return false;
  }
  function createSyntheticEvent(Interface) {
    function SyntheticBaseEvent(reactName, reactEventType, targetInst, nativeEvent, nativeEventTarget) {
      this._reactName = reactName;
      this._targetInst = targetInst;
      this.type = reactEventType;
      this.nativeEvent = nativeEvent;
      this.target = nativeEventTarget;
      this.currentTarget = null;
      for (var propName in Interface)
        Interface.hasOwnProperty(propName) && (reactName = Interface[propName], this[propName] = reactName ? reactName(nativeEvent) : nativeEvent[propName]);
      this.isDefaultPrevented = (null != nativeEvent.defaultPrevented ? nativeEvent.defaultPrevented : false === nativeEvent.returnValue) ? functionThatReturnsTrue : functionThatReturnsFalse;
      this.isPropagationStopped = functionThatReturnsFalse;
      return this;
    }
    assign(SyntheticBaseEvent.prototype, {
      preventDefault: function() {
        this.defaultPrevented = true;
        var event = this.nativeEvent;
        event && (event.preventDefault ? event.preventDefault() : "unknown" !== typeof event.returnValue && (event.returnValue = false), this.isDefaultPrevented = functionThatReturnsTrue);
      },
      stopPropagation: function() {
        var event = this.nativeEvent;
        event && (event.stopPropagation ? event.stopPropagation() : "unknown" !== typeof event.cancelBubble && (event.cancelBubble = true), this.isPropagationStopped = functionThatReturnsTrue);
      },
      persist: function() {
      },
      isPersistent: functionThatReturnsTrue
    });
    return SyntheticBaseEvent;
  }
  var EventInterface = {
    eventPhase: 0,
    bubbles: 0,
    cancelable: 0,
    timeStamp: function(event) {
      return event.timeStamp || Date.now();
    },
    defaultPrevented: 0,
    isTrusted: 0
  }, SyntheticEvent = createSyntheticEvent(EventInterface), UIEventInterface = assign({}, EventInterface, { view: 0, detail: 0 }), SyntheticUIEvent = createSyntheticEvent(UIEventInterface), lastMovementX, lastMovementY, lastMouseEvent, MouseEventInterface = assign({}, UIEventInterface, {
    screenX: 0,
    screenY: 0,
    clientX: 0,
    clientY: 0,
    pageX: 0,
    pageY: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    getModifierState: getEventModifierState,
    button: 0,
    buttons: 0,
    relatedTarget: function(event) {
      return void 0 === event.relatedTarget ? event.fromElement === event.srcElement ? event.toElement : event.fromElement : event.relatedTarget;
    },
    movementX: function(event) {
      if ("movementX" in event) return event.movementX;
      event !== lastMouseEvent && (lastMouseEvent && "mousemove" === event.type ? (lastMovementX = event.screenX - lastMouseEvent.screenX, lastMovementY = event.screenY - lastMouseEvent.screenY) : lastMovementY = lastMovementX = 0, lastMouseEvent = event);
      return lastMovementX;
    },
    movementY: function(event) {
      return "movementY" in event ? event.movementY : lastMovementY;
    }
  }), SyntheticMouseEvent = createSyntheticEvent(MouseEventInterface), DragEventInterface = assign({}, MouseEventInterface, { dataTransfer: 0 }), SyntheticDragEvent = createSyntheticEvent(DragEventInterface), FocusEventInterface = assign({}, UIEventInterface, { relatedTarget: 0 }), SyntheticFocusEvent = createSyntheticEvent(FocusEventInterface), AnimationEventInterface = assign({}, EventInterface, {
    animationName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), SyntheticAnimationEvent = createSyntheticEvent(AnimationEventInterface), ClipboardEventInterface = assign({}, EventInterface, {
    clipboardData: function(event) {
      return "clipboardData" in event ? event.clipboardData : window.clipboardData;
    }
  }), SyntheticClipboardEvent = createSyntheticEvent(ClipboardEventInterface), CompositionEventInterface = assign({}, EventInterface, { data: 0 }), SyntheticCompositionEvent = createSyntheticEvent(CompositionEventInterface), normalizeKey = {
    Esc: "Escape",
    Spacebar: " ",
    Left: "ArrowLeft",
    Up: "ArrowUp",
    Right: "ArrowRight",
    Down: "ArrowDown",
    Del: "Delete",
    Win: "OS",
    Menu: "ContextMenu",
    Apps: "ContextMenu",
    Scroll: "ScrollLock",
    MozPrintableKey: "Unidentified"
  }, translateToKey = {
    8: "Backspace",
    9: "Tab",
    12: "Clear",
    13: "Enter",
    16: "Shift",
    17: "Control",
    18: "Alt",
    19: "Pause",
    20: "CapsLock",
    27: "Escape",
    32: " ",
    33: "PageUp",
    34: "PageDown",
    35: "End",
    36: "Home",
    37: "ArrowLeft",
    38: "ArrowUp",
    39: "ArrowRight",
    40: "ArrowDown",
    45: "Insert",
    46: "Delete",
    112: "F1",
    113: "F2",
    114: "F3",
    115: "F4",
    116: "F5",
    117: "F6",
    118: "F7",
    119: "F8",
    120: "F9",
    121: "F10",
    122: "F11",
    123: "F12",
    144: "NumLock",
    145: "ScrollLock",
    224: "Meta"
  }, modifierKeyToProp = {
    Alt: "altKey",
    Control: "ctrlKey",
    Meta: "metaKey",
    Shift: "shiftKey"
  };
  function modifierStateGetter(keyArg) {
    var nativeEvent = this.nativeEvent;
    return nativeEvent.getModifierState ? nativeEvent.getModifierState(keyArg) : (keyArg = modifierKeyToProp[keyArg]) ? !!nativeEvent[keyArg] : false;
  }
  function getEventModifierState() {
    return modifierStateGetter;
  }
  var KeyboardEventInterface = assign({}, UIEventInterface, {
    key: function(nativeEvent) {
      if (nativeEvent.key) {
        var key = normalizeKey[nativeEvent.key] || nativeEvent.key;
        if ("Unidentified" !== key) return key;
      }
      return "keypress" === nativeEvent.type ? (nativeEvent = getEventCharCode(nativeEvent), 13 === nativeEvent ? "Enter" : String.fromCharCode(nativeEvent)) : "keydown" === nativeEvent.type || "keyup" === nativeEvent.type ? translateToKey[nativeEvent.keyCode] || "Unidentified" : "";
    },
    code: 0,
    location: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    repeat: 0,
    locale: 0,
    getModifierState: getEventModifierState,
    charCode: function(event) {
      return "keypress" === event.type ? getEventCharCode(event) : 0;
    },
    keyCode: function(event) {
      return "keydown" === event.type || "keyup" === event.type ? event.keyCode : 0;
    },
    which: function(event) {
      return "keypress" === event.type ? getEventCharCode(event) : "keydown" === event.type || "keyup" === event.type ? event.keyCode : 0;
    }
  }), SyntheticKeyboardEvent = createSyntheticEvent(KeyboardEventInterface), PointerEventInterface = assign({}, MouseEventInterface, {
    pointerId: 0,
    width: 0,
    height: 0,
    pressure: 0,
    tangentialPressure: 0,
    tiltX: 0,
    tiltY: 0,
    twist: 0,
    pointerType: 0,
    isPrimary: 0
  }), SyntheticPointerEvent = createSyntheticEvent(PointerEventInterface), TouchEventInterface = assign({}, UIEventInterface, {
    touches: 0,
    targetTouches: 0,
    changedTouches: 0,
    altKey: 0,
    metaKey: 0,
    ctrlKey: 0,
    shiftKey: 0,
    getModifierState: getEventModifierState
  }), SyntheticTouchEvent = createSyntheticEvent(TouchEventInterface), TransitionEventInterface = assign({}, EventInterface, {
    propertyName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), SyntheticTransitionEvent = createSyntheticEvent(TransitionEventInterface), WheelEventInterface = assign({}, MouseEventInterface, {
    deltaX: function(event) {
      return "deltaX" in event ? event.deltaX : "wheelDeltaX" in event ? -event.wheelDeltaX : 0;
    },
    deltaY: function(event) {
      return "deltaY" in event ? event.deltaY : "wheelDeltaY" in event ? -event.wheelDeltaY : "wheelDelta" in event ? -event.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), SyntheticWheelEvent = createSyntheticEvent(WheelEventInterface), ToggleEventInterface = assign({}, EventInterface, {
    newState: 0,
    oldState: 0
  }), SyntheticToggleEvent = createSyntheticEvent(ToggleEventInterface), END_KEYCODES = [9, 13, 27, 32], canUseCompositionEvent = canUseDOM && "CompositionEvent" in window, documentMode = null;
  canUseDOM && "documentMode" in document && (documentMode = document.documentMode);
  var canUseTextInputEvent = canUseDOM && "TextEvent" in window && !documentMode, useFallbackCompositionData = canUseDOM && (!canUseCompositionEvent || documentMode && 8 < documentMode && 11 >= documentMode), SPACEBAR_CHAR = String.fromCharCode(32), hasSpaceKeypress = false;
  function isFallbackCompositionEnd(domEventName, nativeEvent) {
    switch (domEventName) {
      case "keyup":
        return -1 !== END_KEYCODES.indexOf(nativeEvent.keyCode);
      case "keydown":
        return 229 !== nativeEvent.keyCode;
      case "keypress":
      case "mousedown":
      case "focusout":
        return true;
      default:
        return false;
    }
  }
  function getDataFromCustomEvent(nativeEvent) {
    nativeEvent = nativeEvent.detail;
    return "object" === typeof nativeEvent && "data" in nativeEvent ? nativeEvent.data : null;
  }
  var isComposing = false;
  function getNativeBeforeInputChars(domEventName, nativeEvent) {
    switch (domEventName) {
      case "compositionend":
        return getDataFromCustomEvent(nativeEvent);
      case "keypress":
        if (32 !== nativeEvent.which) return null;
        hasSpaceKeypress = true;
        return SPACEBAR_CHAR;
      case "textInput":
        return domEventName = nativeEvent.data, domEventName === SPACEBAR_CHAR && hasSpaceKeypress ? null : domEventName;
      default:
        return null;
    }
  }
  function getFallbackBeforeInputChars(domEventName, nativeEvent) {
    if (isComposing)
      return "compositionend" === domEventName || !canUseCompositionEvent && isFallbackCompositionEnd(domEventName, nativeEvent) ? (domEventName = getData(), fallbackText = startText = root = null, isComposing = false, domEventName) : null;
    switch (domEventName) {
      case "paste":
        return null;
      case "keypress":
        if (!(nativeEvent.ctrlKey || nativeEvent.altKey || nativeEvent.metaKey) || nativeEvent.ctrlKey && nativeEvent.altKey) {
          if (nativeEvent.char && 1 < nativeEvent.char.length)
            return nativeEvent.char;
          if (nativeEvent.which) return String.fromCharCode(nativeEvent.which);
        }
        return null;
      case "compositionend":
        return useFallbackCompositionData && "ko" !== nativeEvent.locale ? null : nativeEvent.data;
      default:
        return null;
    }
  }
  var supportedInputTypes = {
    color: true,
    date: true,
    datetime: true,
    "datetime-local": true,
    email: true,
    month: true,
    number: true,
    password: true,
    range: true,
    search: true,
    tel: true,
    text: true,
    time: true,
    url: true,
    week: true
  };
  function isTextInputElement(elem) {
    var nodeName = elem && elem.nodeName && elem.nodeName.toLowerCase();
    return "input" === nodeName ? !!supportedInputTypes[elem.type] : "textarea" === nodeName ? true : false;
  }
  function createAndAccumulateChangeEvent(dispatchQueue, inst, nativeEvent, target) {
    restoreTarget ? restoreQueue ? restoreQueue.push(target) : restoreQueue = [target] : restoreTarget = target;
    inst = accumulateTwoPhaseListeners(inst, "onChange");
    0 < inst.length && (nativeEvent = new SyntheticEvent(
      "onChange",
      "change",
      null,
      nativeEvent,
      target
    ), dispatchQueue.push({ event: nativeEvent, listeners: inst }));
  }
  var activeElement$1 = null, activeElementInst$1 = null;
  function runEventInBatch(dispatchQueue) {
    processDispatchQueue(dispatchQueue, 0);
  }
  function getInstIfValueChanged(targetInst) {
    var targetNode = getNodeFromInstance(targetInst);
    if (updateValueIfChanged(targetNode)) return targetInst;
  }
  function getTargetInstForChangeEvent(domEventName, targetInst) {
    if ("change" === domEventName) return targetInst;
  }
  var isInputEventSupported = false;
  if (canUseDOM) {
    var JSCompiler_inline_result$jscomp$286;
    if (canUseDOM) {
      var isSupported$jscomp$inline_427 = "oninput" in document;
      if (!isSupported$jscomp$inline_427) {
        var element$jscomp$inline_428 = document.createElement("div");
        element$jscomp$inline_428.setAttribute("oninput", "return;");
        isSupported$jscomp$inline_427 = "function" === typeof element$jscomp$inline_428.oninput;
      }
      JSCompiler_inline_result$jscomp$286 = isSupported$jscomp$inline_427;
    } else JSCompiler_inline_result$jscomp$286 = false;
    isInputEventSupported = JSCompiler_inline_result$jscomp$286 && (!document.documentMode || 9 < document.documentMode);
  }
  function stopWatchingForValueChange() {
    activeElement$1 && (activeElement$1.detachEvent("onpropertychange", handlePropertyChange), activeElementInst$1 = activeElement$1 = null);
  }
  function handlePropertyChange(nativeEvent) {
    if ("value" === nativeEvent.propertyName && getInstIfValueChanged(activeElementInst$1)) {
      var dispatchQueue = [];
      createAndAccumulateChangeEvent(
        dispatchQueue,
        activeElementInst$1,
        nativeEvent,
        getEventTarget(nativeEvent)
      );
      batchedUpdates$1(runEventInBatch, dispatchQueue);
    }
  }
  function handleEventsForInputEventPolyfill(domEventName, target, targetInst) {
    "focusin" === domEventName ? (stopWatchingForValueChange(), activeElement$1 = target, activeElementInst$1 = targetInst, activeElement$1.attachEvent("onpropertychange", handlePropertyChange)) : "focusout" === domEventName && stopWatchingForValueChange();
  }
  function getTargetInstForInputEventPolyfill(domEventName) {
    if ("selectionchange" === domEventName || "keyup" === domEventName || "keydown" === domEventName)
      return getInstIfValueChanged(activeElementInst$1);
  }
  function getTargetInstForClickEvent(domEventName, targetInst) {
    if ("click" === domEventName) return getInstIfValueChanged(targetInst);
  }
  function getTargetInstForInputOrChangeEvent(domEventName, targetInst) {
    if ("input" === domEventName || "change" === domEventName)
      return getInstIfValueChanged(targetInst);
  }
  function is(x, y) {
    return x === y && (0 !== x || 1 / x === 1 / y) || x !== x && y !== y;
  }
  var objectIs = "function" === typeof Object.is ? Object.is : is;
  function shallowEqual(objA, objB) {
    if (objectIs(objA, objB)) return true;
    if ("object" !== typeof objA || null === objA || "object" !== typeof objB || null === objB)
      return false;
    var keysA = Object.keys(objA), keysB = Object.keys(objB);
    if (keysA.length !== keysB.length) return false;
    for (keysB = 0; keysB < keysA.length; keysB++) {
      var currentKey = keysA[keysB];
      if (!hasOwnProperty.call(objB, currentKey) || !objectIs(objA[currentKey], objB[currentKey]))
        return false;
    }
    return true;
  }
  function getLeafNode(node) {
    for (; node && node.firstChild; ) node = node.firstChild;
    return node;
  }
  function getNodeForCharacterOffset(root2, offset) {
    var node = getLeafNode(root2);
    root2 = 0;
    for (var nodeEnd; node; ) {
      if (3 === node.nodeType) {
        nodeEnd = root2 + node.textContent.length;
        if (root2 <= offset && nodeEnd >= offset)
          return { node, offset: offset - root2 };
        root2 = nodeEnd;
      }
      a: {
        for (; node; ) {
          if (node.nextSibling) {
            node = node.nextSibling;
            break a;
          }
          node = node.parentNode;
        }
        node = void 0;
      }
      node = getLeafNode(node);
    }
  }
  function containsNode(outerNode, innerNode) {
    return outerNode && innerNode ? outerNode === innerNode ? true : outerNode && 3 === outerNode.nodeType ? false : innerNode && 3 === innerNode.nodeType ? containsNode(outerNode, innerNode.parentNode) : "contains" in outerNode ? outerNode.contains(innerNode) : outerNode.compareDocumentPosition ? !!(outerNode.compareDocumentPosition(innerNode) & 16) : false : false;
  }
  function getActiveElementDeep(containerInfo) {
    containerInfo = null != containerInfo && null != containerInfo.ownerDocument && null != containerInfo.ownerDocument.defaultView ? containerInfo.ownerDocument.defaultView : window;
    for (var element = getActiveElement(containerInfo.document); element instanceof containerInfo.HTMLIFrameElement; ) {
      try {
        var JSCompiler_inline_result = "string" === typeof element.contentWindow.location.href;
      } catch (err) {
        JSCompiler_inline_result = false;
      }
      if (JSCompiler_inline_result) containerInfo = element.contentWindow;
      else break;
      element = getActiveElement(containerInfo.document);
    }
    return element;
  }
  function hasSelectionCapabilities(elem) {
    var nodeName = elem && elem.nodeName && elem.nodeName.toLowerCase();
    return nodeName && ("input" === nodeName && ("text" === elem.type || "search" === elem.type || "tel" === elem.type || "url" === elem.type || "password" === elem.type) || "textarea" === nodeName || "true" === elem.contentEditable);
  }
  var skipSelectionChangeEvent = canUseDOM && "documentMode" in document && 11 >= document.documentMode, activeElement = null, activeElementInst = null, lastSelection = null, mouseDown = false;
  function constructSelectEvent(dispatchQueue, nativeEvent, nativeEventTarget) {
    var doc = nativeEventTarget.window === nativeEventTarget ? nativeEventTarget.document : 9 === nativeEventTarget.nodeType ? nativeEventTarget : nativeEventTarget.ownerDocument;
    mouseDown || null == activeElement || activeElement !== getActiveElement(doc) || (doc = activeElement, "selectionStart" in doc && hasSelectionCapabilities(doc) ? doc = { start: doc.selectionStart, end: doc.selectionEnd } : (doc = (doc.ownerDocument && doc.ownerDocument.defaultView || window).getSelection(), doc = {
      anchorNode: doc.anchorNode,
      anchorOffset: doc.anchorOffset,
      focusNode: doc.focusNode,
      focusOffset: doc.focusOffset
    }), lastSelection && shallowEqual(lastSelection, doc) || (lastSelection = doc, doc = accumulateTwoPhaseListeners(activeElementInst, "onSelect"), 0 < doc.length && (nativeEvent = new SyntheticEvent(
      "onSelect",
      "select",
      null,
      nativeEvent,
      nativeEventTarget
    ), dispatchQueue.push({ event: nativeEvent, listeners: doc }), nativeEvent.target = activeElement)));
  }
  function makePrefixMap(styleProp, eventName) {
    var prefixes = {};
    prefixes[styleProp.toLowerCase()] = eventName.toLowerCase();
    prefixes["Webkit" + styleProp] = "webkit" + eventName;
    prefixes["Moz" + styleProp] = "moz" + eventName;
    return prefixes;
  }
  var vendorPrefixes = {
    animationend: makePrefixMap("Animation", "AnimationEnd"),
    animationiteration: makePrefixMap("Animation", "AnimationIteration"),
    animationstart: makePrefixMap("Animation", "AnimationStart"),
    transitionrun: makePrefixMap("Transition", "TransitionRun"),
    transitionstart: makePrefixMap("Transition", "TransitionStart"),
    transitioncancel: makePrefixMap("Transition", "TransitionCancel"),
    transitionend: makePrefixMap("Transition", "TransitionEnd")
  }, prefixedEventNames = {}, style = {};
  canUseDOM && (style = document.createElement("div").style, "AnimationEvent" in window || (delete vendorPrefixes.animationend.animation, delete vendorPrefixes.animationiteration.animation, delete vendorPrefixes.animationstart.animation), "TransitionEvent" in window || delete vendorPrefixes.transitionend.transition);
  function getVendorPrefixedEventName(eventName) {
    if (prefixedEventNames[eventName]) return prefixedEventNames[eventName];
    if (!vendorPrefixes[eventName]) return eventName;
    var prefixMap = vendorPrefixes[eventName], styleProp;
    for (styleProp in prefixMap)
      if (prefixMap.hasOwnProperty(styleProp) && styleProp in style)
        return prefixedEventNames[eventName] = prefixMap[styleProp];
    return eventName;
  }
  var ANIMATION_END = getVendorPrefixedEventName("animationend"), ANIMATION_ITERATION = getVendorPrefixedEventName("animationiteration"), ANIMATION_START = getVendorPrefixedEventName("animationstart"), TRANSITION_RUN = getVendorPrefixedEventName("transitionrun"), TRANSITION_START = getVendorPrefixedEventName("transitionstart"), TRANSITION_CANCEL = getVendorPrefixedEventName("transitioncancel"), TRANSITION_END = getVendorPrefixedEventName("transitionend"), topLevelEventsToReactNames = /* @__PURE__ */ new Map(), simpleEventPluginEvents = "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(
    " "
  );
  simpleEventPluginEvents.push("scrollEnd");
  function registerSimpleEvent(domEventName, reactName) {
    topLevelEventsToReactNames.set(domEventName, reactName);
    registerTwoPhaseEvent(reactName, [domEventName]);
  }
  var reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
    if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
      var event = new window.ErrorEvent("error", {
        bubbles: true,
        cancelable: true,
        message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
        error
      });
      if (!window.dispatchEvent(event)) return;
    } else if ("object" === typeof process && "function" === typeof process.emit) {
      process.emit("uncaughtException", error);
      return;
    }
    console.error(error);
  }, concurrentQueues = [], concurrentQueuesIndex = 0, concurrentlyUpdatedLanes = 0;
  function finishQueueingConcurrentUpdates() {
    for (var endIndex = concurrentQueuesIndex, i = concurrentlyUpdatedLanes = concurrentQueuesIndex = 0; i < endIndex; ) {
      var fiber = concurrentQueues[i];
      concurrentQueues[i++] = null;
      var queue = concurrentQueues[i];
      concurrentQueues[i++] = null;
      var update = concurrentQueues[i];
      concurrentQueues[i++] = null;
      var lane = concurrentQueues[i];
      concurrentQueues[i++] = null;
      if (null !== queue && null !== update) {
        var pending = queue.pending;
        null === pending ? update.next = update : (update.next = pending.next, pending.next = update);
        queue.pending = update;
      }
      0 !== lane && markUpdateLaneFromFiberToRoot(fiber, update, lane);
    }
  }
  function enqueueUpdate$1(fiber, queue, update, lane) {
    concurrentQueues[concurrentQueuesIndex++] = fiber;
    concurrentQueues[concurrentQueuesIndex++] = queue;
    concurrentQueues[concurrentQueuesIndex++] = update;
    concurrentQueues[concurrentQueuesIndex++] = lane;
    concurrentlyUpdatedLanes |= lane;
    fiber.lanes |= lane;
    fiber = fiber.alternate;
    null !== fiber && (fiber.lanes |= lane);
  }
  function enqueueConcurrentHookUpdate(fiber, queue, update, lane) {
    enqueueUpdate$1(fiber, queue, update, lane);
    return getRootForUpdatedFiber(fiber);
  }
  function enqueueConcurrentRenderForLane(fiber, lane) {
    enqueueUpdate$1(fiber, null, null, lane);
    return getRootForUpdatedFiber(fiber);
  }
  function markUpdateLaneFromFiberToRoot(sourceFiber, update, lane) {
    sourceFiber.lanes |= lane;
    var alternate = sourceFiber.alternate;
    null !== alternate && (alternate.lanes |= lane);
    for (var isHidden = false, parent = sourceFiber.return; null !== parent; )
      parent.childLanes |= lane, alternate = parent.alternate, null !== alternate && (alternate.childLanes |= lane), 22 === parent.tag && (sourceFiber = parent.stateNode, null === sourceFiber || sourceFiber._visibility & 1 || (isHidden = true)), sourceFiber = parent, parent = parent.return;
    return 3 === sourceFiber.tag ? (parent = sourceFiber.stateNode, isHidden && null !== update && (isHidden = 31 - clz32(lane), sourceFiber = parent.hiddenUpdates, alternate = sourceFiber[isHidden], null === alternate ? sourceFiber[isHidden] = [update] : alternate.push(update), update.lane = lane | 536870912), parent) : null;
  }
  function getRootForUpdatedFiber(sourceFiber) {
    if (50 < nestedUpdateCount)
      throw nestedUpdateCount = 0, rootWithNestedUpdates = null, Error(formatProdErrorMessage(185));
    for (var parent = sourceFiber.return; null !== parent; )
      sourceFiber = parent, parent = sourceFiber.return;
    return 3 === sourceFiber.tag ? sourceFiber.stateNode : null;
  }
  var emptyContextObject = {};
  function FiberNode(tag, pendingProps, key, mode) {
    this.tag = tag;
    this.key = key;
    this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null;
    this.index = 0;
    this.refCleanup = this.ref = null;
    this.pendingProps = pendingProps;
    this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null;
    this.mode = mode;
    this.subtreeFlags = this.flags = 0;
    this.deletions = null;
    this.childLanes = this.lanes = 0;
    this.alternate = null;
  }
  function createFiberImplClass(tag, pendingProps, key, mode) {
    return new FiberNode(tag, pendingProps, key, mode);
  }
  function shouldConstruct(Component) {
    Component = Component.prototype;
    return !(!Component || !Component.isReactComponent);
  }
  function createWorkInProgress(current, pendingProps) {
    var workInProgress2 = current.alternate;
    null === workInProgress2 ? (workInProgress2 = createFiberImplClass(
      current.tag,
      pendingProps,
      current.key,
      current.mode
    ), workInProgress2.elementType = current.elementType, workInProgress2.type = current.type, workInProgress2.stateNode = current.stateNode, workInProgress2.alternate = current, current.alternate = workInProgress2) : (workInProgress2.pendingProps = pendingProps, workInProgress2.type = current.type, workInProgress2.flags = 0, workInProgress2.subtreeFlags = 0, workInProgress2.deletions = null);
    workInProgress2.flags = current.flags & 65011712;
    workInProgress2.childLanes = current.childLanes;
    workInProgress2.lanes = current.lanes;
    workInProgress2.child = current.child;
    workInProgress2.memoizedProps = current.memoizedProps;
    workInProgress2.memoizedState = current.memoizedState;
    workInProgress2.updateQueue = current.updateQueue;
    pendingProps = current.dependencies;
    workInProgress2.dependencies = null === pendingProps ? null : { lanes: pendingProps.lanes, firstContext: pendingProps.firstContext };
    workInProgress2.sibling = current.sibling;
    workInProgress2.index = current.index;
    workInProgress2.ref = current.ref;
    workInProgress2.refCleanup = current.refCleanup;
    return workInProgress2;
  }
  function resetWorkInProgress(workInProgress2, renderLanes2) {
    workInProgress2.flags &= 65011714;
    var current = workInProgress2.alternate;
    null === current ? (workInProgress2.childLanes = 0, workInProgress2.lanes = renderLanes2, workInProgress2.child = null, workInProgress2.subtreeFlags = 0, workInProgress2.memoizedProps = null, workInProgress2.memoizedState = null, workInProgress2.updateQueue = null, workInProgress2.dependencies = null, workInProgress2.stateNode = null) : (workInProgress2.childLanes = current.childLanes, workInProgress2.lanes = current.lanes, workInProgress2.child = current.child, workInProgress2.subtreeFlags = 0, workInProgress2.deletions = null, workInProgress2.memoizedProps = current.memoizedProps, workInProgress2.memoizedState = current.memoizedState, workInProgress2.updateQueue = current.updateQueue, workInProgress2.type = current.type, renderLanes2 = current.dependencies, workInProgress2.dependencies = null === renderLanes2 ? null : {
      lanes: renderLanes2.lanes,
      firstContext: renderLanes2.firstContext
    });
    return workInProgress2;
  }
  function createFiberFromTypeAndProps(type, key, pendingProps, owner, mode, lanes) {
    var fiberTag = 0;
    owner = type;
    if ("function" === typeof type) shouldConstruct(type) && (fiberTag = 1);
    else if ("string" === typeof type)
      fiberTag = isHostHoistableType(
        type,
        pendingProps,
        contextStackCursor.current
      ) ? 26 : "html" === type || "head" === type || "body" === type ? 27 : 5;
    else
      a: switch (type) {
        case REACT_ACTIVITY_TYPE:
          return type = createFiberImplClass(31, pendingProps, key, mode), type.elementType = REACT_ACTIVITY_TYPE, type.lanes = lanes, type;
        case REACT_FRAGMENT_TYPE:
          return createFiberFromFragment(pendingProps.children, mode, lanes, key);
        case REACT_STRICT_MODE_TYPE:
          fiberTag = 8;
          mode |= 24;
          break;
        case REACT_PROFILER_TYPE:
          return type = createFiberImplClass(12, pendingProps, key, mode | 2), type.elementType = REACT_PROFILER_TYPE, type.lanes = lanes, type;
        case REACT_SUSPENSE_TYPE:
          return type = createFiberImplClass(13, pendingProps, key, mode), type.elementType = REACT_SUSPENSE_TYPE, type.lanes = lanes, type;
        case REACT_SUSPENSE_LIST_TYPE:
          return type = createFiberImplClass(19, pendingProps, key, mode), type.elementType = REACT_SUSPENSE_LIST_TYPE, type.lanes = lanes, type;
        default:
          if ("object" === typeof type && null !== type)
            switch (type.$$typeof) {
              case REACT_CONTEXT_TYPE:
                fiberTag = 10;
                break a;
              case REACT_CONSUMER_TYPE:
                fiberTag = 9;
                break a;
              case REACT_FORWARD_REF_TYPE:
                fiberTag = 11;
                break a;
              case REACT_MEMO_TYPE:
                fiberTag = 14;
                break a;
              case REACT_LAZY_TYPE:
                fiberTag = 16;
                owner = null;
                break a;
            }
          fiberTag = 29;
          pendingProps = Error(
            formatProdErrorMessage(130, null === type ? "null" : typeof type, "")
          );
          owner = null;
      }
    key = createFiberImplClass(fiberTag, pendingProps, key, mode);
    key.elementType = type;
    key.type = owner;
    key.lanes = lanes;
    return key;
  }
  function createFiberFromFragment(elements, mode, lanes, key) {
    elements = createFiberImplClass(7, elements, key, mode);
    elements.lanes = lanes;
    return elements;
  }
  function createFiberFromText(content, mode, lanes) {
    content = createFiberImplClass(6, content, null, mode);
    content.lanes = lanes;
    return content;
  }
  function createFiberFromDehydratedFragment(dehydratedNode) {
    var fiber = createFiberImplClass(18, null, null, 0);
    fiber.stateNode = dehydratedNode;
    return fiber;
  }
  function createFiberFromPortal(portal, mode, lanes) {
    mode = createFiberImplClass(
      4,
      null !== portal.children ? portal.children : [],
      portal.key,
      mode
    );
    mode.lanes = lanes;
    mode.stateNode = {
      containerInfo: portal.containerInfo,
      pendingChildren: null,
      implementation: portal.implementation
    };
    return mode;
  }
  var CapturedStacks = /* @__PURE__ */ new WeakMap();
  function createCapturedValueAtFiber(value, source) {
    if ("object" === typeof value && null !== value) {
      var existing = CapturedStacks.get(value);
      if (void 0 !== existing) return existing;
      source = {
        value,
        source,
        stack: getStackByFiberInDevAndProd(source)
      };
      CapturedStacks.set(value, source);
      return source;
    }
    return {
      value,
      source,
      stack: getStackByFiberInDevAndProd(source)
    };
  }
  var forkStack = [], forkStackIndex = 0, treeForkProvider = null, treeForkCount = 0, idStack = [], idStackIndex = 0, treeContextProvider = null, treeContextId = 1, treeContextOverflow = "";
  function pushTreeFork(workInProgress2, totalChildren) {
    forkStack[forkStackIndex++] = treeForkCount;
    forkStack[forkStackIndex++] = treeForkProvider;
    treeForkProvider = workInProgress2;
    treeForkCount = totalChildren;
  }
  function pushTreeId(workInProgress2, totalChildren, index2) {
    idStack[idStackIndex++] = treeContextId;
    idStack[idStackIndex++] = treeContextOverflow;
    idStack[idStackIndex++] = treeContextProvider;
    treeContextProvider = workInProgress2;
    var baseIdWithLeadingBit = treeContextId;
    workInProgress2 = treeContextOverflow;
    var baseLength = 32 - clz32(baseIdWithLeadingBit) - 1;
    baseIdWithLeadingBit &= ~(1 << baseLength);
    index2 += 1;
    var length = 32 - clz32(totalChildren) + baseLength;
    if (30 < length) {
      var numberOfOverflowBits = baseLength - baseLength % 5;
      length = (baseIdWithLeadingBit & (1 << numberOfOverflowBits) - 1).toString(32);
      baseIdWithLeadingBit >>= numberOfOverflowBits;
      baseLength -= numberOfOverflowBits;
      treeContextId = 1 << 32 - clz32(totalChildren) + baseLength | index2 << baseLength | baseIdWithLeadingBit;
      treeContextOverflow = length + workInProgress2;
    } else
      treeContextId = 1 << length | index2 << baseLength | baseIdWithLeadingBit, treeContextOverflow = workInProgress2;
  }
  function pushMaterializedTreeId(workInProgress2) {
    null !== workInProgress2.return && (pushTreeFork(workInProgress2, 1), pushTreeId(workInProgress2, 1, 0));
  }
  function popTreeContext(workInProgress2) {
    for (; workInProgress2 === treeForkProvider; )
      treeForkProvider = forkStack[--forkStackIndex], forkStack[forkStackIndex] = null, treeForkCount = forkStack[--forkStackIndex], forkStack[forkStackIndex] = null;
    for (; workInProgress2 === treeContextProvider; )
      treeContextProvider = idStack[--idStackIndex], idStack[idStackIndex] = null, treeContextOverflow = idStack[--idStackIndex], idStack[idStackIndex] = null, treeContextId = idStack[--idStackIndex], idStack[idStackIndex] = null;
  }
  function restoreSuspendedTreeContext(workInProgress2, suspendedContext) {
    idStack[idStackIndex++] = treeContextId;
    idStack[idStackIndex++] = treeContextOverflow;
    idStack[idStackIndex++] = treeContextProvider;
    treeContextId = suspendedContext.id;
    treeContextOverflow = suspendedContext.overflow;
    treeContextProvider = workInProgress2;
  }
  var hydrationParentFiber = null, nextHydratableInstance = null, isHydrating = false, hydrationErrors = null, rootOrSingletonContext = false, HydrationMismatchException = Error(formatProdErrorMessage(519));
  function throwOnHydrationMismatch(fiber) {
    var error = Error(
      formatProdErrorMessage(
        418,
        1 < arguments.length && void 0 !== arguments[1] && arguments[1] ? "text" : "HTML",
        ""
      )
    );
    queueHydrationError(createCapturedValueAtFiber(error, fiber));
    throw HydrationMismatchException;
  }
  function prepareToHydrateHostInstance(fiber) {
    var instance = fiber.stateNode, type = fiber.type, props = fiber.memoizedProps;
    instance[internalInstanceKey] = fiber;
    instance[internalPropsKey] = props;
    switch (type) {
      case "dialog":
        listenToNonDelegatedEvent("cancel", instance);
        listenToNonDelegatedEvent("close", instance);
        break;
      case "iframe":
      case "object":
      case "embed":
        listenToNonDelegatedEvent("load", instance);
        break;
      case "video":
      case "audio":
        for (type = 0; type < mediaEventTypes.length; type++)
          listenToNonDelegatedEvent(mediaEventTypes[type], instance);
        break;
      case "source":
        listenToNonDelegatedEvent("error", instance);
        break;
      case "img":
      case "image":
      case "link":
        listenToNonDelegatedEvent("error", instance);
        listenToNonDelegatedEvent("load", instance);
        break;
      case "details":
        listenToNonDelegatedEvent("toggle", instance);
        break;
      case "input":
        listenToNonDelegatedEvent("invalid", instance);
        initInput(
          instance,
          props.value,
          props.defaultValue,
          props.checked,
          props.defaultChecked,
          props.type,
          props.name,
          true
        );
        break;
      case "select":
        listenToNonDelegatedEvent("invalid", instance);
        break;
      case "textarea":
        listenToNonDelegatedEvent("invalid", instance), initTextarea(instance, props.value, props.defaultValue, props.children);
    }
    type = props.children;
    "string" !== typeof type && "number" !== typeof type && "bigint" !== typeof type || instance.textContent === "" + type || true === props.suppressHydrationWarning || checkForUnmatchedText(instance.textContent, type) ? (null != props.popover && (listenToNonDelegatedEvent("beforetoggle", instance), listenToNonDelegatedEvent("toggle", instance)), null != props.onScroll && listenToNonDelegatedEvent("scroll", instance), null != props.onScrollEnd && listenToNonDelegatedEvent("scrollend", instance), null != props.onClick && (instance.onclick = noop$1), instance = true) : instance = false;
    instance || throwOnHydrationMismatch(fiber, true);
  }
  function popToNextHostParent(fiber) {
    for (hydrationParentFiber = fiber.return; hydrationParentFiber; )
      switch (hydrationParentFiber.tag) {
        case 5:
        case 31:
        case 13:
          rootOrSingletonContext = false;
          return;
        case 27:
        case 3:
          rootOrSingletonContext = true;
          return;
        default:
          hydrationParentFiber = hydrationParentFiber.return;
      }
  }
  function popHydrationState(fiber) {
    if (fiber !== hydrationParentFiber) return false;
    if (!isHydrating) return popToNextHostParent(fiber), isHydrating = true, false;
    var tag = fiber.tag, JSCompiler_temp;
    if (JSCompiler_temp = 3 !== tag && 27 !== tag) {
      if (JSCompiler_temp = 5 === tag)
        JSCompiler_temp = fiber.type, JSCompiler_temp = !("form" !== JSCompiler_temp && "button" !== JSCompiler_temp) || shouldSetTextContent(fiber.type, fiber.memoizedProps);
      JSCompiler_temp = !JSCompiler_temp;
    }
    JSCompiler_temp && nextHydratableInstance && throwOnHydrationMismatch(fiber);
    popToNextHostParent(fiber);
    if (13 === tag) {
      fiber = fiber.memoizedState;
      fiber = null !== fiber ? fiber.dehydrated : null;
      if (!fiber) throw Error(formatProdErrorMessage(317));
      nextHydratableInstance = getNextHydratableInstanceAfterHydrationBoundary(fiber);
    } else if (31 === tag) {
      fiber = fiber.memoizedState;
      fiber = null !== fiber ? fiber.dehydrated : null;
      if (!fiber) throw Error(formatProdErrorMessage(317));
      nextHydratableInstance = getNextHydratableInstanceAfterHydrationBoundary(fiber);
    } else
      27 === tag ? (tag = nextHydratableInstance, isSingletonScope(fiber.type) ? (fiber = previousHydratableOnEnteringScopedSingleton, previousHydratableOnEnteringScopedSingleton = null, nextHydratableInstance = fiber) : nextHydratableInstance = tag) : nextHydratableInstance = hydrationParentFiber ? getNextHydratable(fiber.stateNode.nextSibling) : null;
    return true;
  }
  function resetHydrationState() {
    nextHydratableInstance = hydrationParentFiber = null;
    isHydrating = false;
  }
  function upgradeHydrationErrorsToRecoverable() {
    var queuedErrors = hydrationErrors;
    null !== queuedErrors && (null === workInProgressRootRecoverableErrors ? workInProgressRootRecoverableErrors = queuedErrors : workInProgressRootRecoverableErrors.push.apply(
      workInProgressRootRecoverableErrors,
      queuedErrors
    ), hydrationErrors = null);
    return queuedErrors;
  }
  function queueHydrationError(error) {
    null === hydrationErrors ? hydrationErrors = [error] : hydrationErrors.push(error);
  }
  var valueCursor = createCursor(null), currentlyRenderingFiber$1 = null, lastContextDependency = null;
  function pushProvider(providerFiber, context, nextValue) {
    push(valueCursor, context._currentValue);
    context._currentValue = nextValue;
  }
  function popProvider(context) {
    context._currentValue = valueCursor.current;
    pop(valueCursor);
  }
  function scheduleContextWorkOnParentPath(parent, renderLanes2, propagationRoot) {
    for (; null !== parent; ) {
      var alternate = parent.alternate;
      (parent.childLanes & renderLanes2) !== renderLanes2 ? (parent.childLanes |= renderLanes2, null !== alternate && (alternate.childLanes |= renderLanes2)) : null !== alternate && (alternate.childLanes & renderLanes2) !== renderLanes2 && (alternate.childLanes |= renderLanes2);
      if (parent === propagationRoot) break;
      parent = parent.return;
    }
  }
  function propagateContextChanges(workInProgress2, contexts, renderLanes2, forcePropagateEntireTree) {
    var fiber = workInProgress2.child;
    null !== fiber && (fiber.return = workInProgress2);
    for (; null !== fiber; ) {
      var list = fiber.dependencies;
      if (null !== list) {
        var nextFiber = fiber.child;
        list = list.firstContext;
        a: for (; null !== list; ) {
          var dependency = list;
          list = fiber;
          for (var i = 0; i < contexts.length; i++)
            if (dependency.context === contexts[i]) {
              list.lanes |= renderLanes2;
              dependency = list.alternate;
              null !== dependency && (dependency.lanes |= renderLanes2);
              scheduleContextWorkOnParentPath(
                list.return,
                renderLanes2,
                workInProgress2
              );
              forcePropagateEntireTree || (nextFiber = null);
              break a;
            }
          list = dependency.next;
        }
      } else if (18 === fiber.tag) {
        nextFiber = fiber.return;
        if (null === nextFiber) throw Error(formatProdErrorMessage(341));
        nextFiber.lanes |= renderLanes2;
        list = nextFiber.alternate;
        null !== list && (list.lanes |= renderLanes2);
        scheduleContextWorkOnParentPath(nextFiber, renderLanes2, workInProgress2);
        nextFiber = null;
      } else nextFiber = fiber.child;
      if (null !== nextFiber) nextFiber.return = fiber;
      else
        for (nextFiber = fiber; null !== nextFiber; ) {
          if (nextFiber === workInProgress2) {
            nextFiber = null;
            break;
          }
          fiber = nextFiber.sibling;
          if (null !== fiber) {
            fiber.return = nextFiber.return;
            nextFiber = fiber;
            break;
          }
          nextFiber = nextFiber.return;
        }
      fiber = nextFiber;
    }
  }
  function propagateParentContextChanges(current, workInProgress2, renderLanes2, forcePropagateEntireTree) {
    current = null;
    for (var parent = workInProgress2, isInsidePropagationBailout = false; null !== parent; ) {
      if (!isInsidePropagationBailout) {
        if (0 !== (parent.flags & 524288)) isInsidePropagationBailout = true;
        else if (0 !== (parent.flags & 262144)) break;
      }
      if (10 === parent.tag) {
        var currentParent = parent.alternate;
        if (null === currentParent) throw Error(formatProdErrorMessage(387));
        currentParent = currentParent.memoizedProps;
        if (null !== currentParent) {
          var context = parent.type;
          objectIs(parent.pendingProps.value, currentParent.value) || (null !== current ? current.push(context) : current = [context]);
        }
      } else if (parent === hostTransitionProviderCursor.current) {
        currentParent = parent.alternate;
        if (null === currentParent) throw Error(formatProdErrorMessage(387));
        currentParent.memoizedState.memoizedState !== parent.memoizedState.memoizedState && (null !== current ? current.push(HostTransitionContext) : current = [HostTransitionContext]);
      }
      parent = parent.return;
    }
    null !== current && propagateContextChanges(
      workInProgress2,
      current,
      renderLanes2,
      forcePropagateEntireTree
    );
    workInProgress2.flags |= 262144;
  }
  function checkIfContextChanged(currentDependencies) {
    for (currentDependencies = currentDependencies.firstContext; null !== currentDependencies; ) {
      if (!objectIs(
        currentDependencies.context._currentValue,
        currentDependencies.memoizedValue
      ))
        return true;
      currentDependencies = currentDependencies.next;
    }
    return false;
  }
  function prepareToReadContext(workInProgress2) {
    currentlyRenderingFiber$1 = workInProgress2;
    lastContextDependency = null;
    workInProgress2 = workInProgress2.dependencies;
    null !== workInProgress2 && (workInProgress2.firstContext = null);
  }
  function readContext(context) {
    return readContextForConsumer(currentlyRenderingFiber$1, context);
  }
  function readContextDuringReconciliation(consumer, context) {
    null === currentlyRenderingFiber$1 && prepareToReadContext(consumer);
    return readContextForConsumer(consumer, context);
  }
  function readContextForConsumer(consumer, context) {
    var value = context._currentValue;
    context = { context, memoizedValue: value, next: null };
    if (null === lastContextDependency) {
      if (null === consumer) throw Error(formatProdErrorMessage(308));
      lastContextDependency = context;
      consumer.dependencies = { lanes: 0, firstContext: context };
      consumer.flags |= 524288;
    } else lastContextDependency = lastContextDependency.next = context;
    return value;
  }
  var AbortControllerLocal = "undefined" !== typeof AbortController ? AbortController : function() {
    var listeners = [], signal = this.signal = {
      aborted: false,
      addEventListener: function(type, listener) {
        listeners.push(listener);
      }
    };
    this.abort = function() {
      signal.aborted = true;
      listeners.forEach(function(listener) {
        return listener();
      });
    };
  }, scheduleCallback$2 = Scheduler.unstable_scheduleCallback, NormalPriority = Scheduler.unstable_NormalPriority, CacheContext = {
    $$typeof: REACT_CONTEXT_TYPE,
    Consumer: null,
    Provider: null,
    _currentValue: null,
    _currentValue2: null,
    _threadCount: 0
  };
  function createCache() {
    return {
      controller: new AbortControllerLocal(),
      data: /* @__PURE__ */ new Map(),
      refCount: 0
    };
  }
  function releaseCache(cache) {
    cache.refCount--;
    0 === cache.refCount && scheduleCallback$2(NormalPriority, function() {
      cache.controller.abort();
    });
  }
  var currentEntangledListeners = null, currentEntangledPendingCount = 0, currentEntangledLane = 0, currentEntangledActionThenable = null;
  function entangleAsyncAction(transition, thenable) {
    if (null === currentEntangledListeners) {
      var entangledListeners = currentEntangledListeners = [];
      currentEntangledPendingCount = 0;
      currentEntangledLane = requestTransitionLane();
      currentEntangledActionThenable = {
        status: "pending",
        value: void 0,
        then: function(resolve) {
          entangledListeners.push(resolve);
        }
      };
    }
    currentEntangledPendingCount++;
    thenable.then(pingEngtangledActionScope, pingEngtangledActionScope);
    return thenable;
  }
  function pingEngtangledActionScope() {
    if (0 === --currentEntangledPendingCount && null !== currentEntangledListeners) {
      null !== currentEntangledActionThenable && (currentEntangledActionThenable.status = "fulfilled");
      var listeners = currentEntangledListeners;
      currentEntangledListeners = null;
      currentEntangledLane = 0;
      currentEntangledActionThenable = null;
      for (var i = 0; i < listeners.length; i++) (0, listeners[i])();
    }
  }
  function chainThenableValue(thenable, result) {
    var listeners = [], thenableWithOverride = {
      status: "pending",
      value: null,
      reason: null,
      then: function(resolve) {
        listeners.push(resolve);
      }
    };
    thenable.then(
      function() {
        thenableWithOverride.status = "fulfilled";
        thenableWithOverride.value = result;
        for (var i = 0; i < listeners.length; i++) (0, listeners[i])(result);
      },
      function(error) {
        thenableWithOverride.status = "rejected";
        thenableWithOverride.reason = error;
        for (error = 0; error < listeners.length; error++)
          (0, listeners[error])(void 0);
      }
    );
    return thenableWithOverride;
  }
  var prevOnStartTransitionFinish = ReactSharedInternals.S;
  ReactSharedInternals.S = function(transition, returnValue) {
    globalMostRecentTransitionTime = now();
    "object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && entangleAsyncAction(transition, returnValue);
    null !== prevOnStartTransitionFinish && prevOnStartTransitionFinish(transition, returnValue);
  };
  var resumedCache = createCursor(null);
  function peekCacheFromPool() {
    var cacheResumedFromPreviousRender = resumedCache.current;
    return null !== cacheResumedFromPreviousRender ? cacheResumedFromPreviousRender : workInProgressRoot.pooledCache;
  }
  function pushTransition(offscreenWorkInProgress, prevCachePool) {
    null === prevCachePool ? push(resumedCache, resumedCache.current) : push(resumedCache, prevCachePool.pool);
  }
  function getSuspendedCache() {
    var cacheFromPool = peekCacheFromPool();
    return null === cacheFromPool ? null : { parent: CacheContext._currentValue, pool: cacheFromPool };
  }
  var SuspenseException = Error(formatProdErrorMessage(460)), SuspenseyCommitException = Error(formatProdErrorMessage(474)), SuspenseActionException = Error(formatProdErrorMessage(542)), noopSuspenseyCommitThenable = { then: function() {
  } };
  function isThenableResolved(thenable) {
    thenable = thenable.status;
    return "fulfilled" === thenable || "rejected" === thenable;
  }
  function trackUsedThenable(thenableState2, thenable, index2) {
    index2 = thenableState2[index2];
    void 0 === index2 ? thenableState2.push(thenable) : index2 !== thenable && (thenable.then(noop$1, noop$1), thenable = index2);
    switch (thenable.status) {
      case "fulfilled":
        return thenable.value;
      case "rejected":
        throw thenableState2 = thenable.reason, checkIfUseWrappedInAsyncCatch(thenableState2), thenableState2;
      default:
        if ("string" === typeof thenable.status) thenable.then(noop$1, noop$1);
        else {
          thenableState2 = workInProgressRoot;
          if (null !== thenableState2 && 100 < thenableState2.shellSuspendCounter)
            throw Error(formatProdErrorMessage(482));
          thenableState2 = thenable;
          thenableState2.status = "pending";
          thenableState2.then(
            function(fulfilledValue) {
              if ("pending" === thenable.status) {
                var fulfilledThenable = thenable;
                fulfilledThenable.status = "fulfilled";
                fulfilledThenable.value = fulfilledValue;
              }
            },
            function(error) {
              if ("pending" === thenable.status) {
                var rejectedThenable = thenable;
                rejectedThenable.status = "rejected";
                rejectedThenable.reason = error;
              }
            }
          );
        }
        switch (thenable.status) {
          case "fulfilled":
            return thenable.value;
          case "rejected":
            throw thenableState2 = thenable.reason, checkIfUseWrappedInAsyncCatch(thenableState2), thenableState2;
        }
        suspendedThenable = thenable;
        throw SuspenseException;
    }
  }
  function resolveLazy(lazyType) {
    try {
      var init = lazyType._init;
      return init(lazyType._payload);
    } catch (x) {
      if (null !== x && "object" === typeof x && "function" === typeof x.then)
        throw suspendedThenable = x, SuspenseException;
      throw x;
    }
  }
  var suspendedThenable = null;
  function getSuspendedThenable() {
    if (null === suspendedThenable) throw Error(formatProdErrorMessage(459));
    var thenable = suspendedThenable;
    suspendedThenable = null;
    return thenable;
  }
  function checkIfUseWrappedInAsyncCatch(rejectedReason) {
    if (rejectedReason === SuspenseException || rejectedReason === SuspenseActionException)
      throw Error(formatProdErrorMessage(483));
  }
  var thenableState$1 = null, thenableIndexCounter$1 = 0;
  function unwrapThenable(thenable) {
    var index2 = thenableIndexCounter$1;
    thenableIndexCounter$1 += 1;
    null === thenableState$1 && (thenableState$1 = []);
    return trackUsedThenable(thenableState$1, thenable, index2);
  }
  function coerceRef(workInProgress2, element) {
    element = element.props.ref;
    workInProgress2.ref = void 0 !== element ? element : null;
  }
  function throwOnInvalidObjectTypeImpl(returnFiber, newChild) {
    if (newChild.$$typeof === REACT_LEGACY_ELEMENT_TYPE)
      throw Error(formatProdErrorMessage(525));
    returnFiber = Object.prototype.toString.call(newChild);
    throw Error(
      formatProdErrorMessage(
        31,
        "[object Object]" === returnFiber ? "object with keys {" + Object.keys(newChild).join(", ") + "}" : returnFiber
      )
    );
  }
  function createChildReconciler(shouldTrackSideEffects) {
    function deleteChild(returnFiber, childToDelete) {
      if (shouldTrackSideEffects) {
        var deletions = returnFiber.deletions;
        null === deletions ? (returnFiber.deletions = [childToDelete], returnFiber.flags |= 16) : deletions.push(childToDelete);
      }
    }
    function deleteRemainingChildren(returnFiber, currentFirstChild) {
      if (!shouldTrackSideEffects) return null;
      for (; null !== currentFirstChild; )
        deleteChild(returnFiber, currentFirstChild), currentFirstChild = currentFirstChild.sibling;
      return null;
    }
    function mapRemainingChildren(currentFirstChild) {
      for (var existingChildren = /* @__PURE__ */ new Map(); null !== currentFirstChild; )
        null !== currentFirstChild.key ? existingChildren.set(currentFirstChild.key, currentFirstChild) : existingChildren.set(currentFirstChild.index, currentFirstChild), currentFirstChild = currentFirstChild.sibling;
      return existingChildren;
    }
    function useFiber(fiber, pendingProps) {
      fiber = createWorkInProgress(fiber, pendingProps);
      fiber.index = 0;
      fiber.sibling = null;
      return fiber;
    }
    function placeChild(newFiber, lastPlacedIndex, newIndex) {
      newFiber.index = newIndex;
      if (!shouldTrackSideEffects)
        return newFiber.flags |= 1048576, lastPlacedIndex;
      newIndex = newFiber.alternate;
      if (null !== newIndex)
        return newIndex = newIndex.index, newIndex < lastPlacedIndex ? (newFiber.flags |= 67108866, lastPlacedIndex) : newIndex;
      newFiber.flags |= 67108866;
      return lastPlacedIndex;
    }
    function placeSingleChild(newFiber) {
      shouldTrackSideEffects && null === newFiber.alternate && (newFiber.flags |= 67108866);
      return newFiber;
    }
    function updateTextNode(returnFiber, current, textContent, lanes) {
      if (null === current || 6 !== current.tag)
        return current = createFiberFromText(textContent, returnFiber.mode, lanes), current.return = returnFiber, current;
      current = useFiber(current, textContent);
      current.return = returnFiber;
      return current;
    }
    function updateElement(returnFiber, current, element, lanes) {
      var elementType = element.type;
      if (elementType === REACT_FRAGMENT_TYPE)
        return updateFragment(
          returnFiber,
          current,
          element.props.children,
          lanes,
          element.key
        );
      if (null !== current && (current.elementType === elementType || "object" === typeof elementType && null !== elementType && elementType.$$typeof === REACT_LAZY_TYPE && resolveLazy(elementType) === current.type))
        return current = useFiber(current, element.props), coerceRef(current, element), current.return = returnFiber, current;
      current = createFiberFromTypeAndProps(
        element.type,
        element.key,
        element.props,
        null,
        returnFiber.mode,
        lanes
      );
      coerceRef(current, element);
      current.return = returnFiber;
      return current;
    }
    function updatePortal(returnFiber, current, portal, lanes) {
      if (null === current || 4 !== current.tag || current.stateNode.containerInfo !== portal.containerInfo || current.stateNode.implementation !== portal.implementation)
        return current = createFiberFromPortal(portal, returnFiber.mode, lanes), current.return = returnFiber, current;
      current = useFiber(current, portal.children || []);
      current.return = returnFiber;
      return current;
    }
    function updateFragment(returnFiber, current, fragment, lanes, key) {
      if (null === current || 7 !== current.tag)
        return current = createFiberFromFragment(
          fragment,
          returnFiber.mode,
          lanes,
          key
        ), current.return = returnFiber, current;
      current = useFiber(current, fragment);
      current.return = returnFiber;
      return current;
    }
    function createChild(returnFiber, newChild, lanes) {
      if ("string" === typeof newChild && "" !== newChild || "number" === typeof newChild || "bigint" === typeof newChild)
        return newChild = createFiberFromText(
          "" + newChild,
          returnFiber.mode,
          lanes
        ), newChild.return = returnFiber, newChild;
      if ("object" === typeof newChild && null !== newChild) {
        switch (newChild.$$typeof) {
          case REACT_ELEMENT_TYPE:
            return lanes = createFiberFromTypeAndProps(
              newChild.type,
              newChild.key,
              newChild.props,
              null,
              returnFiber.mode,
              lanes
            ), coerceRef(lanes, newChild), lanes.return = returnFiber, lanes;
          case REACT_PORTAL_TYPE:
            return newChild = createFiberFromPortal(
              newChild,
              returnFiber.mode,
              lanes
            ), newChild.return = returnFiber, newChild;
          case REACT_LAZY_TYPE:
            return newChild = resolveLazy(newChild), createChild(returnFiber, newChild, lanes);
        }
        if (isArrayImpl(newChild) || getIteratorFn(newChild))
          return newChild = createFiberFromFragment(
            newChild,
            returnFiber.mode,
            lanes,
            null
          ), newChild.return = returnFiber, newChild;
        if ("function" === typeof newChild.then)
          return createChild(returnFiber, unwrapThenable(newChild), lanes);
        if (newChild.$$typeof === REACT_CONTEXT_TYPE)
          return createChild(
            returnFiber,
            readContextDuringReconciliation(returnFiber, newChild),
            lanes
          );
        throwOnInvalidObjectTypeImpl(returnFiber, newChild);
      }
      return null;
    }
    function updateSlot(returnFiber, oldFiber, newChild, lanes) {
      var key = null !== oldFiber ? oldFiber.key : null;
      if ("string" === typeof newChild && "" !== newChild || "number" === typeof newChild || "bigint" === typeof newChild)
        return null !== key ? null : updateTextNode(returnFiber, oldFiber, "" + newChild, lanes);
      if ("object" === typeof newChild && null !== newChild) {
        switch (newChild.$$typeof) {
          case REACT_ELEMENT_TYPE:
            return newChild.key === key ? updateElement(returnFiber, oldFiber, newChild, lanes) : null;
          case REACT_PORTAL_TYPE:
            return newChild.key === key ? updatePortal(returnFiber, oldFiber, newChild, lanes) : null;
          case REACT_LAZY_TYPE:
            return newChild = resolveLazy(newChild), updateSlot(returnFiber, oldFiber, newChild, lanes);
        }
        if (isArrayImpl(newChild) || getIteratorFn(newChild))
          return null !== key ? null : updateFragment(returnFiber, oldFiber, newChild, lanes, null);
        if ("function" === typeof newChild.then)
          return updateSlot(
            returnFiber,
            oldFiber,
            unwrapThenable(newChild),
            lanes
          );
        if (newChild.$$typeof === REACT_CONTEXT_TYPE)
          return updateSlot(
            returnFiber,
            oldFiber,
            readContextDuringReconciliation(returnFiber, newChild),
            lanes
          );
        throwOnInvalidObjectTypeImpl(returnFiber, newChild);
      }
      return null;
    }
    function updateFromMap(existingChildren, returnFiber, newIdx, newChild, lanes) {
      if ("string" === typeof newChild && "" !== newChild || "number" === typeof newChild || "bigint" === typeof newChild)
        return existingChildren = existingChildren.get(newIdx) || null, updateTextNode(returnFiber, existingChildren, "" + newChild, lanes);
      if ("object" === typeof newChild && null !== newChild) {
        switch (newChild.$$typeof) {
          case REACT_ELEMENT_TYPE:
            return existingChildren = existingChildren.get(
              null === newChild.key ? newIdx : newChild.key
            ) || null, updateElement(returnFiber, existingChildren, newChild, lanes);
          case REACT_PORTAL_TYPE:
            return existingChildren = existingChildren.get(
              null === newChild.key ? newIdx : newChild.key
            ) || null, updatePortal(returnFiber, existingChildren, newChild, lanes);
          case REACT_LAZY_TYPE:
            return newChild = resolveLazy(newChild), updateFromMap(
              existingChildren,
              returnFiber,
              newIdx,
              newChild,
              lanes
            );
        }
        if (isArrayImpl(newChild) || getIteratorFn(newChild))
          return existingChildren = existingChildren.get(newIdx) || null, updateFragment(returnFiber, existingChildren, newChild, lanes, null);
        if ("function" === typeof newChild.then)
          return updateFromMap(
            existingChildren,
            returnFiber,
            newIdx,
            unwrapThenable(newChild),
            lanes
          );
        if (newChild.$$typeof === REACT_CONTEXT_TYPE)
          return updateFromMap(
            existingChildren,
            returnFiber,
            newIdx,
            readContextDuringReconciliation(returnFiber, newChild),
            lanes
          );
        throwOnInvalidObjectTypeImpl(returnFiber, newChild);
      }
      return null;
    }
    function reconcileChildrenArray(returnFiber, currentFirstChild, newChildren, lanes) {
      for (var resultingFirstChild = null, previousNewFiber = null, oldFiber = currentFirstChild, newIdx = currentFirstChild = 0, nextOldFiber = null; null !== oldFiber && newIdx < newChildren.length; newIdx++) {
        oldFiber.index > newIdx ? (nextOldFiber = oldFiber, oldFiber = null) : nextOldFiber = oldFiber.sibling;
        var newFiber = updateSlot(
          returnFiber,
          oldFiber,
          newChildren[newIdx],
          lanes
        );
        if (null === newFiber) {
          null === oldFiber && (oldFiber = nextOldFiber);
          break;
        }
        shouldTrackSideEffects && oldFiber && null === newFiber.alternate && deleteChild(returnFiber, oldFiber);
        currentFirstChild = placeChild(newFiber, currentFirstChild, newIdx);
        null === previousNewFiber ? resultingFirstChild = newFiber : previousNewFiber.sibling = newFiber;
        previousNewFiber = newFiber;
        oldFiber = nextOldFiber;
      }
      if (newIdx === newChildren.length)
        return deleteRemainingChildren(returnFiber, oldFiber), isHydrating && pushTreeFork(returnFiber, newIdx), resultingFirstChild;
      if (null === oldFiber) {
        for (; newIdx < newChildren.length; newIdx++)
          oldFiber = createChild(returnFiber, newChildren[newIdx], lanes), null !== oldFiber && (currentFirstChild = placeChild(
            oldFiber,
            currentFirstChild,
            newIdx
          ), null === previousNewFiber ? resultingFirstChild = oldFiber : previousNewFiber.sibling = oldFiber, previousNewFiber = oldFiber);
        isHydrating && pushTreeFork(returnFiber, newIdx);
        return resultingFirstChild;
      }
      for (oldFiber = mapRemainingChildren(oldFiber); newIdx < newChildren.length; newIdx++)
        nextOldFiber = updateFromMap(
          oldFiber,
          returnFiber,
          newIdx,
          newChildren[newIdx],
          lanes
        ), null !== nextOldFiber && (shouldTrackSideEffects && null !== nextOldFiber.alternate && oldFiber.delete(
          null === nextOldFiber.key ? newIdx : nextOldFiber.key
        ), currentFirstChild = placeChild(
          nextOldFiber,
          currentFirstChild,
          newIdx
        ), null === previousNewFiber ? resultingFirstChild = nextOldFiber : previousNewFiber.sibling = nextOldFiber, previousNewFiber = nextOldFiber);
      shouldTrackSideEffects && oldFiber.forEach(function(child) {
        return deleteChild(returnFiber, child);
      });
      isHydrating && pushTreeFork(returnFiber, newIdx);
      return resultingFirstChild;
    }
    function reconcileChildrenIterator(returnFiber, currentFirstChild, newChildren, lanes) {
      if (null == newChildren) throw Error(formatProdErrorMessage(151));
      for (var resultingFirstChild = null, previousNewFiber = null, oldFiber = currentFirstChild, newIdx = currentFirstChild = 0, nextOldFiber = null, step = newChildren.next(); null !== oldFiber && !step.done; newIdx++, step = newChildren.next()) {
        oldFiber.index > newIdx ? (nextOldFiber = oldFiber, oldFiber = null) : nextOldFiber = oldFiber.sibling;
        var newFiber = updateSlot(returnFiber, oldFiber, step.value, lanes);
        if (null === newFiber) {
          null === oldFiber && (oldFiber = nextOldFiber);
          break;
        }
        shouldTrackSideEffects && oldFiber && null === newFiber.alternate && deleteChild(returnFiber, oldFiber);
        currentFirstChild = placeChild(newFiber, currentFirstChild, newIdx);
        null === previousNewFiber ? resultingFirstChild = newFiber : previousNewFiber.sibling = newFiber;
        previousNewFiber = newFiber;
        oldFiber = nextOldFiber;
      }
      if (step.done)
        return deleteRemainingChildren(returnFiber, oldFiber), isHydrating && pushTreeFork(returnFiber, newIdx), resultingFirstChild;
      if (null === oldFiber) {
        for (; !step.done; newIdx++, step = newChildren.next())
          step = createChild(returnFiber, step.value, lanes), null !== step && (currentFirstChild = placeChild(step, currentFirstChild, newIdx), null === previousNewFiber ? resultingFirstChild = step : previousNewFiber.sibling = step, previousNewFiber = step);
        isHydrating && pushTreeFork(returnFiber, newIdx);
        return resultingFirstChild;
      }
      for (oldFiber = mapRemainingChildren(oldFiber); !step.done; newIdx++, step = newChildren.next())
        step = updateFromMap(oldFiber, returnFiber, newIdx, step.value, lanes), null !== step && (shouldTrackSideEffects && null !== step.alternate && oldFiber.delete(null === step.key ? newIdx : step.key), currentFirstChild = placeChild(step, currentFirstChild, newIdx), null === previousNewFiber ? resultingFirstChild = step : previousNewFiber.sibling = step, previousNewFiber = step);
      shouldTrackSideEffects && oldFiber.forEach(function(child) {
        return deleteChild(returnFiber, child);
      });
      isHydrating && pushTreeFork(returnFiber, newIdx);
      return resultingFirstChild;
    }
    function reconcileChildFibersImpl(returnFiber, currentFirstChild, newChild, lanes) {
      "object" === typeof newChild && null !== newChild && newChild.type === REACT_FRAGMENT_TYPE && null === newChild.key && (newChild = newChild.props.children);
      if ("object" === typeof newChild && null !== newChild) {
        switch (newChild.$$typeof) {
          case REACT_ELEMENT_TYPE:
            a: {
              for (var key = newChild.key; null !== currentFirstChild; ) {
                if (currentFirstChild.key === key) {
                  key = newChild.type;
                  if (key === REACT_FRAGMENT_TYPE) {
                    if (7 === currentFirstChild.tag) {
                      deleteRemainingChildren(
                        returnFiber,
                        currentFirstChild.sibling
                      );
                      lanes = useFiber(
                        currentFirstChild,
                        newChild.props.children
                      );
                      lanes.return = returnFiber;
                      returnFiber = lanes;
                      break a;
                    }
                  } else if (currentFirstChild.elementType === key || "object" === typeof key && null !== key && key.$$typeof === REACT_LAZY_TYPE && resolveLazy(key) === currentFirstChild.type) {
                    deleteRemainingChildren(
                      returnFiber,
                      currentFirstChild.sibling
                    );
                    lanes = useFiber(currentFirstChild, newChild.props);
                    coerceRef(lanes, newChild);
                    lanes.return = returnFiber;
                    returnFiber = lanes;
                    break a;
                  }
                  deleteRemainingChildren(returnFiber, currentFirstChild);
                  break;
                } else deleteChild(returnFiber, currentFirstChild);
                currentFirstChild = currentFirstChild.sibling;
              }
              newChild.type === REACT_FRAGMENT_TYPE ? (lanes = createFiberFromFragment(
                newChild.props.children,
                returnFiber.mode,
                lanes,
                newChild.key
              ), lanes.return = returnFiber, returnFiber = lanes) : (lanes = createFiberFromTypeAndProps(
                newChild.type,
                newChild.key,
                newChild.props,
                null,
                returnFiber.mode,
                lanes
              ), coerceRef(lanes, newChild), lanes.return = returnFiber, returnFiber = lanes);
            }
            return placeSingleChild(returnFiber);
          case REACT_PORTAL_TYPE:
            a: {
              for (key = newChild.key; null !== currentFirstChild; ) {
                if (currentFirstChild.key === key)
                  if (4 === currentFirstChild.tag && currentFirstChild.stateNode.containerInfo === newChild.containerInfo && currentFirstChild.stateNode.implementation === newChild.implementation) {
                    deleteRemainingChildren(
                      returnFiber,
                      currentFirstChild.sibling
                    );
                    lanes = useFiber(currentFirstChild, newChild.children || []);
                    lanes.return = returnFiber;
                    returnFiber = lanes;
                    break a;
                  } else {
                    deleteRemainingChildren(returnFiber, currentFirstChild);
                    break;
                  }
                else deleteChild(returnFiber, currentFirstChild);
                currentFirstChild = currentFirstChild.sibling;
              }
              lanes = createFiberFromPortal(newChild, returnFiber.mode, lanes);
              lanes.return = returnFiber;
              returnFiber = lanes;
            }
            return placeSingleChild(returnFiber);
          case REACT_LAZY_TYPE:
            return newChild = resolveLazy(newChild), reconcileChildFibersImpl(
              returnFiber,
              currentFirstChild,
              newChild,
              lanes
            );
        }
        if (isArrayImpl(newChild))
          return reconcileChildrenArray(
            returnFiber,
            currentFirstChild,
            newChild,
            lanes
          );
        if (getIteratorFn(newChild)) {
          key = getIteratorFn(newChild);
          if ("function" !== typeof key) throw Error(formatProdErrorMessage(150));
          newChild = key.call(newChild);
          return reconcileChildrenIterator(
            returnFiber,
            currentFirstChild,
            newChild,
            lanes
          );
        }
        if ("function" === typeof newChild.then)
          return reconcileChildFibersImpl(
            returnFiber,
            currentFirstChild,
            unwrapThenable(newChild),
            lanes
          );
        if (newChild.$$typeof === REACT_CONTEXT_TYPE)
          return reconcileChildFibersImpl(
            returnFiber,
            currentFirstChild,
            readContextDuringReconciliation(returnFiber, newChild),
            lanes
          );
        throwOnInvalidObjectTypeImpl(returnFiber, newChild);
      }
      return "string" === typeof newChild && "" !== newChild || "number" === typeof newChild || "bigint" === typeof newChild ? (newChild = "" + newChild, null !== currentFirstChild && 6 === currentFirstChild.tag ? (deleteRemainingChildren(returnFiber, currentFirstChild.sibling), lanes = useFiber(currentFirstChild, newChild), lanes.return = returnFiber, returnFiber = lanes) : (deleteRemainingChildren(returnFiber, currentFirstChild), lanes = createFiberFromText(newChild, returnFiber.mode, lanes), lanes.return = returnFiber, returnFiber = lanes), placeSingleChild(returnFiber)) : deleteRemainingChildren(returnFiber, currentFirstChild);
    }
    return function(returnFiber, currentFirstChild, newChild, lanes) {
      try {
        thenableIndexCounter$1 = 0;
        var firstChildFiber = reconcileChildFibersImpl(
          returnFiber,
          currentFirstChild,
          newChild,
          lanes
        );
        thenableState$1 = null;
        return firstChildFiber;
      } catch (x) {
        if (x === SuspenseException || x === SuspenseActionException) throw x;
        var fiber = createFiberImplClass(29, x, null, returnFiber.mode);
        fiber.lanes = lanes;
        fiber.return = returnFiber;
        return fiber;
      } finally {
      }
    };
  }
  var reconcileChildFibers = createChildReconciler(true), mountChildFibers = createChildReconciler(false), hasForceUpdate = false;
  function initializeUpdateQueue(fiber) {
    fiber.updateQueue = {
      baseState: fiber.memoizedState,
      firstBaseUpdate: null,
      lastBaseUpdate: null,
      shared: { pending: null, lanes: 0, hiddenCallbacks: null },
      callbacks: null
    };
  }
  function cloneUpdateQueue(current, workInProgress2) {
    current = current.updateQueue;
    workInProgress2.updateQueue === current && (workInProgress2.updateQueue = {
      baseState: current.baseState,
      firstBaseUpdate: current.firstBaseUpdate,
      lastBaseUpdate: current.lastBaseUpdate,
      shared: current.shared,
      callbacks: null
    });
  }
  function createUpdate(lane) {
    return { lane, tag: 0, payload: null, callback: null, next: null };
  }
  function enqueueUpdate(fiber, update, lane) {
    var updateQueue = fiber.updateQueue;
    if (null === updateQueue) return null;
    updateQueue = updateQueue.shared;
    if (0 !== (executionContext & 2)) {
      var pending = updateQueue.pending;
      null === pending ? update.next = update : (update.next = pending.next, pending.next = update);
      updateQueue.pending = update;
      update = getRootForUpdatedFiber(fiber);
      markUpdateLaneFromFiberToRoot(fiber, null, lane);
      return update;
    }
    enqueueUpdate$1(fiber, updateQueue, update, lane);
    return getRootForUpdatedFiber(fiber);
  }
  function entangleTransitions(root2, fiber, lane) {
    fiber = fiber.updateQueue;
    if (null !== fiber && (fiber = fiber.shared, 0 !== (lane & 4194048))) {
      var queueLanes = fiber.lanes;
      queueLanes &= root2.pendingLanes;
      lane |= queueLanes;
      fiber.lanes = lane;
      markRootEntangled(root2, lane);
    }
  }
  function enqueueCapturedUpdate(workInProgress2, capturedUpdate) {
    var queue = workInProgress2.updateQueue, current = workInProgress2.alternate;
    if (null !== current && (current = current.updateQueue, queue === current)) {
      var newFirst = null, newLast = null;
      queue = queue.firstBaseUpdate;
      if (null !== queue) {
        do {
          var clone = {
            lane: queue.lane,
            tag: queue.tag,
            payload: queue.payload,
            callback: null,
            next: null
          };
          null === newLast ? newFirst = newLast = clone : newLast = newLast.next = clone;
          queue = queue.next;
        } while (null !== queue);
        null === newLast ? newFirst = newLast = capturedUpdate : newLast = newLast.next = capturedUpdate;
      } else newFirst = newLast = capturedUpdate;
      queue = {
        baseState: current.baseState,
        firstBaseUpdate: newFirst,
        lastBaseUpdate: newLast,
        shared: current.shared,
        callbacks: current.callbacks
      };
      workInProgress2.updateQueue = queue;
      return;
    }
    workInProgress2 = queue.lastBaseUpdate;
    null === workInProgress2 ? queue.firstBaseUpdate = capturedUpdate : workInProgress2.next = capturedUpdate;
    queue.lastBaseUpdate = capturedUpdate;
  }
  var didReadFromEntangledAsyncAction = false;
  function suspendIfUpdateReadFromEntangledAsyncAction() {
    if (didReadFromEntangledAsyncAction) {
      var entangledActionThenable = currentEntangledActionThenable;
      if (null !== entangledActionThenable) throw entangledActionThenable;
    }
  }
  function processUpdateQueue(workInProgress$jscomp$0, props, instance$jscomp$0, renderLanes2) {
    didReadFromEntangledAsyncAction = false;
    var queue = workInProgress$jscomp$0.updateQueue;
    hasForceUpdate = false;
    var firstBaseUpdate = queue.firstBaseUpdate, lastBaseUpdate = queue.lastBaseUpdate, pendingQueue = queue.shared.pending;
    if (null !== pendingQueue) {
      queue.shared.pending = null;
      var lastPendingUpdate = pendingQueue, firstPendingUpdate = lastPendingUpdate.next;
      lastPendingUpdate.next = null;
      null === lastBaseUpdate ? firstBaseUpdate = firstPendingUpdate : lastBaseUpdate.next = firstPendingUpdate;
      lastBaseUpdate = lastPendingUpdate;
      var current = workInProgress$jscomp$0.alternate;
      null !== current && (current = current.updateQueue, pendingQueue = current.lastBaseUpdate, pendingQueue !== lastBaseUpdate && (null === pendingQueue ? current.firstBaseUpdate = firstPendingUpdate : pendingQueue.next = firstPendingUpdate, current.lastBaseUpdate = lastPendingUpdate));
    }
    if (null !== firstBaseUpdate) {
      var newState = queue.baseState;
      lastBaseUpdate = 0;
      current = firstPendingUpdate = lastPendingUpdate = null;
      pendingQueue = firstBaseUpdate;
      do {
        var updateLane = pendingQueue.lane & -536870913, isHiddenUpdate = updateLane !== pendingQueue.lane;
        if (isHiddenUpdate ? (workInProgressRootRenderLanes & updateLane) === updateLane : (renderLanes2 & updateLane) === updateLane) {
          0 !== updateLane && updateLane === currentEntangledLane && (didReadFromEntangledAsyncAction = true);
          null !== current && (current = current.next = {
            lane: 0,
            tag: pendingQueue.tag,
            payload: pendingQueue.payload,
            callback: null,
            next: null
          });
          a: {
            var workInProgress2 = workInProgress$jscomp$0, update = pendingQueue;
            updateLane = props;
            var instance = instance$jscomp$0;
            switch (update.tag) {
              case 1:
                workInProgress2 = update.payload;
                if ("function" === typeof workInProgress2) {
                  newState = workInProgress2.call(instance, newState, updateLane);
                  break a;
                }
                newState = workInProgress2;
                break a;
              case 3:
                workInProgress2.flags = workInProgress2.flags & -65537 | 128;
              case 0:
                workInProgress2 = update.payload;
                updateLane = "function" === typeof workInProgress2 ? workInProgress2.call(instance, newState, updateLane) : workInProgress2;
                if (null === updateLane || void 0 === updateLane) break a;
                newState = assign({}, newState, updateLane);
                break a;
              case 2:
                hasForceUpdate = true;
            }
          }
          updateLane = pendingQueue.callback;
          null !== updateLane && (workInProgress$jscomp$0.flags |= 64, isHiddenUpdate && (workInProgress$jscomp$0.flags |= 8192), isHiddenUpdate = queue.callbacks, null === isHiddenUpdate ? queue.callbacks = [updateLane] : isHiddenUpdate.push(updateLane));
        } else
          isHiddenUpdate = {
            lane: updateLane,
            tag: pendingQueue.tag,
            payload: pendingQueue.payload,
            callback: pendingQueue.callback,
            next: null
          }, null === current ? (firstPendingUpdate = current = isHiddenUpdate, lastPendingUpdate = newState) : current = current.next = isHiddenUpdate, lastBaseUpdate |= updateLane;
        pendingQueue = pendingQueue.next;
        if (null === pendingQueue)
          if (pendingQueue = queue.shared.pending, null === pendingQueue)
            break;
          else
            isHiddenUpdate = pendingQueue, pendingQueue = isHiddenUpdate.next, isHiddenUpdate.next = null, queue.lastBaseUpdate = isHiddenUpdate, queue.shared.pending = null;
      } while (1);
      null === current && (lastPendingUpdate = newState);
      queue.baseState = lastPendingUpdate;
      queue.firstBaseUpdate = firstPendingUpdate;
      queue.lastBaseUpdate = current;
      null === firstBaseUpdate && (queue.shared.lanes = 0);
      workInProgressRootSkippedLanes |= lastBaseUpdate;
      workInProgress$jscomp$0.lanes = lastBaseUpdate;
      workInProgress$jscomp$0.memoizedState = newState;
    }
  }
  function callCallback(callback, context) {
    if ("function" !== typeof callback)
      throw Error(formatProdErrorMessage(191, callback));
    callback.call(context);
  }
  function commitCallbacks(updateQueue, context) {
    var callbacks = updateQueue.callbacks;
    if (null !== callbacks)
      for (updateQueue.callbacks = null, updateQueue = 0; updateQueue < callbacks.length; updateQueue++)
        callCallback(callbacks[updateQueue], context);
  }
  var currentTreeHiddenStackCursor = createCursor(null), prevEntangledRenderLanesCursor = createCursor(0);
  function pushHiddenContext(fiber, context) {
    fiber = entangledRenderLanes;
    push(prevEntangledRenderLanesCursor, fiber);
    push(currentTreeHiddenStackCursor, context);
    entangledRenderLanes = fiber | context.baseLanes;
  }
  function reuseHiddenContextOnStack() {
    push(prevEntangledRenderLanesCursor, entangledRenderLanes);
    push(currentTreeHiddenStackCursor, currentTreeHiddenStackCursor.current);
  }
  function popHiddenContext() {
    entangledRenderLanes = prevEntangledRenderLanesCursor.current;
    pop(currentTreeHiddenStackCursor);
    pop(prevEntangledRenderLanesCursor);
  }
  var suspenseHandlerStackCursor = createCursor(null), shellBoundary = null;
  function pushPrimaryTreeSuspenseHandler(handler) {
    var current = handler.alternate;
    push(suspenseStackCursor, suspenseStackCursor.current & 1);
    push(suspenseHandlerStackCursor, handler);
    null === shellBoundary && (null === current || null !== currentTreeHiddenStackCursor.current ? shellBoundary = handler : null !== current.memoizedState && (shellBoundary = handler));
  }
  function pushDehydratedActivitySuspenseHandler(fiber) {
    push(suspenseStackCursor, suspenseStackCursor.current);
    push(suspenseHandlerStackCursor, fiber);
    null === shellBoundary && (shellBoundary = fiber);
  }
  function pushOffscreenSuspenseHandler(fiber) {
    22 === fiber.tag ? (push(suspenseStackCursor, suspenseStackCursor.current), push(suspenseHandlerStackCursor, fiber), null === shellBoundary && (shellBoundary = fiber)) : reuseSuspenseHandlerOnStack();
  }
  function reuseSuspenseHandlerOnStack() {
    push(suspenseStackCursor, suspenseStackCursor.current);
    push(suspenseHandlerStackCursor, suspenseHandlerStackCursor.current);
  }
  function popSuspenseHandler(fiber) {
    pop(suspenseHandlerStackCursor);
    shellBoundary === fiber && (shellBoundary = null);
    pop(suspenseStackCursor);
  }
  var suspenseStackCursor = createCursor(0);
  function findFirstSuspended(row) {
    for (var node = row; null !== node; ) {
      if (13 === node.tag) {
        var state = node.memoizedState;
        if (null !== state && (state = state.dehydrated, null === state || isSuspenseInstancePending(state) || isSuspenseInstanceFallback(state)))
          return node;
      } else if (19 === node.tag && ("forwards" === node.memoizedProps.revealOrder || "backwards" === node.memoizedProps.revealOrder || "unstable_legacy-backwards" === node.memoizedProps.revealOrder || "together" === node.memoizedProps.revealOrder)) {
        if (0 !== (node.flags & 128)) return node;
      } else if (null !== node.child) {
        node.child.return = node;
        node = node.child;
        continue;
      }
      if (node === row) break;
      for (; null === node.sibling; ) {
        if (null === node.return || node.return === row) return null;
        node = node.return;
      }
      node.sibling.return = node.return;
      node = node.sibling;
    }
    return null;
  }
  var renderLanes = 0, currentlyRenderingFiber = null, currentHook = null, workInProgressHook = null, didScheduleRenderPhaseUpdate = false, didScheduleRenderPhaseUpdateDuringThisPass = false, shouldDoubleInvokeUserFnsInHooksDEV = false, localIdCounter = 0, thenableIndexCounter = 0, thenableState = null, globalClientIdCounter = 0;
  function throwInvalidHookError() {
    throw Error(formatProdErrorMessage(321));
  }
  function areHookInputsEqual(nextDeps, prevDeps) {
    if (null === prevDeps) return false;
    for (var i = 0; i < prevDeps.length && i < nextDeps.length; i++)
      if (!objectIs(nextDeps[i], prevDeps[i])) return false;
    return true;
  }
  function renderWithHooks(current, workInProgress2, Component, props, secondArg, nextRenderLanes) {
    renderLanes = nextRenderLanes;
    currentlyRenderingFiber = workInProgress2;
    workInProgress2.memoizedState = null;
    workInProgress2.updateQueue = null;
    workInProgress2.lanes = 0;
    ReactSharedInternals.H = null === current || null === current.memoizedState ? HooksDispatcherOnMount : HooksDispatcherOnUpdate;
    shouldDoubleInvokeUserFnsInHooksDEV = false;
    nextRenderLanes = Component(props, secondArg);
    shouldDoubleInvokeUserFnsInHooksDEV = false;
    didScheduleRenderPhaseUpdateDuringThisPass && (nextRenderLanes = renderWithHooksAgain(
      workInProgress2,
      Component,
      props,
      secondArg
    ));
    finishRenderingHooks(current);
    return nextRenderLanes;
  }
  function finishRenderingHooks(current) {
    ReactSharedInternals.H = ContextOnlyDispatcher;
    var didRenderTooFewHooks = null !== currentHook && null !== currentHook.next;
    renderLanes = 0;
    workInProgressHook = currentHook = currentlyRenderingFiber = null;
    didScheduleRenderPhaseUpdate = false;
    thenableIndexCounter = 0;
    thenableState = null;
    if (didRenderTooFewHooks) throw Error(formatProdErrorMessage(300));
    null === current || didReceiveUpdate || (current = current.dependencies, null !== current && checkIfContextChanged(current) && (didReceiveUpdate = true));
  }
  function renderWithHooksAgain(workInProgress2, Component, props, secondArg) {
    currentlyRenderingFiber = workInProgress2;
    var numberOfReRenders = 0;
    do {
      didScheduleRenderPhaseUpdateDuringThisPass && (thenableState = null);
      thenableIndexCounter = 0;
      didScheduleRenderPhaseUpdateDuringThisPass = false;
      if (25 <= numberOfReRenders) throw Error(formatProdErrorMessage(301));
      numberOfReRenders += 1;
      workInProgressHook = currentHook = null;
      if (null != workInProgress2.updateQueue) {
        var children = workInProgress2.updateQueue;
        children.lastEffect = null;
        children.events = null;
        children.stores = null;
        null != children.memoCache && (children.memoCache.index = 0);
      }
      ReactSharedInternals.H = HooksDispatcherOnRerender;
      children = Component(props, secondArg);
    } while (didScheduleRenderPhaseUpdateDuringThisPass);
    return children;
  }
  function TransitionAwareHostComponent() {
    var dispatcher = ReactSharedInternals.H, maybeThenable = dispatcher.useState()[0];
    maybeThenable = "function" === typeof maybeThenable.then ? useThenable(maybeThenable) : maybeThenable;
    dispatcher = dispatcher.useState()[0];
    (null !== currentHook ? currentHook.memoizedState : null) !== dispatcher && (currentlyRenderingFiber.flags |= 1024);
    return maybeThenable;
  }
  function checkDidRenderIdHook() {
    var didRenderIdHook = 0 !== localIdCounter;
    localIdCounter = 0;
    return didRenderIdHook;
  }
  function bailoutHooks(current, workInProgress2, lanes) {
    workInProgress2.updateQueue = current.updateQueue;
    workInProgress2.flags &= -2053;
    current.lanes &= ~lanes;
  }
  function resetHooksOnUnwind(workInProgress2) {
    if (didScheduleRenderPhaseUpdate) {
      for (workInProgress2 = workInProgress2.memoizedState; null !== workInProgress2; ) {
        var queue = workInProgress2.queue;
        null !== queue && (queue.pending = null);
        workInProgress2 = workInProgress2.next;
      }
      didScheduleRenderPhaseUpdate = false;
    }
    renderLanes = 0;
    workInProgressHook = currentHook = currentlyRenderingFiber = null;
    didScheduleRenderPhaseUpdateDuringThisPass = false;
    thenableIndexCounter = localIdCounter = 0;
    thenableState = null;
  }
  function mountWorkInProgressHook() {
    var hook = {
      memoizedState: null,
      baseState: null,
      baseQueue: null,
      queue: null,
      next: null
    };
    null === workInProgressHook ? currentlyRenderingFiber.memoizedState = workInProgressHook = hook : workInProgressHook = workInProgressHook.next = hook;
    return workInProgressHook;
  }
  function updateWorkInProgressHook() {
    if (null === currentHook) {
      var nextCurrentHook = currentlyRenderingFiber.alternate;
      nextCurrentHook = null !== nextCurrentHook ? nextCurrentHook.memoizedState : null;
    } else nextCurrentHook = currentHook.next;
    var nextWorkInProgressHook = null === workInProgressHook ? currentlyRenderingFiber.memoizedState : workInProgressHook.next;
    if (null !== nextWorkInProgressHook)
      workInProgressHook = nextWorkInProgressHook, currentHook = nextCurrentHook;
    else {
      if (null === nextCurrentHook) {
        if (null === currentlyRenderingFiber.alternate)
          throw Error(formatProdErrorMessage(467));
        throw Error(formatProdErrorMessage(310));
      }
      currentHook = nextCurrentHook;
      nextCurrentHook = {
        memoizedState: currentHook.memoizedState,
        baseState: currentHook.baseState,
        baseQueue: currentHook.baseQueue,
        queue: currentHook.queue,
        next: null
      };
      null === workInProgressHook ? currentlyRenderingFiber.memoizedState = workInProgressHook = nextCurrentHook : workInProgressHook = workInProgressHook.next = nextCurrentHook;
    }
    return workInProgressHook;
  }
  function createFunctionComponentUpdateQueue() {
    return { lastEffect: null, events: null, stores: null, memoCache: null };
  }
  function useThenable(thenable) {
    var index2 = thenableIndexCounter;
    thenableIndexCounter += 1;
    null === thenableState && (thenableState = []);
    thenable = trackUsedThenable(thenableState, thenable, index2);
    index2 = currentlyRenderingFiber;
    null === (null === workInProgressHook ? index2.memoizedState : workInProgressHook.next) && (index2 = index2.alternate, ReactSharedInternals.H = null === index2 || null === index2.memoizedState ? HooksDispatcherOnMount : HooksDispatcherOnUpdate);
    return thenable;
  }
  function use(usable) {
    if (null !== usable && "object" === typeof usable) {
      if ("function" === typeof usable.then) return useThenable(usable);
      if (usable.$$typeof === REACT_CONTEXT_TYPE) return readContext(usable);
    }
    throw Error(formatProdErrorMessage(438, String(usable)));
  }
  function useMemoCache(size) {
    var memoCache = null, updateQueue = currentlyRenderingFiber.updateQueue;
    null !== updateQueue && (memoCache = updateQueue.memoCache);
    if (null == memoCache) {
      var current = currentlyRenderingFiber.alternate;
      null !== current && (current = current.updateQueue, null !== current && (current = current.memoCache, null != current && (memoCache = {
        data: current.data.map(function(array) {
          return array.slice();
        }),
        index: 0
      })));
    }
    null == memoCache && (memoCache = { data: [], index: 0 });
    null === updateQueue && (updateQueue = createFunctionComponentUpdateQueue(), currentlyRenderingFiber.updateQueue = updateQueue);
    updateQueue.memoCache = memoCache;
    updateQueue = memoCache.data[memoCache.index];
    if (void 0 === updateQueue)
      for (updateQueue = memoCache.data[memoCache.index] = Array(size), current = 0; current < size; current++)
        updateQueue[current] = REACT_MEMO_CACHE_SENTINEL;
    memoCache.index++;
    return updateQueue;
  }
  function basicStateReducer(state, action) {
    return "function" === typeof action ? action(state) : action;
  }
  function updateReducer(reducer) {
    var hook = updateWorkInProgressHook();
    return updateReducerImpl(hook, currentHook, reducer);
  }
  function updateReducerImpl(hook, current, reducer) {
    var queue = hook.queue;
    if (null === queue) throw Error(formatProdErrorMessage(311));
    queue.lastRenderedReducer = reducer;
    var baseQueue = hook.baseQueue, pendingQueue = queue.pending;
    if (null !== pendingQueue) {
      if (null !== baseQueue) {
        var baseFirst = baseQueue.next;
        baseQueue.next = pendingQueue.next;
        pendingQueue.next = baseFirst;
      }
      current.baseQueue = baseQueue = pendingQueue;
      queue.pending = null;
    }
    pendingQueue = hook.baseState;
    if (null === baseQueue) hook.memoizedState = pendingQueue;
    else {
      current = baseQueue.next;
      var newBaseQueueFirst = baseFirst = null, newBaseQueueLast = null, update = current, didReadFromEntangledAsyncAction$60 = false;
      do {
        var updateLane = update.lane & -536870913;
        if (updateLane !== update.lane ? (workInProgressRootRenderLanes & updateLane) === updateLane : (renderLanes & updateLane) === updateLane) {
          var revertLane = update.revertLane;
          if (0 === revertLane)
            null !== newBaseQueueLast && (newBaseQueueLast = newBaseQueueLast.next = {
              lane: 0,
              revertLane: 0,
              gesture: null,
              action: update.action,
              hasEagerState: update.hasEagerState,
              eagerState: update.eagerState,
              next: null
            }), updateLane === currentEntangledLane && (didReadFromEntangledAsyncAction$60 = true);
          else if ((renderLanes & revertLane) === revertLane) {
            update = update.next;
            revertLane === currentEntangledLane && (didReadFromEntangledAsyncAction$60 = true);
            continue;
          } else
            updateLane = {
              lane: 0,
              revertLane: update.revertLane,
              gesture: null,
              action: update.action,
              hasEagerState: update.hasEagerState,
              eagerState: update.eagerState,
              next: null
            }, null === newBaseQueueLast ? (newBaseQueueFirst = newBaseQueueLast = updateLane, baseFirst = pendingQueue) : newBaseQueueLast = newBaseQueueLast.next = updateLane, currentlyRenderingFiber.lanes |= revertLane, workInProgressRootSkippedLanes |= revertLane;
          updateLane = update.action;
          shouldDoubleInvokeUserFnsInHooksDEV && reducer(pendingQueue, updateLane);
          pendingQueue = update.hasEagerState ? update.eagerState : reducer(pendingQueue, updateLane);
        } else
          revertLane = {
            lane: updateLane,
            revertLane: update.revertLane,
            gesture: update.gesture,
            action: update.action,
            hasEagerState: update.hasEagerState,
            eagerState: update.eagerState,
            next: null
          }, null === newBaseQueueLast ? (newBaseQueueFirst = newBaseQueueLast = revertLane, baseFirst = pendingQueue) : newBaseQueueLast = newBaseQueueLast.next = revertLane, currentlyRenderingFiber.lanes |= updateLane, workInProgressRootSkippedLanes |= updateLane;
        update = update.next;
      } while (null !== update && update !== current);
      null === newBaseQueueLast ? baseFirst = pendingQueue : newBaseQueueLast.next = newBaseQueueFirst;
      if (!objectIs(pendingQueue, hook.memoizedState) && (didReceiveUpdate = true, didReadFromEntangledAsyncAction$60 && (reducer = currentEntangledActionThenable, null !== reducer)))
        throw reducer;
      hook.memoizedState = pendingQueue;
      hook.baseState = baseFirst;
      hook.baseQueue = newBaseQueueLast;
      queue.lastRenderedState = pendingQueue;
    }
    null === baseQueue && (queue.lanes = 0);
    return [hook.memoizedState, queue.dispatch];
  }
  function rerenderReducer(reducer) {
    var hook = updateWorkInProgressHook(), queue = hook.queue;
    if (null === queue) throw Error(formatProdErrorMessage(311));
    queue.lastRenderedReducer = reducer;
    var dispatch = queue.dispatch, lastRenderPhaseUpdate = queue.pending, newState = hook.memoizedState;
    if (null !== lastRenderPhaseUpdate) {
      queue.pending = null;
      var update = lastRenderPhaseUpdate = lastRenderPhaseUpdate.next;
      do
        newState = reducer(newState, update.action), update = update.next;
      while (update !== lastRenderPhaseUpdate);
      objectIs(newState, hook.memoizedState) || (didReceiveUpdate = true);
      hook.memoizedState = newState;
      null === hook.baseQueue && (hook.baseState = newState);
      queue.lastRenderedState = newState;
    }
    return [newState, dispatch];
  }
  function updateSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
    var fiber = currentlyRenderingFiber, hook = updateWorkInProgressHook(), isHydrating$jscomp$0 = isHydrating;
    if (isHydrating$jscomp$0) {
      if (void 0 === getServerSnapshot) throw Error(formatProdErrorMessage(407));
      getServerSnapshot = getServerSnapshot();
    } else getServerSnapshot = getSnapshot();
    var snapshotChanged = !objectIs(
      (currentHook || hook).memoizedState,
      getServerSnapshot
    );
    snapshotChanged && (hook.memoizedState = getServerSnapshot, didReceiveUpdate = true);
    hook = hook.queue;
    updateEffect(subscribeToStore.bind(null, fiber, hook, subscribe), [
      subscribe
    ]);
    if (hook.getSnapshot !== getSnapshot || snapshotChanged || null !== workInProgressHook && workInProgressHook.memoizedState.tag & 1) {
      fiber.flags |= 2048;
      pushSimpleEffect(
        9,
        { destroy: void 0 },
        updateStoreInstance.bind(
          null,
          fiber,
          hook,
          getServerSnapshot,
          getSnapshot
        ),
        null
      );
      if (null === workInProgressRoot) throw Error(formatProdErrorMessage(349));
      isHydrating$jscomp$0 || 0 !== (renderLanes & 127) || pushStoreConsistencyCheck(fiber, getSnapshot, getServerSnapshot);
    }
    return getServerSnapshot;
  }
  function pushStoreConsistencyCheck(fiber, getSnapshot, renderedSnapshot) {
    fiber.flags |= 16384;
    fiber = { getSnapshot, value: renderedSnapshot };
    getSnapshot = currentlyRenderingFiber.updateQueue;
    null === getSnapshot ? (getSnapshot = createFunctionComponentUpdateQueue(), currentlyRenderingFiber.updateQueue = getSnapshot, getSnapshot.stores = [fiber]) : (renderedSnapshot = getSnapshot.stores, null === renderedSnapshot ? getSnapshot.stores = [fiber] : renderedSnapshot.push(fiber));
  }
  function updateStoreInstance(fiber, inst, nextSnapshot, getSnapshot) {
    inst.value = nextSnapshot;
    inst.getSnapshot = getSnapshot;
    checkIfSnapshotChanged(inst) && forceStoreRerender(fiber);
  }
  function subscribeToStore(fiber, inst, subscribe) {
    return subscribe(function() {
      checkIfSnapshotChanged(inst) && forceStoreRerender(fiber);
    });
  }
  function checkIfSnapshotChanged(inst) {
    var latestGetSnapshot = inst.getSnapshot;
    inst = inst.value;
    try {
      var nextValue = latestGetSnapshot();
      return !objectIs(inst, nextValue);
    } catch (error) {
      return true;
    }
  }
  function forceStoreRerender(fiber) {
    var root2 = enqueueConcurrentRenderForLane(fiber, 2);
    null !== root2 && scheduleUpdateOnFiber(root2, fiber, 2);
  }
  function mountStateImpl(initialState) {
    var hook = mountWorkInProgressHook();
    if ("function" === typeof initialState) {
      var initialStateInitializer = initialState;
      initialState = initialStateInitializer();
      if (shouldDoubleInvokeUserFnsInHooksDEV) {
        setIsStrictModeForDevtools(true);
        try {
          initialStateInitializer();
        } finally {
          setIsStrictModeForDevtools(false);
        }
      }
    }
    hook.memoizedState = hook.baseState = initialState;
    hook.queue = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: basicStateReducer,
      lastRenderedState: initialState
    };
    return hook;
  }
  function updateOptimisticImpl(hook, current, passthrough, reducer) {
    hook.baseState = passthrough;
    return updateReducerImpl(
      hook,
      currentHook,
      "function" === typeof reducer ? reducer : basicStateReducer
    );
  }
  function dispatchActionState(fiber, actionQueue, setPendingState, setState, payload) {
    if (isRenderPhaseUpdate(fiber)) throw Error(formatProdErrorMessage(485));
    fiber = actionQueue.action;
    if (null !== fiber) {
      var actionNode = {
        payload,
        action: fiber,
        next: null,
        isTransition: true,
        status: "pending",
        value: null,
        reason: null,
        listeners: [],
        then: function(listener) {
          actionNode.listeners.push(listener);
        }
      };
      null !== ReactSharedInternals.T ? setPendingState(true) : actionNode.isTransition = false;
      setState(actionNode);
      setPendingState = actionQueue.pending;
      null === setPendingState ? (actionNode.next = actionQueue.pending = actionNode, runActionStateAction(actionQueue, actionNode)) : (actionNode.next = setPendingState.next, actionQueue.pending = setPendingState.next = actionNode);
    }
  }
  function runActionStateAction(actionQueue, node) {
    var action = node.action, payload = node.payload, prevState = actionQueue.state;
    if (node.isTransition) {
      var prevTransition = ReactSharedInternals.T, currentTransition = {};
      ReactSharedInternals.T = currentTransition;
      try {
        var returnValue = action(prevState, payload), onStartTransitionFinish = ReactSharedInternals.S;
        null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
        handleActionReturnValue(actionQueue, node, returnValue);
      } catch (error) {
        onActionError(actionQueue, node, error);
      } finally {
        null !== prevTransition && null !== currentTransition.types && (prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
      }
    } else
      try {
        prevTransition = action(prevState, payload), handleActionReturnValue(actionQueue, node, prevTransition);
      } catch (error$66) {
        onActionError(actionQueue, node, error$66);
      }
  }
  function handleActionReturnValue(actionQueue, node, returnValue) {
    null !== returnValue && "object" === typeof returnValue && "function" === typeof returnValue.then ? returnValue.then(
      function(nextState) {
        onActionSuccess(actionQueue, node, nextState);
      },
      function(error) {
        return onActionError(actionQueue, node, error);
      }
    ) : onActionSuccess(actionQueue, node, returnValue);
  }
  function onActionSuccess(actionQueue, actionNode, nextState) {
    actionNode.status = "fulfilled";
    actionNode.value = nextState;
    notifyActionListeners(actionNode);
    actionQueue.state = nextState;
    actionNode = actionQueue.pending;
    null !== actionNode && (nextState = actionNode.next, nextState === actionNode ? actionQueue.pending = null : (nextState = nextState.next, actionNode.next = nextState, runActionStateAction(actionQueue, nextState)));
  }
  function onActionError(actionQueue, actionNode, error) {
    var last = actionQueue.pending;
    actionQueue.pending = null;
    if (null !== last) {
      last = last.next;
      do
        actionNode.status = "rejected", actionNode.reason = error, notifyActionListeners(actionNode), actionNode = actionNode.next;
      while (actionNode !== last);
    }
    actionQueue.action = null;
  }
  function notifyActionListeners(actionNode) {
    actionNode = actionNode.listeners;
    for (var i = 0; i < actionNode.length; i++) (0, actionNode[i])();
  }
  function actionStateReducer(oldState, newState) {
    return newState;
  }
  function mountActionState(action, initialStateProp) {
    if (isHydrating) {
      var ssrFormState = workInProgressRoot.formState;
      if (null !== ssrFormState) {
        a: {
          var JSCompiler_inline_result = currentlyRenderingFiber;
          if (isHydrating) {
            if (nextHydratableInstance) {
              b: {
                var JSCompiler_inline_result$jscomp$0 = nextHydratableInstance;
                for (var inRootOrSingleton = rootOrSingletonContext; 8 !== JSCompiler_inline_result$jscomp$0.nodeType; ) {
                  if (!inRootOrSingleton) {
                    JSCompiler_inline_result$jscomp$0 = null;
                    break b;
                  }
                  JSCompiler_inline_result$jscomp$0 = getNextHydratable(
                    JSCompiler_inline_result$jscomp$0.nextSibling
                  );
                  if (null === JSCompiler_inline_result$jscomp$0) {
                    JSCompiler_inline_result$jscomp$0 = null;
                    break b;
                  }
                }
                inRootOrSingleton = JSCompiler_inline_result$jscomp$0.data;
                JSCompiler_inline_result$jscomp$0 = "F!" === inRootOrSingleton || "F" === inRootOrSingleton ? JSCompiler_inline_result$jscomp$0 : null;
              }
              if (JSCompiler_inline_result$jscomp$0) {
                nextHydratableInstance = getNextHydratable(
                  JSCompiler_inline_result$jscomp$0.nextSibling
                );
                JSCompiler_inline_result = "F!" === JSCompiler_inline_result$jscomp$0.data;
                break a;
              }
            }
            throwOnHydrationMismatch(JSCompiler_inline_result);
          }
          JSCompiler_inline_result = false;
        }
        JSCompiler_inline_result && (initialStateProp = ssrFormState[0]);
      }
    }
    ssrFormState = mountWorkInProgressHook();
    ssrFormState.memoizedState = ssrFormState.baseState = initialStateProp;
    JSCompiler_inline_result = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: actionStateReducer,
      lastRenderedState: initialStateProp
    };
    ssrFormState.queue = JSCompiler_inline_result;
    ssrFormState = dispatchSetState.bind(
      null,
      currentlyRenderingFiber,
      JSCompiler_inline_result
    );
    JSCompiler_inline_result.dispatch = ssrFormState;
    JSCompiler_inline_result = mountStateImpl(false);
    inRootOrSingleton = dispatchOptimisticSetState.bind(
      null,
      currentlyRenderingFiber,
      false,
      JSCompiler_inline_result.queue
    );
    JSCompiler_inline_result = mountWorkInProgressHook();
    JSCompiler_inline_result$jscomp$0 = {
      state: initialStateProp,
      dispatch: null,
      action,
      pending: null
    };
    JSCompiler_inline_result.queue = JSCompiler_inline_result$jscomp$0;
    ssrFormState = dispatchActionState.bind(
      null,
      currentlyRenderingFiber,
      JSCompiler_inline_result$jscomp$0,
      inRootOrSingleton,
      ssrFormState
    );
    JSCompiler_inline_result$jscomp$0.dispatch = ssrFormState;
    JSCompiler_inline_result.memoizedState = action;
    return [initialStateProp, ssrFormState, false];
  }
  function updateActionState(action) {
    var stateHook = updateWorkInProgressHook();
    return updateActionStateImpl(stateHook, currentHook, action);
  }
  function updateActionStateImpl(stateHook, currentStateHook, action) {
    currentStateHook = updateReducerImpl(
      stateHook,
      currentStateHook,
      actionStateReducer
    )[0];
    stateHook = updateReducer(basicStateReducer)[0];
    if ("object" === typeof currentStateHook && null !== currentStateHook && "function" === typeof currentStateHook.then)
      try {
        var state = useThenable(currentStateHook);
      } catch (x) {
        if (x === SuspenseException) throw SuspenseActionException;
        throw x;
      }
    else state = currentStateHook;
    currentStateHook = updateWorkInProgressHook();
    var actionQueue = currentStateHook.queue, dispatch = actionQueue.dispatch;
    action !== currentStateHook.memoizedState && (currentlyRenderingFiber.flags |= 2048, pushSimpleEffect(
      9,
      { destroy: void 0 },
      actionStateActionEffect.bind(null, actionQueue, action),
      null
    ));
    return [state, dispatch, stateHook];
  }
  function actionStateActionEffect(actionQueue, action) {
    actionQueue.action = action;
  }
  function rerenderActionState(action) {
    var stateHook = updateWorkInProgressHook(), currentStateHook = currentHook;
    if (null !== currentStateHook)
      return updateActionStateImpl(stateHook, currentStateHook, action);
    updateWorkInProgressHook();
    stateHook = stateHook.memoizedState;
    currentStateHook = updateWorkInProgressHook();
    var dispatch = currentStateHook.queue.dispatch;
    currentStateHook.memoizedState = action;
    return [stateHook, dispatch, false];
  }
  function pushSimpleEffect(tag, inst, create, deps) {
    tag = { tag, create, deps, inst, next: null };
    inst = currentlyRenderingFiber.updateQueue;
    null === inst && (inst = createFunctionComponentUpdateQueue(), currentlyRenderingFiber.updateQueue = inst);
    create = inst.lastEffect;
    null === create ? inst.lastEffect = tag.next = tag : (deps = create.next, create.next = tag, tag.next = deps, inst.lastEffect = tag);
    return tag;
  }
  function updateRef() {
    return updateWorkInProgressHook().memoizedState;
  }
  function mountEffectImpl(fiberFlags, hookFlags, create, deps) {
    var hook = mountWorkInProgressHook();
    currentlyRenderingFiber.flags |= fiberFlags;
    hook.memoizedState = pushSimpleEffect(
      1 | hookFlags,
      { destroy: void 0 },
      create,
      void 0 === deps ? null : deps
    );
  }
  function updateEffectImpl(fiberFlags, hookFlags, create, deps) {
    var hook = updateWorkInProgressHook();
    deps = void 0 === deps ? null : deps;
    var inst = hook.memoizedState.inst;
    null !== currentHook && null !== deps && areHookInputsEqual(deps, currentHook.memoizedState.deps) ? hook.memoizedState = pushSimpleEffect(hookFlags, inst, create, deps) : (currentlyRenderingFiber.flags |= fiberFlags, hook.memoizedState = pushSimpleEffect(
      1 | hookFlags,
      inst,
      create,
      deps
    ));
  }
  function mountEffect(create, deps) {
    mountEffectImpl(8390656, 8, create, deps);
  }
  function updateEffect(create, deps) {
    updateEffectImpl(2048, 8, create, deps);
  }
  function useEffectEventImpl(payload) {
    currentlyRenderingFiber.flags |= 4;
    var componentUpdateQueue = currentlyRenderingFiber.updateQueue;
    if (null === componentUpdateQueue)
      componentUpdateQueue = createFunctionComponentUpdateQueue(), currentlyRenderingFiber.updateQueue = componentUpdateQueue, componentUpdateQueue.events = [payload];
    else {
      var events = componentUpdateQueue.events;
      null === events ? componentUpdateQueue.events = [payload] : events.push(payload);
    }
  }
  function updateEvent(callback) {
    var ref = updateWorkInProgressHook().memoizedState;
    useEffectEventImpl({ ref, nextImpl: callback });
    return function() {
      if (0 !== (executionContext & 2)) throw Error(formatProdErrorMessage(440));
      return ref.impl.apply(void 0, arguments);
    };
  }
  function updateInsertionEffect(create, deps) {
    return updateEffectImpl(4, 2, create, deps);
  }
  function updateLayoutEffect(create, deps) {
    return updateEffectImpl(4, 4, create, deps);
  }
  function imperativeHandleEffect(create, ref) {
    if ("function" === typeof ref) {
      create = create();
      var refCleanup = ref(create);
      return function() {
        "function" === typeof refCleanup ? refCleanup() : ref(null);
      };
    }
    if (null !== ref && void 0 !== ref)
      return create = create(), ref.current = create, function() {
        ref.current = null;
      };
  }
  function updateImperativeHandle(ref, create, deps) {
    deps = null !== deps && void 0 !== deps ? deps.concat([ref]) : null;
    updateEffectImpl(4, 4, imperativeHandleEffect.bind(null, create, ref), deps);
  }
  function mountDebugValue() {
  }
  function updateCallback(callback, deps) {
    var hook = updateWorkInProgressHook();
    deps = void 0 === deps ? null : deps;
    var prevState = hook.memoizedState;
    if (null !== deps && areHookInputsEqual(deps, prevState[1]))
      return prevState[0];
    hook.memoizedState = [callback, deps];
    return callback;
  }
  function updateMemo(nextCreate, deps) {
    var hook = updateWorkInProgressHook();
    deps = void 0 === deps ? null : deps;
    var prevState = hook.memoizedState;
    if (null !== deps && areHookInputsEqual(deps, prevState[1]))
      return prevState[0];
    prevState = nextCreate();
    if (shouldDoubleInvokeUserFnsInHooksDEV) {
      setIsStrictModeForDevtools(true);
      try {
        nextCreate();
      } finally {
        setIsStrictModeForDevtools(false);
      }
    }
    hook.memoizedState = [prevState, deps];
    return prevState;
  }
  function mountDeferredValueImpl(hook, value, initialValue) {
    if (void 0 === initialValue || 0 !== (renderLanes & 1073741824) && 0 === (workInProgressRootRenderLanes & 261930))
      return hook.memoizedState = value;
    hook.memoizedState = initialValue;
    hook = requestDeferredLane();
    currentlyRenderingFiber.lanes |= hook;
    workInProgressRootSkippedLanes |= hook;
    return initialValue;
  }
  function updateDeferredValueImpl(hook, prevValue, value, initialValue) {
    if (objectIs(value, prevValue)) return value;
    if (null !== currentTreeHiddenStackCursor.current)
      return hook = mountDeferredValueImpl(hook, value, initialValue), objectIs(hook, prevValue) || (didReceiveUpdate = true), hook;
    if (0 === (renderLanes & 42) || 0 !== (renderLanes & 1073741824) && 0 === (workInProgressRootRenderLanes & 261930))
      return didReceiveUpdate = true, hook.memoizedState = value;
    hook = requestDeferredLane();
    currentlyRenderingFiber.lanes |= hook;
    workInProgressRootSkippedLanes |= hook;
    return prevValue;
  }
  function startTransition(fiber, queue, pendingState, finishedState, callback) {
    var previousPriority = ReactDOMSharedInternals.p;
    ReactDOMSharedInternals.p = 0 !== previousPriority && 8 > previousPriority ? previousPriority : 8;
    var prevTransition = ReactSharedInternals.T, currentTransition = {};
    ReactSharedInternals.T = currentTransition;
    dispatchOptimisticSetState(fiber, false, queue, pendingState);
    try {
      var returnValue = callback(), onStartTransitionFinish = ReactSharedInternals.S;
      null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
      if (null !== returnValue && "object" === typeof returnValue && "function" === typeof returnValue.then) {
        var thenableForFinishedState = chainThenableValue(
          returnValue,
          finishedState
        );
        dispatchSetStateInternal(
          fiber,
          queue,
          thenableForFinishedState,
          requestUpdateLane(fiber)
        );
      } else
        dispatchSetStateInternal(
          fiber,
          queue,
          finishedState,
          requestUpdateLane(fiber)
        );
    } catch (error) {
      dispatchSetStateInternal(
        fiber,
        queue,
        { then: function() {
        }, status: "rejected", reason: error },
        requestUpdateLane()
      );
    } finally {
      ReactDOMSharedInternals.p = previousPriority, null !== prevTransition && null !== currentTransition.types && (prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
    }
  }
  function noop() {
  }
  function startHostTransition(formFiber, pendingState, action, formData) {
    if (5 !== formFiber.tag) throw Error(formatProdErrorMessage(476));
    var queue = ensureFormComponentIsStateful(formFiber).queue;
    startTransition(
      formFiber,
      queue,
      pendingState,
      sharedNotPendingObject,
      null === action ? noop : function() {
        requestFormReset$1(formFiber);
        return action(formData);
      }
    );
  }
  function ensureFormComponentIsStateful(formFiber) {
    var existingStateHook = formFiber.memoizedState;
    if (null !== existingStateHook) return existingStateHook;
    existingStateHook = {
      memoizedState: sharedNotPendingObject,
      baseState: sharedNotPendingObject,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: basicStateReducer,
        lastRenderedState: sharedNotPendingObject
      },
      next: null
    };
    var initialResetState = {};
    existingStateHook.next = {
      memoizedState: initialResetState,
      baseState: initialResetState,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: basicStateReducer,
        lastRenderedState: initialResetState
      },
      next: null
    };
    formFiber.memoizedState = existingStateHook;
    formFiber = formFiber.alternate;
    null !== formFiber && (formFiber.memoizedState = existingStateHook);
    return existingStateHook;
  }
  function requestFormReset$1(formFiber) {
    var stateHook = ensureFormComponentIsStateful(formFiber);
    null === stateHook.next && (stateHook = formFiber.alternate.memoizedState);
    dispatchSetStateInternal(
      formFiber,
      stateHook.next.queue,
      {},
      requestUpdateLane()
    );
  }
  function useHostTransitionStatus() {
    return readContext(HostTransitionContext);
  }
  function updateId() {
    return updateWorkInProgressHook().memoizedState;
  }
  function updateRefresh() {
    return updateWorkInProgressHook().memoizedState;
  }
  function refreshCache(fiber) {
    for (var provider = fiber.return; null !== provider; ) {
      switch (provider.tag) {
        case 24:
        case 3:
          var lane = requestUpdateLane();
          fiber = createUpdate(lane);
          var root$69 = enqueueUpdate(provider, fiber, lane);
          null !== root$69 && (scheduleUpdateOnFiber(root$69, provider, lane), entangleTransitions(root$69, provider, lane));
          provider = { cache: createCache() };
          fiber.payload = provider;
          return;
      }
      provider = provider.return;
    }
  }
  function dispatchReducerAction(fiber, queue, action) {
    var lane = requestUpdateLane();
    action = {
      lane,
      revertLane: 0,
      gesture: null,
      action,
      hasEagerState: false,
      eagerState: null,
      next: null
    };
    isRenderPhaseUpdate(fiber) ? enqueueRenderPhaseUpdate(queue, action) : (action = enqueueConcurrentHookUpdate(fiber, queue, action, lane), null !== action && (scheduleUpdateOnFiber(action, fiber, lane), entangleTransitionUpdate(action, queue, lane)));
  }
  function dispatchSetState(fiber, queue, action) {
    var lane = requestUpdateLane();
    dispatchSetStateInternal(fiber, queue, action, lane);
  }
  function dispatchSetStateInternal(fiber, queue, action, lane) {
    var update = {
      lane,
      revertLane: 0,
      gesture: null,
      action,
      hasEagerState: false,
      eagerState: null,
      next: null
    };
    if (isRenderPhaseUpdate(fiber)) enqueueRenderPhaseUpdate(queue, update);
    else {
      var alternate = fiber.alternate;
      if (0 === fiber.lanes && (null === alternate || 0 === alternate.lanes) && (alternate = queue.lastRenderedReducer, null !== alternate))
        try {
          var currentState = queue.lastRenderedState, eagerState = alternate(currentState, action);
          update.hasEagerState = true;
          update.eagerState = eagerState;
          if (objectIs(eagerState, currentState))
            return enqueueUpdate$1(fiber, queue, update, 0), null === workInProgressRoot && finishQueueingConcurrentUpdates(), false;
        } catch (error) {
        } finally {
        }
      action = enqueueConcurrentHookUpdate(fiber, queue, update, lane);
      if (null !== action)
        return scheduleUpdateOnFiber(action, fiber, lane), entangleTransitionUpdate(action, queue, lane), true;
    }
    return false;
  }
  function dispatchOptimisticSetState(fiber, throwIfDuringRender, queue, action) {
    action = {
      lane: 2,
      revertLane: requestTransitionLane(),
      gesture: null,
      action,
      hasEagerState: false,
      eagerState: null,
      next: null
    };
    if (isRenderPhaseUpdate(fiber)) {
      if (throwIfDuringRender) throw Error(formatProdErrorMessage(479));
    } else
      throwIfDuringRender = enqueueConcurrentHookUpdate(
        fiber,
        queue,
        action,
        2
      ), null !== throwIfDuringRender && scheduleUpdateOnFiber(throwIfDuringRender, fiber, 2);
  }
  function isRenderPhaseUpdate(fiber) {
    var alternate = fiber.alternate;
    return fiber === currentlyRenderingFiber || null !== alternate && alternate === currentlyRenderingFiber;
  }
  function enqueueRenderPhaseUpdate(queue, update) {
    didScheduleRenderPhaseUpdateDuringThisPass = didScheduleRenderPhaseUpdate = true;
    var pending = queue.pending;
    null === pending ? update.next = update : (update.next = pending.next, pending.next = update);
    queue.pending = update;
  }
  function entangleTransitionUpdate(root2, queue, lane) {
    if (0 !== (lane & 4194048)) {
      var queueLanes = queue.lanes;
      queueLanes &= root2.pendingLanes;
      lane |= queueLanes;
      queue.lanes = lane;
      markRootEntangled(root2, lane);
    }
  }
  var ContextOnlyDispatcher = {
    readContext,
    use,
    useCallback: throwInvalidHookError,
    useContext: throwInvalidHookError,
    useEffect: throwInvalidHookError,
    useImperativeHandle: throwInvalidHookError,
    useLayoutEffect: throwInvalidHookError,
    useInsertionEffect: throwInvalidHookError,
    useMemo: throwInvalidHookError,
    useReducer: throwInvalidHookError,
    useRef: throwInvalidHookError,
    useState: throwInvalidHookError,
    useDebugValue: throwInvalidHookError,
    useDeferredValue: throwInvalidHookError,
    useTransition: throwInvalidHookError,
    useSyncExternalStore: throwInvalidHookError,
    useId: throwInvalidHookError,
    useHostTransitionStatus: throwInvalidHookError,
    useFormState: throwInvalidHookError,
    useActionState: throwInvalidHookError,
    useOptimistic: throwInvalidHookError,
    useMemoCache: throwInvalidHookError,
    useCacheRefresh: throwInvalidHookError
  };
  ContextOnlyDispatcher.useEffectEvent = throwInvalidHookError;
  var HooksDispatcherOnMount = {
    readContext,
    use,
    useCallback: function(callback, deps) {
      mountWorkInProgressHook().memoizedState = [
        callback,
        void 0 === deps ? null : deps
      ];
      return callback;
    },
    useContext: readContext,
    useEffect: mountEffect,
    useImperativeHandle: function(ref, create, deps) {
      deps = null !== deps && void 0 !== deps ? deps.concat([ref]) : null;
      mountEffectImpl(
        4194308,
        4,
        imperativeHandleEffect.bind(null, create, ref),
        deps
      );
    },
    useLayoutEffect: function(create, deps) {
      return mountEffectImpl(4194308, 4, create, deps);
    },
    useInsertionEffect: function(create, deps) {
      mountEffectImpl(4, 2, create, deps);
    },
    useMemo: function(nextCreate, deps) {
      var hook = mountWorkInProgressHook();
      deps = void 0 === deps ? null : deps;
      var nextValue = nextCreate();
      if (shouldDoubleInvokeUserFnsInHooksDEV) {
        setIsStrictModeForDevtools(true);
        try {
          nextCreate();
        } finally {
          setIsStrictModeForDevtools(false);
        }
      }
      hook.memoizedState = [nextValue, deps];
      return nextValue;
    },
    useReducer: function(reducer, initialArg, init) {
      var hook = mountWorkInProgressHook();
      if (void 0 !== init) {
        var initialState = init(initialArg);
        if (shouldDoubleInvokeUserFnsInHooksDEV) {
          setIsStrictModeForDevtools(true);
          try {
            init(initialArg);
          } finally {
            setIsStrictModeForDevtools(false);
          }
        }
      } else initialState = initialArg;
      hook.memoizedState = hook.baseState = initialState;
      reducer = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: reducer,
        lastRenderedState: initialState
      };
      hook.queue = reducer;
      reducer = reducer.dispatch = dispatchReducerAction.bind(
        null,
        currentlyRenderingFiber,
        reducer
      );
      return [hook.memoizedState, reducer];
    },
    useRef: function(initialValue) {
      var hook = mountWorkInProgressHook();
      initialValue = { current: initialValue };
      return hook.memoizedState = initialValue;
    },
    useState: function(initialState) {
      initialState = mountStateImpl(initialState);
      var queue = initialState.queue, dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);
      queue.dispatch = dispatch;
      return [initialState.memoizedState, dispatch];
    },
    useDebugValue: mountDebugValue,
    useDeferredValue: function(value, initialValue) {
      var hook = mountWorkInProgressHook();
      return mountDeferredValueImpl(hook, value, initialValue);
    },
    useTransition: function() {
      var stateHook = mountStateImpl(false);
      stateHook = startTransition.bind(
        null,
        currentlyRenderingFiber,
        stateHook.queue,
        true,
        false
      );
      mountWorkInProgressHook().memoizedState = stateHook;
      return [false, stateHook];
    },
    useSyncExternalStore: function(subscribe, getSnapshot, getServerSnapshot) {
      var fiber = currentlyRenderingFiber, hook = mountWorkInProgressHook();
      if (isHydrating) {
        if (void 0 === getServerSnapshot)
          throw Error(formatProdErrorMessage(407));
        getServerSnapshot = getServerSnapshot();
      } else {
        getServerSnapshot = getSnapshot();
        if (null === workInProgressRoot)
          throw Error(formatProdErrorMessage(349));
        0 !== (workInProgressRootRenderLanes & 127) || pushStoreConsistencyCheck(fiber, getSnapshot, getServerSnapshot);
      }
      hook.memoizedState = getServerSnapshot;
      var inst = { value: getServerSnapshot, getSnapshot };
      hook.queue = inst;
      mountEffect(subscribeToStore.bind(null, fiber, inst, subscribe), [
        subscribe
      ]);
      fiber.flags |= 2048;
      pushSimpleEffect(
        9,
        { destroy: void 0 },
        updateStoreInstance.bind(
          null,
          fiber,
          inst,
          getServerSnapshot,
          getSnapshot
        ),
        null
      );
      return getServerSnapshot;
    },
    useId: function() {
      var hook = mountWorkInProgressHook(), identifierPrefix = workInProgressRoot.identifierPrefix;
      if (isHydrating) {
        var JSCompiler_inline_result = treeContextOverflow;
        var idWithLeadingBit = treeContextId;
        JSCompiler_inline_result = (idWithLeadingBit & ~(1 << 32 - clz32(idWithLeadingBit) - 1)).toString(32) + JSCompiler_inline_result;
        identifierPrefix = "_" + identifierPrefix + "R_" + JSCompiler_inline_result;
        JSCompiler_inline_result = localIdCounter++;
        0 < JSCompiler_inline_result && (identifierPrefix += "H" + JSCompiler_inline_result.toString(32));
        identifierPrefix += "_";
      } else
        JSCompiler_inline_result = globalClientIdCounter++, identifierPrefix = "_" + identifierPrefix + "r_" + JSCompiler_inline_result.toString(32) + "_";
      return hook.memoizedState = identifierPrefix;
    },
    useHostTransitionStatus,
    useFormState: mountActionState,
    useActionState: mountActionState,
    useOptimistic: function(passthrough) {
      var hook = mountWorkInProgressHook();
      hook.memoizedState = hook.baseState = passthrough;
      var queue = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: null,
        lastRenderedState: null
      };
      hook.queue = queue;
      hook = dispatchOptimisticSetState.bind(
        null,
        currentlyRenderingFiber,
        true,
        queue
      );
      queue.dispatch = hook;
      return [passthrough, hook];
    },
    useMemoCache,
    useCacheRefresh: function() {
      return mountWorkInProgressHook().memoizedState = refreshCache.bind(
        null,
        currentlyRenderingFiber
      );
    },
    useEffectEvent: function(callback) {
      var hook = mountWorkInProgressHook(), ref = { impl: callback };
      hook.memoizedState = ref;
      return function() {
        if (0 !== (executionContext & 2))
          throw Error(formatProdErrorMessage(440));
        return ref.impl.apply(void 0, arguments);
      };
    }
  }, HooksDispatcherOnUpdate = {
    readContext,
    use,
    useCallback: updateCallback,
    useContext: readContext,
    useEffect: updateEffect,
    useImperativeHandle: updateImperativeHandle,
    useInsertionEffect: updateInsertionEffect,
    useLayoutEffect: updateLayoutEffect,
    useMemo: updateMemo,
    useReducer: updateReducer,
    useRef: updateRef,
    useState: function() {
      return updateReducer(basicStateReducer);
    },
    useDebugValue: mountDebugValue,
    useDeferredValue: function(value, initialValue) {
      var hook = updateWorkInProgressHook();
      return updateDeferredValueImpl(
        hook,
        currentHook.memoizedState,
        value,
        initialValue
      );
    },
    useTransition: function() {
      var booleanOrThenable = updateReducer(basicStateReducer)[0], start = updateWorkInProgressHook().memoizedState;
      return [
        "boolean" === typeof booleanOrThenable ? booleanOrThenable : useThenable(booleanOrThenable),
        start
      ];
    },
    useSyncExternalStore: updateSyncExternalStore,
    useId: updateId,
    useHostTransitionStatus,
    useFormState: updateActionState,
    useActionState: updateActionState,
    useOptimistic: function(passthrough, reducer) {
      var hook = updateWorkInProgressHook();
      return updateOptimisticImpl(hook, currentHook, passthrough, reducer);
    },
    useMemoCache,
    useCacheRefresh: updateRefresh
  };
  HooksDispatcherOnUpdate.useEffectEvent = updateEvent;
  var HooksDispatcherOnRerender = {
    readContext,
    use,
    useCallback: updateCallback,
    useContext: readContext,
    useEffect: updateEffect,
    useImperativeHandle: updateImperativeHandle,
    useInsertionEffect: updateInsertionEffect,
    useLayoutEffect: updateLayoutEffect,
    useMemo: updateMemo,
    useReducer: rerenderReducer,
    useRef: updateRef,
    useState: function() {
      return rerenderReducer(basicStateReducer);
    },
    useDebugValue: mountDebugValue,
    useDeferredValue: function(value, initialValue) {
      var hook = updateWorkInProgressHook();
      return null === currentHook ? mountDeferredValueImpl(hook, value, initialValue) : updateDeferredValueImpl(
        hook,
        currentHook.memoizedState,
        value,
        initialValue
      );
    },
    useTransition: function() {
      var booleanOrThenable = rerenderReducer(basicStateReducer)[0], start = updateWorkInProgressHook().memoizedState;
      return [
        "boolean" === typeof booleanOrThenable ? booleanOrThenable : useThenable(booleanOrThenable),
        start
      ];
    },
    useSyncExternalStore: updateSyncExternalStore,
    useId: updateId,
    useHostTransitionStatus,
    useFormState: rerenderActionState,
    useActionState: rerenderActionState,
    useOptimistic: function(passthrough, reducer) {
      var hook = updateWorkInProgressHook();
      if (null !== currentHook)
        return updateOptimisticImpl(hook, currentHook, passthrough, reducer);
      hook.baseState = passthrough;
      return [passthrough, hook.queue.dispatch];
    },
    useMemoCache,
    useCacheRefresh: updateRefresh
  };
  HooksDispatcherOnRerender.useEffectEvent = updateEvent;
  function applyDerivedStateFromProps(workInProgress2, ctor, getDerivedStateFromProps, nextProps) {
    ctor = workInProgress2.memoizedState;
    getDerivedStateFromProps = getDerivedStateFromProps(nextProps, ctor);
    getDerivedStateFromProps = null === getDerivedStateFromProps || void 0 === getDerivedStateFromProps ? ctor : assign({}, ctor, getDerivedStateFromProps);
    workInProgress2.memoizedState = getDerivedStateFromProps;
    0 === workInProgress2.lanes && (workInProgress2.updateQueue.baseState = getDerivedStateFromProps);
  }
  var classComponentUpdater = {
    enqueueSetState: function(inst, payload, callback) {
      inst = inst._reactInternals;
      var lane = requestUpdateLane(), update = createUpdate(lane);
      update.payload = payload;
      void 0 !== callback && null !== callback && (update.callback = callback);
      payload = enqueueUpdate(inst, update, lane);
      null !== payload && (scheduleUpdateOnFiber(payload, inst, lane), entangleTransitions(payload, inst, lane));
    },
    enqueueReplaceState: function(inst, payload, callback) {
      inst = inst._reactInternals;
      var lane = requestUpdateLane(), update = createUpdate(lane);
      update.tag = 1;
      update.payload = payload;
      void 0 !== callback && null !== callback && (update.callback = callback);
      payload = enqueueUpdate(inst, update, lane);
      null !== payload && (scheduleUpdateOnFiber(payload, inst, lane), entangleTransitions(payload, inst, lane));
    },
    enqueueForceUpdate: function(inst, callback) {
      inst = inst._reactInternals;
      var lane = requestUpdateLane(), update = createUpdate(lane);
      update.tag = 2;
      void 0 !== callback && null !== callback && (update.callback = callback);
      callback = enqueueUpdate(inst, update, lane);
      null !== callback && (scheduleUpdateOnFiber(callback, inst, lane), entangleTransitions(callback, inst, lane));
    }
  };
  function checkShouldComponentUpdate(workInProgress2, ctor, oldProps, newProps, oldState, newState, nextContext) {
    workInProgress2 = workInProgress2.stateNode;
    return "function" === typeof workInProgress2.shouldComponentUpdate ? workInProgress2.shouldComponentUpdate(newProps, newState, nextContext) : ctor.prototype && ctor.prototype.isPureReactComponent ? !shallowEqual(oldProps, newProps) || !shallowEqual(oldState, newState) : true;
  }
  function callComponentWillReceiveProps(workInProgress2, instance, newProps, nextContext) {
    workInProgress2 = instance.state;
    "function" === typeof instance.componentWillReceiveProps && instance.componentWillReceiveProps(newProps, nextContext);
    "function" === typeof instance.UNSAFE_componentWillReceiveProps && instance.UNSAFE_componentWillReceiveProps(newProps, nextContext);
    instance.state !== workInProgress2 && classComponentUpdater.enqueueReplaceState(instance, instance.state, null);
  }
  function resolveClassComponentProps(Component, baseProps) {
    var newProps = baseProps;
    if ("ref" in baseProps) {
      newProps = {};
      for (var propName in baseProps)
        "ref" !== propName && (newProps[propName] = baseProps[propName]);
    }
    if (Component = Component.defaultProps) {
      newProps === baseProps && (newProps = assign({}, newProps));
      for (var propName$73 in Component)
        void 0 === newProps[propName$73] && (newProps[propName$73] = Component[propName$73]);
    }
    return newProps;
  }
  function defaultOnUncaughtError(error) {
    reportGlobalError(error);
  }
  function defaultOnCaughtError(error) {
    console.error(error);
  }
  function defaultOnRecoverableError(error) {
    reportGlobalError(error);
  }
  function logUncaughtError(root2, errorInfo) {
    try {
      var onUncaughtError = root2.onUncaughtError;
      onUncaughtError(errorInfo.value, { componentStack: errorInfo.stack });
    } catch (e$74) {
      setTimeout(function() {
        throw e$74;
      });
    }
  }
  function logCaughtError(root2, boundary, errorInfo) {
    try {
      var onCaughtError = root2.onCaughtError;
      onCaughtError(errorInfo.value, {
        componentStack: errorInfo.stack,
        errorBoundary: 1 === boundary.tag ? boundary.stateNode : null
      });
    } catch (e$75) {
      setTimeout(function() {
        throw e$75;
      });
    }
  }
  function createRootErrorUpdate(root2, errorInfo, lane) {
    lane = createUpdate(lane);
    lane.tag = 3;
    lane.payload = { element: null };
    lane.callback = function() {
      logUncaughtError(root2, errorInfo);
    };
    return lane;
  }
  function createClassErrorUpdate(lane) {
    lane = createUpdate(lane);
    lane.tag = 3;
    return lane;
  }
  function initializeClassErrorUpdate(update, root2, fiber, errorInfo) {
    var getDerivedStateFromError = fiber.type.getDerivedStateFromError;
    if ("function" === typeof getDerivedStateFromError) {
      var error = errorInfo.value;
      update.payload = function() {
        return getDerivedStateFromError(error);
      };
      update.callback = function() {
        logCaughtError(root2, fiber, errorInfo);
      };
    }
    var inst = fiber.stateNode;
    null !== inst && "function" === typeof inst.componentDidCatch && (update.callback = function() {
      logCaughtError(root2, fiber, errorInfo);
      "function" !== typeof getDerivedStateFromError && (null === legacyErrorBoundariesThatAlreadyFailed ? legacyErrorBoundariesThatAlreadyFailed = /* @__PURE__ */ new Set([this]) : legacyErrorBoundariesThatAlreadyFailed.add(this));
      var stack = errorInfo.stack;
      this.componentDidCatch(errorInfo.value, {
        componentStack: null !== stack ? stack : ""
      });
    });
  }
  function throwException(root2, returnFiber, sourceFiber, value, rootRenderLanes) {
    sourceFiber.flags |= 32768;
    if (null !== value && "object" === typeof value && "function" === typeof value.then) {
      returnFiber = sourceFiber.alternate;
      null !== returnFiber && propagateParentContextChanges(
        returnFiber,
        sourceFiber,
        rootRenderLanes,
        true
      );
      sourceFiber = suspenseHandlerStackCursor.current;
      if (null !== sourceFiber) {
        switch (sourceFiber.tag) {
          case 31:
          case 13:
            return null === shellBoundary ? renderDidSuspendDelayIfPossible() : null === sourceFiber.alternate && 0 === workInProgressRootExitStatus && (workInProgressRootExitStatus = 3), sourceFiber.flags &= -257, sourceFiber.flags |= 65536, sourceFiber.lanes = rootRenderLanes, value === noopSuspenseyCommitThenable ? sourceFiber.flags |= 16384 : (returnFiber = sourceFiber.updateQueue, null === returnFiber ? sourceFiber.updateQueue = /* @__PURE__ */ new Set([value]) : returnFiber.add(value), attachPingListener(root2, value, rootRenderLanes)), false;
          case 22:
            return sourceFiber.flags |= 65536, value === noopSuspenseyCommitThenable ? sourceFiber.flags |= 16384 : (returnFiber = sourceFiber.updateQueue, null === returnFiber ? (returnFiber = {
              transitions: null,
              markerInstances: null,
              retryQueue: /* @__PURE__ */ new Set([value])
            }, sourceFiber.updateQueue = returnFiber) : (sourceFiber = returnFiber.retryQueue, null === sourceFiber ? returnFiber.retryQueue = /* @__PURE__ */ new Set([value]) : sourceFiber.add(value)), attachPingListener(root2, value, rootRenderLanes)), false;
        }
        throw Error(formatProdErrorMessage(435, sourceFiber.tag));
      }
      attachPingListener(root2, value, rootRenderLanes);
      renderDidSuspendDelayIfPossible();
      return false;
    }
    if (isHydrating)
      return returnFiber = suspenseHandlerStackCursor.current, null !== returnFiber ? (0 === (returnFiber.flags & 65536) && (returnFiber.flags |= 256), returnFiber.flags |= 65536, returnFiber.lanes = rootRenderLanes, value !== HydrationMismatchException && (root2 = Error(formatProdErrorMessage(422), { cause: value }), queueHydrationError(createCapturedValueAtFiber(root2, sourceFiber)))) : (value !== HydrationMismatchException && (returnFiber = Error(formatProdErrorMessage(423), {
        cause: value
      }), queueHydrationError(
        createCapturedValueAtFiber(returnFiber, sourceFiber)
      )), root2 = root2.current.alternate, root2.flags |= 65536, rootRenderLanes &= -rootRenderLanes, root2.lanes |= rootRenderLanes, value = createCapturedValueAtFiber(value, sourceFiber), rootRenderLanes = createRootErrorUpdate(
        root2.stateNode,
        value,
        rootRenderLanes
      ), enqueueCapturedUpdate(root2, rootRenderLanes), 4 !== workInProgressRootExitStatus && (workInProgressRootExitStatus = 2)), false;
    var wrapperError = Error(formatProdErrorMessage(520), { cause: value });
    wrapperError = createCapturedValueAtFiber(wrapperError, sourceFiber);
    null === workInProgressRootConcurrentErrors ? workInProgressRootConcurrentErrors = [wrapperError] : workInProgressRootConcurrentErrors.push(wrapperError);
    4 !== workInProgressRootExitStatus && (workInProgressRootExitStatus = 2);
    if (null === returnFiber) return true;
    value = createCapturedValueAtFiber(value, sourceFiber);
    sourceFiber = returnFiber;
    do {
      switch (sourceFiber.tag) {
        case 3:
          return sourceFiber.flags |= 65536, root2 = rootRenderLanes & -rootRenderLanes, sourceFiber.lanes |= root2, root2 = createRootErrorUpdate(sourceFiber.stateNode, value, root2), enqueueCapturedUpdate(sourceFiber, root2), false;
        case 1:
          if (returnFiber = sourceFiber.type, wrapperError = sourceFiber.stateNode, 0 === (sourceFiber.flags & 128) && ("function" === typeof returnFiber.getDerivedStateFromError || null !== wrapperError && "function" === typeof wrapperError.componentDidCatch && (null === legacyErrorBoundariesThatAlreadyFailed || !legacyErrorBoundariesThatAlreadyFailed.has(wrapperError))))
            return sourceFiber.flags |= 65536, rootRenderLanes &= -rootRenderLanes, sourceFiber.lanes |= rootRenderLanes, rootRenderLanes = createClassErrorUpdate(rootRenderLanes), initializeClassErrorUpdate(
              rootRenderLanes,
              root2,
              sourceFiber,
              value
            ), enqueueCapturedUpdate(sourceFiber, rootRenderLanes), false;
      }
      sourceFiber = sourceFiber.return;
    } while (null !== sourceFiber);
    return false;
  }
  var SelectiveHydrationException = Error(formatProdErrorMessage(461)), didReceiveUpdate = false;
  function reconcileChildren(current, workInProgress2, nextChildren, renderLanes2) {
    workInProgress2.child = null === current ? mountChildFibers(workInProgress2, null, nextChildren, renderLanes2) : reconcileChildFibers(
      workInProgress2,
      current.child,
      nextChildren,
      renderLanes2
    );
  }
  function updateForwardRef(current, workInProgress2, Component, nextProps, renderLanes2) {
    Component = Component.render;
    var ref = workInProgress2.ref;
    if ("ref" in nextProps) {
      var propsWithoutRef = {};
      for (var key in nextProps)
        "ref" !== key && (propsWithoutRef[key] = nextProps[key]);
    } else propsWithoutRef = nextProps;
    prepareToReadContext(workInProgress2);
    nextProps = renderWithHooks(
      current,
      workInProgress2,
      Component,
      propsWithoutRef,
      ref,
      renderLanes2
    );
    key = checkDidRenderIdHook();
    if (null !== current && !didReceiveUpdate)
      return bailoutHooks(current, workInProgress2, renderLanes2), bailoutOnAlreadyFinishedWork(current, workInProgress2, renderLanes2);
    isHydrating && key && pushMaterializedTreeId(workInProgress2);
    workInProgress2.flags |= 1;
    reconcileChildren(current, workInProgress2, nextProps, renderLanes2);
    return workInProgress2.child;
  }
  function updateMemoComponent(current, workInProgress2, Component, nextProps, renderLanes2) {
    if (null === current) {
      var type = Component.type;
      if ("function" === typeof type && !shouldConstruct(type) && void 0 === type.defaultProps && null === Component.compare)
        return workInProgress2.tag = 15, workInProgress2.type = type, updateSimpleMemoComponent(
          current,
          workInProgress2,
          type,
          nextProps,
          renderLanes2
        );
      current = createFiberFromTypeAndProps(
        Component.type,
        null,
        nextProps,
        workInProgress2,
        workInProgress2.mode,
        renderLanes2
      );
      current.ref = workInProgress2.ref;
      current.return = workInProgress2;
      return workInProgress2.child = current;
    }
    type = current.child;
    if (!checkScheduledUpdateOrContext(current, renderLanes2)) {
      var prevProps = type.memoizedProps;
      Component = Component.compare;
      Component = null !== Component ? Component : shallowEqual;
      if (Component(prevProps, nextProps) && current.ref === workInProgress2.ref)
        return bailoutOnAlreadyFinishedWork(current, workInProgress2, renderLanes2);
    }
    workInProgress2.flags |= 1;
    current = createWorkInProgress(type, nextProps);
    current.ref = workInProgress2.ref;
    current.return = workInProgress2;
    return workInProgress2.child = current;
  }
  function updateSimpleMemoComponent(current, workInProgress2, Component, nextProps, renderLanes2) {
    if (null !== current) {
      var prevProps = current.memoizedProps;
      if (shallowEqual(prevProps, nextProps) && current.ref === workInProgress2.ref)
        if (didReceiveUpdate = false, workInProgress2.pendingProps = nextProps = prevProps, checkScheduledUpdateOrContext(current, renderLanes2))
          0 !== (current.flags & 131072) && (didReceiveUpdate = true);
        else
          return workInProgress2.lanes = current.lanes, bailoutOnAlreadyFinishedWork(current, workInProgress2, renderLanes2);
    }
    return updateFunctionComponent(
      current,
      workInProgress2,
      Component,
      nextProps,
      renderLanes2
    );
  }
  function updateOffscreenComponent(current, workInProgress2, renderLanes2, nextProps) {
    var nextChildren = nextProps.children, prevState = null !== current ? current.memoizedState : null;
    null === current && null === workInProgress2.stateNode && (workInProgress2.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    });
    if ("hidden" === nextProps.mode) {
      if (0 !== (workInProgress2.flags & 128)) {
        prevState = null !== prevState ? prevState.baseLanes | renderLanes2 : renderLanes2;
        if (null !== current) {
          nextProps = workInProgress2.child = current.child;
          for (nextChildren = 0; null !== nextProps; )
            nextChildren = nextChildren | nextProps.lanes | nextProps.childLanes, nextProps = nextProps.sibling;
          nextProps = nextChildren & ~prevState;
        } else nextProps = 0, workInProgress2.child = null;
        return deferHiddenOffscreenComponent(
          current,
          workInProgress2,
          prevState,
          renderLanes2,
          nextProps
        );
      }
      if (0 !== (renderLanes2 & 536870912))
        workInProgress2.memoizedState = { baseLanes: 0, cachePool: null }, null !== current && pushTransition(
          workInProgress2,
          null !== prevState ? prevState.cachePool : null
        ), null !== prevState ? pushHiddenContext(workInProgress2, prevState) : reuseHiddenContextOnStack(), pushOffscreenSuspenseHandler(workInProgress2);
      else
        return nextProps = workInProgress2.lanes = 536870912, deferHiddenOffscreenComponent(
          current,
          workInProgress2,
          null !== prevState ? prevState.baseLanes | renderLanes2 : renderLanes2,
          renderLanes2,
          nextProps
        );
    } else
      null !== prevState ? (pushTransition(workInProgress2, prevState.cachePool), pushHiddenContext(workInProgress2, prevState), reuseSuspenseHandlerOnStack(), workInProgress2.memoizedState = null) : (null !== current && pushTransition(workInProgress2, null), reuseHiddenContextOnStack(), reuseSuspenseHandlerOnStack());
    reconcileChildren(current, workInProgress2, nextChildren, renderLanes2);
    return workInProgress2.child;
  }
  function bailoutOffscreenComponent(current, workInProgress2) {
    null !== current && 22 === current.tag || null !== workInProgress2.stateNode || (workInProgress2.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    });
    return workInProgress2.sibling;
  }
  function deferHiddenOffscreenComponent(current, workInProgress2, nextBaseLanes, renderLanes2, remainingChildLanes) {
    var JSCompiler_inline_result = peekCacheFromPool();
    JSCompiler_inline_result = null === JSCompiler_inline_result ? null : { parent: CacheContext._currentValue, pool: JSCompiler_inline_result };
    workInProgress2.memoizedState = {
      baseLanes: nextBaseLanes,
      cachePool: JSCompiler_inline_result
    };
    null !== current && pushTransition(workInProgress2, null);
    reuseHiddenContextOnStack();
    pushOffscreenSuspenseHandler(workInProgress2);
    null !== current && propagateParentContextChanges(current, workInProgress2, renderLanes2, true);
    workInProgress2.childLanes = remainingChildLanes;
    return null;
  }
  function mountActivityChildren(workInProgress2, nextProps) {
    nextProps = mountWorkInProgressOffscreenFiber(
      { mode: nextProps.mode, children: nextProps.children },
      workInProgress2.mode
    );
    nextProps.ref = workInProgress2.ref;
    workInProgress2.child = nextProps;
    nextProps.return = workInProgress2;
    return nextProps;
  }
  function retryActivityComponentWithoutHydrating(current, workInProgress2, renderLanes2) {
    reconcileChildFibers(workInProgress2, current.child, null, renderLanes2);
    current = mountActivityChildren(workInProgress2, workInProgress2.pendingProps);
    current.flags |= 2;
    popSuspenseHandler(workInProgress2);
    workInProgress2.memoizedState = null;
    return current;
  }
  function updateActivityComponent(current, workInProgress2, renderLanes2) {
    var nextProps = workInProgress2.pendingProps, didSuspend = 0 !== (workInProgress2.flags & 128);
    workInProgress2.flags &= -129;
    if (null === current) {
      if (isHydrating) {
        if ("hidden" === nextProps.mode)
          return current = mountActivityChildren(workInProgress2, nextProps), workInProgress2.lanes = 536870912, bailoutOffscreenComponent(null, current);
        pushDehydratedActivitySuspenseHandler(workInProgress2);
        (current = nextHydratableInstance) ? (current = canHydrateHydrationBoundary(
          current,
          rootOrSingletonContext
        ), current = null !== current && "&" === current.data ? current : null, null !== current && (workInProgress2.memoizedState = {
          dehydrated: current,
          treeContext: null !== treeContextProvider ? { id: treeContextId, overflow: treeContextOverflow } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, renderLanes2 = createFiberFromDehydratedFragment(current), renderLanes2.return = workInProgress2, workInProgress2.child = renderLanes2, hydrationParentFiber = workInProgress2, nextHydratableInstance = null)) : current = null;
        if (null === current) throw throwOnHydrationMismatch(workInProgress2);
        workInProgress2.lanes = 536870912;
        return null;
      }
      return mountActivityChildren(workInProgress2, nextProps);
    }
    var prevState = current.memoizedState;
    if (null !== prevState) {
      var dehydrated = prevState.dehydrated;
      pushDehydratedActivitySuspenseHandler(workInProgress2);
      if (didSuspend)
        if (workInProgress2.flags & 256)
          workInProgress2.flags &= -257, workInProgress2 = retryActivityComponentWithoutHydrating(
            current,
            workInProgress2,
            renderLanes2
          );
        else if (null !== workInProgress2.memoizedState)
          workInProgress2.child = current.child, workInProgress2.flags |= 128, workInProgress2 = null;
        else throw Error(formatProdErrorMessage(558));
      else if (didReceiveUpdate || propagateParentContextChanges(current, workInProgress2, renderLanes2, false), didSuspend = 0 !== (renderLanes2 & current.childLanes), didReceiveUpdate || didSuspend) {
        nextProps = workInProgressRoot;
        if (null !== nextProps && (dehydrated = getBumpedLaneForHydration(nextProps, renderLanes2), 0 !== dehydrated && dehydrated !== prevState.retryLane))
          throw prevState.retryLane = dehydrated, enqueueConcurrentRenderForLane(current, dehydrated), scheduleUpdateOnFiber(nextProps, current, dehydrated), SelectiveHydrationException;
        renderDidSuspendDelayIfPossible();
        workInProgress2 = retryActivityComponentWithoutHydrating(
          current,
          workInProgress2,
          renderLanes2
        );
      } else
        current = prevState.treeContext, nextHydratableInstance = getNextHydratable(dehydrated.nextSibling), hydrationParentFiber = workInProgress2, isHydrating = true, hydrationErrors = null, rootOrSingletonContext = false, null !== current && restoreSuspendedTreeContext(workInProgress2, current), workInProgress2 = mountActivityChildren(workInProgress2, nextProps), workInProgress2.flags |= 4096;
      return workInProgress2;
    }
    current = createWorkInProgress(current.child, {
      mode: nextProps.mode,
      children: nextProps.children
    });
    current.ref = workInProgress2.ref;
    workInProgress2.child = current;
    current.return = workInProgress2;
    return current;
  }
  function markRef(current, workInProgress2) {
    var ref = workInProgress2.ref;
    if (null === ref)
      null !== current && null !== current.ref && (workInProgress2.flags |= 4194816);
    else {
      if ("function" !== typeof ref && "object" !== typeof ref)
        throw Error(formatProdErrorMessage(284));
      if (null === current || current.ref !== ref)
        workInProgress2.flags |= 4194816;
    }
  }
  function updateFunctionComponent(current, workInProgress2, Component, nextProps, renderLanes2) {
    prepareToReadContext(workInProgress2);
    Component = renderWithHooks(
      current,
      workInProgress2,
      Component,
      nextProps,
      void 0,
      renderLanes2
    );
    nextProps = checkDidRenderIdHook();
    if (null !== current && !didReceiveUpdate)
      return bailoutHooks(current, workInProgress2, renderLanes2), bailoutOnAlreadyFinishedWork(current, workInProgress2, renderLanes2);
    isHydrating && nextProps && pushMaterializedTreeId(workInProgress2);
    workInProgress2.flags |= 1;
    reconcileChildren(current, workInProgress2, Component, renderLanes2);
    return workInProgress2.child;
  }
  function replayFunctionComponent(current, workInProgress2, nextProps, Component, secondArg, renderLanes2) {
    prepareToReadContext(workInProgress2);
    workInProgress2.updateQueue = null;
    nextProps = renderWithHooksAgain(
      workInProgress2,
      Component,
      nextProps,
      secondArg
    );
    finishRenderingHooks(current);
    Component = checkDidRenderIdHook();
    if (null !== current && !didReceiveUpdate)
      return bailoutHooks(current, workInProgress2, renderLanes2), bailoutOnAlreadyFinishedWork(current, workInProgress2, renderLanes2);
    isHydrating && Component && pushMaterializedTreeId(workInProgress2);
    workInProgress2.flags |= 1;
    reconcileChildren(current, workInProgress2, nextProps, renderLanes2);
    return workInProgress2.child;
  }
  function updateClassComponent(current, workInProgress2, Component, nextProps, renderLanes2) {
    prepareToReadContext(workInProgress2);
    if (null === workInProgress2.stateNode) {
      var context = emptyContextObject, contextType = Component.contextType;
      "object" === typeof contextType && null !== contextType && (context = readContext(contextType));
      context = new Component(nextProps, context);
      workInProgress2.memoizedState = null !== context.state && void 0 !== context.state ? context.state : null;
      context.updater = classComponentUpdater;
      workInProgress2.stateNode = context;
      context._reactInternals = workInProgress2;
      context = workInProgress2.stateNode;
      context.props = nextProps;
      context.state = workInProgress2.memoizedState;
      context.refs = {};
      initializeUpdateQueue(workInProgress2);
      contextType = Component.contextType;
      context.context = "object" === typeof contextType && null !== contextType ? readContext(contextType) : emptyContextObject;
      context.state = workInProgress2.memoizedState;
      contextType = Component.getDerivedStateFromProps;
      "function" === typeof contextType && (applyDerivedStateFromProps(
        workInProgress2,
        Component,
        contextType,
        nextProps
      ), context.state = workInProgress2.memoizedState);
      "function" === typeof Component.getDerivedStateFromProps || "function" === typeof context.getSnapshotBeforeUpdate || "function" !== typeof context.UNSAFE_componentWillMount && "function" !== typeof context.componentWillMount || (contextType = context.state, "function" === typeof context.componentWillMount && context.componentWillMount(), "function" === typeof context.UNSAFE_componentWillMount && context.UNSAFE_componentWillMount(), contextType !== context.state && classComponentUpdater.enqueueReplaceState(context, context.state, null), processUpdateQueue(workInProgress2, nextProps, context, renderLanes2), suspendIfUpdateReadFromEntangledAsyncAction(), context.state = workInProgress2.memoizedState);
      "function" === typeof context.componentDidMount && (workInProgress2.flags |= 4194308);
      nextProps = true;
    } else if (null === current) {
      context = workInProgress2.stateNode;
      var unresolvedOldProps = workInProgress2.memoizedProps, oldProps = resolveClassComponentProps(Component, unresolvedOldProps);
      context.props = oldProps;
      var oldContext = context.context, contextType$jscomp$0 = Component.contextType;
      contextType = emptyContextObject;
      "object" === typeof contextType$jscomp$0 && null !== contextType$jscomp$0 && (contextType = readContext(contextType$jscomp$0));
      var getDerivedStateFromProps = Component.getDerivedStateFromProps;
      contextType$jscomp$0 = "function" === typeof getDerivedStateFromProps || "function" === typeof context.getSnapshotBeforeUpdate;
      unresolvedOldProps = workInProgress2.pendingProps !== unresolvedOldProps;
      contextType$jscomp$0 || "function" !== typeof context.UNSAFE_componentWillReceiveProps && "function" !== typeof context.componentWillReceiveProps || (unresolvedOldProps || oldContext !== contextType) && callComponentWillReceiveProps(
        workInProgress2,
        context,
        nextProps,
        contextType
      );
      hasForceUpdate = false;
      var oldState = workInProgress2.memoizedState;
      context.state = oldState;
      processUpdateQueue(workInProgress2, nextProps, context, renderLanes2);
      suspendIfUpdateReadFromEntangledAsyncAction();
      oldContext = workInProgress2.memoizedState;
      unresolvedOldProps || oldState !== oldContext || hasForceUpdate ? ("function" === typeof getDerivedStateFromProps && (applyDerivedStateFromProps(
        workInProgress2,
        Component,
        getDerivedStateFromProps,
        nextProps
      ), oldContext = workInProgress2.memoizedState), (oldProps = hasForceUpdate || checkShouldComponentUpdate(
        workInProgress2,
        Component,
        oldProps,
        nextProps,
        oldState,
        oldContext,
        contextType
      )) ? (contextType$jscomp$0 || "function" !== typeof context.UNSAFE_componentWillMount && "function" !== typeof context.componentWillMount || ("function" === typeof context.componentWillMount && context.componentWillMount(), "function" === typeof context.UNSAFE_componentWillMount && context.UNSAFE_componentWillMount()), "function" === typeof context.componentDidMount && (workInProgress2.flags |= 4194308)) : ("function" === typeof context.componentDidMount && (workInProgress2.flags |= 4194308), workInProgress2.memoizedProps = nextProps, workInProgress2.memoizedState = oldContext), context.props = nextProps, context.state = oldContext, context.context = contextType, nextProps = oldProps) : ("function" === typeof context.componentDidMount && (workInProgress2.flags |= 4194308), nextProps = false);
    } else {
      context = workInProgress2.stateNode;
      cloneUpdateQueue(current, workInProgress2);
      contextType = workInProgress2.memoizedProps;
      contextType$jscomp$0 = resolveClassComponentProps(Component, contextType);
      context.props = contextType$jscomp$0;
      getDerivedStateFromProps = workInProgress2.pendingProps;
      oldState = context.context;
      oldContext = Component.contextType;
      oldProps = emptyContextObject;
      "object" === typeof oldContext && null !== oldContext && (oldProps = readContext(oldContext));
      unresolvedOldProps = Component.getDerivedStateFromProps;
      (oldContext = "function" === typeof unresolvedOldProps || "function" === typeof context.getSnapshotBeforeUpdate) || "function" !== typeof context.UNSAFE_componentWillReceiveProps && "function" !== typeof context.componentWillReceiveProps || (contextType !== getDerivedStateFromProps || oldState !== oldProps) && callComponentWillReceiveProps(
        workInProgress2,
        context,
        nextProps,
        oldProps
      );
      hasForceUpdate = false;
      oldState = workInProgress2.memoizedState;
      context.state = oldState;
      processUpdateQueue(workInProgress2, nextProps, context, renderLanes2);
      suspendIfUpdateReadFromEntangledAsyncAction();
      var newState = workInProgress2.memoizedState;
      contextType !== getDerivedStateFromProps || oldState !== newState || hasForceUpdate || null !== current && null !== current.dependencies && checkIfContextChanged(current.dependencies) ? ("function" === typeof unresolvedOldProps && (applyDerivedStateFromProps(
        workInProgress2,
        Component,
        unresolvedOldProps,
        nextProps
      ), newState = workInProgress2.memoizedState), (contextType$jscomp$0 = hasForceUpdate || checkShouldComponentUpdate(
        workInProgress2,
        Component,
        contextType$jscomp$0,
        nextProps,
        oldState,
        newState,
        oldProps
      ) || null !== current && null !== current.dependencies && checkIfContextChanged(current.dependencies)) ? (oldContext || "function" !== typeof context.UNSAFE_componentWillUpdate && "function" !== typeof context.componentWillUpdate || ("function" === typeof context.componentWillUpdate && context.componentWillUpdate(nextProps, newState, oldProps), "function" === typeof context.UNSAFE_componentWillUpdate && context.UNSAFE_componentWillUpdate(
        nextProps,
        newState,
        oldProps
      )), "function" === typeof context.componentDidUpdate && (workInProgress2.flags |= 4), "function" === typeof context.getSnapshotBeforeUpdate && (workInProgress2.flags |= 1024)) : ("function" !== typeof context.componentDidUpdate || contextType === current.memoizedProps && oldState === current.memoizedState || (workInProgress2.flags |= 4), "function" !== typeof context.getSnapshotBeforeUpdate || contextType === current.memoizedProps && oldState === current.memoizedState || (workInProgress2.flags |= 1024), workInProgress2.memoizedProps = nextProps, workInProgress2.memoizedState = newState), context.props = nextProps, context.state = newState, context.context = oldProps, nextProps = contextType$jscomp$0) : ("function" !== typeof context.componentDidUpdate || contextType === current.memoizedProps && oldState === current.memoizedState || (workInProgress2.flags |= 4), "function" !== typeof context.getSnapshotBeforeUpdate || contextType === current.memoizedProps && oldState === current.memoizedState || (workInProgress2.flags |= 1024), nextProps = false);
    }
    context = nextProps;
    markRef(current, workInProgress2);
    nextProps = 0 !== (workInProgress2.flags & 128);
    context || nextProps ? (context = workInProgress2.stateNode, Component = nextProps && "function" !== typeof Component.getDerivedStateFromError ? null : context.render(), workInProgress2.flags |= 1, null !== current && nextProps ? (workInProgress2.child = reconcileChildFibers(
      workInProgress2,
      current.child,
      null,
      renderLanes2
    ), workInProgress2.child = reconcileChildFibers(
      workInProgress2,
      null,
      Component,
      renderLanes2
    )) : reconcileChildren(current, workInProgress2, Component, renderLanes2), workInProgress2.memoizedState = context.state, current = workInProgress2.child) : current = bailoutOnAlreadyFinishedWork(
      current,
      workInProgress2,
      renderLanes2
    );
    return current;
  }
  function mountHostRootWithoutHydrating(current, workInProgress2, nextChildren, renderLanes2) {
    resetHydrationState();
    workInProgress2.flags |= 256;
    reconcileChildren(current, workInProgress2, nextChildren, renderLanes2);
    return workInProgress2.child;
  }
  var SUSPENDED_MARKER = {
    dehydrated: null,
    treeContext: null,
    retryLane: 0,
    hydrationErrors: null
  };
  function mountSuspenseOffscreenState(renderLanes2) {
    return { baseLanes: renderLanes2, cachePool: getSuspendedCache() };
  }
  function getRemainingWorkInPrimaryTree(current, primaryTreeDidDefer, renderLanes2) {
    current = null !== current ? current.childLanes & ~renderLanes2 : 0;
    primaryTreeDidDefer && (current |= workInProgressDeferredLane);
    return current;
  }
  function updateSuspenseComponent(current, workInProgress2, renderLanes2) {
    var nextProps = workInProgress2.pendingProps, showFallback = false, didSuspend = 0 !== (workInProgress2.flags & 128), JSCompiler_temp;
    (JSCompiler_temp = didSuspend) || (JSCompiler_temp = null !== current && null === current.memoizedState ? false : 0 !== (suspenseStackCursor.current & 2));
    JSCompiler_temp && (showFallback = true, workInProgress2.flags &= -129);
    JSCompiler_temp = 0 !== (workInProgress2.flags & 32);
    workInProgress2.flags &= -33;
    if (null === current) {
      if (isHydrating) {
        showFallback ? pushPrimaryTreeSuspenseHandler(workInProgress2) : reuseSuspenseHandlerOnStack();
        (current = nextHydratableInstance) ? (current = canHydrateHydrationBoundary(
          current,
          rootOrSingletonContext
        ), current = null !== current && "&" !== current.data ? current : null, null !== current && (workInProgress2.memoizedState = {
          dehydrated: current,
          treeContext: null !== treeContextProvider ? { id: treeContextId, overflow: treeContextOverflow } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, renderLanes2 = createFiberFromDehydratedFragment(current), renderLanes2.return = workInProgress2, workInProgress2.child = renderLanes2, hydrationParentFiber = workInProgress2, nextHydratableInstance = null)) : current = null;
        if (null === current) throw throwOnHydrationMismatch(workInProgress2);
        isSuspenseInstanceFallback(current) ? workInProgress2.lanes = 32 : workInProgress2.lanes = 536870912;
        return null;
      }
      var nextPrimaryChildren = nextProps.children;
      nextProps = nextProps.fallback;
      if (showFallback)
        return reuseSuspenseHandlerOnStack(), showFallback = workInProgress2.mode, nextPrimaryChildren = mountWorkInProgressOffscreenFiber(
          { mode: "hidden", children: nextPrimaryChildren },
          showFallback
        ), nextProps = createFiberFromFragment(
          nextProps,
          showFallback,
          renderLanes2,
          null
        ), nextPrimaryChildren.return = workInProgress2, nextProps.return = workInProgress2, nextPrimaryChildren.sibling = nextProps, workInProgress2.child = nextPrimaryChildren, nextProps = workInProgress2.child, nextProps.memoizedState = mountSuspenseOffscreenState(renderLanes2), nextProps.childLanes = getRemainingWorkInPrimaryTree(
          current,
          JSCompiler_temp,
          renderLanes2
        ), workInProgress2.memoizedState = SUSPENDED_MARKER, bailoutOffscreenComponent(null, nextProps);
      pushPrimaryTreeSuspenseHandler(workInProgress2);
      return mountSuspensePrimaryChildren(workInProgress2, nextPrimaryChildren);
    }
    var prevState = current.memoizedState;
    if (null !== prevState && (nextPrimaryChildren = prevState.dehydrated, null !== nextPrimaryChildren)) {
      if (didSuspend)
        workInProgress2.flags & 256 ? (pushPrimaryTreeSuspenseHandler(workInProgress2), workInProgress2.flags &= -257, workInProgress2 = retrySuspenseComponentWithoutHydrating(
          current,
          workInProgress2,
          renderLanes2
        )) : null !== workInProgress2.memoizedState ? (reuseSuspenseHandlerOnStack(), workInProgress2.child = current.child, workInProgress2.flags |= 128, workInProgress2 = null) : (reuseSuspenseHandlerOnStack(), nextPrimaryChildren = nextProps.fallback, showFallback = workInProgress2.mode, nextProps = mountWorkInProgressOffscreenFiber(
          { mode: "visible", children: nextProps.children },
          showFallback
        ), nextPrimaryChildren = createFiberFromFragment(
          nextPrimaryChildren,
          showFallback,
          renderLanes2,
          null
        ), nextPrimaryChildren.flags |= 2, nextProps.return = workInProgress2, nextPrimaryChildren.return = workInProgress2, nextProps.sibling = nextPrimaryChildren, workInProgress2.child = nextProps, reconcileChildFibers(
          workInProgress2,
          current.child,
          null,
          renderLanes2
        ), nextProps = workInProgress2.child, nextProps.memoizedState = mountSuspenseOffscreenState(renderLanes2), nextProps.childLanes = getRemainingWorkInPrimaryTree(
          current,
          JSCompiler_temp,
          renderLanes2
        ), workInProgress2.memoizedState = SUSPENDED_MARKER, workInProgress2 = bailoutOffscreenComponent(null, nextProps));
      else if (pushPrimaryTreeSuspenseHandler(workInProgress2), isSuspenseInstanceFallback(nextPrimaryChildren)) {
        JSCompiler_temp = nextPrimaryChildren.nextSibling && nextPrimaryChildren.nextSibling.dataset;
        if (JSCompiler_temp) var digest = JSCompiler_temp.dgst;
        JSCompiler_temp = digest;
        nextProps = Error(formatProdErrorMessage(419));
        nextProps.stack = "";
        nextProps.digest = JSCompiler_temp;
        queueHydrationError({ value: nextProps, source: null, stack: null });
        workInProgress2 = retrySuspenseComponentWithoutHydrating(
          current,
          workInProgress2,
          renderLanes2
        );
      } else if (didReceiveUpdate || propagateParentContextChanges(current, workInProgress2, renderLanes2, false), JSCompiler_temp = 0 !== (renderLanes2 & current.childLanes), didReceiveUpdate || JSCompiler_temp) {
        JSCompiler_temp = workInProgressRoot;
        if (null !== JSCompiler_temp && (nextProps = getBumpedLaneForHydration(JSCompiler_temp, renderLanes2), 0 !== nextProps && nextProps !== prevState.retryLane))
          throw prevState.retryLane = nextProps, enqueueConcurrentRenderForLane(current, nextProps), scheduleUpdateOnFiber(JSCompiler_temp, current, nextProps), SelectiveHydrationException;
        isSuspenseInstancePending(nextPrimaryChildren) || renderDidSuspendDelayIfPossible();
        workInProgress2 = retrySuspenseComponentWithoutHydrating(
          current,
          workInProgress2,
          renderLanes2
        );
      } else
        isSuspenseInstancePending(nextPrimaryChildren) ? (workInProgress2.flags |= 192, workInProgress2.child = current.child, workInProgress2 = null) : (current = prevState.treeContext, nextHydratableInstance = getNextHydratable(
          nextPrimaryChildren.nextSibling
        ), hydrationParentFiber = workInProgress2, isHydrating = true, hydrationErrors = null, rootOrSingletonContext = false, null !== current && restoreSuspendedTreeContext(workInProgress2, current), workInProgress2 = mountSuspensePrimaryChildren(
          workInProgress2,
          nextProps.children
        ), workInProgress2.flags |= 4096);
      return workInProgress2;
    }
    if (showFallback)
      return reuseSuspenseHandlerOnStack(), nextPrimaryChildren = nextProps.fallback, showFallback = workInProgress2.mode, prevState = current.child, digest = prevState.sibling, nextProps = createWorkInProgress(prevState, {
        mode: "hidden",
        children: nextProps.children
      }), nextProps.subtreeFlags = prevState.subtreeFlags & 65011712, null !== digest ? nextPrimaryChildren = createWorkInProgress(
        digest,
        nextPrimaryChildren
      ) : (nextPrimaryChildren = createFiberFromFragment(
        nextPrimaryChildren,
        showFallback,
        renderLanes2,
        null
      ), nextPrimaryChildren.flags |= 2), nextPrimaryChildren.return = workInProgress2, nextProps.return = workInProgress2, nextProps.sibling = nextPrimaryChildren, workInProgress2.child = nextProps, bailoutOffscreenComponent(null, nextProps), nextProps = workInProgress2.child, nextPrimaryChildren = current.child.memoizedState, null === nextPrimaryChildren ? nextPrimaryChildren = mountSuspenseOffscreenState(renderLanes2) : (showFallback = nextPrimaryChildren.cachePool, null !== showFallback ? (prevState = CacheContext._currentValue, showFallback = showFallback.parent !== prevState ? { parent: prevState, pool: prevState } : showFallback) : showFallback = getSuspendedCache(), nextPrimaryChildren = {
        baseLanes: nextPrimaryChildren.baseLanes | renderLanes2,
        cachePool: showFallback
      }), nextProps.memoizedState = nextPrimaryChildren, nextProps.childLanes = getRemainingWorkInPrimaryTree(
        current,
        JSCompiler_temp,
        renderLanes2
      ), workInProgress2.memoizedState = SUSPENDED_MARKER, bailoutOffscreenComponent(current.child, nextProps);
    pushPrimaryTreeSuspenseHandler(workInProgress2);
    renderLanes2 = current.child;
    current = renderLanes2.sibling;
    renderLanes2 = createWorkInProgress(renderLanes2, {
      mode: "visible",
      children: nextProps.children
    });
    renderLanes2.return = workInProgress2;
    renderLanes2.sibling = null;
    null !== current && (JSCompiler_temp = workInProgress2.deletions, null === JSCompiler_temp ? (workInProgress2.deletions = [current], workInProgress2.flags |= 16) : JSCompiler_temp.push(current));
    workInProgress2.child = renderLanes2;
    workInProgress2.memoizedState = null;
    return renderLanes2;
  }
  function mountSuspensePrimaryChildren(workInProgress2, primaryChildren) {
    primaryChildren = mountWorkInProgressOffscreenFiber(
      { mode: "visible", children: primaryChildren },
      workInProgress2.mode
    );
    primaryChildren.return = workInProgress2;
    return workInProgress2.child = primaryChildren;
  }
  function mountWorkInProgressOffscreenFiber(offscreenProps, mode) {
    offscreenProps = createFiberImplClass(22, offscreenProps, null, mode);
    offscreenProps.lanes = 0;
    return offscreenProps;
  }
  function retrySuspenseComponentWithoutHydrating(current, workInProgress2, renderLanes2) {
    reconcileChildFibers(workInProgress2, current.child, null, renderLanes2);
    current = mountSuspensePrimaryChildren(
      workInProgress2,
      workInProgress2.pendingProps.children
    );
    current.flags |= 2;
    workInProgress2.memoizedState = null;
    return current;
  }
  function scheduleSuspenseWorkOnFiber(fiber, renderLanes2, propagationRoot) {
    fiber.lanes |= renderLanes2;
    var alternate = fiber.alternate;
    null !== alternate && (alternate.lanes |= renderLanes2);
    scheduleContextWorkOnParentPath(fiber.return, renderLanes2, propagationRoot);
  }
  function initSuspenseListRenderState(workInProgress2, isBackwards, tail, lastContentRow, tailMode, treeForkCount2) {
    var renderState = workInProgress2.memoizedState;
    null === renderState ? workInProgress2.memoizedState = {
      isBackwards,
      rendering: null,
      renderingStartTime: 0,
      last: lastContentRow,
      tail,
      tailMode,
      treeForkCount: treeForkCount2
    } : (renderState.isBackwards = isBackwards, renderState.rendering = null, renderState.renderingStartTime = 0, renderState.last = lastContentRow, renderState.tail = tail, renderState.tailMode = tailMode, renderState.treeForkCount = treeForkCount2);
  }
  function updateSuspenseListComponent(current, workInProgress2, renderLanes2) {
    var nextProps = workInProgress2.pendingProps, revealOrder = nextProps.revealOrder, tailMode = nextProps.tail;
    nextProps = nextProps.children;
    var suspenseContext = suspenseStackCursor.current, shouldForceFallback = 0 !== (suspenseContext & 2);
    shouldForceFallback ? (suspenseContext = suspenseContext & 1 | 2, workInProgress2.flags |= 128) : suspenseContext &= 1;
    push(suspenseStackCursor, suspenseContext);
    reconcileChildren(current, workInProgress2, nextProps, renderLanes2);
    nextProps = isHydrating ? treeForkCount : 0;
    if (!shouldForceFallback && null !== current && 0 !== (current.flags & 128))
      a: for (current = workInProgress2.child; null !== current; ) {
        if (13 === current.tag)
          null !== current.memoizedState && scheduleSuspenseWorkOnFiber(current, renderLanes2, workInProgress2);
        else if (19 === current.tag)
          scheduleSuspenseWorkOnFiber(current, renderLanes2, workInProgress2);
        else if (null !== current.child) {
          current.child.return = current;
          current = current.child;
          continue;
        }
        if (current === workInProgress2) break a;
        for (; null === current.sibling; ) {
          if (null === current.return || current.return === workInProgress2)
            break a;
          current = current.return;
        }
        current.sibling.return = current.return;
        current = current.sibling;
      }
    switch (revealOrder) {
      case "forwards":
        renderLanes2 = workInProgress2.child;
        for (revealOrder = null; null !== renderLanes2; )
          current = renderLanes2.alternate, null !== current && null === findFirstSuspended(current) && (revealOrder = renderLanes2), renderLanes2 = renderLanes2.sibling;
        renderLanes2 = revealOrder;
        null === renderLanes2 ? (revealOrder = workInProgress2.child, workInProgress2.child = null) : (revealOrder = renderLanes2.sibling, renderLanes2.sibling = null);
        initSuspenseListRenderState(
          workInProgress2,
          false,
          revealOrder,
          renderLanes2,
          tailMode,
          nextProps
        );
        break;
      case "backwards":
      case "unstable_legacy-backwards":
        renderLanes2 = null;
        revealOrder = workInProgress2.child;
        for (workInProgress2.child = null; null !== revealOrder; ) {
          current = revealOrder.alternate;
          if (null !== current && null === findFirstSuspended(current)) {
            workInProgress2.child = revealOrder;
            break;
          }
          current = revealOrder.sibling;
          revealOrder.sibling = renderLanes2;
          renderLanes2 = revealOrder;
          revealOrder = current;
        }
        initSuspenseListRenderState(
          workInProgress2,
          true,
          renderLanes2,
          null,
          tailMode,
          nextProps
        );
        break;
      case "together":
        initSuspenseListRenderState(
          workInProgress2,
          false,
          null,
          null,
          void 0,
          nextProps
        );
        break;
      default:
        workInProgress2.memoizedState = null;
    }
    return workInProgress2.child;
  }
  function bailoutOnAlreadyFinishedWork(current, workInProgress2, renderLanes2) {
    null !== current && (workInProgress2.dependencies = current.dependencies);
    workInProgressRootSkippedLanes |= workInProgress2.lanes;
    if (0 === (renderLanes2 & workInProgress2.childLanes))
      if (null !== current) {
        if (propagateParentContextChanges(
          current,
          workInProgress2,
          renderLanes2,
          false
        ), 0 === (renderLanes2 & workInProgress2.childLanes))
          return null;
      } else return null;
    if (null !== current && workInProgress2.child !== current.child)
      throw Error(formatProdErrorMessage(153));
    if (null !== workInProgress2.child) {
      current = workInProgress2.child;
      renderLanes2 = createWorkInProgress(current, current.pendingProps);
      workInProgress2.child = renderLanes2;
      for (renderLanes2.return = workInProgress2; null !== current.sibling; )
        current = current.sibling, renderLanes2 = renderLanes2.sibling = createWorkInProgress(current, current.pendingProps), renderLanes2.return = workInProgress2;
      renderLanes2.sibling = null;
    }
    return workInProgress2.child;
  }
  function checkScheduledUpdateOrContext(current, renderLanes2) {
    if (0 !== (current.lanes & renderLanes2)) return true;
    current = current.dependencies;
    return null !== current && checkIfContextChanged(current) ? true : false;
  }
  function attemptEarlyBailoutIfNoScheduledUpdate(current, workInProgress2, renderLanes2) {
    switch (workInProgress2.tag) {
      case 3:
        pushHostContainer(workInProgress2, workInProgress2.stateNode.containerInfo);
        pushProvider(workInProgress2, CacheContext, current.memoizedState.cache);
        resetHydrationState();
        break;
      case 27:
      case 5:
        pushHostContext(workInProgress2);
        break;
      case 4:
        pushHostContainer(workInProgress2, workInProgress2.stateNode.containerInfo);
        break;
      case 10:
        pushProvider(
          workInProgress2,
          workInProgress2.type,
          workInProgress2.memoizedProps.value
        );
        break;
      case 31:
        if (null !== workInProgress2.memoizedState)
          return workInProgress2.flags |= 128, pushDehydratedActivitySuspenseHandler(workInProgress2), null;
        break;
      case 13:
        var state$102 = workInProgress2.memoizedState;
        if (null !== state$102) {
          if (null !== state$102.dehydrated)
            return pushPrimaryTreeSuspenseHandler(workInProgress2), workInProgress2.flags |= 128, null;
          if (0 !== (renderLanes2 & workInProgress2.child.childLanes))
            return updateSuspenseComponent(current, workInProgress2, renderLanes2);
          pushPrimaryTreeSuspenseHandler(workInProgress2);
          current = bailoutOnAlreadyFinishedWork(
            current,
            workInProgress2,
            renderLanes2
          );
          return null !== current ? current.sibling : null;
        }
        pushPrimaryTreeSuspenseHandler(workInProgress2);
        break;
      case 19:
        var didSuspendBefore = 0 !== (current.flags & 128);
        state$102 = 0 !== (renderLanes2 & workInProgress2.childLanes);
        state$102 || (propagateParentContextChanges(
          current,
          workInProgress2,
          renderLanes2,
          false
        ), state$102 = 0 !== (renderLanes2 & workInProgress2.childLanes));
        if (didSuspendBefore) {
          if (state$102)
            return updateSuspenseListComponent(
              current,
              workInProgress2,
              renderLanes2
            );
          workInProgress2.flags |= 128;
        }
        didSuspendBefore = workInProgress2.memoizedState;
        null !== didSuspendBefore && (didSuspendBefore.rendering = null, didSuspendBefore.tail = null, didSuspendBefore.lastEffect = null);
        push(suspenseStackCursor, suspenseStackCursor.current);
        if (state$102) break;
        else return null;
      case 22:
        return workInProgress2.lanes = 0, updateOffscreenComponent(
          current,
          workInProgress2,
          renderLanes2,
          workInProgress2.pendingProps
        );
      case 24:
        pushProvider(workInProgress2, CacheContext, current.memoizedState.cache);
    }
    return bailoutOnAlreadyFinishedWork(current, workInProgress2, renderLanes2);
  }
  function beginWork(current, workInProgress2, renderLanes2) {
    if (null !== current)
      if (current.memoizedProps !== workInProgress2.pendingProps)
        didReceiveUpdate = true;
      else {
        if (!checkScheduledUpdateOrContext(current, renderLanes2) && 0 === (workInProgress2.flags & 128))
          return didReceiveUpdate = false, attemptEarlyBailoutIfNoScheduledUpdate(
            current,
            workInProgress2,
            renderLanes2
          );
        didReceiveUpdate = 0 !== (current.flags & 131072) ? true : false;
      }
    else
      didReceiveUpdate = false, isHydrating && 0 !== (workInProgress2.flags & 1048576) && pushTreeId(workInProgress2, treeForkCount, workInProgress2.index);
    workInProgress2.lanes = 0;
    switch (workInProgress2.tag) {
      case 16:
        a: {
          var props = workInProgress2.pendingProps;
          current = resolveLazy(workInProgress2.elementType);
          workInProgress2.type = current;
          if ("function" === typeof current)
            shouldConstruct(current) ? (props = resolveClassComponentProps(current, props), workInProgress2.tag = 1, workInProgress2 = updateClassComponent(
              null,
              workInProgress2,
              current,
              props,
              renderLanes2
            )) : (workInProgress2.tag = 0, workInProgress2 = updateFunctionComponent(
              null,
              workInProgress2,
              current,
              props,
              renderLanes2
            ));
          else {
            if (void 0 !== current && null !== current) {
              var $$typeof = current.$$typeof;
              if ($$typeof === REACT_FORWARD_REF_TYPE) {
                workInProgress2.tag = 11;
                workInProgress2 = updateForwardRef(
                  null,
                  workInProgress2,
                  current,
                  props,
                  renderLanes2
                );
                break a;
              } else if ($$typeof === REACT_MEMO_TYPE) {
                workInProgress2.tag = 14;
                workInProgress2 = updateMemoComponent(
                  null,
                  workInProgress2,
                  current,
                  props,
                  renderLanes2
                );
                break a;
              }
            }
            workInProgress2 = getComponentNameFromType(current) || current;
            throw Error(formatProdErrorMessage(306, workInProgress2, ""));
          }
        }
        return workInProgress2;
      case 0:
        return updateFunctionComponent(
          current,
          workInProgress2,
          workInProgress2.type,
          workInProgress2.pendingProps,
          renderLanes2
        );
      case 1:
        return props = workInProgress2.type, $$typeof = resolveClassComponentProps(
          props,
          workInProgress2.pendingProps
        ), updateClassComponent(
          current,
          workInProgress2,
          props,
          $$typeof,
          renderLanes2
        );
      case 3:
        a: {
          pushHostContainer(
            workInProgress2,
            workInProgress2.stateNode.containerInfo
          );
          if (null === current) throw Error(formatProdErrorMessage(387));
          props = workInProgress2.pendingProps;
          var prevState = workInProgress2.memoizedState;
          $$typeof = prevState.element;
          cloneUpdateQueue(current, workInProgress2);
          processUpdateQueue(workInProgress2, props, null, renderLanes2);
          var nextState = workInProgress2.memoizedState;
          props = nextState.cache;
          pushProvider(workInProgress2, CacheContext, props);
          props !== prevState.cache && propagateContextChanges(
            workInProgress2,
            [CacheContext],
            renderLanes2,
            true
          );
          suspendIfUpdateReadFromEntangledAsyncAction();
          props = nextState.element;
          if (prevState.isDehydrated)
            if (prevState = {
              element: props,
              isDehydrated: false,
              cache: nextState.cache
            }, workInProgress2.updateQueue.baseState = prevState, workInProgress2.memoizedState = prevState, workInProgress2.flags & 256) {
              workInProgress2 = mountHostRootWithoutHydrating(
                current,
                workInProgress2,
                props,
                renderLanes2
              );
              break a;
            } else if (props !== $$typeof) {
              $$typeof = createCapturedValueAtFiber(
                Error(formatProdErrorMessage(424)),
                workInProgress2
              );
              queueHydrationError($$typeof);
              workInProgress2 = mountHostRootWithoutHydrating(
                current,
                workInProgress2,
                props,
                renderLanes2
              );
              break a;
            } else {
              current = workInProgress2.stateNode.containerInfo;
              switch (current.nodeType) {
                case 9:
                  current = current.body;
                  break;
                default:
                  current = "HTML" === current.nodeName ? current.ownerDocument.body : current;
              }
              nextHydratableInstance = getNextHydratable(current.firstChild);
              hydrationParentFiber = workInProgress2;
              isHydrating = true;
              hydrationErrors = null;
              rootOrSingletonContext = true;
              renderLanes2 = mountChildFibers(
                workInProgress2,
                null,
                props,
                renderLanes2
              );
              for (workInProgress2.child = renderLanes2; renderLanes2; )
                renderLanes2.flags = renderLanes2.flags & -3 | 4096, renderLanes2 = renderLanes2.sibling;
            }
          else {
            resetHydrationState();
            if (props === $$typeof) {
              workInProgress2 = bailoutOnAlreadyFinishedWork(
                current,
                workInProgress2,
                renderLanes2
              );
              break a;
            }
            reconcileChildren(current, workInProgress2, props, renderLanes2);
          }
          workInProgress2 = workInProgress2.child;
        }
        return workInProgress2;
      case 26:
        return markRef(current, workInProgress2), null === current ? (renderLanes2 = getResource(
          workInProgress2.type,
          null,
          workInProgress2.pendingProps,
          null
        )) ? workInProgress2.memoizedState = renderLanes2 : isHydrating || (renderLanes2 = workInProgress2.type, current = workInProgress2.pendingProps, props = getOwnerDocumentFromRootContainer(
          rootInstanceStackCursor.current
        ).createElement(renderLanes2), props[internalInstanceKey] = workInProgress2, props[internalPropsKey] = current, setInitialProperties(props, renderLanes2, current), markNodeAsHoistable(props), workInProgress2.stateNode = props) : workInProgress2.memoizedState = getResource(
          workInProgress2.type,
          current.memoizedProps,
          workInProgress2.pendingProps,
          current.memoizedState
        ), null;
      case 27:
        return pushHostContext(workInProgress2), null === current && isHydrating && (props = workInProgress2.stateNode = resolveSingletonInstance(
          workInProgress2.type,
          workInProgress2.pendingProps,
          rootInstanceStackCursor.current
        ), hydrationParentFiber = workInProgress2, rootOrSingletonContext = true, $$typeof = nextHydratableInstance, isSingletonScope(workInProgress2.type) ? (previousHydratableOnEnteringScopedSingleton = $$typeof, nextHydratableInstance = getNextHydratable(props.firstChild)) : nextHydratableInstance = $$typeof), reconcileChildren(
          current,
          workInProgress2,
          workInProgress2.pendingProps.children,
          renderLanes2
        ), markRef(current, workInProgress2), null === current && (workInProgress2.flags |= 4194304), workInProgress2.child;
      case 5:
        if (null === current && isHydrating) {
          if ($$typeof = props = nextHydratableInstance)
            props = canHydrateInstance(
              props,
              workInProgress2.type,
              workInProgress2.pendingProps,
              rootOrSingletonContext
            ), null !== props ? (workInProgress2.stateNode = props, hydrationParentFiber = workInProgress2, nextHydratableInstance = getNextHydratable(props.firstChild), rootOrSingletonContext = false, $$typeof = true) : $$typeof = false;
          $$typeof || throwOnHydrationMismatch(workInProgress2);
        }
        pushHostContext(workInProgress2);
        $$typeof = workInProgress2.type;
        prevState = workInProgress2.pendingProps;
        nextState = null !== current ? current.memoizedProps : null;
        props = prevState.children;
        shouldSetTextContent($$typeof, prevState) ? props = null : null !== nextState && shouldSetTextContent($$typeof, nextState) && (workInProgress2.flags |= 32);
        null !== workInProgress2.memoizedState && ($$typeof = renderWithHooks(
          current,
          workInProgress2,
          TransitionAwareHostComponent,
          null,
          null,
          renderLanes2
        ), HostTransitionContext._currentValue = $$typeof);
        markRef(current, workInProgress2);
        reconcileChildren(current, workInProgress2, props, renderLanes2);
        return workInProgress2.child;
      case 6:
        if (null === current && isHydrating) {
          if (current = renderLanes2 = nextHydratableInstance)
            renderLanes2 = canHydrateTextInstance(
              renderLanes2,
              workInProgress2.pendingProps,
              rootOrSingletonContext
            ), null !== renderLanes2 ? (workInProgress2.stateNode = renderLanes2, hydrationParentFiber = workInProgress2, nextHydratableInstance = null, current = true) : current = false;
          current || throwOnHydrationMismatch(workInProgress2);
        }
        return null;
      case 13:
        return updateSuspenseComponent(current, workInProgress2, renderLanes2);
      case 4:
        return pushHostContainer(
          workInProgress2,
          workInProgress2.stateNode.containerInfo
        ), props = workInProgress2.pendingProps, null === current ? workInProgress2.child = reconcileChildFibers(
          workInProgress2,
          null,
          props,
          renderLanes2
        ) : reconcileChildren(current, workInProgress2, props, renderLanes2), workInProgress2.child;
      case 11:
        return updateForwardRef(
          current,
          workInProgress2,
          workInProgress2.type,
          workInProgress2.pendingProps,
          renderLanes2
        );
      case 7:
        return reconcileChildren(
          current,
          workInProgress2,
          workInProgress2.pendingProps,
          renderLanes2
        ), workInProgress2.child;
      case 8:
        return reconcileChildren(
          current,
          workInProgress2,
          workInProgress2.pendingProps.children,
          renderLanes2
        ), workInProgress2.child;
      case 12:
        return reconcileChildren(
          current,
          workInProgress2,
          workInProgress2.pendingProps.children,
          renderLanes2
        ), workInProgress2.child;
      case 10:
        return props = workInProgress2.pendingProps, pushProvider(workInProgress2, workInProgress2.type, props.value), reconcileChildren(current, workInProgress2, props.children, renderLanes2), workInProgress2.child;
      case 9:
        return $$typeof = workInProgress2.type._context, props = workInProgress2.pendingProps.children, prepareToReadContext(workInProgress2), $$typeof = readContext($$typeof), props = props($$typeof), workInProgress2.flags |= 1, reconcileChildren(current, workInProgress2, props, renderLanes2), workInProgress2.child;
      case 14:
        return updateMemoComponent(
          current,
          workInProgress2,
          workInProgress2.type,
          workInProgress2.pendingProps,
          renderLanes2
        );
      case 15:
        return updateSimpleMemoComponent(
          current,
          workInProgress2,
          workInProgress2.type,
          workInProgress2.pendingProps,
          renderLanes2
        );
      case 19:
        return updateSuspenseListComponent(current, workInProgress2, renderLanes2);
      case 31:
        return updateActivityComponent(current, workInProgress2, renderLanes2);
      case 22:
        return updateOffscreenComponent(
          current,
          workInProgress2,
          renderLanes2,
          workInProgress2.pendingProps
        );
      case 24:
        return prepareToReadContext(workInProgress2), props = readContext(CacheContext), null === current ? ($$typeof = peekCacheFromPool(), null === $$typeof && ($$typeof = workInProgressRoot, prevState = createCache(), $$typeof.pooledCache = prevState, prevState.refCount++, null !== prevState && ($$typeof.pooledCacheLanes |= renderLanes2), $$typeof = prevState), workInProgress2.memoizedState = { parent: props, cache: $$typeof }, initializeUpdateQueue(workInProgress2), pushProvider(workInProgress2, CacheContext, $$typeof)) : (0 !== (current.lanes & renderLanes2) && (cloneUpdateQueue(current, workInProgress2), processUpdateQueue(workInProgress2, null, null, renderLanes2), suspendIfUpdateReadFromEntangledAsyncAction()), $$typeof = current.memoizedState, prevState = workInProgress2.memoizedState, $$typeof.parent !== props ? ($$typeof = { parent: props, cache: props }, workInProgress2.memoizedState = $$typeof, 0 === workInProgress2.lanes && (workInProgress2.memoizedState = workInProgress2.updateQueue.baseState = $$typeof), pushProvider(workInProgress2, CacheContext, props)) : (props = prevState.cache, pushProvider(workInProgress2, CacheContext, props), props !== $$typeof.cache && propagateContextChanges(
          workInProgress2,
          [CacheContext],
          renderLanes2,
          true
        ))), reconcileChildren(
          current,
          workInProgress2,
          workInProgress2.pendingProps.children,
          renderLanes2
        ), workInProgress2.child;
      case 29:
        throw workInProgress2.pendingProps;
    }
    throw Error(formatProdErrorMessage(156, workInProgress2.tag));
  }
  function markUpdate(workInProgress2) {
    workInProgress2.flags |= 4;
  }
  function preloadInstanceAndSuspendIfNeeded(workInProgress2, type, oldProps, newProps, renderLanes2) {
    if (type = 0 !== (workInProgress2.mode & 32)) type = false;
    if (type) {
      if (workInProgress2.flags |= 16777216, (renderLanes2 & 335544128) === renderLanes2)
        if (workInProgress2.stateNode.complete) workInProgress2.flags |= 8192;
        else if (shouldRemainOnPreviousScreen()) workInProgress2.flags |= 8192;
        else
          throw suspendedThenable = noopSuspenseyCommitThenable, SuspenseyCommitException;
    } else workInProgress2.flags &= -16777217;
  }
  function preloadResourceAndSuspendIfNeeded(workInProgress2, resource) {
    if ("stylesheet" !== resource.type || 0 !== (resource.state.loading & 4))
      workInProgress2.flags &= -16777217;
    else if (workInProgress2.flags |= 16777216, !preloadResource(resource))
      if (shouldRemainOnPreviousScreen()) workInProgress2.flags |= 8192;
      else
        throw suspendedThenable = noopSuspenseyCommitThenable, SuspenseyCommitException;
  }
  function scheduleRetryEffect(workInProgress2, retryQueue) {
    null !== retryQueue && (workInProgress2.flags |= 4);
    workInProgress2.flags & 16384 && (retryQueue = 22 !== workInProgress2.tag ? claimNextRetryLane() : 536870912, workInProgress2.lanes |= retryQueue, workInProgressSuspendedRetryLanes |= retryQueue);
  }
  function cutOffTailIfNeeded(renderState, hasRenderedATailFallback) {
    if (!isHydrating)
      switch (renderState.tailMode) {
        case "hidden":
          hasRenderedATailFallback = renderState.tail;
          for (var lastTailNode = null; null !== hasRenderedATailFallback; )
            null !== hasRenderedATailFallback.alternate && (lastTailNode = hasRenderedATailFallback), hasRenderedATailFallback = hasRenderedATailFallback.sibling;
          null === lastTailNode ? renderState.tail = null : lastTailNode.sibling = null;
          break;
        case "collapsed":
          lastTailNode = renderState.tail;
          for (var lastTailNode$106 = null; null !== lastTailNode; )
            null !== lastTailNode.alternate && (lastTailNode$106 = lastTailNode), lastTailNode = lastTailNode.sibling;
          null === lastTailNode$106 ? hasRenderedATailFallback || null === renderState.tail ? renderState.tail = null : renderState.tail.sibling = null : lastTailNode$106.sibling = null;
      }
  }
  function bubbleProperties(completedWork) {
    var didBailout = null !== completedWork.alternate && completedWork.alternate.child === completedWork.child, newChildLanes = 0, subtreeFlags = 0;
    if (didBailout)
      for (var child$107 = completedWork.child; null !== child$107; )
        newChildLanes |= child$107.lanes | child$107.childLanes, subtreeFlags |= child$107.subtreeFlags & 65011712, subtreeFlags |= child$107.flags & 65011712, child$107.return = completedWork, child$107 = child$107.sibling;
    else
      for (child$107 = completedWork.child; null !== child$107; )
        newChildLanes |= child$107.lanes | child$107.childLanes, subtreeFlags |= child$107.subtreeFlags, subtreeFlags |= child$107.flags, child$107.return = completedWork, child$107 = child$107.sibling;
    completedWork.subtreeFlags |= subtreeFlags;
    completedWork.childLanes = newChildLanes;
    return didBailout;
  }
  function completeWork(current, workInProgress2, renderLanes2) {
    var newProps = workInProgress2.pendingProps;
    popTreeContext(workInProgress2);
    switch (workInProgress2.tag) {
      case 16:
      case 15:
      case 0:
      case 11:
      case 7:
      case 8:
      case 12:
      case 9:
      case 14:
        return bubbleProperties(workInProgress2), null;
      case 1:
        return bubbleProperties(workInProgress2), null;
      case 3:
        renderLanes2 = workInProgress2.stateNode;
        newProps = null;
        null !== current && (newProps = current.memoizedState.cache);
        workInProgress2.memoizedState.cache !== newProps && (workInProgress2.flags |= 2048);
        popProvider(CacheContext);
        popHostContainer();
        renderLanes2.pendingContext && (renderLanes2.context = renderLanes2.pendingContext, renderLanes2.pendingContext = null);
        if (null === current || null === current.child)
          popHydrationState(workInProgress2) ? markUpdate(workInProgress2) : null === current || current.memoizedState.isDehydrated && 0 === (workInProgress2.flags & 256) || (workInProgress2.flags |= 1024, upgradeHydrationErrorsToRecoverable());
        bubbleProperties(workInProgress2);
        return null;
      case 26:
        var type = workInProgress2.type, nextResource = workInProgress2.memoizedState;
        null === current ? (markUpdate(workInProgress2), null !== nextResource ? (bubbleProperties(workInProgress2), preloadResourceAndSuspendIfNeeded(workInProgress2, nextResource)) : (bubbleProperties(workInProgress2), preloadInstanceAndSuspendIfNeeded(
          workInProgress2,
          type,
          null,
          newProps,
          renderLanes2
        ))) : nextResource ? nextResource !== current.memoizedState ? (markUpdate(workInProgress2), bubbleProperties(workInProgress2), preloadResourceAndSuspendIfNeeded(workInProgress2, nextResource)) : (bubbleProperties(workInProgress2), workInProgress2.flags &= -16777217) : (current = current.memoizedProps, current !== newProps && markUpdate(workInProgress2), bubbleProperties(workInProgress2), preloadInstanceAndSuspendIfNeeded(
          workInProgress2,
          type,
          current,
          newProps,
          renderLanes2
        ));
        return null;
      case 27:
        popHostContext(workInProgress2);
        renderLanes2 = rootInstanceStackCursor.current;
        type = workInProgress2.type;
        if (null !== current && null != workInProgress2.stateNode)
          current.memoizedProps !== newProps && markUpdate(workInProgress2);
        else {
          if (!newProps) {
            if (null === workInProgress2.stateNode)
              throw Error(formatProdErrorMessage(166));
            bubbleProperties(workInProgress2);
            return null;
          }
          current = contextStackCursor.current;
          popHydrationState(workInProgress2) ? prepareToHydrateHostInstance(workInProgress2) : (current = resolveSingletonInstance(type, newProps, renderLanes2), workInProgress2.stateNode = current, markUpdate(workInProgress2));
        }
        bubbleProperties(workInProgress2);
        return null;
      case 5:
        popHostContext(workInProgress2);
        type = workInProgress2.type;
        if (null !== current && null != workInProgress2.stateNode)
          current.memoizedProps !== newProps && markUpdate(workInProgress2);
        else {
          if (!newProps) {
            if (null === workInProgress2.stateNode)
              throw Error(formatProdErrorMessage(166));
            bubbleProperties(workInProgress2);
            return null;
          }
          nextResource = contextStackCursor.current;
          if (popHydrationState(workInProgress2))
            prepareToHydrateHostInstance(workInProgress2);
          else {
            var ownerDocument = getOwnerDocumentFromRootContainer(
              rootInstanceStackCursor.current
            );
            switch (nextResource) {
              case 1:
                nextResource = ownerDocument.createElementNS(
                  "http://www.w3.org/2000/svg",
                  type
                );
                break;
              case 2:
                nextResource = ownerDocument.createElementNS(
                  "http://www.w3.org/1998/Math/MathML",
                  type
                );
                break;
              default:
                switch (type) {
                  case "svg":
                    nextResource = ownerDocument.createElementNS(
                      "http://www.w3.org/2000/svg",
                      type
                    );
                    break;
                  case "math":
                    nextResource = ownerDocument.createElementNS(
                      "http://www.w3.org/1998/Math/MathML",
                      type
                    );
                    break;
                  case "script":
                    nextResource = ownerDocument.createElement("div");
                    nextResource.innerHTML = "<script><\/script>";
                    nextResource = nextResource.removeChild(
                      nextResource.firstChild
                    );
                    break;
                  case "select":
                    nextResource = "string" === typeof newProps.is ? ownerDocument.createElement("select", {
                      is: newProps.is
                    }) : ownerDocument.createElement("select");
                    newProps.multiple ? nextResource.multiple = true : newProps.size && (nextResource.size = newProps.size);
                    break;
                  default:
                    nextResource = "string" === typeof newProps.is ? ownerDocument.createElement(type, { is: newProps.is }) : ownerDocument.createElement(type);
                }
            }
            nextResource[internalInstanceKey] = workInProgress2;
            nextResource[internalPropsKey] = newProps;
            a: for (ownerDocument = workInProgress2.child; null !== ownerDocument; ) {
              if (5 === ownerDocument.tag || 6 === ownerDocument.tag)
                nextResource.appendChild(ownerDocument.stateNode);
              else if (4 !== ownerDocument.tag && 27 !== ownerDocument.tag && null !== ownerDocument.child) {
                ownerDocument.child.return = ownerDocument;
                ownerDocument = ownerDocument.child;
                continue;
              }
              if (ownerDocument === workInProgress2) break a;
              for (; null === ownerDocument.sibling; ) {
                if (null === ownerDocument.return || ownerDocument.return === workInProgress2)
                  break a;
                ownerDocument = ownerDocument.return;
              }
              ownerDocument.sibling.return = ownerDocument.return;
              ownerDocument = ownerDocument.sibling;
            }
            workInProgress2.stateNode = nextResource;
            a: switch (setInitialProperties(nextResource, type, newProps), type) {
              case "button":
              case "input":
              case "select":
              case "textarea":
                newProps = !!newProps.autoFocus;
                break a;
              case "img":
                newProps = true;
                break a;
              default:
                newProps = false;
            }
            newProps && markUpdate(workInProgress2);
          }
        }
        bubbleProperties(workInProgress2);
        preloadInstanceAndSuspendIfNeeded(
          workInProgress2,
          workInProgress2.type,
          null === current ? null : current.memoizedProps,
          workInProgress2.pendingProps,
          renderLanes2
        );
        return null;
      case 6:
        if (current && null != workInProgress2.stateNode)
          current.memoizedProps !== newProps && markUpdate(workInProgress2);
        else {
          if ("string" !== typeof newProps && null === workInProgress2.stateNode)
            throw Error(formatProdErrorMessage(166));
          current = rootInstanceStackCursor.current;
          if (popHydrationState(workInProgress2)) {
            current = workInProgress2.stateNode;
            renderLanes2 = workInProgress2.memoizedProps;
            newProps = null;
            type = hydrationParentFiber;
            if (null !== type)
              switch (type.tag) {
                case 27:
                case 5:
                  newProps = type.memoizedProps;
              }
            current[internalInstanceKey] = workInProgress2;
            current = current.nodeValue === renderLanes2 || null !== newProps && true === newProps.suppressHydrationWarning || checkForUnmatchedText(current.nodeValue, renderLanes2) ? true : false;
            current || throwOnHydrationMismatch(workInProgress2, true);
          } else
            current = getOwnerDocumentFromRootContainer(current).createTextNode(
              newProps
            ), current[internalInstanceKey] = workInProgress2, workInProgress2.stateNode = current;
        }
        bubbleProperties(workInProgress2);
        return null;
      case 31:
        renderLanes2 = workInProgress2.memoizedState;
        if (null === current || null !== current.memoizedState) {
          newProps = popHydrationState(workInProgress2);
          if (null !== renderLanes2) {
            if (null === current) {
              if (!newProps) throw Error(formatProdErrorMessage(318));
              current = workInProgress2.memoizedState;
              current = null !== current ? current.dehydrated : null;
              if (!current) throw Error(formatProdErrorMessage(557));
              current[internalInstanceKey] = workInProgress2;
            } else
              resetHydrationState(), 0 === (workInProgress2.flags & 128) && (workInProgress2.memoizedState = null), workInProgress2.flags |= 4;
            bubbleProperties(workInProgress2);
            current = false;
          } else
            renderLanes2 = upgradeHydrationErrorsToRecoverable(), null !== current && null !== current.memoizedState && (current.memoizedState.hydrationErrors = renderLanes2), current = true;
          if (!current) {
            if (workInProgress2.flags & 256)
              return popSuspenseHandler(workInProgress2), workInProgress2;
            popSuspenseHandler(workInProgress2);
            return null;
          }
          if (0 !== (workInProgress2.flags & 128))
            throw Error(formatProdErrorMessage(558));
        }
        bubbleProperties(workInProgress2);
        return null;
      case 13:
        newProps = workInProgress2.memoizedState;
        if (null === current || null !== current.memoizedState && null !== current.memoizedState.dehydrated) {
          type = popHydrationState(workInProgress2);
          if (null !== newProps && null !== newProps.dehydrated) {
            if (null === current) {
              if (!type) throw Error(formatProdErrorMessage(318));
              type = workInProgress2.memoizedState;
              type = null !== type ? type.dehydrated : null;
              if (!type) throw Error(formatProdErrorMessage(317));
              type[internalInstanceKey] = workInProgress2;
            } else
              resetHydrationState(), 0 === (workInProgress2.flags & 128) && (workInProgress2.memoizedState = null), workInProgress2.flags |= 4;
            bubbleProperties(workInProgress2);
            type = false;
          } else
            type = upgradeHydrationErrorsToRecoverable(), null !== current && null !== current.memoizedState && (current.memoizedState.hydrationErrors = type), type = true;
          if (!type) {
            if (workInProgress2.flags & 256)
              return popSuspenseHandler(workInProgress2), workInProgress2;
            popSuspenseHandler(workInProgress2);
            return null;
          }
        }
        popSuspenseHandler(workInProgress2);
        if (0 !== (workInProgress2.flags & 128))
          return workInProgress2.lanes = renderLanes2, workInProgress2;
        renderLanes2 = null !== newProps;
        current = null !== current && null !== current.memoizedState;
        renderLanes2 && (newProps = workInProgress2.child, type = null, null !== newProps.alternate && null !== newProps.alternate.memoizedState && null !== newProps.alternate.memoizedState.cachePool && (type = newProps.alternate.memoizedState.cachePool.pool), nextResource = null, null !== newProps.memoizedState && null !== newProps.memoizedState.cachePool && (nextResource = newProps.memoizedState.cachePool.pool), nextResource !== type && (newProps.flags |= 2048));
        renderLanes2 !== current && renderLanes2 && (workInProgress2.child.flags |= 8192);
        scheduleRetryEffect(workInProgress2, workInProgress2.updateQueue);
        bubbleProperties(workInProgress2);
        return null;
      case 4:
        return popHostContainer(), null === current && listenToAllSupportedEvents(workInProgress2.stateNode.containerInfo), bubbleProperties(workInProgress2), null;
      case 10:
        return popProvider(workInProgress2.type), bubbleProperties(workInProgress2), null;
      case 19:
        pop(suspenseStackCursor);
        newProps = workInProgress2.memoizedState;
        if (null === newProps) return bubbleProperties(workInProgress2), null;
        type = 0 !== (workInProgress2.flags & 128);
        nextResource = newProps.rendering;
        if (null === nextResource)
          if (type) cutOffTailIfNeeded(newProps, false);
          else {
            if (0 !== workInProgressRootExitStatus || null !== current && 0 !== (current.flags & 128))
              for (current = workInProgress2.child; null !== current; ) {
                nextResource = findFirstSuspended(current);
                if (null !== nextResource) {
                  workInProgress2.flags |= 128;
                  cutOffTailIfNeeded(newProps, false);
                  current = nextResource.updateQueue;
                  workInProgress2.updateQueue = current;
                  scheduleRetryEffect(workInProgress2, current);
                  workInProgress2.subtreeFlags = 0;
                  current = renderLanes2;
                  for (renderLanes2 = workInProgress2.child; null !== renderLanes2; )
                    resetWorkInProgress(renderLanes2, current), renderLanes2 = renderLanes2.sibling;
                  push(
                    suspenseStackCursor,
                    suspenseStackCursor.current & 1 | 2
                  );
                  isHydrating && pushTreeFork(workInProgress2, newProps.treeForkCount);
                  return workInProgress2.child;
                }
                current = current.sibling;
              }
            null !== newProps.tail && now() > workInProgressRootRenderTargetTime && (workInProgress2.flags |= 128, type = true, cutOffTailIfNeeded(newProps, false), workInProgress2.lanes = 4194304);
          }
        else {
          if (!type)
            if (current = findFirstSuspended(nextResource), null !== current) {
              if (workInProgress2.flags |= 128, type = true, current = current.updateQueue, workInProgress2.updateQueue = current, scheduleRetryEffect(workInProgress2, current), cutOffTailIfNeeded(newProps, true), null === newProps.tail && "hidden" === newProps.tailMode && !nextResource.alternate && !isHydrating)
                return bubbleProperties(workInProgress2), null;
            } else
              2 * now() - newProps.renderingStartTime > workInProgressRootRenderTargetTime && 536870912 !== renderLanes2 && (workInProgress2.flags |= 128, type = true, cutOffTailIfNeeded(newProps, false), workInProgress2.lanes = 4194304);
          newProps.isBackwards ? (nextResource.sibling = workInProgress2.child, workInProgress2.child = nextResource) : (current = newProps.last, null !== current ? current.sibling = nextResource : workInProgress2.child = nextResource, newProps.last = nextResource);
        }
        if (null !== newProps.tail)
          return current = newProps.tail, newProps.rendering = current, newProps.tail = current.sibling, newProps.renderingStartTime = now(), current.sibling = null, renderLanes2 = suspenseStackCursor.current, push(
            suspenseStackCursor,
            type ? renderLanes2 & 1 | 2 : renderLanes2 & 1
          ), isHydrating && pushTreeFork(workInProgress2, newProps.treeForkCount), current;
        bubbleProperties(workInProgress2);
        return null;
      case 22:
      case 23:
        return popSuspenseHandler(workInProgress2), popHiddenContext(), newProps = null !== workInProgress2.memoizedState, null !== current ? null !== current.memoizedState !== newProps && (workInProgress2.flags |= 8192) : newProps && (workInProgress2.flags |= 8192), newProps ? 0 !== (renderLanes2 & 536870912) && 0 === (workInProgress2.flags & 128) && (bubbleProperties(workInProgress2), workInProgress2.subtreeFlags & 6 && (workInProgress2.flags |= 8192)) : bubbleProperties(workInProgress2), renderLanes2 = workInProgress2.updateQueue, null !== renderLanes2 && scheduleRetryEffect(workInProgress2, renderLanes2.retryQueue), renderLanes2 = null, null !== current && null !== current.memoizedState && null !== current.memoizedState.cachePool && (renderLanes2 = current.memoizedState.cachePool.pool), newProps = null, null !== workInProgress2.memoizedState && null !== workInProgress2.memoizedState.cachePool && (newProps = workInProgress2.memoizedState.cachePool.pool), newProps !== renderLanes2 && (workInProgress2.flags |= 2048), null !== current && pop(resumedCache), null;
      case 24:
        return renderLanes2 = null, null !== current && (renderLanes2 = current.memoizedState.cache), workInProgress2.memoizedState.cache !== renderLanes2 && (workInProgress2.flags |= 2048), popProvider(CacheContext), bubbleProperties(workInProgress2), null;
      case 25:
        return null;
      case 30:
        return null;
    }
    throw Error(formatProdErrorMessage(156, workInProgress2.tag));
  }
  function unwindWork(current, workInProgress2) {
    popTreeContext(workInProgress2);
    switch (workInProgress2.tag) {
      case 1:
        return current = workInProgress2.flags, current & 65536 ? (workInProgress2.flags = current & -65537 | 128, workInProgress2) : null;
      case 3:
        return popProvider(CacheContext), popHostContainer(), current = workInProgress2.flags, 0 !== (current & 65536) && 0 === (current & 128) ? (workInProgress2.flags = current & -65537 | 128, workInProgress2) : null;
      case 26:
      case 27:
      case 5:
        return popHostContext(workInProgress2), null;
      case 31:
        if (null !== workInProgress2.memoizedState) {
          popSuspenseHandler(workInProgress2);
          if (null === workInProgress2.alternate)
            throw Error(formatProdErrorMessage(340));
          resetHydrationState();
        }
        current = workInProgress2.flags;
        return current & 65536 ? (workInProgress2.flags = current & -65537 | 128, workInProgress2) : null;
      case 13:
        popSuspenseHandler(workInProgress2);
        current = workInProgress2.memoizedState;
        if (null !== current && null !== current.dehydrated) {
          if (null === workInProgress2.alternate)
            throw Error(formatProdErrorMessage(340));
          resetHydrationState();
        }
        current = workInProgress2.flags;
        return current & 65536 ? (workInProgress2.flags = current & -65537 | 128, workInProgress2) : null;
      case 19:
        return pop(suspenseStackCursor), null;
      case 4:
        return popHostContainer(), null;
      case 10:
        return popProvider(workInProgress2.type), null;
      case 22:
      case 23:
        return popSuspenseHandler(workInProgress2), popHiddenContext(), null !== current && pop(resumedCache), current = workInProgress2.flags, current & 65536 ? (workInProgress2.flags = current & -65537 | 128, workInProgress2) : null;
      case 24:
        return popProvider(CacheContext), null;
      case 25:
        return null;
      default:
        return null;
    }
  }
  function unwindInterruptedWork(current, interruptedWork) {
    popTreeContext(interruptedWork);
    switch (interruptedWork.tag) {
      case 3:
        popProvider(CacheContext);
        popHostContainer();
        break;
      case 26:
      case 27:
      case 5:
        popHostContext(interruptedWork);
        break;
      case 4:
        popHostContainer();
        break;
      case 31:
        null !== interruptedWork.memoizedState && popSuspenseHandler(interruptedWork);
        break;
      case 13:
        popSuspenseHandler(interruptedWork);
        break;
      case 19:
        pop(suspenseStackCursor);
        break;
      case 10:
        popProvider(interruptedWork.type);
        break;
      case 22:
      case 23:
        popSuspenseHandler(interruptedWork);
        popHiddenContext();
        null !== current && pop(resumedCache);
        break;
      case 24:
        popProvider(CacheContext);
    }
  }
  function commitHookEffectListMount(flags, finishedWork) {
    try {
      var updateQueue = finishedWork.updateQueue, lastEffect = null !== updateQueue ? updateQueue.lastEffect : null;
      if (null !== lastEffect) {
        var firstEffect = lastEffect.next;
        updateQueue = firstEffect;
        do {
          if ((updateQueue.tag & flags) === flags) {
            lastEffect = void 0;
            var create = updateQueue.create, inst = updateQueue.inst;
            lastEffect = create();
            inst.destroy = lastEffect;
          }
          updateQueue = updateQueue.next;
        } while (updateQueue !== firstEffect);
      }
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
  function commitHookEffectListUnmount(flags, finishedWork, nearestMountedAncestor$jscomp$0) {
    try {
      var updateQueue = finishedWork.updateQueue, lastEffect = null !== updateQueue ? updateQueue.lastEffect : null;
      if (null !== lastEffect) {
        var firstEffect = lastEffect.next;
        updateQueue = firstEffect;
        do {
          if ((updateQueue.tag & flags) === flags) {
            var inst = updateQueue.inst, destroy = inst.destroy;
            if (void 0 !== destroy) {
              inst.destroy = void 0;
              lastEffect = finishedWork;
              var nearestMountedAncestor = nearestMountedAncestor$jscomp$0, destroy_ = destroy;
              try {
                destroy_();
              } catch (error) {
                captureCommitPhaseError(
                  lastEffect,
                  nearestMountedAncestor,
                  error
                );
              }
            }
          }
          updateQueue = updateQueue.next;
        } while (updateQueue !== firstEffect);
      }
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
  function commitClassCallbacks(finishedWork) {
    var updateQueue = finishedWork.updateQueue;
    if (null !== updateQueue) {
      var instance = finishedWork.stateNode;
      try {
        commitCallbacks(updateQueue, instance);
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
    }
  }
  function safelyCallComponentWillUnmount(current, nearestMountedAncestor, instance) {
    instance.props = resolveClassComponentProps(
      current.type,
      current.memoizedProps
    );
    instance.state = current.memoizedState;
    try {
      instance.componentWillUnmount();
    } catch (error) {
      captureCommitPhaseError(current, nearestMountedAncestor, error);
    }
  }
  function safelyAttachRef(current, nearestMountedAncestor) {
    try {
      var ref = current.ref;
      if (null !== ref) {
        switch (current.tag) {
          case 26:
          case 27:
          case 5:
            var instanceToUse = current.stateNode;
            break;
          case 30:
            instanceToUse = current.stateNode;
            break;
          default:
            instanceToUse = current.stateNode;
        }
        "function" === typeof ref ? current.refCleanup = ref(instanceToUse) : ref.current = instanceToUse;
      }
    } catch (error) {
      captureCommitPhaseError(current, nearestMountedAncestor, error);
    }
  }
  function safelyDetachRef(current, nearestMountedAncestor) {
    var ref = current.ref, refCleanup = current.refCleanup;
    if (null !== ref)
      if ("function" === typeof refCleanup)
        try {
          refCleanup();
        } catch (error) {
          captureCommitPhaseError(current, nearestMountedAncestor, error);
        } finally {
          current.refCleanup = null, current = current.alternate, null != current && (current.refCleanup = null);
        }
      else if ("function" === typeof ref)
        try {
          ref(null);
        } catch (error$140) {
          captureCommitPhaseError(current, nearestMountedAncestor, error$140);
        }
      else ref.current = null;
  }
  function commitHostMount(finishedWork) {
    var type = finishedWork.type, props = finishedWork.memoizedProps, instance = finishedWork.stateNode;
    try {
      a: switch (type) {
        case "button":
        case "input":
        case "select":
        case "textarea":
          props.autoFocus && instance.focus();
          break a;
        case "img":
          props.src ? instance.src = props.src : props.srcSet && (instance.srcset = props.srcSet);
      }
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
  function commitHostUpdate(finishedWork, newProps, oldProps) {
    try {
      var domElement = finishedWork.stateNode;
      updateProperties(domElement, finishedWork.type, oldProps, newProps);
      domElement[internalPropsKey] = newProps;
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
  function isHostParent(fiber) {
    return 5 === fiber.tag || 3 === fiber.tag || 26 === fiber.tag || 27 === fiber.tag && isSingletonScope(fiber.type) || 4 === fiber.tag;
  }
  function getHostSibling(fiber) {
    a: for (; ; ) {
      for (; null === fiber.sibling; ) {
        if (null === fiber.return || isHostParent(fiber.return)) return null;
        fiber = fiber.return;
      }
      fiber.sibling.return = fiber.return;
      for (fiber = fiber.sibling; 5 !== fiber.tag && 6 !== fiber.tag && 18 !== fiber.tag; ) {
        if (27 === fiber.tag && isSingletonScope(fiber.type)) continue a;
        if (fiber.flags & 2) continue a;
        if (null === fiber.child || 4 === fiber.tag) continue a;
        else fiber.child.return = fiber, fiber = fiber.child;
      }
      if (!(fiber.flags & 2)) return fiber.stateNode;
    }
  }
  function insertOrAppendPlacementNodeIntoContainer(node, before, parent) {
    var tag = node.tag;
    if (5 === tag || 6 === tag)
      node = node.stateNode, before ? (9 === parent.nodeType ? parent.body : "HTML" === parent.nodeName ? parent.ownerDocument.body : parent).insertBefore(node, before) : (before = 9 === parent.nodeType ? parent.body : "HTML" === parent.nodeName ? parent.ownerDocument.body : parent, before.appendChild(node), parent = parent._reactRootContainer, null !== parent && void 0 !== parent || null !== before.onclick || (before.onclick = noop$1));
    else if (4 !== tag && (27 === tag && isSingletonScope(node.type) && (parent = node.stateNode, before = null), node = node.child, null !== node))
      for (insertOrAppendPlacementNodeIntoContainer(node, before, parent), node = node.sibling; null !== node; )
        insertOrAppendPlacementNodeIntoContainer(node, before, parent), node = node.sibling;
  }
  function insertOrAppendPlacementNode(node, before, parent) {
    var tag = node.tag;
    if (5 === tag || 6 === tag)
      node = node.stateNode, before ? parent.insertBefore(node, before) : parent.appendChild(node);
    else if (4 !== tag && (27 === tag && isSingletonScope(node.type) && (parent = node.stateNode), node = node.child, null !== node))
      for (insertOrAppendPlacementNode(node, before, parent), node = node.sibling; null !== node; )
        insertOrAppendPlacementNode(node, before, parent), node = node.sibling;
  }
  function commitHostSingletonAcquisition(finishedWork) {
    var singleton = finishedWork.stateNode, props = finishedWork.memoizedProps;
    try {
      for (var type = finishedWork.type, attributes = singleton.attributes; attributes.length; )
        singleton.removeAttributeNode(attributes[0]);
      setInitialProperties(singleton, type, props);
      singleton[internalInstanceKey] = finishedWork;
      singleton[internalPropsKey] = props;
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
  var offscreenSubtreeIsHidden = false, offscreenSubtreeWasHidden = false, needsFormReset = false, PossiblyWeakSet = "function" === typeof WeakSet ? WeakSet : Set, nextEffect = null;
  function commitBeforeMutationEffects(root2, firstChild) {
    root2 = root2.containerInfo;
    eventsEnabled = _enabled;
    root2 = getActiveElementDeep(root2);
    if (hasSelectionCapabilities(root2)) {
      if ("selectionStart" in root2)
        var JSCompiler_temp = {
          start: root2.selectionStart,
          end: root2.selectionEnd
        };
      else
        a: {
          JSCompiler_temp = (JSCompiler_temp = root2.ownerDocument) && JSCompiler_temp.defaultView || window;
          var selection = JSCompiler_temp.getSelection && JSCompiler_temp.getSelection();
          if (selection && 0 !== selection.rangeCount) {
            JSCompiler_temp = selection.anchorNode;
            var anchorOffset = selection.anchorOffset, focusNode = selection.focusNode;
            selection = selection.focusOffset;
            try {
              JSCompiler_temp.nodeType, focusNode.nodeType;
            } catch (e$20) {
              JSCompiler_temp = null;
              break a;
            }
            var length = 0, start = -1, end = -1, indexWithinAnchor = 0, indexWithinFocus = 0, node = root2, parentNode = null;
            b: for (; ; ) {
              for (var next; ; ) {
                node !== JSCompiler_temp || 0 !== anchorOffset && 3 !== node.nodeType || (start = length + anchorOffset);
                node !== focusNode || 0 !== selection && 3 !== node.nodeType || (end = length + selection);
                3 === node.nodeType && (length += node.nodeValue.length);
                if (null === (next = node.firstChild)) break;
                parentNode = node;
                node = next;
              }
              for (; ; ) {
                if (node === root2) break b;
                parentNode === JSCompiler_temp && ++indexWithinAnchor === anchorOffset && (start = length);
                parentNode === focusNode && ++indexWithinFocus === selection && (end = length);
                if (null !== (next = node.nextSibling)) break;
                node = parentNode;
                parentNode = node.parentNode;
              }
              node = next;
            }
            JSCompiler_temp = -1 === start || -1 === end ? null : { start, end };
          } else JSCompiler_temp = null;
        }
      JSCompiler_temp = JSCompiler_temp || { start: 0, end: 0 };
    } else JSCompiler_temp = null;
    selectionInformation = { focusedElem: root2, selectionRange: JSCompiler_temp };
    _enabled = false;
    for (nextEffect = firstChild; null !== nextEffect; )
      if (firstChild = nextEffect, root2 = firstChild.child, 0 !== (firstChild.subtreeFlags & 1028) && null !== root2)
        root2.return = firstChild, nextEffect = root2;
      else
        for (; null !== nextEffect; ) {
          firstChild = nextEffect;
          focusNode = firstChild.alternate;
          root2 = firstChild.flags;
          switch (firstChild.tag) {
            case 0:
              if (0 !== (root2 & 4) && (root2 = firstChild.updateQueue, root2 = null !== root2 ? root2.events : null, null !== root2))
                for (JSCompiler_temp = 0; JSCompiler_temp < root2.length; JSCompiler_temp++)
                  anchorOffset = root2[JSCompiler_temp], anchorOffset.ref.impl = anchorOffset.nextImpl;
              break;
            case 11:
            case 15:
              break;
            case 1:
              if (0 !== (root2 & 1024) && null !== focusNode) {
                root2 = void 0;
                JSCompiler_temp = firstChild;
                anchorOffset = focusNode.memoizedProps;
                focusNode = focusNode.memoizedState;
                selection = JSCompiler_temp.stateNode;
                try {
                  var resolvedPrevProps = resolveClassComponentProps(
                    JSCompiler_temp.type,
                    anchorOffset
                  );
                  root2 = selection.getSnapshotBeforeUpdate(
                    resolvedPrevProps,
                    focusNode
                  );
                  selection.__reactInternalSnapshotBeforeUpdate = root2;
                } catch (error) {
                  captureCommitPhaseError(
                    JSCompiler_temp,
                    JSCompiler_temp.return,
                    error
                  );
                }
              }
              break;
            case 3:
              if (0 !== (root2 & 1024)) {
                if (root2 = firstChild.stateNode.containerInfo, JSCompiler_temp = root2.nodeType, 9 === JSCompiler_temp)
                  clearContainerSparingly(root2);
                else if (1 === JSCompiler_temp)
                  switch (root2.nodeName) {
                    case "HEAD":
                    case "HTML":
                    case "BODY":
                      clearContainerSparingly(root2);
                      break;
                    default:
                      root2.textContent = "";
                  }
              }
              break;
            case 5:
            case 26:
            case 27:
            case 6:
            case 4:
            case 17:
              break;
            default:
              if (0 !== (root2 & 1024)) throw Error(formatProdErrorMessage(163));
          }
          root2 = firstChild.sibling;
          if (null !== root2) {
            root2.return = firstChild.return;
            nextEffect = root2;
            break;
          }
          nextEffect = firstChild.return;
        }
  }
  function commitLayoutEffectOnFiber(finishedRoot, current, finishedWork) {
    var flags = finishedWork.flags;
    switch (finishedWork.tag) {
      case 0:
      case 11:
      case 15:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        flags & 4 && commitHookEffectListMount(5, finishedWork);
        break;
      case 1:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        if (flags & 4)
          if (finishedRoot = finishedWork.stateNode, null === current)
            try {
              finishedRoot.componentDidMount();
            } catch (error) {
              captureCommitPhaseError(finishedWork, finishedWork.return, error);
            }
          else {
            var prevProps = resolveClassComponentProps(
              finishedWork.type,
              current.memoizedProps
            );
            current = current.memoizedState;
            try {
              finishedRoot.componentDidUpdate(
                prevProps,
                current,
                finishedRoot.__reactInternalSnapshotBeforeUpdate
              );
            } catch (error$139) {
              captureCommitPhaseError(
                finishedWork,
                finishedWork.return,
                error$139
              );
            }
          }
        flags & 64 && commitClassCallbacks(finishedWork);
        flags & 512 && safelyAttachRef(finishedWork, finishedWork.return);
        break;
      case 3:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        if (flags & 64 && (finishedRoot = finishedWork.updateQueue, null !== finishedRoot)) {
          current = null;
          if (null !== finishedWork.child)
            switch (finishedWork.child.tag) {
              case 27:
              case 5:
                current = finishedWork.child.stateNode;
                break;
              case 1:
                current = finishedWork.child.stateNode;
            }
          try {
            commitCallbacks(finishedRoot, current);
          } catch (error) {
            captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
        }
        break;
      case 27:
        null === current && flags & 4 && commitHostSingletonAcquisition(finishedWork);
      case 26:
      case 5:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        null === current && flags & 4 && commitHostMount(finishedWork);
        flags & 512 && safelyAttachRef(finishedWork, finishedWork.return);
        break;
      case 12:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        break;
      case 31:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        flags & 4 && commitActivityHydrationCallbacks(finishedRoot, finishedWork);
        break;
      case 13:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        flags & 4 && commitSuspenseHydrationCallbacks(finishedRoot, finishedWork);
        flags & 64 && (finishedRoot = finishedWork.memoizedState, null !== finishedRoot && (finishedRoot = finishedRoot.dehydrated, null !== finishedRoot && (finishedWork = retryDehydratedSuspenseBoundary.bind(
          null,
          finishedWork
        ), registerSuspenseInstanceRetry(finishedRoot, finishedWork))));
        break;
      case 22:
        flags = null !== finishedWork.memoizedState || offscreenSubtreeIsHidden;
        if (!flags) {
          current = null !== current && null !== current.memoizedState || offscreenSubtreeWasHidden;
          prevProps = offscreenSubtreeIsHidden;
          var prevOffscreenSubtreeWasHidden = offscreenSubtreeWasHidden;
          offscreenSubtreeIsHidden = flags;
          (offscreenSubtreeWasHidden = current) && !prevOffscreenSubtreeWasHidden ? recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            0 !== (finishedWork.subtreeFlags & 8772)
          ) : recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
          offscreenSubtreeIsHidden = prevProps;
          offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden;
        }
        break;
      case 30:
        break;
      default:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
    }
  }
  function detachFiberAfterEffects(fiber) {
    var alternate = fiber.alternate;
    null !== alternate && (fiber.alternate = null, detachFiberAfterEffects(alternate));
    fiber.child = null;
    fiber.deletions = null;
    fiber.sibling = null;
    5 === fiber.tag && (alternate = fiber.stateNode, null !== alternate && detachDeletedInstance(alternate));
    fiber.stateNode = null;
    fiber.return = null;
    fiber.dependencies = null;
    fiber.memoizedProps = null;
    fiber.memoizedState = null;
    fiber.pendingProps = null;
    fiber.stateNode = null;
    fiber.updateQueue = null;
  }
  var hostParent = null, hostParentIsContainer = false;
  function recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, parent) {
    for (parent = parent.child; null !== parent; )
      commitDeletionEffectsOnFiber(finishedRoot, nearestMountedAncestor, parent), parent = parent.sibling;
  }
  function commitDeletionEffectsOnFiber(finishedRoot, nearestMountedAncestor, deletedFiber) {
    if (injectedHook && "function" === typeof injectedHook.onCommitFiberUnmount)
      try {
        injectedHook.onCommitFiberUnmount(rendererID, deletedFiber);
      } catch (err) {
      }
    switch (deletedFiber.tag) {
      case 26:
        offscreenSubtreeWasHidden || safelyDetachRef(deletedFiber, nearestMountedAncestor);
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        deletedFiber.memoizedState ? deletedFiber.memoizedState.count-- : deletedFiber.stateNode && (deletedFiber = deletedFiber.stateNode, deletedFiber.parentNode.removeChild(deletedFiber));
        break;
      case 27:
        offscreenSubtreeWasHidden || safelyDetachRef(deletedFiber, nearestMountedAncestor);
        var prevHostParent = hostParent, prevHostParentIsContainer = hostParentIsContainer;
        isSingletonScope(deletedFiber.type) && (hostParent = deletedFiber.stateNode, hostParentIsContainer = false);
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        releaseSingletonInstance(deletedFiber.stateNode);
        hostParent = prevHostParent;
        hostParentIsContainer = prevHostParentIsContainer;
        break;
      case 5:
        offscreenSubtreeWasHidden || safelyDetachRef(deletedFiber, nearestMountedAncestor);
      case 6:
        prevHostParent = hostParent;
        prevHostParentIsContainer = hostParentIsContainer;
        hostParent = null;
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        hostParent = prevHostParent;
        hostParentIsContainer = prevHostParentIsContainer;
        if (null !== hostParent)
          if (hostParentIsContainer)
            try {
              (9 === hostParent.nodeType ? hostParent.body : "HTML" === hostParent.nodeName ? hostParent.ownerDocument.body : hostParent).removeChild(deletedFiber.stateNode);
            } catch (error) {
              captureCommitPhaseError(
                deletedFiber,
                nearestMountedAncestor,
                error
              );
            }
          else
            try {
              hostParent.removeChild(deletedFiber.stateNode);
            } catch (error) {
              captureCommitPhaseError(
                deletedFiber,
                nearestMountedAncestor,
                error
              );
            }
        break;
      case 18:
        null !== hostParent && (hostParentIsContainer ? (finishedRoot = hostParent, clearHydrationBoundary(
          9 === finishedRoot.nodeType ? finishedRoot.body : "HTML" === finishedRoot.nodeName ? finishedRoot.ownerDocument.body : finishedRoot,
          deletedFiber.stateNode
        ), retryIfBlockedOn(finishedRoot)) : clearHydrationBoundary(hostParent, deletedFiber.stateNode));
        break;
      case 4:
        prevHostParent = hostParent;
        prevHostParentIsContainer = hostParentIsContainer;
        hostParent = deletedFiber.stateNode.containerInfo;
        hostParentIsContainer = true;
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        hostParent = prevHostParent;
        hostParentIsContainer = prevHostParentIsContainer;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        commitHookEffectListUnmount(2, deletedFiber, nearestMountedAncestor);
        offscreenSubtreeWasHidden || commitHookEffectListUnmount(4, deletedFiber, nearestMountedAncestor);
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        break;
      case 1:
        offscreenSubtreeWasHidden || (safelyDetachRef(deletedFiber, nearestMountedAncestor), prevHostParent = deletedFiber.stateNode, "function" === typeof prevHostParent.componentWillUnmount && safelyCallComponentWillUnmount(
          deletedFiber,
          nearestMountedAncestor,
          prevHostParent
        ));
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        break;
      case 21:
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        break;
      case 22:
        offscreenSubtreeWasHidden = (prevHostParent = offscreenSubtreeWasHidden) || null !== deletedFiber.memoizedState;
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        offscreenSubtreeWasHidden = prevHostParent;
        break;
      default:
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
    }
  }
  function commitActivityHydrationCallbacks(finishedRoot, finishedWork) {
    if (null === finishedWork.memoizedState && (finishedRoot = finishedWork.alternate, null !== finishedRoot && (finishedRoot = finishedRoot.memoizedState, null !== finishedRoot))) {
      finishedRoot = finishedRoot.dehydrated;
      try {
        retryIfBlockedOn(finishedRoot);
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
    }
  }
  function commitSuspenseHydrationCallbacks(finishedRoot, finishedWork) {
    if (null === finishedWork.memoizedState && (finishedRoot = finishedWork.alternate, null !== finishedRoot && (finishedRoot = finishedRoot.memoizedState, null !== finishedRoot && (finishedRoot = finishedRoot.dehydrated, null !== finishedRoot))))
      try {
        retryIfBlockedOn(finishedRoot);
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
  }
  function getRetryCache(finishedWork) {
    switch (finishedWork.tag) {
      case 31:
      case 13:
      case 19:
        var retryCache = finishedWork.stateNode;
        null === retryCache && (retryCache = finishedWork.stateNode = new PossiblyWeakSet());
        return retryCache;
      case 22:
        return finishedWork = finishedWork.stateNode, retryCache = finishedWork._retryCache, null === retryCache && (retryCache = finishedWork._retryCache = new PossiblyWeakSet()), retryCache;
      default:
        throw Error(formatProdErrorMessage(435, finishedWork.tag));
    }
  }
  function attachSuspenseRetryListeners(finishedWork, wakeables) {
    var retryCache = getRetryCache(finishedWork);
    wakeables.forEach(function(wakeable) {
      if (!retryCache.has(wakeable)) {
        retryCache.add(wakeable);
        var retry = resolveRetryWakeable.bind(null, finishedWork, wakeable);
        wakeable.then(retry, retry);
      }
    });
  }
  function recursivelyTraverseMutationEffects(root$jscomp$0, parentFiber) {
    var deletions = parentFiber.deletions;
    if (null !== deletions)
      for (var i = 0; i < deletions.length; i++) {
        var childToDelete = deletions[i], root2 = root$jscomp$0, returnFiber = parentFiber, parent = returnFiber;
        a: for (; null !== parent; ) {
          switch (parent.tag) {
            case 27:
              if (isSingletonScope(parent.type)) {
                hostParent = parent.stateNode;
                hostParentIsContainer = false;
                break a;
              }
              break;
            case 5:
              hostParent = parent.stateNode;
              hostParentIsContainer = false;
              break a;
            case 3:
            case 4:
              hostParent = parent.stateNode.containerInfo;
              hostParentIsContainer = true;
              break a;
          }
          parent = parent.return;
        }
        if (null === hostParent) throw Error(formatProdErrorMessage(160));
        commitDeletionEffectsOnFiber(root2, returnFiber, childToDelete);
        hostParent = null;
        hostParentIsContainer = false;
        root2 = childToDelete.alternate;
        null !== root2 && (root2.return = null);
        childToDelete.return = null;
      }
    if (parentFiber.subtreeFlags & 13886)
      for (parentFiber = parentFiber.child; null !== parentFiber; )
        commitMutationEffectsOnFiber(parentFiber, root$jscomp$0), parentFiber = parentFiber.sibling;
  }
  var currentHoistableRoot = null;
  function commitMutationEffectsOnFiber(finishedWork, root2) {
    var current = finishedWork.alternate, flags = finishedWork.flags;
    switch (finishedWork.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        recursivelyTraverseMutationEffects(root2, finishedWork);
        commitReconciliationEffects(finishedWork);
        flags & 4 && (commitHookEffectListUnmount(3, finishedWork, finishedWork.return), commitHookEffectListMount(3, finishedWork), commitHookEffectListUnmount(5, finishedWork, finishedWork.return));
        break;
      case 1:
        recursivelyTraverseMutationEffects(root2, finishedWork);
        commitReconciliationEffects(finishedWork);
        flags & 512 && (offscreenSubtreeWasHidden || null === current || safelyDetachRef(current, current.return));
        flags & 64 && offscreenSubtreeIsHidden && (finishedWork = finishedWork.updateQueue, null !== finishedWork && (flags = finishedWork.callbacks, null !== flags && (current = finishedWork.shared.hiddenCallbacks, finishedWork.shared.hiddenCallbacks = null === current ? flags : current.concat(flags))));
        break;
      case 26:
        var hoistableRoot = currentHoistableRoot;
        recursivelyTraverseMutationEffects(root2, finishedWork);
        commitReconciliationEffects(finishedWork);
        flags & 512 && (offscreenSubtreeWasHidden || null === current || safelyDetachRef(current, current.return));
        if (flags & 4) {
          var currentResource = null !== current ? current.memoizedState : null;
          flags = finishedWork.memoizedState;
          if (null === current)
            if (null === flags)
              if (null === finishedWork.stateNode) {
                a: {
                  flags = finishedWork.type;
                  current = finishedWork.memoizedProps;
                  hoistableRoot = hoistableRoot.ownerDocument || hoistableRoot;
                  b: switch (flags) {
                    case "title":
                      currentResource = hoistableRoot.getElementsByTagName("title")[0];
                      if (!currentResource || currentResource[internalHoistableMarker] || currentResource[internalInstanceKey] || "http://www.w3.org/2000/svg" === currentResource.namespaceURI || currentResource.hasAttribute("itemprop"))
                        currentResource = hoistableRoot.createElement(flags), hoistableRoot.head.insertBefore(
                          currentResource,
                          hoistableRoot.querySelector("head > title")
                        );
                      setInitialProperties(currentResource, flags, current);
                      currentResource[internalInstanceKey] = finishedWork;
                      markNodeAsHoistable(currentResource);
                      flags = currentResource;
                      break a;
                    case "link":
                      var maybeNodes = getHydratableHoistableCache(
                        "link",
                        "href",
                        hoistableRoot
                      ).get(flags + (current.href || ""));
                      if (maybeNodes) {
                        for (var i = 0; i < maybeNodes.length; i++)
                          if (currentResource = maybeNodes[i], currentResource.getAttribute("href") === (null == current.href || "" === current.href ? null : current.href) && currentResource.getAttribute("rel") === (null == current.rel ? null : current.rel) && currentResource.getAttribute("title") === (null == current.title ? null : current.title) && currentResource.getAttribute("crossorigin") === (null == current.crossOrigin ? null : current.crossOrigin)) {
                            maybeNodes.splice(i, 1);
                            break b;
                          }
                      }
                      currentResource = hoistableRoot.createElement(flags);
                      setInitialProperties(currentResource, flags, current);
                      hoistableRoot.head.appendChild(currentResource);
                      break;
                    case "meta":
                      if (maybeNodes = getHydratableHoistableCache(
                        "meta",
                        "content",
                        hoistableRoot
                      ).get(flags + (current.content || ""))) {
                        for (i = 0; i < maybeNodes.length; i++)
                          if (currentResource = maybeNodes[i], currentResource.getAttribute("content") === (null == current.content ? null : "" + current.content) && currentResource.getAttribute("name") === (null == current.name ? null : current.name) && currentResource.getAttribute("property") === (null == current.property ? null : current.property) && currentResource.getAttribute("http-equiv") === (null == current.httpEquiv ? null : current.httpEquiv) && currentResource.getAttribute("charset") === (null == current.charSet ? null : current.charSet)) {
                            maybeNodes.splice(i, 1);
                            break b;
                          }
                      }
                      currentResource = hoistableRoot.createElement(flags);
                      setInitialProperties(currentResource, flags, current);
                      hoistableRoot.head.appendChild(currentResource);
                      break;
                    default:
                      throw Error(formatProdErrorMessage(468, flags));
                  }
                  currentResource[internalInstanceKey] = finishedWork;
                  markNodeAsHoistable(currentResource);
                  flags = currentResource;
                }
                finishedWork.stateNode = flags;
              } else
                mountHoistable(
                  hoistableRoot,
                  finishedWork.type,
                  finishedWork.stateNode
                );
            else
              finishedWork.stateNode = acquireResource(
                hoistableRoot,
                flags,
                finishedWork.memoizedProps
              );
          else
            currentResource !== flags ? (null === currentResource ? null !== current.stateNode && (current = current.stateNode, current.parentNode.removeChild(current)) : currentResource.count--, null === flags ? mountHoistable(
              hoistableRoot,
              finishedWork.type,
              finishedWork.stateNode
            ) : acquireResource(
              hoistableRoot,
              flags,
              finishedWork.memoizedProps
            )) : null === flags && null !== finishedWork.stateNode && commitHostUpdate(
              finishedWork,
              finishedWork.memoizedProps,
              current.memoizedProps
            );
        }
        break;
      case 27:
        recursivelyTraverseMutationEffects(root2, finishedWork);
        commitReconciliationEffects(finishedWork);
        flags & 512 && (offscreenSubtreeWasHidden || null === current || safelyDetachRef(current, current.return));
        null !== current && flags & 4 && commitHostUpdate(
          finishedWork,
          finishedWork.memoizedProps,
          current.memoizedProps
        );
        break;
      case 5:
        recursivelyTraverseMutationEffects(root2, finishedWork);
        commitReconciliationEffects(finishedWork);
        flags & 512 && (offscreenSubtreeWasHidden || null === current || safelyDetachRef(current, current.return));
        if (finishedWork.flags & 32) {
          hoistableRoot = finishedWork.stateNode;
          try {
            setTextContent(hoistableRoot, "");
          } catch (error) {
            captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
        }
        flags & 4 && null != finishedWork.stateNode && (hoistableRoot = finishedWork.memoizedProps, commitHostUpdate(
          finishedWork,
          hoistableRoot,
          null !== current ? current.memoizedProps : hoistableRoot
        ));
        flags & 1024 && (needsFormReset = true);
        break;
      case 6:
        recursivelyTraverseMutationEffects(root2, finishedWork);
        commitReconciliationEffects(finishedWork);
        if (flags & 4) {
          if (null === finishedWork.stateNode)
            throw Error(formatProdErrorMessage(162));
          flags = finishedWork.memoizedProps;
          current = finishedWork.stateNode;
          try {
            current.nodeValue = flags;
          } catch (error) {
            captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
        }
        break;
      case 3:
        tagCaches = null;
        hoistableRoot = currentHoistableRoot;
        currentHoistableRoot = getHoistableRoot(root2.containerInfo);
        recursivelyTraverseMutationEffects(root2, finishedWork);
        currentHoistableRoot = hoistableRoot;
        commitReconciliationEffects(finishedWork);
        if (flags & 4 && null !== current && current.memoizedState.isDehydrated)
          try {
            retryIfBlockedOn(root2.containerInfo);
          } catch (error) {
            captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
        needsFormReset && (needsFormReset = false, recursivelyResetForms(finishedWork));
        break;
      case 4:
        flags = currentHoistableRoot;
        currentHoistableRoot = getHoistableRoot(
          finishedWork.stateNode.containerInfo
        );
        recursivelyTraverseMutationEffects(root2, finishedWork);
        commitReconciliationEffects(finishedWork);
        currentHoistableRoot = flags;
        break;
      case 12:
        recursivelyTraverseMutationEffects(root2, finishedWork);
        commitReconciliationEffects(finishedWork);
        break;
      case 31:
        recursivelyTraverseMutationEffects(root2, finishedWork);
        commitReconciliationEffects(finishedWork);
        flags & 4 && (flags = finishedWork.updateQueue, null !== flags && (finishedWork.updateQueue = null, attachSuspenseRetryListeners(finishedWork, flags)));
        break;
      case 13:
        recursivelyTraverseMutationEffects(root2, finishedWork);
        commitReconciliationEffects(finishedWork);
        finishedWork.child.flags & 8192 && null !== finishedWork.memoizedState !== (null !== current && null !== current.memoizedState) && (globalMostRecentFallbackTime = now());
        flags & 4 && (flags = finishedWork.updateQueue, null !== flags && (finishedWork.updateQueue = null, attachSuspenseRetryListeners(finishedWork, flags)));
        break;
      case 22:
        hoistableRoot = null !== finishedWork.memoizedState;
        var wasHidden = null !== current && null !== current.memoizedState, prevOffscreenSubtreeIsHidden = offscreenSubtreeIsHidden, prevOffscreenSubtreeWasHidden = offscreenSubtreeWasHidden;
        offscreenSubtreeIsHidden = prevOffscreenSubtreeIsHidden || hoistableRoot;
        offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden || wasHidden;
        recursivelyTraverseMutationEffects(root2, finishedWork);
        offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden;
        offscreenSubtreeIsHidden = prevOffscreenSubtreeIsHidden;
        commitReconciliationEffects(finishedWork);
        if (flags & 8192)
          a: for (root2 = finishedWork.stateNode, root2._visibility = hoistableRoot ? root2._visibility & -2 : root2._visibility | 1, hoistableRoot && (null === current || wasHidden || offscreenSubtreeIsHidden || offscreenSubtreeWasHidden || recursivelyTraverseDisappearLayoutEffects(finishedWork)), current = null, root2 = finishedWork; ; ) {
            if (5 === root2.tag || 26 === root2.tag) {
              if (null === current) {
                wasHidden = current = root2;
                try {
                  if (currentResource = wasHidden.stateNode, hoistableRoot)
                    maybeNodes = currentResource.style, "function" === typeof maybeNodes.setProperty ? maybeNodes.setProperty("display", "none", "important") : maybeNodes.display = "none";
                  else {
                    i = wasHidden.stateNode;
                    var styleProp = wasHidden.memoizedProps.style, display = void 0 !== styleProp && null !== styleProp && styleProp.hasOwnProperty("display") ? styleProp.display : null;
                    i.style.display = null == display || "boolean" === typeof display ? "" : ("" + display).trim();
                  }
                } catch (error) {
                  captureCommitPhaseError(wasHidden, wasHidden.return, error);
                }
              }
            } else if (6 === root2.tag) {
              if (null === current) {
                wasHidden = root2;
                try {
                  wasHidden.stateNode.nodeValue = hoistableRoot ? "" : wasHidden.memoizedProps;
                } catch (error) {
                  captureCommitPhaseError(wasHidden, wasHidden.return, error);
                }
              }
            } else if (18 === root2.tag) {
              if (null === current) {
                wasHidden = root2;
                try {
                  var instance = wasHidden.stateNode;
                  hoistableRoot ? hideOrUnhideDehydratedBoundary(instance, true) : hideOrUnhideDehydratedBoundary(wasHidden.stateNode, false);
                } catch (error) {
                  captureCommitPhaseError(wasHidden, wasHidden.return, error);
                }
              }
            } else if ((22 !== root2.tag && 23 !== root2.tag || null === root2.memoizedState || root2 === finishedWork) && null !== root2.child) {
              root2.child.return = root2;
              root2 = root2.child;
              continue;
            }
            if (root2 === finishedWork) break a;
            for (; null === root2.sibling; ) {
              if (null === root2.return || root2.return === finishedWork) break a;
              current === root2 && (current = null);
              root2 = root2.return;
            }
            current === root2 && (current = null);
            root2.sibling.return = root2.return;
            root2 = root2.sibling;
          }
        flags & 4 && (flags = finishedWork.updateQueue, null !== flags && (current = flags.retryQueue, null !== current && (flags.retryQueue = null, attachSuspenseRetryListeners(finishedWork, current))));
        break;
      case 19:
        recursivelyTraverseMutationEffects(root2, finishedWork);
        commitReconciliationEffects(finishedWork);
        flags & 4 && (flags = finishedWork.updateQueue, null !== flags && (finishedWork.updateQueue = null, attachSuspenseRetryListeners(finishedWork, flags)));
        break;
      case 30:
        break;
      case 21:
        break;
      default:
        recursivelyTraverseMutationEffects(root2, finishedWork), commitReconciliationEffects(finishedWork);
    }
  }
  function commitReconciliationEffects(finishedWork) {
    var flags = finishedWork.flags;
    if (flags & 2) {
      try {
        for (var hostParentFiber, parentFiber = finishedWork.return; null !== parentFiber; ) {
          if (isHostParent(parentFiber)) {
            hostParentFiber = parentFiber;
            break;
          }
          parentFiber = parentFiber.return;
        }
        if (null == hostParentFiber) throw Error(formatProdErrorMessage(160));
        switch (hostParentFiber.tag) {
          case 27:
            var parent = hostParentFiber.stateNode, before = getHostSibling(finishedWork);
            insertOrAppendPlacementNode(finishedWork, before, parent);
            break;
          case 5:
            var parent$141 = hostParentFiber.stateNode;
            hostParentFiber.flags & 32 && (setTextContent(parent$141, ""), hostParentFiber.flags &= -33);
            var before$142 = getHostSibling(finishedWork);
            insertOrAppendPlacementNode(finishedWork, before$142, parent$141);
            break;
          case 3:
          case 4:
            var parent$143 = hostParentFiber.stateNode.containerInfo, before$144 = getHostSibling(finishedWork);
            insertOrAppendPlacementNodeIntoContainer(
              finishedWork,
              before$144,
              parent$143
            );
            break;
          default:
            throw Error(formatProdErrorMessage(161));
        }
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
      finishedWork.flags &= -3;
    }
    flags & 4096 && (finishedWork.flags &= -4097);
  }
  function recursivelyResetForms(parentFiber) {
    if (parentFiber.subtreeFlags & 1024)
      for (parentFiber = parentFiber.child; null !== parentFiber; ) {
        var fiber = parentFiber;
        recursivelyResetForms(fiber);
        5 === fiber.tag && fiber.flags & 1024 && fiber.stateNode.reset();
        parentFiber = parentFiber.sibling;
      }
  }
  function recursivelyTraverseLayoutEffects(root2, parentFiber) {
    if (parentFiber.subtreeFlags & 8772)
      for (parentFiber = parentFiber.child; null !== parentFiber; )
        commitLayoutEffectOnFiber(root2, parentFiber.alternate, parentFiber), parentFiber = parentFiber.sibling;
  }
  function recursivelyTraverseDisappearLayoutEffects(parentFiber) {
    for (parentFiber = parentFiber.child; null !== parentFiber; ) {
      var finishedWork = parentFiber;
      switch (finishedWork.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
          commitHookEffectListUnmount(4, finishedWork, finishedWork.return);
          recursivelyTraverseDisappearLayoutEffects(finishedWork);
          break;
        case 1:
          safelyDetachRef(finishedWork, finishedWork.return);
          var instance = finishedWork.stateNode;
          "function" === typeof instance.componentWillUnmount && safelyCallComponentWillUnmount(
            finishedWork,
            finishedWork.return,
            instance
          );
          recursivelyTraverseDisappearLayoutEffects(finishedWork);
          break;
        case 27:
          releaseSingletonInstance(finishedWork.stateNode);
        case 26:
        case 5:
          safelyDetachRef(finishedWork, finishedWork.return);
          recursivelyTraverseDisappearLayoutEffects(finishedWork);
          break;
        case 22:
          null === finishedWork.memoizedState && recursivelyTraverseDisappearLayoutEffects(finishedWork);
          break;
        case 30:
          recursivelyTraverseDisappearLayoutEffects(finishedWork);
          break;
        default:
          recursivelyTraverseDisappearLayoutEffects(finishedWork);
      }
      parentFiber = parentFiber.sibling;
    }
  }
  function recursivelyTraverseReappearLayoutEffects(finishedRoot$jscomp$0, parentFiber, includeWorkInProgressEffects) {
    includeWorkInProgressEffects = includeWorkInProgressEffects && 0 !== (parentFiber.subtreeFlags & 8772);
    for (parentFiber = parentFiber.child; null !== parentFiber; ) {
      var current = parentFiber.alternate, finishedRoot = finishedRoot$jscomp$0, finishedWork = parentFiber, flags = finishedWork.flags;
      switch (finishedWork.tag) {
        case 0:
        case 11:
        case 15:
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            includeWorkInProgressEffects
          );
          commitHookEffectListMount(4, finishedWork);
          break;
        case 1:
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            includeWorkInProgressEffects
          );
          current = finishedWork;
          finishedRoot = current.stateNode;
          if ("function" === typeof finishedRoot.componentDidMount)
            try {
              finishedRoot.componentDidMount();
            } catch (error) {
              captureCommitPhaseError(current, current.return, error);
            }
          current = finishedWork;
          finishedRoot = current.updateQueue;
          if (null !== finishedRoot) {
            var instance = current.stateNode;
            try {
              var hiddenCallbacks = finishedRoot.shared.hiddenCallbacks;
              if (null !== hiddenCallbacks)
                for (finishedRoot.shared.hiddenCallbacks = null, finishedRoot = 0; finishedRoot < hiddenCallbacks.length; finishedRoot++)
                  callCallback(hiddenCallbacks[finishedRoot], instance);
            } catch (error) {
              captureCommitPhaseError(current, current.return, error);
            }
          }
          includeWorkInProgressEffects && flags & 64 && commitClassCallbacks(finishedWork);
          safelyAttachRef(finishedWork, finishedWork.return);
          break;
        case 27:
          commitHostSingletonAcquisition(finishedWork);
        case 26:
        case 5:
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            includeWorkInProgressEffects
          );
          includeWorkInProgressEffects && null === current && flags & 4 && commitHostMount(finishedWork);
          safelyAttachRef(finishedWork, finishedWork.return);
          break;
        case 12:
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            includeWorkInProgressEffects
          );
          break;
        case 31:
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            includeWorkInProgressEffects
          );
          includeWorkInProgressEffects && flags & 4 && commitActivityHydrationCallbacks(finishedRoot, finishedWork);
          break;
        case 13:
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            includeWorkInProgressEffects
          );
          includeWorkInProgressEffects && flags & 4 && commitSuspenseHydrationCallbacks(finishedRoot, finishedWork);
          break;
        case 22:
          null === finishedWork.memoizedState && recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            includeWorkInProgressEffects
          );
          safelyAttachRef(finishedWork, finishedWork.return);
          break;
        case 30:
          break;
        default:
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            includeWorkInProgressEffects
          );
      }
      parentFiber = parentFiber.sibling;
    }
  }
  function commitOffscreenPassiveMountEffects(current, finishedWork) {
    var previousCache = null;
    null !== current && null !== current.memoizedState && null !== current.memoizedState.cachePool && (previousCache = current.memoizedState.cachePool.pool);
    current = null;
    null !== finishedWork.memoizedState && null !== finishedWork.memoizedState.cachePool && (current = finishedWork.memoizedState.cachePool.pool);
    current !== previousCache && (null != current && current.refCount++, null != previousCache && releaseCache(previousCache));
  }
  function commitCachePassiveMountEffect(current, finishedWork) {
    current = null;
    null !== finishedWork.alternate && (current = finishedWork.alternate.memoizedState.cache);
    finishedWork = finishedWork.memoizedState.cache;
    finishedWork !== current && (finishedWork.refCount++, null != current && releaseCache(current));
  }
  function recursivelyTraversePassiveMountEffects(root2, parentFiber, committedLanes, committedTransitions) {
    if (parentFiber.subtreeFlags & 10256)
      for (parentFiber = parentFiber.child; null !== parentFiber; )
        commitPassiveMountOnFiber(
          root2,
          parentFiber,
          committedLanes,
          committedTransitions
        ), parentFiber = parentFiber.sibling;
  }
  function commitPassiveMountOnFiber(finishedRoot, finishedWork, committedLanes, committedTransitions) {
    var flags = finishedWork.flags;
    switch (finishedWork.tag) {
      case 0:
      case 11:
      case 15:
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
        flags & 2048 && commitHookEffectListMount(9, finishedWork);
        break;
      case 1:
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
        break;
      case 3:
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
        flags & 2048 && (finishedRoot = null, null !== finishedWork.alternate && (finishedRoot = finishedWork.alternate.memoizedState.cache), finishedWork = finishedWork.memoizedState.cache, finishedWork !== finishedRoot && (finishedWork.refCount++, null != finishedRoot && releaseCache(finishedRoot)));
        break;
      case 12:
        if (flags & 2048) {
          recursivelyTraversePassiveMountEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions
          );
          finishedRoot = finishedWork.stateNode;
          try {
            var _finishedWork$memoize2 = finishedWork.memoizedProps, id = _finishedWork$memoize2.id, onPostCommit = _finishedWork$memoize2.onPostCommit;
            "function" === typeof onPostCommit && onPostCommit(
              id,
              null === finishedWork.alternate ? "mount" : "update",
              finishedRoot.passiveEffectDuration,
              -0
            );
          } catch (error) {
            captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
        } else
          recursivelyTraversePassiveMountEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions
          );
        break;
      case 31:
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
        break;
      case 13:
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
        break;
      case 23:
        break;
      case 22:
        _finishedWork$memoize2 = finishedWork.stateNode;
        id = finishedWork.alternate;
        null !== finishedWork.memoizedState ? _finishedWork$memoize2._visibility & 2 ? recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        ) : recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork) : _finishedWork$memoize2._visibility & 2 ? recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        ) : (_finishedWork$memoize2._visibility |= 2, recursivelyTraverseReconnectPassiveEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions,
          0 !== (finishedWork.subtreeFlags & 10256) || false
        ));
        flags & 2048 && commitOffscreenPassiveMountEffects(id, finishedWork);
        break;
      case 24:
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
        flags & 2048 && commitCachePassiveMountEffect(finishedWork.alternate, finishedWork);
        break;
      default:
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
    }
  }
  function recursivelyTraverseReconnectPassiveEffects(finishedRoot$jscomp$0, parentFiber, committedLanes$jscomp$0, committedTransitions$jscomp$0, includeWorkInProgressEffects) {
    includeWorkInProgressEffects = includeWorkInProgressEffects && (0 !== (parentFiber.subtreeFlags & 10256) || false);
    for (parentFiber = parentFiber.child; null !== parentFiber; ) {
      var finishedRoot = finishedRoot$jscomp$0, finishedWork = parentFiber, committedLanes = committedLanes$jscomp$0, committedTransitions = committedTransitions$jscomp$0, flags = finishedWork.flags;
      switch (finishedWork.tag) {
        case 0:
        case 11:
        case 15:
          recursivelyTraverseReconnectPassiveEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions,
            includeWorkInProgressEffects
          );
          commitHookEffectListMount(8, finishedWork);
          break;
        case 23:
          break;
        case 22:
          var instance = finishedWork.stateNode;
          null !== finishedWork.memoizedState ? instance._visibility & 2 ? recursivelyTraverseReconnectPassiveEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions,
            includeWorkInProgressEffects
          ) : recursivelyTraverseAtomicPassiveEffects(
            finishedRoot,
            finishedWork
          ) : (instance._visibility |= 2, recursivelyTraverseReconnectPassiveEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions,
            includeWorkInProgressEffects
          ));
          includeWorkInProgressEffects && flags & 2048 && commitOffscreenPassiveMountEffects(
            finishedWork.alternate,
            finishedWork
          );
          break;
        case 24:
          recursivelyTraverseReconnectPassiveEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions,
            includeWorkInProgressEffects
          );
          includeWorkInProgressEffects && flags & 2048 && commitCachePassiveMountEffect(finishedWork.alternate, finishedWork);
          break;
        default:
          recursivelyTraverseReconnectPassiveEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions,
            includeWorkInProgressEffects
          );
      }
      parentFiber = parentFiber.sibling;
    }
  }
  function recursivelyTraverseAtomicPassiveEffects(finishedRoot$jscomp$0, parentFiber) {
    if (parentFiber.subtreeFlags & 10256)
      for (parentFiber = parentFiber.child; null !== parentFiber; ) {
        var finishedRoot = finishedRoot$jscomp$0, finishedWork = parentFiber, flags = finishedWork.flags;
        switch (finishedWork.tag) {
          case 22:
            recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork);
            flags & 2048 && commitOffscreenPassiveMountEffects(
              finishedWork.alternate,
              finishedWork
            );
            break;
          case 24:
            recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork);
            flags & 2048 && commitCachePassiveMountEffect(finishedWork.alternate, finishedWork);
            break;
          default:
            recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork);
        }
        parentFiber = parentFiber.sibling;
      }
  }
  var suspenseyCommitFlag = 8192;
  function recursivelyAccumulateSuspenseyCommit(parentFiber, committedLanes, suspendedState) {
    if (parentFiber.subtreeFlags & suspenseyCommitFlag)
      for (parentFiber = parentFiber.child; null !== parentFiber; )
        accumulateSuspenseyCommitOnFiber(
          parentFiber,
          committedLanes,
          suspendedState
        ), parentFiber = parentFiber.sibling;
  }
  function accumulateSuspenseyCommitOnFiber(fiber, committedLanes, suspendedState) {
    switch (fiber.tag) {
      case 26:
        recursivelyAccumulateSuspenseyCommit(
          fiber,
          committedLanes,
          suspendedState
        );
        fiber.flags & suspenseyCommitFlag && null !== fiber.memoizedState && suspendResource(
          suspendedState,
          currentHoistableRoot,
          fiber.memoizedState,
          fiber.memoizedProps
        );
        break;
      case 5:
        recursivelyAccumulateSuspenseyCommit(
          fiber,
          committedLanes,
          suspendedState
        );
        break;
      case 3:
      case 4:
        var previousHoistableRoot = currentHoistableRoot;
        currentHoistableRoot = getHoistableRoot(fiber.stateNode.containerInfo);
        recursivelyAccumulateSuspenseyCommit(
          fiber,
          committedLanes,
          suspendedState
        );
        currentHoistableRoot = previousHoistableRoot;
        break;
      case 22:
        null === fiber.memoizedState && (previousHoistableRoot = fiber.alternate, null !== previousHoistableRoot && null !== previousHoistableRoot.memoizedState ? (previousHoistableRoot = suspenseyCommitFlag, suspenseyCommitFlag = 16777216, recursivelyAccumulateSuspenseyCommit(
          fiber,
          committedLanes,
          suspendedState
        ), suspenseyCommitFlag = previousHoistableRoot) : recursivelyAccumulateSuspenseyCommit(
          fiber,
          committedLanes,
          suspendedState
        ));
        break;
      default:
        recursivelyAccumulateSuspenseyCommit(
          fiber,
          committedLanes,
          suspendedState
        );
    }
  }
  function detachAlternateSiblings(parentFiber) {
    var previousFiber = parentFiber.alternate;
    if (null !== previousFiber && (parentFiber = previousFiber.child, null !== parentFiber)) {
      previousFiber.child = null;
      do
        previousFiber = parentFiber.sibling, parentFiber.sibling = null, parentFiber = previousFiber;
      while (null !== parentFiber);
    }
  }
  function recursivelyTraversePassiveUnmountEffects(parentFiber) {
    var deletions = parentFiber.deletions;
    if (0 !== (parentFiber.flags & 16)) {
      if (null !== deletions)
        for (var i = 0; i < deletions.length; i++) {
          var childToDelete = deletions[i];
          nextEffect = childToDelete;
          commitPassiveUnmountEffectsInsideOfDeletedTree_begin(
            childToDelete,
            parentFiber
          );
        }
      detachAlternateSiblings(parentFiber);
    }
    if (parentFiber.subtreeFlags & 10256)
      for (parentFiber = parentFiber.child; null !== parentFiber; )
        commitPassiveUnmountOnFiber(parentFiber), parentFiber = parentFiber.sibling;
  }
  function commitPassiveUnmountOnFiber(finishedWork) {
    switch (finishedWork.tag) {
      case 0:
      case 11:
      case 15:
        recursivelyTraversePassiveUnmountEffects(finishedWork);
        finishedWork.flags & 2048 && commitHookEffectListUnmount(9, finishedWork, finishedWork.return);
        break;
      case 3:
        recursivelyTraversePassiveUnmountEffects(finishedWork);
        break;
      case 12:
        recursivelyTraversePassiveUnmountEffects(finishedWork);
        break;
      case 22:
        var instance = finishedWork.stateNode;
        null !== finishedWork.memoizedState && instance._visibility & 2 && (null === finishedWork.return || 13 !== finishedWork.return.tag) ? (instance._visibility &= -3, recursivelyTraverseDisconnectPassiveEffects(finishedWork)) : recursivelyTraversePassiveUnmountEffects(finishedWork);
        break;
      default:
        recursivelyTraversePassiveUnmountEffects(finishedWork);
    }
  }
  function recursivelyTraverseDisconnectPassiveEffects(parentFiber) {
    var deletions = parentFiber.deletions;
    if (0 !== (parentFiber.flags & 16)) {
      if (null !== deletions)
        for (var i = 0; i < deletions.length; i++) {
          var childToDelete = deletions[i];
          nextEffect = childToDelete;
          commitPassiveUnmountEffectsInsideOfDeletedTree_begin(
            childToDelete,
            parentFiber
          );
        }
      detachAlternateSiblings(parentFiber);
    }
    for (parentFiber = parentFiber.child; null !== parentFiber; ) {
      deletions = parentFiber;
      switch (deletions.tag) {
        case 0:
        case 11:
        case 15:
          commitHookEffectListUnmount(8, deletions, deletions.return);
          recursivelyTraverseDisconnectPassiveEffects(deletions);
          break;
        case 22:
          i = deletions.stateNode;
          i._visibility & 2 && (i._visibility &= -3, recursivelyTraverseDisconnectPassiveEffects(deletions));
          break;
        default:
          recursivelyTraverseDisconnectPassiveEffects(deletions);
      }
      parentFiber = parentFiber.sibling;
    }
  }
  function commitPassiveUnmountEffectsInsideOfDeletedTree_begin(deletedSubtreeRoot, nearestMountedAncestor) {
    for (; null !== nextEffect; ) {
      var fiber = nextEffect;
      switch (fiber.tag) {
        case 0:
        case 11:
        case 15:
          commitHookEffectListUnmount(8, fiber, nearestMountedAncestor);
          break;
        case 23:
        case 22:
          if (null !== fiber.memoizedState && null !== fiber.memoizedState.cachePool) {
            var cache = fiber.memoizedState.cachePool.pool;
            null != cache && cache.refCount++;
          }
          break;
        case 24:
          releaseCache(fiber.memoizedState.cache);
      }
      cache = fiber.child;
      if (null !== cache) cache.return = fiber, nextEffect = cache;
      else
        a: for (fiber = deletedSubtreeRoot; null !== nextEffect; ) {
          cache = nextEffect;
          var sibling = cache.sibling, returnFiber = cache.return;
          detachFiberAfterEffects(cache);
          if (cache === fiber) {
            nextEffect = null;
            break a;
          }
          if (null !== sibling) {
            sibling.return = returnFiber;
            nextEffect = sibling;
            break a;
          }
          nextEffect = returnFiber;
        }
    }
  }
  var DefaultAsyncDispatcher = {
    getCacheForType: function(resourceType) {
      var cache = readContext(CacheContext), cacheForType = cache.data.get(resourceType);
      void 0 === cacheForType && (cacheForType = resourceType(), cache.data.set(resourceType, cacheForType));
      return cacheForType;
    },
    cacheSignal: function() {
      return readContext(CacheContext).controller.signal;
    }
  }, PossiblyWeakMap = "function" === typeof WeakMap ? WeakMap : Map, executionContext = 0, workInProgressRoot = null, workInProgress = null, workInProgressRootRenderLanes = 0, workInProgressSuspendedReason = 0, workInProgressThrownValue = null, workInProgressRootDidSkipSuspendedSiblings = false, workInProgressRootIsPrerendering = false, workInProgressRootDidAttachPingListener = false, entangledRenderLanes = 0, workInProgressRootExitStatus = 0, workInProgressRootSkippedLanes = 0, workInProgressRootInterleavedUpdatedLanes = 0, workInProgressRootPingedLanes = 0, workInProgressDeferredLane = 0, workInProgressSuspendedRetryLanes = 0, workInProgressRootConcurrentErrors = null, workInProgressRootRecoverableErrors = null, workInProgressRootDidIncludeRecursiveRenderUpdate = false, globalMostRecentFallbackTime = 0, globalMostRecentTransitionTime = 0, workInProgressRootRenderTargetTime = Infinity, workInProgressTransitions = null, legacyErrorBoundariesThatAlreadyFailed = null, pendingEffectsStatus = 0, pendingEffectsRoot = null, pendingFinishedWork = null, pendingEffectsLanes = 0, pendingEffectsRemainingLanes = 0, pendingPassiveTransitions = null, pendingRecoverableErrors = null, nestedUpdateCount = 0, rootWithNestedUpdates = null;
  function requestUpdateLane() {
    return 0 !== (executionContext & 2) && 0 !== workInProgressRootRenderLanes ? workInProgressRootRenderLanes & -workInProgressRootRenderLanes : null !== ReactSharedInternals.T ? requestTransitionLane() : resolveUpdatePriority();
  }
  function requestDeferredLane() {
    if (0 === workInProgressDeferredLane)
      if (0 === (workInProgressRootRenderLanes & 536870912) || isHydrating) {
        var lane = nextTransitionDeferredLane;
        nextTransitionDeferredLane <<= 1;
        0 === (nextTransitionDeferredLane & 3932160) && (nextTransitionDeferredLane = 262144);
        workInProgressDeferredLane = lane;
      } else workInProgressDeferredLane = 536870912;
    lane = suspenseHandlerStackCursor.current;
    null !== lane && (lane.flags |= 32);
    return workInProgressDeferredLane;
  }
  function scheduleUpdateOnFiber(root2, fiber, lane) {
    if (root2 === workInProgressRoot && (2 === workInProgressSuspendedReason || 9 === workInProgressSuspendedReason) || null !== root2.cancelPendingCommit)
      prepareFreshStack(root2, 0), markRootSuspended(
        root2,
        workInProgressRootRenderLanes,
        workInProgressDeferredLane,
        false
      );
    markRootUpdated$1(root2, lane);
    if (0 === (executionContext & 2) || root2 !== workInProgressRoot)
      root2 === workInProgressRoot && (0 === (executionContext & 2) && (workInProgressRootInterleavedUpdatedLanes |= lane), 4 === workInProgressRootExitStatus && markRootSuspended(
        root2,
        workInProgressRootRenderLanes,
        workInProgressDeferredLane,
        false
      )), ensureRootIsScheduled(root2);
  }
  function performWorkOnRoot(root$jscomp$0, lanes, forceSync) {
    if (0 !== (executionContext & 6)) throw Error(formatProdErrorMessage(327));
    var shouldTimeSlice = !forceSync && 0 === (lanes & 127) && 0 === (lanes & root$jscomp$0.expiredLanes) || checkIfRootIsPrerendering(root$jscomp$0, lanes), exitStatus = shouldTimeSlice ? renderRootConcurrent(root$jscomp$0, lanes) : renderRootSync(root$jscomp$0, lanes, true), renderWasConcurrent = shouldTimeSlice;
    do {
      if (0 === exitStatus) {
        workInProgressRootIsPrerendering && !shouldTimeSlice && markRootSuspended(root$jscomp$0, lanes, 0, false);
        break;
      } else {
        forceSync = root$jscomp$0.current.alternate;
        if (renderWasConcurrent && !isRenderConsistentWithExternalStores(forceSync)) {
          exitStatus = renderRootSync(root$jscomp$0, lanes, false);
          renderWasConcurrent = false;
          continue;
        }
        if (2 === exitStatus) {
          renderWasConcurrent = lanes;
          if (root$jscomp$0.errorRecoveryDisabledLanes & renderWasConcurrent)
            var JSCompiler_inline_result = 0;
          else
            JSCompiler_inline_result = root$jscomp$0.pendingLanes & -536870913, JSCompiler_inline_result = 0 !== JSCompiler_inline_result ? JSCompiler_inline_result : JSCompiler_inline_result & 536870912 ? 536870912 : 0;
          if (0 !== JSCompiler_inline_result) {
            lanes = JSCompiler_inline_result;
            a: {
              var root2 = root$jscomp$0;
              exitStatus = workInProgressRootConcurrentErrors;
              var wasRootDehydrated = root2.current.memoizedState.isDehydrated;
              wasRootDehydrated && (prepareFreshStack(root2, JSCompiler_inline_result).flags |= 256);
              JSCompiler_inline_result = renderRootSync(
                root2,
                JSCompiler_inline_result,
                false
              );
              if (2 !== JSCompiler_inline_result) {
                if (workInProgressRootDidAttachPingListener && !wasRootDehydrated) {
                  root2.errorRecoveryDisabledLanes |= renderWasConcurrent;
                  workInProgressRootInterleavedUpdatedLanes |= renderWasConcurrent;
                  exitStatus = 4;
                  break a;
                }
                renderWasConcurrent = workInProgressRootRecoverableErrors;
                workInProgressRootRecoverableErrors = exitStatus;
                null !== renderWasConcurrent && (null === workInProgressRootRecoverableErrors ? workInProgressRootRecoverableErrors = renderWasConcurrent : workInProgressRootRecoverableErrors.push.apply(
                  workInProgressRootRecoverableErrors,
                  renderWasConcurrent
                ));
              }
              exitStatus = JSCompiler_inline_result;
            }
            renderWasConcurrent = false;
            if (2 !== exitStatus) continue;
          }
        }
        if (1 === exitStatus) {
          prepareFreshStack(root$jscomp$0, 0);
          markRootSuspended(root$jscomp$0, lanes, 0, true);
          break;
        }
        a: {
          shouldTimeSlice = root$jscomp$0;
          renderWasConcurrent = exitStatus;
          switch (renderWasConcurrent) {
            case 0:
            case 1:
              throw Error(formatProdErrorMessage(345));
            case 4:
              if ((lanes & 4194048) !== lanes) break;
            case 6:
              markRootSuspended(
                shouldTimeSlice,
                lanes,
                workInProgressDeferredLane,
                !workInProgressRootDidSkipSuspendedSiblings
              );
              break a;
            case 2:
              workInProgressRootRecoverableErrors = null;
              break;
            case 3:
            case 5:
              break;
            default:
              throw Error(formatProdErrorMessage(329));
          }
          if ((lanes & 62914560) === lanes && (exitStatus = globalMostRecentFallbackTime + 300 - now(), 10 < exitStatus)) {
            markRootSuspended(
              shouldTimeSlice,
              lanes,
              workInProgressDeferredLane,
              !workInProgressRootDidSkipSuspendedSiblings
            );
            if (0 !== getNextLanes(shouldTimeSlice, 0, true)) break a;
            pendingEffectsLanes = lanes;
            shouldTimeSlice.timeoutHandle = scheduleTimeout(
              commitRootWhenReady.bind(
                null,
                shouldTimeSlice,
                forceSync,
                workInProgressRootRecoverableErrors,
                workInProgressTransitions,
                workInProgressRootDidIncludeRecursiveRenderUpdate,
                lanes,
                workInProgressDeferredLane,
                workInProgressRootInterleavedUpdatedLanes,
                workInProgressSuspendedRetryLanes,
                workInProgressRootDidSkipSuspendedSiblings,
                renderWasConcurrent,
                "Throttled",
                -0,
                0
              ),
              exitStatus
            );
            break a;
          }
          commitRootWhenReady(
            shouldTimeSlice,
            forceSync,
            workInProgressRootRecoverableErrors,
            workInProgressTransitions,
            workInProgressRootDidIncludeRecursiveRenderUpdate,
            lanes,
            workInProgressDeferredLane,
            workInProgressRootInterleavedUpdatedLanes,
            workInProgressSuspendedRetryLanes,
            workInProgressRootDidSkipSuspendedSiblings,
            renderWasConcurrent,
            null,
            -0,
            0
          );
        }
      }
      break;
    } while (1);
    ensureRootIsScheduled(root$jscomp$0);
  }
  function commitRootWhenReady(root2, finishedWork, recoverableErrors, transitions2, didIncludeRenderPhaseUpdate, lanes, spawnedLane, updatedLanes, suspendedRetryLanes, didSkipSuspendedSiblings, exitStatus, suspendedCommitReason, completedRenderStartTime, completedRenderEndTime) {
    root2.timeoutHandle = -1;
    suspendedCommitReason = finishedWork.subtreeFlags;
    if (suspendedCommitReason & 8192 || 16785408 === (suspendedCommitReason & 16785408)) {
      suspendedCommitReason = {
        stylesheets: null,
        count: 0,
        imgCount: 0,
        imgBytes: 0,
        suspenseyImages: [],
        waitingForImages: true,
        waitingForViewTransition: false,
        unsuspend: noop$1
      };
      accumulateSuspenseyCommitOnFiber(
        finishedWork,
        lanes,
        suspendedCommitReason
      );
      var timeoutOffset = (lanes & 62914560) === lanes ? globalMostRecentFallbackTime - now() : (lanes & 4194048) === lanes ? globalMostRecentTransitionTime - now() : 0;
      timeoutOffset = waitForCommitToBeReady(
        suspendedCommitReason,
        timeoutOffset
      );
      if (null !== timeoutOffset) {
        pendingEffectsLanes = lanes;
        root2.cancelPendingCommit = timeoutOffset(
          commitRoot.bind(
            null,
            root2,
            finishedWork,
            lanes,
            recoverableErrors,
            transitions2,
            didIncludeRenderPhaseUpdate,
            spawnedLane,
            updatedLanes,
            suspendedRetryLanes,
            exitStatus,
            suspendedCommitReason,
            null,
            completedRenderStartTime,
            completedRenderEndTime
          )
        );
        markRootSuspended(root2, lanes, spawnedLane, !didSkipSuspendedSiblings);
        return;
      }
    }
    commitRoot(
      root2,
      finishedWork,
      lanes,
      recoverableErrors,
      transitions2,
      didIncludeRenderPhaseUpdate,
      spawnedLane,
      updatedLanes,
      suspendedRetryLanes
    );
  }
  function isRenderConsistentWithExternalStores(finishedWork) {
    for (var node = finishedWork; ; ) {
      var tag = node.tag;
      if ((0 === tag || 11 === tag || 15 === tag) && node.flags & 16384 && (tag = node.updateQueue, null !== tag && (tag = tag.stores, null !== tag)))
        for (var i = 0; i < tag.length; i++) {
          var check = tag[i], getSnapshot = check.getSnapshot;
          check = check.value;
          try {
            if (!objectIs(getSnapshot(), check)) return false;
          } catch (error) {
            return false;
          }
        }
      tag = node.child;
      if (node.subtreeFlags & 16384 && null !== tag)
        tag.return = node, node = tag;
      else {
        if (node === finishedWork) break;
        for (; null === node.sibling; ) {
          if (null === node.return || node.return === finishedWork) return true;
          node = node.return;
        }
        node.sibling.return = node.return;
        node = node.sibling;
      }
    }
    return true;
  }
  function markRootSuspended(root2, suspendedLanes, spawnedLane, didAttemptEntireTree) {
    suspendedLanes &= ~workInProgressRootPingedLanes;
    suspendedLanes &= ~workInProgressRootInterleavedUpdatedLanes;
    root2.suspendedLanes |= suspendedLanes;
    root2.pingedLanes &= ~suspendedLanes;
    didAttemptEntireTree && (root2.warmLanes |= suspendedLanes);
    didAttemptEntireTree = root2.expirationTimes;
    for (var lanes = suspendedLanes; 0 < lanes; ) {
      var index$6 = 31 - clz32(lanes), lane = 1 << index$6;
      didAttemptEntireTree[index$6] = -1;
      lanes &= ~lane;
    }
    0 !== spawnedLane && markSpawnedDeferredLane(root2, spawnedLane, suspendedLanes);
  }
  function flushSyncWork$1() {
    return 0 === (executionContext & 6) ? (flushSyncWorkAcrossRoots_impl(0), false) : true;
  }
  function resetWorkInProgressStack() {
    if (null !== workInProgress) {
      if (0 === workInProgressSuspendedReason)
        var interruptedWork = workInProgress.return;
      else
        interruptedWork = workInProgress, lastContextDependency = currentlyRenderingFiber$1 = null, resetHooksOnUnwind(interruptedWork), thenableState$1 = null, thenableIndexCounter$1 = 0, interruptedWork = workInProgress;
      for (; null !== interruptedWork; )
        unwindInterruptedWork(interruptedWork.alternate, interruptedWork), interruptedWork = interruptedWork.return;
      workInProgress = null;
    }
  }
  function prepareFreshStack(root2, lanes) {
    var timeoutHandle = root2.timeoutHandle;
    -1 !== timeoutHandle && (root2.timeoutHandle = -1, cancelTimeout(timeoutHandle));
    timeoutHandle = root2.cancelPendingCommit;
    null !== timeoutHandle && (root2.cancelPendingCommit = null, timeoutHandle());
    pendingEffectsLanes = 0;
    resetWorkInProgressStack();
    workInProgressRoot = root2;
    workInProgress = timeoutHandle = createWorkInProgress(root2.current, null);
    workInProgressRootRenderLanes = lanes;
    workInProgressSuspendedReason = 0;
    workInProgressThrownValue = null;
    workInProgressRootDidSkipSuspendedSiblings = false;
    workInProgressRootIsPrerendering = checkIfRootIsPrerendering(root2, lanes);
    workInProgressRootDidAttachPingListener = false;
    workInProgressSuspendedRetryLanes = workInProgressDeferredLane = workInProgressRootPingedLanes = workInProgressRootInterleavedUpdatedLanes = workInProgressRootSkippedLanes = workInProgressRootExitStatus = 0;
    workInProgressRootRecoverableErrors = workInProgressRootConcurrentErrors = null;
    workInProgressRootDidIncludeRecursiveRenderUpdate = false;
    0 !== (lanes & 8) && (lanes |= lanes & 32);
    var allEntangledLanes = root2.entangledLanes;
    if (0 !== allEntangledLanes)
      for (root2 = root2.entanglements, allEntangledLanes &= lanes; 0 < allEntangledLanes; ) {
        var index$4 = 31 - clz32(allEntangledLanes), lane = 1 << index$4;
        lanes |= root2[index$4];
        allEntangledLanes &= ~lane;
      }
    entangledRenderLanes = lanes;
    finishQueueingConcurrentUpdates();
    return timeoutHandle;
  }
  function handleThrow(root2, thrownValue) {
    currentlyRenderingFiber = null;
    ReactSharedInternals.H = ContextOnlyDispatcher;
    thrownValue === SuspenseException || thrownValue === SuspenseActionException ? (thrownValue = getSuspendedThenable(), workInProgressSuspendedReason = 3) : thrownValue === SuspenseyCommitException ? (thrownValue = getSuspendedThenable(), workInProgressSuspendedReason = 4) : workInProgressSuspendedReason = thrownValue === SelectiveHydrationException ? 8 : null !== thrownValue && "object" === typeof thrownValue && "function" === typeof thrownValue.then ? 6 : 1;
    workInProgressThrownValue = thrownValue;
    null === workInProgress && (workInProgressRootExitStatus = 1, logUncaughtError(
      root2,
      createCapturedValueAtFiber(thrownValue, root2.current)
    ));
  }
  function shouldRemainOnPreviousScreen() {
    var handler = suspenseHandlerStackCursor.current;
    return null === handler ? true : (workInProgressRootRenderLanes & 4194048) === workInProgressRootRenderLanes ? null === shellBoundary ? true : false : (workInProgressRootRenderLanes & 62914560) === workInProgressRootRenderLanes || 0 !== (workInProgressRootRenderLanes & 536870912) ? handler === shellBoundary : false;
  }
  function pushDispatcher() {
    var prevDispatcher = ReactSharedInternals.H;
    ReactSharedInternals.H = ContextOnlyDispatcher;
    return null === prevDispatcher ? ContextOnlyDispatcher : prevDispatcher;
  }
  function pushAsyncDispatcher() {
    var prevAsyncDispatcher = ReactSharedInternals.A;
    ReactSharedInternals.A = DefaultAsyncDispatcher;
    return prevAsyncDispatcher;
  }
  function renderDidSuspendDelayIfPossible() {
    workInProgressRootExitStatus = 4;
    workInProgressRootDidSkipSuspendedSiblings || (workInProgressRootRenderLanes & 4194048) !== workInProgressRootRenderLanes && null !== suspenseHandlerStackCursor.current || (workInProgressRootIsPrerendering = true);
    0 === (workInProgressRootSkippedLanes & 134217727) && 0 === (workInProgressRootInterleavedUpdatedLanes & 134217727) || null === workInProgressRoot || markRootSuspended(
      workInProgressRoot,
      workInProgressRootRenderLanes,
      workInProgressDeferredLane,
      false
    );
  }
  function renderRootSync(root2, lanes, shouldYieldForPrerendering) {
    var prevExecutionContext = executionContext;
    executionContext |= 2;
    var prevDispatcher = pushDispatcher(), prevAsyncDispatcher = pushAsyncDispatcher();
    if (workInProgressRoot !== root2 || workInProgressRootRenderLanes !== lanes)
      workInProgressTransitions = null, prepareFreshStack(root2, lanes);
    lanes = false;
    var exitStatus = workInProgressRootExitStatus;
    a: do
      try {
        if (0 !== workInProgressSuspendedReason && null !== workInProgress) {
          var unitOfWork = workInProgress, thrownValue = workInProgressThrownValue;
          switch (workInProgressSuspendedReason) {
            case 8:
              resetWorkInProgressStack();
              exitStatus = 6;
              break a;
            case 3:
            case 2:
            case 9:
            case 6:
              null === suspenseHandlerStackCursor.current && (lanes = true);
              var reason = workInProgressSuspendedReason;
              workInProgressSuspendedReason = 0;
              workInProgressThrownValue = null;
              throwAndUnwindWorkLoop(root2, unitOfWork, thrownValue, reason);
              if (shouldYieldForPrerendering && workInProgressRootIsPrerendering) {
                exitStatus = 0;
                break a;
              }
              break;
            default:
              reason = workInProgressSuspendedReason, workInProgressSuspendedReason = 0, workInProgressThrownValue = null, throwAndUnwindWorkLoop(root2, unitOfWork, thrownValue, reason);
          }
        }
        workLoopSync();
        exitStatus = workInProgressRootExitStatus;
        break;
      } catch (thrownValue$165) {
        handleThrow(root2, thrownValue$165);
      }
    while (1);
    lanes && root2.shellSuspendCounter++;
    lastContextDependency = currentlyRenderingFiber$1 = null;
    executionContext = prevExecutionContext;
    ReactSharedInternals.H = prevDispatcher;
    ReactSharedInternals.A = prevAsyncDispatcher;
    null === workInProgress && (workInProgressRoot = null, workInProgressRootRenderLanes = 0, finishQueueingConcurrentUpdates());
    return exitStatus;
  }
  function workLoopSync() {
    for (; null !== workInProgress; ) performUnitOfWork(workInProgress);
  }
  function renderRootConcurrent(root2, lanes) {
    var prevExecutionContext = executionContext;
    executionContext |= 2;
    var prevDispatcher = pushDispatcher(), prevAsyncDispatcher = pushAsyncDispatcher();
    workInProgressRoot !== root2 || workInProgressRootRenderLanes !== lanes ? (workInProgressTransitions = null, workInProgressRootRenderTargetTime = now() + 500, prepareFreshStack(root2, lanes)) : workInProgressRootIsPrerendering = checkIfRootIsPrerendering(
      root2,
      lanes
    );
    a: do
      try {
        if (0 !== workInProgressSuspendedReason && null !== workInProgress) {
          lanes = workInProgress;
          var thrownValue = workInProgressThrownValue;
          b: switch (workInProgressSuspendedReason) {
            case 1:
              workInProgressSuspendedReason = 0;
              workInProgressThrownValue = null;
              throwAndUnwindWorkLoop(root2, lanes, thrownValue, 1);
              break;
            case 2:
            case 9:
              if (isThenableResolved(thrownValue)) {
                workInProgressSuspendedReason = 0;
                workInProgressThrownValue = null;
                replaySuspendedUnitOfWork(lanes);
                break;
              }
              lanes = function() {
                2 !== workInProgressSuspendedReason && 9 !== workInProgressSuspendedReason || workInProgressRoot !== root2 || (workInProgressSuspendedReason = 7);
                ensureRootIsScheduled(root2);
              };
              thrownValue.then(lanes, lanes);
              break a;
            case 3:
              workInProgressSuspendedReason = 7;
              break a;
            case 4:
              workInProgressSuspendedReason = 5;
              break a;
            case 7:
              isThenableResolved(thrownValue) ? (workInProgressSuspendedReason = 0, workInProgressThrownValue = null, replaySuspendedUnitOfWork(lanes)) : (workInProgressSuspendedReason = 0, workInProgressThrownValue = null, throwAndUnwindWorkLoop(root2, lanes, thrownValue, 7));
              break;
            case 5:
              var resource = null;
              switch (workInProgress.tag) {
                case 26:
                  resource = workInProgress.memoizedState;
                case 5:
                case 27:
                  var hostFiber = workInProgress;
                  if (resource ? preloadResource(resource) : hostFiber.stateNode.complete) {
                    workInProgressSuspendedReason = 0;
                    workInProgressThrownValue = null;
                    var sibling = hostFiber.sibling;
                    if (null !== sibling) workInProgress = sibling;
                    else {
                      var returnFiber = hostFiber.return;
                      null !== returnFiber ? (workInProgress = returnFiber, completeUnitOfWork(returnFiber)) : workInProgress = null;
                    }
                    break b;
                  }
              }
              workInProgressSuspendedReason = 0;
              workInProgressThrownValue = null;
              throwAndUnwindWorkLoop(root2, lanes, thrownValue, 5);
              break;
            case 6:
              workInProgressSuspendedReason = 0;
              workInProgressThrownValue = null;
              throwAndUnwindWorkLoop(root2, lanes, thrownValue, 6);
              break;
            case 8:
              resetWorkInProgressStack();
              workInProgressRootExitStatus = 6;
              break a;
            default:
              throw Error(formatProdErrorMessage(462));
          }
        }
        workLoopConcurrentByScheduler();
        break;
      } catch (thrownValue$167) {
        handleThrow(root2, thrownValue$167);
      }
    while (1);
    lastContextDependency = currentlyRenderingFiber$1 = null;
    ReactSharedInternals.H = prevDispatcher;
    ReactSharedInternals.A = prevAsyncDispatcher;
    executionContext = prevExecutionContext;
    if (null !== workInProgress) return 0;
    workInProgressRoot = null;
    workInProgressRootRenderLanes = 0;
    finishQueueingConcurrentUpdates();
    return workInProgressRootExitStatus;
  }
  function workLoopConcurrentByScheduler() {
    for (; null !== workInProgress && !shouldYield(); )
      performUnitOfWork(workInProgress);
  }
  function performUnitOfWork(unitOfWork) {
    var next = beginWork(unitOfWork.alternate, unitOfWork, entangledRenderLanes);
    unitOfWork.memoizedProps = unitOfWork.pendingProps;
    null === next ? completeUnitOfWork(unitOfWork) : workInProgress = next;
  }
  function replaySuspendedUnitOfWork(unitOfWork) {
    var next = unitOfWork;
    var current = next.alternate;
    switch (next.tag) {
      case 15:
      case 0:
        next = replayFunctionComponent(
          current,
          next,
          next.pendingProps,
          next.type,
          void 0,
          workInProgressRootRenderLanes
        );
        break;
      case 11:
        next = replayFunctionComponent(
          current,
          next,
          next.pendingProps,
          next.type.render,
          next.ref,
          workInProgressRootRenderLanes
        );
        break;
      case 5:
        resetHooksOnUnwind(next);
      default:
        unwindInterruptedWork(current, next), next = workInProgress = resetWorkInProgress(next, entangledRenderLanes), next = beginWork(current, next, entangledRenderLanes);
    }
    unitOfWork.memoizedProps = unitOfWork.pendingProps;
    null === next ? completeUnitOfWork(unitOfWork) : workInProgress = next;
  }
  function throwAndUnwindWorkLoop(root2, unitOfWork, thrownValue, suspendedReason) {
    lastContextDependency = currentlyRenderingFiber$1 = null;
    resetHooksOnUnwind(unitOfWork);
    thenableState$1 = null;
    thenableIndexCounter$1 = 0;
    var returnFiber = unitOfWork.return;
    try {
      if (throwException(
        root2,
        returnFiber,
        unitOfWork,
        thrownValue,
        workInProgressRootRenderLanes
      )) {
        workInProgressRootExitStatus = 1;
        logUncaughtError(
          root2,
          createCapturedValueAtFiber(thrownValue, root2.current)
        );
        workInProgress = null;
        return;
      }
    } catch (error) {
      if (null !== returnFiber) throw workInProgress = returnFiber, error;
      workInProgressRootExitStatus = 1;
      logUncaughtError(
        root2,
        createCapturedValueAtFiber(thrownValue, root2.current)
      );
      workInProgress = null;
      return;
    }
    if (unitOfWork.flags & 32768) {
      if (isHydrating || 1 === suspendedReason) root2 = true;
      else if (workInProgressRootIsPrerendering || 0 !== (workInProgressRootRenderLanes & 536870912))
        root2 = false;
      else if (workInProgressRootDidSkipSuspendedSiblings = root2 = true, 2 === suspendedReason || 9 === suspendedReason || 3 === suspendedReason || 6 === suspendedReason)
        suspendedReason = suspenseHandlerStackCursor.current, null !== suspendedReason && 13 === suspendedReason.tag && (suspendedReason.flags |= 16384);
      unwindUnitOfWork(unitOfWork, root2);
    } else completeUnitOfWork(unitOfWork);
  }
  function completeUnitOfWork(unitOfWork) {
    var completedWork = unitOfWork;
    do {
      if (0 !== (completedWork.flags & 32768)) {
        unwindUnitOfWork(
          completedWork,
          workInProgressRootDidSkipSuspendedSiblings
        );
        return;
      }
      unitOfWork = completedWork.return;
      var next = completeWork(
        completedWork.alternate,
        completedWork,
        entangledRenderLanes
      );
      if (null !== next) {
        workInProgress = next;
        return;
      }
      completedWork = completedWork.sibling;
      if (null !== completedWork) {
        workInProgress = completedWork;
        return;
      }
      workInProgress = completedWork = unitOfWork;
    } while (null !== completedWork);
    0 === workInProgressRootExitStatus && (workInProgressRootExitStatus = 5);
  }
  function unwindUnitOfWork(unitOfWork, skipSiblings) {
    do {
      var next = unwindWork(unitOfWork.alternate, unitOfWork);
      if (null !== next) {
        next.flags &= 32767;
        workInProgress = next;
        return;
      }
      next = unitOfWork.return;
      null !== next && (next.flags |= 32768, next.subtreeFlags = 0, next.deletions = null);
      if (!skipSiblings && (unitOfWork = unitOfWork.sibling, null !== unitOfWork)) {
        workInProgress = unitOfWork;
        return;
      }
      workInProgress = unitOfWork = next;
    } while (null !== unitOfWork);
    workInProgressRootExitStatus = 6;
    workInProgress = null;
  }
  function commitRoot(root2, finishedWork, lanes, recoverableErrors, transitions2, didIncludeRenderPhaseUpdate, spawnedLane, updatedLanes, suspendedRetryLanes) {
    root2.cancelPendingCommit = null;
    do
      flushPendingEffects();
    while (0 !== pendingEffectsStatus);
    if (0 !== (executionContext & 6)) throw Error(formatProdErrorMessage(327));
    if (null !== finishedWork) {
      if (finishedWork === root2.current) throw Error(formatProdErrorMessage(177));
      didIncludeRenderPhaseUpdate = finishedWork.lanes | finishedWork.childLanes;
      didIncludeRenderPhaseUpdate |= concurrentlyUpdatedLanes;
      markRootFinished(
        root2,
        lanes,
        didIncludeRenderPhaseUpdate,
        spawnedLane,
        updatedLanes,
        suspendedRetryLanes
      );
      root2 === workInProgressRoot && (workInProgress = workInProgressRoot = null, workInProgressRootRenderLanes = 0);
      pendingFinishedWork = finishedWork;
      pendingEffectsRoot = root2;
      pendingEffectsLanes = lanes;
      pendingEffectsRemainingLanes = didIncludeRenderPhaseUpdate;
      pendingPassiveTransitions = transitions2;
      pendingRecoverableErrors = recoverableErrors;
      0 !== (finishedWork.subtreeFlags & 10256) || 0 !== (finishedWork.flags & 10256) ? (root2.callbackNode = null, root2.callbackPriority = 0, scheduleCallback$1(NormalPriority$1, function() {
        flushPassiveEffects();
        return null;
      })) : (root2.callbackNode = null, root2.callbackPriority = 0);
      recoverableErrors = 0 !== (finishedWork.flags & 13878);
      if (0 !== (finishedWork.subtreeFlags & 13878) || recoverableErrors) {
        recoverableErrors = ReactSharedInternals.T;
        ReactSharedInternals.T = null;
        transitions2 = ReactDOMSharedInternals.p;
        ReactDOMSharedInternals.p = 2;
        spawnedLane = executionContext;
        executionContext |= 4;
        try {
          commitBeforeMutationEffects(root2, finishedWork, lanes);
        } finally {
          executionContext = spawnedLane, ReactDOMSharedInternals.p = transitions2, ReactSharedInternals.T = recoverableErrors;
        }
      }
      pendingEffectsStatus = 1;
      flushMutationEffects();
      flushLayoutEffects();
      flushSpawnedWork();
    }
  }
  function flushMutationEffects() {
    if (1 === pendingEffectsStatus) {
      pendingEffectsStatus = 0;
      var root2 = pendingEffectsRoot, finishedWork = pendingFinishedWork, rootMutationHasEffect = 0 !== (finishedWork.flags & 13878);
      if (0 !== (finishedWork.subtreeFlags & 13878) || rootMutationHasEffect) {
        rootMutationHasEffect = ReactSharedInternals.T;
        ReactSharedInternals.T = null;
        var previousPriority = ReactDOMSharedInternals.p;
        ReactDOMSharedInternals.p = 2;
        var prevExecutionContext = executionContext;
        executionContext |= 4;
        try {
          commitMutationEffectsOnFiber(finishedWork, root2);
          var priorSelectionInformation = selectionInformation, curFocusedElem = getActiveElementDeep(root2.containerInfo), priorFocusedElem = priorSelectionInformation.focusedElem, priorSelectionRange = priorSelectionInformation.selectionRange;
          if (curFocusedElem !== priorFocusedElem && priorFocusedElem && priorFocusedElem.ownerDocument && containsNode(
            priorFocusedElem.ownerDocument.documentElement,
            priorFocusedElem
          )) {
            if (null !== priorSelectionRange && hasSelectionCapabilities(priorFocusedElem)) {
              var start = priorSelectionRange.start, end = priorSelectionRange.end;
              void 0 === end && (end = start);
              if ("selectionStart" in priorFocusedElem)
                priorFocusedElem.selectionStart = start, priorFocusedElem.selectionEnd = Math.min(
                  end,
                  priorFocusedElem.value.length
                );
              else {
                var doc = priorFocusedElem.ownerDocument || document, win = doc && doc.defaultView || window;
                if (win.getSelection) {
                  var selection = win.getSelection(), length = priorFocusedElem.textContent.length, start$jscomp$0 = Math.min(priorSelectionRange.start, length), end$jscomp$0 = void 0 === priorSelectionRange.end ? start$jscomp$0 : Math.min(priorSelectionRange.end, length);
                  !selection.extend && start$jscomp$0 > end$jscomp$0 && (curFocusedElem = end$jscomp$0, end$jscomp$0 = start$jscomp$0, start$jscomp$0 = curFocusedElem);
                  var startMarker = getNodeForCharacterOffset(
                    priorFocusedElem,
                    start$jscomp$0
                  ), endMarker = getNodeForCharacterOffset(
                    priorFocusedElem,
                    end$jscomp$0
                  );
                  if (startMarker && endMarker && (1 !== selection.rangeCount || selection.anchorNode !== startMarker.node || selection.anchorOffset !== startMarker.offset || selection.focusNode !== endMarker.node || selection.focusOffset !== endMarker.offset)) {
                    var range = doc.createRange();
                    range.setStart(startMarker.node, startMarker.offset);
                    selection.removeAllRanges();
                    start$jscomp$0 > end$jscomp$0 ? (selection.addRange(range), selection.extend(endMarker.node, endMarker.offset)) : (range.setEnd(endMarker.node, endMarker.offset), selection.addRange(range));
                  }
                }
              }
            }
            doc = [];
            for (selection = priorFocusedElem; selection = selection.parentNode; )
              1 === selection.nodeType && doc.push({
                element: selection,
                left: selection.scrollLeft,
                top: selection.scrollTop
              });
            "function" === typeof priorFocusedElem.focus && priorFocusedElem.focus();
            for (priorFocusedElem = 0; priorFocusedElem < doc.length; priorFocusedElem++) {
              var info = doc[priorFocusedElem];
              info.element.scrollLeft = info.left;
              info.element.scrollTop = info.top;
            }
          }
          _enabled = !!eventsEnabled;
          selectionInformation = eventsEnabled = null;
        } finally {
          executionContext = prevExecutionContext, ReactDOMSharedInternals.p = previousPriority, ReactSharedInternals.T = rootMutationHasEffect;
        }
      }
      root2.current = finishedWork;
      pendingEffectsStatus = 2;
    }
  }
  function flushLayoutEffects() {
    if (2 === pendingEffectsStatus) {
      pendingEffectsStatus = 0;
      var root2 = pendingEffectsRoot, finishedWork = pendingFinishedWork, rootHasLayoutEffect = 0 !== (finishedWork.flags & 8772);
      if (0 !== (finishedWork.subtreeFlags & 8772) || rootHasLayoutEffect) {
        rootHasLayoutEffect = ReactSharedInternals.T;
        ReactSharedInternals.T = null;
        var previousPriority = ReactDOMSharedInternals.p;
        ReactDOMSharedInternals.p = 2;
        var prevExecutionContext = executionContext;
        executionContext |= 4;
        try {
          commitLayoutEffectOnFiber(root2, finishedWork.alternate, finishedWork);
        } finally {
          executionContext = prevExecutionContext, ReactDOMSharedInternals.p = previousPriority, ReactSharedInternals.T = rootHasLayoutEffect;
        }
      }
      pendingEffectsStatus = 3;
    }
  }
  function flushSpawnedWork() {
    if (4 === pendingEffectsStatus || 3 === pendingEffectsStatus) {
      pendingEffectsStatus = 0;
      requestPaint();
      var root2 = pendingEffectsRoot, finishedWork = pendingFinishedWork, lanes = pendingEffectsLanes, recoverableErrors = pendingRecoverableErrors;
      0 !== (finishedWork.subtreeFlags & 10256) || 0 !== (finishedWork.flags & 10256) ? pendingEffectsStatus = 5 : (pendingEffectsStatus = 0, pendingFinishedWork = pendingEffectsRoot = null, releaseRootPooledCache(root2, root2.pendingLanes));
      var remainingLanes = root2.pendingLanes;
      0 === remainingLanes && (legacyErrorBoundariesThatAlreadyFailed = null);
      lanesToEventPriority(lanes);
      finishedWork = finishedWork.stateNode;
      if (injectedHook && "function" === typeof injectedHook.onCommitFiberRoot)
        try {
          injectedHook.onCommitFiberRoot(
            rendererID,
            finishedWork,
            void 0,
            128 === (finishedWork.current.flags & 128)
          );
        } catch (err) {
        }
      if (null !== recoverableErrors) {
        finishedWork = ReactSharedInternals.T;
        remainingLanes = ReactDOMSharedInternals.p;
        ReactDOMSharedInternals.p = 2;
        ReactSharedInternals.T = null;
        try {
          for (var onRecoverableError = root2.onRecoverableError, i = 0; i < recoverableErrors.length; i++) {
            var recoverableError = recoverableErrors[i];
            onRecoverableError(recoverableError.value, {
              componentStack: recoverableError.stack
            });
          }
        } finally {
          ReactSharedInternals.T = finishedWork, ReactDOMSharedInternals.p = remainingLanes;
        }
      }
      0 !== (pendingEffectsLanes & 3) && flushPendingEffects();
      ensureRootIsScheduled(root2);
      remainingLanes = root2.pendingLanes;
      0 !== (lanes & 261930) && 0 !== (remainingLanes & 42) ? root2 === rootWithNestedUpdates ? nestedUpdateCount++ : (nestedUpdateCount = 0, rootWithNestedUpdates = root2) : nestedUpdateCount = 0;
      flushSyncWorkAcrossRoots_impl(0);
    }
  }
  function releaseRootPooledCache(root2, remainingLanes) {
    0 === (root2.pooledCacheLanes &= remainingLanes) && (remainingLanes = root2.pooledCache, null != remainingLanes && (root2.pooledCache = null, releaseCache(remainingLanes)));
  }
  function flushPendingEffects() {
    flushMutationEffects();
    flushLayoutEffects();
    flushSpawnedWork();
    return flushPassiveEffects();
  }
  function flushPassiveEffects() {
    if (5 !== pendingEffectsStatus) return false;
    var root2 = pendingEffectsRoot, remainingLanes = pendingEffectsRemainingLanes;
    pendingEffectsRemainingLanes = 0;
    var renderPriority = lanesToEventPriority(pendingEffectsLanes), prevTransition = ReactSharedInternals.T, previousPriority = ReactDOMSharedInternals.p;
    try {
      ReactDOMSharedInternals.p = 32 > renderPriority ? 32 : renderPriority;
      ReactSharedInternals.T = null;
      renderPriority = pendingPassiveTransitions;
      pendingPassiveTransitions = null;
      var root$jscomp$0 = pendingEffectsRoot, lanes = pendingEffectsLanes;
      pendingEffectsStatus = 0;
      pendingFinishedWork = pendingEffectsRoot = null;
      pendingEffectsLanes = 0;
      if (0 !== (executionContext & 6)) throw Error(formatProdErrorMessage(331));
      var prevExecutionContext = executionContext;
      executionContext |= 4;
      commitPassiveUnmountOnFiber(root$jscomp$0.current);
      commitPassiveMountOnFiber(
        root$jscomp$0,
        root$jscomp$0.current,
        lanes,
        renderPriority
      );
      executionContext = prevExecutionContext;
      flushSyncWorkAcrossRoots_impl(0, false);
      if (injectedHook && "function" === typeof injectedHook.onPostCommitFiberRoot)
        try {
          injectedHook.onPostCommitFiberRoot(rendererID, root$jscomp$0);
        } catch (err) {
        }
      return true;
    } finally {
      ReactDOMSharedInternals.p = previousPriority, ReactSharedInternals.T = prevTransition, releaseRootPooledCache(root2, remainingLanes);
    }
  }
  function captureCommitPhaseErrorOnRoot(rootFiber, sourceFiber, error) {
    sourceFiber = createCapturedValueAtFiber(error, sourceFiber);
    sourceFiber = createRootErrorUpdate(rootFiber.stateNode, sourceFiber, 2);
    rootFiber = enqueueUpdate(rootFiber, sourceFiber, 2);
    null !== rootFiber && (markRootUpdated$1(rootFiber, 2), ensureRootIsScheduled(rootFiber));
  }
  function captureCommitPhaseError(sourceFiber, nearestMountedAncestor, error) {
    if (3 === sourceFiber.tag)
      captureCommitPhaseErrorOnRoot(sourceFiber, sourceFiber, error);
    else
      for (; null !== nearestMountedAncestor; ) {
        if (3 === nearestMountedAncestor.tag) {
          captureCommitPhaseErrorOnRoot(
            nearestMountedAncestor,
            sourceFiber,
            error
          );
          break;
        } else if (1 === nearestMountedAncestor.tag) {
          var instance = nearestMountedAncestor.stateNode;
          if ("function" === typeof nearestMountedAncestor.type.getDerivedStateFromError || "function" === typeof instance.componentDidCatch && (null === legacyErrorBoundariesThatAlreadyFailed || !legacyErrorBoundariesThatAlreadyFailed.has(instance))) {
            sourceFiber = createCapturedValueAtFiber(error, sourceFiber);
            error = createClassErrorUpdate(2);
            instance = enqueueUpdate(nearestMountedAncestor, error, 2);
            null !== instance && (initializeClassErrorUpdate(
              error,
              instance,
              nearestMountedAncestor,
              sourceFiber
            ), markRootUpdated$1(instance, 2), ensureRootIsScheduled(instance));
            break;
          }
        }
        nearestMountedAncestor = nearestMountedAncestor.return;
      }
  }
  function attachPingListener(root2, wakeable, lanes) {
    var pingCache = root2.pingCache;
    if (null === pingCache) {
      pingCache = root2.pingCache = new PossiblyWeakMap();
      var threadIDs = /* @__PURE__ */ new Set();
      pingCache.set(wakeable, threadIDs);
    } else
      threadIDs = pingCache.get(wakeable), void 0 === threadIDs && (threadIDs = /* @__PURE__ */ new Set(), pingCache.set(wakeable, threadIDs));
    threadIDs.has(lanes) || (workInProgressRootDidAttachPingListener = true, threadIDs.add(lanes), root2 = pingSuspendedRoot.bind(null, root2, wakeable, lanes), wakeable.then(root2, root2));
  }
  function pingSuspendedRoot(root2, wakeable, pingedLanes) {
    var pingCache = root2.pingCache;
    null !== pingCache && pingCache.delete(wakeable);
    root2.pingedLanes |= root2.suspendedLanes & pingedLanes;
    root2.warmLanes &= ~pingedLanes;
    workInProgressRoot === root2 && (workInProgressRootRenderLanes & pingedLanes) === pingedLanes && (4 === workInProgressRootExitStatus || 3 === workInProgressRootExitStatus && (workInProgressRootRenderLanes & 62914560) === workInProgressRootRenderLanes && 300 > now() - globalMostRecentFallbackTime ? 0 === (executionContext & 2) && prepareFreshStack(root2, 0) : workInProgressRootPingedLanes |= pingedLanes, workInProgressSuspendedRetryLanes === workInProgressRootRenderLanes && (workInProgressSuspendedRetryLanes = 0));
    ensureRootIsScheduled(root2);
  }
  function retryTimedOutBoundary(boundaryFiber, retryLane) {
    0 === retryLane && (retryLane = claimNextRetryLane());
    boundaryFiber = enqueueConcurrentRenderForLane(boundaryFiber, retryLane);
    null !== boundaryFiber && (markRootUpdated$1(boundaryFiber, retryLane), ensureRootIsScheduled(boundaryFiber));
  }
  function retryDehydratedSuspenseBoundary(boundaryFiber) {
    var suspenseState = boundaryFiber.memoizedState, retryLane = 0;
    null !== suspenseState && (retryLane = suspenseState.retryLane);
    retryTimedOutBoundary(boundaryFiber, retryLane);
  }
  function resolveRetryWakeable(boundaryFiber, wakeable) {
    var retryLane = 0;
    switch (boundaryFiber.tag) {
      case 31:
      case 13:
        var retryCache = boundaryFiber.stateNode;
        var suspenseState = boundaryFiber.memoizedState;
        null !== suspenseState && (retryLane = suspenseState.retryLane);
        break;
      case 19:
        retryCache = boundaryFiber.stateNode;
        break;
      case 22:
        retryCache = boundaryFiber.stateNode._retryCache;
        break;
      default:
        throw Error(formatProdErrorMessage(314));
    }
    null !== retryCache && retryCache.delete(wakeable);
    retryTimedOutBoundary(boundaryFiber, retryLane);
  }
  function scheduleCallback$1(priorityLevel, callback) {
    return scheduleCallback$3(priorityLevel, callback);
  }
  var firstScheduledRoot = null, lastScheduledRoot = null, didScheduleMicrotask = false, mightHavePendingSyncWork = false, isFlushingWork = false, currentEventTransitionLane = 0;
  function ensureRootIsScheduled(root2) {
    root2 !== lastScheduledRoot && null === root2.next && (null === lastScheduledRoot ? firstScheduledRoot = lastScheduledRoot = root2 : lastScheduledRoot = lastScheduledRoot.next = root2);
    mightHavePendingSyncWork = true;
    didScheduleMicrotask || (didScheduleMicrotask = true, scheduleImmediateRootScheduleTask());
  }
  function flushSyncWorkAcrossRoots_impl(syncTransitionLanes, onlyLegacy) {
    if (!isFlushingWork && mightHavePendingSyncWork) {
      isFlushingWork = true;
      do {
        var didPerformSomeWork = false;
        for (var root$170 = firstScheduledRoot; null !== root$170; ) {
          if (0 !== syncTransitionLanes) {
            var pendingLanes = root$170.pendingLanes;
            if (0 === pendingLanes) var JSCompiler_inline_result = 0;
            else {
              var suspendedLanes = root$170.suspendedLanes, pingedLanes = root$170.pingedLanes;
              JSCompiler_inline_result = (1 << 31 - clz32(42 | syncTransitionLanes) + 1) - 1;
              JSCompiler_inline_result &= pendingLanes & ~(suspendedLanes & ~pingedLanes);
              JSCompiler_inline_result = JSCompiler_inline_result & 201326741 ? JSCompiler_inline_result & 201326741 | 1 : JSCompiler_inline_result ? JSCompiler_inline_result | 2 : 0;
            }
            0 !== JSCompiler_inline_result && (didPerformSomeWork = true, performSyncWorkOnRoot(root$170, JSCompiler_inline_result));
          } else
            JSCompiler_inline_result = workInProgressRootRenderLanes, JSCompiler_inline_result = getNextLanes(
              root$170,
              root$170 === workInProgressRoot ? JSCompiler_inline_result : 0,
              null !== root$170.cancelPendingCommit || -1 !== root$170.timeoutHandle
            ), 0 === (JSCompiler_inline_result & 3) || checkIfRootIsPrerendering(root$170, JSCompiler_inline_result) || (didPerformSomeWork = true, performSyncWorkOnRoot(root$170, JSCompiler_inline_result));
          root$170 = root$170.next;
        }
      } while (didPerformSomeWork);
      isFlushingWork = false;
    }
  }
  function processRootScheduleInImmediateTask() {
    processRootScheduleInMicrotask();
  }
  function processRootScheduleInMicrotask() {
    mightHavePendingSyncWork = didScheduleMicrotask = false;
    var syncTransitionLanes = 0;
    0 !== currentEventTransitionLane && shouldAttemptEagerTransition() && (syncTransitionLanes = currentEventTransitionLane);
    for (var currentTime2 = now(), prev = null, root2 = firstScheduledRoot; null !== root2; ) {
      var next = root2.next, nextLanes = scheduleTaskForRootDuringMicrotask(root2, currentTime2);
      if (0 === nextLanes)
        root2.next = null, null === prev ? firstScheduledRoot = next : prev.next = next, null === next && (lastScheduledRoot = prev);
      else if (prev = root2, 0 !== syncTransitionLanes || 0 !== (nextLanes & 3))
        mightHavePendingSyncWork = true;
      root2 = next;
    }
    0 !== pendingEffectsStatus && 5 !== pendingEffectsStatus || flushSyncWorkAcrossRoots_impl(syncTransitionLanes);
    0 !== currentEventTransitionLane && (currentEventTransitionLane = 0);
  }
  function scheduleTaskForRootDuringMicrotask(root2, currentTime2) {
    for (var suspendedLanes = root2.suspendedLanes, pingedLanes = root2.pingedLanes, expirationTimes = root2.expirationTimes, lanes = root2.pendingLanes & -62914561; 0 < lanes; ) {
      var index$5 = 31 - clz32(lanes), lane = 1 << index$5, expirationTime = expirationTimes[index$5];
      if (-1 === expirationTime) {
        if (0 === (lane & suspendedLanes) || 0 !== (lane & pingedLanes))
          expirationTimes[index$5] = computeExpirationTime(lane, currentTime2);
      } else expirationTime <= currentTime2 && (root2.expiredLanes |= lane);
      lanes &= ~lane;
    }
    currentTime2 = workInProgressRoot;
    suspendedLanes = workInProgressRootRenderLanes;
    suspendedLanes = getNextLanes(
      root2,
      root2 === currentTime2 ? suspendedLanes : 0,
      null !== root2.cancelPendingCommit || -1 !== root2.timeoutHandle
    );
    pingedLanes = root2.callbackNode;
    if (0 === suspendedLanes || root2 === currentTime2 && (2 === workInProgressSuspendedReason || 9 === workInProgressSuspendedReason) || null !== root2.cancelPendingCommit)
      return null !== pingedLanes && null !== pingedLanes && cancelCallback$1(pingedLanes), root2.callbackNode = null, root2.callbackPriority = 0;
    if (0 === (suspendedLanes & 3) || checkIfRootIsPrerendering(root2, suspendedLanes)) {
      currentTime2 = suspendedLanes & -suspendedLanes;
      if (currentTime2 === root2.callbackPriority) return currentTime2;
      null !== pingedLanes && cancelCallback$1(pingedLanes);
      switch (lanesToEventPriority(suspendedLanes)) {
        case 2:
        case 8:
          suspendedLanes = UserBlockingPriority;
          break;
        case 32:
          suspendedLanes = NormalPriority$1;
          break;
        case 268435456:
          suspendedLanes = IdlePriority;
          break;
        default:
          suspendedLanes = NormalPriority$1;
      }
      pingedLanes = performWorkOnRootViaSchedulerTask.bind(null, root2);
      suspendedLanes = scheduleCallback$3(suspendedLanes, pingedLanes);
      root2.callbackPriority = currentTime2;
      root2.callbackNode = suspendedLanes;
      return currentTime2;
    }
    null !== pingedLanes && null !== pingedLanes && cancelCallback$1(pingedLanes);
    root2.callbackPriority = 2;
    root2.callbackNode = null;
    return 2;
  }
  function performWorkOnRootViaSchedulerTask(root2, didTimeout) {
    if (0 !== pendingEffectsStatus && 5 !== pendingEffectsStatus)
      return root2.callbackNode = null, root2.callbackPriority = 0, null;
    var originalCallbackNode = root2.callbackNode;
    if (flushPendingEffects() && root2.callbackNode !== originalCallbackNode)
      return null;
    var workInProgressRootRenderLanes$jscomp$0 = workInProgressRootRenderLanes;
    workInProgressRootRenderLanes$jscomp$0 = getNextLanes(
      root2,
      root2 === workInProgressRoot ? workInProgressRootRenderLanes$jscomp$0 : 0,
      null !== root2.cancelPendingCommit || -1 !== root2.timeoutHandle
    );
    if (0 === workInProgressRootRenderLanes$jscomp$0) return null;
    performWorkOnRoot(root2, workInProgressRootRenderLanes$jscomp$0, didTimeout);
    scheduleTaskForRootDuringMicrotask(root2, now());
    return null != root2.callbackNode && root2.callbackNode === originalCallbackNode ? performWorkOnRootViaSchedulerTask.bind(null, root2) : null;
  }
  function performSyncWorkOnRoot(root2, lanes) {
    if (flushPendingEffects()) return null;
    performWorkOnRoot(root2, lanes, true);
  }
  function scheduleImmediateRootScheduleTask() {
    scheduleMicrotask(function() {
      0 !== (executionContext & 6) ? scheduleCallback$3(
        ImmediatePriority,
        processRootScheduleInImmediateTask
      ) : processRootScheduleInMicrotask();
    });
  }
  function requestTransitionLane() {
    if (0 === currentEventTransitionLane) {
      var actionScopeLane = currentEntangledLane;
      0 === actionScopeLane && (actionScopeLane = nextTransitionUpdateLane, nextTransitionUpdateLane <<= 1, 0 === (nextTransitionUpdateLane & 261888) && (nextTransitionUpdateLane = 256));
      currentEventTransitionLane = actionScopeLane;
    }
    return currentEventTransitionLane;
  }
  function coerceFormActionProp(actionProp) {
    return null == actionProp || "symbol" === typeof actionProp || "boolean" === typeof actionProp ? null : "function" === typeof actionProp ? actionProp : sanitizeURL("" + actionProp);
  }
  function createFormDataWithSubmitter(form, submitter) {
    var temp = submitter.ownerDocument.createElement("input");
    temp.name = submitter.name;
    temp.value = submitter.value;
    form.id && temp.setAttribute("form", form.id);
    submitter.parentNode.insertBefore(temp, submitter);
    form = new FormData(form);
    temp.parentNode.removeChild(temp);
    return form;
  }
  function extractEvents$1(dispatchQueue, domEventName, maybeTargetInst, nativeEvent, nativeEventTarget) {
    if ("submit" === domEventName && maybeTargetInst && maybeTargetInst.stateNode === nativeEventTarget) {
      var action = coerceFormActionProp(
        (nativeEventTarget[internalPropsKey] || null).action
      ), submitter = nativeEvent.submitter;
      submitter && (domEventName = (domEventName = submitter[internalPropsKey] || null) ? coerceFormActionProp(domEventName.formAction) : submitter.getAttribute("formAction"), null !== domEventName && (action = domEventName, submitter = null));
      var event = new SyntheticEvent(
        "action",
        "action",
        null,
        nativeEvent,
        nativeEventTarget
      );
      dispatchQueue.push({
        event,
        listeners: [
          {
            instance: null,
            listener: function() {
              if (nativeEvent.defaultPrevented) {
                if (0 !== currentEventTransitionLane) {
                  var formData = submitter ? createFormDataWithSubmitter(nativeEventTarget, submitter) : new FormData(nativeEventTarget);
                  startHostTransition(
                    maybeTargetInst,
                    {
                      pending: true,
                      data: formData,
                      method: nativeEventTarget.method,
                      action
                    },
                    null,
                    formData
                  );
                }
              } else
                "function" === typeof action && (event.preventDefault(), formData = submitter ? createFormDataWithSubmitter(nativeEventTarget, submitter) : new FormData(nativeEventTarget), startHostTransition(
                  maybeTargetInst,
                  {
                    pending: true,
                    data: formData,
                    method: nativeEventTarget.method,
                    action
                  },
                  action,
                  formData
                ));
            },
            currentTarget: nativeEventTarget
          }
        ]
      });
    }
  }
  for (var i$jscomp$inline_1577 = 0; i$jscomp$inline_1577 < simpleEventPluginEvents.length; i$jscomp$inline_1577++) {
    var eventName$jscomp$inline_1578 = simpleEventPluginEvents[i$jscomp$inline_1577], domEventName$jscomp$inline_1579 = eventName$jscomp$inline_1578.toLowerCase(), capitalizedEvent$jscomp$inline_1580 = eventName$jscomp$inline_1578[0].toUpperCase() + eventName$jscomp$inline_1578.slice(1);
    registerSimpleEvent(
      domEventName$jscomp$inline_1579,
      "on" + capitalizedEvent$jscomp$inline_1580
    );
  }
  registerSimpleEvent(ANIMATION_END, "onAnimationEnd");
  registerSimpleEvent(ANIMATION_ITERATION, "onAnimationIteration");
  registerSimpleEvent(ANIMATION_START, "onAnimationStart");
  registerSimpleEvent("dblclick", "onDoubleClick");
  registerSimpleEvent("focusin", "onFocus");
  registerSimpleEvent("focusout", "onBlur");
  registerSimpleEvent(TRANSITION_RUN, "onTransitionRun");
  registerSimpleEvent(TRANSITION_START, "onTransitionStart");
  registerSimpleEvent(TRANSITION_CANCEL, "onTransitionCancel");
  registerSimpleEvent(TRANSITION_END, "onTransitionEnd");
  registerDirectEvent("onMouseEnter", ["mouseout", "mouseover"]);
  registerDirectEvent("onMouseLeave", ["mouseout", "mouseover"]);
  registerDirectEvent("onPointerEnter", ["pointerout", "pointerover"]);
  registerDirectEvent("onPointerLeave", ["pointerout", "pointerover"]);
  registerTwoPhaseEvent(
    "onChange",
    "change click focusin focusout input keydown keyup selectionchange".split(" ")
  );
  registerTwoPhaseEvent(
    "onSelect",
    "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(
      " "
    )
  );
  registerTwoPhaseEvent("onBeforeInput", [
    "compositionend",
    "keypress",
    "textInput",
    "paste"
  ]);
  registerTwoPhaseEvent(
    "onCompositionEnd",
    "compositionend focusout keydown keypress keyup mousedown".split(" ")
  );
  registerTwoPhaseEvent(
    "onCompositionStart",
    "compositionstart focusout keydown keypress keyup mousedown".split(" ")
  );
  registerTwoPhaseEvent(
    "onCompositionUpdate",
    "compositionupdate focusout keydown keypress keyup mousedown".split(" ")
  );
  var mediaEventTypes = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(
    " "
  ), nonDelegatedEvents = new Set(
    "beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(mediaEventTypes)
  );
  function processDispatchQueue(dispatchQueue, eventSystemFlags) {
    eventSystemFlags = 0 !== (eventSystemFlags & 4);
    for (var i = 0; i < dispatchQueue.length; i++) {
      var _dispatchQueue$i = dispatchQueue[i], event = _dispatchQueue$i.event;
      _dispatchQueue$i = _dispatchQueue$i.listeners;
      a: {
        var previousInstance = void 0;
        if (eventSystemFlags)
          for (var i$jscomp$0 = _dispatchQueue$i.length - 1; 0 <= i$jscomp$0; i$jscomp$0--) {
            var _dispatchListeners$i = _dispatchQueue$i[i$jscomp$0], instance = _dispatchListeners$i.instance, currentTarget = _dispatchListeners$i.currentTarget;
            _dispatchListeners$i = _dispatchListeners$i.listener;
            if (instance !== previousInstance && event.isPropagationStopped())
              break a;
            previousInstance = _dispatchListeners$i;
            event.currentTarget = currentTarget;
            try {
              previousInstance(event);
            } catch (error) {
              reportGlobalError(error);
            }
            event.currentTarget = null;
            previousInstance = instance;
          }
        else
          for (i$jscomp$0 = 0; i$jscomp$0 < _dispatchQueue$i.length; i$jscomp$0++) {
            _dispatchListeners$i = _dispatchQueue$i[i$jscomp$0];
            instance = _dispatchListeners$i.instance;
            currentTarget = _dispatchListeners$i.currentTarget;
            _dispatchListeners$i = _dispatchListeners$i.listener;
            if (instance !== previousInstance && event.isPropagationStopped())
              break a;
            previousInstance = _dispatchListeners$i;
            event.currentTarget = currentTarget;
            try {
              previousInstance(event);
            } catch (error) {
              reportGlobalError(error);
            }
            event.currentTarget = null;
            previousInstance = instance;
          }
      }
    }
  }
  function listenToNonDelegatedEvent(domEventName, targetElement) {
    var JSCompiler_inline_result = targetElement[internalEventHandlersKey];
    void 0 === JSCompiler_inline_result && (JSCompiler_inline_result = targetElement[internalEventHandlersKey] = /* @__PURE__ */ new Set());
    var listenerSetKey = domEventName + "__bubble";
    JSCompiler_inline_result.has(listenerSetKey) || (addTrappedEventListener(targetElement, domEventName, 2, false), JSCompiler_inline_result.add(listenerSetKey));
  }
  function listenToNativeEvent(domEventName, isCapturePhaseListener, target) {
    var eventSystemFlags = 0;
    isCapturePhaseListener && (eventSystemFlags |= 4);
    addTrappedEventListener(
      target,
      domEventName,
      eventSystemFlags,
      isCapturePhaseListener
    );
  }
  var listeningMarker = "_reactListening" + Math.random().toString(36).slice(2);
  function listenToAllSupportedEvents(rootContainerElement) {
    if (!rootContainerElement[listeningMarker]) {
      rootContainerElement[listeningMarker] = true;
      allNativeEvents.forEach(function(domEventName) {
        "selectionchange" !== domEventName && (nonDelegatedEvents.has(domEventName) || listenToNativeEvent(domEventName, false, rootContainerElement), listenToNativeEvent(domEventName, true, rootContainerElement));
      });
      var ownerDocument = 9 === rootContainerElement.nodeType ? rootContainerElement : rootContainerElement.ownerDocument;
      null === ownerDocument || ownerDocument[listeningMarker] || (ownerDocument[listeningMarker] = true, listenToNativeEvent("selectionchange", false, ownerDocument));
    }
  }
  function addTrappedEventListener(targetContainer, domEventName, eventSystemFlags, isCapturePhaseListener) {
    switch (getEventPriority(domEventName)) {
      case 2:
        var listenerWrapper = dispatchDiscreteEvent;
        break;
      case 8:
        listenerWrapper = dispatchContinuousEvent;
        break;
      default:
        listenerWrapper = dispatchEvent;
    }
    eventSystemFlags = listenerWrapper.bind(
      null,
      domEventName,
      eventSystemFlags,
      targetContainer
    );
    listenerWrapper = void 0;
    !passiveBrowserEventsSupported || "touchstart" !== domEventName && "touchmove" !== domEventName && "wheel" !== domEventName || (listenerWrapper = true);
    isCapturePhaseListener ? void 0 !== listenerWrapper ? targetContainer.addEventListener(domEventName, eventSystemFlags, {
      capture: true,
      passive: listenerWrapper
    }) : targetContainer.addEventListener(domEventName, eventSystemFlags, true) : void 0 !== listenerWrapper ? targetContainer.addEventListener(domEventName, eventSystemFlags, {
      passive: listenerWrapper
    }) : targetContainer.addEventListener(domEventName, eventSystemFlags, false);
  }
  function dispatchEventForPluginEventSystem(domEventName, eventSystemFlags, nativeEvent, targetInst$jscomp$0, targetContainer) {
    var ancestorInst = targetInst$jscomp$0;
    if (0 === (eventSystemFlags & 1) && 0 === (eventSystemFlags & 2) && null !== targetInst$jscomp$0)
      a: for (; ; ) {
        if (null === targetInst$jscomp$0) return;
        var nodeTag = targetInst$jscomp$0.tag;
        if (3 === nodeTag || 4 === nodeTag) {
          var container = targetInst$jscomp$0.stateNode.containerInfo;
          if (container === targetContainer) break;
          if (4 === nodeTag)
            for (nodeTag = targetInst$jscomp$0.return; null !== nodeTag; ) {
              var grandTag = nodeTag.tag;
              if ((3 === grandTag || 4 === grandTag) && nodeTag.stateNode.containerInfo === targetContainer)
                return;
              nodeTag = nodeTag.return;
            }
          for (; null !== container; ) {
            nodeTag = getClosestInstanceFromNode(container);
            if (null === nodeTag) return;
            grandTag = nodeTag.tag;
            if (5 === grandTag || 6 === grandTag || 26 === grandTag || 27 === grandTag) {
              targetInst$jscomp$0 = ancestorInst = nodeTag;
              continue a;
            }
            container = container.parentNode;
          }
        }
        targetInst$jscomp$0 = targetInst$jscomp$0.return;
      }
    batchedUpdates$1(function() {
      var targetInst = ancestorInst, nativeEventTarget = getEventTarget(nativeEvent), dispatchQueue = [];
      a: {
        var reactName = topLevelEventsToReactNames.get(domEventName);
        if (void 0 !== reactName) {
          var SyntheticEventCtor = SyntheticEvent, reactEventType = domEventName;
          switch (domEventName) {
            case "keypress":
              if (0 === getEventCharCode(nativeEvent)) break a;
            case "keydown":
            case "keyup":
              SyntheticEventCtor = SyntheticKeyboardEvent;
              break;
            case "focusin":
              reactEventType = "focus";
              SyntheticEventCtor = SyntheticFocusEvent;
              break;
            case "focusout":
              reactEventType = "blur";
              SyntheticEventCtor = SyntheticFocusEvent;
              break;
            case "beforeblur":
            case "afterblur":
              SyntheticEventCtor = SyntheticFocusEvent;
              break;
            case "click":
              if (2 === nativeEvent.button) break a;
            case "auxclick":
            case "dblclick":
            case "mousedown":
            case "mousemove":
            case "mouseup":
            case "mouseout":
            case "mouseover":
            case "contextmenu":
              SyntheticEventCtor = SyntheticMouseEvent;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              SyntheticEventCtor = SyntheticDragEvent;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              SyntheticEventCtor = SyntheticTouchEvent;
              break;
            case ANIMATION_END:
            case ANIMATION_ITERATION:
            case ANIMATION_START:
              SyntheticEventCtor = SyntheticAnimationEvent;
              break;
            case TRANSITION_END:
              SyntheticEventCtor = SyntheticTransitionEvent;
              break;
            case "scroll":
            case "scrollend":
              SyntheticEventCtor = SyntheticUIEvent;
              break;
            case "wheel":
              SyntheticEventCtor = SyntheticWheelEvent;
              break;
            case "copy":
            case "cut":
            case "paste":
              SyntheticEventCtor = SyntheticClipboardEvent;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              SyntheticEventCtor = SyntheticPointerEvent;
              break;
            case "toggle":
            case "beforetoggle":
              SyntheticEventCtor = SyntheticToggleEvent;
          }
          var inCapturePhase = 0 !== (eventSystemFlags & 4), accumulateTargetOnly = !inCapturePhase && ("scroll" === domEventName || "scrollend" === domEventName), reactEventName = inCapturePhase ? null !== reactName ? reactName + "Capture" : null : reactName;
          inCapturePhase = [];
          for (var instance = targetInst, lastHostComponent; null !== instance; ) {
            var _instance = instance;
            lastHostComponent = _instance.stateNode;
            _instance = _instance.tag;
            5 !== _instance && 26 !== _instance && 27 !== _instance || null === lastHostComponent || null === reactEventName || (_instance = getListener(instance, reactEventName), null != _instance && inCapturePhase.push(
              createDispatchListener(instance, _instance, lastHostComponent)
            ));
            if (accumulateTargetOnly) break;
            instance = instance.return;
          }
          0 < inCapturePhase.length && (reactName = new SyntheticEventCtor(
            reactName,
            reactEventType,
            null,
            nativeEvent,
            nativeEventTarget
          ), dispatchQueue.push({ event: reactName, listeners: inCapturePhase }));
        }
      }
      if (0 === (eventSystemFlags & 7)) {
        a: {
          reactName = "mouseover" === domEventName || "pointerover" === domEventName;
          SyntheticEventCtor = "mouseout" === domEventName || "pointerout" === domEventName;
          if (reactName && nativeEvent !== currentReplayingEvent && (reactEventType = nativeEvent.relatedTarget || nativeEvent.fromElement) && (getClosestInstanceFromNode(reactEventType) || reactEventType[internalContainerInstanceKey]))
            break a;
          if (SyntheticEventCtor || reactName) {
            reactName = nativeEventTarget.window === nativeEventTarget ? nativeEventTarget : (reactName = nativeEventTarget.ownerDocument) ? reactName.defaultView || reactName.parentWindow : window;
            if (SyntheticEventCtor) {
              if (reactEventType = nativeEvent.relatedTarget || nativeEvent.toElement, SyntheticEventCtor = targetInst, reactEventType = reactEventType ? getClosestInstanceFromNode(reactEventType) : null, null !== reactEventType && (accumulateTargetOnly = getNearestMountedFiber(reactEventType), inCapturePhase = reactEventType.tag, reactEventType !== accumulateTargetOnly || 5 !== inCapturePhase && 27 !== inCapturePhase && 6 !== inCapturePhase))
                reactEventType = null;
            } else SyntheticEventCtor = null, reactEventType = targetInst;
            if (SyntheticEventCtor !== reactEventType) {
              inCapturePhase = SyntheticMouseEvent;
              _instance = "onMouseLeave";
              reactEventName = "onMouseEnter";
              instance = "mouse";
              if ("pointerout" === domEventName || "pointerover" === domEventName)
                inCapturePhase = SyntheticPointerEvent, _instance = "onPointerLeave", reactEventName = "onPointerEnter", instance = "pointer";
              accumulateTargetOnly = null == SyntheticEventCtor ? reactName : getNodeFromInstance(SyntheticEventCtor);
              lastHostComponent = null == reactEventType ? reactName : getNodeFromInstance(reactEventType);
              reactName = new inCapturePhase(
                _instance,
                instance + "leave",
                SyntheticEventCtor,
                nativeEvent,
                nativeEventTarget
              );
              reactName.target = accumulateTargetOnly;
              reactName.relatedTarget = lastHostComponent;
              _instance = null;
              getClosestInstanceFromNode(nativeEventTarget) === targetInst && (inCapturePhase = new inCapturePhase(
                reactEventName,
                instance + "enter",
                reactEventType,
                nativeEvent,
                nativeEventTarget
              ), inCapturePhase.target = lastHostComponent, inCapturePhase.relatedTarget = accumulateTargetOnly, _instance = inCapturePhase);
              accumulateTargetOnly = _instance;
              if (SyntheticEventCtor && reactEventType)
                b: {
                  inCapturePhase = getParent;
                  reactEventName = SyntheticEventCtor;
                  instance = reactEventType;
                  lastHostComponent = 0;
                  for (_instance = reactEventName; _instance; _instance = inCapturePhase(_instance))
                    lastHostComponent++;
                  _instance = 0;
                  for (var tempB = instance; tempB; tempB = inCapturePhase(tempB))
                    _instance++;
                  for (; 0 < lastHostComponent - _instance; )
                    reactEventName = inCapturePhase(reactEventName), lastHostComponent--;
                  for (; 0 < _instance - lastHostComponent; )
                    instance = inCapturePhase(instance), _instance--;
                  for (; lastHostComponent--; ) {
                    if (reactEventName === instance || null !== instance && reactEventName === instance.alternate) {
                      inCapturePhase = reactEventName;
                      break b;
                    }
                    reactEventName = inCapturePhase(reactEventName);
                    instance = inCapturePhase(instance);
                  }
                  inCapturePhase = null;
                }
              else inCapturePhase = null;
              null !== SyntheticEventCtor && accumulateEnterLeaveListenersForEvent(
                dispatchQueue,
                reactName,
                SyntheticEventCtor,
                inCapturePhase,
                false
              );
              null !== reactEventType && null !== accumulateTargetOnly && accumulateEnterLeaveListenersForEvent(
                dispatchQueue,
                accumulateTargetOnly,
                reactEventType,
                inCapturePhase,
                true
              );
            }
          }
        }
        a: {
          reactName = targetInst ? getNodeFromInstance(targetInst) : window;
          SyntheticEventCtor = reactName.nodeName && reactName.nodeName.toLowerCase();
          if ("select" === SyntheticEventCtor || "input" === SyntheticEventCtor && "file" === reactName.type)
            var getTargetInstFunc = getTargetInstForChangeEvent;
          else if (isTextInputElement(reactName))
            if (isInputEventSupported)
              getTargetInstFunc = getTargetInstForInputOrChangeEvent;
            else {
              getTargetInstFunc = getTargetInstForInputEventPolyfill;
              var handleEventFunc = handleEventsForInputEventPolyfill;
            }
          else
            SyntheticEventCtor = reactName.nodeName, !SyntheticEventCtor || "input" !== SyntheticEventCtor.toLowerCase() || "checkbox" !== reactName.type && "radio" !== reactName.type ? targetInst && isCustomElement(targetInst.elementType) && (getTargetInstFunc = getTargetInstForChangeEvent) : getTargetInstFunc = getTargetInstForClickEvent;
          if (getTargetInstFunc && (getTargetInstFunc = getTargetInstFunc(domEventName, targetInst))) {
            createAndAccumulateChangeEvent(
              dispatchQueue,
              getTargetInstFunc,
              nativeEvent,
              nativeEventTarget
            );
            break a;
          }
          handleEventFunc && handleEventFunc(domEventName, reactName, targetInst);
          "focusout" === domEventName && targetInst && "number" === reactName.type && null != targetInst.memoizedProps.value && setDefaultValue(reactName, "number", reactName.value);
        }
        handleEventFunc = targetInst ? getNodeFromInstance(targetInst) : window;
        switch (domEventName) {
          case "focusin":
            if (isTextInputElement(handleEventFunc) || "true" === handleEventFunc.contentEditable)
              activeElement = handleEventFunc, activeElementInst = targetInst, lastSelection = null;
            break;
          case "focusout":
            lastSelection = activeElementInst = activeElement = null;
            break;
          case "mousedown":
            mouseDown = true;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            mouseDown = false;
            constructSelectEvent(dispatchQueue, nativeEvent, nativeEventTarget);
            break;
          case "selectionchange":
            if (skipSelectionChangeEvent) break;
          case "keydown":
          case "keyup":
            constructSelectEvent(dispatchQueue, nativeEvent, nativeEventTarget);
        }
        var fallbackData;
        if (canUseCompositionEvent)
          b: {
            switch (domEventName) {
              case "compositionstart":
                var eventType = "onCompositionStart";
                break b;
              case "compositionend":
                eventType = "onCompositionEnd";
                break b;
              case "compositionupdate":
                eventType = "onCompositionUpdate";
                break b;
            }
            eventType = void 0;
          }
        else
          isComposing ? isFallbackCompositionEnd(domEventName, nativeEvent) && (eventType = "onCompositionEnd") : "keydown" === domEventName && 229 === nativeEvent.keyCode && (eventType = "onCompositionStart");
        eventType && (useFallbackCompositionData && "ko" !== nativeEvent.locale && (isComposing || "onCompositionStart" !== eventType ? "onCompositionEnd" === eventType && isComposing && (fallbackData = getData()) : (root = nativeEventTarget, startText = "value" in root ? root.value : root.textContent, isComposing = true)), handleEventFunc = accumulateTwoPhaseListeners(targetInst, eventType), 0 < handleEventFunc.length && (eventType = new SyntheticCompositionEvent(
          eventType,
          domEventName,
          null,
          nativeEvent,
          nativeEventTarget
        ), dispatchQueue.push({ event: eventType, listeners: handleEventFunc }), fallbackData ? eventType.data = fallbackData : (fallbackData = getDataFromCustomEvent(nativeEvent), null !== fallbackData && (eventType.data = fallbackData))));
        if (fallbackData = canUseTextInputEvent ? getNativeBeforeInputChars(domEventName, nativeEvent) : getFallbackBeforeInputChars(domEventName, nativeEvent))
          eventType = accumulateTwoPhaseListeners(targetInst, "onBeforeInput"), 0 < eventType.length && (handleEventFunc = new SyntheticCompositionEvent(
            "onBeforeInput",
            "beforeinput",
            null,
            nativeEvent,
            nativeEventTarget
          ), dispatchQueue.push({
            event: handleEventFunc,
            listeners: eventType
          }), handleEventFunc.data = fallbackData);
        extractEvents$1(
          dispatchQueue,
          domEventName,
          targetInst,
          nativeEvent,
          nativeEventTarget
        );
      }
      processDispatchQueue(dispatchQueue, eventSystemFlags);
    });
  }
  function createDispatchListener(instance, listener, currentTarget) {
    return {
      instance,
      listener,
      currentTarget
    };
  }
  function accumulateTwoPhaseListeners(targetFiber, reactName) {
    for (var captureName = reactName + "Capture", listeners = []; null !== targetFiber; ) {
      var _instance2 = targetFiber, stateNode = _instance2.stateNode;
      _instance2 = _instance2.tag;
      5 !== _instance2 && 26 !== _instance2 && 27 !== _instance2 || null === stateNode || (_instance2 = getListener(targetFiber, captureName), null != _instance2 && listeners.unshift(
        createDispatchListener(targetFiber, _instance2, stateNode)
      ), _instance2 = getListener(targetFiber, reactName), null != _instance2 && listeners.push(
        createDispatchListener(targetFiber, _instance2, stateNode)
      ));
      if (3 === targetFiber.tag) return listeners;
      targetFiber = targetFiber.return;
    }
    return [];
  }
  function getParent(inst) {
    if (null === inst) return null;
    do
      inst = inst.return;
    while (inst && 5 !== inst.tag && 27 !== inst.tag);
    return inst ? inst : null;
  }
  function accumulateEnterLeaveListenersForEvent(dispatchQueue, event, target, common, inCapturePhase) {
    for (var registrationName = event._reactName, listeners = []; null !== target && target !== common; ) {
      var _instance3 = target, alternate = _instance3.alternate, stateNode = _instance3.stateNode;
      _instance3 = _instance3.tag;
      if (null !== alternate && alternate === common) break;
      5 !== _instance3 && 26 !== _instance3 && 27 !== _instance3 || null === stateNode || (alternate = stateNode, inCapturePhase ? (stateNode = getListener(target, registrationName), null != stateNode && listeners.unshift(
        createDispatchListener(target, stateNode, alternate)
      )) : inCapturePhase || (stateNode = getListener(target, registrationName), null != stateNode && listeners.push(
        createDispatchListener(target, stateNode, alternate)
      )));
      target = target.return;
    }
    0 !== listeners.length && dispatchQueue.push({ event, listeners });
  }
  var NORMALIZE_NEWLINES_REGEX = /\r\n?/g, NORMALIZE_NULL_AND_REPLACEMENT_REGEX = /\u0000|\uFFFD/g;
  function normalizeMarkupForTextOrAttribute(markup) {
    return ("string" === typeof markup ? markup : "" + markup).replace(NORMALIZE_NEWLINES_REGEX, "\n").replace(NORMALIZE_NULL_AND_REPLACEMENT_REGEX, "");
  }
  function checkForUnmatchedText(serverText, clientText) {
    clientText = normalizeMarkupForTextOrAttribute(clientText);
    return normalizeMarkupForTextOrAttribute(serverText) === clientText ? true : false;
  }
  function setProp(domElement, tag, key, value, props, prevValue) {
    switch (key) {
      case "children":
        "string" === typeof value ? "body" === tag || "textarea" === tag && "" === value || setTextContent(domElement, value) : ("number" === typeof value || "bigint" === typeof value) && "body" !== tag && setTextContent(domElement, "" + value);
        break;
      case "className":
        setValueForKnownAttribute(domElement, "class", value);
        break;
      case "tabIndex":
        setValueForKnownAttribute(domElement, "tabindex", value);
        break;
      case "dir":
      case "role":
      case "viewBox":
      case "width":
      case "height":
        setValueForKnownAttribute(domElement, key, value);
        break;
      case "style":
        setValueForStyles(domElement, value, prevValue);
        break;
      case "data":
        if ("object" !== tag) {
          setValueForKnownAttribute(domElement, "data", value);
          break;
        }
      case "src":
      case "href":
        if ("" === value && ("a" !== tag || "href" !== key)) {
          domElement.removeAttribute(key);
          break;
        }
        if (null == value || "function" === typeof value || "symbol" === typeof value || "boolean" === typeof value) {
          domElement.removeAttribute(key);
          break;
        }
        value = sanitizeURL("" + value);
        domElement.setAttribute(key, value);
        break;
      case "action":
      case "formAction":
        if ("function" === typeof value) {
          domElement.setAttribute(
            key,
            "javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')"
          );
          break;
        } else
          "function" === typeof prevValue && ("formAction" === key ? ("input" !== tag && setProp(domElement, tag, "name", props.name, props, null), setProp(
            domElement,
            tag,
            "formEncType",
            props.formEncType,
            props,
            null
          ), setProp(
            domElement,
            tag,
            "formMethod",
            props.formMethod,
            props,
            null
          ), setProp(
            domElement,
            tag,
            "formTarget",
            props.formTarget,
            props,
            null
          )) : (setProp(domElement, tag, "encType", props.encType, props, null), setProp(domElement, tag, "method", props.method, props, null), setProp(domElement, tag, "target", props.target, props, null)));
        if (null == value || "symbol" === typeof value || "boolean" === typeof value) {
          domElement.removeAttribute(key);
          break;
        }
        value = sanitizeURL("" + value);
        domElement.setAttribute(key, value);
        break;
      case "onClick":
        null != value && (domElement.onclick = noop$1);
        break;
      case "onScroll":
        null != value && listenToNonDelegatedEvent("scroll", domElement);
        break;
      case "onScrollEnd":
        null != value && listenToNonDelegatedEvent("scrollend", domElement);
        break;
      case "dangerouslySetInnerHTML":
        if (null != value) {
          if ("object" !== typeof value || !("__html" in value))
            throw Error(formatProdErrorMessage(61));
          key = value.__html;
          if (null != key) {
            if (null != props.children) throw Error(formatProdErrorMessage(60));
            domElement.innerHTML = key;
          }
        }
        break;
      case "multiple":
        domElement.multiple = value && "function" !== typeof value && "symbol" !== typeof value;
        break;
      case "muted":
        domElement.muted = value && "function" !== typeof value && "symbol" !== typeof value;
        break;
      case "suppressContentEditableWarning":
      case "suppressHydrationWarning":
      case "defaultValue":
      case "defaultChecked":
      case "innerHTML":
      case "ref":
        break;
      case "autoFocus":
        break;
      case "xlinkHref":
        if (null == value || "function" === typeof value || "boolean" === typeof value || "symbol" === typeof value) {
          domElement.removeAttribute("xlink:href");
          break;
        }
        key = sanitizeURL("" + value);
        domElement.setAttributeNS(
          "http://www.w3.org/1999/xlink",
          "xlink:href",
          key
        );
        break;
      case "contentEditable":
      case "spellCheck":
      case "draggable":
      case "value":
      case "autoReverse":
      case "externalResourcesRequired":
      case "focusable":
      case "preserveAlpha":
        null != value && "function" !== typeof value && "symbol" !== typeof value ? domElement.setAttribute(key, "" + value) : domElement.removeAttribute(key);
        break;
      case "inert":
      case "allowFullScreen":
      case "async":
      case "autoPlay":
      case "controls":
      case "default":
      case "defer":
      case "disabled":
      case "disablePictureInPicture":
      case "disableRemotePlayback":
      case "formNoValidate":
      case "hidden":
      case "loop":
      case "noModule":
      case "noValidate":
      case "open":
      case "playsInline":
      case "readOnly":
      case "required":
      case "reversed":
      case "scoped":
      case "seamless":
      case "itemScope":
        value && "function" !== typeof value && "symbol" !== typeof value ? domElement.setAttribute(key, "") : domElement.removeAttribute(key);
        break;
      case "capture":
      case "download":
        true === value ? domElement.setAttribute(key, "") : false !== value && null != value && "function" !== typeof value && "symbol" !== typeof value ? domElement.setAttribute(key, value) : domElement.removeAttribute(key);
        break;
      case "cols":
      case "rows":
      case "size":
      case "span":
        null != value && "function" !== typeof value && "symbol" !== typeof value && !isNaN(value) && 1 <= value ? domElement.setAttribute(key, value) : domElement.removeAttribute(key);
        break;
      case "rowSpan":
      case "start":
        null == value || "function" === typeof value || "symbol" === typeof value || isNaN(value) ? domElement.removeAttribute(key) : domElement.setAttribute(key, value);
        break;
      case "popover":
        listenToNonDelegatedEvent("beforetoggle", domElement);
        listenToNonDelegatedEvent("toggle", domElement);
        setValueForAttribute(domElement, "popover", value);
        break;
      case "xlinkActuate":
        setValueForNamespacedAttribute(
          domElement,
          "http://www.w3.org/1999/xlink",
          "xlink:actuate",
          value
        );
        break;
      case "xlinkArcrole":
        setValueForNamespacedAttribute(
          domElement,
          "http://www.w3.org/1999/xlink",
          "xlink:arcrole",
          value
        );
        break;
      case "xlinkRole":
        setValueForNamespacedAttribute(
          domElement,
          "http://www.w3.org/1999/xlink",
          "xlink:role",
          value
        );
        break;
      case "xlinkShow":
        setValueForNamespacedAttribute(
          domElement,
          "http://www.w3.org/1999/xlink",
          "xlink:show",
          value
        );
        break;
      case "xlinkTitle":
        setValueForNamespacedAttribute(
          domElement,
          "http://www.w3.org/1999/xlink",
          "xlink:title",
          value
        );
        break;
      case "xlinkType":
        setValueForNamespacedAttribute(
          domElement,
          "http://www.w3.org/1999/xlink",
          "xlink:type",
          value
        );
        break;
      case "xmlBase":
        setValueForNamespacedAttribute(
          domElement,
          "http://www.w3.org/XML/1998/namespace",
          "xml:base",
          value
        );
        break;
      case "xmlLang":
        setValueForNamespacedAttribute(
          domElement,
          "http://www.w3.org/XML/1998/namespace",
          "xml:lang",
          value
        );
        break;
      case "xmlSpace":
        setValueForNamespacedAttribute(
          domElement,
          "http://www.w3.org/XML/1998/namespace",
          "xml:space",
          value
        );
        break;
      case "is":
        setValueForAttribute(domElement, "is", value);
        break;
      case "innerText":
      case "textContent":
        break;
      default:
        if (!(2 < key.length) || "o" !== key[0] && "O" !== key[0] || "n" !== key[1] && "N" !== key[1])
          key = aliases.get(key) || key, setValueForAttribute(domElement, key, value);
    }
  }
  function setPropOnCustomElement(domElement, tag, key, value, props, prevValue) {
    switch (key) {
      case "style":
        setValueForStyles(domElement, value, prevValue);
        break;
      case "dangerouslySetInnerHTML":
        if (null != value) {
          if ("object" !== typeof value || !("__html" in value))
            throw Error(formatProdErrorMessage(61));
          key = value.__html;
          if (null != key) {
            if (null != props.children) throw Error(formatProdErrorMessage(60));
            domElement.innerHTML = key;
          }
        }
        break;
      case "children":
        "string" === typeof value ? setTextContent(domElement, value) : ("number" === typeof value || "bigint" === typeof value) && setTextContent(domElement, "" + value);
        break;
      case "onScroll":
        null != value && listenToNonDelegatedEvent("scroll", domElement);
        break;
      case "onScrollEnd":
        null != value && listenToNonDelegatedEvent("scrollend", domElement);
        break;
      case "onClick":
        null != value && (domElement.onclick = noop$1);
        break;
      case "suppressContentEditableWarning":
      case "suppressHydrationWarning":
      case "innerHTML":
      case "ref":
        break;
      case "innerText":
      case "textContent":
        break;
      default:
        if (!registrationNameDependencies.hasOwnProperty(key))
          a: {
            if ("o" === key[0] && "n" === key[1] && (props = key.endsWith("Capture"), tag = key.slice(2, props ? key.length - 7 : void 0), prevValue = domElement[internalPropsKey] || null, prevValue = null != prevValue ? prevValue[key] : null, "function" === typeof prevValue && domElement.removeEventListener(tag, prevValue, props), "function" === typeof value)) {
              "function" !== typeof prevValue && null !== prevValue && (key in domElement ? domElement[key] = null : domElement.hasAttribute(key) && domElement.removeAttribute(key));
              domElement.addEventListener(tag, value, props);
              break a;
            }
            key in domElement ? domElement[key] = value : true === value ? domElement.setAttribute(key, "") : setValueForAttribute(domElement, key, value);
          }
    }
  }
  function setInitialProperties(domElement, tag, props) {
    switch (tag) {
      case "div":
      case "span":
      case "svg":
      case "path":
      case "a":
      case "g":
      case "p":
      case "li":
        break;
      case "img":
        listenToNonDelegatedEvent("error", domElement);
        listenToNonDelegatedEvent("load", domElement);
        var hasSrc = false, hasSrcSet = false, propKey;
        for (propKey in props)
          if (props.hasOwnProperty(propKey)) {
            var propValue = props[propKey];
            if (null != propValue)
              switch (propKey) {
                case "src":
                  hasSrc = true;
                  break;
                case "srcSet":
                  hasSrcSet = true;
                  break;
                case "children":
                case "dangerouslySetInnerHTML":
                  throw Error(formatProdErrorMessage(137, tag));
                default:
                  setProp(domElement, tag, propKey, propValue, props, null);
              }
          }
        hasSrcSet && setProp(domElement, tag, "srcSet", props.srcSet, props, null);
        hasSrc && setProp(domElement, tag, "src", props.src, props, null);
        return;
      case "input":
        listenToNonDelegatedEvent("invalid", domElement);
        var defaultValue = propKey = propValue = hasSrcSet = null, checked = null, defaultChecked = null;
        for (hasSrc in props)
          if (props.hasOwnProperty(hasSrc)) {
            var propValue$184 = props[hasSrc];
            if (null != propValue$184)
              switch (hasSrc) {
                case "name":
                  hasSrcSet = propValue$184;
                  break;
                case "type":
                  propValue = propValue$184;
                  break;
                case "checked":
                  checked = propValue$184;
                  break;
                case "defaultChecked":
                  defaultChecked = propValue$184;
                  break;
                case "value":
                  propKey = propValue$184;
                  break;
                case "defaultValue":
                  defaultValue = propValue$184;
                  break;
                case "children":
                case "dangerouslySetInnerHTML":
                  if (null != propValue$184)
                    throw Error(formatProdErrorMessage(137, tag));
                  break;
                default:
                  setProp(domElement, tag, hasSrc, propValue$184, props, null);
              }
          }
        initInput(
          domElement,
          propKey,
          defaultValue,
          checked,
          defaultChecked,
          propValue,
          hasSrcSet,
          false
        );
        return;
      case "select":
        listenToNonDelegatedEvent("invalid", domElement);
        hasSrc = propValue = propKey = null;
        for (hasSrcSet in props)
          if (props.hasOwnProperty(hasSrcSet) && (defaultValue = props[hasSrcSet], null != defaultValue))
            switch (hasSrcSet) {
              case "value":
                propKey = defaultValue;
                break;
              case "defaultValue":
                propValue = defaultValue;
                break;
              case "multiple":
                hasSrc = defaultValue;
              default:
                setProp(domElement, tag, hasSrcSet, defaultValue, props, null);
            }
        tag = propKey;
        props = propValue;
        domElement.multiple = !!hasSrc;
        null != tag ? updateOptions(domElement, !!hasSrc, tag, false) : null != props && updateOptions(domElement, !!hasSrc, props, true);
        return;
      case "textarea":
        listenToNonDelegatedEvent("invalid", domElement);
        propKey = hasSrcSet = hasSrc = null;
        for (propValue in props)
          if (props.hasOwnProperty(propValue) && (defaultValue = props[propValue], null != defaultValue))
            switch (propValue) {
              case "value":
                hasSrc = defaultValue;
                break;
              case "defaultValue":
                hasSrcSet = defaultValue;
                break;
              case "children":
                propKey = defaultValue;
                break;
              case "dangerouslySetInnerHTML":
                if (null != defaultValue) throw Error(formatProdErrorMessage(91));
                break;
              default:
                setProp(domElement, tag, propValue, defaultValue, props, null);
            }
        initTextarea(domElement, hasSrc, hasSrcSet, propKey);
        return;
      case "option":
        for (checked in props)
          if (props.hasOwnProperty(checked) && (hasSrc = props[checked], null != hasSrc))
            switch (checked) {
              case "selected":
                domElement.selected = hasSrc && "function" !== typeof hasSrc && "symbol" !== typeof hasSrc;
                break;
              default:
                setProp(domElement, tag, checked, hasSrc, props, null);
            }
        return;
      case "dialog":
        listenToNonDelegatedEvent("beforetoggle", domElement);
        listenToNonDelegatedEvent("toggle", domElement);
        listenToNonDelegatedEvent("cancel", domElement);
        listenToNonDelegatedEvent("close", domElement);
        break;
      case "iframe":
      case "object":
        listenToNonDelegatedEvent("load", domElement);
        break;
      case "video":
      case "audio":
        for (hasSrc = 0; hasSrc < mediaEventTypes.length; hasSrc++)
          listenToNonDelegatedEvent(mediaEventTypes[hasSrc], domElement);
        break;
      case "image":
        listenToNonDelegatedEvent("error", domElement);
        listenToNonDelegatedEvent("load", domElement);
        break;
      case "details":
        listenToNonDelegatedEvent("toggle", domElement);
        break;
      case "embed":
      case "source":
      case "link":
        listenToNonDelegatedEvent("error", domElement), listenToNonDelegatedEvent("load", domElement);
      case "area":
      case "base":
      case "br":
      case "col":
      case "hr":
      case "keygen":
      case "meta":
      case "param":
      case "track":
      case "wbr":
      case "menuitem":
        for (defaultChecked in props)
          if (props.hasOwnProperty(defaultChecked) && (hasSrc = props[defaultChecked], null != hasSrc))
            switch (defaultChecked) {
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(formatProdErrorMessage(137, tag));
              default:
                setProp(domElement, tag, defaultChecked, hasSrc, props, null);
            }
        return;
      default:
        if (isCustomElement(tag)) {
          for (propValue$184 in props)
            props.hasOwnProperty(propValue$184) && (hasSrc = props[propValue$184], void 0 !== hasSrc && setPropOnCustomElement(
              domElement,
              tag,
              propValue$184,
              hasSrc,
              props,
              void 0
            ));
          return;
        }
    }
    for (defaultValue in props)
      props.hasOwnProperty(defaultValue) && (hasSrc = props[defaultValue], null != hasSrc && setProp(domElement, tag, defaultValue, hasSrc, props, null));
  }
  function updateProperties(domElement, tag, lastProps, nextProps) {
    switch (tag) {
      case "div":
      case "span":
      case "svg":
      case "path":
      case "a":
      case "g":
      case "p":
      case "li":
        break;
      case "input":
        var name = null, type = null, value = null, defaultValue = null, lastDefaultValue = null, checked = null, defaultChecked = null;
        for (propKey in lastProps) {
          var lastProp = lastProps[propKey];
          if (lastProps.hasOwnProperty(propKey) && null != lastProp)
            switch (propKey) {
              case "checked":
                break;
              case "value":
                break;
              case "defaultValue":
                lastDefaultValue = lastProp;
              default:
                nextProps.hasOwnProperty(propKey) || setProp(domElement, tag, propKey, null, nextProps, lastProp);
            }
        }
        for (var propKey$201 in nextProps) {
          var propKey = nextProps[propKey$201];
          lastProp = lastProps[propKey$201];
          if (nextProps.hasOwnProperty(propKey$201) && (null != propKey || null != lastProp))
            switch (propKey$201) {
              case "type":
                type = propKey;
                break;
              case "name":
                name = propKey;
                break;
              case "checked":
                checked = propKey;
                break;
              case "defaultChecked":
                defaultChecked = propKey;
                break;
              case "value":
                value = propKey;
                break;
              case "defaultValue":
                defaultValue = propKey;
                break;
              case "children":
              case "dangerouslySetInnerHTML":
                if (null != propKey)
                  throw Error(formatProdErrorMessage(137, tag));
                break;
              default:
                propKey !== lastProp && setProp(
                  domElement,
                  tag,
                  propKey$201,
                  propKey,
                  nextProps,
                  lastProp
                );
            }
        }
        updateInput(
          domElement,
          value,
          defaultValue,
          lastDefaultValue,
          checked,
          defaultChecked,
          type,
          name
        );
        return;
      case "select":
        propKey = value = defaultValue = propKey$201 = null;
        for (type in lastProps)
          if (lastDefaultValue = lastProps[type], lastProps.hasOwnProperty(type) && null != lastDefaultValue)
            switch (type) {
              case "value":
                break;
              case "multiple":
                propKey = lastDefaultValue;
              default:
                nextProps.hasOwnProperty(type) || setProp(
                  domElement,
                  tag,
                  type,
                  null,
                  nextProps,
                  lastDefaultValue
                );
            }
        for (name in nextProps)
          if (type = nextProps[name], lastDefaultValue = lastProps[name], nextProps.hasOwnProperty(name) && (null != type || null != lastDefaultValue))
            switch (name) {
              case "value":
                propKey$201 = type;
                break;
              case "defaultValue":
                defaultValue = type;
                break;
              case "multiple":
                value = type;
              default:
                type !== lastDefaultValue && setProp(
                  domElement,
                  tag,
                  name,
                  type,
                  nextProps,
                  lastDefaultValue
                );
            }
        tag = defaultValue;
        lastProps = value;
        nextProps = propKey;
        null != propKey$201 ? updateOptions(domElement, !!lastProps, propKey$201, false) : !!nextProps !== !!lastProps && (null != tag ? updateOptions(domElement, !!lastProps, tag, true) : updateOptions(domElement, !!lastProps, lastProps ? [] : "", false));
        return;
      case "textarea":
        propKey = propKey$201 = null;
        for (defaultValue in lastProps)
          if (name = lastProps[defaultValue], lastProps.hasOwnProperty(defaultValue) && null != name && !nextProps.hasOwnProperty(defaultValue))
            switch (defaultValue) {
              case "value":
                break;
              case "children":
                break;
              default:
                setProp(domElement, tag, defaultValue, null, nextProps, name);
            }
        for (value in nextProps)
          if (name = nextProps[value], type = lastProps[value], nextProps.hasOwnProperty(value) && (null != name || null != type))
            switch (value) {
              case "value":
                propKey$201 = name;
                break;
              case "defaultValue":
                propKey = name;
                break;
              case "children":
                break;
              case "dangerouslySetInnerHTML":
                if (null != name) throw Error(formatProdErrorMessage(91));
                break;
              default:
                name !== type && setProp(domElement, tag, value, name, nextProps, type);
            }
        updateTextarea(domElement, propKey$201, propKey);
        return;
      case "option":
        for (var propKey$217 in lastProps)
          if (propKey$201 = lastProps[propKey$217], lastProps.hasOwnProperty(propKey$217) && null != propKey$201 && !nextProps.hasOwnProperty(propKey$217))
            switch (propKey$217) {
              case "selected":
                domElement.selected = false;
                break;
              default:
                setProp(
                  domElement,
                  tag,
                  propKey$217,
                  null,
                  nextProps,
                  propKey$201
                );
            }
        for (lastDefaultValue in nextProps)
          if (propKey$201 = nextProps[lastDefaultValue], propKey = lastProps[lastDefaultValue], nextProps.hasOwnProperty(lastDefaultValue) && propKey$201 !== propKey && (null != propKey$201 || null != propKey))
            switch (lastDefaultValue) {
              case "selected":
                domElement.selected = propKey$201 && "function" !== typeof propKey$201 && "symbol" !== typeof propKey$201;
                break;
              default:
                setProp(
                  domElement,
                  tag,
                  lastDefaultValue,
                  propKey$201,
                  nextProps,
                  propKey
                );
            }
        return;
      case "img":
      case "link":
      case "area":
      case "base":
      case "br":
      case "col":
      case "embed":
      case "hr":
      case "keygen":
      case "meta":
      case "param":
      case "source":
      case "track":
      case "wbr":
      case "menuitem":
        for (var propKey$222 in lastProps)
          propKey$201 = lastProps[propKey$222], lastProps.hasOwnProperty(propKey$222) && null != propKey$201 && !nextProps.hasOwnProperty(propKey$222) && setProp(domElement, tag, propKey$222, null, nextProps, propKey$201);
        for (checked in nextProps)
          if (propKey$201 = nextProps[checked], propKey = lastProps[checked], nextProps.hasOwnProperty(checked) && propKey$201 !== propKey && (null != propKey$201 || null != propKey))
            switch (checked) {
              case "children":
              case "dangerouslySetInnerHTML":
                if (null != propKey$201)
                  throw Error(formatProdErrorMessage(137, tag));
                break;
              default:
                setProp(
                  domElement,
                  tag,
                  checked,
                  propKey$201,
                  nextProps,
                  propKey
                );
            }
        return;
      default:
        if (isCustomElement(tag)) {
          for (var propKey$227 in lastProps)
            propKey$201 = lastProps[propKey$227], lastProps.hasOwnProperty(propKey$227) && void 0 !== propKey$201 && !nextProps.hasOwnProperty(propKey$227) && setPropOnCustomElement(
              domElement,
              tag,
              propKey$227,
              void 0,
              nextProps,
              propKey$201
            );
          for (defaultChecked in nextProps)
            propKey$201 = nextProps[defaultChecked], propKey = lastProps[defaultChecked], !nextProps.hasOwnProperty(defaultChecked) || propKey$201 === propKey || void 0 === propKey$201 && void 0 === propKey || setPropOnCustomElement(
              domElement,
              tag,
              defaultChecked,
              propKey$201,
              nextProps,
              propKey
            );
          return;
        }
    }
    for (var propKey$232 in lastProps)
      propKey$201 = lastProps[propKey$232], lastProps.hasOwnProperty(propKey$232) && null != propKey$201 && !nextProps.hasOwnProperty(propKey$232) && setProp(domElement, tag, propKey$232, null, nextProps, propKey$201);
    for (lastProp in nextProps)
      propKey$201 = nextProps[lastProp], propKey = lastProps[lastProp], !nextProps.hasOwnProperty(lastProp) || propKey$201 === propKey || null == propKey$201 && null == propKey || setProp(domElement, tag, lastProp, propKey$201, nextProps, propKey);
  }
  function isLikelyStaticResource(initiatorType) {
    switch (initiatorType) {
      case "css":
      case "script":
      case "font":
      case "img":
      case "image":
      case "input":
      case "link":
        return true;
      default:
        return false;
    }
  }
  function estimateBandwidth() {
    if ("function" === typeof performance.getEntriesByType) {
      for (var count = 0, bits = 0, resourceEntries = performance.getEntriesByType("resource"), i = 0; i < resourceEntries.length; i++) {
        var entry = resourceEntries[i], transferSize = entry.transferSize, initiatorType = entry.initiatorType, duration = entry.duration;
        if (transferSize && duration && isLikelyStaticResource(initiatorType)) {
          initiatorType = 0;
          duration = entry.responseEnd;
          for (i += 1; i < resourceEntries.length; i++) {
            var overlapEntry = resourceEntries[i], overlapStartTime = overlapEntry.startTime;
            if (overlapStartTime > duration) break;
            var overlapTransferSize = overlapEntry.transferSize, overlapInitiatorType = overlapEntry.initiatorType;
            overlapTransferSize && isLikelyStaticResource(overlapInitiatorType) && (overlapEntry = overlapEntry.responseEnd, initiatorType += overlapTransferSize * (overlapEntry < duration ? 1 : (duration - overlapStartTime) / (overlapEntry - overlapStartTime)));
          }
          --i;
          bits += 8 * (transferSize + initiatorType) / (entry.duration / 1e3);
          count++;
          if (10 < count) break;
        }
      }
      if (0 < count) return bits / count / 1e6;
    }
    return navigator.connection && (count = navigator.connection.downlink, "number" === typeof count) ? count : 5;
  }
  var eventsEnabled = null, selectionInformation = null;
  function getOwnerDocumentFromRootContainer(rootContainerElement) {
    return 9 === rootContainerElement.nodeType ? rootContainerElement : rootContainerElement.ownerDocument;
  }
  function getOwnHostContext(namespaceURI) {
    switch (namespaceURI) {
      case "http://www.w3.org/2000/svg":
        return 1;
      case "http://www.w3.org/1998/Math/MathML":
        return 2;
      default:
        return 0;
    }
  }
  function getChildHostContextProd(parentNamespace, type) {
    if (0 === parentNamespace)
      switch (type) {
        case "svg":
          return 1;
        case "math":
          return 2;
        default:
          return 0;
      }
    return 1 === parentNamespace && "foreignObject" === type ? 0 : parentNamespace;
  }
  function shouldSetTextContent(type, props) {
    return "textarea" === type || "noscript" === type || "string" === typeof props.children || "number" === typeof props.children || "bigint" === typeof props.children || "object" === typeof props.dangerouslySetInnerHTML && null !== props.dangerouslySetInnerHTML && null != props.dangerouslySetInnerHTML.__html;
  }
  var currentPopstateTransitionEvent = null;
  function shouldAttemptEagerTransition() {
    var event = window.event;
    if (event && "popstate" === event.type) {
      if (event === currentPopstateTransitionEvent) return false;
      currentPopstateTransitionEvent = event;
      return true;
    }
    currentPopstateTransitionEvent = null;
    return false;
  }
  var scheduleTimeout = "function" === typeof setTimeout ? setTimeout : void 0, cancelTimeout = "function" === typeof clearTimeout ? clearTimeout : void 0, localPromise = "function" === typeof Promise ? Promise : void 0, scheduleMicrotask = "function" === typeof queueMicrotask ? queueMicrotask : "undefined" !== typeof localPromise ? function(callback) {
    return localPromise.resolve(null).then(callback).catch(handleErrorInNextTick);
  } : scheduleTimeout;
  function handleErrorInNextTick(error) {
    setTimeout(function() {
      throw error;
    });
  }
  function isSingletonScope(type) {
    return "head" === type;
  }
  function clearHydrationBoundary(parentInstance, hydrationInstance) {
    var node = hydrationInstance, depth = 0;
    do {
      var nextNode = node.nextSibling;
      parentInstance.removeChild(node);
      if (nextNode && 8 === nextNode.nodeType)
        if (node = nextNode.data, "/$" === node || "/&" === node) {
          if (0 === depth) {
            parentInstance.removeChild(nextNode);
            retryIfBlockedOn(hydrationInstance);
            return;
          }
          depth--;
        } else if ("$" === node || "$?" === node || "$~" === node || "$!" === node || "&" === node)
          depth++;
        else if ("html" === node)
          releaseSingletonInstance(parentInstance.ownerDocument.documentElement);
        else if ("head" === node) {
          node = parentInstance.ownerDocument.head;
          releaseSingletonInstance(node);
          for (var node$jscomp$0 = node.firstChild; node$jscomp$0; ) {
            var nextNode$jscomp$0 = node$jscomp$0.nextSibling, nodeName = node$jscomp$0.nodeName;
            node$jscomp$0[internalHoistableMarker] || "SCRIPT" === nodeName || "STYLE" === nodeName || "LINK" === nodeName && "stylesheet" === node$jscomp$0.rel.toLowerCase() || node.removeChild(node$jscomp$0);
            node$jscomp$0 = nextNode$jscomp$0;
          }
        } else
          "body" === node && releaseSingletonInstance(parentInstance.ownerDocument.body);
      node = nextNode;
    } while (node);
    retryIfBlockedOn(hydrationInstance);
  }
  function hideOrUnhideDehydratedBoundary(suspenseInstance, isHidden) {
    var node = suspenseInstance;
    suspenseInstance = 0;
    do {
      var nextNode = node.nextSibling;
      1 === node.nodeType ? isHidden ? (node._stashedDisplay = node.style.display, node.style.display = "none") : (node.style.display = node._stashedDisplay || "", "" === node.getAttribute("style") && node.removeAttribute("style")) : 3 === node.nodeType && (isHidden ? (node._stashedText = node.nodeValue, node.nodeValue = "") : node.nodeValue = node._stashedText || "");
      if (nextNode && 8 === nextNode.nodeType)
        if (node = nextNode.data, "/$" === node)
          if (0 === suspenseInstance) break;
          else suspenseInstance--;
        else
          "$" !== node && "$?" !== node && "$~" !== node && "$!" !== node || suspenseInstance++;
      node = nextNode;
    } while (node);
  }
  function clearContainerSparingly(container) {
    var nextNode = container.firstChild;
    nextNode && 10 === nextNode.nodeType && (nextNode = nextNode.nextSibling);
    for (; nextNode; ) {
      var node = nextNode;
      nextNode = nextNode.nextSibling;
      switch (node.nodeName) {
        case "HTML":
        case "HEAD":
        case "BODY":
          clearContainerSparingly(node);
          detachDeletedInstance(node);
          continue;
        case "SCRIPT":
        case "STYLE":
          continue;
        case "LINK":
          if ("stylesheet" === node.rel.toLowerCase()) continue;
      }
      container.removeChild(node);
    }
  }
  function canHydrateInstance(instance, type, props, inRootOrSingleton) {
    for (; 1 === instance.nodeType; ) {
      var anyProps = props;
      if (instance.nodeName.toLowerCase() !== type.toLowerCase()) {
        if (!inRootOrSingleton && ("INPUT" !== instance.nodeName || "hidden" !== instance.type))
          break;
      } else if (!inRootOrSingleton)
        if ("input" === type && "hidden" === instance.type) {
          var name = null == anyProps.name ? null : "" + anyProps.name;
          if ("hidden" === anyProps.type && instance.getAttribute("name") === name)
            return instance;
        } else return instance;
      else if (!instance[internalHoistableMarker])
        switch (type) {
          case "meta":
            if (!instance.hasAttribute("itemprop")) break;
            return instance;
          case "link":
            name = instance.getAttribute("rel");
            if ("stylesheet" === name && instance.hasAttribute("data-precedence"))
              break;
            else if (name !== anyProps.rel || instance.getAttribute("href") !== (null == anyProps.href || "" === anyProps.href ? null : anyProps.href) || instance.getAttribute("crossorigin") !== (null == anyProps.crossOrigin ? null : anyProps.crossOrigin) || instance.getAttribute("title") !== (null == anyProps.title ? null : anyProps.title))
              break;
            return instance;
          case "style":
            if (instance.hasAttribute("data-precedence")) break;
            return instance;
          case "script":
            name = instance.getAttribute("src");
            if ((name !== (null == anyProps.src ? null : anyProps.src) || instance.getAttribute("type") !== (null == anyProps.type ? null : anyProps.type) || instance.getAttribute("crossorigin") !== (null == anyProps.crossOrigin ? null : anyProps.crossOrigin)) && name && instance.hasAttribute("async") && !instance.hasAttribute("itemprop"))
              break;
            return instance;
          default:
            return instance;
        }
      instance = getNextHydratable(instance.nextSibling);
      if (null === instance) break;
    }
    return null;
  }
  function canHydrateTextInstance(instance, text, inRootOrSingleton) {
    if ("" === text) return null;
    for (; 3 !== instance.nodeType; ) {
      if ((1 !== instance.nodeType || "INPUT" !== instance.nodeName || "hidden" !== instance.type) && !inRootOrSingleton)
        return null;
      instance = getNextHydratable(instance.nextSibling);
      if (null === instance) return null;
    }
    return instance;
  }
  function canHydrateHydrationBoundary(instance, inRootOrSingleton) {
    for (; 8 !== instance.nodeType; ) {
      if ((1 !== instance.nodeType || "INPUT" !== instance.nodeName || "hidden" !== instance.type) && !inRootOrSingleton)
        return null;
      instance = getNextHydratable(instance.nextSibling);
      if (null === instance) return null;
    }
    return instance;
  }
  function isSuspenseInstancePending(instance) {
    return "$?" === instance.data || "$~" === instance.data;
  }
  function isSuspenseInstanceFallback(instance) {
    return "$!" === instance.data || "$?" === instance.data && "loading" !== instance.ownerDocument.readyState;
  }
  function registerSuspenseInstanceRetry(instance, callback) {
    var ownerDocument = instance.ownerDocument;
    if ("$~" === instance.data) instance._reactRetry = callback;
    else if ("$?" !== instance.data || "loading" !== ownerDocument.readyState)
      callback();
    else {
      var listener = function() {
        callback();
        ownerDocument.removeEventListener("DOMContentLoaded", listener);
      };
      ownerDocument.addEventListener("DOMContentLoaded", listener);
      instance._reactRetry = listener;
    }
  }
  function getNextHydratable(node) {
    for (; null != node; node = node.nextSibling) {
      var nodeType = node.nodeType;
      if (1 === nodeType || 3 === nodeType) break;
      if (8 === nodeType) {
        nodeType = node.data;
        if ("$" === nodeType || "$!" === nodeType || "$?" === nodeType || "$~" === nodeType || "&" === nodeType || "F!" === nodeType || "F" === nodeType)
          break;
        if ("/$" === nodeType || "/&" === nodeType) return null;
      }
    }
    return node;
  }
  var previousHydratableOnEnteringScopedSingleton = null;
  function getNextHydratableInstanceAfterHydrationBoundary(hydrationInstance) {
    hydrationInstance = hydrationInstance.nextSibling;
    for (var depth = 0; hydrationInstance; ) {
      if (8 === hydrationInstance.nodeType) {
        var data = hydrationInstance.data;
        if ("/$" === data || "/&" === data) {
          if (0 === depth)
            return getNextHydratable(hydrationInstance.nextSibling);
          depth--;
        } else
          "$" !== data && "$!" !== data && "$?" !== data && "$~" !== data && "&" !== data || depth++;
      }
      hydrationInstance = hydrationInstance.nextSibling;
    }
    return null;
  }
  function getParentHydrationBoundary(targetInstance) {
    targetInstance = targetInstance.previousSibling;
    for (var depth = 0; targetInstance; ) {
      if (8 === targetInstance.nodeType) {
        var data = targetInstance.data;
        if ("$" === data || "$!" === data || "$?" === data || "$~" === data || "&" === data) {
          if (0 === depth) return targetInstance;
          depth--;
        } else "/$" !== data && "/&" !== data || depth++;
      }
      targetInstance = targetInstance.previousSibling;
    }
    return null;
  }
  function resolveSingletonInstance(type, props, rootContainerInstance) {
    props = getOwnerDocumentFromRootContainer(rootContainerInstance);
    switch (type) {
      case "html":
        type = props.documentElement;
        if (!type) throw Error(formatProdErrorMessage(452));
        return type;
      case "head":
        type = props.head;
        if (!type) throw Error(formatProdErrorMessage(453));
        return type;
      case "body":
        type = props.body;
        if (!type) throw Error(formatProdErrorMessage(454));
        return type;
      default:
        throw Error(formatProdErrorMessage(451));
    }
  }
  function releaseSingletonInstance(instance) {
    for (var attributes = instance.attributes; attributes.length; )
      instance.removeAttributeNode(attributes[0]);
    detachDeletedInstance(instance);
  }
  var preloadPropsMap = /* @__PURE__ */ new Map(), preconnectsSet = /* @__PURE__ */ new Set();
  function getHoistableRoot(container) {
    return "function" === typeof container.getRootNode ? container.getRootNode() : 9 === container.nodeType ? container : container.ownerDocument;
  }
  var previousDispatcher = ReactDOMSharedInternals.d;
  ReactDOMSharedInternals.d = {
    f: flushSyncWork,
    r: requestFormReset,
    D: prefetchDNS,
    C: preconnect,
    L: preload,
    m: preloadModule,
    X: preinitScript,
    S: preinitStyle,
    M: preinitModuleScript
  };
  function flushSyncWork() {
    var previousWasRendering = previousDispatcher.f(), wasRendering = flushSyncWork$1();
    return previousWasRendering || wasRendering;
  }
  function requestFormReset(form) {
    var formInst = getInstanceFromNode(form);
    null !== formInst && 5 === formInst.tag && "form" === formInst.type ? requestFormReset$1(formInst) : previousDispatcher.r(form);
  }
  var globalDocument = "undefined" === typeof document ? null : document;
  function preconnectAs(rel, href, crossOrigin) {
    var ownerDocument = globalDocument;
    if (ownerDocument && "string" === typeof href && href) {
      var limitedEscapedHref = escapeSelectorAttributeValueInsideDoubleQuotes(href);
      limitedEscapedHref = 'link[rel="' + rel + '"][href="' + limitedEscapedHref + '"]';
      "string" === typeof crossOrigin && (limitedEscapedHref += '[crossorigin="' + crossOrigin + '"]');
      preconnectsSet.has(limitedEscapedHref) || (preconnectsSet.add(limitedEscapedHref), rel = { rel, crossOrigin, href }, null === ownerDocument.querySelector(limitedEscapedHref) && (href = ownerDocument.createElement("link"), setInitialProperties(href, "link", rel), markNodeAsHoistable(href), ownerDocument.head.appendChild(href)));
    }
  }
  function prefetchDNS(href) {
    previousDispatcher.D(href);
    preconnectAs("dns-prefetch", href, null);
  }
  function preconnect(href, crossOrigin) {
    previousDispatcher.C(href, crossOrigin);
    preconnectAs("preconnect", href, crossOrigin);
  }
  function preload(href, as, options2) {
    previousDispatcher.L(href, as, options2);
    var ownerDocument = globalDocument;
    if (ownerDocument && href && as) {
      var preloadSelector = 'link[rel="preload"][as="' + escapeSelectorAttributeValueInsideDoubleQuotes(as) + '"]';
      "image" === as ? options2 && options2.imageSrcSet ? (preloadSelector += '[imagesrcset="' + escapeSelectorAttributeValueInsideDoubleQuotes(
        options2.imageSrcSet
      ) + '"]', "string" === typeof options2.imageSizes && (preloadSelector += '[imagesizes="' + escapeSelectorAttributeValueInsideDoubleQuotes(
        options2.imageSizes
      ) + '"]')) : preloadSelector += '[href="' + escapeSelectorAttributeValueInsideDoubleQuotes(href) + '"]' : preloadSelector += '[href="' + escapeSelectorAttributeValueInsideDoubleQuotes(href) + '"]';
      var key = preloadSelector;
      switch (as) {
        case "style":
          key = getStyleKey(href);
          break;
        case "script":
          key = getScriptKey(href);
      }
      preloadPropsMap.has(key) || (href = assign(
        {
          rel: "preload",
          href: "image" === as && options2 && options2.imageSrcSet ? void 0 : href,
          as
        },
        options2
      ), preloadPropsMap.set(key, href), null !== ownerDocument.querySelector(preloadSelector) || "style" === as && ownerDocument.querySelector(getStylesheetSelectorFromKey(key)) || "script" === as && ownerDocument.querySelector(getScriptSelectorFromKey(key)) || (as = ownerDocument.createElement("link"), setInitialProperties(as, "link", href), markNodeAsHoistable(as), ownerDocument.head.appendChild(as)));
    }
  }
  function preloadModule(href, options2) {
    previousDispatcher.m(href, options2);
    var ownerDocument = globalDocument;
    if (ownerDocument && href) {
      var as = options2 && "string" === typeof options2.as ? options2.as : "script", preloadSelector = 'link[rel="modulepreload"][as="' + escapeSelectorAttributeValueInsideDoubleQuotes(as) + '"][href="' + escapeSelectorAttributeValueInsideDoubleQuotes(href) + '"]', key = preloadSelector;
      switch (as) {
        case "audioworklet":
        case "paintworklet":
        case "serviceworker":
        case "sharedworker":
        case "worker":
        case "script":
          key = getScriptKey(href);
      }
      if (!preloadPropsMap.has(key) && (href = assign({ rel: "modulepreload", href }, options2), preloadPropsMap.set(key, href), null === ownerDocument.querySelector(preloadSelector))) {
        switch (as) {
          case "audioworklet":
          case "paintworklet":
          case "serviceworker":
          case "sharedworker":
          case "worker":
          case "script":
            if (ownerDocument.querySelector(getScriptSelectorFromKey(key)))
              return;
        }
        as = ownerDocument.createElement("link");
        setInitialProperties(as, "link", href);
        markNodeAsHoistable(as);
        ownerDocument.head.appendChild(as);
      }
    }
  }
  function preinitStyle(href, precedence, options2) {
    previousDispatcher.S(href, precedence, options2);
    var ownerDocument = globalDocument;
    if (ownerDocument && href) {
      var styles = getResourcesFromRoot(ownerDocument).hoistableStyles, key = getStyleKey(href);
      precedence = precedence || "default";
      var resource = styles.get(key);
      if (!resource) {
        var state = { loading: 0, preload: null };
        if (resource = ownerDocument.querySelector(
          getStylesheetSelectorFromKey(key)
        ))
          state.loading = 5;
        else {
          href = assign(
            { rel: "stylesheet", href, "data-precedence": precedence },
            options2
          );
          (options2 = preloadPropsMap.get(key)) && adoptPreloadPropsForStylesheet(href, options2);
          var link = resource = ownerDocument.createElement("link");
          markNodeAsHoistable(link);
          setInitialProperties(link, "link", href);
          link._p = new Promise(function(resolve, reject) {
            link.onload = resolve;
            link.onerror = reject;
          });
          link.addEventListener("load", function() {
            state.loading |= 1;
          });
          link.addEventListener("error", function() {
            state.loading |= 2;
          });
          state.loading |= 4;
          insertStylesheet(resource, precedence, ownerDocument);
        }
        resource = {
          type: "stylesheet",
          instance: resource,
          count: 1,
          state
        };
        styles.set(key, resource);
      }
    }
  }
  function preinitScript(src, options2) {
    previousDispatcher.X(src, options2);
    var ownerDocument = globalDocument;
    if (ownerDocument && src) {
      var scripts = getResourcesFromRoot(ownerDocument).hoistableScripts, key = getScriptKey(src), resource = scripts.get(key);
      resource || (resource = ownerDocument.querySelector(getScriptSelectorFromKey(key)), resource || (src = assign({ src, async: true }, options2), (options2 = preloadPropsMap.get(key)) && adoptPreloadPropsForScript(src, options2), resource = ownerDocument.createElement("script"), markNodeAsHoistable(resource), setInitialProperties(resource, "link", src), ownerDocument.head.appendChild(resource)), resource = {
        type: "script",
        instance: resource,
        count: 1,
        state: null
      }, scripts.set(key, resource));
    }
  }
  function preinitModuleScript(src, options2) {
    previousDispatcher.M(src, options2);
    var ownerDocument = globalDocument;
    if (ownerDocument && src) {
      var scripts = getResourcesFromRoot(ownerDocument).hoistableScripts, key = getScriptKey(src), resource = scripts.get(key);
      resource || (resource = ownerDocument.querySelector(getScriptSelectorFromKey(key)), resource || (src = assign({ src, async: true, type: "module" }, options2), (options2 = preloadPropsMap.get(key)) && adoptPreloadPropsForScript(src, options2), resource = ownerDocument.createElement("script"), markNodeAsHoistable(resource), setInitialProperties(resource, "link", src), ownerDocument.head.appendChild(resource)), resource = {
        type: "script",
        instance: resource,
        count: 1,
        state: null
      }, scripts.set(key, resource));
    }
  }
  function getResource(type, currentProps, pendingProps, currentResource) {
    var JSCompiler_inline_result = (JSCompiler_inline_result = rootInstanceStackCursor.current) ? getHoistableRoot(JSCompiler_inline_result) : null;
    if (!JSCompiler_inline_result) throw Error(formatProdErrorMessage(446));
    switch (type) {
      case "meta":
      case "title":
        return null;
      case "style":
        return "string" === typeof pendingProps.precedence && "string" === typeof pendingProps.href ? (currentProps = getStyleKey(pendingProps.href), pendingProps = getResourcesFromRoot(
          JSCompiler_inline_result
        ).hoistableStyles, currentResource = pendingProps.get(currentProps), currentResource || (currentResource = {
          type: "style",
          instance: null,
          count: 0,
          state: null
        }, pendingProps.set(currentProps, currentResource)), currentResource) : { type: "void", instance: null, count: 0, state: null };
      case "link":
        if ("stylesheet" === pendingProps.rel && "string" === typeof pendingProps.href && "string" === typeof pendingProps.precedence) {
          type = getStyleKey(pendingProps.href);
          var styles$243 = getResourcesFromRoot(
            JSCompiler_inline_result
          ).hoistableStyles, resource$244 = styles$243.get(type);
          resource$244 || (JSCompiler_inline_result = JSCompiler_inline_result.ownerDocument || JSCompiler_inline_result, resource$244 = {
            type: "stylesheet",
            instance: null,
            count: 0,
            state: { loading: 0, preload: null }
          }, styles$243.set(type, resource$244), (styles$243 = JSCompiler_inline_result.querySelector(
            getStylesheetSelectorFromKey(type)
          )) && !styles$243._p && (resource$244.instance = styles$243, resource$244.state.loading = 5), preloadPropsMap.has(type) || (pendingProps = {
            rel: "preload",
            as: "style",
            href: pendingProps.href,
            crossOrigin: pendingProps.crossOrigin,
            integrity: pendingProps.integrity,
            media: pendingProps.media,
            hrefLang: pendingProps.hrefLang,
            referrerPolicy: pendingProps.referrerPolicy
          }, preloadPropsMap.set(type, pendingProps), styles$243 || preloadStylesheet(
            JSCompiler_inline_result,
            type,
            pendingProps,
            resource$244.state
          )));
          if (currentProps && null === currentResource)
            throw Error(formatProdErrorMessage(528, ""));
          return resource$244;
        }
        if (currentProps && null !== currentResource)
          throw Error(formatProdErrorMessage(529, ""));
        return null;
      case "script":
        return currentProps = pendingProps.async, pendingProps = pendingProps.src, "string" === typeof pendingProps && currentProps && "function" !== typeof currentProps && "symbol" !== typeof currentProps ? (currentProps = getScriptKey(pendingProps), pendingProps = getResourcesFromRoot(
          JSCompiler_inline_result
        ).hoistableScripts, currentResource = pendingProps.get(currentProps), currentResource || (currentResource = {
          type: "script",
          instance: null,
          count: 0,
          state: null
        }, pendingProps.set(currentProps, currentResource)), currentResource) : { type: "void", instance: null, count: 0, state: null };
      default:
        throw Error(formatProdErrorMessage(444, type));
    }
  }
  function getStyleKey(href) {
    return 'href="' + escapeSelectorAttributeValueInsideDoubleQuotes(href) + '"';
  }
  function getStylesheetSelectorFromKey(key) {
    return 'link[rel="stylesheet"][' + key + "]";
  }
  function stylesheetPropsFromRawProps(rawProps) {
    return assign({}, rawProps, {
      "data-precedence": rawProps.precedence,
      precedence: null
    });
  }
  function preloadStylesheet(ownerDocument, key, preloadProps, state) {
    ownerDocument.querySelector('link[rel="preload"][as="style"][' + key + "]") ? state.loading = 1 : (key = ownerDocument.createElement("link"), state.preload = key, key.addEventListener("load", function() {
      return state.loading |= 1;
    }), key.addEventListener("error", function() {
      return state.loading |= 2;
    }), setInitialProperties(key, "link", preloadProps), markNodeAsHoistable(key), ownerDocument.head.appendChild(key));
  }
  function getScriptKey(src) {
    return '[src="' + escapeSelectorAttributeValueInsideDoubleQuotes(src) + '"]';
  }
  function getScriptSelectorFromKey(key) {
    return "script[async]" + key;
  }
  function acquireResource(hoistableRoot, resource, props) {
    resource.count++;
    if (null === resource.instance)
      switch (resource.type) {
        case "style":
          var instance = hoistableRoot.querySelector(
            'style[data-href~="' + escapeSelectorAttributeValueInsideDoubleQuotes(props.href) + '"]'
          );
          if (instance)
            return resource.instance = instance, markNodeAsHoistable(instance), instance;
          var styleProps = assign({}, props, {
            "data-href": props.href,
            "data-precedence": props.precedence,
            href: null,
            precedence: null
          });
          instance = (hoistableRoot.ownerDocument || hoistableRoot).createElement(
            "style"
          );
          markNodeAsHoistable(instance);
          setInitialProperties(instance, "style", styleProps);
          insertStylesheet(instance, props.precedence, hoistableRoot);
          return resource.instance = instance;
        case "stylesheet":
          styleProps = getStyleKey(props.href);
          var instance$249 = hoistableRoot.querySelector(
            getStylesheetSelectorFromKey(styleProps)
          );
          if (instance$249)
            return resource.state.loading |= 4, resource.instance = instance$249, markNodeAsHoistable(instance$249), instance$249;
          instance = stylesheetPropsFromRawProps(props);
          (styleProps = preloadPropsMap.get(styleProps)) && adoptPreloadPropsForStylesheet(instance, styleProps);
          instance$249 = (hoistableRoot.ownerDocument || hoistableRoot).createElement("link");
          markNodeAsHoistable(instance$249);
          var linkInstance = instance$249;
          linkInstance._p = new Promise(function(resolve, reject) {
            linkInstance.onload = resolve;
            linkInstance.onerror = reject;
          });
          setInitialProperties(instance$249, "link", instance);
          resource.state.loading |= 4;
          insertStylesheet(instance$249, props.precedence, hoistableRoot);
          return resource.instance = instance$249;
        case "script":
          instance$249 = getScriptKey(props.src);
          if (styleProps = hoistableRoot.querySelector(
            getScriptSelectorFromKey(instance$249)
          ))
            return resource.instance = styleProps, markNodeAsHoistable(styleProps), styleProps;
          instance = props;
          if (styleProps = preloadPropsMap.get(instance$249))
            instance = assign({}, props), adoptPreloadPropsForScript(instance, styleProps);
          hoistableRoot = hoistableRoot.ownerDocument || hoistableRoot;
          styleProps = hoistableRoot.createElement("script");
          markNodeAsHoistable(styleProps);
          setInitialProperties(styleProps, "link", instance);
          hoistableRoot.head.appendChild(styleProps);
          return resource.instance = styleProps;
        case "void":
          return null;
        default:
          throw Error(formatProdErrorMessage(443, resource.type));
      }
    else
      "stylesheet" === resource.type && 0 === (resource.state.loading & 4) && (instance = resource.instance, resource.state.loading |= 4, insertStylesheet(instance, props.precedence, hoistableRoot));
    return resource.instance;
  }
  function insertStylesheet(instance, precedence, root2) {
    for (var nodes = root2.querySelectorAll(
      'link[rel="stylesheet"][data-precedence],style[data-precedence]'
    ), last = nodes.length ? nodes[nodes.length - 1] : null, prior = last, i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node.dataset.precedence === precedence) prior = node;
      else if (prior !== last) break;
    }
    prior ? prior.parentNode.insertBefore(instance, prior.nextSibling) : (precedence = 9 === root2.nodeType ? root2.head : root2, precedence.insertBefore(instance, precedence.firstChild));
  }
  function adoptPreloadPropsForStylesheet(stylesheetProps, preloadProps) {
    null == stylesheetProps.crossOrigin && (stylesheetProps.crossOrigin = preloadProps.crossOrigin);
    null == stylesheetProps.referrerPolicy && (stylesheetProps.referrerPolicy = preloadProps.referrerPolicy);
    null == stylesheetProps.title && (stylesheetProps.title = preloadProps.title);
  }
  function adoptPreloadPropsForScript(scriptProps, preloadProps) {
    null == scriptProps.crossOrigin && (scriptProps.crossOrigin = preloadProps.crossOrigin);
    null == scriptProps.referrerPolicy && (scriptProps.referrerPolicy = preloadProps.referrerPolicy);
    null == scriptProps.integrity && (scriptProps.integrity = preloadProps.integrity);
  }
  var tagCaches = null;
  function getHydratableHoistableCache(type, keyAttribute, ownerDocument) {
    if (null === tagCaches) {
      var cache = /* @__PURE__ */ new Map();
      var caches = tagCaches = /* @__PURE__ */ new Map();
      caches.set(ownerDocument, cache);
    } else
      caches = tagCaches, cache = caches.get(ownerDocument), cache || (cache = /* @__PURE__ */ new Map(), caches.set(ownerDocument, cache));
    if (cache.has(type)) return cache;
    cache.set(type, null);
    ownerDocument = ownerDocument.getElementsByTagName(type);
    for (caches = 0; caches < ownerDocument.length; caches++) {
      var node = ownerDocument[caches];
      if (!(node[internalHoistableMarker] || node[internalInstanceKey] || "link" === type && "stylesheet" === node.getAttribute("rel")) && "http://www.w3.org/2000/svg" !== node.namespaceURI) {
        var nodeKey = node.getAttribute(keyAttribute) || "";
        nodeKey = type + nodeKey;
        var existing = cache.get(nodeKey);
        existing ? existing.push(node) : cache.set(nodeKey, [node]);
      }
    }
    return cache;
  }
  function mountHoistable(hoistableRoot, type, instance) {
    hoistableRoot = hoistableRoot.ownerDocument || hoistableRoot;
    hoistableRoot.head.insertBefore(
      instance,
      "title" === type ? hoistableRoot.querySelector("head > title") : null
    );
  }
  function isHostHoistableType(type, props, hostContext) {
    if (1 === hostContext || null != props.itemProp) return false;
    switch (type) {
      case "meta":
      case "title":
        return true;
      case "style":
        if ("string" !== typeof props.precedence || "string" !== typeof props.href || "" === props.href)
          break;
        return true;
      case "link":
        if ("string" !== typeof props.rel || "string" !== typeof props.href || "" === props.href || props.onLoad || props.onError)
          break;
        switch (props.rel) {
          case "stylesheet":
            return type = props.disabled, "string" === typeof props.precedence && null == type;
          default:
            return true;
        }
      case "script":
        if (props.async && "function" !== typeof props.async && "symbol" !== typeof props.async && !props.onLoad && !props.onError && props.src && "string" === typeof props.src)
          return true;
    }
    return false;
  }
  function preloadResource(resource) {
    return "stylesheet" === resource.type && 0 === (resource.state.loading & 3) ? false : true;
  }
  function suspendResource(state, hoistableRoot, resource, props) {
    if ("stylesheet" === resource.type && ("string" !== typeof props.media || false !== matchMedia(props.media).matches) && 0 === (resource.state.loading & 4)) {
      if (null === resource.instance) {
        var key = getStyleKey(props.href), instance = hoistableRoot.querySelector(
          getStylesheetSelectorFromKey(key)
        );
        if (instance) {
          hoistableRoot = instance._p;
          null !== hoistableRoot && "object" === typeof hoistableRoot && "function" === typeof hoistableRoot.then && (state.count++, state = onUnsuspend.bind(state), hoistableRoot.then(state, state));
          resource.state.loading |= 4;
          resource.instance = instance;
          markNodeAsHoistable(instance);
          return;
        }
        instance = hoistableRoot.ownerDocument || hoistableRoot;
        props = stylesheetPropsFromRawProps(props);
        (key = preloadPropsMap.get(key)) && adoptPreloadPropsForStylesheet(props, key);
        instance = instance.createElement("link");
        markNodeAsHoistable(instance);
        var linkInstance = instance;
        linkInstance._p = new Promise(function(resolve, reject) {
          linkInstance.onload = resolve;
          linkInstance.onerror = reject;
        });
        setInitialProperties(instance, "link", props);
        resource.instance = instance;
      }
      null === state.stylesheets && (state.stylesheets = /* @__PURE__ */ new Map());
      state.stylesheets.set(resource, hoistableRoot);
      (hoistableRoot = resource.state.preload) && 0 === (resource.state.loading & 3) && (state.count++, resource = onUnsuspend.bind(state), hoistableRoot.addEventListener("load", resource), hoistableRoot.addEventListener("error", resource));
    }
  }
  var estimatedBytesWithinLimit = 0;
  function waitForCommitToBeReady(state, timeoutOffset) {
    state.stylesheets && 0 === state.count && insertSuspendedStylesheets(state, state.stylesheets);
    return 0 < state.count || 0 < state.imgCount ? function(commit) {
      var stylesheetTimer = setTimeout(function() {
        state.stylesheets && insertSuspendedStylesheets(state, state.stylesheets);
        if (state.unsuspend) {
          var unsuspend = state.unsuspend;
          state.unsuspend = null;
          unsuspend();
        }
      }, 6e4 + timeoutOffset);
      0 < state.imgBytes && 0 === estimatedBytesWithinLimit && (estimatedBytesWithinLimit = 62500 * estimateBandwidth());
      var imgTimer = setTimeout(
        function() {
          state.waitingForImages = false;
          if (0 === state.count && (state.stylesheets && insertSuspendedStylesheets(state, state.stylesheets), state.unsuspend)) {
            var unsuspend = state.unsuspend;
            state.unsuspend = null;
            unsuspend();
          }
        },
        (state.imgBytes > estimatedBytesWithinLimit ? 50 : 800) + timeoutOffset
      );
      state.unsuspend = commit;
      return function() {
        state.unsuspend = null;
        clearTimeout(stylesheetTimer);
        clearTimeout(imgTimer);
      };
    } : null;
  }
  function onUnsuspend() {
    this.count--;
    if (0 === this.count && (0 === this.imgCount || !this.waitingForImages)) {
      if (this.stylesheets) insertSuspendedStylesheets(this, this.stylesheets);
      else if (this.unsuspend) {
        var unsuspend = this.unsuspend;
        this.unsuspend = null;
        unsuspend();
      }
    }
  }
  var precedencesByRoot = null;
  function insertSuspendedStylesheets(state, resources) {
    state.stylesheets = null;
    null !== state.unsuspend && (state.count++, precedencesByRoot = /* @__PURE__ */ new Map(), resources.forEach(insertStylesheetIntoRoot, state), precedencesByRoot = null, onUnsuspend.call(state));
  }
  function insertStylesheetIntoRoot(root2, resource) {
    if (!(resource.state.loading & 4)) {
      var precedences = precedencesByRoot.get(root2);
      if (precedences) var last = precedences.get(null);
      else {
        precedences = /* @__PURE__ */ new Map();
        precedencesByRoot.set(root2, precedences);
        for (var nodes = root2.querySelectorAll(
          "link[data-precedence],style[data-precedence]"
        ), i = 0; i < nodes.length; i++) {
          var node = nodes[i];
          if ("LINK" === node.nodeName || "not all" !== node.getAttribute("media"))
            precedences.set(node.dataset.precedence, node), last = node;
        }
        last && precedences.set(null, last);
      }
      nodes = resource.instance;
      node = nodes.getAttribute("data-precedence");
      i = precedences.get(node) || last;
      i === last && precedences.set(null, nodes);
      precedences.set(node, nodes);
      this.count++;
      last = onUnsuspend.bind(this);
      nodes.addEventListener("load", last);
      nodes.addEventListener("error", last);
      i ? i.parentNode.insertBefore(nodes, i.nextSibling) : (root2 = 9 === root2.nodeType ? root2.head : root2, root2.insertBefore(nodes, root2.firstChild));
      resource.state.loading |= 4;
    }
  }
  var HostTransitionContext = {
    $$typeof: REACT_CONTEXT_TYPE,
    Provider: null,
    Consumer: null,
    _currentValue: sharedNotPendingObject,
    _currentValue2: sharedNotPendingObject,
    _threadCount: 0
  };
  function FiberRootNode(containerInfo, tag, hydrate, identifierPrefix, onUncaughtError, onCaughtError, onRecoverableError, onDefaultTransitionIndicator, formState) {
    this.tag = 1;
    this.containerInfo = containerInfo;
    this.pingCache = this.current = this.pendingChildren = null;
    this.timeoutHandle = -1;
    this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null;
    this.callbackPriority = 0;
    this.expirationTimes = createLaneMap(-1);
    this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0;
    this.entanglements = createLaneMap(0);
    this.hiddenUpdates = createLaneMap(null);
    this.identifierPrefix = identifierPrefix;
    this.onUncaughtError = onUncaughtError;
    this.onCaughtError = onCaughtError;
    this.onRecoverableError = onRecoverableError;
    this.pooledCache = null;
    this.pooledCacheLanes = 0;
    this.formState = formState;
    this.incompleteTransitions = /* @__PURE__ */ new Map();
  }
  function createFiberRoot(containerInfo, tag, hydrate, initialChildren, hydrationCallbacks, isStrictMode, identifierPrefix, formState, onUncaughtError, onCaughtError, onRecoverableError, onDefaultTransitionIndicator) {
    containerInfo = new FiberRootNode(
      containerInfo,
      tag,
      hydrate,
      identifierPrefix,
      onUncaughtError,
      onCaughtError,
      onRecoverableError,
      onDefaultTransitionIndicator,
      formState
    );
    tag = 1;
    true === isStrictMode && (tag |= 24);
    isStrictMode = createFiberImplClass(3, null, null, tag);
    containerInfo.current = isStrictMode;
    isStrictMode.stateNode = containerInfo;
    tag = createCache();
    tag.refCount++;
    containerInfo.pooledCache = tag;
    tag.refCount++;
    isStrictMode.memoizedState = {
      element: initialChildren,
      isDehydrated: hydrate,
      cache: tag
    };
    initializeUpdateQueue(isStrictMode);
    return containerInfo;
  }
  function getContextForSubtree(parentComponent) {
    if (!parentComponent) return emptyContextObject;
    parentComponent = emptyContextObject;
    return parentComponent;
  }
  function updateContainerImpl(rootFiber, lane, element, container, parentComponent, callback) {
    parentComponent = getContextForSubtree(parentComponent);
    null === container.context ? container.context = parentComponent : container.pendingContext = parentComponent;
    container = createUpdate(lane);
    container.payload = { element };
    callback = void 0 === callback ? null : callback;
    null !== callback && (container.callback = callback);
    element = enqueueUpdate(rootFiber, container, lane);
    null !== element && (scheduleUpdateOnFiber(element, rootFiber, lane), entangleTransitions(element, rootFiber, lane));
  }
  function markRetryLaneImpl(fiber, retryLane) {
    fiber = fiber.memoizedState;
    if (null !== fiber && null !== fiber.dehydrated) {
      var a = fiber.retryLane;
      fiber.retryLane = 0 !== a && a < retryLane ? a : retryLane;
    }
  }
  function markRetryLaneIfNotHydrated(fiber, retryLane) {
    markRetryLaneImpl(fiber, retryLane);
    (fiber = fiber.alternate) && markRetryLaneImpl(fiber, retryLane);
  }
  function attemptContinuousHydration(fiber) {
    if (13 === fiber.tag || 31 === fiber.tag) {
      var root2 = enqueueConcurrentRenderForLane(fiber, 67108864);
      null !== root2 && scheduleUpdateOnFiber(root2, fiber, 67108864);
      markRetryLaneIfNotHydrated(fiber, 67108864);
    }
  }
  function attemptHydrationAtCurrentPriority(fiber) {
    if (13 === fiber.tag || 31 === fiber.tag) {
      var lane = requestUpdateLane();
      lane = getBumpedLaneForHydrationByLane(lane);
      var root2 = enqueueConcurrentRenderForLane(fiber, lane);
      null !== root2 && scheduleUpdateOnFiber(root2, fiber, lane);
      markRetryLaneIfNotHydrated(fiber, lane);
    }
  }
  var _enabled = true;
  function dispatchDiscreteEvent(domEventName, eventSystemFlags, container, nativeEvent) {
    var prevTransition = ReactSharedInternals.T;
    ReactSharedInternals.T = null;
    var previousPriority = ReactDOMSharedInternals.p;
    try {
      ReactDOMSharedInternals.p = 2, dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent);
    } finally {
      ReactDOMSharedInternals.p = previousPriority, ReactSharedInternals.T = prevTransition;
    }
  }
  function dispatchContinuousEvent(domEventName, eventSystemFlags, container, nativeEvent) {
    var prevTransition = ReactSharedInternals.T;
    ReactSharedInternals.T = null;
    var previousPriority = ReactDOMSharedInternals.p;
    try {
      ReactDOMSharedInternals.p = 8, dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent);
    } finally {
      ReactDOMSharedInternals.p = previousPriority, ReactSharedInternals.T = prevTransition;
    }
  }
  function dispatchEvent(domEventName, eventSystemFlags, targetContainer, nativeEvent) {
    if (_enabled) {
      var blockedOn = findInstanceBlockingEvent(nativeEvent);
      if (null === blockedOn)
        dispatchEventForPluginEventSystem(
          domEventName,
          eventSystemFlags,
          nativeEvent,
          return_targetInst,
          targetContainer
        ), clearIfContinuousEvent(domEventName, nativeEvent);
      else if (queueIfContinuousEvent(
        blockedOn,
        domEventName,
        eventSystemFlags,
        targetContainer,
        nativeEvent
      ))
        nativeEvent.stopPropagation();
      else if (clearIfContinuousEvent(domEventName, nativeEvent), eventSystemFlags & 4 && -1 < discreteReplayableEvents.indexOf(domEventName)) {
        for (; null !== blockedOn; ) {
          var fiber = getInstanceFromNode(blockedOn);
          if (null !== fiber)
            switch (fiber.tag) {
              case 3:
                fiber = fiber.stateNode;
                if (fiber.current.memoizedState.isDehydrated) {
                  var lanes = getHighestPriorityLanes(fiber.pendingLanes);
                  if (0 !== lanes) {
                    var root2 = fiber;
                    root2.pendingLanes |= 2;
                    for (root2.entangledLanes |= 2; lanes; ) {
                      var lane = 1 << 31 - clz32(lanes);
                      root2.entanglements[1] |= lane;
                      lanes &= ~lane;
                    }
                    ensureRootIsScheduled(fiber);
                    0 === (executionContext & 6) && (workInProgressRootRenderTargetTime = now() + 500, flushSyncWorkAcrossRoots_impl(0));
                  }
                }
                break;
              case 31:
              case 13:
                root2 = enqueueConcurrentRenderForLane(fiber, 2), null !== root2 && scheduleUpdateOnFiber(root2, fiber, 2), flushSyncWork$1(), markRetryLaneIfNotHydrated(fiber, 2);
            }
          fiber = findInstanceBlockingEvent(nativeEvent);
          null === fiber && dispatchEventForPluginEventSystem(
            domEventName,
            eventSystemFlags,
            nativeEvent,
            return_targetInst,
            targetContainer
          );
          if (fiber === blockedOn) break;
          blockedOn = fiber;
        }
        null !== blockedOn && nativeEvent.stopPropagation();
      } else
        dispatchEventForPluginEventSystem(
          domEventName,
          eventSystemFlags,
          nativeEvent,
          null,
          targetContainer
        );
    }
  }
  function findInstanceBlockingEvent(nativeEvent) {
    nativeEvent = getEventTarget(nativeEvent);
    return findInstanceBlockingTarget(nativeEvent);
  }
  var return_targetInst = null;
  function findInstanceBlockingTarget(targetNode) {
    return_targetInst = null;
    targetNode = getClosestInstanceFromNode(targetNode);
    if (null !== targetNode) {
      var nearestMounted = getNearestMountedFiber(targetNode);
      if (null === nearestMounted) targetNode = null;
      else {
        var tag = nearestMounted.tag;
        if (13 === tag) {
          targetNode = getSuspenseInstanceFromFiber(nearestMounted);
          if (null !== targetNode) return targetNode;
          targetNode = null;
        } else if (31 === tag) {
          targetNode = getActivityInstanceFromFiber(nearestMounted);
          if (null !== targetNode) return targetNode;
          targetNode = null;
        } else if (3 === tag) {
          if (nearestMounted.stateNode.current.memoizedState.isDehydrated)
            return 3 === nearestMounted.tag ? nearestMounted.stateNode.containerInfo : null;
          targetNode = null;
        } else nearestMounted !== targetNode && (targetNode = null);
      }
    }
    return_targetInst = targetNode;
    return null;
  }
  function getEventPriority(domEventName) {
    switch (domEventName) {
      case "beforetoggle":
      case "cancel":
      case "click":
      case "close":
      case "contextmenu":
      case "copy":
      case "cut":
      case "auxclick":
      case "dblclick":
      case "dragend":
      case "dragstart":
      case "drop":
      case "focusin":
      case "focusout":
      case "input":
      case "invalid":
      case "keydown":
      case "keypress":
      case "keyup":
      case "mousedown":
      case "mouseup":
      case "paste":
      case "pause":
      case "play":
      case "pointercancel":
      case "pointerdown":
      case "pointerup":
      case "ratechange":
      case "reset":
      case "resize":
      case "seeked":
      case "submit":
      case "toggle":
      case "touchcancel":
      case "touchend":
      case "touchstart":
      case "volumechange":
      case "change":
      case "selectionchange":
      case "textInput":
      case "compositionstart":
      case "compositionend":
      case "compositionupdate":
      case "beforeblur":
      case "afterblur":
      case "beforeinput":
      case "blur":
      case "fullscreenchange":
      case "focus":
      case "hashchange":
      case "popstate":
      case "select":
      case "selectstart":
        return 2;
      case "drag":
      case "dragenter":
      case "dragexit":
      case "dragleave":
      case "dragover":
      case "mousemove":
      case "mouseout":
      case "mouseover":
      case "pointermove":
      case "pointerout":
      case "pointerover":
      case "scroll":
      case "touchmove":
      case "wheel":
      case "mouseenter":
      case "mouseleave":
      case "pointerenter":
      case "pointerleave":
        return 8;
      case "message":
        switch (getCurrentPriorityLevel()) {
          case ImmediatePriority:
            return 2;
          case UserBlockingPriority:
            return 8;
          case NormalPriority$1:
          case LowPriority:
            return 32;
          case IdlePriority:
            return 268435456;
          default:
            return 32;
        }
      default:
        return 32;
    }
  }
  var hasScheduledReplayAttempt = false, queuedFocus = null, queuedDrag = null, queuedMouse = null, queuedPointers = /* @__PURE__ */ new Map(), queuedPointerCaptures = /* @__PURE__ */ new Map(), queuedExplicitHydrationTargets = [], discreteReplayableEvents = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(
    " "
  );
  function clearIfContinuousEvent(domEventName, nativeEvent) {
    switch (domEventName) {
      case "focusin":
      case "focusout":
        queuedFocus = null;
        break;
      case "dragenter":
      case "dragleave":
        queuedDrag = null;
        break;
      case "mouseover":
      case "mouseout":
        queuedMouse = null;
        break;
      case "pointerover":
      case "pointerout":
        queuedPointers.delete(nativeEvent.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        queuedPointerCaptures.delete(nativeEvent.pointerId);
    }
  }
  function accumulateOrCreateContinuousQueuedReplayableEvent(existingQueuedEvent, blockedOn, domEventName, eventSystemFlags, targetContainer, nativeEvent) {
    if (null === existingQueuedEvent || existingQueuedEvent.nativeEvent !== nativeEvent)
      return existingQueuedEvent = {
        blockedOn,
        domEventName,
        eventSystemFlags,
        nativeEvent,
        targetContainers: [targetContainer]
      }, null !== blockedOn && (blockedOn = getInstanceFromNode(blockedOn), null !== blockedOn && attemptContinuousHydration(blockedOn)), existingQueuedEvent;
    existingQueuedEvent.eventSystemFlags |= eventSystemFlags;
    blockedOn = existingQueuedEvent.targetContainers;
    null !== targetContainer && -1 === blockedOn.indexOf(targetContainer) && blockedOn.push(targetContainer);
    return existingQueuedEvent;
  }
  function queueIfContinuousEvent(blockedOn, domEventName, eventSystemFlags, targetContainer, nativeEvent) {
    switch (domEventName) {
      case "focusin":
        return queuedFocus = accumulateOrCreateContinuousQueuedReplayableEvent(
          queuedFocus,
          blockedOn,
          domEventName,
          eventSystemFlags,
          targetContainer,
          nativeEvent
        ), true;
      case "dragenter":
        return queuedDrag = accumulateOrCreateContinuousQueuedReplayableEvent(
          queuedDrag,
          blockedOn,
          domEventName,
          eventSystemFlags,
          targetContainer,
          nativeEvent
        ), true;
      case "mouseover":
        return queuedMouse = accumulateOrCreateContinuousQueuedReplayableEvent(
          queuedMouse,
          blockedOn,
          domEventName,
          eventSystemFlags,
          targetContainer,
          nativeEvent
        ), true;
      case "pointerover":
        var pointerId = nativeEvent.pointerId;
        queuedPointers.set(
          pointerId,
          accumulateOrCreateContinuousQueuedReplayableEvent(
            queuedPointers.get(pointerId) || null,
            blockedOn,
            domEventName,
            eventSystemFlags,
            targetContainer,
            nativeEvent
          )
        );
        return true;
      case "gotpointercapture":
        return pointerId = nativeEvent.pointerId, queuedPointerCaptures.set(
          pointerId,
          accumulateOrCreateContinuousQueuedReplayableEvent(
            queuedPointerCaptures.get(pointerId) || null,
            blockedOn,
            domEventName,
            eventSystemFlags,
            targetContainer,
            nativeEvent
          )
        ), true;
    }
    return false;
  }
  function attemptExplicitHydrationTarget(queuedTarget) {
    var targetInst = getClosestInstanceFromNode(queuedTarget.target);
    if (null !== targetInst) {
      var nearestMounted = getNearestMountedFiber(targetInst);
      if (null !== nearestMounted) {
        if (targetInst = nearestMounted.tag, 13 === targetInst) {
          if (targetInst = getSuspenseInstanceFromFiber(nearestMounted), null !== targetInst) {
            queuedTarget.blockedOn = targetInst;
            runWithPriority(queuedTarget.priority, function() {
              attemptHydrationAtCurrentPriority(nearestMounted);
            });
            return;
          }
        } else if (31 === targetInst) {
          if (targetInst = getActivityInstanceFromFiber(nearestMounted), null !== targetInst) {
            queuedTarget.blockedOn = targetInst;
            runWithPriority(queuedTarget.priority, function() {
              attemptHydrationAtCurrentPriority(nearestMounted);
            });
            return;
          }
        } else if (3 === targetInst && nearestMounted.stateNode.current.memoizedState.isDehydrated) {
          queuedTarget.blockedOn = 3 === nearestMounted.tag ? nearestMounted.stateNode.containerInfo : null;
          return;
        }
      }
    }
    queuedTarget.blockedOn = null;
  }
  function attemptReplayContinuousQueuedEvent(queuedEvent) {
    if (null !== queuedEvent.blockedOn) return false;
    for (var targetContainers = queuedEvent.targetContainers; 0 < targetContainers.length; ) {
      var nextBlockedOn = findInstanceBlockingEvent(queuedEvent.nativeEvent);
      if (null === nextBlockedOn) {
        nextBlockedOn = queuedEvent.nativeEvent;
        var nativeEventClone = new nextBlockedOn.constructor(
          nextBlockedOn.type,
          nextBlockedOn
        );
        currentReplayingEvent = nativeEventClone;
        nextBlockedOn.target.dispatchEvent(nativeEventClone);
        currentReplayingEvent = null;
      } else
        return targetContainers = getInstanceFromNode(nextBlockedOn), null !== targetContainers && attemptContinuousHydration(targetContainers), queuedEvent.blockedOn = nextBlockedOn, false;
      targetContainers.shift();
    }
    return true;
  }
  function attemptReplayContinuousQueuedEventInMap(queuedEvent, key, map) {
    attemptReplayContinuousQueuedEvent(queuedEvent) && map.delete(key);
  }
  function replayUnblockedEvents() {
    hasScheduledReplayAttempt = false;
    null !== queuedFocus && attemptReplayContinuousQueuedEvent(queuedFocus) && (queuedFocus = null);
    null !== queuedDrag && attemptReplayContinuousQueuedEvent(queuedDrag) && (queuedDrag = null);
    null !== queuedMouse && attemptReplayContinuousQueuedEvent(queuedMouse) && (queuedMouse = null);
    queuedPointers.forEach(attemptReplayContinuousQueuedEventInMap);
    queuedPointerCaptures.forEach(attemptReplayContinuousQueuedEventInMap);
  }
  function scheduleCallbackIfUnblocked(queuedEvent, unblocked) {
    queuedEvent.blockedOn === unblocked && (queuedEvent.blockedOn = null, hasScheduledReplayAttempt || (hasScheduledReplayAttempt = true, Scheduler.unstable_scheduleCallback(
      Scheduler.unstable_NormalPriority,
      replayUnblockedEvents
    )));
  }
  var lastScheduledReplayQueue = null;
  function scheduleReplayQueueIfNeeded(formReplayingQueue) {
    lastScheduledReplayQueue !== formReplayingQueue && (lastScheduledReplayQueue = formReplayingQueue, Scheduler.unstable_scheduleCallback(
      Scheduler.unstable_NormalPriority,
      function() {
        lastScheduledReplayQueue === formReplayingQueue && (lastScheduledReplayQueue = null);
        for (var i = 0; i < formReplayingQueue.length; i += 3) {
          var form = formReplayingQueue[i], submitterOrAction = formReplayingQueue[i + 1], formData = formReplayingQueue[i + 2];
          if ("function" !== typeof submitterOrAction)
            if (null === findInstanceBlockingTarget(submitterOrAction || form))
              continue;
            else break;
          var formInst = getInstanceFromNode(form);
          null !== formInst && (formReplayingQueue.splice(i, 3), i -= 3, startHostTransition(
            formInst,
            {
              pending: true,
              data: formData,
              method: form.method,
              action: submitterOrAction
            },
            submitterOrAction,
            formData
          ));
        }
      }
    ));
  }
  function retryIfBlockedOn(unblocked) {
    function unblock(queuedEvent) {
      return scheduleCallbackIfUnblocked(queuedEvent, unblocked);
    }
    null !== queuedFocus && scheduleCallbackIfUnblocked(queuedFocus, unblocked);
    null !== queuedDrag && scheduleCallbackIfUnblocked(queuedDrag, unblocked);
    null !== queuedMouse && scheduleCallbackIfUnblocked(queuedMouse, unblocked);
    queuedPointers.forEach(unblock);
    queuedPointerCaptures.forEach(unblock);
    for (var i = 0; i < queuedExplicitHydrationTargets.length; i++) {
      var queuedTarget = queuedExplicitHydrationTargets[i];
      queuedTarget.blockedOn === unblocked && (queuedTarget.blockedOn = null);
    }
    for (; 0 < queuedExplicitHydrationTargets.length && (i = queuedExplicitHydrationTargets[0], null === i.blockedOn); )
      attemptExplicitHydrationTarget(i), null === i.blockedOn && queuedExplicitHydrationTargets.shift();
    i = (unblocked.ownerDocument || unblocked).$$reactFormReplay;
    if (null != i)
      for (queuedTarget = 0; queuedTarget < i.length; queuedTarget += 3) {
        var form = i[queuedTarget], submitterOrAction = i[queuedTarget + 1], formProps = form[internalPropsKey] || null;
        if ("function" === typeof submitterOrAction)
          formProps || scheduleReplayQueueIfNeeded(i);
        else if (formProps) {
          var action = null;
          if (submitterOrAction && submitterOrAction.hasAttribute("formAction"))
            if (form = submitterOrAction, formProps = submitterOrAction[internalPropsKey] || null)
              action = formProps.formAction;
            else {
              if (null !== findInstanceBlockingTarget(form)) continue;
            }
          else action = formProps.action;
          "function" === typeof action ? i[queuedTarget + 1] = action : (i.splice(queuedTarget, 3), queuedTarget -= 3);
          scheduleReplayQueueIfNeeded(i);
        }
      }
  }
  function defaultOnDefaultTransitionIndicator() {
    function handleNavigate(event) {
      event.canIntercept && "react-transition" === event.info && event.intercept({
        handler: function() {
          return new Promise(function(resolve) {
            return pendingResolve = resolve;
          });
        },
        focusReset: "manual",
        scroll: "manual"
      });
    }
    function handleNavigateComplete() {
      null !== pendingResolve && (pendingResolve(), pendingResolve = null);
      isCancelled || setTimeout(startFakeNavigation, 20);
    }
    function startFakeNavigation() {
      if (!isCancelled && !navigation.transition) {
        var currentEntry = navigation.currentEntry;
        currentEntry && null != currentEntry.url && navigation.navigate(currentEntry.url, {
          state: currentEntry.getState(),
          info: "react-transition",
          history: "replace"
        });
      }
    }
    if ("object" === typeof navigation) {
      var isCancelled = false, pendingResolve = null;
      navigation.addEventListener("navigate", handleNavigate);
      navigation.addEventListener("navigatesuccess", handleNavigateComplete);
      navigation.addEventListener("navigateerror", handleNavigateComplete);
      setTimeout(startFakeNavigation, 100);
      return function() {
        isCancelled = true;
        navigation.removeEventListener("navigate", handleNavigate);
        navigation.removeEventListener("navigatesuccess", handleNavigateComplete);
        navigation.removeEventListener("navigateerror", handleNavigateComplete);
        null !== pendingResolve && (pendingResolve(), pendingResolve = null);
      };
    }
  }
  function ReactDOMRoot(internalRoot) {
    this._internalRoot = internalRoot;
  }
  ReactDOMHydrationRoot.prototype.render = ReactDOMRoot.prototype.render = function(children) {
    var root2 = this._internalRoot;
    if (null === root2) throw Error(formatProdErrorMessage(409));
    var current = root2.current, lane = requestUpdateLane();
    updateContainerImpl(current, lane, children, root2, null, null);
  };
  ReactDOMHydrationRoot.prototype.unmount = ReactDOMRoot.prototype.unmount = function() {
    var root2 = this._internalRoot;
    if (null !== root2) {
      this._internalRoot = null;
      var container = root2.containerInfo;
      updateContainerImpl(root2.current, 2, null, root2, null, null);
      flushSyncWork$1();
      container[internalContainerInstanceKey] = null;
    }
  };
  function ReactDOMHydrationRoot(internalRoot) {
    this._internalRoot = internalRoot;
  }
  ReactDOMHydrationRoot.prototype.unstable_scheduleHydration = function(target) {
    if (target) {
      var updatePriority = resolveUpdatePriority();
      target = { blockedOn: null, target, priority: updatePriority };
      for (var i = 0; i < queuedExplicitHydrationTargets.length && 0 !== updatePriority && updatePriority < queuedExplicitHydrationTargets[i].priority; i++) ;
      queuedExplicitHydrationTargets.splice(i, 0, target);
      0 === i && attemptExplicitHydrationTarget(target);
    }
  };
  var isomorphicReactPackageVersion$jscomp$inline_1840 = React2.version;
  if ("19.2.5" !== isomorphicReactPackageVersion$jscomp$inline_1840)
    throw Error(
      formatProdErrorMessage(
        527,
        isomorphicReactPackageVersion$jscomp$inline_1840,
        "19.2.5"
      )
    );
  ReactDOMSharedInternals.findDOMNode = function(componentOrElement) {
    var fiber = componentOrElement._reactInternals;
    if (void 0 === fiber) {
      if ("function" === typeof componentOrElement.render)
        throw Error(formatProdErrorMessage(188));
      componentOrElement = Object.keys(componentOrElement).join(",");
      throw Error(formatProdErrorMessage(268, componentOrElement));
    }
    componentOrElement = findCurrentFiberUsingSlowPath(fiber);
    componentOrElement = null !== componentOrElement ? findCurrentHostFiberImpl(componentOrElement) : null;
    componentOrElement = null === componentOrElement ? null : componentOrElement.stateNode;
    return componentOrElement;
  };
  var internals$jscomp$inline_2347 = {
    bundleType: 0,
    version: "19.2.5",
    rendererPackageName: "react-dom",
    currentDispatcherRef: ReactSharedInternals,
    reconcilerVersion: "19.2.5"
  };
  if ("undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__) {
    var hook$jscomp$inline_2348 = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!hook$jscomp$inline_2348.isDisabled && hook$jscomp$inline_2348.supportsFiber)
      try {
        rendererID = hook$jscomp$inline_2348.inject(
          internals$jscomp$inline_2347
        ), injectedHook = hook$jscomp$inline_2348;
      } catch (err) {
      }
  }
  reactDomClient_production.createRoot = function(container, options2) {
    if (!isValidContainer(container)) throw Error(formatProdErrorMessage(299));
    var isStrictMode = false, identifierPrefix = "", onUncaughtError = defaultOnUncaughtError, onCaughtError = defaultOnCaughtError, onRecoverableError = defaultOnRecoverableError;
    null !== options2 && void 0 !== options2 && (true === options2.unstable_strictMode && (isStrictMode = true), void 0 !== options2.identifierPrefix && (identifierPrefix = options2.identifierPrefix), void 0 !== options2.onUncaughtError && (onUncaughtError = options2.onUncaughtError), void 0 !== options2.onCaughtError && (onCaughtError = options2.onCaughtError), void 0 !== options2.onRecoverableError && (onRecoverableError = options2.onRecoverableError));
    options2 = createFiberRoot(
      container,
      1,
      false,
      null,
      null,
      isStrictMode,
      identifierPrefix,
      null,
      onUncaughtError,
      onCaughtError,
      onRecoverableError,
      defaultOnDefaultTransitionIndicator
    );
    container[internalContainerInstanceKey] = options2.current;
    listenToAllSupportedEvents(container);
    return new ReactDOMRoot(options2);
  };
  reactDomClient_production.hydrateRoot = function(container, initialChildren, options2) {
    if (!isValidContainer(container)) throw Error(formatProdErrorMessage(299));
    var isStrictMode = false, identifierPrefix = "", onUncaughtError = defaultOnUncaughtError, onCaughtError = defaultOnCaughtError, onRecoverableError = defaultOnRecoverableError, formState = null;
    null !== options2 && void 0 !== options2 && (true === options2.unstable_strictMode && (isStrictMode = true), void 0 !== options2.identifierPrefix && (identifierPrefix = options2.identifierPrefix), void 0 !== options2.onUncaughtError && (onUncaughtError = options2.onUncaughtError), void 0 !== options2.onCaughtError && (onCaughtError = options2.onCaughtError), void 0 !== options2.onRecoverableError && (onRecoverableError = options2.onRecoverableError), void 0 !== options2.formState && (formState = options2.formState));
    initialChildren = createFiberRoot(
      container,
      1,
      true,
      initialChildren,
      null != options2 ? options2 : null,
      isStrictMode,
      identifierPrefix,
      formState,
      onUncaughtError,
      onCaughtError,
      onRecoverableError,
      defaultOnDefaultTransitionIndicator
    );
    initialChildren.context = getContextForSubtree(null);
    options2 = initialChildren.current;
    isStrictMode = requestUpdateLane();
    isStrictMode = getBumpedLaneForHydrationByLane(isStrictMode);
    identifierPrefix = createUpdate(isStrictMode);
    identifierPrefix.callback = null;
    enqueueUpdate(options2, identifierPrefix, isStrictMode);
    options2 = isStrictMode;
    initialChildren.current.lanes = options2;
    markRootUpdated$1(initialChildren, options2);
    ensureRootIsScheduled(initialChildren);
    container[internalContainerInstanceKey] = initialChildren.current;
    listenToAllSupportedEvents(container);
    return new ReactDOMHydrationRoot(initialChildren);
  };
  reactDomClient_production.version = "19.2.5";
  return reactDomClient_production;
}
var hasRequiredClient;
function requireClient() {
  if (hasRequiredClient) return client.exports;
  hasRequiredClient = 1;
  function checkDCE() {
    if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === "undefined" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE !== "function") {
      return;
    }
    try {
      __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(checkDCE);
    } catch (err) {
      console.error(err);
    }
  }
  {
    checkDCE();
    client.exports = requireReactDomClient_production();
  }
  return client.exports;
}
var clientExports = requireClient();
function createPostProcessService(options) {
  return {
    process: async (input) => {
      const request = createPostprocessRequest(input);
      try {
        return await options.backendClient.postprocess(request);
      } catch (error) {
        return createFallbackResult(input, error);
      }
    }
  };
}
function createPostprocessRequest(input) {
  return {
    installationId: input.installationId,
    rawText: input.rawText,
    selectedText: input.selectedText,
    appContext: input.appContext,
    mode: input.mode,
    language: input.language,
    style: input.style,
    ...input.targetLanguage ? { targetLanguage: input.targetLanguage } : {},
    dictionaryTerms: input.dictionaryTerms
  };
}
function createFallbackResult(input, error) {
  return {
    action: input.selectedText ? "replace_selection" : "insert",
    finalText: input.rawText,
    confidence: 0,
    usedDictionaryTermIds: [],
    warnings: [`LLM postprocess failed: ${getErrorMessage$1(error)}`]
  };
}
function getErrorMessage$1(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return "unknown error";
}
function encodePcm16ToBase64(pcm) {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}
function createPcmFrameBatcher(options) {
  let pending = new Int16Array(0);
  let pendingTimestampMs = 0;
  let pendingWeightedRmsSquares = 0;
  let hasPending = false;
  const emit = (pcm, timestampMs, weightedRmsSquares) => {
    options.onFrame({
      pcm,
      sampleRate: 16e3,
      timestampMs,
      rms: Math.sqrt(weightedRmsSquares / pcm.length)
    });
  };
  return {
    push: (frame) => {
      if (frame.pcm.length === 0) {
        return;
      }
      if (!hasPending) {
        pendingTimestampMs = frame.timestampMs;
        hasPending = true;
      }
      const merged = new Int16Array(pending.length + frame.pcm.length);
      merged.set(pending, 0);
      merged.set(frame.pcm, pending.length);
      pending = merged;
      pendingWeightedRmsSquares += frame.rms ** 2 * frame.pcm.length;
      while (pending.length >= options.targetSamples) {
        const chunk = pending.slice(0, options.targetSamples);
        const chunkWeightedRmsSquares = pendingWeightedRmsSquares * (options.targetSamples / pending.length);
        emit(chunk, pendingTimestampMs, chunkWeightedRmsSquares);
        pending = pending.slice(options.targetSamples);
        pendingWeightedRmsSquares -= chunkWeightedRmsSquares;
        pendingTimestampMs = frame.timestampMs;
        hasPending = pending.length > 0;
      }
    },
    flush: () => {
      if (!hasPending || pending.length === 0) {
        return;
      }
      emit(pending, pendingTimestampMs, pendingWeightedRmsSquares);
      pending = new Int16Array(0);
      pendingWeightedRmsSquares = 0;
      hasPending = false;
    }
  };
}
const ASR_SEND_RATE_MS = 100;
const ASR_FRAME_SAMPLES = 16e3 * ASR_SEND_RATE_MS / 1e3;
function createBrowserRecorderAdapter(dependencies) {
  return {
    async start(options, handlers) {
      return startBrowserRecording(dependencies, options, handlers);
    }
  };
}
async function startBrowserRecording(dependencies, options, handlers) {
  const stream = await openMicrophoneStream(dependencies.mediaDevices, options);
  const audioContext = new dependencies.AudioContextConstructor({ sampleRate: options.sampleRate });
  const [track] = stream.getAudioTracks();
  console.log(
    `[recorder] mic="${track?.label ?? "unknown"}" requestedSampleRate=${options.sampleRate} actualContextSampleRate=${audioContext.sampleRate} settings=${JSON.stringify(track?.getSettings?.() ?? {})}`
  );
  await audioContext.audioWorklet.addModule(dependencies.workletUrl);
  const source = audioContext.createMediaStreamSource(stream);
  const worklet = new AudioWorkletNode(audioContext, "voice-recorder-worklet");
  const monitorGain = audioContext.createGain();
  monitorGain.gain.value = 0;
  const batcher = createPcmFrameBatcher({
    targetSamples: ASR_FRAME_SAMPLES,
    onFrame: handlers.onFrame
  });
  source.connect(worklet);
  worklet.connect(monitorGain);
  monitorGain.connect(audioContext.destination);
  worklet.port.onmessage = (event) => {
    batcher.push(event.data);
  };
  worklet.port.onmessageerror = () => {
    handlers.onError(new Error("Failed to read microphone audio frame"));
  };
  return {
    stop: async () => {
      batcher.flush();
      worklet.disconnect();
      monitorGain.disconnect();
      source.disconnect();
      stream.getTracks().forEach((track2) => track2.stop());
      await audioContext.close();
    }
  };
}
async function openMicrophoneStream(mediaDevices, options) {
  try {
    return await mediaDevices.getUserMedia({
      audio: buildRecordingAudioConstraints(options.inputDeviceId)
    });
  } catch (error) {
    logGetUserMediaFailure(error, options.inputDeviceId);
    if (!options.inputDeviceId || !isStaleSelectedDeviceError(error)) {
      throw error;
    }
    console.warn(
      "[recorder] selected microphone is unavailable; retrying with the system default microphone"
    );
    return mediaDevices.getUserMedia({
      audio: buildRecordingAudioConstraints("")
    });
  }
}
function buildRecordingAudioConstraints(inputDeviceId) {
  return {
    channelCount: 1,
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    ...inputDeviceId ? { deviceId: { exact: inputDeviceId } } : {}
  };
}
function isStaleSelectedDeviceError(error) {
  const name = getErrorName(error);
  return name === "OverconstrainedError" || name === "NotFoundError";
}
function logGetUserMediaFailure(error, inputDeviceId) {
  console.error(
    `[recorder] getUserMedia failed name=${getErrorName(error)} message="${getErrorMessage(error)}" selectedDevice=${inputDeviceId ? "yes" : "default"}`,
    error
  );
}
function getErrorName(error) {
  return error instanceof Error && error.name ? error.name : "UnknownError";
}
function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
const DEFAULT_RECORDER_MAX_DURATION_SECONDS = 5 * 60;
const defaultRecorderOptions = {
  sampleRate: 16e3,
  maxDurationSeconds: DEFAULT_RECORDER_MAX_DURATION_SECONDS,
  inputDeviceId: ""
};
function createRecorderService(options) {
  const listeners = /* @__PURE__ */ new Set();
  let state = "idle";
  let activeSession;
  const emit = (event) => {
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error("[recorder] listener 丟擲異常，已隔離，不影響其他訂閱者", error);
      }
    }
  };
  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start: async (startOptions) => {
      if (state === "listening") {
        throw new Error("Recorder is already listening");
      }
      state = "listening";
      activeSession = await options.adapter.start(
        { ...defaultRecorderOptions, ...startOptions },
        {
          onFrame: (frame) => emit({ type: "frame", frame }),
          onError: (error) => {
            state = "idle";
            activeSession = void 0;
            emit({ type: "error", error });
          }
        }
      );
      emit({ type: "start" });
    },
    stop: async () => {
      if (!activeSession) {
        return;
      }
      const session = activeSession;
      activeSession = void 0;
      await session.stop();
      state = "idle";
      emit({ type: "stop" });
    },
    cancel: async () => {
      await activeSession?.stop();
      activeSession = void 0;
      state = "idle";
    }
  };
}
const transitions = {
  idle: {
    start: "listening",
    fail: "error"
  },
  listening: {
    cancel: "canceled",
    stop: "processing",
    fail: "error",
    reset: "idle"
  },
  canceled: {
    undoCancel: "processing",
    reset: "idle",
    fail: "error"
  },
  processing: {
    insert: "inserting",
    fail: "error",
    reset: "idle"
  },
  inserting: {
    success: "success",
    fail: "error",
    reset: "idle"
  },
  result: {
    reset: "idle",
    start: "listening"
  },
  success: {
    reset: "idle",
    // 第一次會話成功後狀態機停留在 success 等待 reset；若使用者直接按 Right ALT 開啟下一輪，
    // controller 會發 start 事件，必須允許 success → listening，否則狀態機靜默忽略、UI 卡住。
    start: "listening"
  },
  error: {
    reset: "idle",
    start: "listening"
  }
};
const MODE_CLEARING_STATES = /* @__PURE__ */ new Set([
  "idle",
  "success",
  "error"
]);
function createRecordingStateMachine() {
  let snapshot = { state: "idle", mode: void 0 };
  return {
    getSnapshot: () => snapshot,
    getState: () => snapshot.state,
    send: (event) => {
      const next = transitions[snapshot.state][event.type];
      if (!next) {
        return snapshot;
      }
      const nextMode = (() => {
        if (event.type === "start") {
          return event.mode;
        }
        if (MODE_CLEARING_STATES.has(next)) {
          return void 0;
        }
        return snapshot.mode;
      })();
      const nextReason = event.type === "fail" ? event.reason : void 0;
      snapshot = nextReason ? { state: next, mode: nextMode, reason: nextReason } : { state: next, mode: nextMode };
      return snapshot;
    }
  };
}
const MAX_PENDING_TRANSCRIPTION_FRAMES = 30;
const RECORDING_LIMIT_TIMER_FUZZ_MS = 25;
function createVoiceOperationController(options) {
  const machine = createRecordingStateMachine();
  let activeSession;
  let finalTranscript = "";
  let starting = false;
  let pendingCancelAfterStart = false;
  let recorderStartRequested = false;
  const getNow = options.now ?? (() => /* @__PURE__ */ new Date());
  const recordingMaxDurationSeconds = Math.max(
    1,
    options.settings.maxDurationSeconds ?? DEFAULT_RECORDER_MAX_DURATION_SECONDS
  );
  let recordingLimitTimer;
  const clearRecordingLimitTimer = () => {
    if (!recordingLimitTimer) {
      return;
    }
    clearTimeout(recordingLimitTimer);
    recordingLimitTimer = void 0;
  };
  const getRecordingRemainingSeconds = () => {
    if (machine.getSnapshot().state !== "listening" || !activeSession) {
      return void 0;
    }
    const elapsedMs = Math.max(
      0,
      getNow().getTime() - activeSession.startedAtMs
    );
    const remainingMs = recordingMaxDurationSeconds * 1e3 - elapsedMs;
    return Math.max(0, Math.ceil(remainingMs / 1e3));
  };
  const scheduleRecordingLimitTimer = (session) => {
    clearRecordingLimitTimer();
    const elapsedMs = Math.max(0, getNow().getTime() - session.startedAtMs);
    const remainingMs = Math.max(
      0,
      recordingMaxDurationSeconds * 1e3 - elapsedMs
    );
    recordingLimitTimer = setTimeout(() => {
      recordingLimitTimer = void 0;
      if (activeSession !== session || machine.getSnapshot().state !== "listening") {
        return;
      }
      console.log(
        "[voice] recording limit reached; stopping session automatically"
      );
      void stopSession().catch((error) => {
        console.error("[voice] automatic recording stop failed", error);
      });
    }, remainingMs + RECORDING_LIMIT_TIMER_FUZZ_MS);
  };
  const requestAbortDuringStart = () => {
    console.warn("[voice] 啟動進行中，標記 pendingCancel");
    pendingCancelAfterStart = true;
    clearRecordingLimitTimer();
    if (recorderStartRequested) {
      void options.recorder.cancel().catch((error) => {
        console.warn("[voice] 啟動期間立刻停麥失敗（忽略）", error);
      });
    }
    machine.send({ type: "reset" });
  };
  const fail = (reason) => {
    console.warn(`[voice] 失敗原因=${reason}`);
    clearRecordingLimitTimer();
    machine.send({ type: "fail", reason });
  };
  const unsubscribeRecorder = options.recorder.subscribe((event) => {
    if (event.type === "frame") {
      activeSession?.audioFrames.push(new Int16Array(event.frame.pcm));
      const session = activeSession;
      if (!session) {
        return;
      }
      if (!session.transcriptionReady) {
        if (session.pendingTranscriptionFrames.length < MAX_PENDING_TRANSCRIPTION_FRAMES) {
          session.pendingTranscriptionFrames.push(event.frame);
        }
        return;
      }
      try {
        options.transcriptionProvider.sendAudio(event.frame);
      } catch (error) {
        console.warn("[voice] 发送音频到转写服务失败，录音保持进行中", error);
        session.transcriptionUnavailable = true;
        options.onTranscriptionUnavailable?.();
      }
      return;
    }
    if (event.type === "error") {
      console.error("[voice] 錄音器錯誤", event);
      fail("mic");
      activeSession = void 0;
      void options.transcriptionProvider.cancel();
    }
  });
  const unsubscribeTranscription = options.transcriptionProvider.subscribe(
    (event) => {
      if (event.type === "final") {
        finalTranscript = event.text;
        console.log("[voice] 轉寫最終文本：", finalTranscript);
        return;
      }
      if (event.type === "error") {
        console.error("[voice] 轉寫錯誤", event);
        if (activeSession && machine.getSnapshot().state === "listening") {
          activeSession.transcriptionUnavailable = true;
          options.onTranscriptionUnavailable?.();
          return;
        }
        fail("transcription");
        activeSession = void 0;
        void (async () => {
          await options.recorder.cancel();
          await options.transcriptionProvider.cancel();
        })().catch((error) => {
          console.warn("[voice] 轉寫錯誤後清理會話失敗（已忽略）", error);
        });
      }
    }
  );
  const startTranscriptionForSession = async (session) => {
    session.transcriptionUnavailable = false;
    try {
      await options.transcriptionProvider.start({
        installationId: options.settings.installationId,
        language: options.settings.language,
        sampleRate: options.settings.sampleRate,
        mode: session.mode,
        selectedText: session.selectedText,
        targetLanguage: resolveSessionTargetLanguage(options, session),
        postprocessMode: resolveSessionPostprocessMode(options, session),
        appContext: await options.getAppContext()
      });
      if (activeSession !== session) {
        return false;
      }
      session.transcriptionReady = true;
      try {
        for (const frame of session.pendingTranscriptionFrames) {
          options.transcriptionProvider.sendAudio(frame);
        }
      } catch (sendError) {
        console.warn(
          "[voice] 发送缓存音频到转写服务失败，录音保持进行中",
          sendError
        );
        session.transcriptionUnavailable = true;
        options.onTranscriptionUnavailable?.();
        return false;
      } finally {
        session.pendingTranscriptionFrames = [];
      }
      return true;
    } catch (error) {
      console.error("[voice] 轉寫啟動失敗，錄音保持進行中", error);
      if (activeSession === session) {
        session.transcriptionUnavailable = true;
        session.transcriptionReady = false;
        options.onTranscriptionUnavailable?.();
      }
      return false;
    }
  };
  const startSession = async (mode) => {
    console.log(`[voice] 開始會話 mode=${mode}`);
    let selectedText = "";
    if (mode === "processSelection") {
      selectedText = await options.textTarget.getSelectedText();
      console.log(
        `[voice] processSelection 選中文本長度=${selectedText.length}`
      );
    }
    const startedAt = getNow();
    activeSession = {
      mode,
      selectedText,
      startedAt: startedAt.toISOString(),
      startedAtMs: startedAt.getTime(),
      audioFrames: [],
      pendingTranscriptionFrames: [],
      transcriptionReady: false,
      transcriptionUnavailable: false
    };
    finalTranscript = "";
    machine.send({ type: "start", mode });
    starting = true;
    recorderStartRequested = false;
    let stage = "recorder";
    let recorderStarted = false;
    try {
      recorderStartRequested = true;
      await options.recorder.start({
        sampleRate: options.settings.sampleRate,
        inputDeviceId: options.settings.inputDeviceId,
        ...options.settings.maxDurationSeconds !== void 0 ? { maxDurationSeconds: options.settings.maxDurationSeconds } : {}
      });
      recorderStarted = true;
      if (activeSession) {
        scheduleRecordingLimitTimer(activeSession);
      }
      if (pendingCancelAfterStart) {
        console.log("[voice] 使用者已在錄音器啟動期間取消，跳過啟動成功收尾");
        return;
      }
      stage = "transcription";
      const transcriptionStarted = await startTranscriptionForSession(activeSession);
      if (!transcriptionStarted && options.finalResultBehavior === "respect_service_action") {
        throw new Error("Transcription session is unavailable");
      }
      console.log("[voice] 會話啟動完成：錄音器已就緒");
    } catch (error) {
      console.error(`[voice] 會話啟動失敗 stage=${stage}`, error);
      clearRecordingLimitTimer();
      activeSession = void 0;
      if (recorderStarted || stage === "recorder") {
        try {
          await options.recorder.cancel();
        } catch (cancelError) {
          console.warn(
            "[voice] 啟動失敗後取消 recorder 也報錯（忽略）",
            cancelError
          );
        }
      }
      fail(stage === "recorder" ? "mic" : stageToReason(stage));
      pendingCancelAfterStart = false;
      throw error;
    } finally {
      starting = false;
      recorderStartRequested = false;
      if (pendingCancelAfterStart) {
        pendingCancelAfterStart = false;
        console.log("[voice] 啟動完成後發現 pendingCancel，立即取消會話");
        await cancelSession();
      }
    }
  };
  const stopSession = async () => {
    const session = activeSession;
    if (!session) {
      console.log("[voice] 停止會話：當前無活動會話，忽略");
      return;
    }
    console.log(`[voice] 停止會話 mode=${session.mode}`);
    clearRecordingLimitTimer();
    machine.send({ type: "stop" });
    let stage = "recorder";
    try {
      await options.recorder.stop();
      if (activeSession !== session) {
        console.warn(
          "[voice] 停止會話：會話已被取消（recorder 階段後），靜默退出"
        );
        return;
      }
      console.log("[voice] 停止會話：錄音階段完成");
      stage = "transcription";
      if (session.transcriptionUnavailable) {
        throw new Error("Transcription session is unavailable");
      }
      await options.transcriptionProvider.stop();
      if (activeSession !== session) {
        console.warn(
          "[voice] 停止會話：會話已被取消（transcription 階段後），靜默退出"
        );
        return;
      }
      console.log("[voice] 停止會話：轉寫階段完成");
      machine.send({ type: "insert" });
      stage = session.mode === "direct" ? "insertion" : "postprocess";
      const finalText = await applyFinalText(
        options,
        session,
        finalTranscript,
        (nextStage) => {
          console.log(`[voice] 停止會話：進入階段=${nextStage}`);
          stage = nextStage;
        }
      );
      if (activeSession !== session) {
        console.warn(
          "[voice] 停止會話：會話已被取消（applyFinalText 後），靜默退出"
        );
        return;
      }
      machine.send({ type: "success" });
      emitHistoryRecord(options, session, {
        status: finalTranscript.trim() ? "completed" : "no_audio",
        transcript: finalTranscript,
        finalText,
        endedAt: getNow()
      });
      console.log("[voice] 停止會話：整體成功");
    } catch (error) {
      if (activeSession !== session) {
        console.warn(
          `[voice] 停止會話：會話已被取消，忽略階段=${stage} 的異常`,
          error
        );
        return;
      }
      console.error(`[voice] 停止會話在階段=${stage} 失敗`, error);
      fail(stageToReason(stage));
      throw error;
    } finally {
      if (activeSession === session) {
        activeSession = void 0;
        finalTranscript = "";
      }
    }
  };
  const cancelSession = async () => {
    const mode = activeSession?.mode;
    const session = activeSession;
    clearRecordingLimitTimer();
    console.log(`[voice] 取消會話（原 mode=${mode ?? "無"}）`);
    activeSession = void 0;
    finalTranscript = "";
    try {
      if (options.recorder.getState() === "listening") {
        await options.recorder.cancel();
      }
    } catch (error) {
      console.warn(
        "[voice] recorder.cancel 異常（已忽略，繼續走 reset）",
        error
      );
    }
    try {
      await options.transcriptionProvider.cancel();
    } catch (error) {
      console.warn(
        "[voice] transcription.cancel 異常（已忽略，繼續走 reset）",
        error
      );
    }
    machine.send({ type: "reset" });
    if (mode) {
      options.onCancel?.(mode);
    }
    if (session) {
      emitHistoryRecord(options, session, {
        status: "cancelled",
        transcript: finalTranscript,
        finalText: "",
        endedAt: getNow()
      });
    }
  };
  const cancelListeningSession = async () => {
    const session = activeSession;
    if (!session) {
      await cancelSession();
      return;
    }
    clearRecordingLimitTimer();
    console.log(`[voice] 暫停錄音並進入已取消狀態 mode=${session.mode}`);
    try {
      if (options.recorder.getState() === "listening") {
        await options.recorder.stop();
      }
    } catch (error) {
      console.warn(
        "[voice] 進入已取消狀態時 recorder.stop 失敗，改走完整取消",
        error
      );
      await cancelSession();
      return;
    }
    machine.send({ type: "cancel" });
    options.onCancel?.(session.mode);
  };
  return {
    getSnapshot: () => machine.getSnapshot(),
    getRecordingRemainingSeconds,
    handleToggle: async (mode) => {
      const snapshot = machine.getSnapshot();
      console.log(
        `[voice] handleToggle：收到 mode=${mode} 當前狀態=${snapshot.state} starting=${starting}`
      );
      if (starting) {
        requestAbortDuringStart();
        return;
      }
      if (snapshot.state === "idle" || snapshot.state === "error" || snapshot.state === "success") {
        try {
          await startSession(mode);
        } catch (error) {
          console.warn("[voice] handleToggle：startSession 拋錯已吞下", error);
        }
        return;
      }
      if (snapshot.state === "canceled") {
        await cancelSession();
        return;
      }
      if (snapshot.state === "listening") {
        if (mode !== "direct") {
          console.log(
            `[voice] handleToggle：忽略非當前模式收尾 mode=${mode} active=${snapshot.mode ?? "none"}`
          );
          return;
        }
        await stopSession();
        return;
      }
      if (snapshot.state === "processing" || snapshot.state === "inserting") {
        console.warn(
          `[voice] handleToggle：${snapshot.state} 階段再次觸發，強制取消以保證閉環`
        );
        await cancelSession();
      }
    },
    cancel: async () => {
      const current = machine.getSnapshot().state;
      console.log(`[voice] cancel：當前狀態=${current} starting=${starting}`);
      if (starting) {
        requestAbortDuringStart();
        return;
      }
      if (current === "idle" || current === "success") {
        return;
      }
      if (current === "listening") {
        await cancelListeningSession();
        return;
      }
      await cancelSession();
    },
    confirm: async () => {
      const current = machine.getSnapshot().state;
      console.log(`[voice] confirm：當前狀態=${current}`);
      if (current !== "listening") {
        return;
      }
      await stopSession();
    },
    retryTranscription: async () => {
      const snapshot = machine.getSnapshot();
      const session = activeSession;
      if (snapshot.state !== "listening" || !session) {
        return false;
      }
      if (session.transcriptionReady && !session.transcriptionUnavailable) {
        return true;
      }
      return startTranscriptionForSession(session);
    },
    undoCancel: async () => {
      const snapshot = machine.getSnapshot();
      const session = activeSession;
      console.log(`[voice] undoCancel：當前狀態=${snapshot.state}`);
      if (snapshot.state !== "canceled" || !session) {
        return;
      }
      machine.send({ type: "undoCancel" });
      let stage = "transcription";
      try {
        await options.transcriptionProvider.stop();
        if (activeSession !== session) {
          return;
        }
        machine.send({ type: "insert" });
        stage = session.mode === "direct" ? "insertion" : "postprocess";
        const finalText = await applyFinalText(
          options,
          session,
          finalTranscript,
          (nextStage) => {
            stage = nextStage;
          }
        );
        if (activeSession !== session) {
          return;
        }
        machine.send({ type: "success" });
        emitHistoryRecord(options, session, {
          status: finalTranscript.trim() ? "completed" : "no_audio",
          transcript: finalTranscript,
          finalText,
          endedAt: getNow()
        });
      } catch (error) {
        if (activeSession !== session) {
          return;
        }
        fail(stageToReason(stage));
        throw error;
      } finally {
        if (activeSession === session) {
          activeSession = void 0;
          finalTranscript = "";
        }
      }
    },
    dispose: () => {
      clearRecordingLimitTimer();
      unsubscribeRecorder();
      unsubscribeTranscription();
    }
  };
}
function stageToReason(stage) {
  switch (stage) {
    case "recorder":
      return "mic";
    case "transcription":
      return "transcription";
    case "postprocess":
      return "postprocess";
    case "insertion":
      return "insertion";
  }
}
async function applyFinalText(options, session, rawText, setStage) {
  if (options.finalResultBehavior === "respect_service_action") {
    setStage("postprocess");
    const result2 = await options.postProcessService.process(
      await createPostProcessInput(options, session, rawText)
    );
    if (!result2.finalText.trim()) {
      console.log("[voice] 服務端最終文本為空，跳過插入與展示");
      return "";
    }
    if (session.mode === "processSelection" && result2.action === "show_result") {
      options.onPostprocessResult?.({
        mode: "processSelection",
        rawText,
        selectedText: session.selectedText,
        result: result2
      });
    } else {
      setStage("insertion");
      await applyPostProcessResult(options.textTarget, session, result2);
    }
    return result2.finalText;
  }
  if (!rawText.trim()) {
    console.log("[voice] 最終文本為空（靜音/未識別），跳過後處理與插入");
    return "";
  }
  if (session.mode === "direct") {
    setStage("insertion");
    await options.textTarget.insertText(rawText);
    return rawText;
  }
  setStage("postprocess");
  const result = await options.postProcessService.process(
    await createPostProcessInput(options, session, rawText)
  );
  if (session.mode === "processSelection") {
    options.onPostprocessResult?.({
      mode: "processSelection",
      rawText,
      selectedText: session.selectedText,
      result
    });
    return result.finalText;
  }
  setStage("insertion");
  await applyPostProcessResult(options.textTarget, session, result);
  return result.finalText;
}
async function createPostProcessInput(options, session, rawText) {
  return {
    installationId: options.settings.installationId,
    rawText,
    selectedText: session.selectedText,
    appContext: await options.getAppContext(),
    mode: resolveSessionPostprocessMode(options, session),
    language: toBackendLanguage$1(options.settings.language),
    style: options.settings.postprocessStyle,
    targetLanguage: resolveSessionTargetLanguage(options, session),
    dictionaryTerms: options.settings.dictionaryTerms
  };
}
function resolveSessionPostprocessMode(options, session) {
  return session.mode === "translate" ? "translate" : options.settings.postprocessMode;
}
function resolveSessionTargetLanguage(options, session) {
  return session.mode === "translate" ? resolveTranslateTargetLanguage$1(
    options.settings.language,
    options.settings.targetLanguage
  ) : options.settings.targetLanguage;
}
async function applyPostProcessResult(textTarget, session, result) {
  if (result.action === "replace_selection" && session.selectedText) {
    await textTarget.replaceSelection(result.finalText, session.selectedText);
    return;
  }
  await textTarget.insertText(result.finalText);
}
function toBackendLanguage$1(lang) {
  switch (lang) {
    case "auto":
      return "auto";
    case "mandarin":
    case "zh-CN":
      return "zh-CN";
    case "english":
    case "en-US":
      return "en-US";
    default:
      return "auto";
  }
}
function resolveTranslateTargetLanguage$1(lang, fallback) {
  switch (lang) {
    case "cantonese":
    case "mandarin":
    case "zh-CN":
      return "en-US";
    case "english":
    case "en-US":
      return "zh-CN";
    default:
      return fallback;
  }
}
function emitHistoryRecord(options, session, result) {
  if (!options.onHistoryRecord) {
    return;
  }
  const input = {
    startedAt: session.startedAt,
    durationMs: Math.max(
      0,
      result.endedAt.getTime() - Date.parse(session.startedAt)
    ),
    mode: session.mode,
    status: result.status,
    transcript: result.transcript,
    finalText: result.finalText
  };
  if (session.selectedText) {
    input.selectedText = session.selectedText;
  }
  if (result.errorMessage) {
    input.errorMessage = result.errorMessage;
  }
  const pcm = concatenatePcmFrames(session.audioFrames);
  if (pcm.length > 0) {
    input.audio = {
      pcm,
      sampleRate: 16e3
    };
  }
  try {
    options.onHistoryRecord(input);
  } catch (error) {
    console.warn("[voice] 儲存歷史記錄回撥失敗（已忽略）", error);
  }
}
function concatenatePcmFrames(frames) {
  const totalLength = frames.reduce((sum, frame) => sum + frame.length, 0);
  const output = new Int16Array(totalLength);
  let offset = 0;
  for (const frame of frames) {
    output.set(frame, offset);
    offset += frame.length;
  }
  return output;
}
function voiceRecorderWorkletModule() {
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
  function convertFloat32ToPcm16(samples) {
    const pcm = new Int16Array(samples.length);
    for (let index = 0; index < samples.length; index += 1) {
      const sample = clamp(samples[index] ?? 0, -1, 1);
      pcm[index] = Math.round(sample < 0 ? sample * 32768 : sample * 32767);
    }
    return pcm;
  }
  function calculateRms2(samples) {
    if (samples.length === 0) {
      return 0;
    }
    let sumSquares = 0;
    for (const sample of samples) {
      sumSquares += sample * sample;
    }
    return Math.sqrt(sumSquares / samples.length);
  }
  function downmixToMono(channels) {
    const firstChannel = channels[0];
    if (!firstChannel) {
      return void 0;
    }
    if (channels.length === 1) {
      return firstChannel;
    }
    const mono = new Float32Array(firstChannel.length);
    for (let sampleIndex = 0; sampleIndex < firstChannel.length; sampleIndex += 1) {
      let sum = 0;
      for (const channel of channels) {
        sum += channel[sampleIndex] ?? 0;
      }
      mono[sampleIndex] = sum / channels.length;
    }
    return mono;
  }
  class VoiceRecorderWorklet extends AudioWorkletProcessor {
    process(inputs) {
      const channel = downmixToMono(inputs[0] ?? []);
      if (!channel) {
        return true;
      }
      this.port.postMessage({
        pcm: convertFloat32ToPcm16(channel),
        sampleRate: 16e3,
        timestampMs: currentTime * 1e3,
        rms: calculateRms2(channel)
      });
      return true;
    }
  }
  registerProcessor("voice-recorder-worklet", VoiceRecorderWorklet);
}
function createVoiceRecorderWorkletUrl() {
  const source = `(${voiceRecorderWorkletModule.toString()})();`;
  const blob = new Blob([source], { type: "text/javascript" });
  return URL.createObjectURL(blob);
}
const METER_BAR_COUNT = 14;
const LEVEL_GAIN = 6;
const PCM_MAX = 32768;
const WAVEFORM_GAIN = 4.8;
const WAVEFORM_AMPLITUDE_PATTERNS = {
  "waveform-sunset": [
    0.28,
    0.38,
    0.5,
    0.62,
    0.74,
    0.86,
    0.98,
    1,
    0.96,
    0.86,
    0.72,
    0.58,
    0.46,
    0.4
  ],
  "waveform-mono": [
    0.34,
    0.42,
    0.52,
    0.62,
    0.74,
    0.86,
    0.96,
    1,
    0.96,
    0.84,
    0.68,
    0.52,
    0.42,
    0.38
  ],
  "waveform-candy": [
    0.3,
    0.42,
    0.58,
    0.76,
    0.94,
    0.86,
    0.66,
    0.74,
    0.98,
    0.84,
    0.58,
    0.7,
    1,
    0.8
  ]
};
function VolumeMeter({
  level,
  active,
  styleName,
  ariaLabel = "Microphone volume",
  samples
}) {
  const normalized = active ? Math.min(1, Math.max(0, level * LEVEL_GAIN)) : 0;
  const voicedLevel = active ? Math.pow(normalized, 0.72) : 0;
  const pattern = WAVEFORM_AMPLITUDE_PATTERNS[styleName] ?? WAVEFORM_AMPLITUDE_PATTERNS["waveform-sunset"];
  const bars = Array.from({ length: METER_BAR_COUNT }, (_unused, index) => {
    const waveformWeight = active && samples !== void 0 && samples.length > 0 ? getWaveformWeight(samples, index) : void 0;
    const phase = Math.sin(index * 1.7) * 0.08;
    const fallbackWeight = pattern[index] ?? 0.5;
    const weight = waveformWeight ?? fallbackWeight;
    const scale = active ? Math.min(
      1,
      waveformWeight === void 0 ? 0.12 + voicedLevel * fallbackWeight + phase * normalized : 0.08 + weight * WAVEFORM_GAIN
    ) : 0.08;
    const opacity = active ? 0.92 : 0.38;
    const colorStop = index / Math.max(1, METER_BAR_COUNT - 1);
    return { colorStop, index, opacity, phase, scale, weight };
  });
  const className = `volume-meter volume-meter--${styleName}`;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className,
      "aria-label": ariaLabel,
      "data-active": active,
      "data-style": styleName,
      style: { "--meter-level": normalized.toFixed(3) },
      children: bars.map((bar) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "span",
        {
          className: "volume-meter__bar",
          style: {
            "--bar-index": bar.index,
            "--bar-opacity": bar.opacity.toFixed(3),
            "--bar-phase": bar.phase.toFixed(3),
            "--bar-weight": bar.weight.toFixed(3),
            "--bar-color-stop": bar.colorStop.toFixed(3),
            transform: `scaleY(${bar.scale.toFixed(3)})`
          }
        },
        bar.index
      ))
    }
  );
}
function getWaveformWeight(samples, barIndex) {
  const segmentStart = Math.floor(barIndex / METER_BAR_COUNT * samples.length);
  const segmentEnd = Math.max(
    segmentStart + 1,
    Math.floor((barIndex + 1) / METER_BAR_COUNT * samples.length)
  );
  let peak = 0;
  let sumSquares = 0;
  for (let index = segmentStart; index < segmentEnd; index += 1) {
    const amplitude = Math.abs(samples[index] ?? 0) / PCM_MAX;
    peak = Math.max(peak, amplitude);
    sumSquares += amplitude * amplitude;
  }
  const rms = Math.sqrt(sumSquares / Math.max(1, segmentEnd - segmentStart));
  return Math.min(1, peak * 0.72 + rms * 0.28);
}
const OVERLAY_TEXT = {
  "zh-CN": {
    states: {
      idle: "准备就绪（单击 Right ALT）",
      listening: "录音中...再次单击 Right ALT 结束",
      canceled: "已取消",
      processing: "转写中...",
      inserting: "正在插入文本...",
      result: "AI 回答",
      success: "已插入",
      error: "出错了，请重试"
    },
    errors: {
      mic: "麦克风无法启用，请检查权限",
      transcription: "转写失败，请重试",
      postprocess: "AI 处理失败，请重试",
      insertion: "文本插入失败，请检查目标应用",
      no_selection: "未检测到选中文本，无法处理",
      shortcut_conflict: "快捷键注册失败，请更换快捷键"
    },
    initFailedPrefix: "初始化失败：",
    copied: "已复制",
    copy: "复制",
    undoCancel: "撤销取消",
    undo: "撤销",
    thinking: "思考中",
    cancelRecording: "取消录音",
    cancel: "取消",
    confirmEndRecording: "确认结束录音",
    confirm: "确认",
    shortcutHelpTitle: "AOA 快捷键",
    shortcutHelpSummaryPrefix: "轻触一次开始说话。按 ",
    shortcutHelpSummarySuffix: " 来完成。",
    shortcutHelpList: "模式快捷键",
    shortcutHelpModes: {
      direct: "语音输入模式",
      translate: "翻译模式",
      processSelection: "智能改写模式"
    },
    networkTitle: "网络连接不稳定",
    closeHint: "关闭提示",
    close: "关闭",
    networkMessage: "未能完成转录。请重试。",
    retry: "重试",
    busyTitle: "Voice Assistant 仍在处理您的上一个转录",
    busyMessage: "如果您想取消上一个转录，请按 Esc 或点击下面。",
    limitTitle: "转录会话将在不到 1 分钟内结束",
    limitMessage: "当前每个会话支持最多 5 分钟的转写。请开始一个新会话以继续。",
    resultAria: "AI 回答",
    brand: "Voice Assistant",
    closeAnswer: "关闭回答",
    voiceInput: "语音输入",
    selectedText: "选中文本",
    answer: "回答",
    copyAnswer: "复制回答",
    volumeMeter: "麦克风音量",
    canceled: {
      direct: "语音转录已取消",
      translate: "语音翻译已取消",
      processSelection: "智能改写已取消"
    }
  },
  "zh-TW": {
    states: {
      idle: "準備就緒（單擊 Right ALT）",
      listening: "錄音中...再次單擊 Right ALT 結束",
      canceled: "已取消",
      processing: "轉寫中...",
      inserting: "正在插入文本...",
      result: "AI 回答",
      success: "已插入",
      error: "出錯了，請重試"
    },
    errors: {
      mic: "麥克風無法啟用，請檢查許可權",
      transcription: "轉寫失敗，請重試",
      postprocess: "AI 處理失敗，請重試",
      insertion: "文本插入失敗，請檢查目標應用",
      no_selection: "未檢測到選中文本，無法處理",
      shortcut_conflict: "快捷鍵註冊失敗，請更換快捷鍵"
    },
    initFailedPrefix: "初始化失敗：",
    copied: "已複製",
    copy: "複製",
    undoCancel: "撤銷取消",
    undo: "撤銷",
    thinking: "思考中",
    cancelRecording: "取消錄音",
    cancel: "取消",
    confirmEndRecording: "確認結束錄音",
    confirm: "確認",
    shortcutHelpTitle: "AOA 快捷鍵",
    shortcutHelpSummaryPrefix: "輕觸一次開始說話。按 ",
    shortcutHelpSummarySuffix: " 來完成。",
    shortcutHelpList: "模式快捷鍵",
    shortcutHelpModes: {
      direct: "語音輸入模式",
      translate: "翻譯模式",
      processSelection: "智慧改寫模式"
    },
    networkTitle: "網路連線不穩定",
    closeHint: "關閉提示",
    close: "關閉",
    networkMessage: "未能完成轉錄。請重試。",
    retry: "重試",
    busyTitle: "Voice Assistant 仍在處理您的上一個轉錄",
    busyMessage: "如果您想取消上一個轉錄，請按 Esc 或點擊下面。",
    limitTitle: "轉錄會話將在不到 1 分鐘內結束",
    limitMessage: "目前每個會話支援最多 5 分鐘的轉寫。請開始一個新會話以繼續。",
    resultAria: "AI 回答",
    brand: "Voice Assistant",
    closeAnswer: "關閉回答",
    voiceInput: "語音輸入",
    selectedText: "選中文本",
    answer: "回答",
    copyAnswer: "複製回答",
    volumeMeter: "麥克風音量",
    canceled: {
      direct: "語音轉錄已取消",
      translate: "語音翻譯已取消",
      processSelection: "智慧改寫已取消"
    }
  },
  "en-US": {
    states: {
      idle: "Ready (tap Right Alt)",
      listening: "Recording... tap Right Alt again to finish",
      canceled: "Canceled",
      processing: "Transcribing...",
      inserting: "Inserting text...",
      result: "AI Answer",
      success: "Inserted",
      error: "Something went wrong. Please try again"
    },
    errors: {
      mic: "Microphone unavailable. Check permissions",
      transcription: "Transcription failed. Please try again",
      postprocess: "AI processing failed. Please try again",
      insertion: "Text insertion failed. Check the target app",
      no_selection: "No selected text detected",
      shortcut_conflict: "Shortcut registration failed. Choose another shortcut"
    },
    initFailedPrefix: "Initialization failed: ",
    copied: "Copied",
    copy: "Copy",
    undoCancel: "Undo cancel",
    undo: "Undo",
    thinking: "Thinking",
    cancelRecording: "Cancel recording",
    cancel: "Cancel",
    confirmEndRecording: "Finish recording",
    confirm: "Confirm",
    shortcutHelpTitle: "AOA Shortcuts",
    shortcutHelpSummaryPrefix: "Tap once to start speaking. Press ",
    shortcutHelpSummarySuffix: " to finish.",
    shortcutHelpList: "Mode shortcuts",
    shortcutHelpModes: {
      direct: "Voice Input",
      translate: "Translate",
      processSelection: "Smart Rewrite"
    },
    networkTitle: "Network connection is unstable",
    closeHint: "Close hint",
    close: "Close",
    networkMessage: "Transcription could not be completed. Please try again.",
    retry: "Retry",
    busyTitle: "Voice Assistant is still processing your previous transcription",
    busyMessage: "To cancel the previous transcription, press Esc or click below.",
    limitTitle: "This transcription session will end in less than 1 minute",
    limitMessage: "Each session supports up to 5 minutes of transcription. Start a new session to continue.",
    resultAria: "AI Answer",
    brand: "Voice Assistant",
    closeAnswer: "Close answer",
    voiceInput: "Voice Input",
    selectedText: "Selected Text",
    answer: "Answer",
    copyAnswer: "Copy answer",
    volumeMeter: "Microphone volume",
    canceled: {
      direct: "Voice transcription canceled",
      translate: "Voice translation canceled",
      processSelection: "Smart rewrite canceled"
    }
  }
};
function getOverlayText(language) {
  return OVERLAY_TEXT[language ?? "zh-CN"] ?? OVERLAY_TEXT["zh-CN"];
}
const COPY_FEEDBACK_RESET_MS = 1400;
function OverlayWindow(props) {
  const state = props.state ?? "idle";
  const text = getOverlayText(props.language);
  const label = computeLabel(state, props.reason, props.error, text);
  const level = state === "listening" ? props.level ?? 0 : 0;
  const overlayHintLabel = props.modeHintLabel?.trim();
  const isThinking = state === "processing" || state === "inserting";
  const showBusyHint = isThinking && props.busyHintVisible === true;
  const recordingRemainingSeconds = state === "listening" ? props.recordingRemainingSeconds : void 0;
  const reserveOverlayHint = state === "listening" || isThinking;
  const showOverlayHint = Boolean(overlayHintLabel) && state === "listening" && props.modeHintVisible !== false && !showBusyHint;
  if (props.shortcutHelp) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(ShortcutHelpPanel, { shortcuts: props.shortcutHelp, text });
  }
  if (state === "idle" || state === "success") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "overlay-empty", "aria-hidden": "true" });
  }
  if (state === "result" && props.result) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      ResultOverlay,
      {
        result: props.result,
        text,
        ...props.onDismissResult ? { onDismiss: props.onDismissResult } : {}
      }
    );
  }
  if (props.reason === "transcription" && (state === "error" || props.onRetryNetworkError)) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      NetworkErrorHint,
      {
        text,
        ...props.onDismissNetworkError ? { onDismiss: props.onDismissNetworkError } : {},
        ...props.onRetryNetworkError ? { onRetry: props.onRetryNetworkError } : {}
      }
    );
  }
  if (state === "canceled") {
    const canceledLabel = getCanceledLabel(props.mode, text);
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "main",
      {
        className: "overlay overlay--canceled",
        "data-mode": props.mode,
        title: canceledLabel,
        "aria-label": canceledLabel,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "overlay__canceled-text", children: canceledLabel }),
          props.onUndoCancel ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "overlay__btn overlay__btn--undo",
              "aria-label": text.undoCancel,
              title: text.undo,
              onClick: props.onUndoCancel,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "path",
                {
                  d: "M9.5 8H5.5v-4M5.8 8.2A7 7 0 1 1 5 14",
                  stroke: "currentColor",
                  strokeWidth: "2.2",
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                  fill: "none"
                }
              ) })
            }
          ) : null
        ]
      }
    );
  }
  const cancelEnabled = state === "listening" || state === "processing" || state === "inserting" || state === "error";
  const confirmEnabled = state === "listening";
  if (isThinking) {
    const thinkingOverlay = /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "main",
      {
        className: `overlay overlay--${state} overlay--thinking`,
        "data-mode": props.mode,
        title: label,
        "aria-label": label,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "overlay__spinner", "aria-hidden": "true" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "overlay__thinking-text", children: text.thinking })
        ]
      }
    );
    return reserveOverlayHint ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      OverlayShell,
      {
        label: overlayHintLabel ?? "",
        visible: showOverlayHint,
        busyHintVisible: showBusyHint,
        ...props.mode !== void 0 ? { mode: props.mode } : {},
        ...props.onCancel ? { onCancel: props.onCancel } : {},
        ...props.onDismissBusyHint ? { onDismissBusyHint: props.onDismissBusyHint } : {},
        text,
        children: thinkingOverlay
      }
    ) : thinkingOverlay;
  }
  const pillOverlay = /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "main",
    {
      className: `overlay overlay--${state}`,
      "data-mode": props.mode,
      title: label,
      "aria-label": label,
      children: [
        props.onCancel ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "overlay__btn overlay__btn--cancel",
            "aria-label": text.cancelRecording,
            title: text.cancel,
            onClick: props.onCancel,
            disabled: !cancelEnabled,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "path",
              {
                d: "M6 6l12 12M18 6L6 18",
                stroke: "currentColor",
                strokeWidth: "2.4",
                strokeLinecap: "round",
                fill: "none"
              }
            ) })
          }
        ) : null,
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          VolumeMeter,
          {
            level,
            active: state === "listening",
            styleName: props.waveformStyle ?? "waveform-sunset",
            ariaLabel: text.volumeMeter,
            ...props.waveformSamples !== void 0 ? { samples: props.waveformSamples } : {}
          }
        ),
        props.onConfirm ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "overlay__btn overlay__btn--confirm",
            "aria-label": text.confirmEndRecording,
            title: text.confirm,
            onClick: props.onConfirm,
            disabled: !confirmEnabled,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "path",
              {
                d: "M5 12.5l4.5 4.5L19 7.5",
                stroke: "currentColor",
                strokeWidth: "2.6",
                strokeLinecap: "round",
                strokeLinejoin: "round",
                fill: "none"
              }
            ) })
          }
        ) : null
      ]
    }
  );
  return reserveOverlayHint ? /* @__PURE__ */ jsxRuntimeExports.jsx(
    OverlayShell,
    {
      label: overlayHintLabel ?? "",
      visible: showOverlayHint,
      ...recordingRemainingSeconds !== void 0 ? { recordingRemainingSeconds } : {},
      ...props.onDismissRecordingLimitWarning ? {
        onDismissRecordingLimitWarning: props.onDismissRecordingLimitWarning
      } : {},
      ...props.mode !== void 0 ? { mode: props.mode } : {},
      text,
      children: pillOverlay
    }
  ) : pillOverlay;
}
function ShortcutHelpPanel({
  shortcuts,
  text
}) {
  const items = [
    { mode: "direct", label: text.shortcutHelpModes.direct, shortcut: shortcuts.direct },
    { mode: "translate", label: text.shortcutHelpModes.translate, shortcut: shortcuts.translate },
    {
      mode: "processSelection",
      label: text.shortcutHelpModes.processSelection,
      shortcut: shortcuts.processSelection
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "shortcut-help-shell", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "shortcut-help-panel", role: "status", "aria-live": "polite", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "shortcut-help-panel__header", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shortcut-help-panel__icon", "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { viewBox: "0 0 24 24", focusable: "false", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "rect",
          {
            x: "4.4",
            y: "5.4",
            width: "15.2",
            height: "11.2",
            rx: "5.6",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "1.8"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "9.2", cy: "11", r: "1.25", fill: "currentColor" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "14.8", cy: "11", r: "1.25", fill: "currentColor" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "path",
          {
            d: "M12 16.6v2.1M9.8 18.7h4.4",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "1.7",
            strokeLinecap: "round"
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: text.shortcutHelpTitle })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "shortcut-help-panel__summary", children: [
      text.shortcutHelpSummaryPrefix,
      /* @__PURE__ */ jsxRuntimeExports.jsx("kbd", { children: shortcuts.direct }),
      text.shortcutHelpSummarySuffix
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "shortcut-help-panel__list", "aria-label": text.shortcutHelpList, children: items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { "data-mode": item.mode, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shortcut-help-panel__dot", "aria-hidden": "true" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shortcut-help-panel__label", children: item.label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("kbd", { children: item.shortcut })
    ] }, item.mode)) })
  ] }) });
}
function NetworkErrorHint({
  text,
  onDismiss,
  onRetry
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "network-error-shell", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      className: "network-error-hint",
      role: "alertdialog",
      "aria-modal": "false",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "network-error-hint__header", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "network-error-hint__icon", "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { viewBox: "0 0 24 24", focusable: "false", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "path",
              {
                d: "M12 4.25a3.25 3.25 0 0 0-3.25 3.25v4.25a3.25 3.25 0 0 0 6.5 0V7.5A3.25 3.25 0 0 0 12 4.25Z",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "1.8"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "path",
              {
                d: "M6.25 10.75v.65a5.75 5.75 0 0 0 11.5 0v-.65M12 17.25v2.25M8 20.25h8",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "1.8",
                strokeLinecap: "round"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "path",
              {
                d: "M18.5 4.5v4.25M18.5 11.35v.15",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "1.9",
                strokeLinecap: "round"
              }
            )
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: text.networkTitle }),
          onDismiss ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "network-error-hint__close",
              "aria-label": text.closeHint,
              title: text.close,
              onClick: onDismiss,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "path",
                {
                  d: "M6 6l12 12M18 6 6 18",
                  stroke: "currentColor",
                  strokeWidth: "2",
                  strokeLinecap: "round",
                  fill: "none"
                }
              ) })
            }
          ) : null
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: text.networkMessage }),
        onRetry ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "network-error-hint__retry",
            onClick: onRetry,
            children: text.retry
          }
        ) : null
      ]
    }
  ) });
}
function OverlayShell({
  label,
  visible,
  text,
  mode,
  busyHintVisible = false,
  recordingRemainingSeconds,
  onCancel,
  onDismissBusyHint,
  onDismissRecordingLimitWarning,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "overlay-shell", children: [
    busyHintVisible ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      BusyHint,
      {
        text,
        ...onCancel ? { onCancel } : {},
        ...onDismissBusyHint ? { onDismiss: onDismissBusyHint } : {}
      }
    ) : recordingRemainingSeconds !== void 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      RecordingLimitWarning,
      {
        text,
        remainingSeconds: recordingRemainingSeconds,
        ...onDismissRecordingLimitWarning ? { onDismiss: onDismissRecordingLimitWarning } : {}
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "overlay-hint",
        "data-mode": mode,
        "data-visible": visible ? "true" : "false",
        "aria-hidden": visible ? void 0 : true,
        "aria-label": visible ? label : void 0,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "overlay-hint__dot", "aria-hidden": "true" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: label })
        ]
      }
    ),
    children
  ] });
}
function BusyHint({ text, onCancel, onDismiss }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "overlay-busy-hint", role: "status", "aria-live": "polite", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "overlay-busy-hint__header", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "overlay-busy-hint__icon", "aria-hidden": "true", children: "!" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: text.busyTitle }),
      onDismiss ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          className: "overlay-busy-hint__close",
          "aria-label": text.closeHint,
          title: text.close,
          onClick: onDismiss,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "path",
            {
              d: "M6 6l12 12M18 6L6 18",
              stroke: "currentColor",
              strokeWidth: "2",
              strokeLinecap: "round",
              fill: "none"
            }
          ) })
        }
      ) : null
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: text.busyMessage }),
    onCancel ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        className: "overlay-busy-hint__cancel",
        onClick: onCancel,
        children: text.cancel
      }
    ) : null
  ] });
}
function RecordingLimitWarning({
  text,
  remainingSeconds,
  onDismiss
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      className: "recording-limit-warning",
      role: "status",
      "aria-live": "polite",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "recording-limit-warning__header", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "recording-limit-warning__icon", "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { viewBox: "0 0 24 24", focusable: "false", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "path",
              {
                d: "M6.4 10.5v3.1M10 8v8M13.6 6.5v11M17.2 9.3v5.4",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "1.9",
                strokeLinecap: "round"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "path",
              {
                d: "M3.75 12a8.25 8.25 0 0 1 1.5-4.75M20.25 12a8.25 8.25 0 0 0-1.5-4.75",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "1.8",
                strokeLinecap: "round",
                opacity: "0.72"
              }
            )
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: text.limitTitle }),
          onDismiss ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "recording-limit-warning__close",
              "aria-label": text.closeHint,
              title: text.close,
              onClick: onDismiss,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "path",
                {
                  d: "M6 6l12 12M18 6 6 18",
                  stroke: "currentColor",
                  strokeWidth: "2",
                  strokeLinecap: "round",
                  fill: "none"
                }
              ) })
            }
          ) : null
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: text.limitMessage }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "recording-limit-warning__timer", children: formatCountdown(remainingSeconds) })
      ]
    }
  );
}
function ResultOverlay({
  result,
  text,
  onDismiss
}) {
  const [copied, setCopied] = reactExports.useState(false);
  const copyResetTimerRef = reactExports.useRef(
    void 0
  );
  reactExports.useEffect(() => {
    return () => {
      if (copyResetTimerRef.current) {
        clearTimeout(copyResetTimerRef.current);
      }
    };
  }, []);
  const copyAnswer = () => {
    void window.voiceAI.copyText(result.finalText).then(() => {
      setCopied(true);
      if (copyResetTimerRef.current) {
        clearTimeout(copyResetTimerRef.current);
      }
      copyResetTimerRef.current = setTimeout(() => {
        setCopied(false);
      }, COPY_FEEDBACK_RESET_MS);
    }).catch((error) => {
      console.warn("[overlay] failed to copy result text", error);
    });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "result-overlay", role: "dialog", "aria-label": text.resultAria, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "result-panel", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "result-panel__header", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "result-panel__brand", "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { viewBox: "0 0 24 24", focusable: "false", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "path",
          {
            d: "M5.5 5.5c5.8.3 10.4 4.9 10.7 10.7h-3.9A6.8 6.8 0 0 0 5.5 9.4V5.5Z",
            fill: "currentColor"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "path",
          {
            d: "M17.2 6.1a9.8 9.8 0 0 1 1.7 1.7l-2.8 2.8a5.8 5.8 0 0 0-1.7-1.7l2.8-2.8Z",
            fill: "currentColor",
            opacity: "0.72"
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: text.brand }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          className: "result-panel__icon-btn",
          "aria-label": text.closeAnswer,
          title: text.close,
          onClick: onDismiss,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "path",
            {
              d: "M6 6l12 12M18 6 6 18",
              stroke: "currentColor",
              strokeWidth: "2",
              strokeLinecap: "round"
            }
          ) })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "result-panel__body", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ResultPrompt, { label: text.voiceInput, value: result.rawText, icon: "voice" }),
      result.selectedText ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        ResultPrompt,
        {
          label: text.selectedText,
          value: result.selectedText,
          compact: true
        }
      ) : null,
      /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { className: "result-answer", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "result-answer__header", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "result-answer__title", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "path",
              {
                d: "M12 3.5 13.8 9l5.7 1.2-5.7 1.9L12 17.5l-1.8-5.4-5.7-1.9L10.2 9 12 3.5Z",
                fill: "currentColor"
              }
            ) }),
            text.answer
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "span",
            {
              className: "result-copy-control",
              "data-copied": copied ? "true" : "false",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    className: "result-panel__icon-btn",
                    "aria-label": copied ? text.copied : text.copyAnswer,
                    onClick: copyAnswer,
                    children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "rect",
                        {
                          x: "8",
                          y: "8",
                          width: "10",
                          height: "10",
                          rx: "2",
                          fill: "none",
                          stroke: "currentColor",
                          strokeWidth: "1.8"
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "path",
                        {
                          d: "M6 14H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1",
                          fill: "none",
                          stroke: "currentColor",
                          strokeWidth: "1.8",
                          strokeLinecap: "round"
                        }
                      )
                    ] })
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    className: "result-copy-tooltip",
                    role: "status",
                    "aria-live": "polite",
                    children: copied ? text.copied : text.copy
                  }
                )
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "result-answer__content", children: result.finalText })
      ] }),
      result.warnings.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "result-panel__warning", children: result.warnings.join("\n") }) : null
    ] })
  ] }) });
}
function ResultPrompt({
  label,
  value,
  compact,
  icon
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      className: compact ? "result-prompt result-prompt--compact" : "result-prompt",
      children: [
        icon === "voice" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: "result-prompt__voice-icon",
            "aria-label": label,
            title: label,
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "path",
                {
                  d: "M12 3.75a3.25 3.25 0 0 0-3.25 3.25v4.5a3.25 3.25 0 0 0 6.5 0V7A3.25 3.25 0 0 0 12 3.75Z",
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: "1.9"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "path",
                {
                  d: "M6.25 10.75v.85a5.75 5.75 0 0 0 11.5 0v-.85M12 17.35v2.9M8.75 20.25h6.5",
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: "1.9",
                  strokeLinecap: "round"
                }
              )
            ] })
          }
        ) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "result-prompt__label", children: label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: value })
      ]
    }
  );
}
function computeLabel(state, reason, error, text) {
  if (error) {
    return `${text.initFailedPrefix}${error}`;
  }
  if (state === "error" && reason) {
    return text.errors[reason];
  }
  return text.states[state];
}
function formatCountdown(seconds) {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}
function getCanceledLabel(mode, text) {
  return text.canceled[mode ?? "direct"];
}
const AOSO_SERVER_HOST = "172.30.21.67:9066";
const AOSO_HTTP_BASE_URL = `http://${AOSO_SERVER_HOST}`;
const BUNDLED_ASR_WS_URL = "wss://aiapi.ctmcloud.com.mo:8443/Others/websocket-uat2/ws";
const JAVA_VOICE_WS_URL = "ws://172.27.209.114:8095/aoa_api/voice/transcribe";
const SYSTEM_RESERVED_SHORTCUTS = /* @__PURE__ */ new Set([
  "ALT+F4",
  "ALT+SPACE",
  "ALT+TAB",
  "ALT+SHIFT+TAB",
  "CTRL+ALT+DELETE",
  "CTRL+ESC",
  "CTRL+SHIFT+ESC",
  "SUPER+A",
  "SUPER+D",
  "SUPER+E",
  "SUPER+I",
  "SUPER+L",
  "SUPER+R",
  "SUPER+S",
  "SUPER+SPACE",
  "SUPER+TAB",
  "SUPER+SHIFT+S",
  "SUPER+PRINTSCREEN"
]);
const COMMON_RESERVED_SHORTCUTS = /* @__PURE__ */ new Set([
  "CTRL+A",
  "CTRL+C",
  "CTRL+D",
  "CTRL+F",
  "CTRL+H",
  "CTRL+J",
  "CTRL+L",
  "CTRL+N",
  "CTRL+O",
  "CTRL+P",
  "CTRL+Q",
  "CTRL+R",
  "CTRL+S",
  "CTRL+T",
  "CTRL+U",
  "CTRL+V",
  "CTRL+W",
  "CTRL+X",
  "CTRL+Y",
  "CTRL+Z",
  "CTRL+SHIFT+T",
  "CTRL+TAB",
  "CTRL+SHIFT+TAB",
  "CTRL+SPACE",
  "SHIFT+SPACE",
  "ALT+SHIFT",
  "CTRL+SHIFT",
  "F5",
  "CTRL+F5",
  "PRINTSCREEN",
  "ALT+PRINTSCREEN"
]);
function validateShortcut(shortcut, platform = "win32") {
  const normalized = normalizeShortcut(shortcut);
  if (!normalized) {
    return {
      ok: false,
      reason: "single_key",
      message: "请按下快捷键"
    };
  }
  if (platform === "win32" && isWindowsReservedShortcut(normalized)) {
    return {
      ok: false,
      reason: "reserved",
      message: "此快捷键已保留供系统使用"
    };
  }
  return { ok: true };
}
function normalizeShortcut(shortcut) {
  const parts = shortcut.split("+").map((part) => normalizeShortcutPart(part)).filter((part) => Boolean(part));
  if (parts.length === 0) {
    return "";
  }
  const key = parts[parts.length - 1];
  const modifiers = parts.slice(0, -1);
  const orderedModifiers = [
    "CTRL",
    "ALT",
    "SHIFT",
    "SUPER",
    "COMMAND",
    "META",
    "CMD",
    "RIGHTALT"
  ].filter((modifier) => modifiers.includes(modifier));
  return [...orderedModifiers, key].join("+");
}
function isWindowsReservedShortcut(normalized) {
  return SYSTEM_RESERVED_SHORTCUTS.has(normalized) || COMMON_RESERVED_SHORTCUTS.has(normalized);
}
function normalizeShortcutPart(part) {
  const trimmed = part.trim();
  if (!trimmed) {
    return void 0;
  }
  const upper = trimmed.toUpperCase();
  switch (upper) {
    case "CONTROL":
    case "CTRL":
      return "CTRL";
    case "OPTION":
    case "ALT":
      return "ALT";
    case "SHIFT":
      return "SHIFT";
    case "WIN":
    case "WINDOWS":
    case "SUPER":
      return "SUPER";
    case "COMMAND":
    case "CMD":
      return "COMMAND";
    case "META":
      return "META";
    case "RIGHT ALT":
    case "RIGHTALT":
    case "ALTGR":
    case "ALT GRAPH":
      return "RIGHTALT";
    case "RIGHT SHIFT":
    case "RIGHTSHIFT":
      return "RIGHTSHIFT";
    case "ESCAPE":
      return "ESC";
    case "ARROWUP":
      return "UP";
    case "ARROWDOWN":
      return "DOWN";
    case "ARROWLEFT":
      return "LEFT";
    case "ARROWRIGHT":
      return "RIGHT";
    case "PRINTSCREEN":
    case "PRINT SCREEN":
      return "PRINTSCREEN";
    default:
      return upper;
  }
}
async function loadRendererAppConfig(fetchConfig = fetch) {
  try {
    const response = await fetchConfig("/config.json", { cache: "no-store" });
    if (!response.ok) {
      console.warn(
        `[config] config.json load failed status=${response.status}; using defaults`
      );
      return createDefaultRendererAppConfig();
    }
    return normalizeRendererAppConfig(await response.json());
  } catch (error) {
    console.warn("[config] config.json load failed; using defaults", error);
    return createDefaultRendererAppConfig();
  }
}
function createDefaultRendererAppConfig() {
  return {
    javaVoiceWsUrl: JAVA_VOICE_WS_URL
  };
}
function normalizeRendererAppConfig(input) {
  if (!isRecord(input)) {
    return createDefaultRendererAppConfig();
  }
  return {
    javaVoiceWsUrl: typeof input.javaVoiceWsUrl === "string" && input.javaVoiceWsUrl.trim() ? input.javaVoiceWsUrl.trim() : JAVA_VOICE_WS_URL
  };
}
function isRecord(input) {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
function createJavaVoiceSessionProvider(options = {}) {
  let lastResult;
  const setLastResult = (result) => {
    lastResult = result;
  };
  const clearLastResult = () => {
    lastResult = void 0;
  };
  return {
    transcriptionProvider: createJavaVoiceTranscriptionProvider({
      ...options,
      onStart: clearLastResult,
      onResult: setLastResult
    }),
    postProcessService: {
      takeResult: () => lastResult,
      process: async (input) => {
        const result = lastResult ?? createFallbackPostprocessResult(input);
        lastResult = void 0;
        return result;
      }
    }
  };
}
function createJavaVoiceTranscriptionProvider(options) {
  const listeners = /* @__PURE__ */ new Set();
  const WebSocketConstructor = options.WebSocketConstructor ?? WebSocket;
  const url = options.url ?? JAVA_VOICE_WS_URL;
  let socket;
  let sessionId = "";
  let sequence = 0;
  let finalResult;
  let sessionError;
  let stopResolver;
  const emit = (event) => {
    for (const listener of listeners) {
      listener(event);
    }
  };
  const sendJson = (payload) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error("Java voice WebSocket is not open");
    }
    socket.send(JSON.stringify(payload));
  };
  const cleanup = () => {
    if (socket && socket.readyState !== WebSocket.CLOSED) {
      socket.close();
    }
    socket = void 0;
    stopResolver = void 0;
  };
  const resolveStopWaiter = () => {
    stopResolver?.();
    stopResolver = void 0;
  };
  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start: async (input) => {
      if (socket) {
        throw new Error("Java voice session is already active");
      }
      sessionId = createSessionId();
      sequence = 0;
      finalResult = void 0;
      sessionError = void 0;
      options.onStart();
      console.log(
        `[java-voice] connecting url=${url} sessionId=${sessionId} mode=${input.mode ?? "direct"}`
      );
      const activeSocket = new WebSocketConstructor(url);
      socket = activeSocket;
      activeSocket.addEventListener("message", (event) => {
        const message = parseJavaVoiceMessage(event.data);
        if (!message) {
          return;
        }
        if (message.type === "partial_transcript") {
          emit({ type: "partial", text: message.text ?? "" });
          return;
        }
        if (message.type === "final_result") {
          console.log(
            `[java-voice] final_result sessionId=${message.sessionId ?? sessionId} action=${message.action ?? "insert"} transcriptLength=${message.transcript?.length ?? 0} textLength=${message.text?.length ?? 0}`
          );
          finalResult = message;
          options.onResult(toPostprocessOutput(message));
          emit({ type: "final", text: getFinalTranscriptText(message) });
          resolveStopWaiter();
          return;
        }
        if (message.type === "error") {
          sessionError = new Error(
            message.message ?? message.code ?? "Java voice error"
          );
          console.error(
            `[java-voice] server error sessionId=${sessionId} code=${message.code ?? ""} message=${message.message ?? ""}`
          );
          emit({ type: "error", error: sessionError });
          resolveStopWaiter();
        }
      });
      activeSocket.addEventListener("close", () => {
        console.log(`[java-voice] closed sessionId=${sessionId}`);
        socket = void 0;
        resolveStopWaiter();
      });
      activeSocket.addEventListener("error", () => {
        sessionError = new Error("Java voice WebSocket error");
        console.error(`[java-voice] websocket error sessionId=${sessionId}`);
        emit({ type: "error", error: sessionError });
        resolveStopWaiter();
      });
      try {
        await waitForOpen(activeSocket);
        console.log(`[java-voice] connected sessionId=${sessionId}`);
        sendJson(buildSessionStart(sessionId, input));
        console.log(
          `[java-voice] session_start sent sessionId=${sessionId} mode=${input.mode ?? "direct"} language=${input.language}`
        );
        emit({ type: "started" });
      } catch (error) {
        console.error(
          `[java-voice] connect failed sessionId=${sessionId} url=${url}`,
          error
        );
        cleanup();
        throw error;
      }
    },
    sendAudio: (frame) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      sequence += 1;
      socket.send(
        JSON.stringify({
          type: "audio_frame",
          sessionId,
          seq: sequence,
          pcm: encodePcm16ToBase64(frame.pcm)
        })
      );
    },
    stop: async () => {
      if (!socket) {
        return;
      }
      try {
        console.log(`[java-voice] audio_end sent sessionId=${sessionId}`);
        sendJson({ type: "audio_end", sessionId });
        await waitForSessionEnd(
          () => finalResult !== void 0 || sessionError !== void 0,
          (resolve) => {
            stopResolver = resolve;
          }
        );
        if (sessionError && !finalResult) {
          throw sessionError;
        }
        emit({ type: "stopped" });
      } finally {
        cleanup();
      }
    },
    cancel: async () => {
      if (!socket) {
        return;
      }
      try {
        console.log(`[java-voice] cancel sent sessionId=${sessionId}`);
        sendJson({ type: "cancel", sessionId, reason: "user_cancelled" });
      } catch {
      }
      cleanup();
    }
  };
}
function buildSessionStart(sessionId, input) {
  return {
    type: "session_start",
    sessionId,
    mode: input.mode ?? "direct",
    language: input.language,
    sampleRate: input.sampleRate,
    audioFormat: "pcm16",
    selectedText: input.selectedText ?? "",
    postprocessMode: input.postprocessMode ?? "clean",
    targetLanguage: input.targetLanguage ?? "en-US",
    ...input.appContext ? { appContext: input.appContext } : {}
  };
}
function toPostprocessOutput(message) {
  return {
    action: message.action ?? "insert",
    finalText: getFinalResultText(message),
    confidence: 0.85,
    usedDictionaryTermIds: [],
    warnings: message.warnings ?? []
  };
}
function getFinalResultText(message) {
  return firstNonBlank(message.text, message.transcript);
}
function getFinalTranscriptText(message) {
  return firstNonBlank(message.transcript, message.text);
}
function firstNonBlank(...values) {
  for (const value of values) {
    if (value?.trim()) {
      return value;
    }
  }
  return values.find((value) => value !== void 0) ?? "";
}
function createFallbackPostprocessResult(input) {
  return {
    action: input.selectedText ? "replace_selection" : "insert",
    finalText: input.rawText,
    confidence: 0,
    usedDictionaryTermIds: [],
    warnings: ["Java voice service did not return a postprocess result"]
  };
}
function waitForOpen(socket) {
  return new Promise((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true });
    socket.addEventListener(
      "error",
      () => reject(new Error("Java voice WebSocket connection failed")),
      {
        once: true
      }
    );
    socket.addEventListener(
      "close",
      () => reject(new Error("Java voice WebSocket closed before opening")),
      {
        once: true
      }
    );
  });
}
function waitForSessionEnd(isEnded, registerResolver) {
  if (isEnded()) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    registerResolver(resolve);
  });
}
function parseJavaVoiceMessage(data) {
  if (typeof data !== "string") {
    return void 0;
  }
  try {
    const parsed = JSON.parse(data);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return void 0;
    }
    const record = parsed;
    return typeof record.type === "string" ? parsed : void 0;
  } catch {
    return void 0;
  }
}
function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `voice-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}
function createIpcTranscriptionProvider(transport) {
  const listeners = /* @__PURE__ */ new Set();
  let receivedFinal = false;
  let unsubscribeTransport;
  const emit = (event) => {
    for (const listener of listeners) {
      listener(event);
    }
  };
  const ensureTransportSubscription = () => {
    if (unsubscribeTransport) {
      return;
    }
    unsubscribeTransport = transport.onTranscriptionEvent((event) => {
      if (event.type === "final") {
        receivedFinal = true;
      }
      emit(deserializeEvent(event));
    });
  };
  ensureTransportSubscription();
  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start: async (input) => {
      receivedFinal = false;
      ensureTransportSubscription();
      await transport.startTranscription(input);
    },
    sendAudio: (frame) => {
      void transport.sendTranscriptionAudio(frame).catch((error) => {
        emit({ type: "error", error: normalizeError(error) });
      });
    },
    stop: async () => {
      const result = await transport.stopTranscription() ?? void 0;
      if (!receivedFinal && result !== void 0 && typeof result.finalText === "string") {
        console.warn(
          `[transcription-ipc] stop reply 先於 final event 到達，使用返回值補發 finalText="${result.finalText}"`
        );
        receivedFinal = true;
        emit({ type: "final", text: result.finalText });
      }
    },
    cancel: async () => {
      await transport.cancelTranscription();
      unsubscribeTransport?.();
      unsubscribeTransport = void 0;
    }
  };
}
function deserializeEvent(event) {
  if (event.type === "error") {
    return { type: "error", error: new Error(event.message) };
  }
  return event;
}
function normalizeError(error) {
  return error instanceof Error ? error : new Error(String(error));
}
function createConfiguredTranscriptionProvider(options = {}) {
  const transport = options.transport ?? createWindowVoiceAiTransport();
  return createIpcTranscriptionProvider(transport);
}
function createWindowVoiceAiTransport() {
  const api = window.voiceAI;
  if (!api) {
    throw new Error(
      "window.voiceAI 不存在：preload 未載入或 contextIsolation 配置錯誤"
    );
  }
  return {
    startTranscription: (input) => api.startTranscription(input),
    sendTranscriptionAudio: (frame) => api.sendTranscriptionAudio(frame),
    stopTranscription: () => api.stopTranscription(),
    cancelTranscription: () => api.cancelTranscription(),
    onTranscriptionEvent: (listener) => api.onTranscriptionEvent(
      (event) => listener(event)
    )
  };
}
const SNAPSHOT_POLL_INTERVAL_MS = 120;
const MODE_HINT_VISIBLE_MS = 2e3;
const BUSY_HINT_VISIBLE_MS = 5e3;
const INTERACTION_SOUND_DURATION_MS = 90;
const RECORDING_LIMIT_WARNING_SECONDS = 60;
function App() {
  const [state, setState] = reactExports.useState("idle");
  const [reason, setReason] = reactExports.useState(void 0);
  const [initError, setInitError] = reactExports.useState(void 0);
  const [level, setLevel] = reactExports.useState(0);
  const [recordingRemainingSeconds, setRecordingRemainingSeconds] = reactExports.useState(void 0);
  const [recordingLimitWarningDismissed, setRecordingLimitWarningDismissed] = reactExports.useState(false);
  const [waveformSamples, setWaveformSamples] = reactExports.useState(void 0);
  const [result, setResult] = reactExports.useState(
    void 0
  );
  const [activeMode, setActiveMode] = reactExports.useState(
    void 0
  );
  const [showModeHint, setShowModeHint] = reactExports.useState(false);
  const [showBusyHint, setShowBusyHint] = reactExports.useState(false);
  const [shortcutHelp, setShortcutHelp] = reactExports.useState(void 0);
  const [waveformStyle, setWaveformStyle] = reactExports.useState("waveform-sunset");
  const [uiLanguage, setUiLanguage] = reactExports.useState("zh-CN");
  const [settingsRevision, setSettingsRevision] = reactExports.useState(0);
  const bundleRef = reactExports.useRef(void 0);
  const resultRef = reactExports.useRef(void 0);
  const showModeHintRef = reactExports.useRef(false);
  const busyHintTimerRef = reactExports.useRef(void 0);
  const recordingLimitWarningDismissedRef = reactExports.useRef(false);
  const shortcutHelpVisibleRef = reactExports.useRef(false);
  const lastRecordingModeRef = reactExports.useRef("direct");
  const networkErrorVisibleRef = reactExports.useRef(false);
  const networkErrorDismissedRef = reactExports.useRef(false);
  const [networkErrorDismissed, setNetworkErrorDismissed] = reactExports.useState(false);
  const hideBusyHint = () => {
    if (busyHintTimerRef.current) {
      window.clearTimeout(busyHintTimerRef.current);
      busyHintTimerRef.current = void 0;
    }
    setShowBusyHint(false);
  };
  const dismissRecordingLimitWarning = () => {
    recordingLimitWarningDismissedRef.current = true;
    setRecordingLimitWarningDismissed(true);
  };
  const resetRecordingLimitWarningDismissed = () => {
    if (!recordingLimitWarningDismissedRef.current) {
      return;
    }
    recordingLimitWarningDismissedRef.current = false;
    setRecordingLimitWarningDismissed(false);
  };
  const hideShortcutHelp = (options = {}) => {
    const wasVisible = shortcutHelpVisibleRef.current;
    shortcutHelpVisibleRef.current = false;
    setShortcutHelp(void 0);
    if (options.reportIdle && wasVisible) {
      window.voiceAI.reportRecordingState({ state: "idle", mode: void 0 });
    }
  };
  const showShortcutHelp = (payload) => {
    hideBusyHint();
    shortcutHelpVisibleRef.current = true;
    setShortcutHelp(payload);
  };
  const showProcessingBusyHint = () => {
    if (busyHintTimerRef.current) {
      window.clearTimeout(busyHintTimerRef.current);
    }
    setShowBusyHint(true);
    busyHintTimerRef.current = window.setTimeout(() => {
      hideBusyHint();
    }, BUSY_HINT_VISIBLE_MS);
  };
  const setDisplayedResult = (next) => {
    resultRef.current = next;
    setResult(next);
    if (next) {
      hideShortcutHelp();
      setState("result");
      window.voiceAI.reportRecordingState({ state: "result", mode: void 0 });
    }
  };
  const dismissResult = () => {
    setDisplayedResult(void 0);
    hideShortcutHelp();
    setState("idle");
    window.voiceAI.reportRecordingState({ state: "idle", mode: void 0 });
  };
  const dismissNetworkError = () => {
    networkErrorVisibleRef.current = false;
    networkErrorDismissedRef.current = true;
    setNetworkErrorDismissed(true);
    hideShortcutHelp();
    if (state === "error") {
      setState("idle");
      setReason(void 0);
      window.voiceAI.reportRecordingState({ state: "idle", mode: void 0 });
    }
  };
  const retryNetworkError = () => {
    const mode = lastRecordingModeRef.current;
    networkErrorDismissedRef.current = false;
    setNetworkErrorDismissed(false);
    setDisplayedResult(void 0);
    const controller = bundleRef.current?.controller;
    if (!controller) {
      return;
    }
    if (state === "listening") {
      controller.retryTranscription().then((ok) => {
        if (ok) {
          networkErrorVisibleRef.current = false;
          setReason(void 0);
        } else {
          networkErrorVisibleRef.current = true;
          setReason("transcription");
        }
      }).catch((error) => {
        networkErrorVisibleRef.current = true;
        setReason("transcription");
        console.error("[voice] 网络错误重试失败", error);
      });
      return;
    }
    controller.handleToggle(mode).catch((error) => {
      console.error("[voice] 网络错误重试失败", error);
    });
  };
  reactExports.useEffect(() => {
    showModeHintRef.current = showModeHint;
  }, [showModeHint]);
  reactExports.useEffect(() => {
    return window.voiceAI.onSettingsChanged((settings) => {
      console.log("[voice] 收到 settings-changed，重新載入語音控制器配置");
      setUiLanguage(settings.ui.language);
      setSettingsRevision((current) => current + 1);
    });
  }, []);
  reactExports.useEffect(() => {
    let cancelled = false;
    let bundle;
    const initialize = async () => {
      try {
        const bootstrapResponse = await window.voiceAI.bootstrapClient();
        const settings = await window.voiceAI.getSettings();
        const appConfig = await loadRendererAppConfig();
        if (cancelled) {
          return;
        }
        setWaveformStyle(settings.recording.waveformStyle);
        setUiLanguage(settings.ui.language);
        bundle = buildController({
          installationId: bootstrapResponse.installationId,
          language: settings.recording.language,
          inputDeviceId: settings.recording.inputDeviceId,
          saveHistory: settings.privacy.saveHistory,
          developerEnabled: settings.developer.enabled,
          javaVoiceWsUrl: appConfig.javaVoiceWsUrl,
          postprocessMode: settings.ai.defaultMode,
          postprocessStyle: settings.ai.defaultStyle,
          targetLanguage: settings.translation.targetLanguage,
          audio: settings.audio,
          onPostprocessResult: (event) => {
            setDisplayedResult({
              rawText: event.rawText,
              selectedText: event.selectedText,
              finalText: event.result.finalText,
              warnings: event.result.warnings
            });
          },
          onClearResult: () => {
            setDisplayedResult(void 0);
            setState("idle");
          },
          onBusyDuringProcessing: showProcessingBusyHint,
          onTranscriptionUnavailable: () => {
            networkErrorVisibleRef.current = true;
            networkErrorDismissedRef.current = false;
            setNetworkErrorDismissed(false);
            setReason("transcription");
          }
        });
        bundleRef.current = bundle;
      } catch (error) {
        if (!cancelled) {
          setInitError(error instanceof Error ? error.message : String(error));
        }
      }
    };
    void initialize();
    const unsubscribeConflict = window.voiceAI.onShortcutConflict((payload) => {
      console.warn("[voice] 收到 onShortcutConflict", payload);
      setDisplayedResult(void 0);
      hideShortcutHelp();
      setState("error");
      setReason("shortcut_conflict");
    });
    const unsubscribeCancelRequested = window.voiceAI.onCancelRequested(() => {
      if (resultRef.current) {
        console.log("[voice] 收到 onCancelRequested（ESC），關閉結果浮窗");
        dismissResult();
        return;
      }
      console.log(
        "[voice] 收到 onCancelRequested（ESC），呼叫 controller.cancel()"
      );
      bundleRef.current?.controller.cancel().catch((error) => {
        console.error("[voice] ESC 取消失敗", error);
      });
    });
    const unsubscribeShortcutHelp = window.voiceAI.onShortcutHelp((payload) => {
      console.log("[voice] 收到 onShortcutHelp");
      showShortcutHelp(payload);
    });
    const unsubscribeShortcutHelpDismiss = window.voiceAI.onShortcutHelpDismiss(
      () => {
        console.log("[voice] 收到 onShortcutHelpDismiss");
        hideShortcutHelp({ reportIdle: true });
      }
    );
    let lastReportedState;
    let lastReportedRecordingLimitWarning = false;
    let lastSoundState;
    let lastHintedListeningMode;
    let modeHintTimer;
    const hideModeHint = () => {
      if (modeHintTimer) {
        window.clearTimeout(modeHintTimer);
        modeHintTimer = void 0;
      }
      showModeHintRef.current = false;
      setShowModeHint(false);
    };
    const showModeHintFor = (_mode) => {
      if (modeHintTimer) {
        window.clearTimeout(modeHintTimer);
      }
      showModeHintRef.current = true;
      setShowModeHint(true);
      modeHintTimer = window.setTimeout(() => {
        hideModeHint();
      }, MODE_HINT_VISIBLE_MS);
    };
    const pollHandle = window.setInterval(() => {
      if (!bundle) {
        return;
      }
      const snapshot = bundle.controller.getSnapshot();
      const displayedState = resultRef.current ? "result" : networkErrorVisibleRef.current && !networkErrorDismissedRef.current ? "error" : networkErrorDismissedRef.current && snapshot.state === "error" && snapshot.reason === "transcription" ? "idle" : snapshot.state;
      if (displayedState !== "idle" && displayedState !== "success") {
        hideShortcutHelp();
      }
      if (snapshot.mode) {
        lastRecordingModeRef.current = snapshot.mode;
      }
      if (snapshot.state !== "error" || snapshot.reason !== "transcription") {
        if (!networkErrorVisibleRef.current) {
          setReason(
            (current) => current === "transcription" ? void 0 : current
          );
        }
        networkErrorDismissedRef.current = false;
        setNetworkErrorDismissed(false);
      }
      if (snapshot.state === "listening" && snapshot.mode) {
        if (lastHintedListeningMode !== snapshot.mode) {
          lastHintedListeningMode = snapshot.mode;
          showModeHintFor(snapshot.mode);
        }
      } else {
        lastHintedListeningMode = void 0;
        hideModeHint();
      }
      if (snapshot.state !== "processing" && snapshot.state !== "inserting") {
        hideBusyHint();
      }
      setState((current) => {
        if (current === displayedState) {
          return current;
        }
        console.log(`[voice] 狀態變更 ${current} -> ${displayedState}`);
        return displayedState;
      });
      setReason((current) => {
        const nextReason = networkErrorVisibleRef.current ? "transcription" : displayedState === "result" ? void 0 : snapshot.reason;
        if (current === nextReason) {
          return current;
        }
        console.log(
          `[voice] 錯誤原因變更 ${current ?? "無"} -> ${nextReason ?? "無"}`
        );
        return nextReason;
      });
      const nextMode = displayedState === "result" ? void 0 : snapshot.mode;
      setActiveMode((current) => current === nextMode ? current : nextMode);
      const nextRecordingRemainingSeconds = snapshot.state === "listening" ? bundle.controller.getRecordingRemainingSeconds() : void 0;
      const recordingLimitWarningVisible = displayedState === "listening" && nextRecordingRemainingSeconds !== void 0 && nextRecordingRemainingSeconds <= RECORDING_LIMIT_WARNING_SECONDS && !recordingLimitWarningDismissedRef.current;
      if (displayedState !== "listening" || nextRecordingRemainingSeconds === void 0 || nextRecordingRemainingSeconds > RECORDING_LIMIT_WARNING_SECONDS) {
        resetRecordingLimitWarningDismissed();
      }
      setRecordingRemainingSeconds(
        (current) => current === nextRecordingRemainingSeconds ? current : nextRecordingRemainingSeconds
      );
      if (lastSoundState !== displayedState) {
        playInteractionSoundForState(displayedState, bundle.audio);
        lastSoundState = displayedState;
      }
      if (lastReportedState !== displayedState || lastReportedRecordingLimitWarning !== recordingLimitWarningVisible) {
        console.log(
          `[voice] 上報托盤狀態 ${lastReportedState ?? "初始"} -> ${displayedState}`
        );
        window.voiceAI.reportRecordingState({
          state: displayedState,
          mode: displayedState === "listening" && showModeHintRef.current ? snapshot.mode : void 0,
          recordingLimitWarning: recordingLimitWarningVisible
        });
        lastReportedState = displayedState;
        lastReportedRecordingLimitWarning = recordingLimitWarningVisible;
      }
      const nextLevel = snapshot.state === "listening" ? bundle.getLevel() : 0;
      setLevel((current) => current === nextLevel ? current : nextLevel);
      const nextWaveformSamples = snapshot.state === "listening" ? bundle.getWaveformSamples() : void 0;
      setWaveformSamples(
        (current) => current === nextWaveformSamples ? current : nextWaveformSamples
      );
    }, SNAPSHOT_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      unsubscribeConflict();
      unsubscribeCancelRequested();
      unsubscribeShortcutHelp();
      unsubscribeShortcutHelpDismiss();
      window.clearInterval(pollHandle);
      if (modeHintTimer) {
        window.clearTimeout(modeHintTimer);
      }
      if (busyHintTimerRef.current) {
        window.clearTimeout(busyHintTimerRef.current);
        busyHintTimerRef.current = void 0;
      }
      bundle?.dispose();
      bundleRef.current = void 0;
    };
  }, [settingsRevision]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    OverlayWindow,
    {
      state,
      ...shortcutHelp !== void 0 ? { shortcutHelp } : {},
      ...result !== void 0 ? { result } : {},
      level,
      ...recordingRemainingSeconds !== void 0 && recordingRemainingSeconds <= RECORDING_LIMIT_WARNING_SECONDS && !recordingLimitWarningDismissed ? { recordingRemainingSeconds } : {},
      ...waveformSamples !== void 0 ? { waveformSamples } : {},
      waveformStyle,
      language: uiLanguage,
      ...activeMode !== void 0 ? { mode: activeMode } : {},
      ...activeMode !== void 0 ? {
        modeHintLabel: getModeHintLabel(activeMode, uiLanguage),
        modeHintVisible: showModeHint
      } : {},
      busyHintVisible: showBusyHint,
      ...reason === "transcription" && !networkErrorDismissed ? {
        onDismissNetworkError: dismissNetworkError,
        onRetryNetworkError: retryNetworkError
      } : {},
      ...reason !== void 0 ? { reason } : {},
      ...initError !== void 0 ? { error: initError } : {},
      onCancel: () => {
        console.log("[voice] 使用者點選 × 取消");
        hideBusyHint();
        bundleRef.current?.controller.cancel().catch((error) => {
          console.error("[voice] cancel 失敗", error);
        });
      },
      onConfirm: () => {
        console.log("[voice] 使用者點選 ✓ 確認");
        bundleRef.current?.controller.confirm().catch((error) => {
          console.error("[voice] confirm 失敗", error);
        });
      },
      onUndoCancel: () => {
        console.log("[voice] 使用者撤銷取消");
        bundleRef.current?.controller.undoCancel().catch((error) => {
          console.error("[voice] undoCancel 失敗", error);
        });
      },
      onDismissBusyHint: hideBusyHint,
      onDismissRecordingLimitWarning: dismissRecordingLimitWarning,
      onDismissResult: dismissResult
    }
  );
}
function getModeHintLabel(mode, language) {
  if (language === "en-US") {
    switch (mode) {
      case "direct":
        return "Voice Input";
      case "processSelection":
        return "Smart Rewrite";
      case "translate":
        return "Translate";
    }
  }
  if (language === "zh-TW") {
    switch (mode) {
      case "direct":
        return "語音輸入模式";
      case "processSelection":
        return "智慧改寫模式";
      case "translate":
        return "翻譯模式";
    }
  }
  switch (mode) {
    case "direct":
      return "语音输入模式";
    case "processSelection":
      return "智能改写模式";
    case "translate":
      return "翻译模式";
  }
}
function playInteractionSoundForState(state, audioSettings) {
  if (!audioSettings.interactionSounds) {
    return;
  }
  switch (state) {
    case "listening":
      playInteractionTone(660, 0.045);
      return;
    case "success":
    case "result":
      playInteractionTone(880, 0.04);
      return;
    case "error":
      playInteractionTone(220, 0.055);
      return;
    default:
      return;
  }
}
function playInteractionTone(frequency, volume) {
  try {
    const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextConstructor) {
      return;
    }
    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(1e-4, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(
      1e-4,
      now + INTERACTION_SOUND_DURATION_MS / 1e3
    );
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + INTERACTION_SOUND_DURATION_MS / 1e3);
    oscillator.onended = () => {
      void context.close();
    };
  } catch (error) {
    console.warn("[voice] 交互提示音播放失敗（已忽略）", error);
  }
}
function buildController(input) {
  const workletUrl = createVoiceRecorderWorkletUrl();
  const recorder = createRecorderService({
    adapter: createBrowserRecorderAdapter({
      mediaDevices: navigator.mediaDevices,
      AudioContextConstructor: AudioContext,
      workletUrl
    })
  });
  const voiceServices = input.developerEnabled ? {
    transcriptionProvider: createConfiguredTranscriptionProvider(),
    postProcessService: createPostProcessService({
      backendClient: {
        postprocess: (request) => window.voiceAI.postprocess(request)
      }
    })
  } : createJavaVoiceSessionProvider({ url: input.javaVoiceWsUrl });
  const textTarget = {
    getSelectedText: () => window.voiceAI.getSelectedText(),
    insertText: async (text) => {
      const result = await window.voiceAI.insertText(text);
      if (!result.ok) {
        throw new Error(result.message ?? "insert failed");
      }
    },
    replaceSelection: async (text, expectedSelectedText) => {
      const result = await window.voiceAI.replaceSelectedText(
        text,
        expectedSelectedText
      );
      if (!result.ok) {
        throw new Error(result.message ?? "insert failed");
      }
    }
  };
  const dictionaryTerms = [];
  const controller = createVoiceOperationController({
    recorder,
    transcriptionProvider: voiceServices.transcriptionProvider,
    postProcessService: voiceServices.postProcessService,
    textTarget,
    settings: {
      installationId: input.installationId,
      language: input.language,
      sampleRate: 16e3,
      inputDeviceId: input.inputDeviceId,
      postprocessMode: input.postprocessMode,
      postprocessStyle: input.postprocessStyle,
      targetLanguage: input.targetLanguage,
      dictionaryTerms
    },
    getAppContext: () => window.voiceAI.getActiveWindow(),
    onPostprocessResult: input.onPostprocessResult,
    finalResultBehavior: input.developerEnabled ? "client_postprocess" : "respect_service_action",
    onTranscriptionUnavailable: input.onTranscriptionUnavailable,
    onHistoryRecord: (historyInput) => {
      if (!input.saveHistory) {
        return;
      }
      void window.voiceAI.createHistoryRecord(historyInput).catch((error) => {
        console.warn("[voice] 儲存歷史記錄失敗（已忽略）", error);
      });
    }
  });
  const unsubscribeToggle = window.voiceAI.onToggleRecording(({ mode }) => {
    console.log(`[voice] 收到 onToggleRecording，mode=${mode}`);
    const snapshot = controller.getSnapshot();
    if (snapshot.state === "processing" || snapshot.state === "inserting") {
      input.onBusyDuringProcessing();
      return;
    }
    input.onClearResult();
    void controller.handleToggle(mode);
  });
  let latestRms = 0;
  let latestWaveformSamples;
  const unsubscribeLevel = recorder.subscribe((event) => {
    if (event.type === "frame") {
      latestRms = event.frame.rms;
      latestWaveformSamples = event.frame.pcm;
    } else if (event.type === "stop" || event.type === "error") {
      latestRms = 0;
      latestWaveformSamples = void 0;
    }
  });
  return {
    controller,
    audio: input.audio,
    getLevel: () => latestRms,
    getWaveformSamples: () => latestWaveformSamples,
    dispose: () => {
      unsubscribeToggle();
      unsubscribeLevel();
      controller.dispose();
      URL.revokeObjectURL(workletUrl);
    }
  };
}
const HISTORY_RETRY_FRAME_SIZE = 1600;
const PCM16_WAV_FORMAT = 1;
const PCM16_BITS_PER_SAMPLE = 16;
const PCM16_CHANNELS = 1;
const PCM16_SAMPLE_RATE = 16e3;
async function retryHistoryRecord(record) {
  if (!record.audio) {
    throw new Error("此歷史記錄沒有可重試的音訊。");
  }
  const [audio, settings, bootstrap] = await Promise.all([
    window.voiceAI.readHistoryAudio(record.id),
    window.voiceAI.getSettings(),
    window.voiceAI.bootstrapClient()
  ]);
  if (!audio) {
    throw new Error("未找到此歷史記錄的音訊檔案。");
  }
  const pcm = decodePcm16Wav(audio);
  if (pcm.length === 0) {
    throw new Error("此歷史記錄的音訊為空，無法重試。");
  }
  const transcript = await transcribeHistoryAudio(pcm, {
    installationId: bootstrap.installationId,
    language: settings.recording.language
  });
  const finalText = await resolveHistoryRetryFinalText({
    installationId: bootstrap.installationId,
    mode: record.mode,
    rawText: transcript,
    selectedText: record.selectedText ?? "",
    settings
  });
  const startedAt = (/* @__PURE__ */ new Date()).toISOString();
  const input = {
    startedAt,
    durationMs: record.audio.durationMs || pcm.length / PCM16_SAMPLE_RATE * 1e3,
    mode: record.mode,
    status: transcript.trim() ? "completed" : "no_audio",
    transcript,
    finalText,
    audio: {
      pcm,
      sampleRate: PCM16_SAMPLE_RATE
    }
  };
  if (record.selectedText !== void 0) {
    input.selectedText = record.selectedText;
  }
  return window.voiceAI.createHistoryRecord(input);
}
async function transcribeHistoryAudio(pcm, input) {
  let finalText = "";
  let transcriptionStarted = false;
  const unsubscribe = window.voiceAI.onTranscriptionEvent((event) => {
    if (event.type === "final") {
      finalText = event.text;
    }
  });
  try {
    await window.voiceAI.startTranscription({
      installationId: input.installationId,
      language: input.language,
      sampleRate: PCM16_SAMPLE_RATE
    });
    transcriptionStarted = true;
    for (const frame of buildAudioFrames(pcm)) {
      await window.voiceAI.sendTranscriptionAudio(frame);
    }
    const stopResult = await window.voiceAI.stopTranscription();
    if (!finalText && typeof stopResult?.finalText === "string") {
      finalText = stopResult.finalText;
    }
    return finalText;
  } catch (error) {
    if (transcriptionStarted) {
      await window.voiceAI.cancelTranscription().catch(() => void 0);
    }
    throw error;
  } finally {
    unsubscribe();
  }
}
async function resolveHistoryRetryFinalText(input) {
  if (!input.rawText.trim()) {
    return "";
  }
  if (input.mode === "direct") {
    return input.rawText;
  }
  const result = await window.voiceAI.postprocess({
    installationId: input.installationId,
    rawText: input.rawText,
    selectedText: input.selectedText,
    appContext: await window.voiceAI.getActiveWindow(),
    mode: input.mode === "translate" ? "translate" : input.settings.ai.defaultMode,
    language: toBackendLanguage(input.settings.recording.language),
    style: input.settings.ai.defaultStyle,
    targetLanguage: input.mode === "translate" ? resolveTranslateTargetLanguage(
      input.settings.recording.language,
      input.settings.translation.targetLanguage
    ) : input.settings.translation.targetLanguage,
    dictionaryTerms: []
  });
  return result.finalText;
}
function decodePcm16Wav(audio) {
  if (audio.mimeType !== "audio/wav") {
    throw new Error("歷史音訊格式不支援重試。");
  }
  const view = new DataView(audio.data);
  if (view.byteLength < 44 || readAscii(view, 0, 4) !== "RIFF" || readAscii(view, 8, 4) !== "WAVE") {
    throw new Error("歷史音訊檔案格式無效。");
  }
  let offset = 12;
  let audioFormat;
  let channelCount;
  let sampleRate;
  let bitsPerSample;
  let dataOffset;
  let dataSize;
  while (offset + 8 <= view.byteLength) {
    const chunkId = readAscii(view, offset, 4);
    const chunkSize = view.getUint32(offset + 4, true);
    const chunkDataOffset = offset + 8;
    if (chunkDataOffset + chunkSize > view.byteLength) {
      break;
    }
    if (chunkId === "fmt ") {
      audioFormat = view.getUint16(chunkDataOffset, true);
      channelCount = view.getUint16(chunkDataOffset + 2, true);
      sampleRate = view.getUint32(chunkDataOffset + 4, true);
      bitsPerSample = view.getUint16(chunkDataOffset + 14, true);
    }
    if (chunkId === "data") {
      dataOffset = chunkDataOffset;
      dataSize = chunkSize;
    }
    offset = chunkDataOffset + chunkSize + chunkSize % 2;
  }
  if (audioFormat !== PCM16_WAV_FORMAT || channelCount !== PCM16_CHANNELS || sampleRate !== PCM16_SAMPLE_RATE || bitsPerSample !== PCM16_BITS_PER_SAMPLE || dataOffset === void 0 || dataSize === void 0) {
    throw new Error("歷史音訊必須是 16k 單聲道 PCM WAV 才能重試。");
  }
  const sampleCount = Math.floor(dataSize / 2);
  const pcm = new Int16Array(sampleCount);
  for (let index = 0; index < sampleCount; index += 1) {
    pcm[index] = view.getInt16(dataOffset + index * 2, true);
  }
  return pcm;
}
function buildAudioFrames(pcm) {
  const frames = [];
  for (let offset = 0; offset < pcm.length; offset += HISTORY_RETRY_FRAME_SIZE) {
    const framePcm = pcm.slice(offset, offset + HISTORY_RETRY_FRAME_SIZE);
    frames.push({
      pcm: framePcm,
      sampleRate: PCM16_SAMPLE_RATE,
      timestampMs: Math.round(offset / PCM16_SAMPLE_RATE * 1e3),
      rms: calculateRms$1(framePcm)
    });
  }
  return frames;
}
function calculateRms$1(pcm) {
  if (pcm.length === 0) {
    return 0;
  }
  let sumSquares = 0;
  for (const sample of pcm) {
    const normalized = sample / 32768;
    sumSquares += normalized * normalized;
  }
  return Math.sqrt(sumSquares / pcm.length);
}
function readAscii(view, offset, length) {
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += String.fromCharCode(view.getUint8(offset + index));
  }
  return value;
}
function toBackendLanguage(lang) {
  switch (lang) {
    case "auto":
      return "auto";
    case "mandarin":
    case "zh-CN":
      return "zh-CN";
    case "english":
    case "en-US":
      return "en-US";
    default:
      return "auto";
  }
}
function resolveTranslateTargetLanguage(lang, fallback) {
  switch (lang) {
    case "cantonese":
    case "mandarin":
    case "zh-CN":
      return "en-US";
    case "english":
    case "en-US":
      return "zh-CN";
    default:
      return fallback;
  }
}
const HISTORY_TEXT = {
  "zh-CN": {
    title: "历史记录",
    subtitle: "您的语音口述只储存在这台设备上。",
    more: "更多",
    storeHistory: "保存历史",
    storeHistoryQuestion: "您希望在设备上保存口述历史多久？",
    storeHistoryDuration: "保存历史时长",
    privacyTitle: "您的资料保持私密",
    privacyDescription: "您的语音口述是私密的，零资料保留。它们仅储存在您的设备上，无法从其他地方访问。",
    filtersLabel: "历史筛选",
    filters: {
      all: "全部",
      dictation: "口述",
      translate: "翻译",
      rewrite: "改写"
    },
    emptyTitle: "还没有历史记录",
    emptyDescription: "完成一次语音输入后，音频和文本会出现在这里。",
    listLabel: "历史记录列表",
    viewAnswer: "查看答案",
    retrying: "重试中",
    retry: "重试",
    retryNoAudio: "没有音频，无法重试",
    downloading: "下载中",
    downloadAudio: "下载音频",
    deleting: "删除中",
    delete: "删除",
    close: "关闭",
    answer: "答案",
    input: "输入",
    deleteTitle: "删除此记录？",
    deleteDescription: "此转录将被永久删除，无法恢复。",
    cancel: "取消",
    deleteOldTitle: "删除旧历史记录？",
    applying: "处理中",
    confirm: "确认",
    missingAudioFile: "未找到历史音频文件",
    today: "今天",
    yesterday: "昨天",
    retentionOptions: [
      { value: "never", label: "从不" },
      { value: "24h", label: "24 小时" },
      { value: "7d", label: "1 周" },
      { value: "30d", label: "1 个月" },
      { value: "forever", label: "永远" }
    ],
    retentionDescriptions: {
      never: "您所有的本地历史记录将被永久删除，且之后不会再储存新的历史记录。",
      "24h": "早于 24 小时的本地历史记录将被永久删除，无法恢复。",
      "7d": "早于 1 周的本地历史记录将被永久删除，无法恢复。",
      "30d": "早于 1 个月的本地历史记录将被永久删除，无法恢复。",
      forever: "之后会永久保留新的本地历史记录，现有记录不会被删除。"
    },
    statusLabels: {
      cancelled: "转录已被取消。",
      no_audio: "音频无声。",
      error: "转录失败。",
      completed: "已完成。"
    }
  },
  "zh-TW": {
    title: "歷史記錄",
    subtitle: "您的語音口述只儲存在這臺裝置上。",
    more: "更多",
    storeHistory: "儲存歷史",
    storeHistoryQuestion: "您希望在裝置上儲存口述歷史多久？",
    storeHistoryDuration: "儲存歷史時長",
    privacyTitle: "您的資料保持私密",
    privacyDescription: "您的語音口述是私密的，零資料保留。它們僅儲存在您的裝置上，無法從其他地方訪問。",
    filtersLabel: "歷史篩選",
    filters: {
      all: "全部",
      dictation: "口述",
      translate: "翻譯",
      rewrite: "改寫"
    },
    emptyTitle: "還沒有歷史記錄",
    emptyDescription: "完成一次語音輸入後，音訊和文本會出現在這裡。",
    listLabel: "歷史記錄列表",
    viewAnswer: "檢視答案",
    retrying: "重試中",
    retry: "重試",
    retryNoAudio: "沒有音訊，無法重試",
    downloading: "下載中",
    downloadAudio: "下載音訊",
    deleting: "刪除中",
    delete: "刪除",
    close: "關閉",
    answer: "答案",
    input: "輸入",
    deleteTitle: "刪除此記錄？",
    deleteDescription: "此轉錄將被永久刪除，無法恢復。",
    cancel: "取消",
    deleteOldTitle: "刪除舊歷史記錄？",
    applying: "處理中",
    confirm: "確認",
    missingAudioFile: "未找到歷史音訊檔案",
    today: "今天",
    yesterday: "昨天",
    retentionOptions: [
      { value: "never", label: "從不" },
      { value: "24h", label: "24 小時" },
      { value: "7d", label: "1 周" },
      { value: "30d", label: "1 個月" },
      { value: "forever", label: "永遠" }
    ],
    retentionDescriptions: {
      never: "您所有的本地歷史記錄將被永久刪除，且之後不會再儲存新的歷史記錄。",
      "24h": "早於 24 小時的本地歷史記錄將被永久刪除，無法恢復。",
      "7d": "早於 1 周的本地歷史記錄將被永久刪除，無法恢復。",
      "30d": "早於 1 個月的本地歷史記錄將被永久刪除，無法恢復。",
      forever: "之後會永久保留新的本地歷史記錄，現有記錄不會被刪除。"
    },
    statusLabels: {
      cancelled: "轉錄已被取消。",
      no_audio: "音訊無聲。",
      error: "轉錄失敗。",
      completed: "已完成。"
    }
  },
  "en-US": {
    title: "History",
    subtitle: "Your dictation history is stored only on this device.",
    more: "More",
    storeHistory: "Save History",
    storeHistoryQuestion: "How long do you want to keep dictation history on this device?",
    storeHistoryDuration: "History retention",
    privacyTitle: "Your Data Stays Private",
    privacyDescription: "Your dictation is private with zero data retention. Records are stored only on this device and cannot be accessed elsewhere.",
    filtersLabel: "History filters",
    filters: {
      all: "All",
      dictation: "Dictation",
      translate: "Translate",
      rewrite: "Rewrite"
    },
    emptyTitle: "No History Yet",
    emptyDescription: "Audio and text will appear here after you finish a voice input.",
    listLabel: "History list",
    viewAnswer: "View Answer",
    retrying: "Retrying",
    retry: "Retry",
    retryNoAudio: "No audio to retry",
    downloading: "Downloading",
    downloadAudio: "Download Audio",
    deleting: "Deleting",
    delete: "Delete",
    close: "Close",
    answer: "Answer",
    input: "Input",
    deleteTitle: "Delete This Record?",
    deleteDescription: "This transcript will be permanently deleted and cannot be restored.",
    cancel: "Cancel",
    deleteOldTitle: "Delete Old History?",
    applying: "Applying",
    confirm: "Confirm",
    missingAudioFile: "History audio file not found",
    today: "Today",
    yesterday: "Yesterday",
    retentionOptions: [
      { value: "never", label: "Never" },
      { value: "24h", label: "24 hours" },
      { value: "7d", label: "1 week" },
      { value: "30d", label: "1 month" },
      { value: "forever", label: "Forever" }
    ],
    retentionDescriptions: {
      never: "All local history records will be permanently deleted, and new records will no longer be saved.",
      "24h": "Local history older than 24 hours will be permanently deleted.",
      "7d": "Local history older than 1 week will be permanently deleted.",
      "30d": "Local history older than 1 month will be permanently deleted.",
      forever: "New local history records will be kept forever. Existing records will not be deleted."
    },
    statusLabels: {
      cancelled: "Transcription was cancelled.",
      no_audio: "No audio was detected.",
      error: "Transcription failed.",
      completed: "Completed."
    }
  }
};
function getHistoryText(language) {
  return HISTORY_TEXT[language ?? "zh-CN"] ?? HISTORY_TEXT["zh-CN"];
}
function HistoryPage({
  initialRecords,
  initialNow,
  language
} = {}) {
  const text = getHistoryText(language);
  const [records, setRecords] = reactExports.useState(() => initialRecords ?? []);
  const [filter, setFilter] = reactExports.useState("all");
  const [error, setError] = reactExports.useState(void 0);
  const [deletingIds, setDeletingIds] = reactExports.useState(() => /* @__PURE__ */ new Set());
  const [downloadingIds, setDownloadingIds] = reactExports.useState(() => /* @__PURE__ */ new Set());
  const [retryingIds, setRetryingIds] = reactExports.useState(() => /* @__PURE__ */ new Set());
  const [pendingDeleteRecord, setPendingDeleteRecord] = reactExports.useState(void 0);
  const [answerRecord, setAnswerRecord] = reactExports.useState(void 0);
  const [historyRetention, setHistoryRetention] = reactExports.useState("forever");
  const [pendingRetention, setPendingRetention] = reactExports.useState(void 0);
  const [applyingRetention, setApplyingRetention] = reactExports.useState(false);
  const now = initialNow ?? /* @__PURE__ */ new Date();
  reactExports.useEffect(() => {
    if (initialRecords || typeof window === "undefined") {
      return;
    }
    let cancelled = false;
    void window.voiceAI.listHistoryRecords().then((nextRecords) => {
      if (!cancelled) {
        setRecords(nextRecords);
      }
    }).catch((loadError) => {
      if (!cancelled) {
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [initialRecords]);
  reactExports.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    let cancelled = false;
    void window.voiceAI.getSettings().then((settings) => {
      if (!cancelled) {
        setHistoryRetention(resolveSettingsHistoryRetention(settings));
      }
    }).catch((settingsError) => {
      if (!cancelled) {
        setError(settingsError instanceof Error ? settingsError.message : String(settingsError));
      }
    });
    const unsubscribeSettings = window.voiceAI.onSettingsChanged((settings) => {
      setHistoryRetention(resolveSettingsHistoryRetention(settings));
    });
    const unsubscribeCreated = window.voiceAI.onHistoryRecordCreated((record) => {
      setRecords((current) => upsertHistoryRecord$1(current, record));
    });
    const unsubscribeDeleted = window.voiceAI.onHistoryRecordDeleted(({ id }) => {
      removeHistoryRecordsById([id], setRecords, setAnswerRecord);
    });
    return () => {
      cancelled = true;
      unsubscribeSettings();
      unsubscribeCreated();
      unsubscribeDeleted();
    };
  }, []);
  const visibleRecords = reactExports.useMemo(
    () => records.filter((record) => matchesFilter(record, filter)),
    [filter, records]
  );
  const groups = reactExports.useMemo(
    () => groupHistoryRecordsByDay(visibleRecords, now, language),
    [language, now, visibleRecords]
  );
  const selectedRetention = pendingRetention ?? historyRetention;
  const handleConfirmDelete = async () => {
    const id = pendingDeleteRecord?.id;
    if (!id) {
      return;
    }
    setDeletingIds((current) => new Set(current).add(id));
    setError(void 0);
    try {
      const result = await window.voiceAI.deleteHistoryRecord(id);
      if (result.deleted) {
        setRecords((current) => current.filter((record) => record.id !== id));
        setPendingDeleteRecord(void 0);
        setAnswerRecord((current) => current?.id === id ? void 0 : current);
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : String(deleteError));
    } finally {
      setDeletingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  };
  const handleConfirmRetention = async () => {
    if (!pendingRetention) {
      return;
    }
    setApplyingRetention(true);
    setError(void 0);
    try {
      const result = await window.voiceAI.applyHistoryRetention(pendingRetention);
      setHistoryRetention(resolveSettingsHistoryRetention(result.settings));
      removeHistoryRecordsById(result.deletedIds, setRecords, setAnswerRecord);
      setPendingRetention(void 0);
    } catch (retentionError) {
      setError(retentionError instanceof Error ? retentionError.message : String(retentionError));
    } finally {
      setApplyingRetention(false);
    }
  };
  const handleDownload = async (record) => {
    if (!record.audio) {
      return;
    }
    setDownloadingIds((current) => new Set(current).add(record.id));
    setError(void 0);
    try {
      const audio = await window.voiceAI.readHistoryAudio(record.id);
      if (!audio) {
        throw new Error(text.missingAudioFile);
      }
      triggerHistoryAudioDownload(
        audio.data,
        audio.mimeType,
        buildHistoryAudioFileName(record)
      );
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : String(downloadError));
    } finally {
      setDownloadingIds((current) => {
        const next = new Set(current);
        next.delete(record.id);
        return next;
      });
    }
  };
  const handleRetry = async (record) => {
    if (!record.audio || retryingIds.has(record.id)) {
      return;
    }
    setRetryingIds((current) => new Set(current).add(record.id));
    setError(void 0);
    try {
      const retryRecord = await retryHistoryRecord(record);
      setRecords((current) => upsertHistoryRecord$1(current, retryRecord));
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : String(retryError));
    } finally {
      setRetryingIds((current) => {
        const next = new Set(current);
        next.delete(record.id);
        return next;
      });
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "history-page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "history-header", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: text.title }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: text.subtitle })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "history-header__menu", type: "button", "aria-label": text.more, children: "..." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "history-privacy", "aria-label": text.storeHistory, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "history-privacy__row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: text.storeHistory }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: text.storeHistoryQuestion })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "select",
          {
            "aria-label": text.storeHistoryDuration,
            disabled: applyingRetention,
            value: selectedRetention,
            onChange: (event) => {
              const retention = event.target.value;
              if (retention !== historyRetention) {
                setPendingRetention(retention);
              }
            },
            children: text.retentionOptions.map((option) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: option.value, children: option.label }, option.value))
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "history-privacy__row", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: text.privacyTitle }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: text.privacyDescription })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "history-tabs", role: "tablist", "aria-label": text.filtersLabel, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(HistoryFilterButton, { filter: "all", activeFilter: filter, onChange: setFilter, children: text.filters.all }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(HistoryFilterButton, { filter: "dictation", activeFilter: filter, onChange: setFilter, children: text.filters.dictation }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(HistoryFilterButton, { filter: "translate", activeFilter: filter, onChange: setFilter, children: text.filters.translate }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(HistoryFilterButton, { filter: "rewrite", activeFilter: filter, onChange: setFilter, children: text.filters.rewrite })
    ] }),
    error ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "history-error", children: error }) : null,
    groups.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "history-empty", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: text.emptyTitle }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: text.emptyDescription })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "history-list", "aria-label": text.listLabel, children: groups.map((group) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "history-group", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: group.label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "history-group__items", children: group.records.map((record) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        HistoryRecordRow,
        {
          record,
          deleting: deletingIds.has(record.id),
          downloading: downloadingIds.has(record.id),
          retrying: retryingIds.has(record.id),
          text,
          onDownload: handleDownload,
          onRequestDelete: setPendingDeleteRecord,
          onRetry: handleRetry,
          onViewAnswer: setAnswerRecord
        },
        record.id
      )) })
    ] }, group.label)) }),
    pendingDeleteRecord ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      DeleteHistoryConfirmDialog,
      {
        deleting: deletingIds.has(pendingDeleteRecord.id),
        record: pendingDeleteRecord,
        text,
        onCancel: () => setPendingDeleteRecord(void 0),
        onConfirm: handleConfirmDelete
      }
    ) : null,
    pendingRetention ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      HistoryRetentionConfirmDialog,
      {
        applying: applyingRetention,
        retention: pendingRetention,
        text,
        onCancel: () => setPendingRetention(void 0),
        onConfirm: handleConfirmRetention
      }
    ) : null,
    answerRecord ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      HistoryAnswerDialog,
      {
        record: answerRecord,
        text,
        onClose: () => setAnswerRecord(void 0)
      }
    ) : null
  ] });
}
function HistoryFilterButton({
  activeFilter,
  children,
  filter,
  onChange
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      className: activeFilter === filter ? "history-tabs__item history-tabs__item--active" : "history-tabs__item",
      type: "button",
      role: "tab",
      "aria-selected": activeFilter === filter,
      onClick: () => onChange(filter),
      children
    }
  );
}
function HistoryRecordRow({
  deleting,
  downloading,
  onDownload,
  onRequestDelete,
  onRetry,
  onViewAnswer,
  retrying,
  record,
  text
}) {
  const displayText = getHistoryRecordListText(record, text);
  const answerText = getHistoryRecordAnswerText(record);
  const canViewAnswer = record.mode === "processSelection" && answerText.length > 0;
  const canRetry = record.audio !== void 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { className: "history-row", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("time", { className: "history-row__time", dateTime: record.startedAt, children: formatRecordTime(record.startedAt) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "history-row__body", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: displayText }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "history-row__actions", children: [
      canViewAnswer ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "history-row__answer-button",
          type: "button",
          onClick: () => onViewAnswer(record),
          children: text.viewAnswer
        }
      ) : null,
      record.status !== "completed" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "history-row__icon-button",
          type: "button",
          "aria-label": retrying ? text.retrying : canRetry ? text.retry : text.retryNoAudio,
          title: retrying ? text.retrying : canRetry ? text.retry : text.retryNoAudio,
          disabled: !canRetry || retrying,
          onClick: () => {
            void onRetry(record);
          },
          children: retrying ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "..." }) : /* @__PURE__ */ jsxRuntimeExports.jsx(RetryIcon, {})
        }
      ) : null,
      record.audio ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "history-row__icon-button",
          type: "button",
          "aria-label": downloading ? text.downloading : text.downloadAudio,
          title: downloading ? text.downloading : text.downloadAudio,
          disabled: downloading,
          onClick: () => {
            void onDownload(record);
          },
          children: downloading ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "..." }) : /* @__PURE__ */ jsxRuntimeExports.jsx(DownloadIcon$1, {})
        }
      ) : null,
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "history-row__icon-button",
          type: "button",
          "aria-label": deleting ? text.deleting : text.delete,
          title: deleting ? text.deleting : text.delete,
          disabled: deleting,
          onClick: () => onRequestDelete(record),
          children: deleting ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: text.deleting }) : /* @__PURE__ */ jsxRuntimeExports.jsx(TrashIcon, {})
        }
      )
    ] })
  ] });
}
function HistoryAnswerDialog({
  record,
  text,
  onClose
}) {
  const prompt = getHistoryRecordListText(record, text);
  const answer = getHistoryRecordAnswerText(record) || text.statusLabels[record.status];
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "history-answer-modal", role: "presentation", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      className: "history-answer-dialog",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "history-answer-title",
      "aria-describedby": "history-answer-content",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "history-answer-dialog__close",
            type: "button",
            "aria-label": text.close,
            onClick: onClose,
            children: "×"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { id: "history-answer-title", children: text.answer }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "history-answer-dialog__prompt", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: text.input }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: prompt })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "history-answer-dialog__content", id: "history-answer-content", children: answer }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "history-answer-dialog__actions", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, children: text.close }) })
      ]
    }
  ) });
}
function DownloadIcon$1() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "svg",
    {
      "aria-hidden": "true",
      fill: "none",
      height: "16",
      stroke: "currentColor",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      strokeWidth: "2",
      viewBox: "0 0 24 24",
      width: "16",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 3v12" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "m7 10 5 5 5-5" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M5 21h14" })
      ]
    }
  );
}
function RetryIcon() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "svg",
    {
      "aria-hidden": "true",
      fill: "none",
      height: "16",
      stroke: "currentColor",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      strokeWidth: "2",
      viewBox: "0 0 24 24",
      width: "16",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M21 12a9 9 0 1 1-2.64-6.36" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M21 3v6h-6" })
      ]
    }
  );
}
function getHistoryRecordListText(record, text) {
  if (record.mode === "processSelection") {
    return record.transcript.trim() || record.selectedText?.trim() || text.statusLabels[record.status];
  }
  return record.finalText.trim() || record.transcript.trim() || text.statusLabels[record.status];
}
function getHistoryRecordAnswerText(record) {
  return record.finalText.trim();
}
function DeleteHistoryConfirmDialog({
  deleting,
  record,
  text,
  onCancel,
  onConfirm
}) {
  const preview = record.finalText || record.transcript || text.statusLabels[record.status];
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "history-delete-modal", role: "presentation", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      className: "history-delete-dialog",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "history-delete-title",
      "aria-describedby": "history-delete-description",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "history-delete-dialog__close",
            type: "button",
            "aria-label": text.close,
            disabled: deleting,
            onClick: onCancel,
            children: "×"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { id: "history-delete-title", children: text.deleteTitle }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { id: "history-delete-description", children: text.deleteDescription }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "history-delete-dialog__preview", children: preview }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "history-delete-dialog__actions", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: "history-delete-dialog__cancel",
              type: "button",
              disabled: deleting,
              onClick: onCancel,
              children: text.cancel
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: "history-delete-dialog__confirm",
              type: "button",
              disabled: deleting,
              onClick: () => {
                void onConfirm();
              },
              children: deleting ? text.deleting : text.delete
            }
          )
        ] })
      ]
    }
  ) });
}
function HistoryRetentionConfirmDialog({
  applying,
  retention,
  text,
  onCancel,
  onConfirm
}) {
  const isDeleting = retention !== "forever";
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "history-delete-modal", role: "presentation", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      className: "history-delete-dialog",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "history-retention-title",
      "aria-describedby": "history-retention-description",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "history-delete-dialog__close",
            type: "button",
            "aria-label": text.close,
            disabled: applying,
            onClick: onCancel,
            children: "×"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { id: "history-retention-title", children: text.deleteOldTitle }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { id: "history-retention-description", children: getHistoryRetentionConfirmDescription(retention, text) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "history-delete-dialog__actions", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: "history-delete-dialog__cancel",
              type: "button",
              disabled: applying,
              onClick: onCancel,
              children: text.cancel
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: isDeleting ? "history-delete-dialog__confirm" : "history-delete-dialog__primary",
              type: "button",
              disabled: applying,
              onClick: () => {
                void onConfirm();
              },
              children: applying ? text.applying : isDeleting ? text.delete : text.confirm
            }
          )
        ] })
      ]
    }
  ) });
}
function TrashIcon() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "svg",
    {
      "aria-hidden": "true",
      fill: "none",
      height: "16",
      stroke: "currentColor",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      strokeWidth: "2",
      viewBox: "0 0 24 24",
      width: "16",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M3 6h18" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M8 6V4h8v2" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M19 6l-1 14H6L5 6" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M10 11v5" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M14 11v5" })
      ]
    }
  );
}
function getHistoryRetentionConfirmDescription(retention, text) {
  return text.retentionDescriptions[retention];
}
function resolveSettingsHistoryRetention(settings) {
  return settings.privacy.historyRetention ?? (settings.privacy.saveHistory ? "forever" : "never");
}
function upsertHistoryRecord$1(records, record) {
  return [record, ...records.filter((item) => item.id !== record.id)].sort(
    (left, right) => right.startedAt.localeCompare(left.startedAt)
  );
}
function removeHistoryRecordsById(ids, setRecords, setAnswerRecord) {
  if (ids.length === 0) {
    return;
  }
  const deletedIds = new Set(ids);
  setRecords((current) => current.filter((record) => !deletedIds.has(record.id)));
  setAnswerRecord((current) => current && deletedIds.has(current.id) ? void 0 : current);
}
function groupHistoryRecordsByDay(records, now = /* @__PURE__ */ new Date(), language) {
  const text = getHistoryText(language);
  const today = toDateKey(now);
  const yesterday = toDateKey(new Date(now.getTime() - 24 * 60 * 60 * 1e3));
  const groups = /* @__PURE__ */ new Map();
  for (const record of records) {
    const key = toDateKey(new Date(record.startedAt));
    const label = key === today ? text.today : key === yesterday ? text.yesterday : key;
    const group = groups.get(label) ?? [];
    group.push(record);
    groups.set(label, group);
  }
  return Array.from(groups.entries()).map(([label, groupRecords]) => ({
    label,
    records: groupRecords
  }));
}
function matchesFilter(record, filter) {
  if (filter === "all") {
    return true;
  }
  if (filter === "rewrite") {
    return record.mode === "processSelection";
  }
  if (filter === "translate") {
    return record.mode === "translate";
  }
  return record.mode === "direct";
}
function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}
function formatRecordTime(value) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
function buildHistoryAudioFileName(record) {
  const timestamp = record.startedAt.replace(/[:.]/g, "-").replace("T", "_").replace("Z", "");
  return `voice-history-${timestamp}.wav`;
}
function triggerHistoryAudioDownload(data, mimeType, fileName) {
  const url = URL.createObjectURL(new Blob([data], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
const SHORTCUT_LABELS = {
  RightAlt: "Right Alt",
  "RightAlt+Space": "Right Alt + Space",
  "RightAlt+RightShift": "Right Alt + Right Shift"
};
const SYMBOL_KEY_LABELS = {
  "-": "-",
  "=": "=",
  ",": ",",
  ".": ".",
  "/": "/",
  "\\": "\\",
  ";": ";",
  "'": "'",
  "[": "[",
  "]": "]",
  "`": "`"
};
const SYMBOL_KEY_ACCELERATORS = {
  Minus: "-",
  Equal: "=",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  BracketLeft: "[",
  BracketRight: "]",
  Backquote: "`"
};
const RIGHT_ALT_FALLBACK_CAPTURE_MS = 600;
function formatShortcutLabel(value) {
  if (value in SHORTCUT_LABELS) {
    return SHORTCUT_LABELS[value];
  }
  return value.split("+").filter(Boolean).map((part) => {
    switch (part) {
      case "Ctrl":
      case "Alt":
      case "Shift":
        return part;
      case "Super":
        return "Win";
      case "AltGr":
      case "RightAlt":
        return "Right Alt";
      default:
        if (part in SYMBOL_KEY_LABELS) {
          return SYMBOL_KEY_LABELS[part];
        }
        return part.length === 1 ? part.toUpperCase() : part;
    }
  }).join(" + ");
}
const INVALID_SHORTCUT_MESSAGE = "请按下一个快捷键";
function createShortcutCaptureHandlers(options) {
  const pressedModifiers = /* @__PURE__ */ new Set();
  let rightAltFallbackTimer;
  let finished = false;
  const reset = () => {
    if (rightAltFallbackTimer) {
      clearTimeout(rightAltFallbackTimer);
      rightAltFallbackTimer = void 0;
    }
    pressedModifiers.clear();
    finished = false;
  };
  const clearRightAltFallback = () => {
    if (!rightAltFallbackTimer) {
      return;
    }
    clearTimeout(rightAltFallbackTimer);
    rightAltFallbackTimer = void 0;
  };
  const finish = (accelerator) => {
    if (finished) {
      return;
    }
    clearRightAltFallback();
    const validation = validateShortcut(accelerator, "win32");
    if (!validation.ok) {
      options.onInvalid?.(validation.message ?? INVALID_SHORTCUT_MESSAGE);
      return;
    }
    finished = true;
    options.onCapture(accelerator);
    reset();
  };
  const handleKeyDown = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.code === "Escape") {
      options.onCancel();
      reset();
      return;
    }
    const modifier = modifierFromEvent(event);
    if (modifier) {
      syncHeldModifiersFromEvent(event, pressedModifiers, modifier);
      if (pressedModifiers.has("RightAlt") && event.code === "ShiftRight") {
        finish("RightAlt+RightShift");
        return;
      }
      pressedModifiers.add(modifier);
      if (modifier === "RightAlt" && pressedModifiers.size === 1 && !rightAltFallbackTimer) {
        rightAltFallbackTimer = setTimeout(() => {
          if (pressedModifiers.size === 1 && pressedModifiers.has("RightAlt") && !finished) {
            finish("RightAlt");
          }
        }, RIGHT_ALT_FALLBACK_CAPTURE_MS);
      }
      return;
    }
    syncHeldModifiersFromEvent(event, pressedModifiers);
    if (pressedModifiers.has("RightAlt") && event.code === "Space") {
      finish("RightAlt+Space");
      return;
    }
    const key = keyFromEvent(event);
    if (!key) {
      options.onInvalid?.(INVALID_SHORTCUT_MESSAGE);
      return;
    }
    finish(buildAccelerator(pressedModifiers, key));
  };
  const handleKeyUp = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.code === "AltRight" || event.key === "AltGraph") {
      if (pressedModifiers.has("RightAlt") && !finished && pressedModifiers.size === 1) {
        finish("RightAlt");
        return;
      }
      clearRightAltFallback();
      pressedModifiers.delete("RightAlt");
      return;
    }
    const modifier = modifierFromEvent(event);
    if (modifier) {
      if (pressedModifiers.has(modifier) && !finished) {
        if (pressedModifiers.size === 1) {
          finish(modifier);
          return;
        }
        if (pressedModifiers.size > 1) {
          finish(buildModifierAccelerator(pressedModifiers));
          return;
        }
      }
      pressedModifiers.delete(modifier);
    }
  };
  return {
    handleKeyDown,
    handleKeyUp,
    reset
  };
}
function modifierFromEvent(event) {
  switch (event.code) {
    case "ControlLeft":
    case "ControlRight":
      return "Ctrl";
    case "AltLeft":
      return "Alt";
    case "AltRight":
      return "RightAlt";
    case "ShiftLeft":
    case "ShiftRight":
      return "Shift";
    case "MetaLeft":
    case "MetaRight":
      return "Super";
    default:
      if (event.key === "AltGraph") {
        return "RightAlt";
      }
      return void 0;
  }
}
function syncHeldModifiersFromEvent(event, modifiers, currentModifier) {
  if (isAltGraphActive(event)) {
    modifiers.delete("Ctrl");
    modifiers.delete("Alt");
    modifiers.add("RightAlt");
  } else {
    if (event.ctrlKey && currentModifier !== "Ctrl") {
      modifiers.add("Ctrl");
    }
    if (event.altKey && currentModifier !== "Alt" && currentModifier !== "RightAlt") {
      modifiers.add("Alt");
    }
  }
  if (event.shiftKey && currentModifier !== "Shift") {
    modifiers.add("Shift");
  }
  if (event.metaKey && currentModifier !== "Super") {
    modifiers.add("Super");
  }
}
function isAltGraphActive(event) {
  if (typeof event.getModifierState !== "function") {
    return false;
  }
  return event.getModifierState("AltGraph");
}
function buildAccelerator(modifiers, key) {
  const parts = ["Ctrl", "Alt", "Shift", "Super"].filter(
    (modifier) => modifiers.has(modifier)
  );
  if (modifiers.has("RightAlt")) {
    parts.push("AltGr");
  }
  return [...new Set(parts), key].join("+");
}
function buildModifierAccelerator(modifiers) {
  const parts = ["Ctrl", "Alt", "Shift", "Super"].filter(
    (modifier) => modifiers.has(modifier)
  );
  if (modifiers.has("RightAlt")) {
    parts.push("RightAlt");
  }
  return [...new Set(parts)].join("+");
}
function keyFromEvent(event) {
  if (/^Key[A-Z]$/.test(event.code)) {
    return event.code.slice(3);
  }
  if (/^Digit[0-9]$/.test(event.code)) {
    return event.code.slice(5);
  }
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(event.code)) {
    return event.code;
  }
  switch (event.code) {
    case "Space":
    case "Tab":
    case "Enter":
    case "Backspace":
    case "Delete":
    case "Insert":
    case "Home":
    case "End":
    case "PageUp":
    case "PageDown":
      return event.code;
    case "Escape":
      return "Esc";
    case "ArrowUp":
      return "Up";
    case "ArrowDown":
      return "Down";
    case "ArrowLeft":
      return "Left";
    case "ArrowRight":
      return "Right";
    case "Minus":
    case "Equal":
    case "Comma":
    case "Period":
    case "Slash":
    case "Backslash":
    case "Semicolon":
    case "Quote":
    case "BracketLeft":
    case "BracketRight":
    case "Backquote":
      return SYMBOL_KEY_ACCELERATORS[event.code];
    case "PrintScreen":
      return "PrintScreen";
    default:
      return void 0;
  }
}
const EMPTY_HOME_USAGE_STATS = {
  durationMinutes: 0,
  dictatedCharacters: 0,
  rewriteCount: 0,
  translationCount: 0
};
function buildHomeUsageStats(records) {
  return records.reduce((stats, record) => {
    if (record.status !== "completed") {
      return stats;
    }
    return {
      durationMinutes: stats.durationMinutes + record.durationMs / 6e4,
      dictatedCharacters: stats.dictatedCharacters + getHistoryRecordText(record).length,
      rewriteCount: stats.rewriteCount + (record.mode === "processSelection" ? 1 : 0),
      translationCount: stats.translationCount + (record.mode === "translate" ? 1 : 0)
    };
  }, EMPTY_HOME_USAGE_STATS);
}
function getHistoryRecordText(record) {
  return record.finalText.trim() || record.transcript.trim();
}
const MICROPHONE_METER_BARS = 6;
const MICROPHONE_METER_BAR_THRESHOLDS = [0.02, 0.04, 0.064, 0.096, 0.144, 0.224];
const MICROPHONE_METER_DROP_MARGIN = 0.012;
const MICROPHONE_METER_UPDATE_INTERVAL_MS = 120;
const MICROPHONE_METER_ATTACK_SMOOTHING = 0.24;
const MICROPHONE_METER_RELEASE_SMOOTHING = 0.08;
function calculateRms(samples) {
  if (samples.length === 0) {
    return 0;
  }
  let sum = 0;
  for (const sample of samples) {
    const centered = (sample - 128) / 128;
    sum += centered * centered;
  }
  return Math.sqrt(sum / samples.length);
}
function calculateActiveMeterBars(rms, currentActiveBars = 0, barCount = MICROPHONE_METER_BARS) {
  const safeBarCount = Math.max(0, Math.floor(barCount));
  const thresholds = buildMeterThresholds(safeBarCount);
  const nextActiveBars = thresholds.filter((threshold) => rms >= threshold).length;
  if (nextActiveBars >= currentActiveBars || currentActiveBars <= 1) {
    return nextActiveBars;
  }
  const currentThreshold = thresholds[currentActiveBars - 1] ?? 0;
  return rms >= currentThreshold - MICROPHONE_METER_DROP_MARGIN ? currentActiveBars : nextActiveBars;
}
function buildMeterThresholds(barCount) {
  if (barCount <= 0) {
    return [];
  }
  if (barCount === MICROPHONE_METER_BAR_THRESHOLDS.length) {
    return [...MICROPHONE_METER_BAR_THRESHOLDS];
  }
  const first = MICROPHONE_METER_BAR_THRESHOLDS[0];
  const last = MICROPHONE_METER_BAR_THRESHOLDS[MICROPHONE_METER_BAR_THRESHOLDS.length - 1] ?? first;
  if (barCount === 1) {
    return [first];
  }
  return Array.from({ length: barCount }, (_unused, index) => {
    const ratio = index / (barCount - 1);
    return first + (last - first) * ratio;
  });
}
const AUTO_DEVICE_ID = "";
const MICROPHONE_PICKER_TEXT = {
  "zh-CN": {
    cannotReadDevices: "当前环境无法读取麦克风列表。",
    deviceListFailedPrefix: "麦克风列表读取失败：",
    cannotDetectVolume: "当前环境无法检测音量。",
    volumeFailedPrefix: "音量检测失败：",
    autoDevice: "自动检测（麦克风）",
    selectedFallback: "已选择麦克风",
    autoHint: "使用系统默认麦克风",
    microphoneNamePrefix: "麦克风",
    modalLabel: "麦克风",
    closePicker: "关闭麦克风选择",
    title: "麦克风",
    description: "选择能捕捉到您声音的麦克风。如果指示条没有移动，请尝试其他麦克风。",
    noDevices: "未检测到外部麦克风，当前会使用系统默认设备。",
    inputVolume: "输入音量",
    audioInputDevice: "音频输入设备",
    externalMicrophone: "外部麦克风",
    microphone: "麦克风"
  },
  "zh-TW": {
    cannotReadDevices: "當前環境無法讀取麥克風列表。",
    deviceListFailedPrefix: "麥克風列表讀取失敗：",
    cannotDetectVolume: "當前環境無法檢測音量。",
    volumeFailedPrefix: "音量檢測失敗：",
    autoDevice: "自動檢測（麥克風）",
    selectedFallback: "已選擇麥克風",
    autoHint: "使用系統預設麥克風",
    microphoneNamePrefix: "麥克風",
    modalLabel: "麥克風",
    closePicker: "關閉麥克風選擇",
    title: "麥克風",
    description: "選擇能捕捉到您聲音的麥克風。如果指示條沒有移動，請嘗試其他麥克風。",
    noDevices: "未檢測到外部麥克風，當前會使用系統預設裝置。",
    inputVolume: "輸入音量",
    audioInputDevice: "音訊輸入裝置",
    externalMicrophone: "外部麥克風",
    microphone: "麥克風"
  },
  "en-US": {
    cannotReadDevices: "This environment cannot read the microphone list.",
    deviceListFailedPrefix: "Failed to read microphones: ",
    cannotDetectVolume: "This environment cannot detect input volume.",
    volumeFailedPrefix: "Volume detection failed: ",
    autoDevice: "Auto detect (microphone)",
    selectedFallback: "Selected microphone",
    autoHint: "Use the system default microphone",
    microphoneNamePrefix: "Microphone",
    modalLabel: "Microphone",
    closePicker: "Close microphone picker",
    title: "Microphone",
    description: "Choose a microphone that can capture your voice. If the meter does not move, try another microphone.",
    noDevices: "No external microphone detected. The system default device will be used.",
    inputVolume: "Input volume",
    audioInputDevice: "Audio input device",
    externalMicrophone: "External microphone",
    microphone: "Microphone"
  }
};
function getMicrophonePickerText(language) {
  return MICROPHONE_PICKER_TEXT[language ?? "zh-CN"] ?? MICROPHONE_PICKER_TEXT["zh-CN"];
}
function MicrophoneDevicePicker({
  selectedDeviceId,
  onDeviceChange,
  language,
  variant = "modal",
  selectId = "recording-input-device",
  openSignal,
  hideTrigger = false
}) {
  const text = getMicrophonePickerText(language);
  const [open, setOpen] = reactExports.useState(
    () => getMicrophoneDevicePickerInitialOpen(openSignal !== void 0 && openSignal > 0)
  );
  const [devices, setDevices] = reactExports.useState([]);
  const [activeBars, setActiveBars] = reactExports.useState(0);
  const [status, setStatus] = reactExports.useState(void 0);
  const refreshDevices = reactExports.useCallback(async () => {
    if (!canEnumerateDevices()) {
      setStatus(text.cannotReadDevices);
      return;
    }
    try {
      const nextDevices = dedupeInputDevices(await navigator.mediaDevices.enumerateDevices());
      setDevices(nextDevices);
      setStatus(void 0);
    } catch (error) {
      setStatus(`${text.deviceListFailedPrefix}${formatError(error)}`);
    }
  }, [text]);
  reactExports.useEffect(() => {
    void refreshDevices();
  }, [refreshDevices]);
  reactExports.useEffect(() => {
    if (openSignal !== void 0 && openSignal > 0) {
      setOpen(true);
    }
  }, [openSignal]);
  reactExports.useEffect(() => {
    if (!open || !canOpenMicrophone()) {
      setActiveBars(0);
      return;
    }
    let cancelled = false;
    let stream;
    let audioContext;
    let animationFrame = 0;
    let currentActiveBars = 0;
    let lastMeterUpdateMs = 0;
    let smoothedRms = 0;
    const startMeter = async () => {
      try {
        const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
        if (!AudioContextConstructor) {
          setStatus(text.cannotDetectVolume);
          return;
        }
        stream = await navigator.mediaDevices.getUserMedia({
          audio: buildMicrophoneAudioConstraints(selectedDeviceId)
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        audioContext = new AudioContextConstructor();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const samples = new Uint8Array(analyser.fftSize);
        const tick = () => {
          analyser.getByteTimeDomainData(samples);
          const rawRms = calculateRms(samples);
          const smoothing = rawRms > smoothedRms ? MICROPHONE_METER_ATTACK_SMOOTHING : MICROPHONE_METER_RELEASE_SMOOTHING;
          smoothedRms += (rawRms - smoothedRms) * smoothing;
          const now = window.performance.now();
          if (now - lastMeterUpdateMs >= MICROPHONE_METER_UPDATE_INTERVAL_MS) {
            lastMeterUpdateMs = now;
            const nextActiveBars = calculateActiveMeterBars(smoothedRms, currentActiveBars);
            if (nextActiveBars !== currentActiveBars) {
              currentActiveBars = nextActiveBars;
              setActiveBars(nextActiveBars);
            }
          }
          animationFrame = window.requestAnimationFrame(tick);
        };
        setStatus(void 0);
        void refreshDevices();
        tick();
      } catch (error) {
        setActiveBars(0);
        setStatus(`${text.volumeFailedPrefix}${formatError(error)}`);
      }
    };
    void startMeter();
    return () => {
      cancelled = true;
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
      stream?.getTracks().forEach((track) => track.stop());
      void audioContext?.close();
    };
  }, [open, refreshDevices, selectedDeviceId, text]);
  const selectedLabel = reactExports.useMemo(() => {
    if (!selectedDeviceId) {
      return text.autoDevice;
    }
    return devices.find((device) => device.deviceId === selectedDeviceId)?.label || text.selectedFallback;
  }, [devices, selectedDeviceId, text]);
  const options = reactExports.useMemo(
    () => [
      {
        deviceId: AUTO_DEVICE_ID,
        label: text.autoDevice,
        hint: text.autoHint
      },
      ...devices.map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `${text.microphoneNamePrefix} ${index + 1}`,
        hint: describeDevice(device.label, text)
      }))
    ],
    [devices, text]
  );
  const chooseDevice = (deviceId) => {
    onDeviceChange(deviceId);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `mic-picker mic-picker--${variant}`, children: [
    !hideTrigger && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        id: selectId,
        className: "mic-picker__trigger",
        type: "button",
        "aria-haspopup": "dialog",
        "aria-expanded": open,
        onClick: () => setOpen(true),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mic-picker__trigger-text", children: selectedLabel }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mic-picker__chevron", "aria-hidden": "true", children: "›" })
        ]
      }
    ),
    open && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mic-picker__modal", role: "dialog", "aria-modal": "true", "aria-label": text.modalLabel, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "mic-picker__backdrop",
          type: "button",
          "aria-label": text.closePicker,
          onClick: () => setOpen(false)
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mic-picker__panel", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "mic-picker__close",
            type: "button",
            "aria-label": text.closePicker,
            onClick: () => setOpen(false),
            children: "×"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: text.title }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: text.description })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mic-picker__list", children: options.map((device) => {
          const selected = device.deviceId === selectedDeviceId;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              className: `mic-picker__option${selected ? " mic-picker__option--selected" : ""}`,
              type: "button",
              "aria-pressed": selected,
              onClick: () => chooseDevice(device.deviceId),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: device.label }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: device.hint })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  MicrophoneLevelMeter,
                  {
                    activeBars: selected ? activeBars : 0,
                    active: selected,
                    label: text.inputVolume
                  }
                )
              ]
            },
            device.deviceId || "auto"
          );
        }) }),
        devices.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mic-picker__status", children: text.noDevices }),
        status && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mic-picker__status", children: status })
      ] })
    ] })
  ] });
}
function dedupeInputDevices(devices) {
  const audioInputs = devices.filter((device) => device.kind === "audioinput");
  const deduped = /* @__PURE__ */ new Map();
  for (const device of audioInputs) {
    const normalizedLabel = normalizeDeviceLabel(device.label);
    const groupId = "groupId" in device ? String(device.groupId || "") : "";
    const key = groupId || normalizedLabel || device.deviceId;
    const existing = deduped.get(key);
    if (!existing || rankDevice(device) > rankDevice(existing)) {
      deduped.set(key, {
        deviceId: device.deviceId,
        label: normalizedLabel || device.label,
        kind: device.kind
      });
    }
  }
  return [...deduped.values()];
}
function getMicrophoneDevicePickerInitialOpen(open) {
  return open === true;
}
function buildMicrophoneAudioConstraints(selectedDeviceId) {
  return selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true;
}
function normalizeDeviceLabel(label) {
  return label.replace(/^(Default|Communications)\s*-\s*/i, "").replace(/\s+\(([0-9a-f]{4}:[0-9a-f]{4})\)\s*$/i, "").trim();
}
function rankDevice(device) {
  if (device.deviceId !== "default" && device.deviceId !== "communications") {
    return 3;
  }
  if (device.deviceId === "default") {
    return 2;
  }
  return 1;
}
function MicrophoneLevelMeter({
  activeBars,
  active,
  label,
  barCount = MICROPHONE_METER_BARS
}) {
  const safeBarCount = Math.max(1, Math.floor(barCount));
  const safeActiveBars = active ? Math.max(0, Math.min(safeBarCount, activeBars)) : 0;
  const levelPercent = Math.round(safeActiveBars / safeBarCount * 100);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      className: "mic-level-meter",
      "data-active": active,
      role: "progressbar",
      "aria-label": label,
      "aria-valuemin": 0,
      "aria-valuemax": 100,
      "aria-valuenow": levelPercent,
      style: { "--mic-level": levelPercent / 100 },
      children: Array.from({ length: safeBarCount }, (_, index) => {
        const barActive = index < safeActiveBars;
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: "mic-level-meter__bar",
            "data-filled": barActive,
            "aria-hidden": "true"
          },
          index
        );
      })
    }
  );
}
function canEnumerateDevices() {
  return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.enumerateDevices);
}
function canOpenMicrophone() {
  return typeof navigator !== "undefined" && typeof window !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
}
function describeDevice(label, text) {
  if (!label) {
    return text.audioInputDevice;
  }
  return /usb|ugreen|audio/i.test(label) ? text.externalMicrophone : text.microphone;
}
function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}
function getShortcutDisplay$1(settings, key) {
  const shortcut = settings?.shortcuts[key];
  return shortcut ? formatShortcutLabel(shortcut) : "-";
}
const ONBOARDING_STEP_COUNT = 4;
const ONBOARDING_TEXT = {
  "zh-CN": {
    ariaLabel: "首次引导",
    progressLabel: "引导进度",
    back: "返回",
    closeGuide: "关闭首次引导",
    permissionAllowed: "已允许",
    permissionDenied: "未允许",
    steps: [
      { label: "权限设置", title: "感谢您的信任", eyebrow: "设置" },
      { label: "麦克风", title: "口述以测试您的麦克风", eyebrow: "设置" },
      { label: "快捷键", title: "按下以测试您的语音输入快捷键", eyebrow: "体验一下" },
      { label: "开始使用", title: "说话，别打字", eyebrow: "完成" }
    ],
    permissions: {
      kicker: "权限确认",
      title: "隐私清楚，使用才安心",
      intro: "妙音只在需要时使用这些能力，您也可以稍后在设置里重新调整。",
      trust: ["本机优先", "可随时调整", "按需传送"],
      trustSummary: "隐私处理摘要",
      header: "权限检视",
      count: "5 项能力已整理",
      note: "每一项都只服务于语音输入和文字处理流程。",
      rows: [
        { title: "使用麦克风", description: "录音转写，并检测麦克风音量。" },
        { title: "写入当前应用", description: "把转写结果输入到当前文本框。" },
        { title: "读取剪贴板和选中文本", description: "处理选区、翻译选区，并在粘贴后恢复剪贴板。" },
        { title: "监听全局快捷键", description: "在其他应用中唤起语音输入。" },
        { title: "按需传送到云端", description: "仅在转写、润色、翻译和问答时处理必要内容。" }
      ],
      checkSettings: "先检查设置",
      continue: "继续",
      privacyPoints: [
        { icon: "本机", title: "历史记录在本机", text: "记录默认保留在您的设备上。" },
        { icon: "可控", title: "权限可随时检查", text: "每项能力都能回到设置里检视。" },
        { icon: "必要", title: "云端只处理必要内容", text: "转写和后处理时才传送。" }
      ]
    },
    microphone: {
      title: "口述以测试您的麦克风",
      description: "您计算机内置或外接的麦克风会影响转写效果。",
      question: "您在说话时看到蓝色条形图在移动吗？",
      openPicker: "打开麦克风选择",
      changeMicrophone: "不，换个麦克风",
      continueYes: "是的，继续",
      cannotRead: "当前环境无法读取麦克风。",
      cannotDetect: "当前环境无法检测麦克风音量。",
      failedPrefix: "麦克风检测失败："
    },
    shortcut: {
      title: "按下以测试您的语音输入快捷键",
      descriptionPrefix: "我们推荐使用 ",
      descriptionSuffix: "，按下时右侧文字和边框会变蓝。",
      questionPrefix: "按下时，您看到 ",
      questionSuffix: " 变蓝了吗？",
      changeShortcut: "不，换个键盘快捷键",
      continueYes: "是的，继续"
    },
    ready: {
      ariaLabel: "说话，别打字",
      firstLine: "说话，",
      secondLine: "别打字",
      shortcutsLabel: "快捷键概览",
      voiceInput: "语音输入",
      translate: "翻译",
      askAnything: "问任何问题",
      cta: "我们出发吧"
    }
  },
  "zh-TW": {
    ariaLabel: "首次引導",
    progressLabel: "引導進度",
    back: "返回",
    closeGuide: "關閉首次引導",
    permissionAllowed: "已允許",
    permissionDenied: "未允許",
    steps: [
      { label: "許可權設定", title: "感謝您的信任", eyebrow: "設定" },
      { label: "麥克風", title: "口述以測試您的麥克風", eyebrow: "設定" },
      { label: "快捷鍵", title: "按下以測試您的語音輸入快捷鍵", eyebrow: "體驗一下" },
      { label: "開始使用", title: "說話，別打字", eyebrow: "完成" }
    ],
    permissions: {
      kicker: "許可權確認",
      title: "隱私清楚，使用才安心",
      intro: "妙音只在需要時使用這些能力，您也可以稍後在設定裡重新調整。",
      trust: ["本機優先", "可隨時調整", "按需傳送"],
      trustSummary: "隱私處理摘要",
      header: "權限檢視",
      count: "5 項能力已整理",
      note: "每一項都只服務於語音輸入和文字處理流程。",
      rows: [
        { title: "使用麥克風", description: "錄音轉寫，並檢測麥克風音量。" },
        { title: "寫入當前應用", description: "把轉寫結果輸入到當前文本框。" },
        { title: "讀取剪貼簿和選中文本", description: "處理選區、翻譯選區，並在粘貼後恢復剪貼簿。" },
        { title: "監聽全域性快捷鍵", description: "在其他應用中喚起語音輸入。" },
        { title: "按需傳送到雲端", description: "僅在轉寫、潤色、翻譯和問答時處理必要內容。" }
      ],
      checkSettings: "先檢查設定",
      continue: "繼續",
      privacyPoints: [
        { icon: "本機", title: "歷史記錄在本機", text: "記錄預設保留在您的裝置上。" },
        { icon: "可控", title: "許可權可隨時檢查", text: "每項能力都能回到設定裡檢視。" },
        { icon: "必要", title: "雲端只處理必要內容", text: "轉寫和後處理時才傳送。" }
      ]
    },
    microphone: {
      title: "口述以測試您的麥克風",
      description: "您計算機內建或外接的麥克風會影響轉寫效果。",
      question: "您在說話時看到藍色條形圖在移動嗎？",
      openPicker: "開啟麥克風選擇",
      changeMicrophone: "不，換個麥克風",
      continueYes: "是的，繼續",
      cannotRead: "當前環境無法讀取麥克風。",
      cannotDetect: "當前環境無法檢測麥克風音量。",
      failedPrefix: "麥克風檢測失敗："
    },
    shortcut: {
      title: "按下以測試您的語音輸入快捷鍵",
      descriptionPrefix: "我們推薦使用 ",
      descriptionSuffix: "，按下時右側文字和邊框會變藍。",
      questionPrefix: "按下時，您看到 ",
      questionSuffix: " 變藍了嗎？",
      changeShortcut: "不，換個鍵盤快捷鍵",
      continueYes: "是的，繼續"
    },
    ready: {
      ariaLabel: "說話，別打字",
      firstLine: "說話，",
      secondLine: "別打字",
      shortcutsLabel: "快捷鍵概覽",
      voiceInput: "語音輸入",
      translate: "翻譯",
      askAnything: "問任何問題",
      cta: "我們出發吧"
    }
  },
  "en-US": {
    ariaLabel: "Onboarding guide",
    progressLabel: "Onboarding progress",
    back: "Back",
    closeGuide: "Close onboarding guide",
    permissionAllowed: "Allowed",
    permissionDenied: "Not allowed",
    steps: [
      { label: "Permissions", title: "Thanks for your trust", eyebrow: "Setup" },
      { label: "Microphone", title: "Dictate to test your microphone", eyebrow: "Setup" },
      { label: "Shortcut", title: "Press your voice input shortcut", eyebrow: "Try it" },
      { label: "Ready", title: "Speak, don't type", eyebrow: "Done" }
    ],
    permissions: {
      kicker: "Permission Check",
      title: "Clear Privacy, Confident Use",
      intro: "Voice Assistant uses these abilities only when needed. You can adjust them later in Settings.",
      trust: ["Local first", "Always adjustable", "Sent only when needed"],
      trustSummary: "Privacy summary",
      header: "Permission Review",
      count: "5 capabilities organized",
      note: "Each one only supports the voice input and text processing flow.",
      rows: [
        { title: "Use Microphone", description: "Record and transcribe speech, and detect microphone volume." },
        { title: "Write to Current App", description: "Insert transcription results into the active text field." },
        { title: "Read Clipboard and Selection", description: "Process or translate selected text, then restore the clipboard after paste." },
        { title: "Listen for Global Shortcuts", description: "Start voice input while using other apps." },
        { title: "Send to Cloud When Needed", description: "Only necessary content is processed for transcription, polishing, translation, and Q&A." }
      ],
      checkSettings: "Check Settings",
      continue: "Continue",
      privacyPoints: [
        { icon: "Local", title: "History stays local", text: "Records are kept on your device by default." },
        { icon: "Control", title: "Permissions are reviewable", text: "Every capability can be checked again in Settings." },
        { icon: "Needed", title: "Cloud only gets what it needs", text: "Content is sent only during transcription and post-processing." }
      ]
    },
    microphone: {
      title: "Dictate to Test Your Microphone",
      description: "Your built-in or external microphone affects transcription quality.",
      question: "Do you see the blue bars move while speaking?",
      openPicker: "Open microphone picker",
      changeMicrophone: "No, change microphone",
      continueYes: "Yes, continue",
      cannotRead: "This environment cannot read the microphone.",
      cannotDetect: "This environment cannot detect microphone volume.",
      failedPrefix: "Microphone detection failed: "
    },
    shortcut: {
      title: "Press Your Voice Input Shortcut",
      descriptionPrefix: "We recommend ",
      descriptionSuffix: ". When pressed, the text and border on the right turn blue.",
      questionPrefix: "When you press it, do you see ",
      questionSuffix: " turn blue?",
      changeShortcut: "No, change keyboard shortcut",
      continueYes: "Yes, continue"
    },
    ready: {
      ariaLabel: "Speak, don't type",
      firstLine: "Speak,",
      secondLine: "don't type",
      shortcutsLabel: "Shortcut overview",
      voiceInput: "Voice Input",
      translate: "Translate",
      askAnything: "Ask Anything",
      cta: "Let's go"
    }
  }
};
function getOnboardingText(language) {
  return ONBOARDING_TEXT[language ?? "zh-CN"] ?? ONBOARDING_TEXT["zh-CN"];
}
function OnboardingGuide({
  settings,
  initialStep,
  onClose,
  onOpenSettings,
  onSettingsChange
}) {
  const [stepIndex, setStepIndex] = reactExports.useState(
    () => clampOnboardingStep(initialStep ?? 0)
  );
  const [shortcutPressed, setShortcutPressed] = reactExports.useState(false);
  const shortcut = settings?.shortcuts.toggleRecording || "RightAlt";
  const shortcutLabel = formatShortcutLabel(shortcut);
  const shortcutLabels = {
    toggleRecording: getShortcutDisplay$1(settings, "toggleRecording"),
    processSelection: getShortcutDisplay$1(settings, "processSelection"),
    translateDictation: getShortcutDisplay$1(settings, "translateDictation")
  };
  const text = getOnboardingText(settings?.ui.language);
  const steps = text.steps;
  const isLastStep = stepIndex === steps.length - 1;
  reactExports.useEffect(() => {
    if (!shouldSuspendGlobalShortcutsForOnboardingStep(stepIndex)) {
      return;
    }
    let disposed = false;
    let suspended = false;
    void window.voiceAI.setShortcutCaptureActive(true).then(() => {
      suspended = true;
      if (disposed) {
        void window.voiceAI.setShortcutCaptureActive(false);
      }
    }).catch((error) => {
      console.warn("[onboarding] Failed to suspend global shortcuts", error);
    });
    const handleKeyDown = (event) => {
      if (matchesShortcutEvent(event, shortcut)) {
        event.preventDefault();
        event.stopPropagation();
        setShortcutPressed(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      disposed = true;
      window.removeEventListener("keydown", handleKeyDown, true);
      if (suspended) {
        void window.voiceAI.setShortcutCaptureActive(false);
      }
    };
  }, [shortcut, stepIndex]);
  const goNext = () => {
    if (isLastStep) {
      onClose();
      return;
    }
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };
  const goBack = () => {
    if (stepIndex === 0) {
      onClose();
      return;
    }
    setStepIndex((current) => Math.max(current - 1, 0));
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "onboarding-guide",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": text.ariaLabel,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "onboarding-guide__chrome", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { className: "onboarding-guide__steps", "aria-label": text.progressLabel, children: steps.map((item, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "li",
            {
              className: index === stepIndex ? "onboarding-guide__step--active" : "",
              children: item.eyebrow
            },
            item.label
          )) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "onboarding-guide__progress",
              style: {
                "--onboarding-progress": `${(stepIndex + 1) / steps.length * 100}%`
              }
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "onboarding-guide__back", type: "button", onClick: goBack, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "aria-hidden": "true", children: "←" }),
          text.back
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "onboarding-guide__close",
            type: "button",
            "aria-label": text.closeGuide,
            onClick: onClose,
            children: "×"
          }
        ),
        stepIndex === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(OnboardingPermissionsStep, { text, onNext: goNext, onOpenSettings }),
        stepIndex === 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(
          OnboardingMicrophoneStep,
          {
            inputDeviceId: settings?.recording.inputDeviceId ?? "",
            language: settings?.ui.language,
            text,
            onDeviceChange: (deviceId) => onSettingsChange((current) => ({
              ...current,
              recording: {
                ...current.recording,
                inputDeviceId: deviceId
              }
            })),
            onNext: goNext
          }
        ),
        stepIndex === 2 && /* @__PURE__ */ jsxRuntimeExports.jsx(
          OnboardingShortcutStep,
          {
            text,
            shortcut: shortcutLabel,
            shortcutPressed,
            onNext: goNext,
            onOpenSettings
          }
        ),
        stepIndex === 3 && /* @__PURE__ */ jsxRuntimeExports.jsx(OnboardingReadyStep, { text, shortcuts: shortcutLabels, onNext: goNext })
      ]
    }
  );
}
function clampOnboardingStep(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(ONBOARDING_STEP_COUNT - 1, Math.floor(value)));
}
function shouldSuspendGlobalShortcutsForOnboardingStep(stepIndex) {
  return stepIndex === 2;
}
function matchesShortcutEvent(event, shortcut) {
  const parts = shortcut.split("+").map((part) => part.trim().toLowerCase()).filter(Boolean);
  if (parts.length === 0) {
    return false;
  }
  return parts.every((part) => {
    switch (part) {
      case "rightalt":
      case "right alt":
        return event.code === "AltRight" || event.key === "Alt" && event.location === 2;
      case "leftalt":
      case "left alt":
        return event.code === "AltLeft" || event.key === "Alt" && event.location === 1;
      case "rightshift":
      case "right shift":
        return event.code === "ShiftRight" || event.key === "Shift" && event.location === 2;
      case "leftshift":
      case "left shift":
        return event.code === "ShiftLeft" || event.key === "Shift" && event.location === 1;
      case "space":
        return event.code === "Space" || event.key === " ";
      default:
        return event.key.toLowerCase() === part;
    }
  });
}
const ONBOARDING_MICROPHONE_METER_BARS = 8;
function useMicrophoneLevel(inputDeviceId, text) {
  const [activeBars, setActiveBars] = reactExports.useState(0);
  const [status, setStatus] = reactExports.useState("idle");
  const [message, setMessage] = reactExports.useState(void 0);
  reactExports.useEffect(() => {
    if (typeof navigator === "undefined" || typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setActiveBars(0);
      setStatus("unavailable");
      setMessage(text.cannotRead);
      return;
    }
    const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextConstructor) {
      setActiveBars(0);
      setStatus("unavailable");
      setMessage(text.cannotDetect);
      return;
    }
    let cancelled = false;
    let stream;
    let audioContext;
    let animationFrame = 0;
    let currentActiveBars = 0;
    let lastMeterUpdateMs = 0;
    let smoothedRms = 0;
    const startMeter = async () => {
      try {
        setStatus("idle");
        setMessage(void 0);
        stream = await navigator.mediaDevices.getUserMedia({
          audio: buildMicrophoneAudioConstraints(inputDeviceId)
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        audioContext = new AudioContextConstructor();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const samples = new Uint8Array(analyser.fftSize);
        const tick = () => {
          analyser.getByteTimeDomainData(samples);
          const rawRms = calculateRms(samples);
          const smoothing = rawRms > smoothedRms ? MICROPHONE_METER_ATTACK_SMOOTHING : MICROPHONE_METER_RELEASE_SMOOTHING;
          smoothedRms += (rawRms - smoothedRms) * smoothing;
          const now = window.performance.now();
          if (now - lastMeterUpdateMs >= MICROPHONE_METER_UPDATE_INTERVAL_MS) {
            lastMeterUpdateMs = now;
            const nextActiveBars = calculateActiveMeterBars(
              smoothedRms,
              currentActiveBars,
              ONBOARDING_MICROPHONE_METER_BARS
            );
            if (nextActiveBars !== currentActiveBars) {
              currentActiveBars = nextActiveBars;
              setActiveBars(nextActiveBars);
            }
          }
          setStatus("listening");
          animationFrame = window.requestAnimationFrame(tick);
        };
        tick();
      } catch (error) {
        if (!cancelled) {
          setActiveBars(0);
          setStatus("error");
          setMessage(`${text.failedPrefix}${error instanceof Error ? error.message : String(error)}`);
        }
      }
    };
    void startMeter();
    return () => {
      cancelled = true;
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
      stream?.getTracks().forEach((track) => track.stop());
      void audioContext?.close();
    };
  }, [inputDeviceId, text]);
  return message === void 0 ? { activeBars, status } : { activeBars, status, message };
}
function OnboardingPermissionsStep({
  text,
  onNext,
  onOpenSettings
}) {
  const permissions = text.permissions;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "onboarding-guide__split onboarding-guide__split--permissions", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "onboarding-guide__copy", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "onboarding-guide__kicker", children: permissions.kicker }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: permissions.title }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "onboarding-guide__intro", children: permissions.intro }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "onboarding-guide__trust-strip", "aria-label": permissions.trustSummary, children: permissions.trust.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: item }, item)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "onboarding-permissions", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "onboarding-permissions__header", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: permissions.header }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: permissions.count }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: permissions.note })
        ] }),
        permissions.rows.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          OnboardingPermissionRow,
          {
            title: row.title,
            description: row.description,
            allowedLabel: text.permissionAllowed,
            deniedLabel: text.permissionDenied,
            checked: true
          },
          row.title
        ))
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "onboarding-guide__actions", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "onboarding-guide__secondary", type: "button", onClick: onOpenSettings, children: permissions.checkSettings }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "onboarding-guide__primary", type: "button", onClick: onNext, children: permissions.continue })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "onboarding-guide__visual", "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "onboarding-privacy-card", children: permissions.privacyPoints.map((point) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      PrivacyPoint,
      {
        icon: point.icon,
        title: point.title,
        text: point.text
      },
      point.title
    )) }) })
  ] });
}
function OnboardingPermissionRow({
  title,
  description,
  allowedLabel,
  deniedLabel,
  checked
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { className: "onboarding-permission-row", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "onboarding-permission-row__index", "aria-hidden": "true" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: title }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: description })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "onboarding-permission-row__check", "aria-label": checked ? allowedLabel : deniedLabel, children: checked ? "✓" : "!" })
  ] });
}
function PrivacyPoint({
  icon,
  title,
  text
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "onboarding-privacy-card__item", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: icon }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: title }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: text })
    ] })
  ] });
}
function OnboardingMicrophoneStep({
  inputDeviceId,
  language,
  text,
  onDeviceChange,
  onNext
}) {
  const [pickerOpenSignal, setPickerOpenSignal] = reactExports.useState(0);
  const micLevel = useMicrophoneLevel(inputDeviceId, text.microphone);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "onboarding-guide__split onboarding-guide__split--microphone", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "onboarding-guide__copy", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: text.microphone.title }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: text.microphone.description }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "onboarding-guide__question", children: text.microphone.question }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        MicrophoneDevicePicker,
        {
          language,
          selectedDeviceId: inputDeviceId,
          onDeviceChange,
          openSignal: pickerOpenSignal,
          selectId: "onboarding-microphone-device",
          hideTrigger: true
        }
      ),
      micLevel.message && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "onboarding-guide__status", children: micLevel.message }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "onboarding-guide__actions", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "onboarding-guide__secondary",
            type: "button",
            "aria-label": text.microphone.openPicker,
            onClick: () => setPickerOpenSignal((current) => current + 1),
            children: text.microphone.changeMicrophone
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "onboarding-guide__primary", type: "button", onClick: onNext, children: text.microphone.continueYes })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "onboarding-guide__visual", "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      MicrophoneLevelMeter,
      {
        activeBars: micLevel.activeBars,
        active: micLevel.status === "listening",
        barCount: ONBOARDING_MICROPHONE_METER_BARS,
        label: text.microphone.question
      }
    ) })
  ] });
}
function OnboardingShortcutStep({
  text,
  shortcut,
  shortcutPressed,
  onNext,
  onOpenSettings
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "onboarding-guide__split onboarding-guide__split--shortcut", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "onboarding-guide__copy", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: text.shortcut.title }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
        text.shortcut.descriptionPrefix,
        /* @__PURE__ */ jsxRuntimeExports.jsx(OnboardingKey, { children: shortcut }),
        text.shortcut.descriptionSuffix
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { className: "onboarding-guide__question", children: [
        text.shortcut.questionPrefix,
        shortcut,
        text.shortcut.questionSuffix
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "onboarding-guide__actions", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "onboarding-guide__secondary", type: "button", onClick: onOpenSettings, children: text.shortcut.changeShortcut }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "onboarding-guide__primary",
            type: "button",
            disabled: !shortcutPressed,
            onClick: onNext,
            children: text.shortcut.continueYes
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "onboarding-guide__visual", "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: buildOnboardingShortcutDemoClassName(shortcutPressed), children: shortcut }) })
  ] });
}
function buildOnboardingShortcutDemoClassName(shortcutPressed) {
  return `onboarding-shortcut-demo${shortcutPressed ? " onboarding-shortcut-demo--pressed" : ""}`;
}
function OnboardingReadyStep({
  text,
  shortcuts,
  onNext
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "onboarding-guide__ready", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { "aria-label": text.ready.ariaLabel, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: text.ready.firstLine }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: text.ready.secondLine })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "onboarding-shortcut-grid", "aria-label": text.ready.shortcutsLabel, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { className: "onboarding-shortcut-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: text.ready.voiceInput }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(OnboardingKey, { children: shortcuts.toggleRecording })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { className: "onboarding-shortcut-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: text.ready.translate }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(OnboardingKey, { children: shortcuts.translateDictation })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { className: "onboarding-shortcut-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: text.ready.askAnything }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(OnboardingKey, { children: shortcuts.processSelection })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "onboarding-guide__primary", type: "button", onClick: onNext, children: text.ready.cta })
  ] });
}
function OnboardingKey({ children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("kbd", { className: "onboarding-key", children });
}
const DEFAULT_VERSION_LABEL$1 = "v0.0.0";
const HOME_PAGE_TEXT = {
  "zh-CN": {
    welcomeAria: "欢迎",
    title: "欢迎使用 Voice Assistant Service",
    shortcutPrefix: "轻触一次开始说话。按",
    shortcutSuffix: "来完成。",
    openGuide: "打开首次引导",
    guide: "使用教程",
    shortcutsLabel: "快捷键说明",
    voiceInput: "语音输入",
    smartTranslate: "智能翻译",
    smartRewrite: "智能改写",
    overview: "使用概览",
    dictatedDuration: "累计口述时长",
    dictatedCharacters: "口述字数",
    rewriteCount: "改写辅助次数",
    translationCount: "翻译次数",
    charactersUnit: "字",
    timesUnit: "次",
    translationGlyph: "文",
    footer: "底部信息",
    currentVersionPrefix: "当前版本 ",
    checkUpdates: "检查更新",
    contact: "联系我们"
  },
  "zh-TW": {
    welcomeAria: "歡迎",
    title: "歡迎使用 Voice Assistant Service",
    shortcutPrefix: "輕觸一次開始說話。按",
    shortcutSuffix: "來完成。",
    openGuide: "開啟首次引導",
    guide: "使用教程",
    shortcutsLabel: "快捷鍵說明",
    voiceInput: "語音輸入",
    smartTranslate: "智慧翻譯",
    smartRewrite: "智慧改寫",
    overview: "使用概覽",
    dictatedDuration: "累計口述時長",
    dictatedCharacters: "口述字元數",
    rewriteCount: "改寫輔助次數",
    translationCount: "翻譯次數",
    charactersUnit: "字元",
    timesUnit: "次",
    translationGlyph: "文",
    footer: "底部資訊",
    currentVersionPrefix: "當前版本 ",
    checkUpdates: "檢查更新",
    contact: "聯絡我們"
  },
  "en-US": {
    welcomeAria: "Welcome",
    title: "Welcome to Voice Assistant Service",
    shortcutPrefix: "Tap once to start speaking. Press",
    shortcutSuffix: "to finish.",
    openGuide: "Open onboarding guide",
    guide: "Guide",
    shortcutsLabel: "Shortcut guide",
    voiceInput: "Voice Input",
    smartTranslate: "Smart Translate",
    smartRewrite: "Smart Rewrite",
    overview: "Usage Overview",
    dictatedDuration: "Dictation Time",
    dictatedCharacters: "Dictated Characters",
    rewriteCount: "Rewrite Assists",
    translationCount: "Translations",
    charactersUnit: "chars",
    timesUnit: "times",
    translationGlyph: "A",
    footer: "Footer",
    currentVersionPrefix: "Current version ",
    checkUpdates: "Check for updates",
    contact: "Contact us"
  }
};
function getHomePageText(language) {
  return HOME_PAGE_TEXT[language ?? "zh-CN"] ?? HOME_PAGE_TEXT["zh-CN"];
}
function HomePage({
  initialSettings,
  onCheckUpdates,
  onContact,
  onOpenOnboarding,
  settings,
  usageStats = EMPTY_HOME_USAGE_STATS,
  versionLabel = DEFAULT_VERSION_LABEL$1
}) {
  const displayedSettings = settings ?? initialSettings;
  const text = getHomePageText(displayedSettings?.ui.language);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "home-hero", "aria-label": text.welcomeAria, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "home-hero__header", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "home-hero__title", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "home-hero__title-icon", "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsx(BrandIcon$1, {}) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: text.title }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
              text.shortcutPrefix,
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("kbd", { children: getShortcutDisplay(displayedSettings, "toggleRecording") }),
              " ",
              text.shortcutSuffix
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            className: "home-hero__help",
            type: "button",
            "aria-label": text.openGuide,
            onClick: onOpenOnboarding,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "home-hero__help-icon", "aria-hidden": "true", children: "?" }),
              text.guide
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "home-shortcuts", "aria-label": text.shortcutsLabel, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ShortcutItem,
          {
            dot: "blue",
            label: text.voiceInput,
            keys: getShortcutDisplay(displayedSettings, "toggleRecording")
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ShortcutItem,
          {
            dot: "purple",
            label: text.smartTranslate,
            keys: getShortcutDisplay(displayedSettings, "translateDictation")
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ShortcutItem,
          {
            dot: "green",
            label: text.smartRewrite,
            keys: getShortcutDisplay(displayedSettings, "processSelection")
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "home-stats", "aria-label": text.overview, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        MetricCard,
        {
          tone: "duration",
          icon: /* @__PURE__ */ jsxRuntimeExports.jsx(DurationMetricIcon, {}),
          value: formatInteger(usageStats.durationMinutes),
          unit: "min",
          label: text.dictatedDuration,
          watermark: /* @__PURE__ */ jsxRuntimeExports.jsx(DurationWatermarkIcon, {})
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        MetricCard,
        {
          tone: "characters",
          icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CharactersMetricIcon, {}),
          value: formatInteger(usageStats.dictatedCharacters),
          unit: text.charactersUnit,
          label: text.dictatedCharacters,
          watermark: /* @__PURE__ */ jsxRuntimeExports.jsx(CharactersWatermarkIcon, {})
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        MetricCard,
        {
          tone: "rewrite",
          icon: /* @__PURE__ */ jsxRuntimeExports.jsx(RewriteMetricIcon, {}),
          value: formatInteger(usageStats.rewriteCount),
          unit: text.timesUnit,
          label: text.rewriteCount,
          watermark: /* @__PURE__ */ jsxRuntimeExports.jsx(RewriteWatermarkIcon, {})
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        MetricCard,
        {
          tone: "translation",
          icon: /* @__PURE__ */ jsxRuntimeExports.jsx(TranslationMetricIcon, {}),
          value: formatInteger(usageStats.translationCount),
          unit: text.timesUnit,
          label: text.translationCount,
          watermark: /* @__PURE__ */ jsxRuntimeExports.jsx(TranslationWatermarkIcon, { glyph: text.translationGlyph })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("footer", { className: "home-footer", "aria-label": text.footer, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "home-footer__left", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          text.currentVersionPrefix,
          versionLabel
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "home-footer__link",
            onClick: onCheckUpdates,
            children: text.checkUpdates
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "home-footer__link", onClick: onContact, children: text.contact })
    ] })
  ] });
}
function ShortcutItem({
  dot,
  label,
  keys
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "home-shortcuts__item", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "span",
      {
        className: `home-shortcuts__dot home-shortcuts__dot--${dot}`,
        "aria-hidden": "true"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "home-shortcuts__label", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("kbd", { className: "home-shortcuts__keys", children: keys })
  ] });
}
function MetricCard({
  tone,
  icon,
  value,
  unit,
  label,
  watermark
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { className: `home-metric home-metric--${tone}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "home-metric__watermark", "aria-hidden": "true", children: watermark }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "home-metric__row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "home-metric__icon", "aria-hidden": "true", children: icon }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { className: "home-metric__value", children: [
        value,
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: unit })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "home-metric__label", children: label })
  ] });
}
function DurationMetricIcon() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { viewBox: "0 0 32 32", fill: "none", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M9 3h14M9 29h14" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M11 3c0 6 10 7 10 13S11 23 11 29" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M21 3c0 6-10 7-10 13s10 7 10 13" })
  ] });
}
function CharactersMetricIcon() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { viewBox: "0 0 32 32", fill: "none", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "path",
      {
        className: "home-metric__accent-stroke",
        d: "M5 9c1-2 3-2 4 0M4 14c2-3 5-3 7 0"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: "11", y: "6", width: "14", height: "20", rx: "4" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M14 11h8M18 11v10" })
  ] });
}
function RewriteMetricIcon() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { viewBox: "0 0 32 32", fill: "none", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "path",
      {
        className: "home-metric__accent-stroke",
        d: "M9 4v6M6 7h6M23 5v5M20.5 7.5h5"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M9 25 25 9" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "m20 8 4 4" })
  ] });
}
function TranslationMetricIcon() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { viewBox: "0 0 32 32", fill: "none", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "path",
      {
        className: "home-metric__accent-stroke",
        d: "M7 7h10M12 4v15M8 18c3-2 5-5 6-11"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { className: "home-metric__accent-stroke", d: "M7 25h4M7 25v-4" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "m19 24 4-12 4 12M21 20h4" })
  ] });
}
function DurationWatermarkIcon() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { viewBox: "0 0 112 112", fill: "none", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M56 22v-9M43 12h26" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "56", cy: "64", r: "34" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M56 64 74 47" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M90 38h8M97 55h6M94 74h8" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "89", cy: "26", r: "4", fill: "currentColor", stroke: "none" })
  ] });
}
function CharactersWatermarkIcon() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { viewBox: "0 0 124 112", fill: "none", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "39", cy: "24", r: "11" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: "26", y: "49", width: "40", height: "48", rx: "3" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M83 24h22M83 50h22M83 77h22" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M65 49h12M66 97h12" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "112", cy: "18", r: "5", fill: "currentColor", stroke: "none" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "111", cy: "52", r: "4", fill: "currentColor", stroke: "none" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "111", cy: "78", r: "4", fill: "currentColor", stroke: "none" })
  ] });
}
function RewriteWatermarkIcon() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { viewBox: "0 0 124 112", fill: "none", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: "24", y: "22", width: "58", height: "72", rx: "4" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M36 41h26M36 56h20M36 71h16" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "83", cy: "76", r: "20" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "m83 64 4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1 4-8z" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M80 15h24v72" })
  ] });
}
function TranslationWatermarkIcon({ glyph }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { viewBox: "0 0 124 112", fill: "none", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: "24", y: "28", width: "64", height: "64", rx: "4" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M36 16h64v64" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M44 50h28M58 39v34M48 72c7-5 12-13 15-22" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: "62", y: "73", textAnchor: "middle", children: glyph })
  ] });
}
function formatInteger(value) {
  return Math.round(value).toLocaleString("en-US");
}
function getShortcutDisplay(settings, key) {
  const shortcut = settings?.shortcuts[key];
  return shortcut ? formatShortcutLabel(shortcut) : "-";
}
function BrandIcon$1() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "svg",
    {
      width: "24",
      height: "24",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M8 9h8" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M8 13h5" })
      ]
    }
  );
}
function readConnectionSettings(settings) {
  const ws = getPrimaryWsServer(settings);
  const llm = getPrimaryLlmModel(settings);
  return {
    wsUrl: ws?.url ?? BUNDLED_ASR_WS_URL,
    wsProxy: ws?.proxy ?? "",
    wsProxyUsername: ws?.proxyUsername ?? "",
    wsProxyPassword: ws?.proxyPassword ?? "",
    llmBaseUrl: llm?.baseUrl ?? AOSO_HTTP_BASE_URL,
    llmModelName: llm?.modelName ?? "AOSO API",
    llmProxy: llm?.proxy ?? "",
    llmProxyUsername: llm?.proxyUsername ?? "",
    llmProxyPassword: llm?.proxyPassword ?? ""
  };
}
function patchConnectionSettings(settings, patch) {
  return applyConnectionSettings(settings, {
    ...readConnectionSettings(settings),
    ...patch
  });
}
function applyConnectionSettings(settings, connection) {
  return {
    ...settings,
    ws: {
      servers: [buildWsServer(connection)],
      selectedIndex: 0
    },
    llm: {
      models: [buildLlmModel(connection)],
      selectedIndex: 0
    }
  };
}
function normalizeConnectionSettings(settings) {
  return applyConnectionSettings(settings, readConnectionSettings(settings));
}
function getPrimaryWsServer(settings) {
  if (settings.ws.servers.length === 0) {
    return void 0;
  }
  const index = clampIndex(
    settings.ws.selectedIndex,
    settings.ws.servers.length
  );
  return settings.ws.servers[index];
}
function getPrimaryLlmModel(settings) {
  if (settings.llm.models.length === 0) {
    return void 0;
  }
  const index = clampIndex(
    settings.llm.selectedIndex,
    settings.llm.models.length
  );
  return settings.llm.models[index];
}
function validateConnectionSettings(settings) {
  if (!settings.developer.enabled) {
    return void 0;
  }
  const connection = readConnectionSettings(settings);
  if (!connection.wsUrl.trim()) {
    return "WebSocket 地址不能為空";
  }
  if (!connection.llmBaseUrl.trim()) {
    return "後處理 API 地址不能為空";
  }
  return void 0;
}
function buildWsServer(connection) {
  const config = { url: connection.wsUrl.trim() };
  applyOptionalProxyFields(
    config,
    connection.wsProxy,
    connection.wsProxyUsername,
    connection.wsProxyPassword
  );
  return config;
}
function buildLlmModel(connection) {
  const config = {
    baseUrl: connection.llmBaseUrl.trim(),
    apiKey: "unused",
    modelName: connection.llmModelName.trim() || "AOSO API"
  };
  applyOptionalProxyFields(
    config,
    connection.llmProxy,
    connection.llmProxyUsername,
    connection.llmProxyPassword
  );
  return config;
}
function applyOptionalProxyFields(config, proxy, proxyUsername, proxyPassword) {
  const trimmedProxy = proxy.trim();
  if (trimmedProxy) {
    config.proxy = trimmedProxy;
  }
  const trimmedUsername = proxyUsername.trim();
  if (trimmedUsername) {
    config.proxyUsername = trimmedUsername;
  }
  const trimmedPassword = proxyPassword.trim();
  if (trimmedPassword) {
    config.proxyPassword = trimmedPassword;
  }
}
function clampIndex(value, length) {
  if (length === 0) {
    return -1;
  }
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  if (value >= length) {
    return length - 1;
  }
  return Math.floor(value);
}
const SETTINGS_TEXT = {
  "zh-CN": {
    common: {
      loading: "载入中...",
      loadFailed: "载入配置失败：",
      saveFailed: "储存失败：",
      directConnection: "留空表示直连。",
      optional: "可选。",
      testing: "测试中...",
      testOkSuffix: " ✓",
      testFailSuffix: " ✕"
    },
    header: {
      title: "设置",
      subtitle: "配置会储存在您的设备上，不会上传到云端。"
    },
    sections: {
      appearance: "外观",
      shortcuts: "快捷键",
      language: "语言",
      audio: "音频",
      appBehavior: "应用行为",
      connection: "连接"
    },
    appearance: {
      theme: "主题",
      themeDescription: "默认使用深色主题；浅色主题更适合白天。",
      darkTheme: "深色（默认）",
      lightTheme: "浅色（白色）"
    },
    shortcuts: {
      voiceInput: "语音输入",
      voiceInputDescription: "开始与停止语音输入。",
      smartRewrite: "智能改写",
      smartRewriteDescription: "结合选区与语音指令进行处理。",
      translate: "翻译",
      translateDescription: "开始与停止翻译模式。"
    },
    language: {
      interfaceLanguage: "界面语言",
      interfaceLanguageDescription: "选择用户界面使用的语言。",
      translationTarget: "翻译目标",
      translationTargetDescription: "选择翻译模式下的听写目标语言。"
    },
    audio: {
      microphone: "麦克风",
      microphoneDescription: "选择您首选的麦克风，以便 Typeless 捕捉您的声音。",
      interactionSounds: "交互声音",
      interactionSoundsDescription: "为开始/停止等关键操作播放声音。",
      muteDuringVoiceInput: "语音输入时静音",
      muteDuringVoiceInputDescription: "在语音输入时自动静音其他活动音频。",
      recognitionLanguage: "语音识别语言",
      recognitionLanguageDescription: "影响语音识别的语言提示。",
      waveformEffect: "声波效果",
      waveformEffectDescription: "选择悬浮窗的波形风格。",
      waveformPreview: "声波效果预览"
    },
    appBehavior: {
      launchAtLogin: "登录时启动应用",
      launchAtLoginDescription: "当您的计算机启动时，自动打开 Typeless。"
    },
    connection: {
      developerMode: "开发者模式",
      developerModeDescription: "开启后可填写 ASR WebSocket 与后处理 API；关闭时使用内置 Java 语音服务。",
      asrWebSocketDescription: "语音识别即时转写连接地址。",
      postprocessApi: "后处理 API",
      postprocessApiDescription: "润色、翻译等 HTTP 后处理服务地址。",
      apiDisplayName: "API 显示名称",
      apiDisplayNameDescription: "仅用于界面展示，可选。",
      wsProxyOptional: "WS 代理（可选）",
      apiProxyOptional: "API 代理（可选）",
      wsProxy: "WS 代理",
      apiProxy: "API 代理",
      proxyAddress: "代理地址",
      proxyUsername: "代理用户名",
      proxyPassword: "代理密码",
      proxyUsernamePlaceholder: "用户名",
      proxyPasswordPlaceholder: "密码",
      emptyDirect: "留空表示直连。",
      optionalEmptyDirect: "可选。留空表示直连。",
      wsService: "WS 服务",
      apiService: "后处理 API",
      wsMissing: "请先填写 WebSocket 地址。",
      apiMissing: "请先填写后处理 API 地址。",
      testingWs: "正在测试 WS 服务...",
      testingApi: "正在测试后处理 API...",
      connectionSucceeded: "连接成功",
      connectionFailed: "连接失败：",
      connectionException: "连接异常：",
      wsTest: "WS测试",
      apiTest: "API测试"
    },
    options: {
      interfaceLanguages: [
        { key: "简体中文（中国大陆）", value: "zh-CN" },
        { key: "繁體中文（香港/澳門）", value: "zh-TW" },
        { key: "English (United States)", value: "en-US" }
      ],
      recordingLanguages: [
        { key: "自动 (Auto)", value: "auto" },
        { key: "粤语 (Cantonese)", value: "cantonese" },
        { key: "普通话 (Mandarin)", value: "mandarin" },
        { key: "韩语 (Korean)", value: "korean" },
        { key: "英语 (English)", value: "english" },
        { key: "葡语 (Portuguese)", value: "portuguese" },
        { key: "日语 (Japanese)", value: "japanese" },
        { key: "泰语 (Thai)", value: "thai" },
        { key: "印地语 (Hindi)", value: "hindi" },
        { key: "印尼语 (Indonesia)", value: "indonesia" }
      ],
      translationTargets: [
        { key: "英语（美国）", value: "en-US" },
        { key: "简体中文（中国大陆）", value: "zh-CN" }
      ],
      waveforms: [
        { key: "脉冲焰", value: "waveform-sunset" },
        { key: "银核灰", value: "waveform-mono" },
        { key: "霓虹糖", value: "waveform-candy" }
      ]
    }
  },
  "zh-TW": {
    common: {
      loading: "載入中...",
      loadFailed: "載入配置失敗：",
      saveFailed: "儲存失敗：",
      directConnection: "留空表示直連。",
      optional: "可選。",
      testing: "測試中...",
      testOkSuffix: " ✓",
      testFailSuffix: " ✕"
    },
    header: {
      title: "設定",
      subtitle: "配置會儲存在您的裝置上，不會上傳到雲端。"
    },
    sections: {
      appearance: "外觀",
      shortcuts: "快捷鍵",
      language: "語言",
      audio: "音訊",
      appBehavior: "應用行為",
      connection: "連線"
    },
    appearance: {
      theme: "主題",
      themeDescription: "預設使用深色主題；淺色主題更適合白天。",
      darkTheme: "深色（預設）",
      lightTheme: "淺色（白色）"
    },
    shortcuts: {
      voiceInput: "語音輸入",
      voiceInputDescription: "開始與停止語音輸入。",
      smartRewrite: "智慧改寫",
      smartRewriteDescription: "結合選區與語音指令進行處理。",
      translate: "翻譯",
      translateDescription: "開始與停止翻譯模式。"
    },
    language: {
      interfaceLanguage: "介面語言",
      interfaceLanguageDescription: "選擇使用者介面使用的語言。",
      translationTarget: "翻譯目標",
      translationTargetDescription: "選擇翻譯模式下的聽寫目標語言。"
    },
    audio: {
      microphone: "麥克風",
      microphoneDescription: "選擇您偏好的麥克風，以便 Typeless 捕捉您的聲音。",
      interactionSounds: "互動聲音",
      interactionSoundsDescription: "為開始/停止等關鍵操作播放聲音。",
      muteDuringVoiceInput: "語音輸入時靜音",
      muteDuringVoiceInputDescription: "在語音輸入時自動靜音其他活動音訊。",
      recognitionLanguage: "語音識別語言",
      recognitionLanguageDescription: "影響語音識別的語言提示。",
      waveformEffect: "聲波效果",
      waveformEffectDescription: "選擇懸浮窗的波形風格。",
      waveformPreview: "聲波效果預覽"
    },
    appBehavior: {
      launchAtLogin: "登入時啟動應用",
      launchAtLoginDescription: "當您的電腦啟動時，自動開啟 Typeless。"
    },
    connection: {
      developerMode: "開發者模式",
      developerModeDescription: "開啟後可填寫 ASR WebSocket 與後處理 API；關閉時使用內置 Java 語音服務。",
      asrWebSocketDescription: "語音識別即時轉寫連線地址。",
      postprocessApi: "後處理 API",
      postprocessApiDescription: "潤色、翻譯等 HTTP 後處理服務地址。",
      apiDisplayName: "API 顯示名稱",
      apiDisplayNameDescription: "僅用於介面展示，可選。",
      wsProxyOptional: "WS 代理（可選）",
      apiProxyOptional: "API 代理（可選）",
      wsProxy: "WS 代理",
      apiProxy: "API 代理",
      proxyAddress: "代理地址",
      proxyUsername: "代理使用者名稱",
      proxyPassword: "代理密碼",
      proxyUsernamePlaceholder: "使用者名稱",
      proxyPasswordPlaceholder: "密碼",
      emptyDirect: "留空表示直連。",
      optionalEmptyDirect: "可選。留空表示直連。",
      wsService: "WS 服務",
      apiService: "後處理 API",
      wsMissing: "請先填寫 WebSocket 地址。",
      apiMissing: "請先填寫後處理 API 地址。",
      testingWs: "正在測試 WS 服務...",
      testingApi: "正在測試後處理 API...",
      connectionSucceeded: "連線成功",
      connectionFailed: "連線失敗：",
      connectionException: "連線異常：",
      wsTest: "WS測試",
      apiTest: "API測試"
    },
    options: {
      interfaceLanguages: [
        { key: "簡體中文（中國大陸）", value: "zh-CN" },
        { key: "繁體中文（香港/澳門）", value: "zh-TW" },
        { key: "English (United States)", value: "en-US" }
      ],
      recordingLanguages: [
        { key: "自動 (Auto)", value: "auto" },
        { key: "廣東話 (Cantonese)", value: "cantonese" },
        { key: "普通話 (Mandarin)", value: "mandarin" },
        { key: "韓語 (Korean)", value: "korean" },
        { key: "英語 (English)", value: "english" },
        { key: "葡語 (Portuguese)", value: "portuguese" },
        { key: "日語 (Japanese)", value: "japanese" },
        { key: "泰語 (Thai)", value: "thai" },
        { key: "印地語 (Hindi)", value: "hindi" },
        { key: "印尼語 (Indonesia)", value: "indonesia" }
      ],
      translationTargets: [
        { key: "英語（美國）", value: "en-US" },
        { key: "簡體中文（中國大陸）", value: "zh-CN" }
      ],
      waveforms: [
        { key: "脈衝焰", value: "waveform-sunset" },
        { key: "銀核灰", value: "waveform-mono" },
        { key: "霓虹糖", value: "waveform-candy" }
      ]
    }
  },
  "en-US": {
    common: {
      loading: "Loading...",
      loadFailed: "Failed to load settings: ",
      saveFailed: "Save failed: ",
      directConnection: "Leave blank to connect directly.",
      optional: "Optional.",
      testing: "Testing...",
      testOkSuffix: " ✓",
      testFailSuffix: " ✕"
    },
    header: {
      title: "Settings",
      subtitle: "Settings are stored on this device and are not uploaded to the cloud."
    },
    sections: {
      appearance: "Appearance",
      shortcuts: "Shortcuts",
      language: "Language",
      audio: "Audio",
      appBehavior: "App Behavior",
      connection: "Connection"
    },
    appearance: {
      theme: "Theme",
      themeDescription: "Dark is the default; light works better during the day.",
      darkTheme: "Dark (Default)",
      lightTheme: "Light (White)"
    },
    shortcuts: {
      voiceInput: "Voice Input",
      voiceInputDescription: "Start and stop voice input.",
      smartRewrite: "Smart Rewrite",
      smartRewriteDescription: "Process selected text with spoken instructions.",
      translate: "Translate",
      translateDescription: "Start and stop translation mode."
    },
    language: {
      interfaceLanguage: "Interface Language",
      interfaceLanguageDescription: "Choose the language used by the user interface.",
      translationTarget: "Translation Target",
      translationTargetDescription: "Choose the output language for translation mode."
    },
    audio: {
      microphone: "Microphone",
      microphoneDescription: "Choose your preferred microphone for Typeless to capture your voice.",
      interactionSounds: "Interaction Sounds",
      interactionSoundsDescription: "Play sounds for key actions such as start and stop.",
      muteDuringVoiceInput: "Mute During Voice Input",
      muteDuringVoiceInputDescription: "Automatically mute other active audio during voice input.",
      recognitionLanguage: "Recognition Language",
      recognitionLanguageDescription: "Controls the language hint used for speech recognition.",
      waveformEffect: "Waveform Effect",
      waveformEffectDescription: "Choose the waveform style for the floating window.",
      waveformPreview: "Waveform effect preview"
    },
    appBehavior: {
      launchAtLogin: "Launch at Login",
      launchAtLoginDescription: "Open Typeless automatically when your computer starts."
    },
    connection: {
      developerMode: "Developer Mode",
      developerModeDescription: "Show ASR WebSocket and postprocess API settings. When off, Typeless uses the built-in Java voice service.",
      asrWebSocketDescription: "Realtime speech recognition WebSocket address.",
      postprocessApi: "Postprocess API",
      postprocessApiDescription: "HTTP service address for polishing, translation, and related actions.",
      apiDisplayName: "API Display Name",
      apiDisplayNameDescription: "Only used for display in the interface. Optional.",
      wsProxyOptional: "WS Proxy (Optional)",
      apiProxyOptional: "API Proxy (Optional)",
      wsProxy: "WS Proxy",
      apiProxy: "API Proxy",
      proxyAddress: "Proxy Address",
      proxyUsername: "Proxy Username",
      proxyPassword: "Proxy Password",
      proxyUsernamePlaceholder: "Username",
      proxyPasswordPlaceholder: "Password",
      emptyDirect: "Leave blank to connect directly.",
      optionalEmptyDirect: "Optional. Leave blank to connect directly.",
      wsService: "WS service",
      apiService: "Postprocess API",
      wsMissing: "Please enter the WebSocket address first.",
      apiMissing: "Please enter the postprocess API address first.",
      testingWs: "Testing WS service...",
      testingApi: "Testing postprocess API...",
      connectionSucceeded: "connected",
      connectionFailed: "connection failed: ",
      connectionException: "connection error: ",
      wsTest: "Test WS",
      apiTest: "Test API"
    },
    options: {
      interfaceLanguages: [
        { key: "Simplified Chinese (Mainland China)", value: "zh-CN" },
        { key: "Traditional Chinese (Hong Kong/Macau)", value: "zh-TW" },
        { key: "English (United States)", value: "en-US" }
      ],
      recordingLanguages: [
        { key: "Auto", value: "auto" },
        { key: "Cantonese", value: "cantonese" },
        { key: "Mandarin", value: "mandarin" },
        { key: "Korean", value: "korean" },
        { key: "English", value: "english" },
        { key: "Portuguese", value: "portuguese" },
        { key: "Japanese", value: "japanese" },
        { key: "Thai", value: "thai" },
        { key: "Hindi", value: "hindi" },
        { key: "Indonesian", value: "indonesia" }
      ],
      translationTargets: [
        { key: "English (United States)", value: "en-US" },
        { key: "Simplified Chinese (Mainland China)", value: "zh-CN" }
      ],
      waveforms: [
        { key: "Pulse Flame", value: "waveform-sunset" },
        { key: "Silver Core", value: "waveform-mono" },
        { key: "Neon Candy", value: "waveform-candy" }
      ]
    }
  }
};
function getSettingsText(language) {
  return SETTINGS_TEXT[language ?? "zh-CN"] ?? SETTINGS_TEXT["zh-CN"];
}
function ConnectionSettingsFields({
  settings,
  language,
  onSettingsChange,
  layout,
  wsTestButton,
  llmTestButton,
  wsTestResult,
  llmTestResult
}) {
  const text = getSettingsText(language ?? settings.ui.language);
  const connection = readConnectionSettings(settings);
  const updateConnection = (patch) => {
    onSettingsChange(patchConnectionSettings(settings, patch));
  };
  if (layout === "modal") {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row settings-row--service", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "ASR WebSocket" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: text.connection.asrWebSocketDescription })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-service-control", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                value: connection.wsUrl,
                placeholder: "wss://aiapi.ctmcloud.com.mo:8443/.../ws?AccessCode=...",
                onChange: (event) => updateConnection({ wsUrl: event.target.value })
              }
            ),
            wsTestButton
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ConnectionTestResult, { status: wsTestResult, layout: "modal" })
        ] })
      ] }),
      renderProxyFields("modal", "ws", connection, updateConnection, text),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row settings-row--service", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: text.connection.postprocessApi }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: text.connection.postprocessApiDescription })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-service-control", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                value: connection.llmBaseUrl,
                placeholder: "http://172.30.21.67:9066",
                onChange: (event) => updateConnection({ llmBaseUrl: event.target.value })
              }
            ),
            llmTestButton
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ConnectionTestResult, { status: llmTestResult, layout: "modal" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "settings-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: text.connection.apiDisplayName }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: text.connection.apiDisplayNameDescription })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            value: connection.llmModelName,
            placeholder: "AOSO API",
            onChange: (event) => updateConnection({ llmModelName: event.target.value })
          }
        )
      ] }),
      renderProxyFields("modal", "llm", connection, updateConnection, text)
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row settings-row--service", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row__text", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "ASR WebSocket" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: text.connection.asrWebSocketDescription })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-row__control", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-field", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-service-control", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              id: "ws-url",
              className: "settings__input",
              type: "text",
              value: connection.wsUrl,
              placeholder: "wss://aiapi.ctmcloud.com.mo:8443/.../ws?AccessCode=...",
              onChange: (event) => updateConnection({ wsUrl: event.target.value })
            }
          ),
          wsTestButton
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ConnectionTestResult, { status: wsTestResult, layout: "page" })
      ] }) })
    ] }),
    renderProxyFields("page", "ws", connection, updateConnection, text),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row settings-row--service", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row__text", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: text.connection.postprocessApi }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: text.connection.postprocessApiDescription })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-row__control", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-field", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-service-control", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              id: "llm-base-url",
              className: "settings__input",
              type: "text",
              value: connection.llmBaseUrl,
              placeholder: "http://172.30.21.67:9066",
              onChange: (event) => updateConnection({ llmBaseUrl: event.target.value })
            }
          ),
          llmTestButton
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ConnectionTestResult, { status: llmTestResult, layout: "page" })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row__text", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: text.connection.apiDisplayName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: text.connection.apiDisplayNameDescription })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-row__control", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          id: "llm-model-name",
          className: "settings__input",
          type: "text",
          value: connection.llmModelName,
          placeholder: "AOSO API",
          onChange: (event) => updateConnection({ llmModelName: event.target.value })
        }
      ) })
    ] }),
    renderProxyFields("page", "llm", connection, updateConnection, text)
  ] });
}
function getConnectionTargets(settings) {
  const normalized = patchConnectionSettings(settings, readConnectionSettings(settings));
  return {
    wsServer: getPrimaryWsServer(normalized),
    llmModel: getPrimaryLlmModel(normalized)
  };
}
function ConnectionTestResult({
  status,
  layout
}) {
  if (!status?.message || status.state === "idle") {
    return null;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "p",
    {
      className: `connection-test-result connection-test-result--${layout} connection-test-result--${status.state}`,
      role: "status",
      "aria-live": "polite",
      children: status.message
    }
  );
}
function renderProxyFields(layout, target, connection, updateConnection, text) {
  const prefix = target === "ws" ? "ws" : "llm";
  const proxyKey = `${prefix}Proxy`;
  const usernameKey = `${prefix}ProxyUsername`;
  const passwordKey = `${prefix}ProxyPassword`;
  const idPrefix = `${layout}-${target}`;
  const fields = /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    layout === "page" ? /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "settings__label", htmlFor: `${idPrefix}-proxy`, children: text.connection.proxyAddress }) : null,
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        id: `${idPrefix}-proxy`,
        className: layout === "page" ? "settings__input" : void 0,
        type: "text",
        value: connection[proxyKey],
        placeholder: "http://proxy.example.com:8080",
        onChange: (event) => updateConnection({ [proxyKey]: event.target.value })
      }
    ),
    layout === "page" ? /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "settings__label", htmlFor: `${idPrefix}-proxy-user`, children: text.connection.proxyUsername }) : null,
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        id: `${idPrefix}-proxy-user`,
        className: layout === "page" ? "settings__input" : void 0,
        type: "text",
        value: connection[usernameKey],
        placeholder: text.connection.proxyUsernamePlaceholder,
        onChange: (event) => updateConnection({ [usernameKey]: event.target.value })
      }
    ),
    layout === "page" ? /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "settings__label", htmlFor: `${idPrefix}-proxy-pass`, children: text.connection.proxyPassword }) : null,
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        id: `${idPrefix}-proxy-pass`,
        className: layout === "page" ? "settings__input" : void 0,
        type: "password",
        value: connection[passwordKey],
        placeholder: text.connection.proxyPasswordPlaceholder,
        autoComplete: "off",
        onChange: (event) => updateConnection({ [passwordKey]: event.target.value })
      }
    )
  ] });
  if (layout === "page") {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row settings-row--proxy", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row__text", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: target === "ws" ? text.connection.wsProxyOptional : text.connection.apiProxyOptional }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: text.connection.emptyDirect })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-row__control", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-field settings-field--proxy", children: fields }) })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row settings-row--proxy", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: target === "ws" ? text.connection.wsProxy : text.connection.apiProxy }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: text.connection.optionalEmptyDirect })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-field settings-field--proxy", children: fields })
  ] });
}
const SHORTCUT_RECORDER_TEXT = {
  "zh-CN": {
    pauseShortcutFailedPrefix: "无法暂停全局快捷键：",
    invalidShortcut: "请按下一个快捷键",
    recordingAria: "正在录入快捷键",
    idleAria: "点击录入快捷键",
    recordingLabel: "输入快捷键"
  },
  "zh-TW": {
    pauseShortcutFailedPrefix: "無法暫停全域快捷鍵：",
    invalidShortcut: "請按下一個快捷鍵",
    recordingAria: "正在錄入快捷鍵",
    idleAria: "點擊錄入快捷鍵",
    recordingLabel: "輸入快捷鍵"
  },
  "en-US": {
    pauseShortcutFailedPrefix: "Unable to pause global shortcuts: ",
    invalidShortcut: "Press a shortcut",
    recordingAria: "Recording shortcut",
    idleAria: "Click to record shortcut",
    recordingLabel: "Press shortcut"
  }
};
function getShortcutRecorderText(language) {
  return SHORTCUT_RECORDER_TEXT[language ?? "zh-CN"] ?? SHORTCUT_RECORDER_TEXT["zh-CN"];
}
function ShortcutRecorder({
  value,
  onChange,
  language,
  disabled = false
}) {
  const text = getShortcutRecorderText(language);
  const [recording, setRecording] = reactExports.useState(false);
  const [hint, setHint] = reactExports.useState(void 0);
  const baseId = reactExports.useId();
  const fieldRef = reactExports.useRef(null);
  const buttonRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!recording) {
      return;
    }
    buttonRef.current?.focus();
    const handlers = createShortcutCaptureHandlers({
      onCapture: (accelerator) => {
        onChange(accelerator);
        setRecording(false);
        setHint(void 0);
      },
      onCancel: () => {
        setRecording(false);
        setHint(void 0);
      },
      onInvalid: (message) => {
        setHint(message ? text.invalidShortcut : text.invalidShortcut);
      }
    });
    const handlePointerDown = (event) => {
      const target = event.target;
      if (target instanceof Node && fieldRef.current?.contains(target)) {
        return;
      }
      setRecording(false);
      setHint(void 0);
    };
    window.addEventListener("keydown", handlers.handleKeyDown, true);
    window.addEventListener("keyup", handlers.handleKeyUp, true);
    window.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      void window.voiceAI.setShortcutCaptureActive(false);
      window.removeEventListener("keydown", handlers.handleKeyDown, true);
      window.removeEventListener("keyup", handlers.handleKeyUp, true);
      window.removeEventListener("pointerdown", handlePointerDown, true);
      handlers.reset();
    };
  }, [onChange, recording, text]);
  const startRecording = async () => {
    if (disabled) {
      return;
    }
    setHint(void 0);
    try {
      await window.voiceAI.setShortcutCaptureActive(true);
      setRecording(true);
    } catch (error) {
      setHint(
        `${text.pauseShortcutFailedPrefix}${error instanceof Error ? error.message : String(error)}`
      );
    }
  };
  const stopRecording = () => {
    setRecording(false);
    setHint(void 0);
  };
  const errorId = hint ? `${baseId}-shortcut-recorder-error` : void 0;
  const buttonClassName = [
    "settings-shortcut-recorder",
    recording ? "settings-shortcut-recorder--recording" : "",
    hint ? "settings-shortcut-recorder--invalid" : ""
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { ref: fieldRef, className: "settings-shortcut-recorder-field", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        ref: buttonRef,
        type: "button",
        className: buttonClassName,
        disabled,
        "aria-label": recording ? text.recordingAria : text.idleAria,
        "aria-invalid": hint ? true : void 0,
        "aria-describedby": errorId,
        onClick: () => {
          if (recording) {
            stopRecording();
            return;
          }
          void startRecording();
        },
        children: recording ? text.recordingLabel : formatShortcutLabel(value)
      }
    ),
    hint ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { id: errorId, className: "settings-shortcut-recorder__error", role: "alert", children: hint }) : null
  ] });
}
function buildPersistPatch(settings, scope) {
  const normalized = normalizeConnectionSettings(settings);
  if (scope === "home") {
    return {
      ui: normalized.ui,
      developer: normalized.developer,
      shortcuts: normalized.shortcuts,
      translation: normalized.translation,
      recording: normalized.recording,
      ws: normalized.ws,
      llm: normalized.llm
    };
  }
  return {
    ui: normalized.ui,
    developer: normalized.developer,
    shortcuts: normalized.shortcuts,
    translation: normalized.translation,
    ws: normalized.ws,
    llm: normalized.llm,
    recording: normalized.recording
  };
}
function useAutoSaveSettings(options) {
  const debounceMs = options.debounceMs ?? 450;
  const skipPersistRef = reactExports.useRef(false);
  const timerRef = reactExports.useRef(void 0);
  const latestDraftRef = reactExports.useRef(void 0);
  const persistDraft = reactExports.useCallback(
    async (draft) => {
      const validationError = options.validate?.(draft);
      if (validationError) {
        options.onError?.(validationError);
        return void 0;
      }
      try {
        skipPersistRef.current = true;
        const next = await window.voiceAI.updateSettings(
          buildPersistPatch(draft, options.scope)
        );
        const normalized = normalizeConnectionSettings(next);
        latestDraftRef.current = normalized;
        return normalized;
      } catch (error) {
        options.onError?.(
          `儲存失敗：${error instanceof Error ? error.message : String(error)}`
        );
        return void 0;
      } finally {
        skipPersistRef.current = false;
      }
    },
    [options.scope, options.validate, options.onError]
  );
  const flushPersist = reactExports.useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = void 0;
    }
    const draft = latestDraftRef.current;
    if (!draft || skipPersistRef.current) {
      return void 0;
    }
    return persistDraft(draft);
  }, [persistDraft]);
  const schedulePersist = reactExports.useCallback(
    (draft) => {
      if (skipPersistRef.current) {
        return;
      }
      latestDraftRef.current = draft;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = void 0;
        void persistDraft(draft);
      }, debounceMs);
    },
    [debounceMs, persistDraft]
  );
  const applyRemoteSettings = reactExports.useCallback((next) => {
    skipPersistRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = void 0;
    }
    const normalized = normalizeConnectionSettings(next);
    latestDraftRef.current = normalized;
    skipPersistRef.current = false;
    return normalized;
  }, []);
  const commitSettings = reactExports.useCallback(
    (current, updater) => {
      if (!current) {
        return current;
      }
      const next = typeof updater === "function" ? updater(current) : updater;
      latestDraftRef.current = next;
      schedulePersist(next);
      return next;
    },
    [schedulePersist]
  );
  reactExports.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
  const setLatestDraft = reactExports.useCallback((draft) => {
    latestDraftRef.current = draft;
  }, []);
  return reactExports.useMemo(
    () => ({
      commitSettings,
      applyRemoteSettings,
      flushPersist,
      setLatestDraft
    }),
    [applyRemoteSettings, commitSettings, flushPersist, setLatestDraft]
  );
}
function prefersReducedMotion() {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}
function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}
function WaveformPreview({
  styleName,
  label = "預覽",
  compact = false
}) {
  const [level, setLevel] = reactExports.useState(0.12);
  const motionOK = reactExports.useMemo(() => !prefersReducedMotion(), []);
  reactExports.useEffect(() => {
    if (!motionOK) {
      setLevel(0.12);
      return;
    }
    let raf = 0;
    const seed = styleName.split("").reduce((acc, ch) => (acc * 33 + ch.charCodeAt(0)) % 997, 11);
    const start = performance.now();
    const tick = (now) => {
      const t = (now - start) / 1e3;
      const wobble = 0.06 + 0.055 * (0.5 + 0.5 * Math.sin(t * (2.2 + seed % 7 * 0.08))) + 0.035 * (0.5 + 0.5 * Math.sin(t * (3.4 + seed % 5 * 0.11) + seed * 0.07));
      const micro = 0.01 * (0.5 + 0.5 * Math.sin(t * (7.4 + seed % 9 * 0.13) + seed * 0.19));
      setLevel(clamp01((wobble + micro) / 1) * 0.18);
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [motionOK, styleName]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: `waveform-preview waveform-preview--${styleName}${compact ? " waveform-preview--compact" : ""}`,
      "aria-label": `${label}聲波效果`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "waveform-preview__button waveform-preview__button--cancel", "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { viewBox: "0 0 16 16", width: "16", height: "16", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "path",
          {
            d: "M4.2 4.2 11.8 11.8M11.8 4.2 4.2 11.8",
            fill: "none",
            stroke: "currentColor",
            strokeLinecap: "round",
            strokeWidth: "2.6"
          }
        ) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(VolumeMeter, { level, active: true, styleName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: "waveform-preview__button waveform-preview__button--confirm",
            "aria-hidden": "true",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { viewBox: "0 0 20 20", width: "22", height: "22", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "path",
              {
                d: "m4.2 10.4 4 4.1 7.6-9",
                fill: "none",
                stroke: "currentColor",
                strokeLinecap: "round",
                strokeLinejoin: "round",
                strokeWidth: "2.5"
              }
            ) })
          }
        )
      ]
    }
  );
}
function updateWaveformStyle(current, waveformStyle) {
  return {
    ...current,
    recording: {
      ...current.recording,
      waveformStyle
    }
  };
}
function formatLocalizedConnectivityMessage(label, result, text) {
  if (result.ok) {
    return `${label}${text.connection.connectionSucceeded}${result.elapsedMs ? ` (${result.elapsedMs}ms)` : ""}`;
  }
  return `${label}${text.connection.connectionFailed}${result.message}`;
}
function SettingsPage({
  initialSettings
} = {}) {
  const fallbackText = getSettingsText(initialSettings?.ui.language);
  const [settings, setSettings] = reactExports.useState(
    initialSettings
  );
  const [loadError, setLoadError] = reactExports.useState(void 0);
  const [wsTest, setWsTest] = reactExports.useState({ state: "idle" });
  const [llmTest, setLlmTest] = reactExports.useState({
    state: "idle"
  });
  const [saveError, setSaveError] = reactExports.useState(void 0);
  const autoSave = useAutoSaveSettings({
    scope: "page",
    validate: validateConnectionSettings,
    onError: (message) => setSaveError(message)
  });
  const updateSettings = reactExports.useCallback(
    (updater) => {
      setWsTest({ state: "idle" });
      setLlmTest({ state: "idle" });
      setSettings(
        (current) => autoSave.commitSettings(current, updater) ?? current
      );
    },
    [autoSave]
  );
  reactExports.useEffect(() => {
    if (initialSettings) {
      autoSave.setLatestDraft(initialSettings);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const current = await window.voiceAI.getSettings();
        if (!cancelled) {
          const normalized = normalizeConnectionSettings(current);
          autoSave.setLatestDraft(normalized);
          setSettings(normalized);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : String(error));
        }
      }
    })();
    return () => {
      cancelled = true;
      void autoSave.flushPersist();
    };
  }, [autoSave, initialSettings]);
  reactExports.useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const theme = settings?.ui?.theme;
    if (!theme) {
      return;
    }
    document.documentElement.dataset.theme = theme;
  }, [settings?.ui?.theme]);
  if (loadError !== void 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "settings", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings__error", children: [
      fallbackText.common.loadFailed,
      loadError
    ] }) });
  }
  if (!settings) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "settings", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings__loading", children: fallbackText.common.loading }) });
  }
  const text = getSettingsText(settings.ui.language);
  const developerModeEnabled = settings.developer.enabled;
  const connectionError = validateConnectionSettings(settings);
  const handleTestWs = async () => {
    const { wsServer } = getConnectionTargets(settings);
    if (!wsServer?.url.trim()) {
      setWsTest({ state: "fail", message: text.connection.wsMissing });
      return;
    }
    setWsTest({ state: "testing", message: text.connection.testingWs });
    try {
      const result = await window.voiceAI.testWebSocket(wsServer);
      setWsTest({
        state: result.ok ? "ok" : "fail",
        message: formatLocalizedConnectivityMessage(
          text.connection.wsService,
          result,
          text
        )
      });
    } catch (error) {
      setWsTest({
        state: "fail",
        message: `${text.connection.wsService}${text.connection.connectionException}${error instanceof Error ? error.message : String(error)}`
      });
    }
  };
  const handleTestLlm = async () => {
    const { llmModel } = getConnectionTargets(settings);
    if (!llmModel?.baseUrl.trim()) {
      setLlmTest({ state: "fail", message: text.connection.apiMissing });
      return;
    }
    setLlmTest({ state: "testing", message: text.connection.testingApi });
    try {
      const result = await window.voiceAI.testLlm(llmModel);
      setLlmTest({
        state: result.ok ? "ok" : "fail",
        message: formatLocalizedConnectivityMessage(
          text.connection.apiService,
          result,
          text
        )
      });
    } catch (error) {
      setLlmTest({
        state: "fail",
        message: `${text.connection.apiService}${text.connection.connectionException}${error instanceof Error ? error.message : String(error)}`
      });
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "settings", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("header", { className: "settings-header", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-header__left", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "settings-header__title", children: text.header.title }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "settings-header__subtitle", children: text.header.subtitle })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "section",
      {
        className: "settings__section settings__section--plain",
        "aria-label": text.sections.appearance,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "h2",
            {
              className: "settings-group-header",
              "aria-label": text.sections.appearance,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "settings-group-header__icon", "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { viewBox: "0 0 24 24", focusable: "false", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "path",
                    {
                      d: "M12 3.5a8.5 8.5 0 0 0 0 17h.55a2.15 2.15 0 0 0 1.48-3.71l-.24-.23a1.4 1.4 0 0 1 .98-2.4H16a4.5 4.5 0 0 0 0-9H12Z",
                      fill: "none",
                      stroke: "currentColor",
                      strokeWidth: "2",
                      strokeLinejoin: "round"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "path",
                    {
                      d: "M7.8 11.1h.01M9.8 7.7h.01M14.2 7.7h.01",
                      fill: "none",
                      stroke: "currentColor",
                      strokeWidth: "2.4",
                      strokeLinecap: "round"
                    }
                  )
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "settings-group-header__label", children: text.sections.appearance })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row__text", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: text.appearance.theme }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: text.appearance.themeDescription })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-row__control", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                className: "settings__select",
                value: settings.ui.theme,
                onChange: (event) => {
                  const theme = event.target.value;
                  setSaveError(void 0);
                  setSettings((current) => {
                    if (!current) {
                      return current;
                    }
                    return {
                      ...current,
                      ui: {
                        ...current.ui,
                        theme
                      }
                    };
                  });
                  void window.voiceAI.updateSettings({ ui: { theme } }).catch((error) => {
                    setSaveError(
                      `${text.common.saveFailed}${error instanceof Error ? error.message : String(error)}`
                    );
                  });
                },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "dark", children: text.appearance.darkTheme }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "light", children: text.appearance.lightTheme })
                ]
              }
            ) })
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "section",
      {
        className: "settings__section settings__section--plain",
        "aria-label": text.sections.shortcuts,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "h2",
            {
              className: "settings-group-header",
              "aria-label": text.sections.shortcuts,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "settings-group-header__icon", "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { viewBox: "0 0 24 24", focusable: "false", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "path",
                    {
                      d: "M5.75 7.25h12.5A2.75 2.75 0 0 1 21 10v4a2.75 2.75 0 0 1-2.75 2.75H5.75A2.75 2.75 0 0 1 3 14v-4a2.75 2.75 0 0 1 2.75-2.75Z",
                      fill: "none",
                      stroke: "currentColor",
                      strokeWidth: "2",
                      strokeLinejoin: "round"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "path",
                    {
                      d: "M7 11h.01M10 11h.01M13 11h.01M16 11h1M7 14h6",
                      fill: "none",
                      stroke: "currentColor",
                      strokeWidth: "2.2",
                      strokeLinecap: "round"
                    }
                  )
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "settings-group-header__label", children: text.sections.shortcuts })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row settings-row--shortcut", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row__text", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: text.shortcuts.voiceInput }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: text.shortcuts.voiceInputDescription })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-row__control", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              ShortcutRecorder,
              {
                language: settings.ui.language,
                value: settings.shortcuts.toggleRecording,
                onChange: (value) => updateSettings((current) => ({
                  ...current,
                  shortcuts: {
                    ...current.shortcuts,
                    toggleRecording: value
                  }
                }))
              }
            ) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row settings-row--shortcut", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row__text", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: text.shortcuts.smartRewrite }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: text.shortcuts.smartRewriteDescription })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-row__control", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              ShortcutRecorder,
              {
                language: settings.ui.language,
                value: settings.shortcuts.processSelection,
                onChange: (value) => updateSettings((current) => ({
                  ...current,
                  shortcuts: {
                    ...current.shortcuts,
                    processSelection: value
                  }
                }))
              }
            ) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row settings-row--shortcut", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row__text", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: text.shortcuts.translate }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: text.shortcuts.translateDescription })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-row__control", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              ShortcutRecorder,
              {
                language: settings.ui.language,
                value: settings.shortcuts.translateDictation,
                onChange: (value) => updateSettings((current) => ({
                  ...current,
                  shortcuts: {
                    ...current.shortcuts,
                    translateDictation: value
                  }
                }))
              }
            ) })
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "section",
      {
        className: "settings__section settings__section--plain",
        "aria-label": text.sections.language,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "h2",
            {
              className: "settings-group-header",
              "aria-label": text.sections.language,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "settings-group-header__icon", "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { viewBox: "0 0 24 24", focusable: "false", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "path",
                    {
                      d: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
                      fill: "none",
                      stroke: "currentColor",
                      strokeWidth: "2"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "path",
                    {
                      d: "M3.75 12h16.5M12 3.5c2.1 2.25 3.15 5.08 3.15 8.5S14.1 18.25 12 20.5M12 3.5C9.9 5.75 8.85 8.58 8.85 12S9.9 18.25 12 20.5",
                      fill: "none",
                      stroke: "currentColor",
                      strokeWidth: "2",
                      strokeLinecap: "round"
                    }
                  )
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "settings-group-header__label", children: text.sections.language })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row__text", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: text.language.interfaceLanguage }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: text.language.interfaceLanguageDescription })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-row__control", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "select",
              {
                id: "interface-language",
                className: "settings__select",
                value: settings.ui.language,
                onChange: (event) => updateSettings((current) => ({
                  ...current,
                  ui: {
                    ...current.ui,
                    language: event.target.value
                  }
                })),
                children: text.options.interfaceLanguages.map((option) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: option.value, children: option.key }, option.value))
              }
            ) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row__text", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: text.language.translationTarget }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: text.language.translationTargetDescription })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-row__control", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "select",
              {
                id: "translation-target-language",
                className: "settings__select",
                value: settings.translation.targetLanguage,
                onChange: (event) => updateSettings((current) => ({
                  ...current,
                  translation: {
                    ...current.translation,
                    targetLanguage: event.target.value
                  }
                })),
                children: text.options.translationTargets.map((option) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: option.value, children: option.key }, option.value))
              }
            ) })
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "section",
      {
        className: "settings__section settings__section--plain",
        "aria-label": text.sections.audio,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "settings-group-header", "aria-label": text.sections.audio, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "settings-group-header__icon", "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { viewBox: "0 0 24 24", focusable: "false", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "path",
                {
                  d: "M12 3.75a3.25 3.25 0 0 0-3.25 3.25v4.5a3.25 3.25 0 0 0 6.5 0V7A3.25 3.25 0 0 0 12 3.75Z",
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: "2"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "path",
                {
                  d: "M6.25 10.75v.85a5.75 5.75 0 0 0 11.5 0v-.85M12 17.35v2.9M8.75 20.25h6.5",
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: "2",
                  strokeLinecap: "round"
                }
              )
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "settings-group-header__label", children: text.sections.audio })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row__text", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: text.audio.microphone }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: text.audio.microphoneDescription })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-row__control", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              MicrophoneDevicePicker,
              {
                variant: "page",
                language: settings.ui.language,
                selectedDeviceId: settings.recording.inputDeviceId,
                onDeviceChange: (deviceId) => updateSettings((current) => ({
                  ...current,
                  recording: {
                    ...current.recording,
                    inputDeviceId: deviceId
                  }
                }))
              }
            ) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row__text", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: text.audio.interactionSounds }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: text.audio.interactionSoundsDescription })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-row__control", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              SettingsSwitch,
              {
                checked: settings.audio.interactionSounds,
                label: text.audio.interactionSounds,
                onChange: (checked) => updateSettings((current) => ({
                  ...current,
                  audio: {
                    ...current.audio,
                    interactionSounds: checked
                  }
                }))
              }
            ) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row__text", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: text.audio.muteDuringVoiceInput }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: text.audio.muteDuringVoiceInputDescription })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-row__control", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              SettingsSwitch,
              {
                checked: settings.audio.muteOtherAudioDuringRecording,
                label: text.audio.muteDuringVoiceInput,
                onChange: (checked) => updateSettings((current) => ({
                  ...current,
                  audio: {
                    ...current.audio,
                    muteOtherAudioDuringRecording: checked
                  }
                }))
              }
            ) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row__text", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: text.audio.recognitionLanguage }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: text.audio.recognitionLanguageDescription })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-row__control", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "select",
              {
                id: "recording-language",
                className: "settings__select",
                value: settings.recording.language,
                onChange: (event) => updateSettings((current) => ({
                  ...current,
                  recording: {
                    ...current.recording,
                    language: event.target.value
                  }
                })),
                children: text.options.recordingLanguages.map((option) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: option.value, children: option.key }, option.value))
              }
            ) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row__text", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: text.audio.waveformEffect }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: text.audio.waveformEffectDescription })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-row__control", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-waveform-control", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "select",
                {
                  id: "recording-waveform",
                  className: "settings__select",
                  value: settings.recording.waveformStyle,
                  onChange: (event) => updateSettings(
                    (current) => updateWaveformStyle(
                      current,
                      event.target.value
                    )
                  ),
                  children: text.options.waveforms.map((option) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: option.value, children: option.key }, option.value))
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: "settings-waveform-preview",
                  "aria-label": text.audio.waveformPreview,
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    WaveformPreview,
                    {
                      styleName: settings.recording.waveformStyle,
                      label: text.options.waveforms.find(
                        (option) => option.value === settings.recording.waveformStyle
                      )?.key ?? text.audio.waveformPreview,
                      compact: true
                    }
                  )
                }
              )
            ] }) })
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "section",
      {
        className: "settings__section settings__section--plain",
        "aria-label": text.sections.appBehavior,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "h2",
            {
              className: "settings-group-header",
              "aria-label": text.sections.appBehavior,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "settings-group-header__icon", "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { viewBox: "0 0 24 24", focusable: "false", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "path",
                    {
                      d: "M4.5 7.25h15a1.75 1.75 0 0 1 1.75 1.75v8a1.75 1.75 0 0 1-1.75 1.75h-15A1.75 1.75 0 0 1 2.75 17V9A1.75 1.75 0 0 1 4.5 7.25Z",
                      fill: "none",
                      stroke: "currentColor",
                      strokeWidth: "2",
                      strokeLinejoin: "round"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "path",
                    {
                      d: "M8.5 7.25V5.8c0-.86.7-1.55 1.55-1.55h3.9c.86 0 1.55.7 1.55 1.55v1.45M2.75 13h18.5",
                      fill: "none",
                      stroke: "currentColor",
                      strokeWidth: "2",
                      strokeLinecap: "round",
                      strokeLinejoin: "round"
                    }
                  )
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "settings-group-header__label", children: text.sections.appBehavior })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row__text", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: text.appBehavior.launchAtLogin }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: text.appBehavior.launchAtLoginDescription })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-row__control", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              SettingsSwitch,
              {
                checked: settings.appBehavior.launchAtLogin,
                label: text.appBehavior.launchAtLogin,
                onChange: (checked) => updateSettings((current) => ({
                  ...current,
                  appBehavior: {
                    ...current.appBehavior,
                    launchAtLogin: checked
                  }
                }))
              }
            ) })
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "section",
      {
        className: "settings__section settings__section--plain",
        "aria-label": text.sections.connection,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "h2",
            {
              className: "settings-group-header",
              "aria-label": text.sections.connection,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "settings-group-header__icon", "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { viewBox: "0 0 24 24", focusable: "false", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "path",
                    {
                      d: "M7.5 12a4.5 4.5 0 0 1 4.5-4.5h2.5A4.5 4.5 0 0 1 19 12a4.5 4.5 0 0 1-4.5 4.5H13",
                      fill: "none",
                      stroke: "currentColor",
                      strokeWidth: "2",
                      strokeLinecap: "round"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "path",
                    {
                      d: "M11 16.5H9.5A4.5 4.5 0 0 1 5 12a4.5 4.5 0 0 1 4.5-4.5H11",
                      fill: "none",
                      stroke: "currentColor",
                      strokeWidth: "2",
                      strokeLinecap: "round"
                    }
                  )
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "settings-group-header__label", children: text.sections.connection })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-row__text", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: text.connection.developerMode }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: text.connection.developerModeDescription })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-row__control", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              SettingsSwitch,
              {
                checked: developerModeEnabled,
                label: text.connection.developerMode,
                onChange: (checked) => updateSettings((current) => ({
                  ...current,
                  developer: {
                    ...current.developer,
                    enabled: checked
                  }
                }))
              }
            ) })
          ] }),
          developerModeEnabled ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            ConnectionSettingsFields,
            {
              layout: "page",
              settings,
              language: settings.ui.language,
              onSettingsChange: updateSettings,
              wsTestResult: wsTest,
              llmTestResult: llmTest,
              wsTestButton: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  className: "settings__btn settings__btn--compact",
                  disabled: wsTest.state === "testing" || Boolean(connectionError),
                  onClick: () => void handleTestWs(),
                  children: renderLocalizedTestLabel(
                    text.connection.wsTest,
                    wsTest.state,
                    text
                  )
                }
              ),
              llmTestButton: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  className: "settings__btn settings__btn--compact",
                  disabled: llmTest.state === "testing" || Boolean(connectionError),
                  onClick: () => void handleTestLlm(),
                  children: renderLocalizedTestLabel(
                    text.connection.apiTest,
                    llmTest.state,
                    text
                  )
                }
              )
            }
          ) : null
        ]
      }
    ),
    developerModeEnabled && connectionError && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "settings__hint settings__hint--error", children: connectionError }),
    saveError && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "settings__hint settings__hint--error", children: saveError })
  ] });
}
function renderLocalizedTestLabel(base, state, text) {
  switch (state) {
    case "testing":
      return text.common.testing;
    case "ok":
      return `${base}${text.common.testOkSuffix}`;
    case "fail":
      return `${base}${text.common.testFailSuffix}`;
    default:
      return base;
  }
}
function SettingsSwitch({
  checked,
  label,
  onChange
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      type: "button",
      className: "settings-switch",
      role: "switch",
      "aria-checked": checked,
      "aria-label": label,
      "data-checked": checked,
      onClick: () => onChange(!checked),
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "settings-switch__thumb", "aria-hidden": "true" })
    }
  );
}
const MOCK_VERSION = "1.2.1";
const CHECKING_DELAY_MS = 900;
const INSTALL_TICK_MS = 120;
const RELEASE_NOTES = [
  "优化检查更新流程和安装包校验",
  "提升语音助手启动稳定性",
  "修复部分窗口状态切换问题"
];
const UPDATE_READY_TEXT = {
  "zh-CN": {
    title: "有可用更新",
    close: "关闭更新提示",
    message: "重启应用程序以安装更新。",
    restart: "重启",
    versionPrefix: "有可用更新 "
  },
  "zh-TW": {
    title: "有可用更新",
    close: "關閉更新提示",
    message: "重啟應用程式以安裝更新。",
    restart: "重啟",
    versionPrefix: "有可用更新 "
  },
  "en-US": {
    title: "Update Available",
    close: "Close update prompt",
    message: "Restart the app to install the update.",
    restart: "Restart",
    versionPrefix: "Update available "
  }
};
function getUpdateReadyText(language) {
  return UPDATE_READY_TEXT[language ?? "zh-CN"] ?? UPDATE_READY_TEXT["zh-CN"];
}
function UpdateReadyDialog({
  language,
  version,
  onClose,
  onRestart
}) {
  const text = getUpdateReadyText(language);
  const label = version ? `${text.versionPrefix}${formatVersionLabel$1(version)}` : text.title;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "update-ready", role: "dialog", "aria-modal": "false", "aria-label": label, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "update-ready__header", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "update-ready__icon", "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MegaphoneIcon, {}) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: text.title }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          className: "update-ready__close",
          "aria-label": text.close,
          onClick: onClose,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(CloseIcon, {})
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "update-ready__message", children: text.message }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "update-ready__restart", onClick: onRestart, children: text.restart })
  ] });
}
function MockUpdateDialog({
  currentVersion,
  onClose
}) {
  const [state, setState] = reactExports.useState("checking");
  const [progress, setProgress] = reactExports.useState(0);
  const timersRef = reactExports.useRef([]);
  const clearTimers = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  };
  reactExports.useEffect(() => {
    const timer = window.setTimeout(() => {
      setState("available");
    }, CHECKING_DELAY_MS);
    timersRef.current.push(timer);
    return clearTimers;
  }, []);
  reactExports.useEffect(() => {
    if (state !== "installing") {
      return;
    }
    if (progress >= 100) {
      const timer2 = window.setTimeout(() => {
        setState("completed");
      }, 280);
      timersRef.current.push(timer2);
      return;
    }
    const timer = window.setTimeout(() => {
      setProgress((current) => Math.min(100, current + 4));
    }, INSTALL_TICK_MS);
    timersRef.current.push(timer);
  }, [progress, state]);
  const versionLabel = reactExports.useMemo(
    () => formatVersionLabel$1(currentVersion ?? "1.2.0"),
    [currentVersion]
  );
  const startInstall = () => {
    clearTimers();
    setProgress(0);
    setState("installing");
  };
  const close = () => {
    clearTimers();
    onClose();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mock-update", role: "dialog", "aria-modal": "true", "aria-label": "检查更新", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mock-update__window", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        className: "mock-update__close",
        "aria-label": "关闭",
        onClick: close,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(CloseIcon, {})
      }
    ),
    state === "checking" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      CenteredState,
      {
        icon: /* @__PURE__ */ jsxRuntimeExports.jsx(SpinnerIcon, {}),
        title: "正在检查更新",
        description: `当前版本 ${versionLabel}，正在连接更新服务...`
      }
    ) : null,
    state === "latest" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      CenteredState,
      {
        icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CheckIcon, {}),
        title: "已是最新版本",
        description: `当前版本 ${versionLabel} 已经是最新版本。`,
        action: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "mock-update__primary", onClick: close, children: "完成" })
      }
    ) : null,
    state === "available" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mock-update__available", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mock-update__badge", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MegaphoneIcon, {}) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mock-update__available-copy", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mock-update__eyebrow", children: "发现新版本" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { children: [
          "Voice Assistant v",
          MOCK_VERSION
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
          "当前版本 ",
          versionLabel,
          "，已模拟获取到可用安装包。"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mock-update__notes", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "更新内容" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { children: RELEASE_NOTES.map((note) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: note }, note)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mock-update__actions", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "mock-update__primary", onClick: startInstall, children: "立即更新" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "mock-update__secondary", onClick: close, children: "稍后" })
      ] })
    ] }) : null,
    state === "installing" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      CenteredState,
      {
        icon: /* @__PURE__ */ jsxRuntimeExports.jsx(DownloadIcon, {}),
        title: "正在安装更新",
        description: `正在模拟下载并安装 v${MOCK_VERSION}，请稍候...`,
        action: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mock-update__progress-panel", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "mock-update__progress",
              role: "progressbar",
              "aria-valuemin": 0,
              "aria-valuemax": 100,
              "aria-valuenow": progress,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: "mock-update__progress-fill",
                  style: { width: `${progress}%` }
                }
              )
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
            progress,
            "%"
          ] })
        ] })
      }
    ) : null,
    state === "completed" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      CenteredState,
      {
        icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CheckIcon, {}),
        title: "更新准备完成",
        description: `v${MOCK_VERSION} 已准备就绪，模拟流程到这里结束。`,
        action: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "mock-update__primary", onClick: close, children: "完成" })
      }
    ) : null
  ] }) });
}
function CenteredState({
  icon,
  title,
  description,
  action
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mock-update__centered", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mock-update__large-icon", "aria-hidden": "true", children: icon }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: title }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: description }),
    action ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mock-update__centered-action", children: action }) : null
  ] });
}
function formatVersionLabel$1(version) {
  const normalized = version.trim();
  if (!normalized) {
    return "";
  }
  return normalized.startsWith("v") ? normalized : `v${normalized}`;
}
function MegaphoneIcon() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "22", height: "22", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M3 11v2a2 2 0 0 0 2 2h2l4 4v-5l8 3V7l-8 3V5L7 9H5a2 2 0 0 0-2 2Z" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M19 9.5a4.5 4.5 0 0 1 0 5" })
  ] });
}
function CloseIcon() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M6 6l12 12" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M18 6L6 18" })
  ] });
}
function SpinnerIcon() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "52", height: "52", viewBox: "0 0 52 52", fill: "none", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "26", cy: "26", r: "20", stroke: "currentColor", strokeOpacity: "0.18", strokeWidth: "5" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M46 26a20 20 0 0 0-20-20", stroke: "currentColor", strokeWidth: "5", strokeLinecap: "round" })
  ] });
}
function DownloadIcon() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "52", height: "52", viewBox: "0 0 52 52", fill: "none", stroke: "currentColor", strokeWidth: "4", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M26 8v25" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "m16 24 10 10 10-10" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 41h28" })
  ] });
}
function CheckIcon() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "52", height: "52", viewBox: "0 0 52 52", fill: "none", stroke: "currentColor", strokeWidth: "4", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "26", cy: "26", r: "20" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "m17 27 6 6 13-15" })
  ] });
}
const DEFAULT_VERSION_LABEL = "v0.0.0";
const DEFAULT_DEVICE_NAME = "";
const HOME_SHELL_TEXT = {
  "zh-CN": {
    mainNav: "主导航",
    home: "首页",
    history: "历史记录",
    settings: "设置",
    openSettings: "打开设置",
    about: "关于",
    localDevice: "本机设备",
    userArea: "用户区",
    exitApp: "退出",
    contactPending: "联系我们待接入",
    updateChecking: "正在检查更新...",
    updateUpToDate: "目前已是最新版本",
    updateFoundVersionPrefix: "发现新版本 ",
    updateFoundVersionSuffix: "，正在下载...",
    updateFoundGeneric: "发现新版本，正在下载...",
    updateDisabled: "开发模式下无法检查更新",
    updateFailed: "检查更新失败",
    aboutPage: "关于页面",
    aboutActions: "关于页面操作",
    welcome: "欢迎使用 Voice Assistant Service",
    currentVersionPrefix: "当前版本 ",
    checkUpdates: "检查更新",
    contact: "联系我们",
    userAgreement: "用户协议",
    privacyPolicy: "隐私政策",
    contactPendingToast: "联系我们：功能开发中",
    agreementPendingToast: "用户协议：功能开发中",
    privacyPendingToast: "隐私政策：功能开发中",
    windowControls: "窗口控制",
    minimize: "最小化",
    maximize: "最大化",
    close: "关闭"
  },
  "zh-TW": {
    mainNav: "主導航",
    home: "首頁",
    history: "歷史記錄",
    settings: "設定",
    openSettings: "開啟設定",
    about: "關於",
    localDevice: "本機裝置",
    userArea: "使用者區",
    exitApp: "退出",
    contactPending: "聯絡我們待接入",
    updateChecking: "正在檢查更新...",
    updateUpToDate: "目前已是最新版本",
    updateFoundVersionPrefix: "發現新版本 ",
    updateFoundVersionSuffix: "，正在下載...",
    updateFoundGeneric: "發現新版本，正在下載...",
    updateDisabled: "開發模式下無法檢查更新",
    updateFailed: "檢查更新失敗",
    aboutPage: "關於頁面",
    aboutActions: "關於頁面操作",
    welcome: "歡迎使用 Voice Assistant Service",
    currentVersionPrefix: "當前版本 ",
    checkUpdates: "檢查更新",
    contact: "聯絡我們",
    userAgreement: "使用者協議",
    privacyPolicy: "隱私政策",
    contactPendingToast: "聯絡我們：功能開發中",
    agreementPendingToast: "使用者協議：功能開發中",
    privacyPendingToast: "隱私政策：功能開發中",
    windowControls: "視窗控制",
    minimize: "最小化",
    maximize: "最大化",
    close: "關閉"
  },
  "en-US": {
    mainNav: "Main navigation",
    home: "Home",
    history: "History",
    settings: "Settings",
    openSettings: "Open settings",
    about: "About",
    localDevice: "Local device",
    userArea: "User area",
    exitApp: "Exit",
    contactPending: "Contact us is not available yet",
    updateChecking: "Checking for updates...",
    updateUpToDate: "You're up to date",
    updateFoundVersionPrefix: "Version ",
    updateFoundVersionSuffix: " found, downloading...",
    updateFoundGeneric: "New version found, downloading...",
    updateDisabled: "Update checks are unavailable in development mode",
    updateFailed: "Update check failed",
    aboutPage: "About page",
    aboutActions: "About page actions",
    welcome: "Welcome to Voice Assistant Service",
    currentVersionPrefix: "Current version ",
    checkUpdates: "Check for updates",
    contact: "Contact us",
    userAgreement: "User Agreement",
    privacyPolicy: "Privacy Policy",
    contactPendingToast: "Contact us: coming soon",
    agreementPendingToast: "User Agreement: coming soon",
    privacyPendingToast: "Privacy Policy: coming soon",
    windowControls: "Window controls",
    minimize: "Minimize",
    maximize: "Maximize",
    close: "Close"
  }
};
function getHomeShellText(language) {
  return HOME_SHELL_TEXT[language ?? "zh-CN"] ?? HOME_SHELL_TEXT["zh-CN"];
}
function HomeShell({
  initialSettings,
  initialSection,
  initialOnboardingOpen,
  initialOnboardingStep
}) {
  const [settings, setSettings] = reactExports.useState(() => {
    if (!initialSettings) {
      return void 0;
    }
    return normalizeConnectionSettings(initialSettings);
  });
  const [loadError, setLoadError] = reactExports.useState(void 0);
  const [onboardingOpen, setOnboardingOpen] = reactExports.useState(
    () => initialOnboardingOpen ?? false
  );
  const [toast, setToast] = reactExports.useState(void 0);
  const [activeSection, setActiveSection] = reactExports.useState(
    () => initialSection ?? "home"
  );
  const [showMockUpdatePage, setShowMockUpdatePage] = reactExports.useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = reactExports.useState(false);
  const [updateReady, setUpdateReady] = reactExports.useState(void 0);
  const [historyRecords, setHistoryRecords] = reactExports.useState([]);
  const [versionLabel, setVersionLabel] = reactExports.useState(DEFAULT_VERSION_LABEL);
  const [deviceName, setDeviceName] = reactExports.useState(DEFAULT_DEVICE_NAME);
  const usageStats = reactExports.useMemo(
    () => buildHomeUsageStats(historyRecords),
    [historyRecords]
  );
  const shellText = getHomeShellText(settings?.ui.language);
  const openUpdateDialog = reactExports.useCallback(() => {
    setShowMockUpdatePage(true);
    setToast(void 0);
  }, []);
  const updateSettings = reactExports.useCallback(
    (updater) => {
      setSettings((current) => {
        if (!current) {
          return current;
        }
        const next = typeof updater === "function" ? updater(current) : updater;
        void window.voiceAI.updateSettings({
          shortcuts: next.shortcuts,
          developer: next.developer,
          translation: next.translation,
          recording: next.recording,
          ws: next.ws,
          llm: next.llm
        }).then((persisted) => {
          setSettings(normalizeConnectionSettings(persisted));
        }).catch((error) => {
          setToast(error instanceof Error ? error.message : String(error));
        });
        return next;
      });
    },
    []
  );
  reactExports.useEffect(() => {
    if (initialSettings) {
      setSettings(normalizeConnectionSettings(initialSettings));
    }
  }, [initialSettings]);
  reactExports.useEffect(() => {
    if (initialSettings) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const current = await window.voiceAI.getSettings();
        if (!cancelled) {
          setSettings(normalizeConnectionSettings(current));
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : String(error));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialSettings]);
  reactExports.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    let cancelled = false;
    void window.voiceAI.getAppInfo().then((info) => {
      if (!cancelled) {
        setDeviceName(info.deviceName || DEFAULT_DEVICE_NAME);
        setVersionLabel(formatVersionLabel(info.appVersion));
      }
    }).catch((error) => {
      if (!cancelled) {
        setLoadError(error instanceof Error ? error.message : String(error));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
  reactExports.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    let cancelled = false;
    void window.voiceAI.listHistoryRecords().then((records) => {
      if (!cancelled) {
        setHistoryRecords(records);
      }
    }).catch((error) => {
      if (!cancelled) {
        setLoadError(error instanceof Error ? error.message : String(error));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
  reactExports.useEffect(() => {
    const unsubscribeOpenSettings = window.voiceAI.onOpenSettingsPanel(() => {
      setActiveSection("settings");
    });
    const unsubscribeOpenHomeSection = window.voiceAI.onOpenHomeSection(
      (section) => {
        setActiveSection(section);
      }
    );
    const unsubscribeOpenUpdateDialog = window.voiceAI.onOpenUpdateDialog(openUpdateDialog);
    const unsubscribeUpdateReady = window.voiceAI.onUpdateReady((payload) => {
      setUpdateReady(payload);
      setUpdateDialogOpen(true);
      setToast(void 0);
    });
    const unsubscribeSettingsChanged = window.voiceAI.onSettingsChanged(
      (next) => {
        setSettings(normalizeConnectionSettings(next));
      }
    );
    const unsubscribeHistoryRecordCreated = window.voiceAI.onHistoryRecordCreated((record) => {
      setHistoryRecords((current) => upsertHistoryRecord(current, record));
    });
    const unsubscribeHistoryRecordDeleted = window.voiceAI.onHistoryRecordDeleted(({ id }) => {
      setHistoryRecords(
        (current) => current.filter((record) => record.id !== id)
      );
    });
    return () => {
      unsubscribeOpenSettings();
      unsubscribeOpenHomeSection();
      unsubscribeOpenUpdateDialog();
      unsubscribeUpdateReady();
      unsubscribeSettingsChanged();
      unsubscribeHistoryRecordCreated();
      unsubscribeHistoryRecordDeleted();
    };
  }, [openUpdateDialog]);
  reactExports.useEffect(() => {
    if (!toast) {
      return;
    }
    const handle = window.setTimeout(() => setToast(void 0), 2400);
    return () => window.clearTimeout(handle);
  }, [toast]);
  reactExports.useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const theme = settings?.ui?.theme;
    if (!theme) {
      return;
    }
    document.documentElement.dataset.theme = theme;
  }, [settings?.ui?.theme]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "home-page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(WindowControls$1, { modalOpen: onboardingOpen, text: shellText }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "home-sidebar", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("nav", { className: "home-nav", "aria-label": shellText.mainNav, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            className: activeSection === "home" ? "home-nav__item home-nav__item--active" : "home-nav__item",
            type: "button",
            onClick: () => setActiveSection("home"),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(HomeIcon, {}),
              shellText.home
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            className: activeSection === "history" ? "home-nav__item home-nav__item--active" : "home-nav__item",
            type: "button",
            onClick: () => setActiveSection("history"),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(HistoryIcon, {}),
              shellText.history
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            className: activeSection === "settings" ? "home-nav__item home-nav__item--active" : "home-nav__item",
            type: "button",
            "aria-label": shellText.openSettings,
            onClick: () => setActiveSection("settings"),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(SettingsIcon, {}),
              shellText.settings
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            className: activeSection === "about" ? "home-nav__item home-nav__item--active" : "home-nav__item",
            type: "button",
            "aria-label": shellText.about,
            onClick: () => setActiveSection("about"),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(InfoIcon, {}),
              shellText.about
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "home-sidebar__footer", "aria-label": shellText.userArea, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "home-user", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "home-user__icon", "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsx(UserIcon, {}) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "home-user__name", children: [
            "hi, ",
            deviceName || shellText.localDevice
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "home-power",
            type: "button",
            "aria-label": shellText.exitApp,
            onClick: () => window.voiceAI.controlHomeWindow("close"),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(PowerIcon, {})
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "section",
      {
        className: activeSection === "history" ? "home-content home-content--history" : activeSection === "settings" ? "home-content home-content--settings" : activeSection === "about" ? "home-content home-content--about" : "home-content",
        children: [
          activeSection === "history" ? /* @__PURE__ */ jsxRuntimeExports.jsx(HistoryPage, { language: settings?.ui.language }) : null,
          activeSection === "settings" ? /* @__PURE__ */ jsxRuntimeExports.jsx(SettingsPage, { initialSettings: settings }) : null,
          activeSection === "about" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            AboutPage,
            {
              text: shellText,
              versionLabel,
              onCheckUpdates: openUpdateDialog,
              onContact: () => {
              },
              onOpenAgreement: () => {
              },
              onOpenPrivacy: () => {
              }
            }
          ) : null,
          activeSection === "home" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            HomePage,
            {
              ...settings !== void 0 ? { settings } : {},
              usageStats,
              versionLabel,
              onOpenOnboarding: () => setOnboardingOpen(true),
              onCheckUpdates: openUpdateDialog,
              onContact: () => setToast(shellText.contactPending)
            }
          ) : null
        ]
      }
    ),
    onboardingOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
      OnboardingGuide,
      {
        settings,
        ...initialOnboardingStep !== void 0 ? { initialStep: initialOnboardingStep } : {},
        onClose: () => setOnboardingOpen(false),
        onOpenSettings: () => {
          setOnboardingOpen(false);
          setActiveSection("settings");
        },
        onSettingsChange: updateSettings
      }
    ),
    loadError ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "home-toast", role: "status", "aria-live": "polite", children: loadError }) : null,
    toast ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "home-toast", role: "status", "aria-live": "polite", children: toast }) : null,
    updateDialogOpen ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      UpdateReadyDialog,
      {
        language: settings?.ui.language,
        version: updateReady?.version,
        onClose: () => setUpdateDialogOpen(false),
        onRestart: () => {
          void window.voiceAI.restartToUpdate().catch((error) => {
            setToast(error instanceof Error ? error.message : String(error));
          });
        }
      }
    ) : null,
    showMockUpdatePage ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      MockUpdateDialog,
      {
        currentVersion: versionLabel,
        onClose: () => setShowMockUpdatePage(false)
      }
    ) : null
  ] });
}
function AboutPage({
  text,
  versionLabel,
  onCheckUpdates,
  onContact,
  onOpenAgreement,
  onOpenPrivacy
}) {
  const [aboutToast, setAboutToast] = reactExports.useState(void 0);
  reactExports.useEffect(() => {
    if (!aboutToast) {
      return;
    }
    const handle = window.setTimeout(() => setAboutToast(void 0), 1800);
    return () => window.clearTimeout(handle);
  }, [aboutToast]);
  const runWithToast = (message, action) => {
    setAboutToast(message);
    action();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "about-page", role: "region", "aria-label": text.aboutPage, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "about-page__title", children: text.about }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "about-page__content", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "about-page__brand", "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsx(BrandIcon, {}) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "about-page__headline", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "about-page__welcome", children: text.welcome }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "about-page__version", children: [
          text.currentVersionPrefix,
          versionLabel
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "about-page__actions",
          role: "list",
          "aria-label": text.aboutActions,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              AboutActionRow,
              {
                icon: "refresh",
                label: text.checkUpdates,
                onClick: onCheckUpdates
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              AboutActionRow,
              {
                icon: "mail",
                label: text.contact,
                onClick: () => runWithToast(text.contactPendingToast, onContact)
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              AboutActionRow,
              {
                icon: "file",
                label: text.userAgreement,
                onClick: () => runWithToast(text.agreementPendingToast, onOpenAgreement)
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              AboutActionRow,
              {
                icon: "shield",
                label: text.privacyPolicy,
                onClick: () => runWithToast(text.privacyPendingToast, onOpenPrivacy)
              }
            )
          ]
        }
      )
    ] }),
    aboutToast ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "about-toast", role: "status", "aria-live": "polite", children: aboutToast }) : null
  ] });
}
function AboutActionRow({
  icon,
  label,
  onClick
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      className: "about-row",
      role: "listitem",
      onClick,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "about-row__icon", "aria-hidden": "true", children: [
          icon === "refresh" ? /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshIcon, {}) : null,
          icon === "mail" ? /* @__PURE__ */ jsxRuntimeExports.jsx(MailIcon, {}) : null,
          icon === "file" ? /* @__PURE__ */ jsxRuntimeExports.jsx(FileIcon, {}) : null,
          icon === "shield" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldIcon, {}) : null
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "about-row__label", children: label })
      ]
    }
  );
}
function WindowControls$1({
  modalOpen,
  text
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: `home-window-controls${modalOpen ? " home-window-controls--modal" : ""}`,
      "aria-label": text.windowControls,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "home-window-controls__button",
            type: "button",
            "aria-label": text.minimize,
            onClick: () => window.voiceAI.controlHomeWindow("minimize"),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "home-window-controls__icon home-window-controls__icon--minimize" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "home-window-controls__button",
            type: "button",
            "aria-label": text.maximize,
            onClick: () => window.voiceAI.controlHomeWindow("toggleMaximize"),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "home-window-controls__icon home-window-controls__icon--maximize" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "home-window-controls__button home-window-controls__button--close",
            type: "button",
            "aria-label": text.close,
            onClick: () => window.voiceAI.controlHomeWindow("close"),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "home-window-controls__icon home-window-controls__icon--close" })
          }
        )
      ]
    }
  );
}
function upsertHistoryRecord(records, nextRecord) {
  const withoutRecord = records.filter((record) => record.id !== nextRecord.id);
  return [nextRecord, ...withoutRecord].sort(
    (left, right) => right.startedAt.localeCompare(left.startedAt)
  );
}
function formatVersionLabel(appVersion) {
  const normalized = appVersion.trim();
  if (!normalized) {
    return DEFAULT_VERSION_LABEL;
  }
  return normalized.startsWith("v") ? normalized : `v${normalized}`;
}
function HomeIcon() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "svg",
    {
      width: "18",
      height: "18",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: "9 22 9 12 15 12 15 22" })
      ]
    }
  );
}
function HistoryIcon() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "svg",
    {
      width: "18",
      height: "18",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "12", cy: "12", r: "10" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: "12 6 12 12 16 14" })
      ]
    }
  );
}
function SettingsIcon() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "svg",
    {
      width: "18",
      height: "18",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "12", cy: "12", r: "3" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" })
      ]
    }
  );
}
function InfoIcon() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "svg",
    {
      width: "18",
      height: "18",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "12", cy: "12", r: "10" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: "12", y1: "16", x2: "12", y2: "12" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: "12", y1: "8", x2: "12.01", y2: "8" })
      ]
    }
  );
}
function UserIcon() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "svg",
    {
      width: "18",
      height: "18",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "12", cy: "8", r: "4" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M20 21a8 8 0 1 0-16 0" })
      ]
    }
  );
}
function PowerIcon() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "svg",
    {
      width: "18",
      height: "18",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 2v10" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M18.4 6.6a9 9 0 1 1-12.8 0" })
      ]
    }
  );
}
function BrandIcon() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "svg",
    {
      width: "64",
      height: "64",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M8 9h8" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M8 13h5" })
      ]
    }
  );
}
function RefreshIcon() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "svg",
    {
      width: "16",
      height: "16",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M21 12a9 9 0 1 1-2.64-6.36" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: "21 3 21 9 15 9" })
      ]
    }
  );
}
function MailIcon() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "svg",
    {
      width: "16",
      height: "16",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M4 4h16v16H4z" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M22 6l-10 7L2 6" })
      ]
    }
  );
}
function FileIcon() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "svg",
    {
      width: "16",
      height: "16",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M14 2v6h6" })
      ]
    }
  );
}
function ShieldIcon() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "svg",
    {
      width: "16",
      height: "16",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" })
    }
  );
}
function resolveRoute(hash = window.location.hash || "") {
  if (hash.includes("home")) {
    return "home";
  }
  if (hash.includes("uninstall")) {
    return "uninstall";
  }
  return hash.includes("settings") ? "settings" : "overlay";
}
function UninstallPage() {
  const [state, setState] = reactExports.useState("ready");
  const [error, setError] = reactExports.useState(void 0);
  const runningRef = reactExports.useRef(false);
  const startUninstall = () => {
    if (runningRef.current) {
      return;
    }
    runningRef.current = true;
    setError(void 0);
    setState("running");
    void window.voiceAI.performUninstall().then(() => {
      runningRef.current = false;
      setState("done");
    }).catch((uninstallError) => {
      runningRef.current = false;
      setError(
        uninstallError instanceof Error ? uninstallError.message : String(uninstallError)
      );
      setState("error");
    });
  };
  const closeWindow = () => {
    window.voiceAI.controlHomeWindow("close");
  };
  const finishUninstall = () => {
    void window.voiceAI.finishUninstall();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "uninstall-page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(WindowControls, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "uninstall-stage", "aria-live": "polite", children: [
      state === "ready" || state === "error" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(AssistantMark, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "uninstall-title", children: "准备卸载" }),
        error ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "uninstall-error", children: error }) : null,
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "uninstall-actions", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: "uninstall-button uninstall-button--secondary",
              type: "button",
              onClick: startUninstall,
              children: "开始卸载"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: "uninstall-button uninstall-button--primary",
              type: "button",
              onClick: closeWindow,
              children: "点错了"
            }
          )
        ] })
      ] }) : null,
      state === "running" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "uninstall-progress-panel", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "uninstall-progress uninstall-progress--indeterminate",
            role: "progressbar",
            "aria-label": "uninstalling",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "uninstall-progress__fill uninstall-progress__fill--indeterminate" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "uninstall-progress__label", children: "正在卸载，请稍候..." })
      ] }) : null,
      state === "done" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "uninstall-done", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "uninstall-done__title", children: "期待再见" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "uninstall-progress__label uninstall-done__hint", children: "点击“卸载完成”后，将关闭窗口并继续完成最后清理。" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "uninstall-button uninstall-button--secondary",
            type: "button",
            onClick: finishUninstall,
            children: "卸载完成"
          }
        )
      ] }) : null
    ] })
  ] });
}
function WindowControls() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "uninstall-window-controls", "aria-label": "窗口控制", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        className: "uninstall-window-controls__button",
        type: "button",
        "aria-label": "最小化",
        onClick: () => window.voiceAI.controlHomeWindow("minimize"),
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "uninstall-window-controls__icon uninstall-window-controls__icon--minimize" })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        className: "uninstall-window-controls__button",
        type: "button",
        "aria-label": "最大化",
        onClick: () => window.voiceAI.controlHomeWindow("toggleMaximize"),
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "uninstall-window-controls__icon uninstall-window-controls__icon--maximize" })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        className: "uninstall-window-controls__button uninstall-window-controls__button--close",
        type: "button",
        "aria-label": "关闭",
        onClick: () => window.voiceAI.controlHomeWindow("close"),
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "uninstall-window-controls__icon uninstall-window-controls__icon--close" })
      }
    )
  ] });
}
function AssistantMark() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "uninstall-mark", "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { viewBox: "0 0 72 52", role: "img", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "path",
      {
        d: "M14 6h34c10.5 0 19 8.5 19 19s-8.5 19-19 19H34l-7 8-1.5-8H14C3.5 44 0 35.5 0 25S3.5 6 14 6Z",
        fill: "none",
        stroke: "currentColor",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        strokeWidth: "5"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "21", cy: "25", r: "6", fill: "currentColor" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "49", cy: "25", r: "6", fill: "currentColor" })
  ] }) });
}
function resolveInitialTheme() {
  const theme = new URLSearchParams(window.location.search).get("theme");
  return theme === "dark" || theme === "light" ? theme : void 0;
}
function resolveInitialHomeSection() {
  const hash = window.location.hash;
  if (hash.includes("home-history")) {
    return "history";
  }
  if (hash.includes("home-settings")) {
    return "settings";
  }
  if (hash.includes("home-about")) {
    return "about";
  }
  return "home";
}
const route = resolveRoute();
const initialTheme = resolveInitialTheme();
if (initialTheme) {
  document.documentElement.dataset.theme = initialTheme;
}
clientExports.createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(React.StrictMode, { children: route === "home" ? /* @__PURE__ */ jsxRuntimeExports.jsx(HomeShell, { initialSection: resolveInitialHomeSection() }) : route === "settings" ? /* @__PURE__ */ jsxRuntimeExports.jsx(SettingsPage, {}) : route === "uninstall" ? /* @__PURE__ */ jsxRuntimeExports.jsx(UninstallPage, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(App, {}) })
);
