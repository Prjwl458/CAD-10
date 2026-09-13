//#region src/index.ts
var stateIndexKey = "__TSR_index";
var popStateEvent = "popstate";
var beforeUnloadEvent = "beforeunload";
function createHistory(opts) {
	let location = opts.getLocation();
	const subscribers = /* @__PURE__ */ new Set();
	const notify = (action) => {
		location = opts.getLocation();
		subscribers.forEach((subscriber) => subscriber({
			location,
			action
		}));
	};
	const handleIndexChange = (action) => {
		if (opts.notifyOnIndexChange ?? true) notify(action);
		else location = opts.getLocation();
	};
	const tryNavigation = async ({ task, navigateOpts, ...actionInfo }) => {
		if (navigateOpts?.ignoreBlocker ?? false) {
			task();
			return;
		}
		const blockers = opts.getBlockers?.() ?? [];
		const isPushOrReplace = actionInfo.type === "PUSH" || actionInfo.type === "REPLACE";
		if (typeof document !== "undefined" && blockers.length && isPushOrReplace) for (const blocker of blockers) {
			const nextLocation = parseHref(actionInfo.path, actionInfo.state);
			if (await blocker.blockerFn({
				currentLocation: location,
				nextLocation,
				action: actionInfo.type
			})) {
				opts.onBlocked?.();
				return;
			}
		}
		task();
	};
	return {
		get location() {
			return location;
		},
		get length() {
			return opts.getLength();
		},
		subscribers,
		subscribe: (cb) => {
			subscribers.add(cb);
			return () => {
				subscribers.delete(cb);
			};
		},
		push: (path, state, navigateOpts) => {
			const currentIndex = location.state[stateIndexKey];
			state = assignKeyAndIndex(currentIndex + 1, state);
			tryNavigation({
				task: () => {
					opts.pushState(path, state);
					notify({ type: "PUSH" });
				},
				navigateOpts,
				type: "PUSH",
				path,
				state
			});
		},
		replace: (path, state, navigateOpts) => {
			const currentIndex = location.state[stateIndexKey];
			state = assignKeyAndIndex(currentIndex, state);
			tryNavigation({
				task: () => {
					opts.replaceState(path, state);
					notify({ type: "REPLACE" });
				},
				navigateOpts,
				type: "REPLACE",
				path,
				state
			});
		},
		go: (index, navigateOpts) => {
			tryNavigation({
				task: () => {
					opts.go(index);
					handleIndexChange({
						type: "GO",
						index
					});
				},
				navigateOpts,
				type: "GO"
			});
		},
		back: (navigateOpts) => {
			tryNavigation({
				task: () => {
					opts.back(navigateOpts?.ignoreBlocker ?? false);
					handleIndexChange({ type: "BACK" });
				},
				navigateOpts,
				type: "BACK"
			});
		},
		forward: (navigateOpts) => {
			tryNavigation({
				task: () => {
					opts.forward(navigateOpts?.ignoreBlocker ?? false);
					handleIndexChange({ type: "FORWARD" });
				},
				navigateOpts,
				type: "FORWARD"
			});
		},
		canGoBack: () => location.state[stateIndexKey] !== 0,
		createHref: (str) => opts.createHref(str),
		block: (blocker) => {
			if (!opts.setBlockers) return () => {};
			const blockers = opts.getBlockers?.() ?? [];
			opts.setBlockers([...blockers, blocker]);
			return () => {
				const blockers = opts.getBlockers?.() ?? [];
				opts.setBlockers?.(blockers.filter((b) => b !== blocker));
			};
		},
		flush: () => opts.flush?.(),
		destroy: () => opts.destroy?.(),
		notify
	};
}
function assignKeyAndIndex(index, state) {
	if (!state) state = {};
	const key = createRandomKey();
	return {
		...state,
		key,
		__TSR_key: key,
		[stateIndexKey]: index
	};
}
/**
* Creates a history object that can be used to interact with the browser's
* navigation. This is a lightweight API wrapping the browser's native methods.
* It is designed to work with TanStack Router, but could be used as a standalone API as well.
* IMPORTANT: This API implements history throttling via a microtask to prevent
* excessive calls to the history API. In some browsers, calling history.pushState or
* history.replaceState in quick succession can cause the browser to ignore subsequent
* calls. This API smooths out those differences and ensures that your application
* state will *eventually* match the browser state. In most cases, this is not a problem,
* but if you need to ensure that the browser state is up to date, you can use the
* `history.flush` method to immediately flush all pending state changes to the browser URL.
* @param opts
* @param opts.getHref A function that returns the current href (path + search + hash)
* @param opts.createHref A function that takes a path and returns a href (path + search + hash)
* @returns A history instance
*/
function createBrowserHistory(opts) {
	const win = opts?.window ?? (typeof document !== "undefined" ? window : void 0);
	const originalPushState = win.history.pushState;
	const originalReplaceState = win.history.replaceState;
	let blockers = [];
	const _getBlockers = () => blockers;
	const _setBlockers = (newBlockers) => blockers = newBlockers;
	const createHref = opts?.createHref ?? ((path) => path);
	const parseLocation = opts?.parseLocation ?? (() => parseHref(`${win.location.pathname}${win.location.search}${win.location.hash}`, win.history.state));
	if (!win.history.state?.__TSR_key && !win.history.state?.key) {
		const addedKey = createRandomKey();
		win.history.replaceState({
			[stateIndexKey]: 0,
			key: addedKey,
			__TSR_key: addedKey
		}, "");
	}
	let currentLocation = parseLocation();
	let rollbackLocation;
	let nextPopIsGo = false;
	let ignoreNextPop = false;
	let skipBlockerNextPop = false;
	let ignoreNextBeforeUnload = false;
	const getLocation = () => currentLocation;
	let next;
	let scheduled;
	const flush = () => {
		if (!next) return;
		history._ignoreSubscribers = true;
		(next.isPush ? win.history.pushState : win.history.replaceState)(next.state, "", next.href);
		history._ignoreSubscribers = false;
		next = void 0;
		scheduled = void 0;
		rollbackLocation = void 0;
	};
	const queueHistoryAction = (type, destHref, state) => {
		const href = createHref(destHref);
		if (!scheduled) rollbackLocation = currentLocation;
		currentLocation = parseHref(destHref, state);
		next = {
			href,
			state,
			isPush: next?.isPush || type === "push"
		};
		if (!scheduled) scheduled = Promise.resolve().then(() => flush());
	};
	const onPushPop = (type) => {
		currentLocation = parseLocation();
		history.notify({ type });
	};
	const onPushPopEvent = async () => {
		if (ignoreNextPop) {
			ignoreNextPop = false;
			return;
		}
		const nextLocation = parseLocation();
		const delta = nextLocation.state[stateIndexKey] - currentLocation.state[stateIndexKey];
		const isForward = delta === 1;
		const isBack = delta === -1;
		const isGo = !isForward && !isBack || nextPopIsGo;
		nextPopIsGo = false;
		const action = isGo ? "GO" : isBack ? "BACK" : "FORWARD";
		const notify = isGo ? {
			type: "GO",
			index: delta
		} : { type: isBack ? "BACK" : "FORWARD" };
		if (skipBlockerNextPop) skipBlockerNextPop = false;
		else {
			const blockers = _getBlockers();
			if (typeof document !== "undefined" && blockers.length) {
				for (const blocker of blockers) if (await blocker.blockerFn({
					currentLocation,
					nextLocation,
					action
				})) {
					ignoreNextPop = true;
					win.history.go(1);
					history.notify(notify);
					return;
				}
			}
		}
		currentLocation = parseLocation();
		history.notify(notify);
	};
	const onBeforeUnload = (e) => {
		if (ignoreNextBeforeUnload) {
			ignoreNextBeforeUnload = false;
			return;
		}
		let shouldBlock = false;
		const blockers = _getBlockers();
		if (typeof document !== "undefined" && blockers.length) for (const blocker of blockers) {
			const shouldHaveBeforeUnload = blocker.enableBeforeUnload ?? true;
			if (shouldHaveBeforeUnload === true) {
				shouldBlock = true;
				break;
			}
			if (typeof shouldHaveBeforeUnload === "function" && shouldHaveBeforeUnload() === true) {
				shouldBlock = true;
				break;
			}
		}
		if (shouldBlock) {
			e.preventDefault();
			return e.returnValue = "";
		}
	};
	const history = createHistory({
		getLocation,
		getLength: () => win.history.length,
		pushState: (href, state) => queueHistoryAction("push", href, state),
		replaceState: (href, state) => queueHistoryAction("replace", href, state),
		back: (ignoreBlocker) => {
			if (ignoreBlocker) skipBlockerNextPop = true;
			ignoreNextBeforeUnload = true;
			return win.history.back();
		},
		forward: (ignoreBlocker) => {
			if (ignoreBlocker) skipBlockerNextPop = true;
			ignoreNextBeforeUnload = true;
			win.history.forward();
		},
		go: (n) => {
			nextPopIsGo = true;
			win.history.go(n);
		},
		createHref: (href) => createHref(href),
		flush,
		destroy: () => {
			win.history.pushState = originalPushState;
			win.history.replaceState = originalReplaceState;
			win.removeEventListener(beforeUnloadEvent, onBeforeUnload, { capture: true });
			win.removeEventListener(popStateEvent, onPushPopEvent);
		},
		onBlocked: () => {
			if (rollbackLocation && currentLocation !== rollbackLocation) currentLocation = rollbackLocation;
		},
		getBlockers: _getBlockers,
		setBlockers: _setBlockers,
		notifyOnIndexChange: false
	});
	win.addEventListener(beforeUnloadEvent, onBeforeUnload, { capture: true });
	win.addEventListener(popStateEvent, onPushPopEvent);
	win.history.pushState = function(...args) {
		const res = originalPushState.apply(win.history, args);
		if (!history._ignoreSubscribers) onPushPop("PUSH");
		return res;
	};
	win.history.replaceState = function(...args) {
		const res = originalReplaceState.apply(win.history, args);
		if (!history._ignoreSubscribers) onPushPop("REPLACE");
		return res;
	};
	return history;
}
/**
* Create a hash-based history implementation.
* Useful for static hosts or environments without server URL rewriting.
* @link https://tanstack.com/router/latest/docs/framework/react/guide/history-types
*/
function createHashHistory(opts) {
	const win = opts?.window ?? (typeof document !== "undefined" ? window : void 0);
	return createBrowserHistory({
		window: win,
		parseLocation: () => {
			const hashSplit = win.location.hash.split("#").slice(1);
			const pathPart = hashSplit[0] ?? "/";
			const searchPart = win.location.search;
			const hashEntries = hashSplit.slice(1);
			return parseHref(`${pathPart}${searchPart}${hashEntries.length === 0 ? "" : `#${hashEntries.join("#")}`}`, win.history.state);
		},
		createHref: (href) => `${win.location.pathname}${win.location.search}#${href}`
	});
}
/**
* Create an in-memory history implementation.
* Ideal for server rendering, tests, and non-DOM environments.
* @link https://tanstack.com/router/latest/docs/framework/react/guide/history-types
*/
function createMemoryHistory(opts = { initialEntries: ["/"] }) {
	const entries = opts.initialEntries;
	let index = opts.initialIndex ? Math.min(Math.max(opts.initialIndex, 0), entries.length - 1) : entries.length - 1;
	const states = entries.map((_entry, index) => assignKeyAndIndex(index, void 0));
	const getLocation = () => parseHref(entries[index], states[index]);
	let blockers = [];
	const _getBlockers = () => blockers;
	const _setBlockers = (newBlockers) => blockers = newBlockers;
	return createHistory({
		getLocation,
		getLength: () => entries.length,
		pushState: (path, state) => {
			if (index < entries.length - 1) {
				entries.splice(index + 1);
				states.splice(index + 1);
			}
			states.push(state);
			entries.push(path);
			index = Math.max(entries.length - 1, 0);
		},
		replaceState: (path, state) => {
			states[index] = state;
			entries[index] = path;
		},
		back: () => {
			index = Math.max(index - 1, 0);
		},
		forward: () => {
			index = Math.min(index + 1, entries.length - 1);
		},
		go: (n) => {
			index = Math.min(Math.max(index + n, 0), entries.length - 1);
		},
		createHref: (path) => path,
		getBlockers: _getBlockers,
		setBlockers: _setBlockers
	});
}
/**
* Sanitize a path to prevent open redirect vulnerabilities.
* Removes control characters and collapses leading double slashes.
*/
function sanitizePath(path) {
	let sanitized = path.replace(/[\x00-\x1f\x7f]/g, "");
	if (sanitized.startsWith("//")) sanitized = "/" + sanitized.replace(/^\/+/, "");
	return sanitized;
}
function parseHref(href, state) {
	const sanitizedHref = sanitizePath(href);
	const hashIndex = sanitizedHref.indexOf("#");
	const searchIndex = sanitizedHref.indexOf("?");
	const addedKey = createRandomKey();
	return {
		href: sanitizedHref,
		pathname: sanitizedHref.substring(0, hashIndex > 0 ? searchIndex > 0 ? Math.min(hashIndex, searchIndex) : hashIndex : searchIndex > 0 ? searchIndex : sanitizedHref.length),
		hash: hashIndex > -1 ? sanitizedHref.substring(hashIndex) : "",
		search: searchIndex > -1 ? sanitizedHref.slice(searchIndex, hashIndex === -1 ? void 0 : hashIndex) : "",
		state: state || {
			[stateIndexKey]: 0,
			key: addedKey,
			__TSR_key: addedKey
		}
	};
}
function createRandomKey() {
	return (Math.random() + 1).toString(36).substring(7);
}
//#endregion
export { createBrowserHistory, createHashHistory, createHistory, createMemoryHistory, parseHref };

                                 
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJuYW1lcyI6W10sInNvdXJjZXMiOlsiLi4vLi4vc3JjL2luZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIFdoaWxlIHRoZSBwdWJsaWMgQVBJIHdhcyBjbGVhcmx5IGluc3BpcmVkIGJ5IHRoZSBcImhpc3RvcnlcIiBucG0gcGFja2FnZSxcbi8vIFRoaXMgaW1wbGVtZW50YXRpb24gYXR0ZW1wdHMgdG8gYmUgbW9yZSBsaWdodHdlaWdodCBieVxuLy8gbWFraW5nIGFzc3VtcHRpb25zIGFib3V0IHRoZSB3YXkgVGFuU3RhY2sgUm91dGVyIHdvcmtzXG5cbmV4cG9ydCBpbnRlcmZhY2UgTmF2aWdhdGVPcHRpb25zIHtcbiAgaWdub3JlQmxvY2tlcj86IGJvb2xlYW5cbn1cblxudHlwZSBTdWJzY3JpYmVySGlzdG9yeUFjdGlvbiA9XG4gIHwge1xuICAgICAgdHlwZTogRXhjbHVkZTxIaXN0b3J5QWN0aW9uLCAnR08nPlxuICAgIH1cbiAgfCB7XG4gICAgICB0eXBlOiAnR08nXG4gICAgICBpbmRleDogbnVtYmVyXG4gICAgfVxuXG50eXBlIFN1YnNjcmliZXJBcmdzID0ge1xuICBsb2NhdGlvbjogSGlzdG9yeUxvY2F0aW9uXG4gIGFjdGlvbjogU3Vic2NyaWJlckhpc3RvcnlBY3Rpb25cbn1cblxuZXhwb3J0IGludGVyZmFjZSBSb3V0ZXJIaXN0b3J5IHtcbiAgbG9jYXRpb246IEhpc3RvcnlMb2NhdGlvblxuICBsZW5ndGg6IG51bWJlclxuICBzdWJzY3JpYmVyczogU2V0PChvcHRzOiBTdWJzY3JpYmVyQXJncykgPT4gdm9pZD5cbiAgc3Vic2NyaWJlOiAoY2I6IChvcHRzOiBTdWJzY3JpYmVyQXJncykgPT4gdm9pZCkgPT4gKCkgPT4gdm9pZFxuICBwdXNoOiAocGF0aDogc3RyaW5nLCBzdGF0ZT86IGFueSwgbmF2aWdhdGVPcHRzPzogTmF2aWdhdGVPcHRpb25zKSA9PiB2b2lkXG4gIHJlcGxhY2U6IChwYXRoOiBzdHJpbmcsIHN0YXRlPzogYW55LCBuYXZpZ2F0ZU9wdHM/OiBOYXZpZ2F0ZU9wdGlvbnMpID0+IHZvaWRcbiAgZ286IChpbmRleDogbnVtYmVyLCBuYXZpZ2F0ZU9wdHM/OiBOYXZpZ2F0ZU9wdGlvbnMpID0+IHZvaWRcbiAgYmFjazogKG5hdmlnYXRlT3B0cz86IE5hdmlnYXRlT3B0aW9ucykgPT4gdm9pZFxuICBmb3J3YXJkOiAobmF2aWdhdGVPcHRzPzogTmF2aWdhdGVPcHRpb25zKSA9PiB2b2lkXG4gIGNhbkdvQmFjazogKCkgPT4gYm9vbGVhblxuICBjcmVhdGVIcmVmOiAoaHJlZjogc3RyaW5nKSA9PiBzdHJpbmdcbiAgYmxvY2s6IChibG9ja2VyOiBOYXZpZ2F0aW9uQmxvY2tlcikgPT4gKCkgPT4gdm9pZFxuICBmbHVzaDogKCkgPT4gdm9pZFxuICBkZXN0cm95OiAoKSA9PiB2b2lkXG4gIG5vdGlmeTogKGFjdGlvbjogU3Vic2NyaWJlckhpc3RvcnlBY3Rpb24pID0+IHZvaWRcbiAgX2lnbm9yZVN1YnNjcmliZXJzPzogYm9vbGVhblxufVxuXG5leHBvcnQgaW50ZXJmYWNlIEhpc3RvcnlMb2NhdGlvbiBleHRlbmRzIFBhcnNlZFBhdGgge1xuICBzdGF0ZTogUGFyc2VkSGlzdG9yeVN0YXRlXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFyc2VkUGF0aCB7XG4gIGhyZWY6IHN0cmluZ1xuICBwYXRobmFtZTogc3RyaW5nXG4gIHNlYXJjaDogc3RyaW5nXG4gIGhhc2g6IHN0cmluZ1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEhpc3RvcnlTdGF0ZSB7fVxuXG5leHBvcnQgdHlwZSBQYXJzZWRIaXN0b3J5U3RhdGUgPSBIaXN0b3J5U3RhdGUgJiB7XG4gIGtleT86IHN0cmluZyAvLyBUT0RPOiBSZW1vdmUgaW4gdjIgLSB1c2UgX19UU1Jfa2V5IGluc3RlYWRcbiAgX19UU1Jfa2V5Pzogc3RyaW5nXG4gIF9fVFNSX2luZGV4OiBudW1iZXJcbn1cblxudHlwZSBTaG91bGRBbGxvd05hdmlnYXRpb24gPSBhbnlcblxuZXhwb3J0IHR5cGUgSGlzdG9yeUFjdGlvbiA9ICdQVVNIJyB8ICdSRVBMQUNFJyB8ICdGT1JXQVJEJyB8ICdCQUNLJyB8ICdHTydcblxuZXhwb3J0IHR5cGUgQmxvY2tlckZuQXJncyA9IHtcbiAgY3VycmVudExvY2F0aW9uOiBIaXN0b3J5TG9jYXRpb25cbiAgbmV4dExvY2F0aW9uOiBIaXN0b3J5TG9jYXRpb25cbiAgYWN0aW9uOiBIaXN0b3J5QWN0aW9uXG59XG5cbmV4cG9ydCB0eXBlIEJsb2NrZXJGbiA9IChcbiAgYXJnczogQmxvY2tlckZuQXJncyxcbikgPT4gUHJvbWlzZTxTaG91bGRBbGxvd05hdmlnYXRpb24+IHwgU2hvdWxkQWxsb3dOYXZpZ2F0aW9uXG5cbmV4cG9ydCB0eXBlIE5hdmlnYXRpb25CbG9ja2VyID0ge1xuICBibG9ja2VyRm46IEJsb2NrZXJGblxuICBlbmFibGVCZWZvcmVVbmxvYWQ/OiAoKCkgPT4gYm9vbGVhbikgfCBib29sZWFuXG59XG5cbnR5cGUgVHJ5TmF2aWdhdGVBcmdzID0ge1xuICB0YXNrOiAoKSA9PiB2b2lkXG4gIHR5cGU6ICdQVVNIJyB8ICdSRVBMQUNFJyB8ICdCQUNLJyB8ICdGT1JXQVJEJyB8ICdHTydcbiAgbmF2aWdhdGVPcHRzPzogTmF2aWdhdGVPcHRpb25zXG59ICYgKFxuICB8IHtcbiAgICAgIHR5cGU6ICdQVVNIJyB8ICdSRVBMQUNFJ1xuICAgICAgcGF0aDogc3RyaW5nXG4gICAgICBzdGF0ZTogYW55XG4gICAgfVxuICB8IHtcbiAgICAgIHR5cGU6ICdCQUNLJyB8ICdGT1JXQVJEJyB8ICdHTydcbiAgICB9XG4pXG5cbmNvbnN0IHN0YXRlSW5kZXhLZXkgPSAnX19UU1JfaW5kZXgnXG5jb25zdCBwb3BTdGF0ZUV2ZW50ID0gJ3BvcHN0YXRlJ1xuY29uc3QgYmVmb3JlVW5sb2FkRXZlbnQgPSAnYmVmb3JldW5sb2FkJ1xuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlSGlzdG9yeShvcHRzOiB7XG4gIGdldExvY2F0aW9uOiAoKSA9PiBIaXN0b3J5TG9jYXRpb25cbiAgZ2V0TGVuZ3RoOiAoKSA9PiBudW1iZXJcbiAgcHVzaFN0YXRlOiAocGF0aDogc3RyaW5nLCBzdGF0ZTogYW55KSA9PiB2b2lkXG4gIHJlcGxhY2VTdGF0ZTogKHBhdGg6IHN0cmluZywgc3RhdGU6IGFueSkgPT4gdm9pZFxuICBnbzogKG46IG51bWJlcikgPT4gdm9pZFxuICBiYWNrOiAoaWdub3JlQmxvY2tlcjogYm9vbGVhbikgPT4gdm9pZFxuICBmb3J3YXJkOiAoaWdub3JlQmxvY2tlcjogYm9vbGVhbikgPT4gdm9pZFxuICBjcmVhdGVIcmVmOiAocGF0aDogc3RyaW5nKSA9PiBzdHJpbmdcbiAgZmx1c2g/OiAoKSA9PiB2b2lkXG4gIGRlc3Ryb3k/OiAoKSA9PiB2b2lkXG4gIG9uQmxvY2tlZD86ICgpID0+IHZvaWRcbiAgZ2V0QmxvY2tlcnM/OiAoKSA9PiBBcnJheTxOYXZpZ2F0aW9uQmxvY2tlcj5cbiAgc2V0QmxvY2tlcnM/OiAoYmxvY2tlcnM6IEFycmF5PE5hdmlnYXRpb25CbG9ja2VyPikgPT4gdm9pZFxuICAvLyBBdm9pZCBub3RpZnlpbmcgb24gZm9yd2FyZC9iYWNrL2dvLCB1c2VkIGZvciBicm93c2VyIGhpc3RvcnkgYXMgd2UgYWxyZWFkeSBnZXQgbm90aWZpZWQgYnkgdGhlIHBvcHN0YXRlIGV2ZW50XG4gIG5vdGlmeU9uSW5kZXhDaGFuZ2U/OiBib29sZWFuXG59KTogUm91dGVySGlzdG9yeSB7XG4gIGxldCBsb2NhdGlvbiA9IG9wdHMuZ2V0TG9jYXRpb24oKVxuICBjb25zdCBzdWJzY3JpYmVycyA9IG5ldyBTZXQ8KG9wdHM6IFN1YnNjcmliZXJBcmdzKSA9PiB2b2lkPigpXG5cbiAgY29uc3Qgbm90aWZ5ID0gKGFjdGlvbjogU3Vic2NyaWJlckhpc3RvcnlBY3Rpb24pID0+IHtcbiAgICBsb2NhdGlvbiA9IG9wdHMuZ2V0TG9jYXRpb24oKVxuICAgIHN1YnNjcmliZXJzLmZvckVhY2goKHN1YnNjcmliZXIpID0+IHN1YnNjcmliZXIoeyBsb2NhdGlvbiwgYWN0aW9uIH0pKVxuICB9XG5cbiAgY29uc3QgaGFuZGxlSW5kZXhDaGFuZ2UgPSAoYWN0aW9uOiBTdWJzY3JpYmVySGlzdG9yeUFjdGlvbikgPT4ge1xuICAgIGlmIChvcHRzLm5vdGlmeU9uSW5kZXhDaGFuZ2UgPz8gdHJ1ZSkgbm90aWZ5KGFjdGlvbilcbiAgICBlbHNlIGxvY2F0aW9uID0gb3B0cy5nZXRMb2NhdGlvbigpXG4gIH1cblxuICBjb25zdCB0cnlOYXZpZ2F0aW9uID0gYXN5bmMgKHtcbiAgICB0YXNrLFxuICAgIG5hdmlnYXRlT3B0cyxcbiAgICAuLi5hY3Rpb25JbmZvXG4gIH06IFRyeU5hdmlnYXRlQXJncykgPT4ge1xuICAgIGNvbnN0IGlnbm9yZUJsb2NrZXIgPSBuYXZpZ2F0ZU9wdHM/Lmlnbm9yZUJsb2NrZXIgPz8gZmFsc2VcbiAgICBpZiAoaWdub3JlQmxvY2tlcikge1xuICAgICAgdGFzaygpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjb25zdCBibG9ja2VycyA9IG9wdHMuZ2V0QmxvY2tlcnM/LigpID8/IFtdXG4gICAgY29uc3QgaXNQdXNoT3JSZXBsYWNlID1cbiAgICAgIGFjdGlvbkluZm8udHlwZSA9PT0gJ1BVU0gnIHx8IGFjdGlvbkluZm8udHlwZSA9PT0gJ1JFUExBQ0UnXG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcgJiYgYmxvY2tlcnMubGVuZ3RoICYmIGlzUHVzaE9yUmVwbGFjZSkge1xuICAgICAgZm9yIChjb25zdCBibG9ja2VyIG9mIGJsb2NrZXJzKSB7XG4gICAgICAgIGNvbnN0IG5leHRMb2NhdGlvbiA9IHBhcnNlSHJlZihhY3Rpb25JbmZvLnBhdGgsIGFjdGlvbkluZm8uc3RhdGUpXG4gICAgICAgIGNvbnN0IGlzQmxvY2tlZCA9IGF3YWl0IGJsb2NrZXIuYmxvY2tlckZuKHtcbiAgICAgICAgICBjdXJyZW50TG9jYXRpb246IGxvY2F0aW9uLFxuICAgICAgICAgIG5leHRMb2NhdGlvbixcbiAgICAgICAgICBhY3Rpb246IGFjdGlvbkluZm8udHlwZSxcbiAgICAgICAgfSlcbiAgICAgICAgaWYgKGlzQmxvY2tlZCkge1xuICAgICAgICAgIG9wdHMub25CbG9ja2VkPy4oKVxuICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGFzaygpXG4gIH1cblxuICByZXR1cm4ge1xuICAgIGdldCBsb2NhdGlvbigpIHtcbiAgICAgIHJldHVybiBsb2NhdGlvblxuICAgIH0sXG4gICAgZ2V0IGxlbmd0aCgpIHtcbiAgICAgIHJldHVybiBvcHRzLmdldExlbmd0aCgpXG4gICAgfSxcbiAgICBzdWJzY3JpYmVycyxcbiAgICBzdWJzY3JpYmU6IChjYjogKG9wdHM6IFN1YnNjcmliZXJBcmdzKSA9PiB2b2lkKSA9PiB7XG4gICAgICBzdWJzY3JpYmVycy5hZGQoY2IpXG5cbiAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgIHN1YnNjcmliZXJzLmRlbGV0ZShjYilcbiAgICAgIH1cbiAgICB9LFxuICAgIHB1c2g6IChwYXRoLCBzdGF0ZSwgbmF2aWdhdGVPcHRzKSA9PiB7XG4gICAgICBjb25zdCBjdXJyZW50SW5kZXggPSBsb2NhdGlvbi5zdGF0ZVtzdGF0ZUluZGV4S2V5XVxuICAgICAgc3RhdGUgPSBhc3NpZ25LZXlBbmRJbmRleChjdXJyZW50SW5kZXggKyAxLCBzdGF0ZSlcbiAgICAgIHRyeU5hdmlnYXRpb24oe1xuICAgICAgICB0YXNrOiAoKSA9PiB7XG4gICAgICAgICAgb3B0cy5wdXNoU3RhdGUocGF0aCwgc3RhdGUpXG4gICAgICAgICAgbm90aWZ5KHsgdHlwZTogJ1BVU0gnIH0pXG4gICAgICAgIH0sXG4gICAgICAgIG5hdmlnYXRlT3B0cyxcbiAgICAgICAgdHlwZTogJ1BVU0gnLFxuICAgICAgICBwYXRoLFxuICAgICAgICBzdGF0ZSxcbiAgICAgIH0pXG4gICAgfSxcbiAgICByZXBsYWNlOiAocGF0aCwgc3RhdGUsIG5hdmlnYXRlT3B0cykgPT4ge1xuICAgICAgY29uc3QgY3VycmVudEluZGV4ID0gbG9jYXRpb24uc3RhdGVbc3RhdGVJbmRleEtleV1cbiAgICAgIHN0YXRlID0gYXNzaWduS2V5QW5kSW5kZXgoY3VycmVudEluZGV4LCBzdGF0ZSlcbiAgICAgIHRyeU5hdmlnYXRpb24oe1xuICAgICAgICB0YXNrOiAoKSA9PiB7XG4gICAgICAgICAgb3B0cy5yZXBsYWNlU3RhdGUocGF0aCwgc3RhdGUpXG4gICAgICAgICAgbm90aWZ5KHsgdHlwZTogJ1JFUExBQ0UnIH0pXG4gICAgICAgIH0sXG4gICAgICAgIG5hdmlnYXRlT3B0cyxcbiAgICAgICAgdHlwZTogJ1JFUExBQ0UnLFxuICAgICAgICBwYXRoLFxuICAgICAgICBzdGF0ZSxcbiAgICAgIH0pXG4gICAgfSxcbiAgICBnbzogKGluZGV4LCBuYXZpZ2F0ZU9wdHMpID0+IHtcbiAgICAgIHRyeU5hdmlnYXRpb24oe1xuICAgICAgICB0YXNrOiAoKSA9PiB7XG4gICAgICAgICAgb3B0cy5nbyhpbmRleClcbiAgICAgICAgICBoYW5kbGVJbmRleENoYW5nZSh7IHR5cGU6ICdHTycsIGluZGV4IH0pXG4gICAgICAgIH0sXG4gICAgICAgIG5hdmlnYXRlT3B0cyxcbiAgICAgICAgdHlwZTogJ0dPJyxcbiAgICAgIH0pXG4gICAgfSxcbiAgICBiYWNrOiAobmF2aWdhdGVPcHRzKSA9PiB7XG4gICAgICB0cnlOYXZpZ2F0aW9uKHtcbiAgICAgICAgdGFzazogKCkgPT4ge1xuICAgICAgICAgIG9wdHMuYmFjayhuYXZpZ2F0ZU9wdHM/Lmlnbm9yZUJsb2NrZXIgPz8gZmFsc2UpXG4gICAgICAgICAgaGFuZGxlSW5kZXhDaGFuZ2UoeyB0eXBlOiAnQkFDSycgfSlcbiAgICAgICAgfSxcbiAgICAgICAgbmF2aWdhdGVPcHRzLFxuICAgICAgICB0eXBlOiAnQkFDSycsXG4gICAgICB9KVxuICAgIH0sXG4gICAgZm9yd2FyZDogKG5hdmlnYXRlT3B0cykgPT4ge1xuICAgICAgdHJ5TmF2aWdhdGlvbih7XG4gICAgICAgIHRhc2s6ICgpID0+IHtcbiAgICAgICAgICBvcHRzLmZvcndhcmQobmF2aWdhdGVPcHRzPy5pZ25vcmVCbG9ja2VyID8/IGZhbHNlKVxuICAgICAgICAgIGhhbmRsZUluZGV4Q2hhbmdlKHsgdHlwZTogJ0ZPUldBUkQnIH0pXG4gICAgICAgIH0sXG4gICAgICAgIG5hdmlnYXRlT3B0cyxcbiAgICAgICAgdHlwZTogJ0ZPUldBUkQnLFxuICAgICAgfSlcbiAgICB9LFxuICAgIGNhbkdvQmFjazogKCkgPT4gbG9jYXRpb24uc3RhdGVbc3RhdGVJbmRleEtleV0gIT09IDAsXG4gICAgY3JlYXRlSHJlZjogKHN0cikgPT4gb3B0cy5jcmVhdGVIcmVmKHN0ciksXG4gICAgYmxvY2s6IChibG9ja2VyKSA9PiB7XG4gICAgICBpZiAoIW9wdHMuc2V0QmxvY2tlcnMpIHJldHVybiAoKSA9PiB7fVxuICAgICAgY29uc3QgYmxvY2tlcnMgPSBvcHRzLmdldEJsb2NrZXJzPy4oKSA/PyBbXVxuICAgICAgb3B0cy5zZXRCbG9ja2VycyhbLi4uYmxvY2tlcnMsIGJsb2NrZXJdKVxuXG4gICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICBjb25zdCBibG9ja2VycyA9IG9wdHMuZ2V0QmxvY2tlcnM/LigpID8/IFtdXG4gICAgICAgIG9wdHMuc2V0QmxvY2tlcnM/LihibG9ja2Vycy5maWx0ZXIoKGIpID0+IGIgIT09IGJsb2NrZXIpKVxuICAgICAgfVxuICAgIH0sXG4gICAgZmx1c2g6ICgpID0+IG9wdHMuZmx1c2g/LigpLFxuICAgIGRlc3Ryb3k6ICgpID0+IG9wdHMuZGVzdHJveT8uKCksXG4gICAgbm90aWZ5LFxuICB9XG59XG5cbmZ1bmN0aW9uIGFzc2lnbktleUFuZEluZGV4KGluZGV4OiBudW1iZXIsIHN0YXRlOiBIaXN0b3J5U3RhdGUgfCB1bmRlZmluZWQpIHtcbiAgaWYgKCFzdGF0ZSkge1xuICAgIHN0YXRlID0ge31cbiAgfVxuICBjb25zdCBrZXkgPSBjcmVhdGVSYW5kb21LZXkoKVxuICByZXR1cm4ge1xuICAgIC4uLnN0YXRlLFxuICAgIGtleSwgLy8gVE9ETzogUmVtb3ZlIGluIHYyIC0gdXNlIF9fVFNSX2tleSBpbnN0ZWFkXG4gICAgX19UU1Jfa2V5OiBrZXksXG4gICAgW3N0YXRlSW5kZXhLZXldOiBpbmRleCxcbiAgfSBhcyBQYXJzZWRIaXN0b3J5U3RhdGVcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgaGlzdG9yeSBvYmplY3QgdGhhdCBjYW4gYmUgdXNlZCB0byBpbnRlcmFjdCB3aXRoIHRoZSBicm93c2VyJ3NcbiAqIG5hdmlnYXRpb24uIFRoaXMgaXMgYSBsaWdodHdlaWdodCBBUEkgd3JhcHBpbmcgdGhlIGJyb3dzZXIncyBuYXRpdmUgbWV0aG9kcy5cbiAqIEl0IGlzIGRlc2lnbmVkIHRvIHdvcmsgd2l0aCBUYW5TdGFjayBSb3V0ZXIsIGJ1dCBjb3VsZCBiZSB1c2VkIGFzIGEgc3RhbmRhbG9uZSBBUEkgYXMgd2VsbC5cbiAqIElNUE9SVEFOVDogVGhpcyBBUEkgaW1wbGVtZW50cyBoaXN0b3J5IHRocm90dGxpbmcgdmlhIGEgbWljcm90YXNrIHRvIHByZXZlbnRcbiAqIGV4Y2Vzc2l2ZSBjYWxscyB0byB0aGUgaGlzdG9yeSBBUEkuIEluIHNvbWUgYnJvd3NlcnMsIGNhbGxpbmcgaGlzdG9yeS5wdXNoU3RhdGUgb3JcbiAqIGhpc3RvcnkucmVwbGFjZVN0YXRlIGluIHF1aWNrIHN1Y2Nlc3Npb24gY2FuIGNhdXNlIHRoZSBicm93c2VyIHRvIGlnbm9yZSBzdWJzZXF1ZW50XG4gKiBjYWxscy4gVGhpcyBBUEkgc21vb3RocyBvdXQgdGhvc2UgZGlmZmVyZW5jZXMgYW5kIGVuc3VyZXMgdGhhdCB5b3VyIGFwcGxpY2F0aW9uXG4gKiBzdGF0ZSB3aWxsICpldmVudHVhbGx5KiBtYXRjaCB0aGUgYnJvd3NlciBzdGF0ZS4gSW4gbW9zdCBjYXNlcywgdGhpcyBpcyBub3QgYSBwcm9ibGVtLFxuICogYnV0IGlmIHlvdSBuZWVkIHRvIGVuc3VyZSB0aGF0IHRoZSBicm93c2VyIHN0YXRlIGlzIHVwIHRvIGRhdGUsIHlvdSBjYW4gdXNlIHRoZVxuICogYGhpc3RvcnkuZmx1c2hgIG1ldGhvZCB0byBpbW1lZGlhdGVseSBmbHVzaCBhbGwgcGVuZGluZyBzdGF0ZSBjaGFuZ2VzIHRvIHRoZSBicm93c2VyIFVSTC5cbiAqIEBwYXJhbSBvcHRzXG4gKiBAcGFyYW0gb3B0cy5nZXRIcmVmIEEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZSBjdXJyZW50IGhyZWYgKHBhdGggKyBzZWFyY2ggKyBoYXNoKVxuICogQHBhcmFtIG9wdHMuY3JlYXRlSHJlZiBBIGZ1bmN0aW9uIHRoYXQgdGFrZXMgYSBwYXRoIGFuZCByZXR1cm5zIGEgaHJlZiAocGF0aCArIHNlYXJjaCArIGhhc2gpXG4gKiBAcmV0dXJucyBBIGhpc3RvcnkgaW5zdGFuY2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUJyb3dzZXJIaXN0b3J5KG9wdHM/OiB7XG4gIHBhcnNlTG9jYXRpb24/OiAoKSA9PiBIaXN0b3J5TG9jYXRpb25cbiAgY3JlYXRlSHJlZj86IChwYXRoOiBzdHJpbmcpID0+IHN0cmluZ1xuICB3aW5kb3c/OiBhbnlcbn0pOiBSb3V0ZXJIaXN0b3J5IHtcbiAgY29uc3Qgd2luID1cbiAgICBvcHRzPy53aW5kb3cgPz9cbiAgICAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6ICh1bmRlZmluZWQgYXMgYW55KSlcblxuICBjb25zdCBvcmlnaW5hbFB1c2hTdGF0ZSA9IHdpbi5oaXN0b3J5LnB1c2hTdGF0ZVxuICBjb25zdCBvcmlnaW5hbFJlcGxhY2VTdGF0ZSA9IHdpbi5oaXN0b3J5LnJlcGxhY2VTdGF0ZVxuXG4gIGxldCBibG9ja2VyczogQXJyYXk8TmF2aWdhdGlvbkJsb2NrZXI+ID0gW11cbiAgY29uc3QgX2dldEJsb2NrZXJzID0gKCkgPT4gYmxvY2tlcnNcbiAgY29uc3QgX3NldEJsb2NrZXJzID0gKG5ld0Jsb2NrZXJzOiBBcnJheTxOYXZpZ2F0aW9uQmxvY2tlcj4pID0+XG4gICAgKGJsb2NrZXJzID0gbmV3QmxvY2tlcnMpXG5cbiAgY29uc3QgY3JlYXRlSHJlZiA9IG9wdHM/LmNyZWF0ZUhyZWYgPz8gKChwYXRoKSA9PiBwYXRoKVxuICBjb25zdCBwYXJzZUxvY2F0aW9uID1cbiAgICBvcHRzPy5wYXJzZUxvY2F0aW9uID8/XG4gICAgKCgpID0+XG4gICAgICBwYXJzZUhyZWYoXG4gICAgICAgIGAke3dpbi5sb2NhdGlvbi5wYXRobmFtZX0ke3dpbi5sb2NhdGlvbi5zZWFyY2h9JHt3aW4ubG9jYXRpb24uaGFzaH1gLFxuICAgICAgICB3aW4uaGlzdG9yeS5zdGF0ZSxcbiAgICAgICkpXG5cbiAgLy8gRW5zdXJlIHRoZXJlIGlzIGFsd2F5cyBhIGtleSB0byBzdGFydFxuICBpZiAoIXdpbi5oaXN0b3J5LnN0YXRlPy5fX1RTUl9rZXkgJiYgIXdpbi5oaXN0b3J5LnN0YXRlPy5rZXkpIHtcbiAgICBjb25zdCBhZGRlZEtleSA9IGNyZWF0ZVJhbmRvbUtleSgpXG4gICAgd2luLmhpc3RvcnkucmVwbGFjZVN0YXRlKFxuICAgICAge1xuICAgICAgICBbc3RhdGVJbmRleEtleV06IDAsXG4gICAgICAgIGtleTogYWRkZWRLZXksIC8vIFRPRE86IFJlbW92ZSBpbiB2MiAtIHVzZSBfX1RTUl9rZXkgaW5zdGVhZFxuICAgICAgICBfX1RTUl9rZXk6IGFkZGVkS2V5LFxuICAgICAgfSxcbiAgICAgICcnLFxuICAgIClcbiAgfVxuXG4gIGxldCBjdXJyZW50TG9jYXRpb24gPSBwYXJzZUxvY2F0aW9uKClcbiAgbGV0IHJvbGxiYWNrTG9jYXRpb246IEhpc3RvcnlMb2NhdGlvbiB8IHVuZGVmaW5lZFxuXG4gIGxldCBuZXh0UG9wSXNHbyA9IGZhbHNlXG4gIGxldCBpZ25vcmVOZXh0UG9wID0gZmFsc2VcbiAgbGV0IHNraXBCbG9ja2VyTmV4dFBvcCA9IGZhbHNlXG4gIGxldCBpZ25vcmVOZXh0QmVmb3JlVW5sb2FkID0gZmFsc2VcblxuICBjb25zdCBnZXRMb2NhdGlvbiA9ICgpID0+IGN1cnJlbnRMb2NhdGlvblxuXG4gIGxldCBuZXh0OlxuICAgIHwgdW5kZWZpbmVkXG4gICAgfCB7XG4gICAgICAgIC8vIFRoaXMgaXMgdGhlIGxhdGVzdCBsb2NhdGlvbiB0aGF0IHdlIHdlcmUgYXR0ZW1wdGluZyB0byBwdXNoL3JlcGxhY2VcbiAgICAgICAgaHJlZjogc3RyaW5nXG4gICAgICAgIC8vIFRoaXMgaXMgdGhlIGxhdGVzdCBzdGF0ZSB0aGF0IHdlIHdlcmUgYXR0ZW1wdGluZyB0byBwdXNoL3JlcGxhY2VcbiAgICAgICAgc3RhdGU6IGFueVxuICAgICAgICAvLyBUaGlzIGlzIHRoZSBsYXRlc3QgdHlwZSB0aGF0IHdlIHdlcmUgYXR0ZW1wdGluZyB0byBwdXNoL3JlcGxhY2VcbiAgICAgICAgaXNQdXNoOiBib29sZWFuXG4gICAgICB9XG5cbiAgLy8gV2UgbmVlZCB0byB0cmFjayB0aGUgY3VycmVudCBzY2hlZHVsZWQgdXBkYXRlIHRvIHByZXZlbnRcbiAgLy8gbXVsdGlwbGUgdXBkYXRlcyBmcm9tIGJlaW5nIHNjaGVkdWxlZCBhdCB0aGUgc2FtZSB0aW1lLlxuICBsZXQgc2NoZWR1bGVkOiBQcm9taXNlPHZvaWQ+IHwgdW5kZWZpbmVkXG5cbiAgLy8gVGhpcyBmdW5jdGlvbiBmbHVzaGVzIHRoZSBuZXh0IHVwZGF0ZSB0byB0aGUgYnJvd3NlciBoaXN0b3J5XG4gIGNvbnN0IGZsdXNoID0gKCkgPT4ge1xuICAgIGlmICghbmV4dCkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gV2UgbmVlZCB0byBpZ25vcmUgYW55IHVwZGF0ZXMgdG8gdGhlIHN1YnNjcmliZXJzIHdoaWxlIHdlIHVwZGF0ZSB0aGUgYnJvd3NlciBoaXN0b3J5XG4gICAgaGlzdG9yeS5faWdub3JlU3Vic2NyaWJlcnMgPSB0cnVlXG5cbiAgICAvLyBVcGRhdGUgdGhlIGJyb3dzZXIgaGlzdG9yeVxuICAgIDsobmV4dC5pc1B1c2ggPyB3aW4uaGlzdG9yeS5wdXNoU3RhdGUgOiB3aW4uaGlzdG9yeS5yZXBsYWNlU3RhdGUpKFxuICAgICAgbmV4dC5zdGF0ZSxcbiAgICAgICcnLFxuICAgICAgbmV4dC5ocmVmLFxuICAgIClcblxuICAgIC8vIFN0b3AgaWdub3Jpbmcgc3Vic2NyaWJlciB1cGRhdGVzXG4gICAgaGlzdG9yeS5faWdub3JlU3Vic2NyaWJlcnMgPSBmYWxzZVxuXG4gICAgLy8gUmVzZXQgdGhlIG5leHRJc1B1c2ggZmxhZyBhbmQgY2xlYXIgdGhlIHNjaGVkdWxlZCB1cGRhdGVcbiAgICBuZXh0ID0gdW5kZWZpbmVkXG4gICAgc2NoZWR1bGVkID0gdW5kZWZpbmVkXG4gICAgcm9sbGJhY2tMb2NhdGlvbiA9IHVuZGVmaW5lZFxuICB9XG5cbiAgLy8gVGhpcyBmdW5jdGlvbiBxdWV1ZXMgdXAgYSBjYWxsIHRvIHVwZGF0ZSB0aGUgYnJvd3NlciBoaXN0b3J5XG4gIGNvbnN0IHF1ZXVlSGlzdG9yeUFjdGlvbiA9IChcbiAgICB0eXBlOiAncHVzaCcgfCAncmVwbGFjZScsXG4gICAgZGVzdEhyZWY6IHN0cmluZyxcbiAgICBzdGF0ZTogYW55LFxuICApID0+IHtcbiAgICBjb25zdCBocmVmID0gY3JlYXRlSHJlZihkZXN0SHJlZilcblxuICAgIGlmICghc2NoZWR1bGVkKSB7XG4gICAgICByb2xsYmFja0xvY2F0aW9uID0gY3VycmVudExvY2F0aW9uXG4gICAgfVxuXG4gICAgLy8gVXBkYXRlIHRoZSBsb2NhdGlvbiBpbiBtZW1vcnlcbiAgICBjdXJyZW50TG9jYXRpb24gPSBwYXJzZUhyZWYoZGVzdEhyZWYsIHN0YXRlKVxuXG4gICAgLy8gS2VlcCB0cmFjayBvZiB0aGUgbmV4dCBsb2NhdGlvbiB3ZSBuZWVkIHRvIGZsdXNoIHRvIHRoZSBVUkxcbiAgICBuZXh0ID0ge1xuICAgICAgaHJlZixcbiAgICAgIHN0YXRlLFxuICAgICAgaXNQdXNoOiBuZXh0Py5pc1B1c2ggfHwgdHlwZSA9PT0gJ3B1c2gnLFxuICAgIH1cblxuICAgIGlmICghc2NoZWR1bGVkKSB7XG4gICAgICAvLyBTY2hlZHVsZSBhbiB1cGRhdGUgdG8gdGhlIGJyb3dzZXIgaGlzdG9yeVxuICAgICAgc2NoZWR1bGVkID0gUHJvbWlzZS5yZXNvbHZlKCkudGhlbigoKSA9PiBmbHVzaCgpKVxuICAgIH1cbiAgfVxuXG4gIC8vIE5PVEU6IHRoaXMgZnVuY3Rpb24gY2FuIHByb2JhYmx5IGJlIHJlbW92ZWRcbiAgY29uc3Qgb25QdXNoUG9wID0gKHR5cGU6ICdQVVNIJyB8ICdSRVBMQUNFJykgPT4ge1xuICAgIGN1cnJlbnRMb2NhdGlvbiA9IHBhcnNlTG9jYXRpb24oKVxuICAgIGhpc3Rvcnkubm90aWZ5KHsgdHlwZSB9KVxuICB9XG5cbiAgY29uc3Qgb25QdXNoUG9wRXZlbnQgPSBhc3luYyAoKSA9PiB7XG4gICAgaWYgKGlnbm9yZU5leHRQb3ApIHtcbiAgICAgIGlnbm9yZU5leHRQb3AgPSBmYWxzZVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgY29uc3QgbmV4dExvY2F0aW9uID0gcGFyc2VMb2NhdGlvbigpXG4gICAgY29uc3QgZGVsdGEgPVxuICAgICAgbmV4dExvY2F0aW9uLnN0YXRlW3N0YXRlSW5kZXhLZXldIC0gY3VycmVudExvY2F0aW9uLnN0YXRlW3N0YXRlSW5kZXhLZXldXG4gICAgY29uc3QgaXNGb3J3YXJkID0gZGVsdGEgPT09IDFcbiAgICBjb25zdCBpc0JhY2sgPSBkZWx0YSA9PT0gLTFcbiAgICBjb25zdCBpc0dvID0gKCFpc0ZvcndhcmQgJiYgIWlzQmFjaykgfHwgbmV4dFBvcElzR29cbiAgICBuZXh0UG9wSXNHbyA9IGZhbHNlXG5cbiAgICBjb25zdCBhY3Rpb24gPSBpc0dvID8gJ0dPJyA6IGlzQmFjayA/ICdCQUNLJyA6ICdGT1JXQVJEJ1xuICAgIGNvbnN0IG5vdGlmeTogU3Vic2NyaWJlckhpc3RvcnlBY3Rpb24gPSBpc0dvXG4gICAgICA/IHtcbiAgICAgICAgICB0eXBlOiAnR08nLFxuICAgICAgICAgIGluZGV4OiBkZWx0YSxcbiAgICAgICAgfVxuICAgICAgOiB7XG4gICAgICAgICAgdHlwZTogaXNCYWNrID8gJ0JBQ0snIDogJ0ZPUldBUkQnLFxuICAgICAgICB9XG5cbiAgICBpZiAoc2tpcEJsb2NrZXJOZXh0UG9wKSB7XG4gICAgICBza2lwQmxvY2tlck5leHRQb3AgPSBmYWxzZVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBibG9ja2VycyA9IF9nZXRCbG9ja2VycygpXG4gICAgICBpZiAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJyAmJiBibG9ja2Vycy5sZW5ndGgpIHtcbiAgICAgICAgZm9yIChjb25zdCBibG9ja2VyIG9mIGJsb2NrZXJzKSB7XG4gICAgICAgICAgY29uc3QgaXNCbG9ja2VkID0gYXdhaXQgYmxvY2tlci5ibG9ja2VyRm4oe1xuICAgICAgICAgICAgY3VycmVudExvY2F0aW9uLFxuICAgICAgICAgICAgbmV4dExvY2F0aW9uLFxuICAgICAgICAgICAgYWN0aW9uLFxuICAgICAgICAgIH0pXG4gICAgICAgICAgaWYgKGlzQmxvY2tlZCkge1xuICAgICAgICAgICAgaWdub3JlTmV4dFBvcCA9IHRydWVcbiAgICAgICAgICAgIHdpbi5oaXN0b3J5LmdvKDEpXG4gICAgICAgICAgICBoaXN0b3J5Lm5vdGlmeShub3RpZnkpXG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjdXJyZW50TG9jYXRpb24gPSBwYXJzZUxvY2F0aW9uKClcbiAgICBoaXN0b3J5Lm5vdGlmeShub3RpZnkpXG4gIH1cblxuICBjb25zdCBvbkJlZm9yZVVubG9hZCA9IChlOiBCZWZvcmVVbmxvYWRFdmVudCkgPT4ge1xuICAgIGlmIChpZ25vcmVOZXh0QmVmb3JlVW5sb2FkKSB7XG4gICAgICBpZ25vcmVOZXh0QmVmb3JlVW5sb2FkID0gZmFsc2VcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGxldCBzaG91bGRCbG9jayA9IGZhbHNlXG5cbiAgICAvLyBJZiBvbmUgYmxvY2tlciBoYXMgYSBub24tZGlzYWJsZWQgYmVmb3JlVW5sb2FkLCB3ZSBzaG91bGQgYmxvY2tcbiAgICBjb25zdCBibG9ja2VycyA9IF9nZXRCbG9ja2VycygpXG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcgJiYgYmxvY2tlcnMubGVuZ3RoKSB7XG4gICAgICBmb3IgKGNvbnN0IGJsb2NrZXIgb2YgYmxvY2tlcnMpIHtcbiAgICAgICAgY29uc3Qgc2hvdWxkSGF2ZUJlZm9yZVVubG9hZCA9IGJsb2NrZXIuZW5hYmxlQmVmb3JlVW5sb2FkID8/IHRydWVcbiAgICAgICAgaWYgKHNob3VsZEhhdmVCZWZvcmVVbmxvYWQgPT09IHRydWUpIHtcbiAgICAgICAgICBzaG91bGRCbG9jayA9IHRydWVcbiAgICAgICAgICBicmVha1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKFxuICAgICAgICAgIHR5cGVvZiBzaG91bGRIYXZlQmVmb3JlVW5sb2FkID09PSAnZnVuY3Rpb24nICYmXG4gICAgICAgICAgc2hvdWxkSGF2ZUJlZm9yZVVubG9hZCgpID09PSB0cnVlXG4gICAgICAgICkge1xuICAgICAgICAgIHNob3VsZEJsb2NrID0gdHJ1ZVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc2hvdWxkQmxvY2spIHtcbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgcmV0dXJuIChlLnJldHVyblZhbHVlID0gJycpXG4gICAgfVxuICAgIHJldHVyblxuICB9XG5cbiAgY29uc3QgaGlzdG9yeSA9IGNyZWF0ZUhpc3Rvcnkoe1xuICAgIGdldExvY2F0aW9uLFxuICAgIGdldExlbmd0aDogKCkgPT4gd2luLmhpc3RvcnkubGVuZ3RoLFxuICAgIHB1c2hTdGF0ZTogKGhyZWYsIHN0YXRlKSA9PiBxdWV1ZUhpc3RvcnlBY3Rpb24oJ3B1c2gnLCBocmVmLCBzdGF0ZSksXG4gICAgcmVwbGFjZVN0YXRlOiAoaHJlZiwgc3RhdGUpID0+IHF1ZXVlSGlzdG9yeUFjdGlvbigncmVwbGFjZScsIGhyZWYsIHN0YXRlKSxcbiAgICBiYWNrOiAoaWdub3JlQmxvY2tlcikgPT4ge1xuICAgICAgaWYgKGlnbm9yZUJsb2NrZXIpIHNraXBCbG9ja2VyTmV4dFBvcCA9IHRydWVcbiAgICAgIGlnbm9yZU5leHRCZWZvcmVVbmxvYWQgPSB0cnVlXG4gICAgICByZXR1cm4gd2luLmhpc3RvcnkuYmFjaygpXG4gICAgfSxcbiAgICBmb3J3YXJkOiAoaWdub3JlQmxvY2tlcikgPT4ge1xuICAgICAgaWYgKGlnbm9yZUJsb2NrZXIpIHNraXBCbG9ja2VyTmV4dFBvcCA9IHRydWVcbiAgICAgIGlnbm9yZU5leHRCZWZvcmVVbmxvYWQgPSB0cnVlXG4gICAgICB3aW4uaGlzdG9yeS5mb3J3YXJkKClcbiAgICB9LFxuICAgIGdvOiAobikgPT4ge1xuICAgICAgbmV4dFBvcElzR28gPSB0cnVlXG4gICAgICB3aW4uaGlzdG9yeS5nbyhuKVxuICAgIH0sXG4gICAgY3JlYXRlSHJlZjogKGhyZWYpID0+IGNyZWF0ZUhyZWYoaHJlZiksXG4gICAgZmx1c2gsXG4gICAgZGVzdHJveTogKCkgPT4ge1xuICAgICAgd2luLmhpc3RvcnkucHVzaFN0YXRlID0gb3JpZ2luYWxQdXNoU3RhdGVcbiAgICAgIHdpbi5oaXN0b3J5LnJlcGxhY2VTdGF0ZSA9IG9yaWdpbmFsUmVwbGFjZVN0YXRlXG4gICAgICB3aW4ucmVtb3ZlRXZlbnRMaXN0ZW5lcihiZWZvcmVVbmxvYWRFdmVudCwgb25CZWZvcmVVbmxvYWQsIHtcbiAgICAgICAgY2FwdHVyZTogdHJ1ZSxcbiAgICAgIH0pXG4gICAgICB3aW4ucmVtb3ZlRXZlbnRMaXN0ZW5lcihwb3BTdGF0ZUV2ZW50LCBvblB1c2hQb3BFdmVudClcbiAgICB9LFxuICAgIG9uQmxvY2tlZDogKCkgPT4ge1xuICAgICAgLy8gSWYgYSBuYXZpZ2F0aW9uIGlzIGJsb2NrZWQsIHdlIG5lZWQgdG8gcm9sbGJhY2sgdGhlIGxvY2F0aW9uXG4gICAgICAvLyB0aGF0IHdlIG9wdGltaXN0aWNhbGx5IHVwZGF0ZWQgaW4gbWVtb3J5LlxuICAgICAgaWYgKHJvbGxiYWNrTG9jYXRpb24gJiYgY3VycmVudExvY2F0aW9uICE9PSByb2xsYmFja0xvY2F0aW9uKSB7XG4gICAgICAgIGN1cnJlbnRMb2NhdGlvbiA9IHJvbGxiYWNrTG9jYXRpb25cbiAgICAgIH1cbiAgICB9LFxuICAgIGdldEJsb2NrZXJzOiBfZ2V0QmxvY2tlcnMsXG4gICAgc2V0QmxvY2tlcnM6IF9zZXRCbG9ja2VycyxcbiAgICBub3RpZnlPbkluZGV4Q2hhbmdlOiBmYWxzZSxcbiAgfSlcblxuICB3aW4uYWRkRXZlbnRMaXN0ZW5lcihiZWZvcmVVbmxvYWRFdmVudCwgb25CZWZvcmVVbmxvYWQsIHsgY2FwdHVyZTogdHJ1ZSB9KVxuICB3aW4uYWRkRXZlbnRMaXN0ZW5lcihwb3BTdGF0ZUV2ZW50LCBvblB1c2hQb3BFdmVudClcblxuICB3aW4uaGlzdG9yeS5wdXNoU3RhdGUgPSBmdW5jdGlvbiAoLi4uYXJnczogQXJyYXk8YW55Pikge1xuICAgIGNvbnN0IHJlcyA9IG9yaWdpbmFsUHVzaFN0YXRlLmFwcGx5KHdpbi5oaXN0b3J5LCBhcmdzIGFzIGFueSlcbiAgICBpZiAoIWhpc3RvcnkuX2lnbm9yZVN1YnNjcmliZXJzKSBvblB1c2hQb3AoJ1BVU0gnKVxuICAgIHJldHVybiByZXNcbiAgfVxuXG4gIHdpbi5oaXN0b3J5LnJlcGxhY2VTdGF0ZSA9IGZ1bmN0aW9uICguLi5hcmdzOiBBcnJheTxhbnk+KSB7XG4gICAgY29uc3QgcmVzID0gb3JpZ2luYWxSZXBsYWNlU3RhdGUuYXBwbHkod2luLmhpc3RvcnksIGFyZ3MgYXMgYW55KVxuICAgIGlmICghaGlzdG9yeS5faWdub3JlU3Vic2NyaWJlcnMpIG9uUHVzaFBvcCgnUkVQTEFDRScpXG4gICAgcmV0dXJuIHJlc1xuICB9XG5cbiAgcmV0dXJuIGhpc3Rvcnlcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBoYXNoLWJhc2VkIGhpc3RvcnkgaW1wbGVtZW50YXRpb24uXG4gKiBVc2VmdWwgZm9yIHN0YXRpYyBob3N0cyBvciBlbnZpcm9ubWVudHMgd2l0aG91dCBzZXJ2ZXIgVVJMIHJld3JpdGluZy5cbiAqIEBsaW5rIGh0dHBzOi8vdGFuc3RhY2suY29tL3JvdXRlci9sYXRlc3QvZG9jcy9mcmFtZXdvcmsvcmVhY3QvZ3VpZGUvaGlzdG9yeS10eXBlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlSGFzaEhpc3Rvcnkob3B0cz86IHsgd2luZG93PzogYW55IH0pOiBSb3V0ZXJIaXN0b3J5IHtcbiAgY29uc3Qgd2luID1cbiAgICBvcHRzPy53aW5kb3cgPz9cbiAgICAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6ICh1bmRlZmluZWQgYXMgYW55KSlcbiAgcmV0dXJuIGNyZWF0ZUJyb3dzZXJIaXN0b3J5KHtcbiAgICB3aW5kb3c6IHdpbixcbiAgICBwYXJzZUxvY2F0aW9uOiAoKSA9PiB7XG4gICAgICBjb25zdCBoYXNoU3BsaXQgPSB3aW4ubG9jYXRpb24uaGFzaC5zcGxpdCgnIycpLnNsaWNlKDEpXG4gICAgICBjb25zdCBwYXRoUGFydCA9IGhhc2hTcGxpdFswXSA/PyAnLydcbiAgICAgIGNvbnN0IHNlYXJjaFBhcnQgPSB3aW4ubG9jYXRpb24uc2VhcmNoXG4gICAgICBjb25zdCBoYXNoRW50cmllcyA9IGhhc2hTcGxpdC5zbGljZSgxKVxuICAgICAgY29uc3QgaGFzaFBhcnQgPVxuICAgICAgICBoYXNoRW50cmllcy5sZW5ndGggPT09IDAgPyAnJyA6IGAjJHtoYXNoRW50cmllcy5qb2luKCcjJyl9YFxuICAgICAgY29uc3QgaGFzaEhyZWYgPSBgJHtwYXRoUGFydH0ke3NlYXJjaFBhcnR9JHtoYXNoUGFydH1gXG4gICAgICByZXR1cm4gcGFyc2VIcmVmKGhhc2hIcmVmLCB3aW4uaGlzdG9yeS5zdGF0ZSlcbiAgICB9LFxuICAgIGNyZWF0ZUhyZWY6IChocmVmKSA9PlxuICAgICAgYCR7d2luLmxvY2F0aW9uLnBhdGhuYW1lfSR7d2luLmxvY2F0aW9uLnNlYXJjaH0jJHtocmVmfWAsXG4gIH0pXG59XG5cbi8qKlxuICogQ3JlYXRlIGFuIGluLW1lbW9yeSBoaXN0b3J5IGltcGxlbWVudGF0aW9uLlxuICogSWRlYWwgZm9yIHNlcnZlciByZW5kZXJpbmcsIHRlc3RzLCBhbmQgbm9uLURPTSBlbnZpcm9ubWVudHMuXG4gKiBAbGluayBodHRwczovL3RhbnN0YWNrLmNvbS9yb3V0ZXIvbGF0ZXN0L2RvY3MvZnJhbWV3b3JrL3JlYWN0L2d1aWRlL2hpc3RvcnktdHlwZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZU1lbW9yeUhpc3RvcnkoXG4gIG9wdHM6IHtcbiAgICBpbml0aWFsRW50cmllczogQXJyYXk8c3RyaW5nPlxuICAgIGluaXRpYWxJbmRleD86IG51bWJlclxuICB9ID0ge1xuICAgIGluaXRpYWxFbnRyaWVzOiBbJy8nXSxcbiAgfSxcbik6IFJvdXRlckhpc3Rvcnkge1xuICBjb25zdCBlbnRyaWVzID0gb3B0cy5pbml0aWFsRW50cmllc1xuICBsZXQgaW5kZXggPSBvcHRzLmluaXRpYWxJbmRleFxuICAgID8gTWF0aC5taW4oTWF0aC5tYXgob3B0cy5pbml0aWFsSW5kZXgsIDApLCBlbnRyaWVzLmxlbmd0aCAtIDEpXG4gICAgOiBlbnRyaWVzLmxlbmd0aCAtIDFcbiAgY29uc3Qgc3RhdGVzID0gZW50cmllcy5tYXAoKF9lbnRyeSwgaW5kZXgpID0+XG4gICAgYXNzaWduS2V5QW5kSW5kZXgoaW5kZXgsIHVuZGVmaW5lZCksXG4gIClcblxuICBjb25zdCBnZXRMb2NhdGlvbiA9ICgpID0+IHBhcnNlSHJlZihlbnRyaWVzW2luZGV4XSEsIHN0YXRlc1tpbmRleF0pXG5cbiAgbGV0IGJsb2NrZXJzOiBBcnJheTxOYXZpZ2F0aW9uQmxvY2tlcj4gPSBbXVxuICBjb25zdCBfZ2V0QmxvY2tlcnMgPSAoKSA9PiBibG9ja2Vyc1xuICBjb25zdCBfc2V0QmxvY2tlcnMgPSAobmV3QmxvY2tlcnM6IEFycmF5PE5hdmlnYXRpb25CbG9ja2VyPikgPT5cbiAgICAoYmxvY2tlcnMgPSBuZXdCbG9ja2VycylcblxuICByZXR1cm4gY3JlYXRlSGlzdG9yeSh7XG4gICAgZ2V0TG9jYXRpb24sXG4gICAgZ2V0TGVuZ3RoOiAoKSA9PiBlbnRyaWVzLmxlbmd0aCxcbiAgICBwdXNoU3RhdGU6IChwYXRoLCBzdGF0ZSkgPT4ge1xuICAgICAgLy8gUmVtb3ZlcyBhbGwgc3Vic2VxdWVudCBlbnRyaWVzIGFmdGVyIHRoZSBjdXJyZW50IGluZGV4IHRvIHN0YXJ0IGEgbmV3IGJyYW5jaFxuICAgICAgaWYgKGluZGV4IDwgZW50cmllcy5sZW5ndGggLSAxKSB7XG4gICAgICAgIGVudHJpZXMuc3BsaWNlKGluZGV4ICsgMSlcbiAgICAgICAgc3RhdGVzLnNwbGljZShpbmRleCArIDEpXG4gICAgICB9XG4gICAgICBzdGF0ZXMucHVzaChzdGF0ZSlcbiAgICAgIGVudHJpZXMucHVzaChwYXRoKVxuICAgICAgaW5kZXggPSBNYXRoLm1heChlbnRyaWVzLmxlbmd0aCAtIDEsIDApXG4gICAgfSxcbiAgICByZXBsYWNlU3RhdGU6IChwYXRoLCBzdGF0ZSkgPT4ge1xuICAgICAgc3RhdGVzW2luZGV4XSA9IHN0YXRlXG4gICAgICBlbnRyaWVzW2luZGV4XSA9IHBhdGhcbiAgICB9LFxuICAgIGJhY2s6ICgpID0+IHtcbiAgICAgIGluZGV4ID0gTWF0aC5tYXgoaW5kZXggLSAxLCAwKVxuICAgIH0sXG4gICAgZm9yd2FyZDogKCkgPT4ge1xuICAgICAgaW5kZXggPSBNYXRoLm1pbihpbmRleCArIDEsIGVudHJpZXMubGVuZ3RoIC0gMSlcbiAgICB9LFxuICAgIGdvOiAobikgPT4ge1xuICAgICAgaW5kZXggPSBNYXRoLm1pbihNYXRoLm1heChpbmRleCArIG4sIDApLCBlbnRyaWVzLmxlbmd0aCAtIDEpXG4gICAgfSxcbiAgICBjcmVhdGVIcmVmOiAocGF0aCkgPT4gcGF0aCxcbiAgICBnZXRCbG9ja2VyczogX2dldEJsb2NrZXJzLFxuICAgIHNldEJsb2NrZXJzOiBfc2V0QmxvY2tlcnMsXG4gIH0pXG59XG5cbi8qKlxuICogU2FuaXRpemUgYSBwYXRoIHRvIHByZXZlbnQgb3BlbiByZWRpcmVjdCB2dWxuZXJhYmlsaXRpZXMuXG4gKiBSZW1vdmVzIGNvbnRyb2wgY2hhcmFjdGVycyBhbmQgY29sbGFwc2VzIGxlYWRpbmcgZG91YmxlIHNsYXNoZXMuXG4gKi9cbmZ1bmN0aW9uIHNhbml0aXplUGF0aChwYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICAvLyBSZW1vdmUgQVNDSUkgY29udHJvbCBjaGFyYWN0ZXJzICgweDAwLTB4MUYpIGFuZCBERUwgKDB4N0YpXG4gIC8vIFRoZXNlIGluY2x1ZGUgQ1IgKFxcciA9IDB4MEQpLCBMRiAoXFxuID0gMHgwQSksIGFuZCBvdGhlciBwb3RlbnRpYWxseSBkYW5nZXJvdXMgY2hhcmFjdGVyc1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29udHJvbC1yZWdleFxuICBsZXQgc2FuaXRpemVkID0gcGF0aC5yZXBsYWNlKC9bXFx4MDAtXFx4MWZcXHg3Zl0vZywgJycpXG5cbiAgLy8gUHJldmVudCBvcGVuIHJlZGlyZWN0IHZpYSBwcm90b2NvbC1yZWxhdGl2ZSBVUkxzIChlLmcuIFwiLy9ldmlsLmNvbVwiKVxuICAvLyBDb2xsYXBzZSBsZWFkaW5nIGRvdWJsZSBzbGFzaGVzIHRvIGEgc2luZ2xlIHNsYXNoXG4gIGlmIChzYW5pdGl6ZWQuc3RhcnRzV2l0aCgnLy8nKSkge1xuICAgIHNhbml0aXplZCA9ICcvJyArIHNhbml0aXplZC5yZXBsYWNlKC9eXFwvKy8sICcnKVxuICB9XG5cbiAgcmV0dXJuIHNhbml0aXplZFxufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VIcmVmKFxuICBocmVmOiBzdHJpbmcsXG4gIHN0YXRlOiBQYXJzZWRIaXN0b3J5U3RhdGUgfCB1bmRlZmluZWQsXG4pOiBIaXN0b3J5TG9jYXRpb24ge1xuICBjb25zdCBzYW5pdGl6ZWRIcmVmID0gc2FuaXRpemVQYXRoKGhyZWYpXG4gIGNvbnN0IGhhc2hJbmRleCA9IHNhbml0aXplZEhyZWYuaW5kZXhPZignIycpXG4gIGNvbnN0IHNlYXJjaEluZGV4ID0gc2FuaXRpemVkSHJlZi5pbmRleE9mKCc/JylcblxuICBjb25zdCBhZGRlZEtleSA9IGNyZWF0ZVJhbmRvbUtleSgpXG5cbiAgcmV0dXJuIHtcbiAgICBocmVmOiBzYW5pdGl6ZWRIcmVmLFxuICAgIHBhdGhuYW1lOiBzYW5pdGl6ZWRIcmVmLnN1YnN0cmluZyhcbiAgICAgIDAsXG4gICAgICBoYXNoSW5kZXggPiAwXG4gICAgICAgID8gc2VhcmNoSW5kZXggPiAwXG4gICAgICAgICAgPyBNYXRoLm1pbihoYXNoSW5kZXgsIHNlYXJjaEluZGV4KVxuICAgICAgICAgIDogaGFzaEluZGV4XG4gICAgICAgIDogc2VhcmNoSW5kZXggPiAwXG4gICAgICAgICAgPyBzZWFyY2hJbmRleFxuICAgICAgICAgIDogc2FuaXRpemVkSHJlZi5sZW5ndGgsXG4gICAgKSxcbiAgICBoYXNoOiBoYXNoSW5kZXggPiAtMSA/IHNhbml0aXplZEhyZWYuc3Vic3RyaW5nKGhhc2hJbmRleCkgOiAnJyxcbiAgICBzZWFyY2g6XG4gICAgICBzZWFyY2hJbmRleCA+IC0xXG4gICAgICAgID8gc2FuaXRpemVkSHJlZi5zbGljZShcbiAgICAgICAgICAgIHNlYXJjaEluZGV4LFxuICAgICAgICAgICAgaGFzaEluZGV4ID09PSAtMSA/IHVuZGVmaW5lZCA6IGhhc2hJbmRleCxcbiAgICAgICAgICApXG4gICAgICAgIDogJycsXG4gICAgc3RhdGU6IHN0YXRlIHx8IHsgW3N0YXRlSW5kZXhLZXldOiAwLCBrZXk6IGFkZGVkS2V5LCBfX1RTUl9rZXk6IGFkZGVkS2V5IH0sXG4gIH1cbn1cblxuLy8gVGhhbmtzIGNvLXBpbG90IVxuZnVuY3Rpb24gY3JlYXRlUmFuZG9tS2V5KCkge1xuICByZXR1cm4gKE1hdGgucmFuZG9tKCkgKyAxKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDcpXG59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