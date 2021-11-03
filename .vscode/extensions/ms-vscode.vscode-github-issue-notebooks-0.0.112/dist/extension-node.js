/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((module) => {

"use strict";
module.exports = require("vscode");;

/***/ }),
/* 2 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "registerCommands": () => (/* binding */ registerCommands)
/* harmony export */ });
/* harmony import */ var vscode__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var vscode__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(vscode__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _notebookProvider__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(3);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


function registerCommands(projectContainer, octokit) {
    const subscriptions = [];
    subscriptions.push(vscode__WEBPACK_IMPORTED_MODULE_0__.commands.registerCommand('github-issues.new', async () => {
        const newNotebook = await vscode__WEBPACK_IMPORTED_MODULE_0__.workspace.openNotebookDocument('github-issues', new vscode__WEBPACK_IMPORTED_MODULE_0__.NotebookData([new vscode__WEBPACK_IMPORTED_MODULE_0__.NotebookCellData(vscode__WEBPACK_IMPORTED_MODULE_0__.NotebookCellKind.Code, 'repo:microsoft/vscode is:open', 'github-issues')]));
        await vscode__WEBPACK_IMPORTED_MODULE_0__.window.showNotebookDocument(newNotebook);
    }));
    subscriptions.push(vscode__WEBPACK_IMPORTED_MODULE_0__.commands.registerCommand('github-issues.openAll', async (cell) => {
        let items;
        out: for (let output of cell.outputs) {
            for (let item of output.items) {
                if (item.mime === _notebookProvider__WEBPACK_IMPORTED_MODULE_1__.mimeGithubIssues) {
                    items = JSON.parse(new TextDecoder().decode(item.data));
                    break out;
                }
            }
        }
        if (!items) {
            return;
        }
        if (items.length > 10) {
            const option = await vscode__WEBPACK_IMPORTED_MODULE_0__.window.showInformationMessage(`This will open ${items.length} browser tabs. Do you want to continue?`, { modal: true }, 'OK');
            if (option !== 'OK') {
                return;
            }
        }
        for (let item of items) {
            await vscode__WEBPACK_IMPORTED_MODULE_0__.env.openExternal(vscode__WEBPACK_IMPORTED_MODULE_0__.Uri.parse(item.html_url));
        }
    }));
    subscriptions.push(vscode__WEBPACK_IMPORTED_MODULE_0__.commands.registerCommand('github-issues.openUrl', async (cell) => {
        const project = projectContainer.lookupProject(cell.document.uri, false);
        if (!project) {
            return;
        }
        const data = project.queryData(project.getOrCreate(cell.document));
        for (let d of data) {
            let url = `https://github.com/issues?q=${d.q}`;
            if (d.sort) {
                url += ` sort:${d.sort}`;
            }
            if (d.order) {
                url += `-${d.order}`;
            }
            await vscode__WEBPACK_IMPORTED_MODULE_0__.env.openExternal(vscode__WEBPACK_IMPORTED_MODULE_0__.Uri.parse(url));
        }
    }));
    subscriptions.push(vscode__WEBPACK_IMPORTED_MODULE_0__.commands.registerCommand('github-issues.authNow', async () => {
        await octokit.lib(true);
    }));
    return vscode__WEBPACK_IMPORTED_MODULE_0__.Disposable.from(...subscriptions);
}


/***/ }),
/* 3 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "mimeGithubIssues": () => (/* binding */ mimeGithubIssues),
/* harmony export */   "IssuesNotebookKernel": () => (/* binding */ IssuesNotebookKernel),
/* harmony export */   "IssuesStatusBarProvider": () => (/* binding */ IssuesStatusBarProvider),
/* harmony export */   "IssuesNotebookSerializer": () => (/* binding */ IssuesNotebookSerializer)
/* harmony export */ });
/* harmony import */ var abort_controller__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(4);
/* harmony import */ var abort_controller__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(abort_controller__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var vscode__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1);
/* harmony import */ var vscode__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(vscode__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _parser_nodes__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(6);
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(8);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/




const mimeGithubIssues = 'x-application/github-issues';
// --- running queries
class IssuesNotebookKernel {
    constructor(container, octokit) {
        this.container = container;
        this.octokit = octokit;
        this._executionOrder = 0;
        this._controller = vscode__WEBPACK_IMPORTED_MODULE_1__.notebooks.createNotebookController('githubIssueKernel', 'github-issues', 'github.com');
        this._controller.supportedLanguages = ['github-issues'];
        this._controller.supportsExecutionOrder = true;
        this._controller.description = 'GitHub';
        this._controller.executeHandler = this._executeAll.bind(this);
    }
    dispose() {
        this._controller.dispose();
    }
    _executeAll(cells) {
        const all = new Set();
        for (const cell of cells) {
            this._collectDependentCells(cell, all);
        }
        for (const cell of all.values()) {
            this._doExecuteCell(cell);
        }
    }
    async _doExecuteCell(cell) {
        const doc = await vscode__WEBPACK_IMPORTED_MODULE_1__.workspace.openTextDocument(cell.document.uri);
        const project = this.container.lookupProject(doc.uri);
        const query = project.getOrCreate(doc);
        // update query so that symbols defined here are marked as more recent
        project.symbols.update(query);
        const exec = this._controller.createNotebookCellExecution(cell);
        exec.executionOrder = ++this._executionOrder;
        exec.start(Date.now());
        if (!(0,_utils__WEBPACK_IMPORTED_MODULE_3__.isRunnable)(query)) {
            exec.end(true);
            return;
        }
        if (!this.octokit.isAuthenticated) {
            const atMe = (0,_utils__WEBPACK_IMPORTED_MODULE_3__.isUsingAtMe)(query, project);
            if (atMe > 0) {
                const message = atMe > 1
                    ? 'This query depends on [`@me`](https://docs.github.com/en/search-github/getting-started-with-searching-on-github/understanding-the-search-syntax#queries-with-usernames) to specify the current user. For that to work you need to be [logged in](command:github-issues.authNow).'
                    : 'This query uses [`@me`](https://docs.github.com/en/search-github/getting-started-with-searching-on-github/understanding-the-search-syntax#queries-with-usernames) to specify the current user. For that to work you need to be [logged in](command:github-issues.authNow).';
                exec.replaceOutput(new vscode__WEBPACK_IMPORTED_MODULE_1__.NotebookCellOutput([vscode__WEBPACK_IMPORTED_MODULE_1__.NotebookCellOutputItem.text(message, 'text/markdown')]));
                exec.end(false);
                return;
            }
        }
        const allQueryData = project.queryData(query);
        let allItems = [];
        let tooLarge = false;
        // fetch
        try {
            const abortCtl = new (abort_controller__WEBPACK_IMPORTED_MODULE_0___default())();
            exec.token.onCancellationRequested(_ => abortCtl.abort());
            for (let queryData of allQueryData) {
                const octokit = await this.octokit.lib();
                let page = 1;
                let count = 0;
                while (!exec.token.isCancellationRequested) {
                    const response = await octokit.search.issuesAndPullRequests({
                        q: queryData.q,
                        sort: queryData.sort,
                        order: queryData.order,
                        per_page: 100,
                        page,
                        request: { signal: abortCtl.signal }
                    });
                    count += response.data.items.length;
                    allItems = allItems.concat(response.data.items);
                    tooLarge = tooLarge || response.data.total_count > 1000;
                    if (count >= Math.min(1000, response.data.total_count)) {
                        break;
                    }
                    page += 1;
                }
            }
        }
        catch (err) {
            if (err instanceof Error && err.message.includes('Authenticated requests get a higher rate limit')) {
                // ugly error-message checking for anon-rate-limit. where are the error codes?
                const message = 'You have exceeded the rate limit for anonymous querying. You can [log in](command:github-issues.authNow) to continue querying.';
                exec.replaceOutput(new vscode__WEBPACK_IMPORTED_MODULE_1__.NotebookCellOutput([vscode__WEBPACK_IMPORTED_MODULE_1__.NotebookCellOutputItem.text(message, 'text/markdown')]));
            }
            else if (err instanceof Error && err.message.includes('The listed users cannot be searched')) {
                const message = 'This query uses [`@me`](https://docs.github.com/en/search-github/getting-started-with-searching-on-github/understanding-the-search-syntax#queries-with-usernames) to specify the current user. For that to work you need to be [logged in](command:github-issues.authNow).';
                exec.replaceOutput(new vscode__WEBPACK_IMPORTED_MODULE_1__.NotebookCellOutput([vscode__WEBPACK_IMPORTED_MODULE_1__.NotebookCellOutputItem.text(message, 'text/markdown')]));
            }
            else {
                // print as error
                exec.replaceOutput(new vscode__WEBPACK_IMPORTED_MODULE_1__.NotebookCellOutput([vscode__WEBPACK_IMPORTED_MODULE_1__.NotebookCellOutputItem.error(err)]));
            }
            exec.end(false);
            return;
        }
        // sort
        const [first] = allQueryData;
        const comparator = allQueryData.length >= 2 && allQueryData.every(item => item.sort === first.sort) && cmp.byName.get(first.sort);
        if (comparator) {
            allItems.sort(first.sort === 'asc' ? cmp.invert(comparator) : comparator);
        }
        // "render"
        const seen = new Set();
        let md = '';
        for (let item of allItems) {
            if (seen.has(item.url)) {
                continue;
            }
            seen.add(item.url);
            // markdown
            md += `- [#${item.number}](${item.html_url}) ${item.title}`;
            if (item.labels.length > 0) {
                md += ` [${item.labels.map(label => `${label.name}`).join(', ')}] `;
            }
            if (item.assignee) {
                md += `- [@${item.assignee.login}](${item.assignee.html_url} "Issue ${item.number} is assigned to ${item.assignee.login}")\n`;
            }
            md += '\n';
        }
        // status line
        exec.replaceOutput([new vscode__WEBPACK_IMPORTED_MODULE_1__.NotebookCellOutput([
                vscode__WEBPACK_IMPORTED_MODULE_1__.NotebookCellOutputItem.json(allItems, mimeGithubIssues),
                vscode__WEBPACK_IMPORTED_MODULE_1__.NotebookCellOutputItem.text(md, 'text/markdown'),
            ], { itemCount: allItems.length })]);
        exec.end(true, Date.now());
    }
    async _collectDependentCells(cell, bucket) {
        const project = this.container.lookupProject(cell.notebook.uri);
        const query = project.getOrCreate(cell.document);
        const seen = new Set();
        const stack = [query];
        while (true) {
            const query = stack.pop();
            if (!query) {
                break;
            }
            if (seen.has(query.id)) {
                continue;
            }
            seen.add(query.id);
            _parser_nodes__WEBPACK_IMPORTED_MODULE_2__.Utils.walk(query, node => {
                if (node._type === "VariableName" /* VariableName */) {
                    const symbol = project.symbols.getFirst(node.value);
                    if (symbol) {
                        stack.push(symbol.root);
                    }
                }
            });
        }
        for (const candidate of cell.notebook.getCells()) {
            if (seen.has(candidate.document.uri.toString())) {
                bucket.add(candidate);
            }
        }
    }
}
// --- status bar
class IssuesStatusBarProvider {
    provideCellStatusBarItems(cell) {
        var _a, _b;
        const count = (_b = (_a = cell.outputs[0]) === null || _a === void 0 ? void 0 : _a.metadata) === null || _b === void 0 ? void 0 : _b['itemCount'];
        if (typeof count !== 'number') {
            return;
        }
        const item = new vscode__WEBPACK_IMPORTED_MODULE_1__.NotebookCellStatusBarItem(`$(globe) Open ${count} results`, vscode__WEBPACK_IMPORTED_MODULE_1__.NotebookCellStatusBarAlignment.Right);
        item.command = 'github-issues.openAll';
        item.tooltip = `Open ${count} results in browser`;
        return item;
    }
}
class IssuesNotebookSerializer {
    constructor() {
        this._decoder = new TextDecoder();
        this._encoder = new TextEncoder();
    }
    deserializeNotebook(data) {
        let contents = '';
        try {
            contents = this._decoder.decode(data);
        }
        catch {
        }
        let raw;
        try {
            raw = JSON.parse(contents);
        }
        catch {
            //?
            raw = [];
        }
        const cells = raw.map(item => new vscode__WEBPACK_IMPORTED_MODULE_1__.NotebookCellData(item.kind, item.value, item.language));
        return new vscode__WEBPACK_IMPORTED_MODULE_1__.NotebookData(cells);
    }
    serializeNotebook(data) {
        let contents = [];
        for (let cell of data.cells) {
            contents.push({
                kind: cell.kind,
                language: cell.languageId,
                value: cell.value
            });
        }
        return this._encoder.encode(JSON.stringify(contents, undefined, 2));
    }
}
var cmp;
(function (cmp) {
    cmp.byName = new Map([
        ['comments', compareByComments],
        ['created', compareByCreated],
        ['updated', compareByUpdated],
    ]);
    function invert(compare) {
        return (a, b) => compare(a, b) * -1;
    }
    cmp.invert = invert;
    function compareByComments(a, b) {
        return a.comments - b.comments;
    }
    cmp.compareByComments = compareByComments;
    function compareByCreated(a, b) {
        return Date.parse(a.created_at) - Date.parse(b.created_at);
    }
    cmp.compareByCreated = compareByCreated;
    function compareByUpdated(a, b) {
        return Date.parse(a.updated_at) - Date.parse(b.updated_at);
    }
    cmp.compareByUpdated = compareByUpdated;
})(cmp || (cmp = {}));


/***/ }),
/* 4 */
/***/ ((module, exports, __webpack_require__) => {

"use strict";
/**
 * @author Toru Nagashima <https://github.com/mysticatea>
 * See LICENSE file in root directory for full license.
 */


Object.defineProperty(exports, "__esModule", ({ value: true }));

var eventTargetShim = __webpack_require__(5);

/**
 * The signal class.
 * @see https://dom.spec.whatwg.org/#abortsignal
 */
class AbortSignal extends eventTargetShim.EventTarget {
    /**
     * AbortSignal cannot be constructed directly.
     */
    constructor() {
        super();
        throw new TypeError("AbortSignal cannot be constructed directly");
    }
    /**
     * Returns `true` if this `AbortSignal`'s `AbortController` has signaled to abort, and `false` otherwise.
     */
    get aborted() {
        const aborted = abortedFlags.get(this);
        if (typeof aborted !== "boolean") {
            throw new TypeError(`Expected 'this' to be an 'AbortSignal' object, but got ${this === null ? "null" : typeof this}`);
        }
        return aborted;
    }
}
eventTargetShim.defineEventAttribute(AbortSignal.prototype, "abort");
/**
 * Create an AbortSignal object.
 */
function createAbortSignal() {
    const signal = Object.create(AbortSignal.prototype);
    eventTargetShim.EventTarget.call(signal);
    abortedFlags.set(signal, false);
    return signal;
}
/**
 * Abort a given signal.
 */
function abortSignal(signal) {
    if (abortedFlags.get(signal) !== false) {
        return;
    }
    abortedFlags.set(signal, true);
    signal.dispatchEvent({ type: "abort" });
}
/**
 * Aborted flag for each instances.
 */
const abortedFlags = new WeakMap();
// Properties should be enumerable.
Object.defineProperties(AbortSignal.prototype, {
    aborted: { enumerable: true },
});
// `toString()` should return `"[object AbortSignal]"`
if (typeof Symbol === "function" && typeof Symbol.toStringTag === "symbol") {
    Object.defineProperty(AbortSignal.prototype, Symbol.toStringTag, {
        configurable: true,
        value: "AbortSignal",
    });
}

/**
 * The AbortController.
 * @see https://dom.spec.whatwg.org/#abortcontroller
 */
class AbortController {
    /**
     * Initialize this controller.
     */
    constructor() {
        signals.set(this, createAbortSignal());
    }
    /**
     * Returns the `AbortSignal` object associated with this object.
     */
    get signal() {
        return getSignal(this);
    }
    /**
     * Abort and signal to any observers that the associated activity is to be aborted.
     */
    abort() {
        abortSignal(getSignal(this));
    }
}
/**
 * Associated signals.
 */
const signals = new WeakMap();
/**
 * Get the associated signal of a given controller.
 */
function getSignal(controller) {
    const signal = signals.get(controller);
    if (signal == null) {
        throw new TypeError(`Expected 'this' to be an 'AbortController' object, but got ${controller === null ? "null" : typeof controller}`);
    }
    return signal;
}
// Properties should be enumerable.
Object.defineProperties(AbortController.prototype, {
    signal: { enumerable: true },
    abort: { enumerable: true },
});
if (typeof Symbol === "function" && typeof Symbol.toStringTag === "symbol") {
    Object.defineProperty(AbortController.prototype, Symbol.toStringTag, {
        configurable: true,
        value: "AbortController",
    });
}

exports.AbortController = AbortController;
exports.AbortSignal = AbortSignal;
exports.default = AbortController;

module.exports = AbortController
module.exports.AbortController = module.exports.default = AbortController
module.exports.AbortSignal = AbortSignal
//# sourceMappingURL=abort-controller.js.map


/***/ }),
/* 5 */
/***/ ((module, exports) => {

"use strict";
/**
 * @author Toru Nagashima <https://github.com/mysticatea>
 * @copyright 2015 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */


Object.defineProperty(exports, "__esModule", ({ value: true }));

/**
 * @typedef {object} PrivateData
 * @property {EventTarget} eventTarget The event target.
 * @property {{type:string}} event The original event object.
 * @property {number} eventPhase The current event phase.
 * @property {EventTarget|null} currentTarget The current event target.
 * @property {boolean} canceled The flag to prevent default.
 * @property {boolean} stopped The flag to stop propagation.
 * @property {boolean} immediateStopped The flag to stop propagation immediately.
 * @property {Function|null} passiveListener The listener if the current listener is passive. Otherwise this is null.
 * @property {number} timeStamp The unix time.
 * @private
 */

/**
 * Private data for event wrappers.
 * @type {WeakMap<Event, PrivateData>}
 * @private
 */
const privateData = new WeakMap();

/**
 * Cache for wrapper classes.
 * @type {WeakMap<Object, Function>}
 * @private
 */
const wrappers = new WeakMap();

/**
 * Get private data.
 * @param {Event} event The event object to get private data.
 * @returns {PrivateData} The private data of the event.
 * @private
 */
function pd(event) {
    const retv = privateData.get(event);
    console.assert(
        retv != null,
        "'this' is expected an Event object, but got",
        event
    );
    return retv
}

/**
 * https://dom.spec.whatwg.org/#set-the-canceled-flag
 * @param data {PrivateData} private data.
 */
function setCancelFlag(data) {
    if (data.passiveListener != null) {
        if (
            typeof console !== "undefined" &&
            typeof console.error === "function"
        ) {
            console.error(
                "Unable to preventDefault inside passive event listener invocation.",
                data.passiveListener
            );
        }
        return
    }
    if (!data.event.cancelable) {
        return
    }

    data.canceled = true;
    if (typeof data.event.preventDefault === "function") {
        data.event.preventDefault();
    }
}

/**
 * @see https://dom.spec.whatwg.org/#interface-event
 * @private
 */
/**
 * The event wrapper.
 * @constructor
 * @param {EventTarget} eventTarget The event target of this dispatching.
 * @param {Event|{type:string}} event The original event to wrap.
 */
function Event(eventTarget, event) {
    privateData.set(this, {
        eventTarget,
        event,
        eventPhase: 2,
        currentTarget: eventTarget,
        canceled: false,
        stopped: false,
        immediateStopped: false,
        passiveListener: null,
        timeStamp: event.timeStamp || Date.now(),
    });

    // https://heycam.github.io/webidl/#Unforgeable
    Object.defineProperty(this, "isTrusted", { value: false, enumerable: true });

    // Define accessors
    const keys = Object.keys(event);
    for (let i = 0; i < keys.length; ++i) {
        const key = keys[i];
        if (!(key in this)) {
            Object.defineProperty(this, key, defineRedirectDescriptor(key));
        }
    }
}

// Should be enumerable, but class methods are not enumerable.
Event.prototype = {
    /**
     * The type of this event.
     * @type {string}
     */
    get type() {
        return pd(this).event.type
    },

    /**
     * The target of this event.
     * @type {EventTarget}
     */
    get target() {
        return pd(this).eventTarget
    },

    /**
     * The target of this event.
     * @type {EventTarget}
     */
    get currentTarget() {
        return pd(this).currentTarget
    },

    /**
     * @returns {EventTarget[]} The composed path of this event.
     */
    composedPath() {
        const currentTarget = pd(this).currentTarget;
        if (currentTarget == null) {
            return []
        }
        return [currentTarget]
    },

    /**
     * Constant of NONE.
     * @type {number}
     */
    get NONE() {
        return 0
    },

    /**
     * Constant of CAPTURING_PHASE.
     * @type {number}
     */
    get CAPTURING_PHASE() {
        return 1
    },

    /**
     * Constant of AT_TARGET.
     * @type {number}
     */
    get AT_TARGET() {
        return 2
    },

    /**
     * Constant of BUBBLING_PHASE.
     * @type {number}
     */
    get BUBBLING_PHASE() {
        return 3
    },

    /**
     * The target of this event.
     * @type {number}
     */
    get eventPhase() {
        return pd(this).eventPhase
    },

    /**
     * Stop event bubbling.
     * @returns {void}
     */
    stopPropagation() {
        const data = pd(this);

        data.stopped = true;
        if (typeof data.event.stopPropagation === "function") {
            data.event.stopPropagation();
        }
    },

    /**
     * Stop event bubbling.
     * @returns {void}
     */
    stopImmediatePropagation() {
        const data = pd(this);

        data.stopped = true;
        data.immediateStopped = true;
        if (typeof data.event.stopImmediatePropagation === "function") {
            data.event.stopImmediatePropagation();
        }
    },

    /**
     * The flag to be bubbling.
     * @type {boolean}
     */
    get bubbles() {
        return Boolean(pd(this).event.bubbles)
    },

    /**
     * The flag to be cancelable.
     * @type {boolean}
     */
    get cancelable() {
        return Boolean(pd(this).event.cancelable)
    },

    /**
     * Cancel this event.
     * @returns {void}
     */
    preventDefault() {
        setCancelFlag(pd(this));
    },

    /**
     * The flag to indicate cancellation state.
     * @type {boolean}
     */
    get defaultPrevented() {
        return pd(this).canceled
    },

    /**
     * The flag to be composed.
     * @type {boolean}
     */
    get composed() {
        return Boolean(pd(this).event.composed)
    },

    /**
     * The unix time of this event.
     * @type {number}
     */
    get timeStamp() {
        return pd(this).timeStamp
    },

    /**
     * The target of this event.
     * @type {EventTarget}
     * @deprecated
     */
    get srcElement() {
        return pd(this).eventTarget
    },

    /**
     * The flag to stop event bubbling.
     * @type {boolean}
     * @deprecated
     */
    get cancelBubble() {
        return pd(this).stopped
    },
    set cancelBubble(value) {
        if (!value) {
            return
        }
        const data = pd(this);

        data.stopped = true;
        if (typeof data.event.cancelBubble === "boolean") {
            data.event.cancelBubble = true;
        }
    },

    /**
     * The flag to indicate cancellation state.
     * @type {boolean}
     * @deprecated
     */
    get returnValue() {
        return !pd(this).canceled
    },
    set returnValue(value) {
        if (!value) {
            setCancelFlag(pd(this));
        }
    },

    /**
     * Initialize this event object. But do nothing under event dispatching.
     * @param {string} type The event type.
     * @param {boolean} [bubbles=false] The flag to be possible to bubble up.
     * @param {boolean} [cancelable=false] The flag to be possible to cancel.
     * @deprecated
     */
    initEvent() {
        // Do nothing.
    },
};

// `constructor` is not enumerable.
Object.defineProperty(Event.prototype, "constructor", {
    value: Event,
    configurable: true,
    writable: true,
});

// Ensure `event instanceof window.Event` is `true`.
if (typeof window !== "undefined" && typeof window.Event !== "undefined") {
    Object.setPrototypeOf(Event.prototype, window.Event.prototype);

    // Make association for wrappers.
    wrappers.set(window.Event.prototype, Event);
}

/**
 * Get the property descriptor to redirect a given property.
 * @param {string} key Property name to define property descriptor.
 * @returns {PropertyDescriptor} The property descriptor to redirect the property.
 * @private
 */
function defineRedirectDescriptor(key) {
    return {
        get() {
            return pd(this).event[key]
        },
        set(value) {
            pd(this).event[key] = value;
        },
        configurable: true,
        enumerable: true,
    }
}

/**
 * Get the property descriptor to call a given method property.
 * @param {string} key Property name to define property descriptor.
 * @returns {PropertyDescriptor} The property descriptor to call the method property.
 * @private
 */
function defineCallDescriptor(key) {
    return {
        value() {
            const event = pd(this).event;
            return event[key].apply(event, arguments)
        },
        configurable: true,
        enumerable: true,
    }
}

/**
 * Define new wrapper class.
 * @param {Function} BaseEvent The base wrapper class.
 * @param {Object} proto The prototype of the original event.
 * @returns {Function} The defined wrapper class.
 * @private
 */
function defineWrapper(BaseEvent, proto) {
    const keys = Object.keys(proto);
    if (keys.length === 0) {
        return BaseEvent
    }

    /** CustomEvent */
    function CustomEvent(eventTarget, event) {
        BaseEvent.call(this, eventTarget, event);
    }

    CustomEvent.prototype = Object.create(BaseEvent.prototype, {
        constructor: { value: CustomEvent, configurable: true, writable: true },
    });

    // Define accessors.
    for (let i = 0; i < keys.length; ++i) {
        const key = keys[i];
        if (!(key in BaseEvent.prototype)) {
            const descriptor = Object.getOwnPropertyDescriptor(proto, key);
            const isFunc = typeof descriptor.value === "function";
            Object.defineProperty(
                CustomEvent.prototype,
                key,
                isFunc
                    ? defineCallDescriptor(key)
                    : defineRedirectDescriptor(key)
            );
        }
    }

    return CustomEvent
}

/**
 * Get the wrapper class of a given prototype.
 * @param {Object} proto The prototype of the original event to get its wrapper.
 * @returns {Function} The wrapper class.
 * @private
 */
function getWrapper(proto) {
    if (proto == null || proto === Object.prototype) {
        return Event
    }

    let wrapper = wrappers.get(proto);
    if (wrapper == null) {
        wrapper = defineWrapper(getWrapper(Object.getPrototypeOf(proto)), proto);
        wrappers.set(proto, wrapper);
    }
    return wrapper
}

/**
 * Wrap a given event to management a dispatching.
 * @param {EventTarget} eventTarget The event target of this dispatching.
 * @param {Object} event The event to wrap.
 * @returns {Event} The wrapper instance.
 * @private
 */
function wrapEvent(eventTarget, event) {
    const Wrapper = getWrapper(Object.getPrototypeOf(event));
    return new Wrapper(eventTarget, event)
}

/**
 * Get the immediateStopped flag of a given event.
 * @param {Event} event The event to get.
 * @returns {boolean} The flag to stop propagation immediately.
 * @private
 */
function isStopped(event) {
    return pd(event).immediateStopped
}

/**
 * Set the current event phase of a given event.
 * @param {Event} event The event to set current target.
 * @param {number} eventPhase New event phase.
 * @returns {void}
 * @private
 */
function setEventPhase(event, eventPhase) {
    pd(event).eventPhase = eventPhase;
}

/**
 * Set the current target of a given event.
 * @param {Event} event The event to set current target.
 * @param {EventTarget|null} currentTarget New current target.
 * @returns {void}
 * @private
 */
function setCurrentTarget(event, currentTarget) {
    pd(event).currentTarget = currentTarget;
}

/**
 * Set a passive listener of a given event.
 * @param {Event} event The event to set current target.
 * @param {Function|null} passiveListener New passive listener.
 * @returns {void}
 * @private
 */
function setPassiveListener(event, passiveListener) {
    pd(event).passiveListener = passiveListener;
}

/**
 * @typedef {object} ListenerNode
 * @property {Function} listener
 * @property {1|2|3} listenerType
 * @property {boolean} passive
 * @property {boolean} once
 * @property {ListenerNode|null} next
 * @private
 */

/**
 * @type {WeakMap<object, Map<string, ListenerNode>>}
 * @private
 */
const listenersMap = new WeakMap();

// Listener types
const CAPTURE = 1;
const BUBBLE = 2;
const ATTRIBUTE = 3;

/**
 * Check whether a given value is an object or not.
 * @param {any} x The value to check.
 * @returns {boolean} `true` if the value is an object.
 */
function isObject(x) {
    return x !== null && typeof x === "object" //eslint-disable-line no-restricted-syntax
}

/**
 * Get listeners.
 * @param {EventTarget} eventTarget The event target to get.
 * @returns {Map<string, ListenerNode>} The listeners.
 * @private
 */
function getListeners(eventTarget) {
    const listeners = listenersMap.get(eventTarget);
    if (listeners == null) {
        throw new TypeError(
            "'this' is expected an EventTarget object, but got another value."
        )
    }
    return listeners
}

/**
 * Get the property descriptor for the event attribute of a given event.
 * @param {string} eventName The event name to get property descriptor.
 * @returns {PropertyDescriptor} The property descriptor.
 * @private
 */
function defineEventAttributeDescriptor(eventName) {
    return {
        get() {
            const listeners = getListeners(this);
            let node = listeners.get(eventName);
            while (node != null) {
                if (node.listenerType === ATTRIBUTE) {
                    return node.listener
                }
                node = node.next;
            }
            return null
        },

        set(listener) {
            if (typeof listener !== "function" && !isObject(listener)) {
                listener = null; // eslint-disable-line no-param-reassign
            }
            const listeners = getListeners(this);

            // Traverse to the tail while removing old value.
            let prev = null;
            let node = listeners.get(eventName);
            while (node != null) {
                if (node.listenerType === ATTRIBUTE) {
                    // Remove old value.
                    if (prev !== null) {
                        prev.next = node.next;
                    } else if (node.next !== null) {
                        listeners.set(eventName, node.next);
                    } else {
                        listeners.delete(eventName);
                    }
                } else {
                    prev = node;
                }

                node = node.next;
            }

            // Add new value.
            if (listener !== null) {
                const newNode = {
                    listener,
                    listenerType: ATTRIBUTE,
                    passive: false,
                    once: false,
                    next: null,
                };
                if (prev === null) {
                    listeners.set(eventName, newNode);
                } else {
                    prev.next = newNode;
                }
            }
        },
        configurable: true,
        enumerable: true,
    }
}

/**
 * Define an event attribute (e.g. `eventTarget.onclick`).
 * @param {Object} eventTargetPrototype The event target prototype to define an event attrbite.
 * @param {string} eventName The event name to define.
 * @returns {void}
 */
function defineEventAttribute(eventTargetPrototype, eventName) {
    Object.defineProperty(
        eventTargetPrototype,
        `on${eventName}`,
        defineEventAttributeDescriptor(eventName)
    );
}

/**
 * Define a custom EventTarget with event attributes.
 * @param {string[]} eventNames Event names for event attributes.
 * @returns {EventTarget} The custom EventTarget.
 * @private
 */
function defineCustomEventTarget(eventNames) {
    /** CustomEventTarget */
    function CustomEventTarget() {
        EventTarget.call(this);
    }

    CustomEventTarget.prototype = Object.create(EventTarget.prototype, {
        constructor: {
            value: CustomEventTarget,
            configurable: true,
            writable: true,
        },
    });

    for (let i = 0; i < eventNames.length; ++i) {
        defineEventAttribute(CustomEventTarget.prototype, eventNames[i]);
    }

    return CustomEventTarget
}

/**
 * EventTarget.
 *
 * - This is constructor if no arguments.
 * - This is a function which returns a CustomEventTarget constructor if there are arguments.
 *
 * For example:
 *
 *     class A extends EventTarget {}
 *     class B extends EventTarget("message") {}
 *     class C extends EventTarget("message", "error") {}
 *     class D extends EventTarget(["message", "error"]) {}
 */
function EventTarget() {
    /*eslint-disable consistent-return */
    if (this instanceof EventTarget) {
        listenersMap.set(this, new Map());
        return
    }
    if (arguments.length === 1 && Array.isArray(arguments[0])) {
        return defineCustomEventTarget(arguments[0])
    }
    if (arguments.length > 0) {
        const types = new Array(arguments.length);
        for (let i = 0; i < arguments.length; ++i) {
            types[i] = arguments[i];
        }
        return defineCustomEventTarget(types)
    }
    throw new TypeError("Cannot call a class as a function")
    /*eslint-enable consistent-return */
}

// Should be enumerable, but class methods are not enumerable.
EventTarget.prototype = {
    /**
     * Add a given listener to this event target.
     * @param {string} eventName The event name to add.
     * @param {Function} listener The listener to add.
     * @param {boolean|{capture?:boolean,passive?:boolean,once?:boolean}} [options] The options for this listener.
     * @returns {void}
     */
    addEventListener(eventName, listener, options) {
        if (listener == null) {
            return
        }
        if (typeof listener !== "function" && !isObject(listener)) {
            throw new TypeError("'listener' should be a function or an object.")
        }

        const listeners = getListeners(this);
        const optionsIsObj = isObject(options);
        const capture = optionsIsObj
            ? Boolean(options.capture)
            : Boolean(options);
        const listenerType = capture ? CAPTURE : BUBBLE;
        const newNode = {
            listener,
            listenerType,
            passive: optionsIsObj && Boolean(options.passive),
            once: optionsIsObj && Boolean(options.once),
            next: null,
        };

        // Set it as the first node if the first node is null.
        let node = listeners.get(eventName);
        if (node === undefined) {
            listeners.set(eventName, newNode);
            return
        }

        // Traverse to the tail while checking duplication..
        let prev = null;
        while (node != null) {
            if (
                node.listener === listener &&
                node.listenerType === listenerType
            ) {
                // Should ignore duplication.
                return
            }
            prev = node;
            node = node.next;
        }

        // Add it.
        prev.next = newNode;
    },

    /**
     * Remove a given listener from this event target.
     * @param {string} eventName The event name to remove.
     * @param {Function} listener The listener to remove.
     * @param {boolean|{capture?:boolean,passive?:boolean,once?:boolean}} [options] The options for this listener.
     * @returns {void}
     */
    removeEventListener(eventName, listener, options) {
        if (listener == null) {
            return
        }

        const listeners = getListeners(this);
        const capture = isObject(options)
            ? Boolean(options.capture)
            : Boolean(options);
        const listenerType = capture ? CAPTURE : BUBBLE;

        let prev = null;
        let node = listeners.get(eventName);
        while (node != null) {
            if (
                node.listener === listener &&
                node.listenerType === listenerType
            ) {
                if (prev !== null) {
                    prev.next = node.next;
                } else if (node.next !== null) {
                    listeners.set(eventName, node.next);
                } else {
                    listeners.delete(eventName);
                }
                return
            }

            prev = node;
            node = node.next;
        }
    },

    /**
     * Dispatch a given event.
     * @param {Event|{type:string}} event The event to dispatch.
     * @returns {boolean} `false` if canceled.
     */
    dispatchEvent(event) {
        if (event == null || typeof event.type !== "string") {
            throw new TypeError('"event.type" should be a string.')
        }

        // If listeners aren't registered, terminate.
        const listeners = getListeners(this);
        const eventName = event.type;
        let node = listeners.get(eventName);
        if (node == null) {
            return true
        }

        // Since we cannot rewrite several properties, so wrap object.
        const wrappedEvent = wrapEvent(this, event);

        // This doesn't process capturing phase and bubbling phase.
        // This isn't participating in a tree.
        let prev = null;
        while (node != null) {
            // Remove this listener if it's once
            if (node.once) {
                if (prev !== null) {
                    prev.next = node.next;
                } else if (node.next !== null) {
                    listeners.set(eventName, node.next);
                } else {
                    listeners.delete(eventName);
                }
            } else {
                prev = node;
            }

            // Call this listener
            setPassiveListener(
                wrappedEvent,
                node.passive ? node.listener : null
            );
            if (typeof node.listener === "function") {
                try {
                    node.listener.call(this, wrappedEvent);
                } catch (err) {
                    if (
                        typeof console !== "undefined" &&
                        typeof console.error === "function"
                    ) {
                        console.error(err);
                    }
                }
            } else if (
                node.listenerType !== ATTRIBUTE &&
                typeof node.listener.handleEvent === "function"
            ) {
                node.listener.handleEvent(wrappedEvent);
            }

            // Break if `event.stopImmediatePropagation` was called.
            if (isStopped(wrappedEvent)) {
                break
            }

            node = node.next;
        }
        setPassiveListener(wrappedEvent, null);
        setEventPhase(wrappedEvent, 0);
        setCurrentTarget(wrappedEvent, null);

        return !wrappedEvent.defaultPrevented
    },
};

// `constructor` is not enumerable.
Object.defineProperty(EventTarget.prototype, "constructor", {
    value: EventTarget,
    configurable: true,
    writable: true,
});

// Ensure `eventTarget instanceof window.EventTarget` is `true`.
if (
    typeof window !== "undefined" &&
    typeof window.EventTarget !== "undefined"
) {
    Object.setPrototypeOf(EventTarget.prototype, window.EventTarget.prototype);
}

exports.defineEventAttribute = defineEventAttribute;
exports.EventTarget = EventTarget;
exports.default = EventTarget;

module.exports = EventTarget
module.exports.EventTarget = module.exports.default = EventTarget
module.exports.defineEventAttribute = defineEventAttribute
//# sourceMappingURL=event-target-shim.js.map


/***/ }),
/* 6 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Utils": () => (/* binding */ Utils)
/* harmony export */ });
/* harmony import */ var _symbols__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(7);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

var Utils;
(function (Utils) {
    function walk(node, callback) {
        if (!node) {
            return;
        }
        const stack = [undefined, node]; //parent, node
        while (stack.length > 0) {
            let parent = stack.shift();
            let node = stack.shift();
            if (!node) {
                continue;
            }
            callback(node, parent);
            switch (node._type) {
                case "Compare" /* Compare */:
                    stack.unshift(node.value);
                    stack.unshift(node);
                    break;
                case "Range" /* Range */:
                    stack.unshift(node.close);
                    stack.unshift(node);
                    stack.unshift(node.open);
                    stack.unshift(node);
                    break;
                case "QualifiedValue" /* QualifiedValue */:
                    stack.unshift(node.value);
                    stack.unshift(node);
                    stack.unshift(node.qualifier);
                    stack.unshift(node);
                    break;
                case "VariableDefinition" /* VariableDefinition */:
                    stack.unshift(node.value);
                    stack.unshift(node);
                    stack.unshift(node.name);
                    stack.unshift(node);
                    break;
                case "OrExpression" /* OrExpression */:
                    stack.unshift(node.right);
                    stack.unshift(node);
                    stack.unshift(node.left);
                    stack.unshift(node);
                    break;
                case "LiteralSequence" /* LiteralSequence */:
                case "Query" /* Query */:
                case "QueryDocument" /* QueryDocument */:
                    for (let i = node.nodes.length - 1; i >= 0; i--) {
                        stack.unshift(node.nodes[i]);
                        stack.unshift(node);
                    }
                    break;
            }
        }
    }
    Utils.walk = walk;
    function nodeAt(node, offset, parents) {
        let result;
        Utils.walk(node, node => {
            if (Utils.containsPosition(node, offset)) {
                parents === null || parents === void 0 ? void 0 : parents.push(node);
                result = node;
            }
        });
        return result;
    }
    Utils.nodeAt = nodeAt;
    function containsPosition(node, offset) {
        return node.start <= offset && offset <= node.end;
    }
    Utils.containsPosition = containsPosition;
    function print(node, text, variableValue) {
        function _print(node) {
            var _a;
            switch (node._type) {
                case "Missing" /* Missing */:
                    // no value for those
                    return '';
                case "VariableName" /* VariableName */:
                    // look up variable (must be defined first)
                    return (_a = variableValue(node.value)) !== null && _a !== void 0 ? _a : `${node.value}`;
                case "Any" /* Any */:
                case "Literal" /* Literal */:
                case "Date" /* Date */:
                case "Number" /* Number */:
                    return text.substring(node.start, node.end);
                case "LiteralSequence" /* LiteralSequence */:
                    return node.nodes.map(_print).join(',');
                case "Compare" /* Compare */:
                    // >=aaa etc
                    return `${node.cmp}${_print(node.value)}`;
                case "Range" /* Range */:
                    // aaa..bbb, *..ccc, ccc..*
                    return node.open && node.close
                        ? `${_print(node.open)}..${_print(node.close)}`
                        : node.open ? `${_print(node.open)}..*` : `*..${_print(node.close)}`;
                case "QualifiedValue" /* QualifiedValue */:
                    // aaa:bbb
                    return `${node.not ? '-' : ''}${node.qualifier.value}:${_print(node.value)}`;
                case "Query" /* Query */:
                    // aaa bbb ccc
                    // note: ignores `sortby`-part
                    let result = '';
                    let lastEnd = -1;
                    for (let child of node.nodes) {
                        let value = _print(child);
                        if (value) {
                            result += lastEnd !== -1 && child.start !== lastEnd ? ' ' : '';
                            result += value;
                        }
                        lastEnd = child.end;
                    }
                    return result;
                default:
                    return '???';
            }
        }
        return _print(node);
    }
    Utils.print = print;
    function getTypeOfNode(node, symbols) {
        var _a;
        switch (node._type) {
            case "VariableName" /* VariableName */:
                return (_a = symbols.getFirst(node.value)) === null || _a === void 0 ? void 0 : _a.type;
            case "Date" /* Date */:
                return _symbols__WEBPACK_IMPORTED_MODULE_0__.ValueType.Date;
            case "Number" /* Number */:
                return _symbols__WEBPACK_IMPORTED_MODULE_0__.ValueType.Number;
            case "Literal" /* Literal */:
                return _symbols__WEBPACK_IMPORTED_MODULE_0__.ValueType.Literal;
            case "Compare" /* Compare */:
                return getTypeOfNode(node.value, symbols);
            case "Range" /* Range */:
                if (node.open) {
                    return getTypeOfNode(node.open, symbols);
                }
                else if (node.close) {
                    return getTypeOfNode(node.close, symbols);
                }
        }
        return undefined;
    }
    Utils.getTypeOfNode = getTypeOfNode;
})(Utils || (Utils = {}));


/***/ }),
/* 7 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ValueType": () => (/* binding */ ValueType),
/* harmony export */   "SymbolTable": () => (/* binding */ SymbolTable),
/* harmony export */   "QueryNodeImpliesPullRequestSchema": () => (/* binding */ QueryNodeImpliesPullRequestSchema),
/* harmony export */   "QualifiedValueNodeSchema": () => (/* binding */ QualifiedValueNodeSchema)
/* harmony export */ });
/* harmony import */ var _nodes__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

var ValueType;
(function (ValueType) {
    ValueType["Number"] = "number";
    ValueType["Date"] = "date";
    ValueType["Literal"] = "literal";
})(ValueType || (ValueType = {}));
class SymbolTable {
    constructor() {
        this._clock = new class {
            constructor() {
                this._value = 0;
            }
            tick() { return this._value++; }
        };
        this._data = new Map();
    }
    delete(id) {
        this._data.delete(id);
    }
    update(query) {
        // remove old
        this._data.delete(query.id);
        const getType = (def) => {
            if (def.value._type !== "Query" /* Query */) {
                return;
            }
            if (def.value.nodes.length !== 1) {
                return;
            }
            return _nodes__WEBPACK_IMPORTED_MODULE_0__.Utils.getTypeOfNode(def.value.nodes[0], this);
        };
        // add new - all defined variables
        for (let node of query.nodes) {
            if (node._type === "VariableDefinition" /* VariableDefinition */) {
                let array = this._data.get(query.id);
                if (!array) {
                    array = [];
                    this._data.set(query.id, array);
                }
                array.push({
                    root: query,
                    timestamp: this._clock.tick(),
                    name: node.name.value,
                    def: node,
                    type: getType(node),
                    value: _nodes__WEBPACK_IMPORTED_MODULE_0__.Utils.print(node.value, query.text, name => { var _a; return (_a = this.getFirst(name)) === null || _a === void 0 ? void 0 : _a.value; })
                });
            }
        }
    }
    getFirst(name) {
        let candidate;
        for (let bucket of this._data.values()) {
            for (let info of bucket) {
                if (info.name === name) {
                    if (!candidate || candidate.timestamp < info.timestamp) {
                        candidate = info;
                    }
                }
            }
        }
        return candidate;
    }
    *getAll(name) {
        for (let bucket of this._data.values()) {
            for (let info of bucket) {
                if (info.name === name) {
                    yield info;
                }
            }
        }
    }
    *all() {
        for (let bucket of this._data.values()) {
            for (let info of bucket) {
                yield info;
            }
        }
    }
}
class ValueSet {
    constructor(exclusive, ...entries) {
        this.exclusive = exclusive;
        this.entries = new Set(entries);
    }
}
class QualifiedValueInfo {
    constructor(type, enumValues, placeholderType, repeatable = 0 /* No */, valueSequence, description) {
        this.type = type;
        this.enumValues = enumValues;
        this.placeholderType = placeholderType;
        this.repeatable = repeatable;
        this.valueSequence = valueSequence;
        this.description = description;
    }
    static enum(sets, repeatable, description) {
        return new QualifiedValueInfo(ValueType.Literal, Array.isArray(sets) ? sets : [sets], undefined, repeatable, false, description);
    }
    static placeholder(placeholder, repeatable, valueSequence, description) {
        return new QualifiedValueInfo(ValueType.Literal, undefined, placeholder, repeatable, valueSequence, description);
    }
    static simple(type, description) {
        return new QualifiedValueInfo(type, undefined, undefined, undefined, false, description);
    }
    static username(repeatable, description) {
        return new QualifiedValueInfo(ValueType.Literal, [new ValueSet(true, '@me')], "username" /* Username */, repeatable, false, description);
    }
}
//
const QueryNodeImpliesPullRequestSchema = new Set([
    'status',
    'base',
    'head',
    'draft',
    'review-requested',
    'review',
    'reviewed-by',
    'team-review-requested',
    'merged',
]);
const QualifiedValueNodeSchema = new Map([
    // value sets
    ['archived', QualifiedValueInfo.enum(new ValueSet(true, 'true', 'false'))],
    ['draft', QualifiedValueInfo.enum(new ValueSet(true, 'true', 'false'), undefined, 'Draft pull requests')],
    ['in', QualifiedValueInfo.enum(new ValueSet(true, 'title', 'body', 'comments'), undefined, 'Search in the title, body, comments, or any combination of these')],
    ['is', QualifiedValueInfo.enum([new ValueSet(true, 'locked', 'unlocked'), new ValueSet(true, 'merged', 'unmerged'), new ValueSet(true, 'public', 'private'), new ValueSet(true, 'open', 'closed'), new ValueSet(true, 'pr', 'issue')], 1 /* Repeat */)],
    ['linked', QualifiedValueInfo.enum(new ValueSet(true, 'pr', 'issue'))],
    ['no', QualifiedValueInfo.enum(new ValueSet(false, 'label', 'milestone', 'assignee', 'project'), 1 /* Repeat */)],
    ['review', QualifiedValueInfo.enum(new ValueSet(true, 'none', 'required', 'approved'))],
    ['state', QualifiedValueInfo.enum(new ValueSet(true, 'open', 'closed'), undefined, 'Issues and pull requests based on whether they are open or closed')],
    ['status', QualifiedValueInfo.enum(new ValueSet(true, 'pending', 'success', 'failure'), undefined, 'Pull requests based on the status of the commits')],
    ['type', QualifiedValueInfo.enum(new ValueSet(true, 'pr', 'issue'), undefined, 'Only issues or only pull requests')],
    ['sort', QualifiedValueInfo.enum(new ValueSet(true, 'created-desc', 'created-asc', 'comments-desc', 'comments-asc', 'updated-desc', 'updated-asc', 'reactions-+1-desc', 'reactions--1-desc', 'reactions-smile-desc', 'reactions-tada-desc', 'reactions-thinking_face-desc', 'reactions-heart-desc', 'reactions-rocket-desc', 'reactions-eyes-desc'))],
    // placeholder 
    ['base', QualifiedValueInfo.placeholder("baseBranch" /* BaseBranch */)],
    ['head', QualifiedValueInfo.placeholder("headBranch" /* HeadBranch */)],
    ['label', QualifiedValueInfo.placeholder("label" /* Label */, 1 /* Repeat */, true, 'Issues and pull requests with a certain label')],
    ['language', QualifiedValueInfo.placeholder("language" /* Language */)],
    ['milestone', QualifiedValueInfo.placeholder("milestone" /* Milestone */, undefined, false, 'Issues and pull requests for a certain miletsone')],
    ['org', QualifiedValueInfo.placeholder("orgname" /* Orgname */, 1 /* Repeat */, false, 'Issues and pull requests in all repositories owned by a certain organization')],
    ['project', QualifiedValueInfo.placeholder("projectBoard" /* ProjectBoard */)],
    ['repo', QualifiedValueInfo.placeholder("repository" /* Repository */, 1 /* Repeat */, false, 'Issues and pull requests in a certain repository')],
    ['user', QualifiedValueInfo.username(1 /* Repeat */, 'Issues and pull requests in all repositories owned by a certain user')],
    ['team-review-requested', QualifiedValueInfo.placeholder("teamname" /* Teamname */)],
    ['team', QualifiedValueInfo.placeholder("teamname" /* Teamname */)],
    // placeholder (username)
    ['assignee', QualifiedValueInfo.username(2 /* RepeatNegated */, 'Issues and pull requests that are assigned to a certain user')],
    ['author', QualifiedValueInfo.username(2 /* RepeatNegated */, 'Issues and pull requests created by a certain user')],
    ['commenter', QualifiedValueInfo.username(1 /* Repeat */, 'Issues and pull requests that contain a comment from a certain user')],
    ['mentions', QualifiedValueInfo.username(1 /* Repeat */, 'Issues and pull requests that mention a certain user')],
    ['involves', QualifiedValueInfo.username(1 /* Repeat */, 'Issues and pull requests that in some way involve a user. The involves qualifier is a logical OR between the author, assignee, mentions, and commenter qualifiers for a single user')],
    ['review-requested', QualifiedValueInfo.username(undefined, 'Pull requests where a specific user is requested for review')],
    ['reviewed-by', QualifiedValueInfo.username(undefined, 'Pull requests reviewed by a particular user')],
    // simple value
    ['closed', QualifiedValueInfo.simple(ValueType.Date, 'Issues and pull requests based on when they were closed')],
    ['created', QualifiedValueInfo.simple(ValueType.Date, 'Issues and pull requests based on when they were created')],
    ['merged', QualifiedValueInfo.simple(ValueType.Date, 'Issues and pull requests based on when they were merged')],
    ['pushed', QualifiedValueInfo.simple(ValueType.Date, 'Issues and pull requests based on when they were pushed')],
    ['updated', QualifiedValueInfo.simple(ValueType.Date, 'Issues and pull requests based on when they were updated')],
    ['comments', QualifiedValueInfo.simple(ValueType.Number, 'Issues and pull request by number of comments')],
    ['interactions', QualifiedValueInfo.simple(ValueType.Number, 'Issues and pull request by number of interactions')],
    ['reactions', QualifiedValueInfo.simple(ValueType.Number, 'Issues and pull request by number of reactions')],
    ['size', QualifiedValueInfo.simple(ValueType.Number)],
    ['stars', QualifiedValueInfo.simple(ValueType.Number)],
    ['topics', QualifiedValueInfo.simple(ValueType.Number)],
]);


/***/ }),
/* 8 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "getAllRepos": () => (/* binding */ getAllRepos),
/* harmony export */   "isRunnable": () => (/* binding */ isRunnable),
/* harmony export */   "isUsingAtMe": () => (/* binding */ isUsingAtMe)
/* harmony export */ });
/* harmony import */ var _parser_nodes__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6);
/* harmony import */ var _parser_symbols__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(7);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


function* getAllRepos(project) {
    const repoStrings = [];
    for (let item of project.all()) {
        _parser_nodes__WEBPACK_IMPORTED_MODULE_0__.Utils.walk(item.node, node => {
            var _a;
            // check repo-statement
            if (node._type === "QualifiedValue" /* QualifiedValue */ && node.qualifier.value === 'repo') {
                let value;
                if (node.value._type === "VariableName" /* VariableName */) {
                    // repo:$SOME_VAR
                    value = (_a = project.symbols.getFirst(node.value.value)) === null || _a === void 0 ? void 0 : _a.value;
                }
                else {
                    // repo:some_value
                    value = _parser_nodes__WEBPACK_IMPORTED_MODULE_0__.Utils.print(node.value, item.doc.getText(), () => undefined);
                }
                if (value) {
                    repoStrings.push(value);
                }
            }
        });
    }
    for (let string of repoStrings) {
        let idx = string.indexOf('/');
        if (idx > 0) {
            const owner = string.substring(0, idx);
            const repo = string.substring(idx + 1);
            yield { owner, repo };
        }
    }
}
function isRunnable(query) {
    return query.nodes.some(node => node._type === "Query" /* Query */ || node._type === "OrExpression" /* OrExpression */);
}
function isUsingAtMe(query, project) {
    let result = 0;
    _parser_nodes__WEBPACK_IMPORTED_MODULE_0__.Utils.walk(query, (node, parent) => {
        if (result === 0) {
            if (node._type === "VariableName" /* VariableName */ && (parent === null || parent === void 0 ? void 0 : parent._type) !== "VariableDefinition" /* VariableDefinition */) {
                // check variables
                let symbol = project.symbols.getFirst(node.value);
                if (symbol) {
                    result += 2 * isUsingAtMe(symbol.def, project);
                }
            }
            else if (node._type === "QualifiedValue" /* QualifiedValue */ && node.value._type === "Literal" /* Literal */ && node.value.value === '@me') {
                const info = _parser_symbols__WEBPACK_IMPORTED_MODULE_1__.QualifiedValueNodeSchema.get(node.qualifier.value);
                if ((info === null || info === void 0 ? void 0 : info.placeholderType) === "username" /* Username */) {
                    result = 1;
                }
            }
        }
    });
    return result;
}


/***/ }),
/* 9 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "HoverProvider": () => (/* binding */ HoverProvider),
/* harmony export */   "SelectionRangeProvider": () => (/* binding */ SelectionRangeProvider),
/* harmony export */   "DocumentHighlightProvider": () => (/* binding */ DocumentHighlightProvider),
/* harmony export */   "DefinitionProvider": () => (/* binding */ DefinitionProvider),
/* harmony export */   "ReferenceProvider": () => (/* binding */ ReferenceProvider),
/* harmony export */   "RenameProvider": () => (/* binding */ RenameProvider),
/* harmony export */   "FormattingProvider": () => (/* binding */ FormattingProvider),
/* harmony export */   "DocumentSemanticTokensProvider": () => (/* binding */ DocumentSemanticTokensProvider),
/* harmony export */   "CompletionItemProvider": () => (/* binding */ CompletionItemProvider),
/* harmony export */   "QuickFixProvider": () => (/* binding */ QuickFixProvider),
/* harmony export */   "GithubOrgCompletions": () => (/* binding */ GithubOrgCompletions),
/* harmony export */   "GithubRepoSearchCompletions": () => (/* binding */ GithubRepoSearchCompletions),
/* harmony export */   "GithubPlaceholderCompletions": () => (/* binding */ GithubPlaceholderCompletions),
/* harmony export */   "IProjectValidation": () => (/* binding */ IProjectValidation),
/* harmony export */   "LanguageValidation": () => (/* binding */ LanguageValidation),
/* harmony export */   "GithubValidation": () => (/* binding */ GithubValidation),
/* harmony export */   "Validation": () => (/* binding */ Validation),
/* harmony export */   "registerLanguageProvider": () => (/* binding */ registerLanguageProvider)
/* harmony export */ });
/* harmony import */ var vscode__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var vscode__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(vscode__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _common_emoji__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(10);
/* harmony import */ var _githubDataProvider__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(11);
/* harmony import */ var _parser_nodes__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(6);
/* harmony import */ var _parser_scanner__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(12);
/* harmony import */ var _parser_symbols__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(7);
/* harmony import */ var _parser_validation__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(13);
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(8);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/








const selector = { language: 'github-issues' };
class HoverProvider {
    constructor(container) {
        this.container = container;
    }
    async provideHover(document, position) {
        var _a;
        const offset = document.offsetAt(position);
        const project = this.container.lookupProject(document.uri);
        const query = project.getOrCreate(document);
        const parents = [];
        const node = _parser_nodes__WEBPACK_IMPORTED_MODULE_3__.Utils.nodeAt(query, offset, parents);
        if ((node === null || node === void 0 ? void 0 : node._type) === "VariableName" /* VariableName */) {
            let info;
            for (let candidate of project.symbols.getAll(node.value)) {
                //
                if (!info) {
                    info = candidate;
                    continue;
                }
                if (project.getLocation(info.def).uri.toString() === document.uri.toString()) {
                    if (project.getLocation(candidate.def).uri.toString() !== document.uri.toString()) {
                        break;
                    }
                }
                if (candidate.timestamp > info.timestamp) {
                    info = candidate;
                }
            }
            return new vscode__WEBPACK_IMPORTED_MODULE_0__.Hover(`\`${info === null || info === void 0 ? void 0 : info.value}\`${(info === null || info === void 0 ? void 0 : info.type) ? ` (${info.type})` : ''}`, project.rangeOf(node));
        }
        if ((node === null || node === void 0 ? void 0 : node._type) === "Literal" /* Literal */ && ((_a = parents[parents.length - 2]) === null || _a === void 0 ? void 0 : _a._type) === "QualifiedValue" /* QualifiedValue */) {
            const info = _parser_symbols__WEBPACK_IMPORTED_MODULE_5__.QualifiedValueNodeSchema.get(node.value);
            return (info === null || info === void 0 ? void 0 : info.description) && new vscode__WEBPACK_IMPORTED_MODULE_0__.Hover(info.description) || undefined;
        }
        return undefined;
    }
}
class SelectionRangeProvider {
    constructor(container) {
        this.container = container;
    }
    async provideSelectionRanges(document, positions) {
        const result = [];
        const project = this.container.lookupProject(document.uri);
        const query = project.getOrCreate(document);
        for (let position of positions) {
            const offset = document.offsetAt(position);
            const parents = [];
            if (_parser_nodes__WEBPACK_IMPORTED_MODULE_3__.Utils.nodeAt(query, offset, parents)) {
                let last;
                for (let node of parents) {
                    let selRange = new vscode__WEBPACK_IMPORTED_MODULE_0__.SelectionRange(project.rangeOf(node), last);
                    last = selRange;
                }
                if (last) {
                    result.push(last);
                }
            }
        }
        return result;
    }
}
class DocumentHighlightProvider {
    constructor(container) {
        this.container = container;
    }
    provideDocumentHighlights(document, position) {
        const project = this.container.lookupProject(document.uri);
        const query = project.getOrCreate(document);
        const offset = document.offsetAt(position);
        const node = _parser_nodes__WEBPACK_IMPORTED_MODULE_3__.Utils.nodeAt(query, offset);
        if ((node === null || node === void 0 ? void 0 : node._type) !== "VariableName" /* VariableName */) {
            return;
        }
        const result = [];
        _parser_nodes__WEBPACK_IMPORTED_MODULE_3__.Utils.walk(query, (candidate, parent) => {
            if (candidate._type === "VariableName" /* VariableName */ && candidate.value === node.value) {
                result.push(new vscode__WEBPACK_IMPORTED_MODULE_0__.DocumentHighlight(project.rangeOf(candidate, document.uri), (parent === null || parent === void 0 ? void 0 : parent._type) === "VariableDefinition" /* VariableDefinition */ ? vscode__WEBPACK_IMPORTED_MODULE_0__.DocumentHighlightKind.Write : vscode__WEBPACK_IMPORTED_MODULE_0__.DocumentHighlightKind.Read));
            }
        });
        return Promise.all(result);
    }
}
class DefinitionProvider {
    constructor(container) {
        this.container = container;
    }
    async provideDefinition(document, position) {
        const project = this.container.lookupProject(document.uri);
        const query = project.getOrCreate(document);
        const offset = document.offsetAt(position);
        const node = _parser_nodes__WEBPACK_IMPORTED_MODULE_3__.Utils.nodeAt(query, offset);
        if ((node === null || node === void 0 ? void 0 : node._type) !== "VariableName" /* VariableName */) {
            return;
        }
        const result = [];
        for (const symbol of project.symbols.getAll(node.value)) {
            result.push(project.getLocation(symbol.def));
        }
        return result;
    }
}
class ReferenceProvider {
    constructor(container) {
        this.container = container;
    }
    provideReferences(document, position, context) {
        const project = this.container.lookupProject(document.uri);
        const query = project.getOrCreate(document);
        const offset = document.offsetAt(position);
        const node = _parser_nodes__WEBPACK_IMPORTED_MODULE_3__.Utils.nodeAt(query, offset);
        if ((node === null || node === void 0 ? void 0 : node._type) !== "VariableName" /* VariableName */) {
            return;
        }
        let result = [];
        for (let entry of project.all()) {
            _parser_nodes__WEBPACK_IMPORTED_MODULE_3__.Utils.walk(entry.node, (candidate, parent) => {
                if (candidate._type === "VariableName" /* VariableName */ && candidate.value === node.value) {
                    if (context.includeDeclaration || (parent === null || parent === void 0 ? void 0 : parent._type) !== "VariableDefinition" /* VariableDefinition */) {
                        result.push(new vscode__WEBPACK_IMPORTED_MODULE_0__.Location(entry.doc.uri, project.rangeOf(candidate)));
                    }
                }
            });
        }
        return Promise.all(result);
    }
}
class RenameProvider {
    constructor(container) {
        this.container = container;
    }
    prepareRename(document, position) {
        const project = this.container.lookupProject(document.uri);
        const query = project.getOrCreate(document);
        const offset = document.offsetAt(position);
        const node = _parser_nodes__WEBPACK_IMPORTED_MODULE_3__.Utils.nodeAt(query, offset);
        if ((node === null || node === void 0 ? void 0 : node._type) !== "VariableName" /* VariableName */) {
            throw Error('Only variables names can be renamed');
        }
        return project.rangeOf(node, document.uri);
    }
    async provideRenameEdits(document, position, newName) {
        const project = this.container.lookupProject(document.uri);
        const query = project.getOrCreate(document);
        const offset = document.offsetAt(position);
        const node = _parser_nodes__WEBPACK_IMPORTED_MODULE_3__.Utils.nodeAt(query, offset);
        if ((node === null || node === void 0 ? void 0 : node._type) === "VariableName" /* VariableName */) {
            // rename variable
            if (!newName.startsWith('$')) {
                newName = '$' + newName;
            }
            const scanner = new _parser_scanner__WEBPACK_IMPORTED_MODULE_4__.Scanner().reset(newName);
            if (scanner.next().type !== "VariableName" /* VariableName */ || scanner.next().type !== "EOF" /* EOF */) {
                throw new Error(`invalid name: ${newName}`);
            }
            const edit = new vscode__WEBPACK_IMPORTED_MODULE_0__.WorkspaceEdit();
            for (let entry of project.all()) {
                _parser_nodes__WEBPACK_IMPORTED_MODULE_3__.Utils.walk(entry.node, candidate => {
                    if (candidate._type === "VariableName" /* VariableName */ && candidate.value === node.value) {
                        edit.replace(entry.doc.uri, project.rangeOf(candidate), newName);
                    }
                });
            }
            return edit;
        }
    }
}
class FormattingProvider {
    constructor(container) {
        this.container = container;
    }
    provideOnTypeFormattingEdits(document, position, ch) {
        const project = this.container.lookupProject(document.uri);
        const query = project.getOrCreate(document);
        const nodes = [];
        _parser_nodes__WEBPACK_IMPORTED_MODULE_3__.Utils.nodeAt(query, document.offsetAt(position) - ch.length, nodes);
        const target = nodes.find(node => node._type === "Query" /* Query */ || node._type === "VariableDefinition" /* VariableDefinition */ || node._type === "OrExpression" /* OrExpression */);
        if (target) {
            return this._formatNode(project, query, target);
        }
    }
    provideDocumentRangeFormattingEdits(document, range) {
        const project = this.container.lookupProject(document.uri);
        const query = project.getOrCreate(document);
        // find node starting and ending in range
        let target = query;
        const nodesStart = [];
        const nodesEnd = [];
        _parser_nodes__WEBPACK_IMPORTED_MODULE_3__.Utils.nodeAt(query, document.offsetAt(range.start), nodesStart);
        _parser_nodes__WEBPACK_IMPORTED_MODULE_3__.Utils.nodeAt(query, document.offsetAt(range.end), nodesEnd);
        for (let node of nodesStart) {
            if (nodesEnd.includes(node)) {
                target = node;
                break;
            }
        }
        return this._formatNode(project, query, target);
    }
    _formatNode(project, query, node) {
        // format a single node
        if (node._type !== "QueryDocument" /* QueryDocument */) {
            return [vscode__WEBPACK_IMPORTED_MODULE_0__.TextEdit.replace(project.rangeOf(node), this._printForFormatting(query, node))];
        }
        // format whole document
        let result = [];
        for (let child of node.nodes) {
            const range = project.rangeOf(child);
            const newText = this._printForFormatting(query, child);
            result.push(vscode__WEBPACK_IMPORTED_MODULE_0__.TextEdit.replace(range, newText));
        }
        return result;
    }
    _printForFormatting(query, node) {
        if (node._type === "OrExpression" /* OrExpression */) {
            // special...
            return `${this._printForFormatting(query, node.left)} OR ${this._printForFormatting(query, node.right)}`;
        }
        else if (node._type === "VariableDefinition" /* VariableDefinition */) {
            // special...
            return `${this._printForFormatting(query, node.name)}=${this._printForFormatting(query, node.value)}`;
        }
        else {
            return _parser_nodes__WEBPACK_IMPORTED_MODULE_3__.Utils.print(node, query.text, () => undefined);
        }
    }
}
class DocumentSemanticTokensProvider {
    constructor(container) {
        this.container = container;
    }
    provideDocumentSemanticTokens(document) {
        const project = this.container.lookupProject(document.uri);
        const query = project.getOrCreate(document);
        const builder = new vscode__WEBPACK_IMPORTED_MODULE_0__.SemanticTokensBuilder();
        _parser_nodes__WEBPACK_IMPORTED_MODULE_3__.Utils.walk(query, node => {
            let token;
            if (node._type === "OrExpression" /* OrExpression */) {
                token = node.or;
            }
            if (token) {
                const { line, character } = document.positionAt(token.start);
                builder.push(line, character, token.end - token.start, 0);
            }
        });
        return builder.build();
    }
}
DocumentSemanticTokensProvider.legend = new vscode__WEBPACK_IMPORTED_MODULE_0__.SemanticTokensLegend(['keyword']);
class CompletionItemProvider {
    constructor(container) {
        this.container = container;
    }
    provideCompletionItems(document, position) {
        var _a;
        const project = this.container.lookupProject(document.uri);
        const query = project.getOrCreate(document);
        const offset = document.offsetAt(position);
        const parents = [];
        const node = (_a = _parser_nodes__WEBPACK_IMPORTED_MODULE_3__.Utils.nodeAt(query, offset, parents)) !== null && _a !== void 0 ? _a : query;
        const parent = parents[parents.length - 2];
        if (parent._type === "LiteralSequence" /* LiteralSequence */) {
            return;
        }
        if ((parent === null || parent === void 0 ? void 0 : parent._type) === "QualifiedValue" /* QualifiedValue */ && node._type === "Literal" /* Literal */ && node === parent.value) {
            // RHS of a qualified value => complete value set
            const replacing = project.rangeOf(node);
            const inserting = replacing.with(undefined, position);
            const result = [];
            const info = _parser_symbols__WEBPACK_IMPORTED_MODULE_5__.QualifiedValueNodeSchema.get(parent.qualifier.value);
            if (info === null || info === void 0 ? void 0 : info.enumValues) {
                for (let set of info.enumValues) {
                    for (let value of set.entries) {
                        result.push({
                            label: value,
                            kind: vscode__WEBPACK_IMPORTED_MODULE_0__.CompletionItemKind.EnumMember,
                            range: { inserting, replacing }
                        });
                    }
                }
            }
            return result;
        }
        if ((node === null || node === void 0 ? void 0 : node._type) === "QueryDocument" /* QueryDocument */ || (node === null || node === void 0 ? void 0 : node._type) === "Query" /* Query */ || node._type === "Literal" /* Literal */ || node._type === "VariableName" /* VariableName */) {
            const result = [];
            // names of qualified value node
            for (let [key, value] of _parser_symbols__WEBPACK_IMPORTED_MODULE_5__.QualifiedValueNodeSchema) {
                result.push({
                    label: key,
                    kind: vscode__WEBPACK_IMPORTED_MODULE_0__.CompletionItemKind.Enum,
                    documentation: value.description
                });
            }
            // all variables
            for (let symbol of project.symbols.all()) {
                result.push({
                    label: { label: symbol.name, description: symbol.type ? `${symbol.value} (${symbol.type})` : symbol.value },
                    kind: vscode__WEBPACK_IMPORTED_MODULE_0__.CompletionItemKind.Variable,
                });
            }
            return result;
        }
    }
}
CompletionItemProvider.triggerCharacters = [':', '$'];
class QuickFixProvider {
    provideCodeActions(document, _range, context) {
        const result = [];
        for (let diag of context.diagnostics) {
            if (diag instanceof LanguageValidationDiagnostic && document.version === diag.docVersion && diag.code === "ValueConflict" /* ValueConflict */) {
                const action = new vscode__WEBPACK_IMPORTED_MODULE_0__.CodeAction('Remove This', vscode__WEBPACK_IMPORTED_MODULE_0__.CodeActionKind.QuickFix);
                action.diagnostics = [diag];
                action.edit = new vscode__WEBPACK_IMPORTED_MODULE_0__.WorkspaceEdit();
                action.edit.delete(document.uri, diag.range);
                result.push(action);
            }
            if (diag.code === "GitHubLoginNeeded" /* GitHubLoginNeeded */) {
                const action = new vscode__WEBPACK_IMPORTED_MODULE_0__.CodeAction('Login for @me', vscode__WEBPACK_IMPORTED_MODULE_0__.CodeActionKind.QuickFix);
                action.diagnostics = [diag];
                action.command = { command: 'github-issues.authNow', title: 'Login for @me' };
                result.push(action);
            }
        }
        return result;
    }
}
class GithubOrgCompletions {
    constructor(container, octokitProvider) {
        this.container = container;
        this.octokitProvider = octokitProvider;
    }
    async provideCompletionItems(document, position) {
        var _a;
        const project = this.container.lookupProject(document.uri);
        const doc = project.getOrCreate(document);
        const offset = document.offsetAt(position);
        const parents = [];
        const node = (_a = _parser_nodes__WEBPACK_IMPORTED_MODULE_3__.Utils.nodeAt(doc, offset, parents)) !== null && _a !== void 0 ? _a : doc;
        const qualified = parents[parents.length - 2];
        const query = parents[parents.length - 3];
        if ((query === null || query === void 0 ? void 0 : query._type) !== "Query" /* Query */ || (qualified === null || qualified === void 0 ? void 0 : qualified._type) !== "QualifiedValue" /* QualifiedValue */ || node !== qualified.value) {
            return;
        }
        const inserting = new vscode__WEBPACK_IMPORTED_MODULE_0__.Range(document.positionAt(qualified.value.start), position);
        const replacing = new vscode__WEBPACK_IMPORTED_MODULE_0__.Range(document.positionAt(qualified.value.start), document.positionAt(qualified.value.end));
        const range = { inserting, replacing };
        const octokit = await this.octokitProvider.lib();
        if (!this.octokitProvider.isAuthenticated) {
            return;
        }
        const info = _parser_symbols__WEBPACK_IMPORTED_MODULE_5__.QualifiedValueNodeSchema.get(qualified.qualifier.value);
        if ((info === null || info === void 0 ? void 0 : info.placeholderType) === "orgname" /* Orgname */) {
            const user = await octokit.users.getAuthenticated();
            const options = octokit.orgs.listForUser.endpoint.merge({ username: user.data.login, });
            return octokit.paginate(options).then(values => values.map(value => new vscode__WEBPACK_IMPORTED_MODULE_0__.CompletionItem(value.login)));
        }
        if ((info === null || info === void 0 ? void 0 : info.placeholderType) === "repository" /* Repository */) {
            const response = await octokit.repos.listForAuthenticatedUser({ per_page: 100, sort: 'pushed', affiliation: 'owner,collaborator' });
            return response.data.map(value => { var _a; return ({ label: value.full_name, range, documentation: new vscode__WEBPACK_IMPORTED_MODULE_0__.MarkdownString().appendMarkdown(`${(_a = value.description) !== null && _a !== void 0 ? _a : value.full_name}\n\n${value.html_url}`) }); });
        }
    }
}
GithubOrgCompletions.triggerCharacters = [':'];
class GithubRepoSearchCompletions {
    constructor(container, octokitProvider) {
        this.container = container;
        this.octokitProvider = octokitProvider;
    }
    async provideCompletionItems(document, position) {
        var _a;
        const project = this.container.lookupProject(document.uri);
        const doc = project.getOrCreate(document);
        const offset = document.offsetAt(position);
        const parents = [];
        const node = (_a = _parser_nodes__WEBPACK_IMPORTED_MODULE_3__.Utils.nodeAt(doc, offset, parents)) !== null && _a !== void 0 ? _a : doc;
        const qualified = parents[parents.length - 2];
        const query = parents[parents.length - 3];
        if ((query === null || query === void 0 ? void 0 : query._type) !== "Query" /* Query */ || (qualified === null || qualified === void 0 ? void 0 : qualified._type) !== "QualifiedValue" /* QualifiedValue */ || node !== qualified.value) {
            return;
        }
        const info = _parser_symbols__WEBPACK_IMPORTED_MODULE_5__.QualifiedValueNodeSchema.get(qualified.qualifier.value);
        if ((info === null || info === void 0 ? void 0 : info.placeholderType) !== "repository" /* Repository */) {
            return;
        }
        const inserting = new vscode__WEBPACK_IMPORTED_MODULE_0__.Range(document.positionAt(qualified.value.start), position);
        const replacing = new vscode__WEBPACK_IMPORTED_MODULE_0__.Range(document.positionAt(qualified.value.start), document.positionAt(qualified.value.end));
        const range = { inserting, replacing };
        // craft repo-query
        const len = document.offsetAt(position) - qualified.value.start;
        let q = _parser_nodes__WEBPACK_IMPORTED_MODULE_3__.Utils.print(qualified.value, doc.text, name => { var _a; return (_a = project.symbols.getFirst(name)) === null || _a === void 0 ? void 0 : _a.value; }).substr(0, len);
        if (!q) {
            return new vscode__WEBPACK_IMPORTED_MODULE_0__.CompletionList([], true);
        }
        const idx = q.indexOf('/');
        if (idx > 0) {
            q = `org:${q.substr(0, idx)} ${q.substr(idx + 1)}`;
        }
        const octokit = await this.octokitProvider.lib();
        const repos = await octokit.search.repos({ q, per_page: 10 });
        // create completion items
        const items = repos.data.items.map(item => {
            var _a;
            return {
                label: item.full_name,
                description: new vscode__WEBPACK_IMPORTED_MODULE_0__.MarkdownString().appendMarkdown(`${(_a = item.description) !== null && _a !== void 0 ? _a : item.full_name}\n\n${item.html_url}`),
                range,
            };
        });
        const incomplete = repos.data.total_count > repos.data.items.length;
        const result = new vscode__WEBPACK_IMPORTED_MODULE_0__.CompletionList(items, incomplete);
        return result;
    }
}
GithubRepoSearchCompletions.triggerCharacters = [':', '/'];
class GithubPlaceholderCompletions {
    constructor(container, _githubData) {
        this.container = container;
        this._githubData = _githubData;
    }
    async provideCompletionItems(document, position) {
        var _a;
        const project = this.container.lookupProject(document.uri);
        const doc = project.getOrCreate(document);
        const offset = document.offsetAt(position);
        // node chain at offset
        const parents = [];
        (_a = _parser_nodes__WEBPACK_IMPORTED_MODULE_3__.Utils.nodeAt(doc, offset, parents)) !== null && _a !== void 0 ? _a : doc;
        // find query, qualified, maybe sequence, and literal in the node chain
        let query;
        let qualified;
        let sequence;
        let literal;
        for (const node of parents) {
            switch (node._type) {
                case "Query" /* Query */:
                    query = node;
                    break;
                case "QualifiedValue" /* QualifiedValue */:
                    qualified = node;
                    break;
                case "LiteralSequence" /* LiteralSequence */:
                    sequence = node;
                    break;
                case "Literal" /* Literal */:
                case "Missing" /* Missing */:
                    literal = node;
                    break;
            }
        }
        if (!query || !qualified) {
            return;
        }
        if (!sequence && qualified.value !== literal) {
            // qualif|ier:value
            return;
        }
        const repos = (0,_utils__WEBPACK_IMPORTED_MODULE_7__.getAllRepos)(project);
        const info = _parser_symbols__WEBPACK_IMPORTED_MODULE_5__.QualifiedValueNodeSchema.get(qualified.qualifier.value);
        let range = { inserting: new vscode__WEBPACK_IMPORTED_MODULE_0__.Range(position, position), replacing: new vscode__WEBPACK_IMPORTED_MODULE_0__.Range(position, position) };
        if (literal) {
            const inserting = new vscode__WEBPACK_IMPORTED_MODULE_0__.Range(document.positionAt(literal.start), position);
            const replacing = new vscode__WEBPACK_IMPORTED_MODULE_0__.Range(document.positionAt(literal.start), document.positionAt(literal.end));
            range = { inserting, replacing };
        }
        if ((info === null || info === void 0 ? void 0 : info.placeholderType) === "label" /* Label */ || sequence) {
            return this._completeLabels(repos, literal ? undefined : sequence, range);
        }
        else if ((info === null || info === void 0 ? void 0 : info.placeholderType) === "milestone" /* Milestone */) {
            return this._completeMilestones(repos, range);
        }
        else if ((info === null || info === void 0 ? void 0 : info.placeholderType) === "username" /* Username */) {
            return this._completeUsernames(repos, range);
        }
    }
    async _completeLabels(repos, sequence, range) {
        const result = new Map();
        // label:foo,bar,|
        const isUseInSequence = sequence && new Set(sequence.nodes.map(node => node.value));
        for (let info of repos) {
            const labels = await this._githubData.getOrFetchLabels(info);
            for (const label of labels) {
                if (isUseInSequence === null || isUseInSequence === void 0 ? void 0 : isUseInSequence.has(label.name)) {
                    continue;
                }
                let existing = result.get(label.name);
                if (existing) {
                    existing.detail = undefined;
                    existing.kind = vscode__WEBPACK_IMPORTED_MODULE_0__.CompletionItemKind.Constant;
                    existing.documentation = undefined;
                    existing.sortText = String.fromCharCode(0) + existing.label;
                }
                else {
                    result.set(label.name, {
                        label: { label: (0,_common_emoji__WEBPACK_IMPORTED_MODULE_1__.withEmoji)(label.name), description: label.description },
                        range,
                        kind: vscode__WEBPACK_IMPORTED_MODULE_0__.CompletionItemKind.Color,
                        documentation: `#${label.color}`,
                        insertText: label.name.match(/\s/) ? `"${label.name}"` : undefined,
                        filterText: label.name.match(/\s/) ? `"${label.name}"` : undefined
                    });
                }
            }
        }
        return [...result.values()];
    }
    async _completeMilestones(repos, range) {
        const result = new Map();
        for (let info of repos) {
            const milestones = await this._githubData.getOrFetchMilestones(info);
            for (let milestone of milestones) {
                if (milestone.state === 'closed') {
                    continue;
                }
                let existing = result.get(milestone.title);
                if (existing) {
                    existing.documentation = undefined;
                    existing.sortText = String.fromCharCode(0) + existing.sortText;
                }
                else {
                    result.set(milestone.title, {
                        label: { label: milestone.title, description: milestone.description },
                        range,
                        kind: vscode__WEBPACK_IMPORTED_MODULE_0__.CompletionItemKind.Event,
                        insertText: milestone.title.match(/\s/) ? `"${milestone.title}"` : undefined,
                        filterText: milestone.title.match(/\s/) ? `"${milestone.title}"` : undefined,
                        sortText: milestone.due_on,
                    });
                }
            }
        }
        return [...result.values()];
    }
    async _completeUsernames(repos, range) {
        const result = new Map();
        for (let info of repos) {
            for (let user of await this._githubData.getOrFetchUsers(info)) {
                if (!result.has(user.login)) {
                    result.set(user.login, {
                        label: user.login,
                        kind: vscode__WEBPACK_IMPORTED_MODULE_0__.CompletionItemKind.User,
                        range
                    });
                }
            }
        }
        return [...result.values()];
    }
}
GithubPlaceholderCompletions.triggerCharacters = [':', ','];
class IProjectValidation {
    constructor() {
        this._collections = new Map();
    }
    clearProject(project) {
        let collection = this._collections.get(project);
        if (collection) {
            collection.dispose();
            this._collections.delete(project);
        }
    }
}
class LanguageValidationDiagnostic extends vscode__WEBPACK_IMPORTED_MODULE_0__.Diagnostic {
    constructor(error, project, doc) {
        super(project.rangeOf(error.node), error.message);
        this.error = error;
        this.code = error.code;
        this.docVersion = doc.version;
        if (error.conflictNode) {
            this.relatedInformation = [new vscode__WEBPACK_IMPORTED_MODULE_0__.DiagnosticRelatedInformation(new vscode__WEBPACK_IMPORTED_MODULE_0__.Location(doc.uri, project.rangeOf(error.conflictNode)), project.textOf(error.conflictNode))];
            this.tags = [vscode__WEBPACK_IMPORTED_MODULE_0__.DiagnosticTag.Unnecessary];
        }
        if (error.hint) {
            this.severity = vscode__WEBPACK_IMPORTED_MODULE_0__.DiagnosticSeverity.Information;
        }
    }
}
class LanguageValidation extends IProjectValidation {
    validateProject(project) {
        let collection = this._collections.get(project);
        if (!collection) {
            collection = vscode__WEBPACK_IMPORTED_MODULE_0__.languages.createDiagnosticCollection();
            this._collections.set(project, collection);
        }
        else {
            collection.clear();
        }
        for (let { node, doc } of project.all()) {
            const newDiagnostics = [];
            for (let error of (0,_parser_validation__WEBPACK_IMPORTED_MODULE_6__.validateQueryDocument)(node, project.symbols)) {
                newDiagnostics.push(new LanguageValidationDiagnostic(error, project, doc));
            }
            collection.set(doc.uri, newDiagnostics);
        }
    }
}
class GithubValidation extends IProjectValidation {
    constructor(githubData, octokit) {
        super();
        this.githubData = githubData;
        this.octokit = octokit;
    }
    validateProject(project, token) {
        let collection = this._collections.get(project);
        if (!collection) {
            collection = vscode__WEBPACK_IMPORTED_MODULE_0__.languages.createDiagnosticCollection();
            this._collections.set(project, collection);
        }
        else {
            collection.clear();
        }
        const repos = Array.from((0,_utils__WEBPACK_IMPORTED_MODULE_7__.getAllRepos)(project));
        if (repos.length === 0) {
            return;
        }
        for (let { node: queryDoc, doc } of project.all()) {
            const newDiagnostics = [];
            const work = [];
            _parser_nodes__WEBPACK_IMPORTED_MODULE_3__.Utils.walk(queryDoc, async (node, parent) => {
                if ((parent === null || parent === void 0 ? void 0 : parent._type) !== "Query" /* Query */ || node._type !== "QualifiedValue" /* QualifiedValue */ || node.value._type === "Missing" /* Missing */) {
                    return;
                }
                const info = _parser_symbols__WEBPACK_IMPORTED_MODULE_5__.QualifiedValueNodeSchema.get(node.qualifier.value);
                const validateValue = async (valueNode) => {
                    const value = _parser_nodes__WEBPACK_IMPORTED_MODULE_3__.Utils.print(valueNode, queryDoc.text, name => { var _a; return (_a = project.symbols.getFirst(name)) === null || _a === void 0 ? void 0 : _a.value; }).replace(/^"(.*)"$/, '$1');
                    if ((info === null || info === void 0 ? void 0 : info.placeholderType) === "label" /* Label */) {
                        work.push(this._checkLabels(value, repos).then(missing => {
                            if (missing.length === repos.length) {
                                const diag = new vscode__WEBPACK_IMPORTED_MODULE_0__.Diagnostic(project.rangeOf(valueNode), `Label '${value}' is unknown`, vscode__WEBPACK_IMPORTED_MODULE_0__.DiagnosticSeverity.Warning);
                                newDiagnostics.push(diag);
                            }
                            else if (missing.length > 0) {
                                const diag = new vscode__WEBPACK_IMPORTED_MODULE_0__.Diagnostic(project.rangeOf(valueNode), `Label '${value}' is unknown in these repositories: ${missing.map(info => `${info.owner}/${info.repo}`).join(', ')}`, vscode__WEBPACK_IMPORTED_MODULE_0__.DiagnosticSeverity.Hint);
                                newDiagnostics.push(diag);
                            }
                        }));
                    }
                    else if ((info === null || info === void 0 ? void 0 : info.placeholderType) === "milestone" /* Milestone */) {
                        work.push(this._checkMilestones(value, repos).then(missing => {
                            if (missing.length === repos.length) {
                                const diag = new vscode__WEBPACK_IMPORTED_MODULE_0__.Diagnostic(project.rangeOf(valueNode), `Milestone '${value}' is unknown`, vscode__WEBPACK_IMPORTED_MODULE_0__.DiagnosticSeverity.Warning);
                                newDiagnostics.push(diag);
                            }
                            else if (missing.length > 0) {
                                const diag = new vscode__WEBPACK_IMPORTED_MODULE_0__.Diagnostic(project.rangeOf(valueNode), `Milestone '${value}' is unknown in these repositories: ${missing.map(info => `${info.owner}/${info.repo}`).join(', ')}`, vscode__WEBPACK_IMPORTED_MODULE_0__.DiagnosticSeverity.Hint);
                                newDiagnostics.push(diag);
                            }
                        }));
                    }
                    else if ((info === null || info === void 0 ? void 0 : info.placeholderType) === "username" /* Username */) {
                        if (value === '@me') {
                            work.push(this.octokit.lib().then(() => {
                                if (!this.octokit.isAuthenticated) {
                                    const diag = new vscode__WEBPACK_IMPORTED_MODULE_0__.Diagnostic(project.rangeOf(valueNode), `@me requires that you are logged in`, vscode__WEBPACK_IMPORTED_MODULE_0__.DiagnosticSeverity.Warning);
                                    diag.code = "GitHubLoginNeeded" /* GitHubLoginNeeded */;
                                    newDiagnostics.push(diag);
                                }
                            }));
                        }
                    }
                };
                if (node.value._type === "LiteralSequence" /* LiteralSequence */) {
                    node.value.nodes.forEach(validateValue);
                }
                else {
                    validateValue(node.value);
                }
            });
            Promise.all(work).then(() => {
                if (token.isCancellationRequested) {
                    return;
                }
                let collection = this._collections.get(project);
                if (collection && project.has(doc)) {
                    // project or document might have been dismissed already
                    collection.set(doc.uri, newDiagnostics);
                }
            });
        }
    }
    async _checkLabels(label, repos) {
        let result = [];
        for (const info of repos) {
            const labels = await this.githubData.getOrFetchLabels(info);
            const found = labels.find(info => info.name === label);
            if (!found) {
                result.push(info);
            }
        }
        return result;
    }
    async _checkMilestones(milestone, repos) {
        let result = [];
        for (let info of repos) {
            const labels = await this.githubData.getOrFetchMilestones(info);
            const found = labels.find(info => info.title === milestone);
            if (!found) {
                result.push(info);
            }
        }
        return result;
    }
}
class Validation {
    constructor(container, octokit, validation) {
        this.container = container;
        this.octokit = octokit;
        this.validation = validation;
        this._disposables = [];
        let cts = new vscode__WEBPACK_IMPORTED_MODULE_0__.CancellationTokenSource();
        function validateAllSoon(delay = 300) {
            cts.cancel();
            cts = new vscode__WEBPACK_IMPORTED_MODULE_0__.CancellationTokenSource();
            let handle = setTimeout(() => {
                for (let project of container.all()) {
                    for (let strategy of validation) {
                        strategy.validateProject(project, cts.token);
                    }
                }
            }, delay);
            cts.token.onCancellationRequested(() => clearTimeout(handle));
        }
        validateAllSoon();
        this._disposables.push(vscode__WEBPACK_IMPORTED_MODULE_0__.workspace.onDidChangeTextDocument(e => {
            if (vscode__WEBPACK_IMPORTED_MODULE_0__.languages.match(selector, e.document)) {
                validateAllSoon(500);
            }
        }));
        this._disposables.push(vscode__WEBPACK_IMPORTED_MODULE_0__.authentication.onDidChangeSessions(e => {
            if (e.provider.id === 'github') {
                validateAllSoon();
            }
        }));
        this._disposables.push(container.onDidChange(() => {
            validateAllSoon();
        }));
        this._disposables.push(container.onDidRemove(project => {
            for (let strategy of validation) {
                strategy.clearProject(project);
            }
        }));
        this._disposables.push(octokit.onDidChange(() => {
            validateAllSoon();
        }));
    }
    dispose() {
        this._disposables.forEach(d => d.dispose());
    }
}
function registerLanguageProvider(container, octokit) {
    const disposables = [];
    const githubData = new _githubDataProvider__WEBPACK_IMPORTED_MODULE_2__.GithubData(octokit);
    vscode__WEBPACK_IMPORTED_MODULE_0__.languages.setLanguageConfiguration(selector.language, {
        wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
        comments: { lineComment: '//' }
    });
    disposables.push(vscode__WEBPACK_IMPORTED_MODULE_0__.languages.registerHoverProvider(selector, new HoverProvider(container)));
    disposables.push(vscode__WEBPACK_IMPORTED_MODULE_0__.languages.registerSelectionRangeProvider(selector, new SelectionRangeProvider(container)));
    disposables.push(vscode__WEBPACK_IMPORTED_MODULE_0__.languages.registerDocumentHighlightProvider(selector, new DocumentHighlightProvider(container)));
    disposables.push(vscode__WEBPACK_IMPORTED_MODULE_0__.languages.registerDefinitionProvider(selector, new DefinitionProvider(container)));
    disposables.push(vscode__WEBPACK_IMPORTED_MODULE_0__.languages.registerReferenceProvider(selector, new ReferenceProvider(container)));
    disposables.push(vscode__WEBPACK_IMPORTED_MODULE_0__.languages.registerRenameProvider(selector, new RenameProvider(container)));
    disposables.push(vscode__WEBPACK_IMPORTED_MODULE_0__.languages.registerCodeActionsProvider(selector, new QuickFixProvider(), { providedCodeActionKinds: [vscode__WEBPACK_IMPORTED_MODULE_0__.CodeActionKind.QuickFix] }));
    disposables.push(vscode__WEBPACK_IMPORTED_MODULE_0__.languages.registerDocumentSemanticTokensProvider(selector, new DocumentSemanticTokensProvider(container), DocumentSemanticTokensProvider.legend));
    disposables.push(vscode__WEBPACK_IMPORTED_MODULE_0__.languages.registerDocumentRangeFormattingEditProvider(selector, new FormattingProvider(container)));
    disposables.push(vscode__WEBPACK_IMPORTED_MODULE_0__.languages.registerOnTypeFormattingEditProvider(selector, new FormattingProvider(container), '\n'));
    disposables.push(vscode__WEBPACK_IMPORTED_MODULE_0__.languages.registerCompletionItemProvider(selector, new CompletionItemProvider(container), ...CompletionItemProvider.triggerCharacters));
    disposables.push(vscode__WEBPACK_IMPORTED_MODULE_0__.languages.registerCompletionItemProvider(selector, new GithubOrgCompletions(container, octokit), ...GithubOrgCompletions.triggerCharacters));
    disposables.push(vscode__WEBPACK_IMPORTED_MODULE_0__.languages.registerCompletionItemProvider(selector, new GithubRepoSearchCompletions(container, octokit), ...GithubRepoSearchCompletions.triggerCharacters));
    disposables.push(vscode__WEBPACK_IMPORTED_MODULE_0__.languages.registerCompletionItemProvider(selector, new GithubPlaceholderCompletions(container, githubData), ...GithubPlaceholderCompletions.triggerCharacters));
    disposables.push(new Validation(container, octokit, [
        new LanguageValidation(),
        new GithubValidation(githubData, octokit)
    ]));
    return vscode__WEBPACK_IMPORTED_MODULE_0__.Disposable.from(...disposables);
}


/***/ }),
/* 10 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.withEmoji = void 0;
const _emojiMap = JSON.parse(`{
  "100": "💯",
  "1234": "🔢",
  "grinning": "😀",
  "smiley": "😃",
  "smile": "😄",
  "grin": "😁",
  "laughing": "😆",
  "satisfied": "😆",
  "sweat_smile": "😅",
  "rofl": "🤣",
  "joy": "😂",
  "slightly_smiling_face": "🙂",
  "upside_down_face": "🙃",
  "wink": "😉",
  "blush": "😊",
  "innocent": "😇",
  "smiling_face_with_three_hearts": "🥰",
  "heart_eyes": "😍",
  "star_struck": "🤩",
  "kissing_heart": "😘",
  "kissing": "😗",
  "relaxed": "☺️",
  "kissing_closed_eyes": "😚",
  "kissing_smiling_eyes": "😙",
  "smiling_face_with_tear": "🥲",
  "yum": "😋",
  "stuck_out_tongue": "😛",
  "stuck_out_tongue_winking_eye": "😜",
  "zany_face": "🤪",
  "stuck_out_tongue_closed_eyes": "😝",
  "money_mouth_face": "🤑",
  "hugs": "🤗",
  "hand_over_mouth": "🤭",
  "shushing_face": "🤫",
  "thinking": "🤔",
  "zipper_mouth_face": "🤐",
  "raised_eyebrow": "🤨",
  "neutral_face": "😐",
  "expressionless": "😑",
  "no_mouth": "😶",
  "smirk": "😏",
  "unamused": "😒",
  "roll_eyes": "🙄",
  "grimacing": "😬",
  "lying_face": "🤥",
  "relieved": "😌",
  "pensive": "😔",
  "sleepy": "😪",
  "drooling_face": "🤤",
  "sleeping": "😴",
  "mask": "😷",
  "face_with_thermometer": "🤒",
  "face_with_head_bandage": "🤕",
  "nauseated_face": "🤢",
  "vomiting_face": "🤮",
  "sneezing_face": "🤧",
  "hot_face": "🥵",
  "cold_face": "🥶",
  "woozy_face": "🥴",
  "dizzy_face": "😵",
  "exploding_head": "🤯",
  "cowboy_hat_face": "🤠",
  "partying_face": "🥳",
  "disguised_face": "🥸",
  "sunglasses": "😎",
  "nerd_face": "🤓",
  "monocle_face": "🧐",
  "confused": "😕",
  "worried": "😟",
  "slightly_frowning_face": "🙁",
  "frowning_face": "☹️",
  "open_mouth": "😮",
  "hushed": "😯",
  "astonished": "😲",
  "flushed": "😳",
  "pleading_face": "🥺",
  "frowning": "😦",
  "anguished": "😧",
  "fearful": "😨",
  "cold_sweat": "😰",
  "disappointed_relieved": "😥",
  "cry": "😢",
  "sob": "😭",
  "scream": "😱",
  "confounded": "😖",
  "persevere": "😣",
  "disappointed": "😞",
  "sweat": "😓",
  "weary": "😩",
  "tired_face": "😫",
  "yawning_face": "🥱",
  "triumph": "😤",
  "rage": "😡",
  "pout": "😡",
  "angry": "😠",
  "cursing_face": "🤬",
  "smiling_imp": "😈",
  "imp": "👿",
  "skull": "💀",
  "skull_and_crossbones": "☠️",
  "hankey": "💩",
  "poop": "💩",
  "shit": "💩",
  "clown_face": "🤡",
  "japanese_ogre": "👹",
  "japanese_goblin": "👺",
  "ghost": "👻",
  "alien": "👽",
  "space_invader": "👾",
  "robot": "🤖",
  "smiley_cat": "😺",
  "smile_cat": "😸",
  "joy_cat": "😹",
  "heart_eyes_cat": "😻",
  "smirk_cat": "😼",
  "kissing_cat": "😽",
  "scream_cat": "🙀",
  "crying_cat_face": "😿",
  "pouting_cat": "😾",
  "see_no_evil": "🙈",
  "hear_no_evil": "🙉",
  "speak_no_evil": "🙊",
  "kiss": "💋",
  "love_letter": "💌",
  "cupid": "💘",
  "gift_heart": "💝",
  "sparkling_heart": "💖",
  "heartpulse": "💗",
  "heartbeat": "💓",
  "revolving_hearts": "💞",
  "two_hearts": "💕",
  "heart_decoration": "💟",
  "heavy_heart_exclamation": "❣️",
  "broken_heart": "💔",
  "heart": "❤️",
  "orange_heart": "🧡",
  "yellow_heart": "💛",
  "green_heart": "💚",
  "blue_heart": "💙",
  "purple_heart": "💜",
  "brown_heart": "🤎",
  "black_heart": "🖤",
  "white_heart": "🤍",
  "anger": "💢",
  "boom": "💥",
  "collision": "💥",
  "dizzy": "💫",
  "sweat_drops": "💦",
  "dash": "💨",
  "hole": "🕳️",
  "bomb": "💣",
  "speech_balloon": "💬",
  "eye_speech_bubble": "👁️‍🗨️",
  "left_speech_bubble": "🗨️",
  "right_anger_bubble": "🗯️",
  "thought_balloon": "💭",
  "zzz": "💤",
  "wave": "👋",
  "raised_back_of_hand": "🤚",
  "raised_hand_with_fingers_splayed": "🖐️",
  "hand": "✋",
  "raised_hand": "✋",
  "vulcan_salute": "🖖",
  "ok_hand": "👌",
  "pinched_fingers": "🤌",
  "pinching_hand": "🤏",
  "v": "✌️",
  "crossed_fingers": "🤞",
  "love_you_gesture": "🤟",
  "metal": "🤘",
  "call_me_hand": "🤙",
  "point_left": "👈",
  "point_right": "👉",
  "point_up_2": "👆",
  "middle_finger": "🖕",
  "fu": "🖕",
  "point_down": "👇",
  "point_up": "☝️",
  "+1": "👍",
  "thumbsup": "👍",
  "-1": "👎",
  "thumbsdown": "👎",
  "fist_raised": "✊",
  "fist": "✊",
  "fist_oncoming": "👊",
  "facepunch": "👊",
  "punch": "👊",
  "fist_left": "🤛",
  "fist_right": "🤜",
  "clap": "👏",
  "raised_hands": "🙌",
  "open_hands": "👐",
  "palms_up_together": "🤲",
  "handshake": "🤝",
  "pray": "🙏",
  "writing_hand": "✍️",
  "nail_care": "💅",
  "selfie": "🤳",
  "muscle": "💪",
  "mechanical_arm": "🦾",
  "mechanical_leg": "🦿",
  "leg": "🦵",
  "foot": "🦶",
  "ear": "👂",
  "ear_with_hearing_aid": "🦻",
  "nose": "👃",
  "brain": "🧠",
  "anatomical_heart": "🫀",
  "lungs": "🫁",
  "tooth": "🦷",
  "bone": "🦴",
  "eyes": "👀",
  "eye": "👁️",
  "tongue": "👅",
  "lips": "👄",
  "baby": "👶",
  "child": "🧒",
  "boy": "👦",
  "girl": "👧",
  "adult": "🧑",
  "blond_haired_person": "👱",
  "man": "👨",
  "bearded_person": "🧔",
  "red_haired_man": "👨‍🦰",
  "curly_haired_man": "👨‍🦱",
  "white_haired_man": "👨‍🦳",
  "bald_man": "👨‍🦲",
  "woman": "👩",
  "red_haired_woman": "👩‍🦰",
  "person_red_hair": "🧑‍🦰",
  "curly_haired_woman": "👩‍🦱",
  "person_curly_hair": "🧑‍🦱",
  "white_haired_woman": "👩‍🦳",
  "person_white_hair": "🧑‍🦳",
  "bald_woman": "👩‍🦲",
  "person_bald": "🧑‍🦲",
  "blond_haired_woman": "👱‍♀️",
  "blonde_woman": "👱‍♀️",
  "blond_haired_man": "👱‍♂️",
  "older_adult": "🧓",
  "older_man": "👴",
  "older_woman": "👵",
  "frowning_person": "🙍",
  "frowning_man": "🙍‍♂️",
  "frowning_woman": "🙍‍♀️",
  "pouting_face": "🙎",
  "pouting_man": "🙎‍♂️",
  "pouting_woman": "🙎‍♀️",
  "no_good": "🙅",
  "no_good_man": "🙅‍♂️",
  "ng_man": "🙅‍♂️",
  "no_good_woman": "🙅‍♀️",
  "ng_woman": "🙅‍♀️",
  "ok_person": "🙆",
  "ok_man": "🙆‍♂️",
  "ok_woman": "🙆‍♀️",
  "tipping_hand_person": "💁",
  "information_desk_person": "💁",
  "tipping_hand_man": "💁‍♂️",
  "sassy_man": "💁‍♂️",
  "tipping_hand_woman": "💁‍♀️",
  "sassy_woman": "💁‍♀️",
  "raising_hand": "🙋",
  "raising_hand_man": "🙋‍♂️",
  "raising_hand_woman": "🙋‍♀️",
  "deaf_person": "🧏",
  "deaf_man": "🧏‍♂️",
  "deaf_woman": "🧏‍♀️",
  "bow": "🙇",
  "bowing_man": "🙇‍♂️",
  "bowing_woman": "🙇‍♀️",
  "facepalm": "🤦",
  "man_facepalming": "🤦‍♂️",
  "woman_facepalming": "🤦‍♀️",
  "shrug": "🤷",
  "man_shrugging": "🤷‍♂️",
  "woman_shrugging": "🤷‍♀️",
  "health_worker": "🧑‍⚕️",
  "man_health_worker": "👨‍⚕️",
  "woman_health_worker": "👩‍⚕️",
  "student": "🧑‍🎓",
  "man_student": "👨‍🎓",
  "woman_student": "👩‍🎓",
  "teacher": "🧑‍🏫",
  "man_teacher": "👨‍🏫",
  "woman_teacher": "👩‍🏫",
  "judge": "🧑‍⚖️",
  "man_judge": "👨‍⚖️",
  "woman_judge": "👩‍⚖️",
  "farmer": "🧑‍🌾",
  "man_farmer": "👨‍🌾",
  "woman_farmer": "👩‍🌾",
  "cook": "🧑‍🍳",
  "man_cook": "👨‍🍳",
  "woman_cook": "👩‍🍳",
  "mechanic": "🧑‍🔧",
  "man_mechanic": "👨‍🔧",
  "woman_mechanic": "👩‍🔧",
  "factory_worker": "🧑‍🏭",
  "man_factory_worker": "👨‍🏭",
  "woman_factory_worker": "👩‍🏭",
  "office_worker": "🧑‍💼",
  "man_office_worker": "👨‍💼",
  "woman_office_worker": "👩‍💼",
  "scientist": "🧑‍🔬",
  "man_scientist": "👨‍🔬",
  "woman_scientist": "👩‍🔬",
  "technologist": "🧑‍💻",
  "man_technologist": "👨‍💻",
  "woman_technologist": "👩‍💻",
  "singer": "🧑‍🎤",
  "man_singer": "👨‍🎤",
  "woman_singer": "👩‍🎤",
  "artist": "🧑‍🎨",
  "man_artist": "👨‍🎨",
  "woman_artist": "👩‍🎨",
  "pilot": "🧑‍✈️",
  "man_pilot": "👨‍✈️",
  "woman_pilot": "👩‍✈️",
  "astronaut": "🧑‍🚀",
  "man_astronaut": "👨‍🚀",
  "woman_astronaut": "👩‍🚀",
  "firefighter": "🧑‍🚒",
  "man_firefighter": "👨‍🚒",
  "woman_firefighter": "👩‍🚒",
  "police_officer": "👮",
  "cop": "👮",
  "policeman": "👮‍♂️",
  "policewoman": "👮‍♀️",
  "detective": "🕵️",
  "male_detective": "🕵️‍♂️",
  "female_detective": "🕵️‍♀️",
  "guard": "💂",
  "guardsman": "💂‍♂️",
  "guardswoman": "💂‍♀️",
  "ninja": "🥷",
  "construction_worker": "👷",
  "construction_worker_man": "👷‍♂️",
  "construction_worker_woman": "👷‍♀️",
  "prince": "🤴",
  "princess": "👸",
  "person_with_turban": "👳",
  "man_with_turban": "👳‍♂️",
  "woman_with_turban": "👳‍♀️",
  "man_with_gua_pi_mao": "👲",
  "woman_with_headscarf": "🧕",
  "person_in_tuxedo": "🤵",
  "man_in_tuxedo": "🤵‍♂️",
  "woman_in_tuxedo": "🤵‍♀️",
  "person_with_veil": "👰",
  "man_with_veil": "👰‍♂️",
  "woman_with_veil": "👰‍♀️",
  "bride_with_veil": "👰‍♀️",
  "pregnant_woman": "🤰",
  "breast_feeding": "🤱",
  "woman_feeding_baby": "👩‍🍼",
  "man_feeding_baby": "👨‍🍼",
  "person_feeding_baby": "🧑‍🍼",
  "angel": "👼",
  "santa": "🎅",
  "mrs_claus": "🤶",
  "mx_claus": "🧑‍🎄",
  "superhero": "🦸",
  "superhero_man": "🦸‍♂️",
  "superhero_woman": "🦸‍♀️",
  "supervillain": "🦹",
  "supervillain_man": "🦹‍♂️",
  "supervillain_woman": "🦹‍♀️",
  "mage": "🧙",
  "mage_man": "🧙‍♂️",
  "mage_woman": "🧙‍♀️",
  "fairy": "🧚",
  "fairy_man": "🧚‍♂️",
  "fairy_woman": "🧚‍♀️",
  "vampire": "🧛",
  "vampire_man": "🧛‍♂️",
  "vampire_woman": "🧛‍♀️",
  "merperson": "🧜",
  "merman": "🧜‍♂️",
  "mermaid": "🧜‍♀️",
  "elf": "🧝",
  "elf_man": "🧝‍♂️",
  "elf_woman": "🧝‍♀️",
  "genie": "🧞",
  "genie_man": "🧞‍♂️",
  "genie_woman": "🧞‍♀️",
  "zombie": "🧟",
  "zombie_man": "🧟‍♂️",
  "zombie_woman": "🧟‍♀️",
  "massage": "💆",
  "massage_man": "💆‍♂️",
  "massage_woman": "💆‍♀️",
  "haircut": "💇",
  "haircut_man": "💇‍♂️",
  "haircut_woman": "💇‍♀️",
  "walking": "🚶",
  "walking_man": "🚶‍♂️",
  "walking_woman": "🚶‍♀️",
  "standing_person": "🧍",
  "standing_man": "🧍‍♂️",
  "standing_woman": "🧍‍♀️",
  "kneeling_person": "🧎",
  "kneeling_man": "🧎‍♂️",
  "kneeling_woman": "🧎‍♀️",
  "person_with_probing_cane": "🧑‍🦯",
  "man_with_probing_cane": "👨‍🦯",
  "woman_with_probing_cane": "👩‍🦯",
  "person_in_motorized_wheelchair": "🧑‍🦼",
  "man_in_motorized_wheelchair": "👨‍🦼",
  "woman_in_motorized_wheelchair": "👩‍🦼",
  "person_in_manual_wheelchair": "🧑‍🦽",
  "man_in_manual_wheelchair": "👨‍🦽",
  "woman_in_manual_wheelchair": "👩‍🦽",
  "runner": "🏃",
  "running": "🏃",
  "running_man": "🏃‍♂️",
  "running_woman": "🏃‍♀️",
  "woman_dancing": "💃",
  "dancer": "💃",
  "man_dancing": "🕺",
  "business_suit_levitating": "🕴️",
  "dancers": "👯",
  "dancing_men": "👯‍♂️",
  "dancing_women": "👯‍♀️",
  "sauna_person": "🧖",
  "sauna_man": "🧖‍♂️",
  "sauna_woman": "🧖‍♀️",
  "climbing": "🧗",
  "climbing_man": "🧗‍♂️",
  "climbing_woman": "🧗‍♀️",
  "person_fencing": "🤺",
  "horse_racing": "🏇",
  "skier": "⛷️",
  "snowboarder": "🏂",
  "golfing": "🏌️",
  "golfing_man": "🏌️‍♂️",
  "golfing_woman": "🏌️‍♀️",
  "surfer": "🏄",
  "surfing_man": "🏄‍♂️",
  "surfing_woman": "🏄‍♀️",
  "rowboat": "🚣",
  "rowing_man": "🚣‍♂️",
  "rowing_woman": "🚣‍♀️",
  "swimmer": "🏊",
  "swimming_man": "🏊‍♂️",
  "swimming_woman": "🏊‍♀️",
  "bouncing_ball_person": "⛹️",
  "bouncing_ball_man": "⛹️‍♂️",
  "basketball_man": "⛹️‍♂️",
  "bouncing_ball_woman": "⛹️‍♀️",
  "basketball_woman": "⛹️‍♀️",
  "weight_lifting": "🏋️",
  "weight_lifting_man": "🏋️‍♂️",
  "weight_lifting_woman": "🏋️‍♀️",
  "bicyclist": "🚴",
  "biking_man": "🚴‍♂️",
  "biking_woman": "🚴‍♀️",
  "mountain_bicyclist": "🚵",
  "mountain_biking_man": "🚵‍♂️",
  "mountain_biking_woman": "🚵‍♀️",
  "cartwheeling": "🤸",
  "man_cartwheeling": "🤸‍♂️",
  "woman_cartwheeling": "🤸‍♀️",
  "wrestling": "🤼",
  "men_wrestling": "🤼‍♂️",
  "women_wrestling": "🤼‍♀️",
  "water_polo": "🤽",
  "man_playing_water_polo": "🤽‍♂️",
  "woman_playing_water_polo": "🤽‍♀️",
  "handball_person": "🤾",
  "man_playing_handball": "🤾‍♂️",
  "woman_playing_handball": "🤾‍♀️",
  "juggling_person": "🤹",
  "man_juggling": "🤹‍♂️",
  "woman_juggling": "🤹‍♀️",
  "lotus_position": "🧘",
  "lotus_position_man": "🧘‍♂️",
  "lotus_position_woman": "🧘‍♀️",
  "bath": "🛀",
  "sleeping_bed": "🛌",
  "people_holding_hands": "🧑‍🤝‍🧑",
  "two_women_holding_hands": "👭",
  "couple": "👫",
  "two_men_holding_hands": "👬",
  "couplekiss": "💏",
  "couplekiss_man_woman": "👩‍❤️‍💋‍👨",
  "couplekiss_man_man": "👨‍❤️‍💋‍👨",
  "couplekiss_woman_woman": "👩‍❤️‍💋‍👩",
  "couple_with_heart": "💑",
  "couple_with_heart_woman_man": "👩‍❤️‍👨",
  "couple_with_heart_man_man": "👨‍❤️‍👨",
  "couple_with_heart_woman_woman": "👩‍❤️‍👩",
  "family": "👪",
  "family_man_woman_boy": "👨‍👩‍👦",
  "family_man_woman_girl": "👨‍👩‍👧",
  "family_man_woman_girl_boy": "👨‍👩‍👧‍👦",
  "family_man_woman_boy_boy": "👨‍👩‍👦‍👦",
  "family_man_woman_girl_girl": "👨‍👩‍👧‍👧",
  "family_man_man_boy": "👨‍👨‍👦",
  "family_man_man_girl": "👨‍👨‍👧",
  "family_man_man_girl_boy": "👨‍👨‍👧‍👦",
  "family_man_man_boy_boy": "👨‍👨‍👦‍👦",
  "family_man_man_girl_girl": "👨‍👨‍👧‍👧",
  "family_woman_woman_boy": "👩‍👩‍👦",
  "family_woman_woman_girl": "👩‍👩‍👧",
  "family_woman_woman_girl_boy": "👩‍👩‍👧‍👦",
  "family_woman_woman_boy_boy": "👩‍👩‍👦‍👦",
  "family_woman_woman_girl_girl": "👩‍👩‍👧‍👧",
  "family_man_boy": "👨‍👦",
  "family_man_boy_boy": "👨‍👦‍👦",
  "family_man_girl": "👨‍👧",
  "family_man_girl_boy": "👨‍👧‍👦",
  "family_man_girl_girl": "👨‍👧‍👧",
  "family_woman_boy": "👩‍👦",
  "family_woman_boy_boy": "👩‍👦‍👦",
  "family_woman_girl": "👩‍👧",
  "family_woman_girl_boy": "👩‍👧‍👦",
  "family_woman_girl_girl": "👩‍👧‍👧",
  "speaking_head": "🗣️",
  "bust_in_silhouette": "👤",
  "busts_in_silhouette": "👥",
  "people_hugging": "🫂",
  "footprints": "👣",
  "monkey_face": "🐵",
  "monkey": "🐒",
  "gorilla": "🦍",
  "orangutan": "🦧",
  "dog": "🐶",
  "dog2": "🐕",
  "guide_dog": "🦮",
  "service_dog": "🐕‍🦺",
  "poodle": "🐩",
  "wolf": "🐺",
  "fox_face": "🦊",
  "raccoon": "🦝",
  "cat": "🐱",
  "cat2": "🐈",
  "black_cat": "🐈‍⬛",
  "lion": "🦁",
  "tiger": "🐯",
  "tiger2": "🐅",
  "leopard": "🐆",
  "horse": "🐴",
  "racehorse": "🐎",
  "unicorn": "🦄",
  "zebra": "🦓",
  "deer": "🦌",
  "bison": "🦬",
  "cow": "🐮",
  "ox": "🐂",
  "water_buffalo": "🐃",
  "cow2": "🐄",
  "pig": "🐷",
  "pig2": "🐖",
  "boar": "🐗",
  "pig_nose": "🐽",
  "ram": "🐏",
  "sheep": "🐑",
  "goat": "🐐",
  "dromedary_camel": "🐪",
  "camel": "🐫",
  "llama": "🦙",
  "giraffe": "🦒",
  "elephant": "🐘",
  "mammoth": "🦣",
  "rhinoceros": "🦏",
  "hippopotamus": "🦛",
  "mouse": "🐭",
  "mouse2": "🐁",
  "rat": "🐀",
  "hamster": "🐹",
  "rabbit": "🐰",
  "rabbit2": "🐇",
  "chipmunk": "🐿️",
  "beaver": "🦫",
  "hedgehog": "🦔",
  "bat": "🦇",
  "bear": "🐻",
  "polar_bear": "🐻‍❄️",
  "koala": "🐨",
  "panda_face": "🐼",
  "sloth": "🦥",
  "otter": "🦦",
  "skunk": "🦨",
  "kangaroo": "🦘",
  "badger": "🦡",
  "feet": "🐾",
  "paw_prints": "🐾",
  "turkey": "🦃",
  "chicken": "🐔",
  "rooster": "🐓",
  "hatching_chick": "🐣",
  "baby_chick": "🐤",
  "hatched_chick": "🐥",
  "bird": "🐦",
  "penguin": "🐧",
  "dove": "🕊️",
  "eagle": "🦅",
  "duck": "🦆",
  "swan": "🦢",
  "owl": "🦉",
  "dodo": "🦤",
  "feather": "🪶",
  "flamingo": "🦩",
  "peacock": "🦚",
  "parrot": "🦜",
  "frog": "🐸",
  "crocodile": "🐊",
  "turtle": "🐢",
  "lizard": "🦎",
  "snake": "🐍",
  "dragon_face": "🐲",
  "dragon": "🐉",
  "sauropod": "🦕",
  "t-rex": "🦖",
  "whale": "🐳",
  "whale2": "🐋",
  "dolphin": "🐬",
  "flipper": "🐬",
  "seal": "🦭",
  "fish": "🐟",
  "tropical_fish": "🐠",
  "blowfish": "🐡",
  "shark": "🦈",
  "octopus": "🐙",
  "shell": "🐚",
  "snail": "🐌",
  "butterfly": "🦋",
  "bug": "🐛",
  "ant": "🐜",
  "bee": "🐝",
  "honeybee": "🐝",
  "beetle": "🪲",
  "lady_beetle": "🐞",
  "cricket": "🦗",
  "cockroach": "🪳",
  "spider": "🕷️",
  "spider_web": "🕸️",
  "scorpion": "🦂",
  "mosquito": "🦟",
  "fly": "🪰",
  "worm": "🪱",
  "microbe": "🦠",
  "bouquet": "💐",
  "cherry_blossom": "🌸",
  "white_flower": "💮",
  "rosette": "🏵️",
  "rose": "🌹",
  "wilted_flower": "🥀",
  "hibiscus": "🌺",
  "sunflower": "🌻",
  "blossom": "🌼",
  "tulip": "🌷",
  "seedling": "🌱",
  "potted_plant": "🪴",
  "evergreen_tree": "🌲",
  "deciduous_tree": "🌳",
  "palm_tree": "🌴",
  "cactus": "🌵",
  "ear_of_rice": "🌾",
  "herb": "🌿",
  "shamrock": "☘️",
  "four_leaf_clover": "🍀",
  "maple_leaf": "🍁",
  "fallen_leaf": "🍂",
  "leaves": "🍃",
  "grapes": "🍇",
  "melon": "🍈",
  "watermelon": "🍉",
  "tangerine": "🍊",
  "orange": "🍊",
  "mandarin": "🍊",
  "lemon": "🍋",
  "banana": "🍌",
  "pineapple": "🍍",
  "mango": "🥭",
  "apple": "🍎",
  "green_apple": "🍏",
  "pear": "🍐",
  "peach": "🍑",
  "cherries": "🍒",
  "strawberry": "🍓",
  "blueberries": "🫐",
  "kiwi_fruit": "🥝",
  "tomato": "🍅",
  "olive": "🫒",
  "coconut": "🥥",
  "avocado": "🥑",
  "eggplant": "🍆",
  "potato": "🥔",
  "carrot": "🥕",
  "corn": "🌽",
  "hot_pepper": "🌶️",
  "bell_pepper": "🫑",
  "cucumber": "🥒",
  "leafy_green": "🥬",
  "broccoli": "🥦",
  "garlic": "🧄",
  "onion": "🧅",
  "mushroom": "🍄",
  "peanuts": "🥜",
  "chestnut": "🌰",
  "bread": "🍞",
  "croissant": "🥐",
  "baguette_bread": "🥖",
  "flatbread": "🫓",
  "pretzel": "🥨",
  "bagel": "🥯",
  "pancakes": "🥞",
  "waffle": "🧇",
  "cheese": "🧀",
  "meat_on_bone": "🍖",
  "poultry_leg": "🍗",
  "cut_of_meat": "🥩",
  "bacon": "🥓",
  "hamburger": "🍔",
  "fries": "🍟",
  "pizza": "🍕",
  "hotdog": "🌭",
  "sandwich": "🥪",
  "taco": "🌮",
  "burrito": "🌯",
  "tamale": "🫔",
  "stuffed_flatbread": "🥙",
  "falafel": "🧆",
  "egg": "🥚",
  "fried_egg": "🍳",
  "shallow_pan_of_food": "🥘",
  "stew": "🍲",
  "fondue": "🫕",
  "bowl_with_spoon": "🥣",
  "green_salad": "🥗",
  "popcorn": "🍿",
  "butter": "🧈",
  "salt": "🧂",
  "canned_food": "🥫",
  "bento": "🍱",
  "rice_cracker": "🍘",
  "rice_ball": "🍙",
  "rice": "🍚",
  "curry": "🍛",
  "ramen": "🍜",
  "spaghetti": "🍝",
  "sweet_potato": "🍠",
  "oden": "🍢",
  "sushi": "🍣",
  "fried_shrimp": "🍤",
  "fish_cake": "🍥",
  "moon_cake": "🥮",
  "dango": "🍡",
  "dumpling": "🥟",
  "fortune_cookie": "🥠",
  "takeout_box": "🥡",
  "crab": "🦀",
  "lobster": "🦞",
  "shrimp": "🦐",
  "squid": "🦑",
  "oyster": "🦪",
  "icecream": "🍦",
  "shaved_ice": "🍧",
  "ice_cream": "🍨",
  "doughnut": "🍩",
  "cookie": "🍪",
  "birthday": "🎂",
  "cake": "🍰",
  "cupcake": "🧁",
  "pie": "🥧",
  "chocolate_bar": "🍫",
  "candy": "🍬",
  "lollipop": "🍭",
  "custard": "🍮",
  "honey_pot": "🍯",
  "baby_bottle": "🍼",
  "milk_glass": "🥛",
  "coffee": "☕",
  "teapot": "🫖",
  "tea": "🍵",
  "sake": "🍶",
  "champagne": "🍾",
  "wine_glass": "🍷",
  "cocktail": "🍸",
  "tropical_drink": "🍹",
  "beer": "🍺",
  "beers": "🍻",
  "clinking_glasses": "🥂",
  "tumbler_glass": "🥃",
  "cup_with_straw": "🥤",
  "bubble_tea": "🧋",
  "beverage_box": "🧃",
  "mate": "🧉",
  "ice_cube": "🧊",
  "chopsticks": "🥢",
  "plate_with_cutlery": "🍽️",
  "fork_and_knife": "🍴",
  "spoon": "🥄",
  "hocho": "🔪",
  "knife": "🔪",
  "amphora": "🏺",
  "earth_africa": "🌍",
  "earth_americas": "🌎",
  "earth_asia": "🌏",
  "globe_with_meridians": "🌐",
  "world_map": "🗺️",
  "japan": "🗾",
  "compass": "🧭",
  "mountain_snow": "🏔️",
  "mountain": "⛰️",
  "volcano": "🌋",
  "mount_fuji": "🗻",
  "camping": "🏕️",
  "beach_umbrella": "🏖️",
  "desert": "🏜️",
  "desert_island": "🏝️",
  "national_park": "🏞️",
  "stadium": "🏟️",
  "classical_building": "🏛️",
  "building_construction": "🏗️",
  "bricks": "🧱",
  "rock": "🪨",
  "wood": "🪵",
  "hut": "🛖",
  "houses": "🏘️",
  "derelict_house": "🏚️",
  "house": "🏠",
  "house_with_garden": "🏡",
  "office": "🏢",
  "post_office": "🏣",
  "european_post_office": "🏤",
  "hospital": "🏥",
  "bank": "🏦",
  "hotel": "🏨",
  "love_hotel": "🏩",
  "convenience_store": "🏪",
  "school": "🏫",
  "department_store": "🏬",
  "factory": "🏭",
  "japanese_castle": "🏯",
  "european_castle": "🏰",
  "wedding": "💒",
  "tokyo_tower": "🗼",
  "statue_of_liberty": "🗽",
  "church": "⛪",
  "mosque": "🕌",
  "hindu_temple": "🛕",
  "synagogue": "🕍",
  "shinto_shrine": "⛩️",
  "kaaba": "🕋",
  "fountain": "⛲",
  "tent": "⛺",
  "foggy": "🌁",
  "night_with_stars": "🌃",
  "cityscape": "🏙️",
  "sunrise_over_mountains": "🌄",
  "sunrise": "🌅",
  "city_sunset": "🌆",
  "city_sunrise": "🌇",
  "bridge_at_night": "🌉",
  "hotsprings": "♨️",
  "carousel_horse": "🎠",
  "ferris_wheel": "🎡",
  "roller_coaster": "🎢",
  "barber": "💈",
  "circus_tent": "🎪",
  "steam_locomotive": "🚂",
  "railway_car": "🚃",
  "bullettrain_side": "🚄",
  "bullettrain_front": "🚅",
  "train2": "🚆",
  "metro": "🚇",
  "light_rail": "🚈",
  "station": "🚉",
  "tram": "🚊",
  "monorail": "🚝",
  "mountain_railway": "🚞",
  "train": "🚋",
  "bus": "🚌",
  "oncoming_bus": "🚍",
  "trolleybus": "🚎",
  "minibus": "🚐",
  "ambulance": "🚑",
  "fire_engine": "🚒",
  "police_car": "🚓",
  "oncoming_police_car": "🚔",
  "taxi": "🚕",
  "oncoming_taxi": "🚖",
  "car": "🚗",
  "red_car": "🚗",
  "oncoming_automobile": "🚘",
  "blue_car": "🚙",
  "pickup_truck": "🛻",
  "truck": "🚚",
  "articulated_lorry": "🚛",
  "tractor": "🚜",
  "racing_car": "🏎️",
  "motorcycle": "🏍️",
  "motor_scooter": "🛵",
  "manual_wheelchair": "🦽",
  "motorized_wheelchair": "🦼",
  "auto_rickshaw": "🛺",
  "bike": "🚲",
  "kick_scooter": "🛴",
  "skateboard": "🛹",
  "roller_skate": "🛼",
  "busstop": "🚏",
  "motorway": "🛣️",
  "railway_track": "🛤️",
  "oil_drum": "🛢️",
  "fuelpump": "⛽",
  "rotating_light": "🚨",
  "traffic_light": "🚥",
  "vertical_traffic_light": "🚦",
  "stop_sign": "🛑",
  "construction": "🚧",
  "anchor": "⚓",
  "boat": "⛵",
  "sailboat": "⛵",
  "canoe": "🛶",
  "speedboat": "🚤",
  "passenger_ship": "🛳️",
  "ferry": "⛴️",
  "motor_boat": "🛥️",
  "ship": "🚢",
  "airplane": "✈️",
  "small_airplane": "🛩️",
  "flight_departure": "🛫",
  "flight_arrival": "🛬",
  "parachute": "🪂",
  "seat": "💺",
  "helicopter": "🚁",
  "suspension_railway": "🚟",
  "mountain_cableway": "🚠",
  "aerial_tramway": "🚡",
  "artificial_satellite": "🛰️",
  "rocket": "🚀",
  "flying_saucer": "🛸",
  "bellhop_bell": "🛎️",
  "luggage": "🧳",
  "hourglass": "⌛",
  "hourglass_flowing_sand": "⏳",
  "watch": "⌚",
  "alarm_clock": "⏰",
  "stopwatch": "⏱️",
  "timer_clock": "⏲️",
  "mantelpiece_clock": "🕰️",
  "clock12": "🕛",
  "clock1230": "🕧",
  "clock1": "🕐",
  "clock130": "🕜",
  "clock2": "🕑",
  "clock230": "🕝",
  "clock3": "🕒",
  "clock330": "🕞",
  "clock4": "🕓",
  "clock430": "🕟",
  "clock5": "🕔",
  "clock530": "🕠",
  "clock6": "🕕",
  "clock630": "🕡",
  "clock7": "🕖",
  "clock730": "🕢",
  "clock8": "🕗",
  "clock830": "🕣",
  "clock9": "🕘",
  "clock930": "🕤",
  "clock10": "🕙",
  "clock1030": "🕥",
  "clock11": "🕚",
  "clock1130": "🕦",
  "new_moon": "🌑",
  "waxing_crescent_moon": "🌒",
  "first_quarter_moon": "🌓",
  "moon": "🌔",
  "waxing_gibbous_moon": "🌔",
  "full_moon": "🌕",
  "waning_gibbous_moon": "🌖",
  "last_quarter_moon": "🌗",
  "waning_crescent_moon": "🌘",
  "crescent_moon": "🌙",
  "new_moon_with_face": "🌚",
  "first_quarter_moon_with_face": "🌛",
  "last_quarter_moon_with_face": "🌜",
  "thermometer": "🌡️",
  "sunny": "☀️",
  "full_moon_with_face": "🌝",
  "sun_with_face": "🌞",
  "ringed_planet": "🪐",
  "star": "⭐",
  "star2": "🌟",
  "stars": "🌠",
  "milky_way": "🌌",
  "cloud": "☁️",
  "partly_sunny": "⛅",
  "cloud_with_lightning_and_rain": "⛈️",
  "sun_behind_small_cloud": "🌤️",
  "sun_behind_large_cloud": "🌥️",
  "sun_behind_rain_cloud": "🌦️",
  "cloud_with_rain": "🌧️",
  "cloud_with_snow": "🌨️",
  "cloud_with_lightning": "🌩️",
  "tornado": "🌪️",
  "fog": "🌫️",
  "wind_face": "🌬️",
  "cyclone": "🌀",
  "rainbow": "🌈",
  "closed_umbrella": "🌂",
  "open_umbrella": "☂️",
  "umbrella": "☔",
  "parasol_on_ground": "⛱️",
  "zap": "⚡",
  "snowflake": "❄️",
  "snowman_with_snow": "☃️",
  "snowman": "⛄",
  "comet": "☄️",
  "fire": "🔥",
  "droplet": "💧",
  "ocean": "🌊",
  "jack_o_lantern": "🎃",
  "christmas_tree": "🎄",
  "fireworks": "🎆",
  "sparkler": "🎇",
  "firecracker": "🧨",
  "sparkles": "✨",
  "balloon": "🎈",
  "tada": "🎉",
  "confetti_ball": "🎊",
  "tanabata_tree": "🎋",
  "bamboo": "🎍",
  "dolls": "🎎",
  "flags": "🎏",
  "wind_chime": "🎐",
  "rice_scene": "🎑",
  "red_envelope": "🧧",
  "ribbon": "🎀",
  "gift": "🎁",
  "reminder_ribbon": "🎗️",
  "tickets": "🎟️",
  "ticket": "🎫",
  "medal_military": "🎖️",
  "trophy": "🏆",
  "medal_sports": "🏅",
  "1st_place_medal": "🥇",
  "2nd_place_medal": "🥈",
  "3rd_place_medal": "🥉",
  "soccer": "⚽",
  "baseball": "⚾",
  "softball": "🥎",
  "basketball": "🏀",
  "volleyball": "🏐",
  "football": "🏈",
  "rugby_football": "🏉",
  "tennis": "🎾",
  "flying_disc": "🥏",
  "bowling": "🎳",
  "cricket_game": "🏏",
  "field_hockey": "🏑",
  "ice_hockey": "🏒",
  "lacrosse": "🥍",
  "ping_pong": "🏓",
  "badminton": "🏸",
  "boxing_glove": "🥊",
  "martial_arts_uniform": "🥋",
  "goal_net": "🥅",
  "golf": "⛳",
  "ice_skate": "⛸️",
  "fishing_pole_and_fish": "🎣",
  "diving_mask": "🤿",
  "running_shirt_with_sash": "🎽",
  "ski": "🎿",
  "sled": "🛷",
  "curling_stone": "🥌",
  "dart": "🎯",
  "yo_yo": "🪀",
  "kite": "🪁",
  "8ball": "🎱",
  "crystal_ball": "🔮",
  "magic_wand": "🪄",
  "nazar_amulet": "🧿",
  "video_game": "🎮",
  "joystick": "🕹️",
  "slot_machine": "🎰",
  "game_die": "🎲",
  "jigsaw": "🧩",
  "teddy_bear": "🧸",
  "pinata": "🪅",
  "nesting_dolls": "🪆",
  "spades": "♠️",
  "hearts": "♥️",
  "diamonds": "♦️",
  "clubs": "♣️",
  "chess_pawn": "♟️",
  "black_joker": "🃏",
  "mahjong": "🀄",
  "flower_playing_cards": "🎴",
  "performing_arts": "🎭",
  "framed_picture": "🖼️",
  "art": "🎨",
  "thread": "🧵",
  "sewing_needle": "🪡",
  "yarn": "🧶",
  "knot": "🪢",
  "eyeglasses": "👓",
  "dark_sunglasses": "🕶️",
  "goggles": "🥽",
  "lab_coat": "🥼",
  "safety_vest": "🦺",
  "necktie": "👔",
  "shirt": "👕",
  "tshirt": "👕",
  "jeans": "👖",
  "scarf": "🧣",
  "gloves": "🧤",
  "coat": "🧥",
  "socks": "🧦",
  "dress": "👗",
  "kimono": "👘",
  "sari": "🥻",
  "one_piece_swimsuit": "🩱",
  "swim_brief": "🩲",
  "shorts": "🩳",
  "bikini": "👙",
  "womans_clothes": "👚",
  "purse": "👛",
  "handbag": "👜",
  "pouch": "👝",
  "shopping": "🛍️",
  "school_satchel": "🎒",
  "thong_sandal": "🩴",
  "mans_shoe": "👞",
  "shoe": "👞",
  "athletic_shoe": "👟",
  "hiking_boot": "🥾",
  "flat_shoe": "🥿",
  "high_heel": "👠",
  "sandal": "👡",
  "ballet_shoes": "🩰",
  "boot": "👢",
  "crown": "👑",
  "womans_hat": "👒",
  "tophat": "🎩",
  "mortar_board": "🎓",
  "billed_cap": "🧢",
  "military_helmet": "🪖",
  "rescue_worker_helmet": "⛑️",
  "prayer_beads": "📿",
  "lipstick": "💄",
  "ring": "💍",
  "gem": "💎",
  "mute": "🔇",
  "speaker": "🔈",
  "sound": "🔉",
  "loud_sound": "🔊",
  "loudspeaker": "📢",
  "mega": "📣",
  "postal_horn": "📯",
  "bell": "🔔",
  "no_bell": "🔕",
  "musical_score": "🎼",
  "musical_note": "🎵",
  "notes": "🎶",
  "studio_microphone": "🎙️",
  "level_slider": "🎚️",
  "control_knobs": "🎛️",
  "microphone": "🎤",
  "headphones": "🎧",
  "radio": "📻",
  "saxophone": "🎷",
  "accordion": "🪗",
  "guitar": "🎸",
  "musical_keyboard": "🎹",
  "trumpet": "🎺",
  "violin": "🎻",
  "banjo": "🪕",
  "drum": "🥁",
  "long_drum": "🪘",
  "iphone": "📱",
  "calling": "📲",
  "phone": "☎️",
  "telephone": "☎️",
  "telephone_receiver": "📞",
  "pager": "📟",
  "fax": "📠",
  "battery": "🔋",
  "electric_plug": "🔌",
  "computer": "💻",
  "desktop_computer": "🖥️",
  "printer": "🖨️",
  "keyboard": "⌨️",
  "computer_mouse": "🖱️",
  "trackball": "🖲️",
  "minidisc": "💽",
  "floppy_disk": "💾",
  "cd": "💿",
  "dvd": "📀",
  "abacus": "🧮",
  "movie_camera": "🎥",
  "film_strip": "🎞️",
  "film_projector": "📽️",
  "clapper": "🎬",
  "tv": "📺",
  "camera": "📷",
  "camera_flash": "📸",
  "video_camera": "📹",
  "vhs": "📼",
  "mag": "🔍",
  "mag_right": "🔎",
  "candle": "🕯️",
  "bulb": "💡",
  "flashlight": "🔦",
  "izakaya_lantern": "🏮",
  "lantern": "🏮",
  "diya_lamp": "🪔",
  "notebook_with_decorative_cover": "📔",
  "closed_book": "📕",
  "book": "📖",
  "open_book": "📖",
  "green_book": "📗",
  "blue_book": "📘",
  "orange_book": "📙",
  "books": "📚",
  "notebook": "📓",
  "ledger": "📒",
  "page_with_curl": "📃",
  "scroll": "📜",
  "page_facing_up": "📄",
  "newspaper": "📰",
  "newspaper_roll": "🗞️",
  "bookmark_tabs": "📑",
  "bookmark": "🔖",
  "label": "🏷️",
  "moneybag": "💰",
  "coin": "🪙",
  "yen": "💴",
  "dollar": "💵",
  "euro": "💶",
  "pound": "💷",
  "money_with_wings": "💸",
  "credit_card": "💳",
  "receipt": "🧾",
  "chart": "💹",
  "envelope": "✉️",
  "email": "📧",
  "e-mail": "📧",
  "incoming_envelope": "📨",
  "envelope_with_arrow": "📩",
  "outbox_tray": "📤",
  "inbox_tray": "📥",
  "package": "📦",
  "mailbox": "📫",
  "mailbox_closed": "📪",
  "mailbox_with_mail": "📬",
  "mailbox_with_no_mail": "📭",
  "postbox": "📮",
  "ballot_box": "🗳️",
  "pencil2": "✏️",
  "black_nib": "✒️",
  "fountain_pen": "🖋️",
  "pen": "🖊️",
  "paintbrush": "🖌️",
  "crayon": "🖍️",
  "memo": "📝",
  "pencil": "📝",
  "briefcase": "💼",
  "file_folder": "📁",
  "open_file_folder": "📂",
  "card_index_dividers": "🗂️",
  "date": "📅",
  "calendar": "📆",
  "spiral_notepad": "🗒️",
  "spiral_calendar": "🗓️",
  "card_index": "📇",
  "chart_with_upwards_trend": "📈",
  "chart_with_downwards_trend": "📉",
  "bar_chart": "📊",
  "clipboard": "📋",
  "pushpin": "📌",
  "round_pushpin": "📍",
  "paperclip": "📎",
  "paperclips": "🖇️",
  "straight_ruler": "📏",
  "triangular_ruler": "📐",
  "scissors": "✂️",
  "card_file_box": "🗃️",
  "file_cabinet": "🗄️",
  "wastebasket": "🗑️",
  "lock": "🔒",
  "unlock": "🔓",
  "lock_with_ink_pen": "🔏",
  "closed_lock_with_key": "🔐",
  "key": "🔑",
  "old_key": "🗝️",
  "hammer": "🔨",
  "axe": "🪓",
  "pick": "⛏️",
  "hammer_and_pick": "⚒️",
  "hammer_and_wrench": "🛠️",
  "dagger": "🗡️",
  "crossed_swords": "⚔️",
  "gun": "🔫",
  "boomerang": "🪃",
  "bow_and_arrow": "🏹",
  "shield": "🛡️",
  "carpentry_saw": "🪚",
  "wrench": "🔧",
  "screwdriver": "🪛",
  "nut_and_bolt": "🔩",
  "gear": "⚙️",
  "clamp": "🗜️",
  "balance_scale": "⚖️",
  "probing_cane": "🦯",
  "link": "🔗",
  "chains": "⛓️",
  "hook": "🪝",
  "toolbox": "🧰",
  "magnet": "🧲",
  "ladder": "🪜",
  "alembic": "⚗️",
  "test_tube": "🧪",
  "petri_dish": "🧫",
  "dna": "🧬",
  "microscope": "🔬",
  "telescope": "🔭",
  "satellite": "📡",
  "syringe": "💉",
  "drop_of_blood": "🩸",
  "pill": "💊",
  "adhesive_bandage": "🩹",
  "stethoscope": "🩺",
  "door": "🚪",
  "elevator": "🛗",
  "mirror": "🪞",
  "window": "🪟",
  "bed": "🛏️",
  "couch_and_lamp": "🛋️",
  "chair": "🪑",
  "toilet": "🚽",
  "plunger": "🪠",
  "shower": "🚿",
  "bathtub": "🛁",
  "mouse_trap": "🪤",
  "razor": "🪒",
  "lotion_bottle": "🧴",
  "safety_pin": "🧷",
  "broom": "🧹",
  "basket": "🧺",
  "roll_of_paper": "🧻",
  "bucket": "🪣",
  "soap": "🧼",
  "toothbrush": "🪥",
  "sponge": "🧽",
  "fire_extinguisher": "🧯",
  "shopping_cart": "🛒",
  "smoking": "🚬",
  "coffin": "⚰️",
  "headstone": "🪦",
  "funeral_urn": "⚱️",
  "moyai": "🗿",
  "placard": "🪧",
  "atm": "🏧",
  "put_litter_in_its_place": "🚮",
  "potable_water": "🚰",
  "wheelchair": "♿",
  "mens": "🚹",
  "womens": "🚺",
  "restroom": "🚻",
  "baby_symbol": "🚼",
  "wc": "🚾",
  "passport_control": "🛂",
  "customs": "🛃",
  "baggage_claim": "🛄",
  "left_luggage": "🛅",
  "warning": "⚠️",
  "children_crossing": "🚸",
  "no_entry": "⛔",
  "no_entry_sign": "🚫",
  "no_bicycles": "🚳",
  "no_smoking": "🚭",
  "do_not_litter": "🚯",
  "non-potable_water": "🚱",
  "no_pedestrians": "🚷",
  "no_mobile_phones": "📵",
  "underage": "🔞",
  "radioactive": "☢️",
  "biohazard": "☣️",
  "arrow_up": "⬆️",
  "arrow_upper_right": "↗️",
  "arrow_right": "➡️",
  "arrow_lower_right": "↘️",
  "arrow_down": "⬇️",
  "arrow_lower_left": "↙️",
  "arrow_left": "⬅️",
  "arrow_upper_left": "↖️",
  "arrow_up_down": "↕️",
  "left_right_arrow": "↔️",
  "leftwards_arrow_with_hook": "↩️",
  "arrow_right_hook": "↪️",
  "arrow_heading_up": "⤴️",
  "arrow_heading_down": "⤵️",
  "arrows_clockwise": "🔃",
  "arrows_counterclockwise": "🔄",
  "back": "🔙",
  "end": "🔚",
  "on": "🔛",
  "soon": "🔜",
  "top": "🔝",
  "place_of_worship": "🛐",
  "atom_symbol": "⚛️",
  "om": "🕉️",
  "star_of_david": "✡️",
  "wheel_of_dharma": "☸️",
  "yin_yang": "☯️",
  "latin_cross": "✝️",
  "orthodox_cross": "☦️",
  "star_and_crescent": "☪️",
  "peace_symbol": "☮️",
  "menorah": "🕎",
  "six_pointed_star": "🔯",
  "aries": "♈",
  "taurus": "♉",
  "gemini": "♊",
  "cancer": "♋",
  "leo": "♌",
  "virgo": "♍",
  "libra": "♎",
  "scorpius": "♏",
  "sagittarius": "♐",
  "capricorn": "♑",
  "aquarius": "♒",
  "pisces": "♓",
  "ophiuchus": "⛎",
  "twisted_rightwards_arrows": "🔀",
  "repeat": "🔁",
  "repeat_one": "🔂",
  "arrow_forward": "▶️",
  "fast_forward": "⏩",
  "next_track_button": "⏭️",
  "play_or_pause_button": "⏯️",
  "arrow_backward": "◀️",
  "rewind": "⏪",
  "previous_track_button": "⏮️",
  "arrow_up_small": "🔼",
  "arrow_double_up": "⏫",
  "arrow_down_small": "🔽",
  "arrow_double_down": "⏬",
  "pause_button": "⏸️",
  "stop_button": "⏹️",
  "record_button": "⏺️",
  "eject_button": "⏏️",
  "cinema": "🎦",
  "low_brightness": "🔅",
  "high_brightness": "🔆",
  "signal_strength": "📶",
  "vibration_mode": "📳",
  "mobile_phone_off": "📴",
  "female_sign": "♀️",
  "male_sign": "♂️",
  "transgender_symbol": "⚧️",
  "heavy_multiplication_x": "✖️",
  "heavy_plus_sign": "➕",
  "heavy_minus_sign": "➖",
  "heavy_division_sign": "➗",
  "infinity": "♾️",
  "bangbang": "‼️",
  "interrobang": "⁉️",
  "question": "❓",
  "grey_question": "❔",
  "grey_exclamation": "❕",
  "exclamation": "❗",
  "heavy_exclamation_mark": "❗",
  "wavy_dash": "〰️",
  "currency_exchange": "💱",
  "heavy_dollar_sign": "💲",
  "medical_symbol": "⚕️",
  "recycle": "♻️",
  "fleur_de_lis": "⚜️",
  "trident": "🔱",
  "name_badge": "📛",
  "beginner": "🔰",
  "o": "⭕",
  "white_check_mark": "✅",
  "ballot_box_with_check": "☑️",
  "heavy_check_mark": "✔️",
  "x": "❌",
  "negative_squared_cross_mark": "❎",
  "curly_loop": "➰",
  "loop": "➿",
  "part_alternation_mark": "〽️",
  "eight_spoked_asterisk": "✳️",
  "eight_pointed_black_star": "✴️",
  "sparkle": "❇️",
  "copyright": "©️",
  "registered": "®️",
  "tm": "™️",
  "hash": "#️⃣",
  "asterisk": "*️⃣",
  "zero": "0️⃣",
  "one": "1️⃣",
  "two": "2️⃣",
  "three": "3️⃣",
  "four": "4️⃣",
  "five": "5️⃣",
  "six": "6️⃣",
  "seven": "7️⃣",
  "eight": "8️⃣",
  "nine": "9️⃣",
  "keycap_ten": "🔟",
  "capital_abcd": "🔠",
  "abcd": "🔡",
  "symbols": "🔣",
  "abc": "🔤",
  "a": "🅰️",
  "ab": "🆎",
  "b": "🅱️",
  "cl": "🆑",
  "cool": "🆒",
  "free": "🆓",
  "information_source": "ℹ️",
  "id": "🆔",
  "m": "Ⓜ️",
  "new": "🆕",
  "ng": "🆖",
  "o2": "🅾️",
  "ok": "🆗",
  "parking": "🅿️",
  "sos": "🆘",
  "up": "🆙",
  "vs": "🆚",
  "koko": "🈁",
  "sa": "🈂️",
  "ideograph_advantage": "🉐",
  "accept": "🉑",
  "congratulations": "㊗️",
  "secret": "㊙️",
  "u6e80": "🈵",
  "red_circle": "🔴",
  "orange_circle": "🟠",
  "yellow_circle": "🟡",
  "green_circle": "🟢",
  "large_blue_circle": "🔵",
  "purple_circle": "🟣",
  "brown_circle": "🟤",
  "black_circle": "⚫",
  "white_circle": "⚪",
  "red_square": "🟥",
  "orange_square": "🟧",
  "yellow_square": "🟨",
  "green_square": "🟩",
  "blue_square": "🟦",
  "purple_square": "🟪",
  "brown_square": "🟫",
  "black_large_square": "⬛",
  "white_large_square": "⬜",
  "black_medium_square": "◼️",
  "white_medium_square": "◻️",
  "black_medium_small_square": "◾",
  "white_medium_small_square": "◽",
  "black_small_square": "▪️",
  "white_small_square": "▫️",
  "large_orange_diamond": "🔶",
  "large_blue_diamond": "🔷",
  "small_orange_diamond": "🔸",
  "small_blue_diamond": "🔹",
  "small_red_triangle": "🔺",
  "small_red_triangle_down": "🔻",
  "diamond_shape_with_a_dot_inside": "💠",
  "radio_button": "🔘",
  "white_square_button": "🔳",
  "black_square_button": "🔲",
  "checkered_flag": "🏁",
  "triangular_flag_on_post": "🚩",
  "crossed_flags": "🎌",
  "black_flag": "🏴",
  "white_flag": "🏳️",
  "rainbow_flag": "🏳️‍🌈",
  "transgender_flag": "🏳️‍⚧️",
  "pirate_flag": "🏴‍☠️",
  "ascension_island": "🇦🇨",
  "andorra": "🇦🇩",
  "united_arab_emirates": "🇦🇪",
  "afghanistan": "🇦🇫",
  "antigua_barbuda": "🇦🇬",
  "anguilla": "🇦🇮",
  "albania": "🇦🇱",
  "armenia": "🇦🇲",
  "angola": "🇦🇴",
  "antarctica": "🇦🇶",
  "argentina": "🇦🇷",
  "american_samoa": "🇦🇸",
  "austria": "🇦🇹",
  "australia": "🇦🇺",
  "aruba": "🇦🇼",
  "aland_islands": "🇦🇽",
  "azerbaijan": "🇦🇿",
  "bosnia_herzegovina": "🇧🇦",
  "barbados": "🇧🇧",
  "bangladesh": "🇧🇩",
  "belgium": "🇧🇪",
  "burkina_faso": "🇧🇫",
  "bulgaria": "🇧🇬",
  "bahrain": "🇧🇭",
  "burundi": "🇧🇮",
  "benin": "🇧🇯",
  "st_barthelemy": "🇧🇱",
  "bermuda": "🇧🇲",
  "brunei": "🇧🇳",
  "bolivia": "🇧🇴",
  "caribbean_netherlands": "🇧🇶",
  "brazil": "🇧🇷",
  "bahamas": "🇧🇸",
  "bhutan": "🇧🇹",
  "bouvet_island": "🇧🇻",
  "botswana": "🇧🇼",
  "belarus": "🇧🇾",
  "belize": "🇧🇿",
  "canada": "🇨🇦",
  "cocos_islands": "🇨🇨",
  "congo_kinshasa": "🇨🇩",
  "central_african_republic": "🇨🇫",
  "congo_brazzaville": "🇨🇬",
  "switzerland": "🇨🇭",
  "cote_divoire": "🇨🇮",
  "cook_islands": "🇨🇰",
  "chile": "🇨🇱",
  "cameroon": "🇨🇲",
  "cn": "🇨🇳",
  "colombia": "🇨🇴",
  "clipperton_island": "🇨🇵",
  "costa_rica": "🇨🇷",
  "cuba": "🇨🇺",
  "cape_verde": "🇨🇻",
  "curacao": "🇨🇼",
  "christmas_island": "🇨🇽",
  "cyprus": "🇨🇾",
  "czech_republic": "🇨🇿",
  "de": "🇩🇪",
  "diego_garcia": "🇩🇬",
  "djibouti": "🇩🇯",
  "denmark": "🇩🇰",
  "dominica": "🇩🇲",
  "dominican_republic": "🇩🇴",
  "algeria": "🇩🇿",
  "ceuta_melilla": "🇪🇦",
  "ecuador": "🇪🇨",
  "estonia": "🇪🇪",
  "egypt": "🇪🇬",
  "western_sahara": "🇪🇭",
  "eritrea": "🇪🇷",
  "es": "🇪🇸",
  "ethiopia": "🇪🇹",
  "eu": "🇪🇺",
  "european_union": "🇪🇺",
  "finland": "🇫🇮",
  "fiji": "🇫🇯",
  "falkland_islands": "🇫🇰",
  "micronesia": "🇫🇲",
  "faroe_islands": "🇫🇴",
  "fr": "🇫🇷",
  "gabon": "🇬🇦",
  "gb": "🇬🇧",
  "uk": "🇬🇧",
  "grenada": "🇬🇩",
  "georgia": "🇬🇪",
  "french_guiana": "🇬🇫",
  "guernsey": "🇬🇬",
  "ghana": "🇬🇭",
  "gibraltar": "🇬🇮",
  "greenland": "🇬🇱",
  "gambia": "🇬🇲",
  "guinea": "🇬🇳",
  "guadeloupe": "🇬🇵",
  "equatorial_guinea": "🇬🇶",
  "greece": "🇬🇷",
  "south_georgia_south_sandwich_islands": "🇬🇸",
  "guatemala": "🇬🇹",
  "guam": "🇬🇺",
  "guinea_bissau": "🇬🇼",
  "guyana": "🇬🇾",
  "hong_kong": "🇭🇰",
  "heard_mcdonald_islands": "🇭🇲",
  "honduras": "🇭🇳",
  "croatia": "🇭🇷",
  "haiti": "🇭🇹",
  "hungary": "🇭🇺",
  "canary_islands": "🇮🇨",
  "indonesia": "🇮🇩",
  "ireland": "🇮🇪",
  "israel": "🇮🇱",
  "isle_of_man": "🇮🇲",
  "india": "🇮🇳",
  "british_indian_ocean_territory": "🇮🇴",
  "iraq": "🇮🇶",
  "iran": "🇮🇷",
  "iceland": "🇮🇸",
  "it": "🇮🇹",
  "jersey": "🇯🇪",
  "jamaica": "🇯🇲",
  "jordan": "🇯🇴",
  "jp": "🇯🇵",
  "kenya": "🇰🇪",
  "kyrgyzstan": "🇰🇬",
  "cambodia": "🇰🇭",
  "kiribati": "🇰🇮",
  "comoros": "🇰🇲",
  "st_kitts_nevis": "🇰🇳",
  "north_korea": "🇰🇵",
  "kr": "🇰🇷",
  "kuwait": "🇰🇼",
  "cayman_islands": "🇰🇾",
  "kazakhstan": "🇰🇿",
  "laos": "🇱🇦",
  "lebanon": "🇱🇧",
  "st_lucia": "🇱🇨",
  "liechtenstein": "🇱🇮",
  "sri_lanka": "🇱🇰",
  "liberia": "🇱🇷",
  "lesotho": "🇱🇸",
  "lithuania": "🇱🇹",
  "luxembourg": "🇱🇺",
  "latvia": "🇱🇻",
  "libya": "🇱🇾",
  "morocco": "🇲🇦",
  "monaco": "🇲🇨",
  "moldova": "🇲🇩",
  "montenegro": "🇲🇪",
  "st_martin": "🇲🇫",
  "madagascar": "🇲🇬",
  "marshall_islands": "🇲🇭",
  "macedonia": "🇲🇰",
  "mali": "🇲🇱",
  "myanmar": "🇲🇲",
  "mongolia": "🇲🇳",
  "macau": "🇲🇴",
  "northern_mariana_islands": "🇲🇵",
  "martinique": "🇲🇶",
  "mauritania": "🇲🇷",
  "montserrat": "🇲🇸",
  "malta": "🇲🇹",
  "mauritius": "🇲🇺",
  "maldives": "🇲🇻",
  "malawi": "🇲🇼",
  "mexico": "🇲🇽",
  "malaysia": "🇲🇾",
  "mozambique": "🇲🇿",
  "namibia": "🇳🇦",
  "new_caledonia": "🇳🇨",
  "niger": "🇳🇪",
  "norfolk_island": "🇳🇫",
  "nigeria": "🇳🇬",
  "nicaragua": "🇳🇮",
  "netherlands": "🇳🇱",
  "norway": "🇳🇴",
  "nepal": "🇳🇵",
  "nauru": "🇳🇷",
  "niue": "🇳🇺",
  "new_zealand": "🇳🇿",
  "oman": "🇴🇲",
  "panama": "🇵🇦",
  "peru": "🇵🇪",
  "french_polynesia": "🇵🇫",
  "papua_new_guinea": "🇵🇬",
  "philippines": "🇵🇭",
  "pakistan": "🇵🇰",
  "poland": "🇵🇱",
  "st_pierre_miquelon": "🇵🇲",
  "pitcairn_islands": "🇵🇳",
  "puerto_rico": "🇵🇷",
  "palestinian_territories": "🇵🇸",
  "portugal": "🇵🇹",
  "palau": "🇵🇼",
  "paraguay": "🇵🇾",
  "qatar": "🇶🇦",
  "reunion": "🇷🇪",
  "romania": "🇷🇴",
  "serbia": "🇷🇸",
  "ru": "🇷🇺",
  "rwanda": "🇷🇼",
  "saudi_arabia": "🇸🇦",
  "solomon_islands": "🇸🇧",
  "seychelles": "🇸🇨",
  "sudan": "🇸🇩",
  "sweden": "🇸🇪",
  "singapore": "🇸🇬",
  "st_helena": "🇸🇭",
  "slovenia": "🇸🇮",
  "svalbard_jan_mayen": "🇸🇯",
  "slovakia": "🇸🇰",
  "sierra_leone": "🇸🇱",
  "san_marino": "🇸🇲",
  "senegal": "🇸🇳",
  "somalia": "🇸🇴",
  "suriname": "🇸🇷",
  "south_sudan": "🇸🇸",
  "sao_tome_principe": "🇸🇹",
  "el_salvador": "🇸🇻",
  "sint_maarten": "🇸🇽",
  "syria": "🇸🇾",
  "swaziland": "🇸🇿",
  "tristan_da_cunha": "🇹🇦",
  "turks_caicos_islands": "🇹🇨",
  "chad": "🇹🇩",
  "french_southern_territories": "🇹🇫",
  "togo": "🇹🇬",
  "thailand": "🇹🇭",
  "tajikistan": "🇹🇯",
  "tokelau": "🇹🇰",
  "timor_leste": "🇹🇱",
  "turkmenistan": "🇹🇲",
  "tunisia": "🇹🇳",
  "tonga": "🇹🇴",
  "tr": "🇹🇷",
  "trinidad_tobago": "🇹🇹",
  "tuvalu": "🇹🇻",
  "taiwan": "🇹🇼",
  "tanzania": "🇹🇿",
  "ukraine": "🇺🇦",
  "uganda": "🇺🇬",
  "us_outlying_islands": "🇺🇲",
  "united_nations": "🇺🇳",
  "us": "🇺🇸",
  "uruguay": "🇺🇾",
  "uzbekistan": "🇺🇿",
  "vatican_city": "🇻🇦",
  "st_vincent_grenadines": "🇻🇨",
  "venezuela": "🇻🇪",
  "british_virgin_islands": "🇻🇬",
  "us_virgin_islands": "🇻🇮",
  "vietnam": "🇻🇳",
  "vanuatu": "🇻🇺",
  "wallis_futuna": "🇼🇫",
  "samoa": "🇼🇸",
  "kosovo": "🇽🇰",
  "yemen": "🇾🇪",
  "mayotte": "🇾🇹",
  "south_africa": "🇿🇦",
  "zambia": "🇿🇲",
  "zimbabwe": "🇿🇼",
  "england": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "wales": "🏴󠁧󠁢󠁷󠁬󠁳󠁿"
}`);
function withEmoji(str) {
    return str.replace(/:(\w+(_\w+))*:/gi, (m, g1) => {
        var _a;
        return (_a = _emojiMap[g1]) !== null && _a !== void 0 ? _a : m;
    });
}
exports.withEmoji = withEmoji;


/***/ }),
/* 11 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "GithubData": () => (/* binding */ GithubData)
/* harmony export */ });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
class GithubData {
    constructor(octokitProvider) {
        this.octokitProvider = octokitProvider;
        this._cache = new Map();
    }
    _getOrFetch(type, info, fetch) {
        const key = type + info.owner + info.repo;
        let result = this._cache.get(key);
        if (!result) {
            result = fetch();
            this._cache.set(key, result);
        }
        return result;
    }
    async getOrFetchLabels(info) {
        return this._getOrFetch('labels', info, async () => {
            const octokit = await this.octokitProvider.lib();
            const options = octokit.issues.listLabelsForRepo.endpoint.merge({ ...info });
            return octokit.paginate(options);
        });
    }
    async getOrFetchMilestones(info) {
        return this._getOrFetch('milestone', info, async () => {
            const octokit = await this.octokitProvider.lib();
            const options = octokit.issues.listMilestones.endpoint.merge({ ...info, state: 'all', sort: 'due_on' });
            return octokit.paginate(options);
        });
    }
    async getOrFetchUsers(info) {
        return this._getOrFetch('user', info, async () => {
            const octokit = await this.octokitProvider.lib();
            const options = octokit.repos.listContributors.endpoint.merge({ ...info });
            return octokit.paginate(options);
        });
    }
}


/***/ }),
/* 12 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Scanner": () => (/* binding */ Scanner)
/* harmony export */ });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
class Scanner {
    constructor() {
        this._rules = new Map([
            // the sorting here is important because some regular expression
            // are more relaxed than others and would "eat away too much" if 
            // they come early
            ["LineComment" /* LineComment */, /\/\/[^\r\n]*/y],
            ["NewLine" /* NewLine */, /\r\n|\n/y],
            ["Whitespace" /* Whitespace */, /[ \t]+/y],
            ["DateTime" /* DateTime */, /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|\+\d{2}:\d{2})\b/y],
            ["Date" /* Date */, /\d{4}-\d{2}-\d{2}\b/y],
            ["SHA" /* SHA */, /[a-fA-F0-9]{7,40}\b/y],
            ["Number" /* Number */, /\d+\b/y],
            ["QuotedLiteral" /* QuotedLiteral */, /"[^"]+"/y],
            ["Colon" /* Colon */, /:/y],
            ["Comma" /* Comma */, /,/y],
            ["Dash" /* Dash */, /-/y],
            ["Equals" /* Equals */, /=/y],
            ["LessThanEqual" /* LessThanEqual */, /<=/y],
            ["LessThan" /* LessThan */, /</y],
            ["GreaterThanEqual" /* GreaterThanEqual */, />=/y],
            ["GreaterThan" /* GreaterThan */, />/y],
            ["Not" /* Not */, /\bNOT\b/y],
            ["OR" /* OR */, /\bOR\b/y],
            ["VariableName" /* VariableName */, /\$[_a-zA-Z][_a-zA-Z0-9]*/y],
            ["RangeFixedStart" /* RangeFixedStart */, new RegExp("\\.\\.\\*", 'y')],
            ["RangeFixedEnd" /* RangeFixedEnd */, new RegExp("\\*\\.\\.", 'y')],
            ["Range" /* Range */, new RegExp("\\.\\.", 'y')],
            ["Literal" /* Literal */, /[^\s:"=,]+/y],
            ["Unknown" /* Unknown */, /.+/y],
        ]);
        this._value = '';
        this._pos = 0;
    }
    get pos() {
        return this._pos;
    }
    reset(value) {
        this._value = value;
        this._pos = 0;
        return this;
    }
    next() {
        if (this._pos < this._value.length) {
            let match;
            for (let [type, regexp] of this._rules) {
                regexp.lastIndex = this._pos;
                match = regexp.exec(this._value);
                if (match) {
                    const token = {
                        type: type,
                        start: this._pos,
                        end: this._pos + match[0].length,
                    };
                    this._pos = token.end;
                    return token;
                }
            }
            // the scanner must always match something
            throw new Error(`BAD scanner state at ${this._pos} in ${this._value}`);
        }
        return { type: "EOF" /* EOF */, start: this._value.length, end: this._value.length };
    }
    resetPosition(token) {
        if (token) {
            this._pos = token.start;
        }
    }
    value(token) {
        return this._value.substring(token.start, token.end);
    }
    *[Symbol.iterator]() {
        while (true) {
            let token = this.next();
            yield token;
            if ((token === null || token === void 0 ? void 0 : token.type) === "EOF" /* EOF */) {
                break;
            }
        }
    }
}


/***/ }),
/* 13 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ValidationError": () => (/* binding */ ValidationError),
/* harmony export */   "validateQueryDocument": () => (/* binding */ validateQueryDocument)
/* harmony export */ });
/* harmony import */ var _nodes__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6);
/* harmony import */ var _symbols__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(7);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


class ValidationError {
    constructor(node, code, message, conflictNode, hint) {
        this.node = node;
        this.code = code;
        this.message = message;
        this.conflictNode = conflictNode;
        this.hint = hint;
    }
}
function validateQueryDocument(doc, symbols) {
    const result = [];
    _nodes__WEBPACK_IMPORTED_MODULE_0__.Utils.walk(doc, node => {
        switch (node._type) {
            case "VariableDefinition" /* VariableDefinition */:
                _validateVariableDefinition(node, result);
                break;
            case "Query" /* Query */:
                _validateQuery(node, result, symbols);
                break;
        }
    });
    return result;
}
function _validateVariableDefinition(defNode, bucket) {
    if (defNode.value._type === "Missing" /* Missing */) {
        bucket.push(new ValidationError(defNode, "NodeMissing" /* NodeMissing */, defNode.value.message));
        return;
    }
    // var-decl: no OR-statement 
    _nodes__WEBPACK_IMPORTED_MODULE_0__.Utils.walk(defNode.value, node => {
        if (node._type === "Any" /* Any */ && node.tokenType === "OR" /* OR */) {
            bucket.push(new ValidationError(node, "OrNotAllowed" /* OrNotAllowed */, `OR is not supported when defining a variable`));
        }
        if (node._type === "VariableName" /* VariableName */ && node.value === defNode.name.value) {
            bucket.push(new ValidationError(node, "VariableDefinedRecursive" /* VariableDefinedRecursive */, `Cannot reference a variable from its definition`));
        }
    });
}
function _validateQuery(query, bucket, symbols) {
    const mutual = new Map();
    // validate children
    for (let node of query.nodes) {
        if (node._type === "QualifiedValue" /* QualifiedValue */) {
            _validateQualifiedValue(node, bucket, symbols, mutual);
        }
        else if (node._type === "VariableName" /* VariableName */) {
            // variable-name => must exist
            const info = symbols.getFirst(node.value);
            if (!info) {
                bucket.push(new ValidationError(node, "VariableUnknown" /* VariableUnknown */, `Unknown variable`));
            }
        }
    }
}
function _validateQualifiedValue(node, bucket, symbols, conflicts) {
    // check name first
    const info = _symbols__WEBPACK_IMPORTED_MODULE_1__.QualifiedValueNodeSchema.get(node.qualifier.value);
    if (!info && node.value._type === "Missing" /* Missing */) {
        // skip -> likely not a key-value-expression
        return;
    }
    if (!info) {
        bucket.push(new ValidationError(node.qualifier, "QualifierUnknown" /* QualifierUnknown */, `Unknown qualifier: '${node.qualifier.value}'`));
        return;
    }
    if (info.repeatable === 0 /* No */ || !node.not && info.repeatable === 2 /* RepeatNegated */) {
        const key = `${node.not ? '-' : ''}${node.qualifier.value}`;
        if (conflicts.has(key)) {
            bucket.push(new ValidationError(node, "ValueConflict" /* ValueConflict */, 'This qualifier is already used', conflicts.get(key)));
        }
        else {
            conflicts.set(key, node);
        }
    }
    if (node.value._type === "Range" /* Range */) {
        _validateRange(node.value, bucket, symbols);
    }
    // check value
    const validateValue = (valueNode) => {
        // get the 'actual' value
        if (valueNode._type === "Compare" /* Compare */) {
            valueNode = valueNode.value;
        }
        else if (valueNode._type === "Range" /* Range */) {
            valueNode = valueNode.open || valueNode.close || valueNode;
        }
        // missing => done
        if (info && valueNode._type === "Missing" /* Missing */) {
            bucket.push(new ValidationError(valueNode, "NodeMissing" /* NodeMissing */, valueNode.message, undefined, true));
            return;
        }
        // variable => get type/value
        let valueType;
        let value;
        if (valueNode._type === "VariableName" /* VariableName */) {
            // variable value type
            const symbol = symbols.getFirst(valueNode.value);
            valueType = symbol === null || symbol === void 0 ? void 0 : symbol.type;
            value = symbol === null || symbol === void 0 ? void 0 : symbol.value;
        }
        else if (valueNode._type === "Date" /* Date */) {
            // literal
            valueType = _symbols__WEBPACK_IMPORTED_MODULE_1__.ValueType.Date;
            value = valueNode.value;
        }
        else if (valueNode._type === "Number" /* Number */) {
            // literal
            valueType = _symbols__WEBPACK_IMPORTED_MODULE_1__.ValueType.Number;
            value = String(valueNode.value);
        }
        else if (valueNode._type === "Literal" /* Literal */) {
            // literal
            value = valueNode.value;
            valueType = _symbols__WEBPACK_IMPORTED_MODULE_1__.ValueType.Literal;
        }
        if (info.type !== valueType) {
            bucket.push(new ValidationError(valueNode, "ValueUnknown" /* ValueUnknown */, `Unknown value '${value}', expected type '${info.type}'`));
            return;
        }
        if (info.enumValues && info.placeholderType === undefined) {
            let set = value && info.enumValues.find(set => set.entries.has(value) ? set : undefined);
            if (!set) {
                // value not known
                bucket.push(new ValidationError(valueNode, "ValueUnknown" /* ValueUnknown */, `Unknown value '${value}', expected one of: ${info.enumValues.map(set => [...set.entries].join(', ')).join(', ')}`));
            }
            else if (conflicts.has(set) && set.exclusive) {
                // other value from set in use
                bucket.push(new ValidationError(node, "ValueConflict" /* ValueConflict */, `This value conflicts with another value.`, conflicts.get(set)));
            }
            else {
                conflicts.set(set, node);
            }
        }
    };
    if (node.value._type === "LiteralSequence" /* LiteralSequence */) {
        if (!info.valueSequence) {
            bucket.push(new ValidationError(node.value, "OrNotAllowed" /* OrNotAllowed */, `Sequence of values is not allowed`));
        }
        node.value.nodes.forEach(validateValue);
    }
    else {
        validateValue(node.value);
    }
}
function _validateRange(node, bucket, symbol) {
    // ensure both ends are of equal types
    if (node.open && node.close) {
        const typeOpen = _nodes__WEBPACK_IMPORTED_MODULE_0__.Utils.getTypeOfNode(node.open, symbol);
        const typeClose = _nodes__WEBPACK_IMPORTED_MODULE_0__.Utils.getTypeOfNode(node.close, symbol);
        if (typeOpen !== typeClose) {
            bucket.push(new ValidationError(node, "RangeMixesTypes" /* RangeMixesTypes */, `This range uses mixed values: ${typeOpen} and ${typeClose}`));
        }
    }
}


/***/ }),
/* 14 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "OctokitProvider": () => (/* binding */ OctokitProvider)
/* harmony export */ });
/* harmony import */ var _octokit_rest__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(15);
/* harmony import */ var vscode__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var vscode__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(vscode__WEBPACK_IMPORTED_MODULE_0__);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


class OctokitProvider {
    constructor() {
        this._onDidChange = new vscode__WEBPACK_IMPORTED_MODULE_0__.EventEmitter();
        this.onDidChange = this._onDidChange.event;
        this._octokit = new _octokit_rest__WEBPACK_IMPORTED_MODULE_1__.Octokit();
        this._isAuthenticated = false;
    }
    async lib(createIfNone) {
        const oldIsAuth = this._isAuthenticated;
        try {
            const session = await vscode__WEBPACK_IMPORTED_MODULE_0__.authentication.getSession('github', ['repo'], { createIfNone });
            if (session) {
                this._octokit = new _octokit_rest__WEBPACK_IMPORTED_MODULE_1__.Octokit({ auth: session.accessToken });
                this._isAuthenticated = true;
            }
        }
        catch (err) {
            this._isAuthenticated = false;
            // no token
            console.warn('FAILED TO AUTHENTICATE');
            console.warn(err);
        }
        if (oldIsAuth !== this._isAuthenticated) {
            this._onDidChange.fire(this);
        }
        return this._octokit;
    }
    get isAuthenticated() {
        return this._isAuthenticated;
    }
}


/***/ }),
/* 15 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Octokit": () => (/* binding */ Octokit)
/* harmony export */ });
/* harmony import */ var _octokit_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(16);
/* harmony import */ var _octokit_plugin_request_log__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(37);
/* harmony import */ var _octokit_plugin_paginate_rest__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(39);
/* harmony import */ var _octokit_plugin_rest_endpoint_methods__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(38);





const VERSION = "18.5.3";

const Octokit = _octokit_core__WEBPACK_IMPORTED_MODULE_0__.Octokit.plugin(_octokit_plugin_request_log__WEBPACK_IMPORTED_MODULE_1__.requestLog, _octokit_plugin_rest_endpoint_methods__WEBPACK_IMPORTED_MODULE_2__.legacyRestEndpointMethods, _octokit_plugin_paginate_rest__WEBPACK_IMPORTED_MODULE_3__.paginateRest).defaults({
    userAgent: `octokit-rest.js/${VERSION}`,
});


//# sourceMappingURL=index.js.map


/***/ }),
/* 16 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Octokit": () => (/* binding */ Octokit)
/* harmony export */ });
/* harmony import */ var universal_user_agent__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(34);
/* harmony import */ var before_after_hook__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(17);
/* harmony import */ var before_after_hook__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(before_after_hook__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _octokit_request__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(21);
/* harmony import */ var _octokit_graphql__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(35);
/* harmony import */ var _octokit_auth_token__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(36);






const VERSION = "3.4.0";

class Octokit {
    constructor(options = {}) {
        const hook = new before_after_hook__WEBPACK_IMPORTED_MODULE_0__.Collection();
        const requestDefaults = {
            baseUrl: _octokit_request__WEBPACK_IMPORTED_MODULE_1__.request.endpoint.DEFAULTS.baseUrl,
            headers: {},
            request: Object.assign({}, options.request, {
                // @ts-ignore internal usage only, no need to type
                hook: hook.bind(null, "request"),
            }),
            mediaType: {
                previews: [],
                format: "",
            },
        };
        // prepend default user agent with `options.userAgent` if set
        requestDefaults.headers["user-agent"] = [
            options.userAgent,
            `octokit-core.js/${VERSION} ${(0,universal_user_agent__WEBPACK_IMPORTED_MODULE_2__.getUserAgent)()}`,
        ]
            .filter(Boolean)
            .join(" ");
        if (options.baseUrl) {
            requestDefaults.baseUrl = options.baseUrl;
        }
        if (options.previews) {
            requestDefaults.mediaType.previews = options.previews;
        }
        if (options.timeZone) {
            requestDefaults.headers["time-zone"] = options.timeZone;
        }
        this.request = _octokit_request__WEBPACK_IMPORTED_MODULE_1__.request.defaults(requestDefaults);
        this.graphql = (0,_octokit_graphql__WEBPACK_IMPORTED_MODULE_3__.withCustomRequest)(this.request).defaults(requestDefaults);
        this.log = Object.assign({
            debug: () => { },
            info: () => { },
            warn: console.warn.bind(console),
            error: console.error.bind(console),
        }, options.log);
        this.hook = hook;
        // (1) If neither `options.authStrategy` nor `options.auth` are set, the `octokit` instance
        //     is unauthenticated. The `this.auth()` method is a no-op and no request hook is registered.
        // (2) If only `options.auth` is set, use the default token authentication strategy.
        // (3) If `options.authStrategy` is set then use it and pass in `options.auth`. Always pass own request as many strategies accept a custom request instance.
        // TODO: type `options.auth` based on `options.authStrategy`.
        if (!options.authStrategy) {
            if (!options.auth) {
                // (1)
                this.auth = async () => ({
                    type: "unauthenticated",
                });
            }
            else {
                // (2)
                const auth = (0,_octokit_auth_token__WEBPACK_IMPORTED_MODULE_4__.createTokenAuth)(options.auth);
                // @ts-ignore  ¯\_(ツ)_/¯
                hook.wrap("request", auth.hook);
                this.auth = auth;
            }
        }
        else {
            const { authStrategy, ...otherOptions } = options;
            const auth = authStrategy(Object.assign({
                request: this.request,
                log: this.log,
                // we pass the current octokit instance as well as its constructor options
                // to allow for authentication strategies that return a new octokit instance
                // that shares the same internal state as the current one. The original
                // requirement for this was the "event-octokit" authentication strategy
                // of https://github.com/probot/octokit-auth-probot.
                octokit: this,
                octokitOptions: otherOptions,
            }, options.auth));
            // @ts-ignore  ¯\_(ツ)_/¯
            hook.wrap("request", auth.hook);
            this.auth = auth;
        }
        // apply plugins
        // https://stackoverflow.com/a/16345172
        const classConstructor = this.constructor;
        classConstructor.plugins.forEach((plugin) => {
            Object.assign(this, plugin(this, options));
        });
    }
    static defaults(defaults) {
        const OctokitWithDefaults = class extends this {
            constructor(...args) {
                const options = args[0] || {};
                if (typeof defaults === "function") {
                    super(defaults(options));
                    return;
                }
                super(Object.assign({}, defaults, options, options.userAgent && defaults.userAgent
                    ? {
                        userAgent: `${options.userAgent} ${defaults.userAgent}`,
                    }
                    : null));
            }
        };
        return OctokitWithDefaults;
    }
    /**
     * Attach a plugin (or many) to your Octokit instance.
     *
     * @example
     * const API = Octokit.plugin(plugin1, plugin2, plugin3, ...)
     */
    static plugin(...newPlugins) {
        var _a;
        const currentPlugins = this.plugins;
        const NewOctokit = (_a = class extends this {
            },
            _a.plugins = currentPlugins.concat(newPlugins.filter((plugin) => !currentPlugins.includes(plugin))),
            _a);
        return NewOctokit;
    }
}
Octokit.VERSION = VERSION;
Octokit.plugins = [];


//# sourceMappingURL=index.js.map


/***/ }),
/* 17 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var register = __webpack_require__(18)
var addHook = __webpack_require__(19)
var removeHook = __webpack_require__(20)

// bind with array of arguments: https://stackoverflow.com/a/21792913
var bind = Function.bind
var bindable = bind.bind(bind)

function bindApi (hook, state, name) {
  var removeHookRef = bindable(removeHook, null).apply(null, name ? [state, name] : [state])
  hook.api = { remove: removeHookRef }
  hook.remove = removeHookRef

  ;['before', 'error', 'after', 'wrap'].forEach(function (kind) {
    var args = name ? [state, kind, name] : [state, kind]
    hook[kind] = hook.api[kind] = bindable(addHook, null).apply(null, args)
  })
}

function HookSingular () {
  var singularHookName = 'h'
  var singularHookState = {
    registry: {}
  }
  var singularHook = register.bind(null, singularHookState, singularHookName)
  bindApi(singularHook, singularHookState, singularHookName)
  return singularHook
}

function HookCollection () {
  var state = {
    registry: {}
  }

  var hook = register.bind(null, state)
  bindApi(hook, state)

  return hook
}

var collectionHookDeprecationMessageDisplayed = false
function Hook () {
  if (!collectionHookDeprecationMessageDisplayed) {
    console.warn('[before-after-hook]: "Hook()" repurposing warning, use "Hook.Collection()". Read more: https://git.io/upgrade-before-after-hook-to-1.4')
    collectionHookDeprecationMessageDisplayed = true
  }
  return HookCollection()
}

Hook.Singular = HookSingular.bind()
Hook.Collection = HookCollection.bind()

module.exports = Hook
// expose constructors as a named property for TypeScript
module.exports.Hook = Hook
module.exports.Singular = Hook.Singular
module.exports.Collection = Hook.Collection


/***/ }),
/* 18 */
/***/ ((module) => {

module.exports = register;

function register(state, name, method, options) {
  if (typeof method !== "function") {
    throw new Error("method for before hook must be a function");
  }

  if (!options) {
    options = {};
  }

  if (Array.isArray(name)) {
    return name.reverse().reduce(function (callback, name) {
      return register.bind(null, state, name, callback, options);
    }, method)();
  }

  return Promise.resolve().then(function () {
    if (!state.registry[name]) {
      return method(options);
    }

    return state.registry[name].reduce(function (method, registered) {
      return registered.hook.bind(null, method, options);
    }, method)();
  });
}


/***/ }),
/* 19 */
/***/ ((module) => {

module.exports = addHook;

function addHook(state, kind, name, hook) {
  var orig = hook;
  if (!state.registry[name]) {
    state.registry[name] = [];
  }

  if (kind === "before") {
    hook = function (method, options) {
      return Promise.resolve()
        .then(orig.bind(null, options))
        .then(method.bind(null, options));
    };
  }

  if (kind === "after") {
    hook = function (method, options) {
      var result;
      return Promise.resolve()
        .then(method.bind(null, options))
        .then(function (result_) {
          result = result_;
          return orig(result, options);
        })
        .then(function () {
          return result;
        });
    };
  }

  if (kind === "error") {
    hook = function (method, options) {
      return Promise.resolve()
        .then(method.bind(null, options))
        .catch(function (error) {
          return orig(error, options);
        });
    };
  }

  state.registry[name].push({
    hook: hook,
    orig: orig,
  });
}


/***/ }),
/* 20 */
/***/ ((module) => {

module.exports = removeHook;

function removeHook(state, name, method) {
  if (!state.registry[name]) {
    return;
  }

  var index = state.registry[name]
    .map(function (registered) {
      return registered.orig;
    })
    .indexOf(method);

  if (index === -1) {
    return;
  }

  state.registry[name].splice(index, 1);
}


/***/ }),
/* 21 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "request": () => (/* binding */ request)
/* harmony export */ });
/* harmony import */ var _octokit_endpoint__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(33);
/* harmony import */ var universal_user_agent__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(34);
/* harmony import */ var is_plain_object__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(22);
/* harmony import */ var node_fetch__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(23);
/* harmony import */ var _octokit_request_error__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(29);






const VERSION = "5.4.15";

function getBufferResponse(response) {
    return response.arrayBuffer();
}

function fetchWrapper(requestOptions) {
    if ((0,is_plain_object__WEBPACK_IMPORTED_MODULE_0__.isPlainObject)(requestOptions.body) ||
        Array.isArray(requestOptions.body)) {
        requestOptions.body = JSON.stringify(requestOptions.body);
    }
    let headers = {};
    let status;
    let url;
    const fetch = (requestOptions.request && requestOptions.request.fetch) || node_fetch__WEBPACK_IMPORTED_MODULE_1__.default;
    return fetch(requestOptions.url, Object.assign({
        method: requestOptions.method,
        body: requestOptions.body,
        headers: requestOptions.headers,
        redirect: requestOptions.redirect,
    }, 
    // `requestOptions.request.agent` type is incompatible
    // see https://github.com/octokit/types.ts/pull/264
    requestOptions.request))
        .then((response) => {
        url = response.url;
        status = response.status;
        for (const keyAndValue of response.headers) {
            headers[keyAndValue[0]] = keyAndValue[1];
        }
        if (status === 204 || status === 205) {
            return;
        }
        // GitHub API returns 200 for HEAD requests
        if (requestOptions.method === "HEAD") {
            if (status < 400) {
                return;
            }
            throw new _octokit_request_error__WEBPACK_IMPORTED_MODULE_2__.RequestError(response.statusText, status, {
                headers,
                request: requestOptions,
            });
        }
        if (status === 304) {
            throw new _octokit_request_error__WEBPACK_IMPORTED_MODULE_2__.RequestError("Not modified", status, {
                headers,
                request: requestOptions,
            });
        }
        if (status >= 400) {
            return response
                .text()
                .then((message) => {
                const error = new _octokit_request_error__WEBPACK_IMPORTED_MODULE_2__.RequestError(message, status, {
                    headers,
                    request: requestOptions,
                });
                try {
                    let responseBody = JSON.parse(error.message);
                    Object.assign(error, responseBody);
                    let errors = responseBody.errors;
                    // Assumption `errors` would always be in Array format
                    error.message =
                        error.message + ": " + errors.map(JSON.stringify).join(", ");
                }
                catch (e) {
                    // ignore, see octokit/rest.js#684
                }
                throw error;
            });
        }
        const contentType = response.headers.get("content-type");
        if (/application\/json/.test(contentType)) {
            return response.json();
        }
        if (!contentType || /^text\/|charset=utf-8$/.test(contentType)) {
            return response.text();
        }
        return getBufferResponse(response);
    })
        .then((data) => {
        return {
            status,
            url,
            headers,
            data,
        };
    })
        .catch((error) => {
        if (error instanceof _octokit_request_error__WEBPACK_IMPORTED_MODULE_2__.RequestError) {
            throw error;
        }
        throw new _octokit_request_error__WEBPACK_IMPORTED_MODULE_2__.RequestError(error.message, 500, {
            headers,
            request: requestOptions,
        });
    });
}

function withDefaults(oldEndpoint, newDefaults) {
    const endpoint = oldEndpoint.defaults(newDefaults);
    const newApi = function (route, parameters) {
        const endpointOptions = endpoint.merge(route, parameters);
        if (!endpointOptions.request || !endpointOptions.request.hook) {
            return fetchWrapper(endpoint.parse(endpointOptions));
        }
        const request = (route, parameters) => {
            return fetchWrapper(endpoint.parse(endpoint.merge(route, parameters)));
        };
        Object.assign(request, {
            endpoint,
            defaults: withDefaults.bind(null, endpoint),
        });
        return endpointOptions.request.hook(request, endpointOptions);
    };
    return Object.assign(newApi, {
        endpoint,
        defaults: withDefaults.bind(null, endpoint),
    });
}

const request = withDefaults(_octokit_endpoint__WEBPACK_IMPORTED_MODULE_3__.endpoint, {
    headers: {
        "user-agent": `octokit-request.js/${VERSION} ${(0,universal_user_agent__WEBPACK_IMPORTED_MODULE_4__.getUserAgent)()}`,
    },
});


//# sourceMappingURL=index.js.map


/***/ }),
/* 22 */
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "isPlainObject": () => (/* binding */ isPlainObject)
/* harmony export */ });
/*!
 * is-plain-object <https://github.com/jonschlinkert/is-plain-object>
 *
 * Copyright (c) 2014-2017, Jon Schlinkert.
 * Released under the MIT License.
 */

function isObject(o) {
  return Object.prototype.toString.call(o) === '[object Object]';
}

function isPlainObject(o) {
  var ctor,prot;

  if (isObject(o) === false) return false;

  // If has modified constructor
  ctor = o.constructor;
  if (ctor === undefined) return true;

  // If has modified prototype
  prot = ctor.prototype;
  if (isObject(prot) === false) return false;

  // If constructor does not have an Object-specific method
  if (prot.hasOwnProperty('isPrototypeOf') === false) {
    return false;
  }

  // Most likely a plain Object
  return true;
}




/***/ }),
/* 23 */
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   "Headers": () => (/* binding */ Headers),
/* harmony export */   "Request": () => (/* binding */ Request),
/* harmony export */   "Response": () => (/* binding */ Response),
/* harmony export */   "FetchError": () => (/* binding */ FetchError)
/* harmony export */ });
/* harmony import */ var stream__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(24);
/* harmony import */ var http__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(25);
/* harmony import */ var url__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(26);
/* harmony import */ var https__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(27);
/* harmony import */ var zlib__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(28);






// Based on https://github.com/tmpvar/jsdom/blob/aa85b2abf07766ff7bf5c1f6daafb3726f2f2db5/lib/jsdom/living/blob.js

// fix for "Readable" isn't a named export issue
const Readable = stream__WEBPACK_IMPORTED_MODULE_0__.Readable;

const BUFFER = Symbol('buffer');
const TYPE = Symbol('type');

class Blob {
	constructor() {
		this[TYPE] = '';

		const blobParts = arguments[0];
		const options = arguments[1];

		const buffers = [];
		let size = 0;

		if (blobParts) {
			const a = blobParts;
			const length = Number(a.length);
			for (let i = 0; i < length; i++) {
				const element = a[i];
				let buffer;
				if (element instanceof Buffer) {
					buffer = element;
				} else if (ArrayBuffer.isView(element)) {
					buffer = Buffer.from(element.buffer, element.byteOffset, element.byteLength);
				} else if (element instanceof ArrayBuffer) {
					buffer = Buffer.from(element);
				} else if (element instanceof Blob) {
					buffer = element[BUFFER];
				} else {
					buffer = Buffer.from(typeof element === 'string' ? element : String(element));
				}
				size += buffer.length;
				buffers.push(buffer);
			}
		}

		this[BUFFER] = Buffer.concat(buffers);

		let type = options && options.type !== undefined && String(options.type).toLowerCase();
		if (type && !/[^\u0020-\u007E]/.test(type)) {
			this[TYPE] = type;
		}
	}
	get size() {
		return this[BUFFER].length;
	}
	get type() {
		return this[TYPE];
	}
	text() {
		return Promise.resolve(this[BUFFER].toString());
	}
	arrayBuffer() {
		const buf = this[BUFFER];
		const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
		return Promise.resolve(ab);
	}
	stream() {
		const readable = new Readable();
		readable._read = function () {};
		readable.push(this[BUFFER]);
		readable.push(null);
		return readable;
	}
	toString() {
		return '[object Blob]';
	}
	slice() {
		const size = this.size;

		const start = arguments[0];
		const end = arguments[1];
		let relativeStart, relativeEnd;
		if (start === undefined) {
			relativeStart = 0;
		} else if (start < 0) {
			relativeStart = Math.max(size + start, 0);
		} else {
			relativeStart = Math.min(start, size);
		}
		if (end === undefined) {
			relativeEnd = size;
		} else if (end < 0) {
			relativeEnd = Math.max(size + end, 0);
		} else {
			relativeEnd = Math.min(end, size);
		}
		const span = Math.max(relativeEnd - relativeStart, 0);

		const buffer = this[BUFFER];
		const slicedBuffer = buffer.slice(relativeStart, relativeStart + span);
		const blob = new Blob([], { type: arguments[2] });
		blob[BUFFER] = slicedBuffer;
		return blob;
	}
}

Object.defineProperties(Blob.prototype, {
	size: { enumerable: true },
	type: { enumerable: true },
	slice: { enumerable: true }
});

Object.defineProperty(Blob.prototype, Symbol.toStringTag, {
	value: 'Blob',
	writable: false,
	enumerable: false,
	configurable: true
});

/**
 * fetch-error.js
 *
 * FetchError interface for operational errors
 */

/**
 * Create FetchError instance
 *
 * @param   String      message      Error message for human
 * @param   String      type         Error type for machine
 * @param   String      systemError  For Node.js system error
 * @return  FetchError
 */
function FetchError(message, type, systemError) {
  Error.call(this, message);

  this.message = message;
  this.type = type;

  // when err.type is `system`, err.code contains system error code
  if (systemError) {
    this.code = this.errno = systemError.code;
  }

  // hide custom error implementation details from end-users
  Error.captureStackTrace(this, this.constructor);
}

FetchError.prototype = Object.create(Error.prototype);
FetchError.prototype.constructor = FetchError;
FetchError.prototype.name = 'FetchError';

let convert;
try {
	convert = require('encoding').convert;
} catch (e) {}

const INTERNALS = Symbol('Body internals');

// fix an issue where "PassThrough" isn't a named export for node <10
const PassThrough = stream__WEBPACK_IMPORTED_MODULE_0__.PassThrough;

/**
 * Body mixin
 *
 * Ref: https://fetch.spec.whatwg.org/#body
 *
 * @param   Stream  body  Readable stream
 * @param   Object  opts  Response options
 * @return  Void
 */
function Body(body) {
	var _this = this;

	var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
	    _ref$size = _ref.size;

	let size = _ref$size === undefined ? 0 : _ref$size;
	var _ref$timeout = _ref.timeout;
	let timeout = _ref$timeout === undefined ? 0 : _ref$timeout;

	if (body == null) {
		// body is undefined or null
		body = null;
	} else if (isURLSearchParams(body)) {
		// body is a URLSearchParams
		body = Buffer.from(body.toString());
	} else if (isBlob(body)) ; else if (Buffer.isBuffer(body)) ; else if (Object.prototype.toString.call(body) === '[object ArrayBuffer]') {
		// body is ArrayBuffer
		body = Buffer.from(body);
	} else if (ArrayBuffer.isView(body)) {
		// body is ArrayBufferView
		body = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
	} else if (body instanceof stream__WEBPACK_IMPORTED_MODULE_0__) ; else {
		// none of the above
		// coerce to string then buffer
		body = Buffer.from(String(body));
	}
	this[INTERNALS] = {
		body,
		disturbed: false,
		error: null
	};
	this.size = size;
	this.timeout = timeout;

	if (body instanceof stream__WEBPACK_IMPORTED_MODULE_0__) {
		body.on('error', function (err) {
			const error = err.name === 'AbortError' ? err : new FetchError(`Invalid response body while trying to fetch ${_this.url}: ${err.message}`, 'system', err);
			_this[INTERNALS].error = error;
		});
	}
}

Body.prototype = {
	get body() {
		return this[INTERNALS].body;
	},

	get bodyUsed() {
		return this[INTERNALS].disturbed;
	},

	/**
  * Decode response as ArrayBuffer
  *
  * @return  Promise
  */
	arrayBuffer() {
		return consumeBody.call(this).then(function (buf) {
			return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
		});
	},

	/**
  * Return raw response as Blob
  *
  * @return Promise
  */
	blob() {
		let ct = this.headers && this.headers.get('content-type') || '';
		return consumeBody.call(this).then(function (buf) {
			return Object.assign(
			// Prevent copying
			new Blob([], {
				type: ct.toLowerCase()
			}), {
				[BUFFER]: buf
			});
		});
	},

	/**
  * Decode response as json
  *
  * @return  Promise
  */
	json() {
		var _this2 = this;

		return consumeBody.call(this).then(function (buffer) {
			try {
				return JSON.parse(buffer.toString());
			} catch (err) {
				return Body.Promise.reject(new FetchError(`invalid json response body at ${_this2.url} reason: ${err.message}`, 'invalid-json'));
			}
		});
	},

	/**
  * Decode response as text
  *
  * @return  Promise
  */
	text() {
		return consumeBody.call(this).then(function (buffer) {
			return buffer.toString();
		});
	},

	/**
  * Decode response as buffer (non-spec api)
  *
  * @return  Promise
  */
	buffer() {
		return consumeBody.call(this);
	},

	/**
  * Decode response as text, while automatically detecting the encoding and
  * trying to decode to UTF-8 (non-spec api)
  *
  * @return  Promise
  */
	textConverted() {
		var _this3 = this;

		return consumeBody.call(this).then(function (buffer) {
			return convertBody(buffer, _this3.headers);
		});
	}
};

// In browsers, all properties are enumerable.
Object.defineProperties(Body.prototype, {
	body: { enumerable: true },
	bodyUsed: { enumerable: true },
	arrayBuffer: { enumerable: true },
	blob: { enumerable: true },
	json: { enumerable: true },
	text: { enumerable: true }
});

Body.mixIn = function (proto) {
	for (const name of Object.getOwnPropertyNames(Body.prototype)) {
		// istanbul ignore else: future proof
		if (!(name in proto)) {
			const desc = Object.getOwnPropertyDescriptor(Body.prototype, name);
			Object.defineProperty(proto, name, desc);
		}
	}
};

/**
 * Consume and convert an entire Body to a Buffer.
 *
 * Ref: https://fetch.spec.whatwg.org/#concept-body-consume-body
 *
 * @return  Promise
 */
function consumeBody() {
	var _this4 = this;

	if (this[INTERNALS].disturbed) {
		return Body.Promise.reject(new TypeError(`body used already for: ${this.url}`));
	}

	this[INTERNALS].disturbed = true;

	if (this[INTERNALS].error) {
		return Body.Promise.reject(this[INTERNALS].error);
	}

	let body = this.body;

	// body is null
	if (body === null) {
		return Body.Promise.resolve(Buffer.alloc(0));
	}

	// body is blob
	if (isBlob(body)) {
		body = body.stream();
	}

	// body is buffer
	if (Buffer.isBuffer(body)) {
		return Body.Promise.resolve(body);
	}

	// istanbul ignore if: should never happen
	if (!(body instanceof stream__WEBPACK_IMPORTED_MODULE_0__)) {
		return Body.Promise.resolve(Buffer.alloc(0));
	}

	// body is stream
	// get ready to actually consume the body
	let accum = [];
	let accumBytes = 0;
	let abort = false;

	return new Body.Promise(function (resolve, reject) {
		let resTimeout;

		// allow timeout on slow response body
		if (_this4.timeout) {
			resTimeout = setTimeout(function () {
				abort = true;
				reject(new FetchError(`Response timeout while trying to fetch ${_this4.url} (over ${_this4.timeout}ms)`, 'body-timeout'));
			}, _this4.timeout);
		}

		// handle stream errors
		body.on('error', function (err) {
			if (err.name === 'AbortError') {
				// if the request was aborted, reject with this Error
				abort = true;
				reject(err);
			} else {
				// other errors, such as incorrect content-encoding
				reject(new FetchError(`Invalid response body while trying to fetch ${_this4.url}: ${err.message}`, 'system', err));
			}
		});

		body.on('data', function (chunk) {
			if (abort || chunk === null) {
				return;
			}

			if (_this4.size && accumBytes + chunk.length > _this4.size) {
				abort = true;
				reject(new FetchError(`content size at ${_this4.url} over limit: ${_this4.size}`, 'max-size'));
				return;
			}

			accumBytes += chunk.length;
			accum.push(chunk);
		});

		body.on('end', function () {
			if (abort) {
				return;
			}

			clearTimeout(resTimeout);

			try {
				resolve(Buffer.concat(accum, accumBytes));
			} catch (err) {
				// handle streams that have accumulated too much data (issue #414)
				reject(new FetchError(`Could not create Buffer from response body for ${_this4.url}: ${err.message}`, 'system', err));
			}
		});
	});
}

/**
 * Detect buffer encoding and convert to target encoding
 * ref: http://www.w3.org/TR/2011/WD-html5-20110113/parsing.html#determining-the-character-encoding
 *
 * @param   Buffer  buffer    Incoming buffer
 * @param   String  encoding  Target encoding
 * @return  String
 */
function convertBody(buffer, headers) {
	if (typeof convert !== 'function') {
		throw new Error('The package `encoding` must be installed to use the textConverted() function');
	}

	const ct = headers.get('content-type');
	let charset = 'utf-8';
	let res, str;

	// header
	if (ct) {
		res = /charset=([^;]*)/i.exec(ct);
	}

	// no charset in content type, peek at response body for at most 1024 bytes
	str = buffer.slice(0, 1024).toString();

	// html5
	if (!res && str) {
		res = /<meta.+?charset=(['"])(.+?)\1/i.exec(str);
	}

	// html4
	if (!res && str) {
		res = /<meta[\s]+?http-equiv=(['"])content-type\1[\s]+?content=(['"])(.+?)\2/i.exec(str);
		if (!res) {
			res = /<meta[\s]+?content=(['"])(.+?)\1[\s]+?http-equiv=(['"])content-type\3/i.exec(str);
			if (res) {
				res.pop(); // drop last quote
			}
		}

		if (res) {
			res = /charset=(.*)/i.exec(res.pop());
		}
	}

	// xml
	if (!res && str) {
		res = /<\?xml.+?encoding=(['"])(.+?)\1/i.exec(str);
	}

	// found charset
	if (res) {
		charset = res.pop();

		// prevent decode issues when sites use incorrect encoding
		// ref: https://hsivonen.fi/encoding-menu/
		if (charset === 'gb2312' || charset === 'gbk') {
			charset = 'gb18030';
		}
	}

	// turn raw buffers into a single utf-8 buffer
	return convert(buffer, 'UTF-8', charset).toString();
}

/**
 * Detect a URLSearchParams object
 * ref: https://github.com/bitinn/node-fetch/issues/296#issuecomment-307598143
 *
 * @param   Object  obj     Object to detect by type or brand
 * @return  String
 */
function isURLSearchParams(obj) {
	// Duck-typing as a necessary condition.
	if (typeof obj !== 'object' || typeof obj.append !== 'function' || typeof obj.delete !== 'function' || typeof obj.get !== 'function' || typeof obj.getAll !== 'function' || typeof obj.has !== 'function' || typeof obj.set !== 'function') {
		return false;
	}

	// Brand-checking and more duck-typing as optional condition.
	return obj.constructor.name === 'URLSearchParams' || Object.prototype.toString.call(obj) === '[object URLSearchParams]' || typeof obj.sort === 'function';
}

/**
 * Check if `obj` is a W3C `Blob` object (which `File` inherits from)
 * @param  {*} obj
 * @return {boolean}
 */
function isBlob(obj) {
	return typeof obj === 'object' && typeof obj.arrayBuffer === 'function' && typeof obj.type === 'string' && typeof obj.stream === 'function' && typeof obj.constructor === 'function' && typeof obj.constructor.name === 'string' && /^(Blob|File)$/.test(obj.constructor.name) && /^(Blob|File)$/.test(obj[Symbol.toStringTag]);
}

/**
 * Clone body given Res/Req instance
 *
 * @param   Mixed  instance  Response or Request instance
 * @return  Mixed
 */
function clone(instance) {
	let p1, p2;
	let body = instance.body;

	// don't allow cloning a used body
	if (instance.bodyUsed) {
		throw new Error('cannot clone body after it is used');
	}

	// check that body is a stream and not form-data object
	// note: we can't clone the form-data object without having it as a dependency
	if (body instanceof stream__WEBPACK_IMPORTED_MODULE_0__ && typeof body.getBoundary !== 'function') {
		// tee instance body
		p1 = new PassThrough();
		p2 = new PassThrough();
		body.pipe(p1);
		body.pipe(p2);
		// set instance body to teed body and return the other teed body
		instance[INTERNALS].body = p1;
		body = p2;
	}

	return body;
}

/**
 * Performs the operation "extract a `Content-Type` value from |object|" as
 * specified in the specification:
 * https://fetch.spec.whatwg.org/#concept-bodyinit-extract
 *
 * This function assumes that instance.body is present.
 *
 * @param   Mixed  instance  Any options.body input
 */
function extractContentType(body) {
	if (body === null) {
		// body is null
		return null;
	} else if (typeof body === 'string') {
		// body is string
		return 'text/plain;charset=UTF-8';
	} else if (isURLSearchParams(body)) {
		// body is a URLSearchParams
		return 'application/x-www-form-urlencoded;charset=UTF-8';
	} else if (isBlob(body)) {
		// body is blob
		return body.type || null;
	} else if (Buffer.isBuffer(body)) {
		// body is buffer
		return null;
	} else if (Object.prototype.toString.call(body) === '[object ArrayBuffer]') {
		// body is ArrayBuffer
		return null;
	} else if (ArrayBuffer.isView(body)) {
		// body is ArrayBufferView
		return null;
	} else if (typeof body.getBoundary === 'function') {
		// detect form data input from form-data module
		return `multipart/form-data;boundary=${body.getBoundary()}`;
	} else if (body instanceof stream__WEBPACK_IMPORTED_MODULE_0__) {
		// body is stream
		// can't really do much about this
		return null;
	} else {
		// Body constructor defaults other things to string
		return 'text/plain;charset=UTF-8';
	}
}

/**
 * The Fetch Standard treats this as if "total bytes" is a property on the body.
 * For us, we have to explicitly get it with a function.
 *
 * ref: https://fetch.spec.whatwg.org/#concept-body-total-bytes
 *
 * @param   Body    instance   Instance of Body
 * @return  Number?            Number of bytes, or null if not possible
 */
function getTotalBytes(instance) {
	const body = instance.body;


	if (body === null) {
		// body is null
		return 0;
	} else if (isBlob(body)) {
		return body.size;
	} else if (Buffer.isBuffer(body)) {
		// body is buffer
		return body.length;
	} else if (body && typeof body.getLengthSync === 'function') {
		// detect form data input from form-data module
		if (body._lengthRetrievers && body._lengthRetrievers.length == 0 || // 1.x
		body.hasKnownLength && body.hasKnownLength()) {
			// 2.x
			return body.getLengthSync();
		}
		return null;
	} else {
		// body is stream
		return null;
	}
}

/**
 * Write a Body to a Node.js WritableStream (e.g. http.Request) object.
 *
 * @param   Body    instance   Instance of Body
 * @return  Void
 */
function writeToStream(dest, instance) {
	const body = instance.body;


	if (body === null) {
		// body is null
		dest.end();
	} else if (isBlob(body)) {
		body.stream().pipe(dest);
	} else if (Buffer.isBuffer(body)) {
		// body is buffer
		dest.write(body);
		dest.end();
	} else {
		// body is stream
		body.pipe(dest);
	}
}

// expose Promise
Body.Promise = global.Promise;

/**
 * headers.js
 *
 * Headers class offers convenient helpers
 */

const invalidTokenRegex = /[^\^_`a-zA-Z\-0-9!#$%&'*+.|~]/;
const invalidHeaderCharRegex = /[^\t\x20-\x7e\x80-\xff]/;

function validateName(name) {
	name = `${name}`;
	if (invalidTokenRegex.test(name) || name === '') {
		throw new TypeError(`${name} is not a legal HTTP header name`);
	}
}

function validateValue(value) {
	value = `${value}`;
	if (invalidHeaderCharRegex.test(value)) {
		throw new TypeError(`${value} is not a legal HTTP header value`);
	}
}

/**
 * Find the key in the map object given a header name.
 *
 * Returns undefined if not found.
 *
 * @param   String  name  Header name
 * @return  String|Undefined
 */
function find(map, name) {
	name = name.toLowerCase();
	for (const key in map) {
		if (key.toLowerCase() === name) {
			return key;
		}
	}
	return undefined;
}

const MAP = Symbol('map');
class Headers {
	/**
  * Headers class
  *
  * @param   Object  headers  Response headers
  * @return  Void
  */
	constructor() {
		let init = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : undefined;

		this[MAP] = Object.create(null);

		if (init instanceof Headers) {
			const rawHeaders = init.raw();
			const headerNames = Object.keys(rawHeaders);

			for (const headerName of headerNames) {
				for (const value of rawHeaders[headerName]) {
					this.append(headerName, value);
				}
			}

			return;
		}

		// We don't worry about converting prop to ByteString here as append()
		// will handle it.
		if (init == null) ; else if (typeof init === 'object') {
			const method = init[Symbol.iterator];
			if (method != null) {
				if (typeof method !== 'function') {
					throw new TypeError('Header pairs must be iterable');
				}

				// sequence<sequence<ByteString>>
				// Note: per spec we have to first exhaust the lists then process them
				const pairs = [];
				for (const pair of init) {
					if (typeof pair !== 'object' || typeof pair[Symbol.iterator] !== 'function') {
						throw new TypeError('Each header pair must be iterable');
					}
					pairs.push(Array.from(pair));
				}

				for (const pair of pairs) {
					if (pair.length !== 2) {
						throw new TypeError('Each header pair must be a name/value tuple');
					}
					this.append(pair[0], pair[1]);
				}
			} else {
				// record<ByteString, ByteString>
				for (const key of Object.keys(init)) {
					const value = init[key];
					this.append(key, value);
				}
			}
		} else {
			throw new TypeError('Provided initializer must be an object');
		}
	}

	/**
  * Return combined header value given name
  *
  * @param   String  name  Header name
  * @return  Mixed
  */
	get(name) {
		name = `${name}`;
		validateName(name);
		const key = find(this[MAP], name);
		if (key === undefined) {
			return null;
		}

		return this[MAP][key].join(', ');
	}

	/**
  * Iterate over all headers
  *
  * @param   Function  callback  Executed for each item with parameters (value, name, thisArg)
  * @param   Boolean   thisArg   `this` context for callback function
  * @return  Void
  */
	forEach(callback) {
		let thisArg = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;

		let pairs = getHeaders(this);
		let i = 0;
		while (i < pairs.length) {
			var _pairs$i = pairs[i];
			const name = _pairs$i[0],
			      value = _pairs$i[1];

			callback.call(thisArg, value, name, this);
			pairs = getHeaders(this);
			i++;
		}
	}

	/**
  * Overwrite header values given name
  *
  * @param   String  name   Header name
  * @param   String  value  Header value
  * @return  Void
  */
	set(name, value) {
		name = `${name}`;
		value = `${value}`;
		validateName(name);
		validateValue(value);
		const key = find(this[MAP], name);
		this[MAP][key !== undefined ? key : name] = [value];
	}

	/**
  * Append a value onto existing header
  *
  * @param   String  name   Header name
  * @param   String  value  Header value
  * @return  Void
  */
	append(name, value) {
		name = `${name}`;
		value = `${value}`;
		validateName(name);
		validateValue(value);
		const key = find(this[MAP], name);
		if (key !== undefined) {
			this[MAP][key].push(value);
		} else {
			this[MAP][name] = [value];
		}
	}

	/**
  * Check for header name existence
  *
  * @param   String   name  Header name
  * @return  Boolean
  */
	has(name) {
		name = `${name}`;
		validateName(name);
		return find(this[MAP], name) !== undefined;
	}

	/**
  * Delete all header values given name
  *
  * @param   String  name  Header name
  * @return  Void
  */
	delete(name) {
		name = `${name}`;
		validateName(name);
		const key = find(this[MAP], name);
		if (key !== undefined) {
			delete this[MAP][key];
		}
	}

	/**
  * Return raw headers (non-spec api)
  *
  * @return  Object
  */
	raw() {
		return this[MAP];
	}

	/**
  * Get an iterator on keys.
  *
  * @return  Iterator
  */
	keys() {
		return createHeadersIterator(this, 'key');
	}

	/**
  * Get an iterator on values.
  *
  * @return  Iterator
  */
	values() {
		return createHeadersIterator(this, 'value');
	}

	/**
  * Get an iterator on entries.
  *
  * This is the default iterator of the Headers object.
  *
  * @return  Iterator
  */
	[Symbol.iterator]() {
		return createHeadersIterator(this, 'key+value');
	}
}
Headers.prototype.entries = Headers.prototype[Symbol.iterator];

Object.defineProperty(Headers.prototype, Symbol.toStringTag, {
	value: 'Headers',
	writable: false,
	enumerable: false,
	configurable: true
});

Object.defineProperties(Headers.prototype, {
	get: { enumerable: true },
	forEach: { enumerable: true },
	set: { enumerable: true },
	append: { enumerable: true },
	has: { enumerable: true },
	delete: { enumerable: true },
	keys: { enumerable: true },
	values: { enumerable: true },
	entries: { enumerable: true }
});

function getHeaders(headers) {
	let kind = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'key+value';

	const keys = Object.keys(headers[MAP]).sort();
	return keys.map(kind === 'key' ? function (k) {
		return k.toLowerCase();
	} : kind === 'value' ? function (k) {
		return headers[MAP][k].join(', ');
	} : function (k) {
		return [k.toLowerCase(), headers[MAP][k].join(', ')];
	});
}

const INTERNAL = Symbol('internal');

function createHeadersIterator(target, kind) {
	const iterator = Object.create(HeadersIteratorPrototype);
	iterator[INTERNAL] = {
		target,
		kind,
		index: 0
	};
	return iterator;
}

const HeadersIteratorPrototype = Object.setPrototypeOf({
	next() {
		// istanbul ignore if
		if (!this || Object.getPrototypeOf(this) !== HeadersIteratorPrototype) {
			throw new TypeError('Value of `this` is not a HeadersIterator');
		}

		var _INTERNAL = this[INTERNAL];
		const target = _INTERNAL.target,
		      kind = _INTERNAL.kind,
		      index = _INTERNAL.index;

		const values = getHeaders(target, kind);
		const len = values.length;
		if (index >= len) {
			return {
				value: undefined,
				done: true
			};
		}

		this[INTERNAL].index = index + 1;

		return {
			value: values[index],
			done: false
		};
	}
}, Object.getPrototypeOf(Object.getPrototypeOf([][Symbol.iterator]())));

Object.defineProperty(HeadersIteratorPrototype, Symbol.toStringTag, {
	value: 'HeadersIterator',
	writable: false,
	enumerable: false,
	configurable: true
});

/**
 * Export the Headers object in a form that Node.js can consume.
 *
 * @param   Headers  headers
 * @return  Object
 */
function exportNodeCompatibleHeaders(headers) {
	const obj = Object.assign({ __proto__: null }, headers[MAP]);

	// http.request() only supports string as Host header. This hack makes
	// specifying custom Host header possible.
	const hostHeaderKey = find(headers[MAP], 'Host');
	if (hostHeaderKey !== undefined) {
		obj[hostHeaderKey] = obj[hostHeaderKey][0];
	}

	return obj;
}

/**
 * Create a Headers object from an object of headers, ignoring those that do
 * not conform to HTTP grammar productions.
 *
 * @param   Object  obj  Object of headers
 * @return  Headers
 */
function createHeadersLenient(obj) {
	const headers = new Headers();
	for (const name of Object.keys(obj)) {
		if (invalidTokenRegex.test(name)) {
			continue;
		}
		if (Array.isArray(obj[name])) {
			for (const val of obj[name]) {
				if (invalidHeaderCharRegex.test(val)) {
					continue;
				}
				if (headers[MAP][name] === undefined) {
					headers[MAP][name] = [val];
				} else {
					headers[MAP][name].push(val);
				}
			}
		} else if (!invalidHeaderCharRegex.test(obj[name])) {
			headers[MAP][name] = [obj[name]];
		}
	}
	return headers;
}

const INTERNALS$1 = Symbol('Response internals');

// fix an issue where "STATUS_CODES" aren't a named export for node <10
const STATUS_CODES = http__WEBPACK_IMPORTED_MODULE_1__.STATUS_CODES;

/**
 * Response class
 *
 * @param   Stream  body  Readable stream
 * @param   Object  opts  Response options
 * @return  Void
 */
class Response {
	constructor() {
		let body = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
		let opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

		Body.call(this, body, opts);

		const status = opts.status || 200;
		const headers = new Headers(opts.headers);

		if (body != null && !headers.has('Content-Type')) {
			const contentType = extractContentType(body);
			if (contentType) {
				headers.append('Content-Type', contentType);
			}
		}

		this[INTERNALS$1] = {
			url: opts.url,
			status,
			statusText: opts.statusText || STATUS_CODES[status],
			headers,
			counter: opts.counter
		};
	}

	get url() {
		return this[INTERNALS$1].url || '';
	}

	get status() {
		return this[INTERNALS$1].status;
	}

	/**
  * Convenience property representing if the request ended normally
  */
	get ok() {
		return this[INTERNALS$1].status >= 200 && this[INTERNALS$1].status < 300;
	}

	get redirected() {
		return this[INTERNALS$1].counter > 0;
	}

	get statusText() {
		return this[INTERNALS$1].statusText;
	}

	get headers() {
		return this[INTERNALS$1].headers;
	}

	/**
  * Clone this response
  *
  * @return  Response
  */
	clone() {
		return new Response(clone(this), {
			url: this.url,
			status: this.status,
			statusText: this.statusText,
			headers: this.headers,
			ok: this.ok,
			redirected: this.redirected
		});
	}
}

Body.mixIn(Response.prototype);

Object.defineProperties(Response.prototype, {
	url: { enumerable: true },
	status: { enumerable: true },
	ok: { enumerable: true },
	redirected: { enumerable: true },
	statusText: { enumerable: true },
	headers: { enumerable: true },
	clone: { enumerable: true }
});

Object.defineProperty(Response.prototype, Symbol.toStringTag, {
	value: 'Response',
	writable: false,
	enumerable: false,
	configurable: true
});

const INTERNALS$2 = Symbol('Request internals');

// fix an issue where "format", "parse" aren't a named export for node <10
const parse_url = url__WEBPACK_IMPORTED_MODULE_2__.parse;
const format_url = url__WEBPACK_IMPORTED_MODULE_2__.format;

const streamDestructionSupported = 'destroy' in stream__WEBPACK_IMPORTED_MODULE_0__.Readable.prototype;

/**
 * Check if a value is an instance of Request.
 *
 * @param   Mixed   input
 * @return  Boolean
 */
function isRequest(input) {
	return typeof input === 'object' && typeof input[INTERNALS$2] === 'object';
}

function isAbortSignal(signal) {
	const proto = signal && typeof signal === 'object' && Object.getPrototypeOf(signal);
	return !!(proto && proto.constructor.name === 'AbortSignal');
}

/**
 * Request class
 *
 * @param   Mixed   input  Url or Request instance
 * @param   Object  init   Custom options
 * @return  Void
 */
class Request {
	constructor(input) {
		let init = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

		let parsedURL;

		// normalize input
		if (!isRequest(input)) {
			if (input && input.href) {
				// in order to support Node.js' Url objects; though WHATWG's URL objects
				// will fall into this branch also (since their `toString()` will return
				// `href` property anyway)
				parsedURL = parse_url(input.href);
			} else {
				// coerce input to a string before attempting to parse
				parsedURL = parse_url(`${input}`);
			}
			input = {};
		} else {
			parsedURL = parse_url(input.url);
		}

		let method = init.method || input.method || 'GET';
		method = method.toUpperCase();

		if ((init.body != null || isRequest(input) && input.body !== null) && (method === 'GET' || method === 'HEAD')) {
			throw new TypeError('Request with GET/HEAD method cannot have body');
		}

		let inputBody = init.body != null ? init.body : isRequest(input) && input.body !== null ? clone(input) : null;

		Body.call(this, inputBody, {
			timeout: init.timeout || input.timeout || 0,
			size: init.size || input.size || 0
		});

		const headers = new Headers(init.headers || input.headers || {});

		if (inputBody != null && !headers.has('Content-Type')) {
			const contentType = extractContentType(inputBody);
			if (contentType) {
				headers.append('Content-Type', contentType);
			}
		}

		let signal = isRequest(input) ? input.signal : null;
		if ('signal' in init) signal = init.signal;

		if (signal != null && !isAbortSignal(signal)) {
			throw new TypeError('Expected signal to be an instanceof AbortSignal');
		}

		this[INTERNALS$2] = {
			method,
			redirect: init.redirect || input.redirect || 'follow',
			headers,
			parsedURL,
			signal
		};

		// node-fetch-only options
		this.follow = init.follow !== undefined ? init.follow : input.follow !== undefined ? input.follow : 20;
		this.compress = init.compress !== undefined ? init.compress : input.compress !== undefined ? input.compress : true;
		this.counter = init.counter || input.counter || 0;
		this.agent = init.agent || input.agent;
	}

	get method() {
		return this[INTERNALS$2].method;
	}

	get url() {
		return format_url(this[INTERNALS$2].parsedURL);
	}

	get headers() {
		return this[INTERNALS$2].headers;
	}

	get redirect() {
		return this[INTERNALS$2].redirect;
	}

	get signal() {
		return this[INTERNALS$2].signal;
	}

	/**
  * Clone this request
  *
  * @return  Request
  */
	clone() {
		return new Request(this);
	}
}

Body.mixIn(Request.prototype);

Object.defineProperty(Request.prototype, Symbol.toStringTag, {
	value: 'Request',
	writable: false,
	enumerable: false,
	configurable: true
});

Object.defineProperties(Request.prototype, {
	method: { enumerable: true },
	url: { enumerable: true },
	headers: { enumerable: true },
	redirect: { enumerable: true },
	clone: { enumerable: true },
	signal: { enumerable: true }
});

/**
 * Convert a Request to Node.js http request options.
 *
 * @param   Request  A Request instance
 * @return  Object   The options object to be passed to http.request
 */
function getNodeRequestOptions(request) {
	const parsedURL = request[INTERNALS$2].parsedURL;
	const headers = new Headers(request[INTERNALS$2].headers);

	// fetch step 1.3
	if (!headers.has('Accept')) {
		headers.set('Accept', '*/*');
	}

	// Basic fetch
	if (!parsedURL.protocol || !parsedURL.hostname) {
		throw new TypeError('Only absolute URLs are supported');
	}

	if (!/^https?:$/.test(parsedURL.protocol)) {
		throw new TypeError('Only HTTP(S) protocols are supported');
	}

	if (request.signal && request.body instanceof stream__WEBPACK_IMPORTED_MODULE_0__.Readable && !streamDestructionSupported) {
		throw new Error('Cancellation of streamed requests with AbortSignal is not supported in node < 8');
	}

	// HTTP-network-or-cache fetch steps 2.4-2.7
	let contentLengthValue = null;
	if (request.body == null && /^(POST|PUT)$/i.test(request.method)) {
		contentLengthValue = '0';
	}
	if (request.body != null) {
		const totalBytes = getTotalBytes(request);
		if (typeof totalBytes === 'number') {
			contentLengthValue = String(totalBytes);
		}
	}
	if (contentLengthValue) {
		headers.set('Content-Length', contentLengthValue);
	}

	// HTTP-network-or-cache fetch step 2.11
	if (!headers.has('User-Agent')) {
		headers.set('User-Agent', 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)');
	}

	// HTTP-network-or-cache fetch step 2.15
	if (request.compress && !headers.has('Accept-Encoding')) {
		headers.set('Accept-Encoding', 'gzip,deflate');
	}

	let agent = request.agent;
	if (typeof agent === 'function') {
		agent = agent(parsedURL);
	}

	if (!headers.has('Connection') && !agent) {
		headers.set('Connection', 'close');
	}

	// HTTP-network fetch step 4.2
	// chunked encoding is handled by Node.js

	return Object.assign({}, parsedURL, {
		method: request.method,
		headers: exportNodeCompatibleHeaders(headers),
		agent
	});
}

/**
 * abort-error.js
 *
 * AbortError interface for cancelled requests
 */

/**
 * Create AbortError instance
 *
 * @param   String      message      Error message for human
 * @return  AbortError
 */
function AbortError(message) {
  Error.call(this, message);

  this.type = 'aborted';
  this.message = message;

  // hide custom error implementation details from end-users
  Error.captureStackTrace(this, this.constructor);
}

AbortError.prototype = Object.create(Error.prototype);
AbortError.prototype.constructor = AbortError;
AbortError.prototype.name = 'AbortError';

// fix an issue where "PassThrough", "resolve" aren't a named export for node <10
const PassThrough$1 = stream__WEBPACK_IMPORTED_MODULE_0__.PassThrough;
const resolve_url = url__WEBPACK_IMPORTED_MODULE_2__.resolve;

/**
 * Fetch function
 *
 * @param   Mixed    url   Absolute url or Request instance
 * @param   Object   opts  Fetch options
 * @return  Promise
 */
function fetch(url, opts) {

	// allow custom promise
	if (!fetch.Promise) {
		throw new Error('native promise missing, set fetch.Promise to your favorite alternative');
	}

	Body.Promise = fetch.Promise;

	// wrap http.request into fetch
	return new fetch.Promise(function (resolve, reject) {
		// build request object
		const request = new Request(url, opts);
		const options = getNodeRequestOptions(request);

		const send = (options.protocol === 'https:' ? https__WEBPACK_IMPORTED_MODULE_3__ : http__WEBPACK_IMPORTED_MODULE_1__).request;
		const signal = request.signal;

		let response = null;

		const abort = function abort() {
			let error = new AbortError('The user aborted a request.');
			reject(error);
			if (request.body && request.body instanceof stream__WEBPACK_IMPORTED_MODULE_0__.Readable) {
				request.body.destroy(error);
			}
			if (!response || !response.body) return;
			response.body.emit('error', error);
		};

		if (signal && signal.aborted) {
			abort();
			return;
		}

		const abortAndFinalize = function abortAndFinalize() {
			abort();
			finalize();
		};

		// send request
		const req = send(options);
		let reqTimeout;

		if (signal) {
			signal.addEventListener('abort', abortAndFinalize);
		}

		function finalize() {
			req.abort();
			if (signal) signal.removeEventListener('abort', abortAndFinalize);
			clearTimeout(reqTimeout);
		}

		if (request.timeout) {
			req.once('socket', function (socket) {
				reqTimeout = setTimeout(function () {
					reject(new FetchError(`network timeout at: ${request.url}`, 'request-timeout'));
					finalize();
				}, request.timeout);
			});
		}

		req.on('error', function (err) {
			reject(new FetchError(`request to ${request.url} failed, reason: ${err.message}`, 'system', err));
			finalize();
		});

		req.on('response', function (res) {
			clearTimeout(reqTimeout);

			const headers = createHeadersLenient(res.headers);

			// HTTP fetch step 5
			if (fetch.isRedirect(res.statusCode)) {
				// HTTP fetch step 5.2
				const location = headers.get('Location');

				// HTTP fetch step 5.3
				const locationURL = location === null ? null : resolve_url(request.url, location);

				// HTTP fetch step 5.5
				switch (request.redirect) {
					case 'error':
						reject(new FetchError(`uri requested responds with a redirect, redirect mode is set to error: ${request.url}`, 'no-redirect'));
						finalize();
						return;
					case 'manual':
						// node-fetch-specific step: make manual redirect a bit easier to use by setting the Location header value to the resolved URL.
						if (locationURL !== null) {
							// handle corrupted header
							try {
								headers.set('Location', locationURL);
							} catch (err) {
								// istanbul ignore next: nodejs server prevent invalid response headers, we can't test this through normal request
								reject(err);
							}
						}
						break;
					case 'follow':
						// HTTP-redirect fetch step 2
						if (locationURL === null) {
							break;
						}

						// HTTP-redirect fetch step 5
						if (request.counter >= request.follow) {
							reject(new FetchError(`maximum redirect reached at: ${request.url}`, 'max-redirect'));
							finalize();
							return;
						}

						// HTTP-redirect fetch step 6 (counter increment)
						// Create a new Request object.
						const requestOpts = {
							headers: new Headers(request.headers),
							follow: request.follow,
							counter: request.counter + 1,
							agent: request.agent,
							compress: request.compress,
							method: request.method,
							body: request.body,
							signal: request.signal,
							timeout: request.timeout,
							size: request.size
						};

						// HTTP-redirect fetch step 9
						if (res.statusCode !== 303 && request.body && getTotalBytes(request) === null) {
							reject(new FetchError('Cannot follow redirect with body being a readable stream', 'unsupported-redirect'));
							finalize();
							return;
						}

						// HTTP-redirect fetch step 11
						if (res.statusCode === 303 || (res.statusCode === 301 || res.statusCode === 302) && request.method === 'POST') {
							requestOpts.method = 'GET';
							requestOpts.body = undefined;
							requestOpts.headers.delete('content-length');
						}

						// HTTP-redirect fetch step 15
						resolve(fetch(new Request(locationURL, requestOpts)));
						finalize();
						return;
				}
			}

			// prepare response
			res.once('end', function () {
				if (signal) signal.removeEventListener('abort', abortAndFinalize);
			});
			let body = res.pipe(new PassThrough$1());

			const response_options = {
				url: request.url,
				status: res.statusCode,
				statusText: res.statusMessage,
				headers: headers,
				size: request.size,
				timeout: request.timeout,
				counter: request.counter
			};

			// HTTP-network fetch step 12.1.1.3
			const codings = headers.get('Content-Encoding');

			// HTTP-network fetch step 12.1.1.4: handle content codings

			// in following scenarios we ignore compression support
			// 1. compression support is disabled
			// 2. HEAD request
			// 3. no Content-Encoding header
			// 4. no content response (204)
			// 5. content not modified response (304)
			if (!request.compress || request.method === 'HEAD' || codings === null || res.statusCode === 204 || res.statusCode === 304) {
				response = new Response(body, response_options);
				resolve(response);
				return;
			}

			// For Node v6+
			// Be less strict when decoding compressed responses, since sometimes
			// servers send slightly invalid responses that are still accepted
			// by common browsers.
			// Always using Z_SYNC_FLUSH is what cURL does.
			const zlibOptions = {
				flush: zlib__WEBPACK_IMPORTED_MODULE_4__.Z_SYNC_FLUSH,
				finishFlush: zlib__WEBPACK_IMPORTED_MODULE_4__.Z_SYNC_FLUSH
			};

			// for gzip
			if (codings == 'gzip' || codings == 'x-gzip') {
				body = body.pipe(zlib__WEBPACK_IMPORTED_MODULE_4__.createGunzip(zlibOptions));
				response = new Response(body, response_options);
				resolve(response);
				return;
			}

			// for deflate
			if (codings == 'deflate' || codings == 'x-deflate') {
				// handle the infamous raw deflate response from old servers
				// a hack for old IIS and Apache servers
				const raw = res.pipe(new PassThrough$1());
				raw.once('data', function (chunk) {
					// see http://stackoverflow.com/questions/37519828
					if ((chunk[0] & 0x0F) === 0x08) {
						body = body.pipe(zlib__WEBPACK_IMPORTED_MODULE_4__.createInflate());
					} else {
						body = body.pipe(zlib__WEBPACK_IMPORTED_MODULE_4__.createInflateRaw());
					}
					response = new Response(body, response_options);
					resolve(response);
				});
				return;
			}

			// for br
			if (codings == 'br' && typeof zlib__WEBPACK_IMPORTED_MODULE_4__.createBrotliDecompress === 'function') {
				body = body.pipe(zlib__WEBPACK_IMPORTED_MODULE_4__.createBrotliDecompress());
				response = new Response(body, response_options);
				resolve(response);
				return;
			}

			// otherwise, use response as-is
			response = new Response(body, response_options);
			resolve(response);
		});

		writeToStream(req, request);
	});
}
/**
 * Redirect code matching
 *
 * @param   Number   code  Status code
 * @return  Boolean
 */
fetch.isRedirect = function (code) {
	return code === 301 || code === 302 || code === 303 || code === 307 || code === 308;
};

// expose Promise
fetch.Promise = global.Promise;

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (fetch);



/***/ }),
/* 24 */
/***/ ((module) => {

"use strict";
module.exports = require("stream");;

/***/ }),
/* 25 */
/***/ ((module) => {

"use strict";
module.exports = require("http");;

/***/ }),
/* 26 */
/***/ ((module) => {

"use strict";
module.exports = require("url");;

/***/ }),
/* 27 */
/***/ ((module) => {

"use strict";
module.exports = require("https");;

/***/ }),
/* 28 */
/***/ ((module) => {

"use strict";
module.exports = require("zlib");;

/***/ }),
/* 29 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "RequestError": () => (/* binding */ RequestError)
/* harmony export */ });
/* harmony import */ var deprecation__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(32);
/* harmony import */ var once__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(30);
/* harmony import */ var once__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(once__WEBPACK_IMPORTED_MODULE_0__);



const logOnce = once__WEBPACK_IMPORTED_MODULE_0___default()((deprecation) => console.warn(deprecation));
/**
 * Error with extra properties to help with debugging
 */
class RequestError extends Error {
    constructor(message, statusCode, options) {
        super(message);
        // Maintains proper stack trace (only available on V8)
        /* istanbul ignore next */
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
        this.name = "HttpError";
        this.status = statusCode;
        Object.defineProperty(this, "code", {
            get() {
                logOnce(new deprecation__WEBPACK_IMPORTED_MODULE_1__.Deprecation("[@octokit/request-error] `error.code` is deprecated, use `error.status`."));
                return statusCode;
            },
        });
        this.headers = options.headers || {};
        // redact request credentials without mutating original request options
        const requestCopy = Object.assign({}, options.request);
        if (options.request.headers.authorization) {
            requestCopy.headers = Object.assign({}, options.request.headers, {
                authorization: options.request.headers.authorization.replace(/ .*$/, " [REDACTED]"),
            });
        }
        requestCopy.url = requestCopy.url
            // client_id & client_secret can be passed as URL query parameters to increase rate limit
            // see https://developer.github.com/v3/#increasing-the-unauthenticated-rate-limit-for-oauth-applications
            .replace(/\bclient_secret=\w+/g, "client_secret=[REDACTED]")
            // OAuth tokens can be passed as URL query parameters, although it is not recommended
            // see https://developer.github.com/v3/#oauth2-token-sent-in-a-header
            .replace(/\baccess_token=\w+/g, "access_token=[REDACTED]");
        this.request = requestCopy;
    }
}


//# sourceMappingURL=index.js.map


/***/ }),
/* 30 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var wrappy = __webpack_require__(31)
module.exports = wrappy(once)
module.exports.strict = wrappy(onceStrict)

once.proto = once(function () {
  Object.defineProperty(Function.prototype, 'once', {
    value: function () {
      return once(this)
    },
    configurable: true
  })

  Object.defineProperty(Function.prototype, 'onceStrict', {
    value: function () {
      return onceStrict(this)
    },
    configurable: true
  })
})

function once (fn) {
  var f = function () {
    if (f.called) return f.value
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  f.called = false
  return f
}

function onceStrict (fn) {
  var f = function () {
    if (f.called)
      throw new Error(f.onceError)
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  var name = fn.name || 'Function wrapped with `once`'
  f.onceError = name + " shouldn't be called more than once"
  f.called = false
  return f
}


/***/ }),
/* 31 */
/***/ ((module) => {

// Returns a wrapper function that returns a wrapped callback
// The wrapper function should do some stuff, and return a
// presumably different callback function.
// This makes sure that own properties are retained, so that
// decorations and such are not lost along the way.
module.exports = wrappy
function wrappy (fn, cb) {
  if (fn && cb) return wrappy(fn)(cb)

  if (typeof fn !== 'function')
    throw new TypeError('need wrapper function')

  Object.keys(fn).forEach(function (k) {
    wrapper[k] = fn[k]
  })

  return wrapper

  function wrapper() {
    var args = new Array(arguments.length)
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i]
    }
    var ret = fn.apply(this, args)
    var cb = args[args.length-1]
    if (typeof ret === 'function' && ret !== cb) {
      Object.keys(cb).forEach(function (k) {
        ret[k] = cb[k]
      })
    }
    return ret
  }
}


/***/ }),
/* 32 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Deprecation": () => (/* binding */ Deprecation)
/* harmony export */ });
class Deprecation extends Error {
  constructor(message) {
    super(message); // Maintains proper stack trace (only available on V8)

    /* istanbul ignore next */

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    this.name = 'Deprecation';
  }

}




/***/ }),
/* 33 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "endpoint": () => (/* binding */ endpoint)
/* harmony export */ });
/* harmony import */ var is_plain_object__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(22);
/* harmony import */ var universal_user_agent__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(34);



function lowercaseKeys(object) {
    if (!object) {
        return {};
    }
    return Object.keys(object).reduce((newObj, key) => {
        newObj[key.toLowerCase()] = object[key];
        return newObj;
    }, {});
}

function mergeDeep(defaults, options) {
    const result = Object.assign({}, defaults);
    Object.keys(options).forEach((key) => {
        if ((0,is_plain_object__WEBPACK_IMPORTED_MODULE_0__.isPlainObject)(options[key])) {
            if (!(key in defaults))
                Object.assign(result, { [key]: options[key] });
            else
                result[key] = mergeDeep(defaults[key], options[key]);
        }
        else {
            Object.assign(result, { [key]: options[key] });
        }
    });
    return result;
}

function removeUndefinedProperties(obj) {
    for (const key in obj) {
        if (obj[key] === undefined) {
            delete obj[key];
        }
    }
    return obj;
}

function merge(defaults, route, options) {
    if (typeof route === "string") {
        let [method, url] = route.split(" ");
        options = Object.assign(url ? { method, url } : { url: method }, options);
    }
    else {
        options = Object.assign({}, route);
    }
    // lowercase header names before merging with defaults to avoid duplicates
    options.headers = lowercaseKeys(options.headers);
    // remove properties with undefined values before merging
    removeUndefinedProperties(options);
    removeUndefinedProperties(options.headers);
    const mergedOptions = mergeDeep(defaults || {}, options);
    // mediaType.previews arrays are merged, instead of overwritten
    if (defaults && defaults.mediaType.previews.length) {
        mergedOptions.mediaType.previews = defaults.mediaType.previews
            .filter((preview) => !mergedOptions.mediaType.previews.includes(preview))
            .concat(mergedOptions.mediaType.previews);
    }
    mergedOptions.mediaType.previews = mergedOptions.mediaType.previews.map((preview) => preview.replace(/-preview/, ""));
    return mergedOptions;
}

function addQueryParameters(url, parameters) {
    const separator = /\?/.test(url) ? "&" : "?";
    const names = Object.keys(parameters);
    if (names.length === 0) {
        return url;
    }
    return (url +
        separator +
        names
            .map((name) => {
            if (name === "q") {
                return ("q=" + parameters.q.split("+").map(encodeURIComponent).join("+"));
            }
            return `${name}=${encodeURIComponent(parameters[name])}`;
        })
            .join("&"));
}

const urlVariableRegex = /\{[^}]+\}/g;
function removeNonChars(variableName) {
    return variableName.replace(/^\W+|\W+$/g, "").split(/,/);
}
function extractUrlVariableNames(url) {
    const matches = url.match(urlVariableRegex);
    if (!matches) {
        return [];
    }
    return matches.map(removeNonChars).reduce((a, b) => a.concat(b), []);
}

function omit(object, keysToOmit) {
    return Object.keys(object)
        .filter((option) => !keysToOmit.includes(option))
        .reduce((obj, key) => {
        obj[key] = object[key];
        return obj;
    }, {});
}

// Based on https://github.com/bramstein/url-template, licensed under BSD
// TODO: create separate package.
//
// Copyright (c) 2012-2014, Bram Stein
// All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
//  1. Redistributions of source code must retain the above copyright
//     notice, this list of conditions and the following disclaimer.
//  2. Redistributions in binary form must reproduce the above copyright
//     notice, this list of conditions and the following disclaimer in the
//     documentation and/or other materials provided with the distribution.
//  3. The name of the author may not be used to endorse or promote products
//     derived from this software without specific prior written permission.
// THIS SOFTWARE IS PROVIDED BY THE AUTHOR "AS IS" AND ANY EXPRESS OR IMPLIED
// WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO
// EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
// INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
// OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
// NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
// EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
/* istanbul ignore file */
function encodeReserved(str) {
    return str
        .split(/(%[0-9A-Fa-f]{2})/g)
        .map(function (part) {
        if (!/%[0-9A-Fa-f]/.test(part)) {
            part = encodeURI(part).replace(/%5B/g, "[").replace(/%5D/g, "]");
        }
        return part;
    })
        .join("");
}
function encodeUnreserved(str) {
    return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
        return "%" + c.charCodeAt(0).toString(16).toUpperCase();
    });
}
function encodeValue(operator, value, key) {
    value =
        operator === "+" || operator === "#"
            ? encodeReserved(value)
            : encodeUnreserved(value);
    if (key) {
        return encodeUnreserved(key) + "=" + value;
    }
    else {
        return value;
    }
}
function isDefined(value) {
    return value !== undefined && value !== null;
}
function isKeyOperator(operator) {
    return operator === ";" || operator === "&" || operator === "?";
}
function getValues(context, operator, key, modifier) {
    var value = context[key], result = [];
    if (isDefined(value) && value !== "") {
        if (typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean") {
            value = value.toString();
            if (modifier && modifier !== "*") {
                value = value.substring(0, parseInt(modifier, 10));
            }
            result.push(encodeValue(operator, value, isKeyOperator(operator) ? key : ""));
        }
        else {
            if (modifier === "*") {
                if (Array.isArray(value)) {
                    value.filter(isDefined).forEach(function (value) {
                        result.push(encodeValue(operator, value, isKeyOperator(operator) ? key : ""));
                    });
                }
                else {
                    Object.keys(value).forEach(function (k) {
                        if (isDefined(value[k])) {
                            result.push(encodeValue(operator, value[k], k));
                        }
                    });
                }
            }
            else {
                const tmp = [];
                if (Array.isArray(value)) {
                    value.filter(isDefined).forEach(function (value) {
                        tmp.push(encodeValue(operator, value));
                    });
                }
                else {
                    Object.keys(value).forEach(function (k) {
                        if (isDefined(value[k])) {
                            tmp.push(encodeUnreserved(k));
                            tmp.push(encodeValue(operator, value[k].toString()));
                        }
                    });
                }
                if (isKeyOperator(operator)) {
                    result.push(encodeUnreserved(key) + "=" + tmp.join(","));
                }
                else if (tmp.length !== 0) {
                    result.push(tmp.join(","));
                }
            }
        }
    }
    else {
        if (operator === ";") {
            if (isDefined(value)) {
                result.push(encodeUnreserved(key));
            }
        }
        else if (value === "" && (operator === "&" || operator === "?")) {
            result.push(encodeUnreserved(key) + "=");
        }
        else if (value === "") {
            result.push("");
        }
    }
    return result;
}
function parseUrl(template) {
    return {
        expand: expand.bind(null, template),
    };
}
function expand(template, context) {
    var operators = ["+", "#", ".", "/", ";", "?", "&"];
    return template.replace(/\{([^\{\}]+)\}|([^\{\}]+)/g, function (_, expression, literal) {
        if (expression) {
            let operator = "";
            const values = [];
            if (operators.indexOf(expression.charAt(0)) !== -1) {
                operator = expression.charAt(0);
                expression = expression.substr(1);
            }
            expression.split(/,/g).forEach(function (variable) {
                var tmp = /([^:\*]*)(?::(\d+)|(\*))?/.exec(variable);
                values.push(getValues(context, operator, tmp[1], tmp[2] || tmp[3]));
            });
            if (operator && operator !== "+") {
                var separator = ",";
                if (operator === "?") {
                    separator = "&";
                }
                else if (operator !== "#") {
                    separator = operator;
                }
                return (values.length !== 0 ? operator : "") + values.join(separator);
            }
            else {
                return values.join(",");
            }
        }
        else {
            return encodeReserved(literal);
        }
    });
}

function parse(options) {
    // https://fetch.spec.whatwg.org/#methods
    let method = options.method.toUpperCase();
    // replace :varname with {varname} to make it RFC 6570 compatible
    let url = (options.url || "/").replace(/:([a-z]\w+)/g, "{$1}");
    let headers = Object.assign({}, options.headers);
    let body;
    let parameters = omit(options, [
        "method",
        "baseUrl",
        "url",
        "headers",
        "request",
        "mediaType",
    ]);
    // extract variable names from URL to calculate remaining variables later
    const urlVariableNames = extractUrlVariableNames(url);
    url = parseUrl(url).expand(parameters);
    if (!/^http/.test(url)) {
        url = options.baseUrl + url;
    }
    const omittedParameters = Object.keys(options)
        .filter((option) => urlVariableNames.includes(option))
        .concat("baseUrl");
    const remainingParameters = omit(parameters, omittedParameters);
    const isBinaryRequest = /application\/octet-stream/i.test(headers.accept);
    if (!isBinaryRequest) {
        if (options.mediaType.format) {
            // e.g. application/vnd.github.v3+json => application/vnd.github.v3.raw
            headers.accept = headers.accept
                .split(/,/)
                .map((preview) => preview.replace(/application\/vnd(\.\w+)(\.v3)?(\.\w+)?(\+json)?$/, `application/vnd$1$2.${options.mediaType.format}`))
                .join(",");
        }
        if (options.mediaType.previews.length) {
            const previewsFromAcceptHeader = headers.accept.match(/[\w-]+(?=-preview)/g) || [];
            headers.accept = previewsFromAcceptHeader
                .concat(options.mediaType.previews)
                .map((preview) => {
                const format = options.mediaType.format
                    ? `.${options.mediaType.format}`
                    : "+json";
                return `application/vnd.github.${preview}-preview${format}`;
            })
                .join(",");
        }
    }
    // for GET/HEAD requests, set URL query parameters from remaining parameters
    // for PATCH/POST/PUT/DELETE requests, set request body from remaining parameters
    if (["GET", "HEAD"].includes(method)) {
        url = addQueryParameters(url, remainingParameters);
    }
    else {
        if ("data" in remainingParameters) {
            body = remainingParameters.data;
        }
        else {
            if (Object.keys(remainingParameters).length) {
                body = remainingParameters;
            }
            else {
                headers["content-length"] = 0;
            }
        }
    }
    // default content-type for JSON if body is set
    if (!headers["content-type"] && typeof body !== "undefined") {
        headers["content-type"] = "application/json; charset=utf-8";
    }
    // GitHub expects 'content-length: 0' header for PUT/PATCH requests without body.
    // fetch does not allow to set `content-length` header, but we can set body to an empty string
    if (["PATCH", "PUT"].includes(method) && typeof body === "undefined") {
        body = "";
    }
    // Only return body/request keys if present
    return Object.assign({ method, url, headers }, typeof body !== "undefined" ? { body } : null, options.request ? { request: options.request } : null);
}

function endpointWithDefaults(defaults, route, options) {
    return parse(merge(defaults, route, options));
}

function withDefaults(oldDefaults, newDefaults) {
    const DEFAULTS = merge(oldDefaults, newDefaults);
    const endpoint = endpointWithDefaults.bind(null, DEFAULTS);
    return Object.assign(endpoint, {
        DEFAULTS,
        defaults: withDefaults.bind(null, DEFAULTS),
        merge: merge.bind(null, DEFAULTS),
        parse,
    });
}

const VERSION = "6.0.11";

const userAgent = `octokit-endpoint.js/${VERSION} ${(0,universal_user_agent__WEBPACK_IMPORTED_MODULE_1__.getUserAgent)()}`;
// DEFAULTS has all properties set that EndpointOptions has, except url.
// So we use RequestParameters and add method as additional required property.
const DEFAULTS = {
    method: "GET",
    baseUrl: "https://api.github.com",
    headers: {
        accept: "application/vnd.github.v3+json",
        "user-agent": userAgent,
    },
    mediaType: {
        format: "",
        previews: [],
    },
};

const endpoint = withDefaults(null, DEFAULTS);


//# sourceMappingURL=index.js.map


/***/ }),
/* 34 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "getUserAgent": () => (/* binding */ getUserAgent)
/* harmony export */ });
function getUserAgent() {
    if (typeof navigator === "object" && "userAgent" in navigator) {
        return navigator.userAgent;
    }
    if (typeof process === "object" && "version" in process) {
        return `Node.js/${process.version.substr(1)} (${process.platform}; ${process.arch})`;
    }
    return "<environment undetectable>";
}


//# sourceMappingURL=index.js.map


/***/ }),
/* 35 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "graphql": () => (/* binding */ graphql$1),
/* harmony export */   "withCustomRequest": () => (/* binding */ withCustomRequest)
/* harmony export */ });
/* harmony import */ var _octokit_request__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(21);
/* harmony import */ var universal_user_agent__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(34);



const VERSION = "4.6.1";

class GraphqlError extends Error {
    constructor(request, response) {
        const message = response.data.errors[0].message;
        super(message);
        Object.assign(this, response.data);
        Object.assign(this, { headers: response.headers });
        this.name = "GraphqlError";
        this.request = request;
        // Maintains proper stack trace (only available on V8)
        /* istanbul ignore next */
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

const NON_VARIABLE_OPTIONS = [
    "method",
    "baseUrl",
    "url",
    "headers",
    "request",
    "query",
    "mediaType",
];
const FORBIDDEN_VARIABLE_OPTIONS = ["query", "method", "url"];
const GHES_V3_SUFFIX_REGEX = /\/api\/v3\/?$/;
function graphql(request, query, options) {
    if (options) {
        if (typeof query === "string" && "query" in options) {
            return Promise.reject(new Error(`[@octokit/graphql] "query" cannot be used as variable name`));
        }
        for (const key in options) {
            if (!FORBIDDEN_VARIABLE_OPTIONS.includes(key))
                continue;
            return Promise.reject(new Error(`[@octokit/graphql] "${key}" cannot be used as variable name`));
        }
    }
    const parsedOptions = typeof query === "string" ? Object.assign({ query }, options) : query;
    const requestOptions = Object.keys(parsedOptions).reduce((result, key) => {
        if (NON_VARIABLE_OPTIONS.includes(key)) {
            result[key] = parsedOptions[key];
            return result;
        }
        if (!result.variables) {
            result.variables = {};
        }
        result.variables[key] = parsedOptions[key];
        return result;
    }, {});
    // workaround for GitHub Enterprise baseUrl set with /api/v3 suffix
    // https://github.com/octokit/auth-app.js/issues/111#issuecomment-657610451
    const baseUrl = parsedOptions.baseUrl || request.endpoint.DEFAULTS.baseUrl;
    if (GHES_V3_SUFFIX_REGEX.test(baseUrl)) {
        requestOptions.url = baseUrl.replace(GHES_V3_SUFFIX_REGEX, "/api/graphql");
    }
    return request(requestOptions).then((response) => {
        if (response.data.errors) {
            const headers = {};
            for (const key of Object.keys(response.headers)) {
                headers[key] = response.headers[key];
            }
            throw new GraphqlError(requestOptions, {
                headers,
                data: response.data,
            });
        }
        return response.data.data;
    });
}

function withDefaults(request$1, newDefaults) {
    const newRequest = request$1.defaults(newDefaults);
    const newApi = (query, options) => {
        return graphql(newRequest, query, options);
    };
    return Object.assign(newApi, {
        defaults: withDefaults.bind(null, newRequest),
        endpoint: _octokit_request__WEBPACK_IMPORTED_MODULE_0__.request.endpoint,
    });
}

const graphql$1 = withDefaults(_octokit_request__WEBPACK_IMPORTED_MODULE_0__.request, {
    headers: {
        "user-agent": `octokit-graphql.js/${VERSION} ${(0,universal_user_agent__WEBPACK_IMPORTED_MODULE_1__.getUserAgent)()}`,
    },
    method: "POST",
    url: "/graphql",
});
function withCustomRequest(customRequest) {
    return withDefaults(customRequest, {
        method: "POST",
        url: "/graphql",
    });
}


//# sourceMappingURL=index.js.map


/***/ }),
/* 36 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "createTokenAuth": () => (/* binding */ createTokenAuth)
/* harmony export */ });
async function auth(token) {
    const tokenType = token.split(/\./).length === 3
        ? "app"
        : /^v\d+\./.test(token)
            ? "installation"
            : "oauth";
    return {
        type: "token",
        token: token,
        tokenType
    };
}

/**
 * Prefix token for usage in the Authorization header
 *
 * @param token OAuth token or JSON Web Token
 */
function withAuthorizationPrefix(token) {
    if (token.split(/\./).length === 3) {
        return `bearer ${token}`;
    }
    return `token ${token}`;
}

async function hook(token, request, route, parameters) {
    const endpoint = request.endpoint.merge(route, parameters);
    endpoint.headers.authorization = withAuthorizationPrefix(token);
    return request(endpoint);
}

const createTokenAuth = function createTokenAuth(token) {
    if (!token) {
        throw new Error("[@octokit/auth-token] No token passed to createTokenAuth");
    }
    if (typeof token !== "string") {
        throw new Error("[@octokit/auth-token] Token passed to createTokenAuth is not a string");
    }
    token = token.replace(/^(token|bearer) +/i, "");
    return Object.assign(auth.bind(null, token), {
        hook: hook.bind(null, token)
    });
};


//# sourceMappingURL=index.js.map


/***/ }),
/* 37 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "requestLog": () => (/* binding */ requestLog)
/* harmony export */ });
const VERSION = "1.0.3";

/**
 * @param octokit Octokit instance
 * @param options Options passed to Octokit constructor
 */
function requestLog(octokit) {
    octokit.hook.wrap("request", (request, options) => {
        octokit.log.debug("request", options);
        const start = Date.now();
        const requestOptions = octokit.request.endpoint.parse(options);
        const path = requestOptions.url.replace(options.baseUrl, "");
        return request(options)
            .then((response) => {
            octokit.log.info(`${requestOptions.method} ${path} - ${response.status} in ${Date.now() - start}ms`);
            return response;
        })
            .catch((error) => {
            octokit.log.info(`${requestOptions.method} ${path} - ${error.status} in ${Date.now() - start}ms`);
            throw error;
        });
    });
}
requestLog.VERSION = VERSION;


//# sourceMappingURL=index.js.map


/***/ }),
/* 38 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "legacyRestEndpointMethods": () => (/* binding */ legacyRestEndpointMethods),
/* harmony export */   "restEndpointMethods": () => (/* binding */ restEndpointMethods)
/* harmony export */ });
const Endpoints = {
    actions: {
        addSelectedRepoToOrgSecret: [
            "PUT /orgs/{org}/actions/secrets/{secret_name}/repositories/{repository_id}",
        ],
        cancelWorkflowRun: [
            "POST /repos/{owner}/{repo}/actions/runs/{run_id}/cancel",
        ],
        createOrUpdateEnvironmentSecret: [
            "PUT /repositories/{repository_id}/environments/{environment_name}/secrets/{secret_name}",
        ],
        createOrUpdateOrgSecret: ["PUT /orgs/{org}/actions/secrets/{secret_name}"],
        createOrUpdateRepoSecret: [
            "PUT /repos/{owner}/{repo}/actions/secrets/{secret_name}",
        ],
        createRegistrationTokenForOrg: [
            "POST /orgs/{org}/actions/runners/registration-token",
        ],
        createRegistrationTokenForRepo: [
            "POST /repos/{owner}/{repo}/actions/runners/registration-token",
        ],
        createRemoveTokenForOrg: ["POST /orgs/{org}/actions/runners/remove-token"],
        createRemoveTokenForRepo: [
            "POST /repos/{owner}/{repo}/actions/runners/remove-token",
        ],
        createWorkflowDispatch: [
            "POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches",
        ],
        deleteArtifact: [
            "DELETE /repos/{owner}/{repo}/actions/artifacts/{artifact_id}",
        ],
        deleteEnvironmentSecret: [
            "DELETE /repositories/{repository_id}/environments/{environment_name}/secrets/{secret_name}",
        ],
        deleteOrgSecret: ["DELETE /orgs/{org}/actions/secrets/{secret_name}"],
        deleteRepoSecret: [
            "DELETE /repos/{owner}/{repo}/actions/secrets/{secret_name}",
        ],
        deleteSelfHostedRunnerFromOrg: [
            "DELETE /orgs/{org}/actions/runners/{runner_id}",
        ],
        deleteSelfHostedRunnerFromRepo: [
            "DELETE /repos/{owner}/{repo}/actions/runners/{runner_id}",
        ],
        deleteWorkflowRun: ["DELETE /repos/{owner}/{repo}/actions/runs/{run_id}"],
        deleteWorkflowRunLogs: [
            "DELETE /repos/{owner}/{repo}/actions/runs/{run_id}/logs",
        ],
        disableSelectedRepositoryGithubActionsOrganization: [
            "DELETE /orgs/{org}/actions/permissions/repositories/{repository_id}",
        ],
        disableWorkflow: [
            "PUT /repos/{owner}/{repo}/actions/workflows/{workflow_id}/disable",
        ],
        downloadArtifact: [
            "GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}/{archive_format}",
        ],
        downloadJobLogsForWorkflowRun: [
            "GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs",
        ],
        downloadWorkflowRunLogs: [
            "GET /repos/{owner}/{repo}/actions/runs/{run_id}/logs",
        ],
        enableSelectedRepositoryGithubActionsOrganization: [
            "PUT /orgs/{org}/actions/permissions/repositories/{repository_id}",
        ],
        enableWorkflow: [
            "PUT /repos/{owner}/{repo}/actions/workflows/{workflow_id}/enable",
        ],
        getAllowedActionsOrganization: [
            "GET /orgs/{org}/actions/permissions/selected-actions",
        ],
        getAllowedActionsRepository: [
            "GET /repos/{owner}/{repo}/actions/permissions/selected-actions",
        ],
        getArtifact: ["GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}"],
        getEnvironmentPublicKey: [
            "GET /repositories/{repository_id}/environments/{environment_name}/secrets/public-key",
        ],
        getEnvironmentSecret: [
            "GET /repositories/{repository_id}/environments/{environment_name}/secrets/{secret_name}",
        ],
        getGithubActionsPermissionsOrganization: [
            "GET /orgs/{org}/actions/permissions",
        ],
        getGithubActionsPermissionsRepository: [
            "GET /repos/{owner}/{repo}/actions/permissions",
        ],
        getJobForWorkflowRun: ["GET /repos/{owner}/{repo}/actions/jobs/{job_id}"],
        getOrgPublicKey: ["GET /orgs/{org}/actions/secrets/public-key"],
        getOrgSecret: ["GET /orgs/{org}/actions/secrets/{secret_name}"],
        getPendingDeploymentsForRun: [
            "GET /repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments",
        ],
        getRepoPermissions: [
            "GET /repos/{owner}/{repo}/actions/permissions",
            {},
            { renamed: ["actions", "getGithubActionsPermissionsRepository"] },
        ],
        getRepoPublicKey: ["GET /repos/{owner}/{repo}/actions/secrets/public-key"],
        getRepoSecret: ["GET /repos/{owner}/{repo}/actions/secrets/{secret_name}"],
        getReviewsForRun: [
            "GET /repos/{owner}/{repo}/actions/runs/{run_id}/approvals",
        ],
        getSelfHostedRunnerForOrg: ["GET /orgs/{org}/actions/runners/{runner_id}"],
        getSelfHostedRunnerForRepo: [
            "GET /repos/{owner}/{repo}/actions/runners/{runner_id}",
        ],
        getWorkflow: ["GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}"],
        getWorkflowRun: ["GET /repos/{owner}/{repo}/actions/runs/{run_id}"],
        getWorkflowRunUsage: [
            "GET /repos/{owner}/{repo}/actions/runs/{run_id}/timing",
        ],
        getWorkflowUsage: [
            "GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/timing",
        ],
        listArtifactsForRepo: ["GET /repos/{owner}/{repo}/actions/artifacts"],
        listEnvironmentSecrets: [
            "GET /repositories/{repository_id}/environments/{environment_name}/secrets",
        ],
        listJobsForWorkflowRun: [
            "GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs",
        ],
        listOrgSecrets: ["GET /orgs/{org}/actions/secrets"],
        listRepoSecrets: ["GET /repos/{owner}/{repo}/actions/secrets"],
        listRepoWorkflows: ["GET /repos/{owner}/{repo}/actions/workflows"],
        listRunnerApplicationsForOrg: ["GET /orgs/{org}/actions/runners/downloads"],
        listRunnerApplicationsForRepo: [
            "GET /repos/{owner}/{repo}/actions/runners/downloads",
        ],
        listSelectedReposForOrgSecret: [
            "GET /orgs/{org}/actions/secrets/{secret_name}/repositories",
        ],
        listSelectedRepositoriesEnabledGithubActionsOrganization: [
            "GET /orgs/{org}/actions/permissions/repositories",
        ],
        listSelfHostedRunnersForOrg: ["GET /orgs/{org}/actions/runners"],
        listSelfHostedRunnersForRepo: ["GET /repos/{owner}/{repo}/actions/runners"],
        listWorkflowRunArtifacts: [
            "GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts",
        ],
        listWorkflowRuns: [
            "GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs",
        ],
        listWorkflowRunsForRepo: ["GET /repos/{owner}/{repo}/actions/runs"],
        reRunWorkflow: ["POST /repos/{owner}/{repo}/actions/runs/{run_id}/rerun"],
        removeSelectedRepoFromOrgSecret: [
            "DELETE /orgs/{org}/actions/secrets/{secret_name}/repositories/{repository_id}",
        ],
        reviewPendingDeploymentsForRun: [
            "POST /repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments",
        ],
        setAllowedActionsOrganization: [
            "PUT /orgs/{org}/actions/permissions/selected-actions",
        ],
        setAllowedActionsRepository: [
            "PUT /repos/{owner}/{repo}/actions/permissions/selected-actions",
        ],
        setGithubActionsPermissionsOrganization: [
            "PUT /orgs/{org}/actions/permissions",
        ],
        setGithubActionsPermissionsRepository: [
            "PUT /repos/{owner}/{repo}/actions/permissions",
        ],
        setSelectedReposForOrgSecret: [
            "PUT /orgs/{org}/actions/secrets/{secret_name}/repositories",
        ],
        setSelectedRepositoriesEnabledGithubActionsOrganization: [
            "PUT /orgs/{org}/actions/permissions/repositories",
        ],
    },
    activity: {
        checkRepoIsStarredByAuthenticatedUser: ["GET /user/starred/{owner}/{repo}"],
        deleteRepoSubscription: ["DELETE /repos/{owner}/{repo}/subscription"],
        deleteThreadSubscription: [
            "DELETE /notifications/threads/{thread_id}/subscription",
        ],
        getFeeds: ["GET /feeds"],
        getRepoSubscription: ["GET /repos/{owner}/{repo}/subscription"],
        getThread: ["GET /notifications/threads/{thread_id}"],
        getThreadSubscriptionForAuthenticatedUser: [
            "GET /notifications/threads/{thread_id}/subscription",
        ],
        listEventsForAuthenticatedUser: ["GET /users/{username}/events"],
        listNotificationsForAuthenticatedUser: ["GET /notifications"],
        listOrgEventsForAuthenticatedUser: [
            "GET /users/{username}/events/orgs/{org}",
        ],
        listPublicEvents: ["GET /events"],
        listPublicEventsForRepoNetwork: ["GET /networks/{owner}/{repo}/events"],
        listPublicEventsForUser: ["GET /users/{username}/events/public"],
        listPublicOrgEvents: ["GET /orgs/{org}/events"],
        listReceivedEventsForUser: ["GET /users/{username}/received_events"],
        listReceivedPublicEventsForUser: [
            "GET /users/{username}/received_events/public",
        ],
        listRepoEvents: ["GET /repos/{owner}/{repo}/events"],
        listRepoNotificationsForAuthenticatedUser: [
            "GET /repos/{owner}/{repo}/notifications",
        ],
        listReposStarredByAuthenticatedUser: ["GET /user/starred"],
        listReposStarredByUser: ["GET /users/{username}/starred"],
        listReposWatchedByUser: ["GET /users/{username}/subscriptions"],
        listStargazersForRepo: ["GET /repos/{owner}/{repo}/stargazers"],
        listWatchedReposForAuthenticatedUser: ["GET /user/subscriptions"],
        listWatchersForRepo: ["GET /repos/{owner}/{repo}/subscribers"],
        markNotificationsAsRead: ["PUT /notifications"],
        markRepoNotificationsAsRead: ["PUT /repos/{owner}/{repo}/notifications"],
        markThreadAsRead: ["PATCH /notifications/threads/{thread_id}"],
        setRepoSubscription: ["PUT /repos/{owner}/{repo}/subscription"],
        setThreadSubscription: [
            "PUT /notifications/threads/{thread_id}/subscription",
        ],
        starRepoForAuthenticatedUser: ["PUT /user/starred/{owner}/{repo}"],
        unstarRepoForAuthenticatedUser: ["DELETE /user/starred/{owner}/{repo}"],
    },
    apps: {
        addRepoToInstallation: [
            "PUT /user/installations/{installation_id}/repositories/{repository_id}",
        ],
        checkToken: ["POST /applications/{client_id}/token"],
        createContentAttachment: [
            "POST /content_references/{content_reference_id}/attachments",
            { mediaType: { previews: ["corsair"] } },
        ],
        createFromManifest: ["POST /app-manifests/{code}/conversions"],
        createInstallationAccessToken: [
            "POST /app/installations/{installation_id}/access_tokens",
        ],
        deleteAuthorization: ["DELETE /applications/{client_id}/grant"],
        deleteInstallation: ["DELETE /app/installations/{installation_id}"],
        deleteToken: ["DELETE /applications/{client_id}/token"],
        getAuthenticated: ["GET /app"],
        getBySlug: ["GET /apps/{app_slug}"],
        getInstallation: ["GET /app/installations/{installation_id}"],
        getOrgInstallation: ["GET /orgs/{org}/installation"],
        getRepoInstallation: ["GET /repos/{owner}/{repo}/installation"],
        getSubscriptionPlanForAccount: [
            "GET /marketplace_listing/accounts/{account_id}",
        ],
        getSubscriptionPlanForAccountStubbed: [
            "GET /marketplace_listing/stubbed/accounts/{account_id}",
        ],
        getUserInstallation: ["GET /users/{username}/installation"],
        getWebhookConfigForApp: ["GET /app/hook/config"],
        listAccountsForPlan: ["GET /marketplace_listing/plans/{plan_id}/accounts"],
        listAccountsForPlanStubbed: [
            "GET /marketplace_listing/stubbed/plans/{plan_id}/accounts",
        ],
        listInstallationReposForAuthenticatedUser: [
            "GET /user/installations/{installation_id}/repositories",
        ],
        listInstallations: ["GET /app/installations"],
        listInstallationsForAuthenticatedUser: ["GET /user/installations"],
        listPlans: ["GET /marketplace_listing/plans"],
        listPlansStubbed: ["GET /marketplace_listing/stubbed/plans"],
        listReposAccessibleToInstallation: ["GET /installation/repositories"],
        listSubscriptionsForAuthenticatedUser: ["GET /user/marketplace_purchases"],
        listSubscriptionsForAuthenticatedUserStubbed: [
            "GET /user/marketplace_purchases/stubbed",
        ],
        removeRepoFromInstallation: [
            "DELETE /user/installations/{installation_id}/repositories/{repository_id}",
        ],
        resetToken: ["PATCH /applications/{client_id}/token"],
        revokeInstallationAccessToken: ["DELETE /installation/token"],
        scopeToken: ["POST /applications/{client_id}/token/scoped"],
        suspendInstallation: ["PUT /app/installations/{installation_id}/suspended"],
        unsuspendInstallation: [
            "DELETE /app/installations/{installation_id}/suspended",
        ],
        updateWebhookConfigForApp: ["PATCH /app/hook/config"],
    },
    billing: {
        getGithubActionsBillingOrg: ["GET /orgs/{org}/settings/billing/actions"],
        getGithubActionsBillingUser: [
            "GET /users/{username}/settings/billing/actions",
        ],
        getGithubPackagesBillingOrg: ["GET /orgs/{org}/settings/billing/packages"],
        getGithubPackagesBillingUser: [
            "GET /users/{username}/settings/billing/packages",
        ],
        getSharedStorageBillingOrg: [
            "GET /orgs/{org}/settings/billing/shared-storage",
        ],
        getSharedStorageBillingUser: [
            "GET /users/{username}/settings/billing/shared-storage",
        ],
    },
    checks: {
        create: ["POST /repos/{owner}/{repo}/check-runs"],
        createSuite: ["POST /repos/{owner}/{repo}/check-suites"],
        get: ["GET /repos/{owner}/{repo}/check-runs/{check_run_id}"],
        getSuite: ["GET /repos/{owner}/{repo}/check-suites/{check_suite_id}"],
        listAnnotations: [
            "GET /repos/{owner}/{repo}/check-runs/{check_run_id}/annotations",
        ],
        listForRef: ["GET /repos/{owner}/{repo}/commits/{ref}/check-runs"],
        listForSuite: [
            "GET /repos/{owner}/{repo}/check-suites/{check_suite_id}/check-runs",
        ],
        listSuitesForRef: ["GET /repos/{owner}/{repo}/commits/{ref}/check-suites"],
        rerequestSuite: [
            "POST /repos/{owner}/{repo}/check-suites/{check_suite_id}/rerequest",
        ],
        setSuitesPreferences: [
            "PATCH /repos/{owner}/{repo}/check-suites/preferences",
        ],
        update: ["PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}"],
    },
    codeScanning: {
        deleteAnalysis: [
            "DELETE /repos/{owner}/{repo}/code-scanning/analyses/{analysis_id}{?confirm_delete}",
        ],
        getAlert: [
            "GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}",
            {},
            { renamedParameters: { alert_id: "alert_number" } },
        ],
        getAnalysis: [
            "GET /repos/{owner}/{repo}/code-scanning/analyses/{analysis_id}",
        ],
        getSarif: ["GET /repos/{owner}/{repo}/code-scanning/sarifs/{sarif_id}"],
        listAlertsForRepo: ["GET /repos/{owner}/{repo}/code-scanning/alerts"],
        listAlertsInstances: [
            "GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/instances",
        ],
        listRecentAnalyses: ["GET /repos/{owner}/{repo}/code-scanning/analyses"],
        updateAlert: [
            "PATCH /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}",
        ],
        uploadSarif: ["POST /repos/{owner}/{repo}/code-scanning/sarifs"],
    },
    codesOfConduct: {
        getAllCodesOfConduct: [
            "GET /codes_of_conduct",
            { mediaType: { previews: ["scarlet-witch"] } },
        ],
        getConductCode: [
            "GET /codes_of_conduct/{key}",
            { mediaType: { previews: ["scarlet-witch"] } },
        ],
        getForRepo: [
            "GET /repos/{owner}/{repo}/community/code_of_conduct",
            { mediaType: { previews: ["scarlet-witch"] } },
        ],
    },
    emojis: { get: ["GET /emojis"] },
    enterpriseAdmin: {
        disableSelectedOrganizationGithubActionsEnterprise: [
            "DELETE /enterprises/{enterprise}/actions/permissions/organizations/{org_id}",
        ],
        enableSelectedOrganizationGithubActionsEnterprise: [
            "PUT /enterprises/{enterprise}/actions/permissions/organizations/{org_id}",
        ],
        getAllowedActionsEnterprise: [
            "GET /enterprises/{enterprise}/actions/permissions/selected-actions",
        ],
        getGithubActionsPermissionsEnterprise: [
            "GET /enterprises/{enterprise}/actions/permissions",
        ],
        listSelectedOrganizationsEnabledGithubActionsEnterprise: [
            "GET /enterprises/{enterprise}/actions/permissions/organizations",
        ],
        setAllowedActionsEnterprise: [
            "PUT /enterprises/{enterprise}/actions/permissions/selected-actions",
        ],
        setGithubActionsPermissionsEnterprise: [
            "PUT /enterprises/{enterprise}/actions/permissions",
        ],
        setSelectedOrganizationsEnabledGithubActionsEnterprise: [
            "PUT /enterprises/{enterprise}/actions/permissions/organizations",
        ],
    },
    gists: {
        checkIsStarred: ["GET /gists/{gist_id}/star"],
        create: ["POST /gists"],
        createComment: ["POST /gists/{gist_id}/comments"],
        delete: ["DELETE /gists/{gist_id}"],
        deleteComment: ["DELETE /gists/{gist_id}/comments/{comment_id}"],
        fork: ["POST /gists/{gist_id}/forks"],
        get: ["GET /gists/{gist_id}"],
        getComment: ["GET /gists/{gist_id}/comments/{comment_id}"],
        getRevision: ["GET /gists/{gist_id}/{sha}"],
        list: ["GET /gists"],
        listComments: ["GET /gists/{gist_id}/comments"],
        listCommits: ["GET /gists/{gist_id}/commits"],
        listForUser: ["GET /users/{username}/gists"],
        listForks: ["GET /gists/{gist_id}/forks"],
        listPublic: ["GET /gists/public"],
        listStarred: ["GET /gists/starred"],
        star: ["PUT /gists/{gist_id}/star"],
        unstar: ["DELETE /gists/{gist_id}/star"],
        update: ["PATCH /gists/{gist_id}"],
        updateComment: ["PATCH /gists/{gist_id}/comments/{comment_id}"],
    },
    git: {
        createBlob: ["POST /repos/{owner}/{repo}/git/blobs"],
        createCommit: ["POST /repos/{owner}/{repo}/git/commits"],
        createRef: ["POST /repos/{owner}/{repo}/git/refs"],
        createTag: ["POST /repos/{owner}/{repo}/git/tags"],
        createTree: ["POST /repos/{owner}/{repo}/git/trees"],
        deleteRef: ["DELETE /repos/{owner}/{repo}/git/refs/{ref}"],
        getBlob: ["GET /repos/{owner}/{repo}/git/blobs/{file_sha}"],
        getCommit: ["GET /repos/{owner}/{repo}/git/commits/{commit_sha}"],
        getRef: ["GET /repos/{owner}/{repo}/git/ref/{ref}"],
        getTag: ["GET /repos/{owner}/{repo}/git/tags/{tag_sha}"],
        getTree: ["GET /repos/{owner}/{repo}/git/trees/{tree_sha}"],
        listMatchingRefs: ["GET /repos/{owner}/{repo}/git/matching-refs/{ref}"],
        updateRef: ["PATCH /repos/{owner}/{repo}/git/refs/{ref}"],
    },
    gitignore: {
        getAllTemplates: ["GET /gitignore/templates"],
        getTemplate: ["GET /gitignore/templates/{name}"],
    },
    interactions: {
        getRestrictionsForAuthenticatedUser: ["GET /user/interaction-limits"],
        getRestrictionsForOrg: ["GET /orgs/{org}/interaction-limits"],
        getRestrictionsForRepo: ["GET /repos/{owner}/{repo}/interaction-limits"],
        getRestrictionsForYourPublicRepos: [
            "GET /user/interaction-limits",
            {},
            { renamed: ["interactions", "getRestrictionsForAuthenticatedUser"] },
        ],
        removeRestrictionsForAuthenticatedUser: ["DELETE /user/interaction-limits"],
        removeRestrictionsForOrg: ["DELETE /orgs/{org}/interaction-limits"],
        removeRestrictionsForRepo: [
            "DELETE /repos/{owner}/{repo}/interaction-limits",
        ],
        removeRestrictionsForYourPublicRepos: [
            "DELETE /user/interaction-limits",
            {},
            { renamed: ["interactions", "removeRestrictionsForAuthenticatedUser"] },
        ],
        setRestrictionsForAuthenticatedUser: ["PUT /user/interaction-limits"],
        setRestrictionsForOrg: ["PUT /orgs/{org}/interaction-limits"],
        setRestrictionsForRepo: ["PUT /repos/{owner}/{repo}/interaction-limits"],
        setRestrictionsForYourPublicRepos: [
            "PUT /user/interaction-limits",
            {},
            { renamed: ["interactions", "setRestrictionsForAuthenticatedUser"] },
        ],
    },
    issues: {
        addAssignees: [
            "POST /repos/{owner}/{repo}/issues/{issue_number}/assignees",
        ],
        addLabels: ["POST /repos/{owner}/{repo}/issues/{issue_number}/labels"],
        checkUserCanBeAssigned: ["GET /repos/{owner}/{repo}/assignees/{assignee}"],
        create: ["POST /repos/{owner}/{repo}/issues"],
        createComment: [
            "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
        ],
        createLabel: ["POST /repos/{owner}/{repo}/labels"],
        createMilestone: ["POST /repos/{owner}/{repo}/milestones"],
        deleteComment: [
            "DELETE /repos/{owner}/{repo}/issues/comments/{comment_id}",
        ],
        deleteLabel: ["DELETE /repos/{owner}/{repo}/labels/{name}"],
        deleteMilestone: [
            "DELETE /repos/{owner}/{repo}/milestones/{milestone_number}",
        ],
        get: ["GET /repos/{owner}/{repo}/issues/{issue_number}"],
        getComment: ["GET /repos/{owner}/{repo}/issues/comments/{comment_id}"],
        getEvent: ["GET /repos/{owner}/{repo}/issues/events/{event_id}"],
        getLabel: ["GET /repos/{owner}/{repo}/labels/{name}"],
        getMilestone: ["GET /repos/{owner}/{repo}/milestones/{milestone_number}"],
        list: ["GET /issues"],
        listAssignees: ["GET /repos/{owner}/{repo}/assignees"],
        listComments: ["GET /repos/{owner}/{repo}/issues/{issue_number}/comments"],
        listCommentsForRepo: ["GET /repos/{owner}/{repo}/issues/comments"],
        listEvents: ["GET /repos/{owner}/{repo}/issues/{issue_number}/events"],
        listEventsForRepo: ["GET /repos/{owner}/{repo}/issues/events"],
        listEventsForTimeline: [
            "GET /repos/{owner}/{repo}/issues/{issue_number}/timeline",
            { mediaType: { previews: ["mockingbird"] } },
        ],
        listForAuthenticatedUser: ["GET /user/issues"],
        listForOrg: ["GET /orgs/{org}/issues"],
        listForRepo: ["GET /repos/{owner}/{repo}/issues"],
        listLabelsForMilestone: [
            "GET /repos/{owner}/{repo}/milestones/{milestone_number}/labels",
        ],
        listLabelsForRepo: ["GET /repos/{owner}/{repo}/labels"],
        listLabelsOnIssue: [
            "GET /repos/{owner}/{repo}/issues/{issue_number}/labels",
        ],
        listMilestones: ["GET /repos/{owner}/{repo}/milestones"],
        lock: ["PUT /repos/{owner}/{repo}/issues/{issue_number}/lock"],
        removeAllLabels: [
            "DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels",
        ],
        removeAssignees: [
            "DELETE /repos/{owner}/{repo}/issues/{issue_number}/assignees",
        ],
        removeLabel: [
            "DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{name}",
        ],
        setLabels: ["PUT /repos/{owner}/{repo}/issues/{issue_number}/labels"],
        unlock: ["DELETE /repos/{owner}/{repo}/issues/{issue_number}/lock"],
        update: ["PATCH /repos/{owner}/{repo}/issues/{issue_number}"],
        updateComment: ["PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}"],
        updateLabel: ["PATCH /repos/{owner}/{repo}/labels/{name}"],
        updateMilestone: [
            "PATCH /repos/{owner}/{repo}/milestones/{milestone_number}",
        ],
    },
    licenses: {
        get: ["GET /licenses/{license}"],
        getAllCommonlyUsed: ["GET /licenses"],
        getForRepo: ["GET /repos/{owner}/{repo}/license"],
    },
    markdown: {
        render: ["POST /markdown"],
        renderRaw: [
            "POST /markdown/raw",
            { headers: { "content-type": "text/plain; charset=utf-8" } },
        ],
    },
    meta: {
        get: ["GET /meta"],
        getOctocat: ["GET /octocat"],
        getZen: ["GET /zen"],
        root: ["GET /"],
    },
    migrations: {
        cancelImport: ["DELETE /repos/{owner}/{repo}/import"],
        deleteArchiveForAuthenticatedUser: [
            "DELETE /user/migrations/{migration_id}/archive",
            { mediaType: { previews: ["wyandotte"] } },
        ],
        deleteArchiveForOrg: [
            "DELETE /orgs/{org}/migrations/{migration_id}/archive",
            { mediaType: { previews: ["wyandotte"] } },
        ],
        downloadArchiveForOrg: [
            "GET /orgs/{org}/migrations/{migration_id}/archive",
            { mediaType: { previews: ["wyandotte"] } },
        ],
        getArchiveForAuthenticatedUser: [
            "GET /user/migrations/{migration_id}/archive",
            { mediaType: { previews: ["wyandotte"] } },
        ],
        getCommitAuthors: ["GET /repos/{owner}/{repo}/import/authors"],
        getImportStatus: ["GET /repos/{owner}/{repo}/import"],
        getLargeFiles: ["GET /repos/{owner}/{repo}/import/large_files"],
        getStatusForAuthenticatedUser: [
            "GET /user/migrations/{migration_id}",
            { mediaType: { previews: ["wyandotte"] } },
        ],
        getStatusForOrg: [
            "GET /orgs/{org}/migrations/{migration_id}",
            { mediaType: { previews: ["wyandotte"] } },
        ],
        listForAuthenticatedUser: [
            "GET /user/migrations",
            { mediaType: { previews: ["wyandotte"] } },
        ],
        listForOrg: [
            "GET /orgs/{org}/migrations",
            { mediaType: { previews: ["wyandotte"] } },
        ],
        listReposForOrg: [
            "GET /orgs/{org}/migrations/{migration_id}/repositories",
            { mediaType: { previews: ["wyandotte"] } },
        ],
        listReposForUser: [
            "GET /user/migrations/{migration_id}/repositories",
            { mediaType: { previews: ["wyandotte"] } },
        ],
        mapCommitAuthor: ["PATCH /repos/{owner}/{repo}/import/authors/{author_id}"],
        setLfsPreference: ["PATCH /repos/{owner}/{repo}/import/lfs"],
        startForAuthenticatedUser: ["POST /user/migrations"],
        startForOrg: ["POST /orgs/{org}/migrations"],
        startImport: ["PUT /repos/{owner}/{repo}/import"],
        unlockRepoForAuthenticatedUser: [
            "DELETE /user/migrations/{migration_id}/repos/{repo_name}/lock",
            { mediaType: { previews: ["wyandotte"] } },
        ],
        unlockRepoForOrg: [
            "DELETE /orgs/{org}/migrations/{migration_id}/repos/{repo_name}/lock",
            { mediaType: { previews: ["wyandotte"] } },
        ],
        updateImport: ["PATCH /repos/{owner}/{repo}/import"],
    },
    orgs: {
        blockUser: ["PUT /orgs/{org}/blocks/{username}"],
        cancelInvitation: ["DELETE /orgs/{org}/invitations/{invitation_id}"],
        checkBlockedUser: ["GET /orgs/{org}/blocks/{username}"],
        checkMembershipForUser: ["GET /orgs/{org}/members/{username}"],
        checkPublicMembershipForUser: ["GET /orgs/{org}/public_members/{username}"],
        convertMemberToOutsideCollaborator: [
            "PUT /orgs/{org}/outside_collaborators/{username}",
        ],
        createInvitation: ["POST /orgs/{org}/invitations"],
        createWebhook: ["POST /orgs/{org}/hooks"],
        deleteWebhook: ["DELETE /orgs/{org}/hooks/{hook_id}"],
        get: ["GET /orgs/{org}"],
        getMembershipForAuthenticatedUser: ["GET /user/memberships/orgs/{org}"],
        getMembershipForUser: ["GET /orgs/{org}/memberships/{username}"],
        getWebhook: ["GET /orgs/{org}/hooks/{hook_id}"],
        getWebhookConfigForOrg: ["GET /orgs/{org}/hooks/{hook_id}/config"],
        list: ["GET /organizations"],
        listAppInstallations: ["GET /orgs/{org}/installations"],
        listBlockedUsers: ["GET /orgs/{org}/blocks"],
        listFailedInvitations: ["GET /orgs/{org}/failed_invitations"],
        listForAuthenticatedUser: ["GET /user/orgs"],
        listForUser: ["GET /users/{username}/orgs"],
        listInvitationTeams: ["GET /orgs/{org}/invitations/{invitation_id}/teams"],
        listMembers: ["GET /orgs/{org}/members"],
        listMembershipsForAuthenticatedUser: ["GET /user/memberships/orgs"],
        listOutsideCollaborators: ["GET /orgs/{org}/outside_collaborators"],
        listPendingInvitations: ["GET /orgs/{org}/invitations"],
        listPublicMembers: ["GET /orgs/{org}/public_members"],
        listWebhooks: ["GET /orgs/{org}/hooks"],
        pingWebhook: ["POST /orgs/{org}/hooks/{hook_id}/pings"],
        removeMember: ["DELETE /orgs/{org}/members/{username}"],
        removeMembershipForUser: ["DELETE /orgs/{org}/memberships/{username}"],
        removeOutsideCollaborator: [
            "DELETE /orgs/{org}/outside_collaborators/{username}",
        ],
        removePublicMembershipForAuthenticatedUser: [
            "DELETE /orgs/{org}/public_members/{username}",
        ],
        setMembershipForUser: ["PUT /orgs/{org}/memberships/{username}"],
        setPublicMembershipForAuthenticatedUser: [
            "PUT /orgs/{org}/public_members/{username}",
        ],
        unblockUser: ["DELETE /orgs/{org}/blocks/{username}"],
        update: ["PATCH /orgs/{org}"],
        updateMembershipForAuthenticatedUser: [
            "PATCH /user/memberships/orgs/{org}",
        ],
        updateWebhook: ["PATCH /orgs/{org}/hooks/{hook_id}"],
        updateWebhookConfigForOrg: ["PATCH /orgs/{org}/hooks/{hook_id}/config"],
    },
    packages: {
        deletePackageForAuthenticatedUser: [
            "DELETE /user/packages/{package_type}/{package_name}",
        ],
        deletePackageForOrg: [
            "DELETE /orgs/{org}/packages/{package_type}/{package_name}",
        ],
        deletePackageVersionForAuthenticatedUser: [
            "DELETE /user/packages/{package_type}/{package_name}/versions/{package_version_id}",
        ],
        deletePackageVersionForOrg: [
            "DELETE /orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}",
        ],
        getAllPackageVersionsForAPackageOwnedByAnOrg: [
            "GET /orgs/{org}/packages/{package_type}/{package_name}/versions",
            {},
            { renamed: ["packages", "getAllPackageVersionsForPackageOwnedByOrg"] },
        ],
        getAllPackageVersionsForAPackageOwnedByTheAuthenticatedUser: [
            "GET /user/packages/{package_type}/{package_name}/versions",
            {},
            {
                renamed: [
                    "packages",
                    "getAllPackageVersionsForPackageOwnedByAuthenticatedUser",
                ],
            },
        ],
        getAllPackageVersionsForPackageOwnedByAuthenticatedUser: [
            "GET /user/packages/{package_type}/{package_name}/versions",
        ],
        getAllPackageVersionsForPackageOwnedByOrg: [
            "GET /orgs/{org}/packages/{package_type}/{package_name}/versions",
        ],
        getAllPackageVersionsForPackageOwnedByUser: [
            "GET /users/{username}/packages/{package_type}/{package_name}/versions",
        ],
        getPackageForAuthenticatedUser: [
            "GET /user/packages/{package_type}/{package_name}",
        ],
        getPackageForOrganization: [
            "GET /orgs/{org}/packages/{package_type}/{package_name}",
        ],
        getPackageForUser: [
            "GET /users/{username}/packages/{package_type}/{package_name}",
        ],
        getPackageVersionForAuthenticatedUser: [
            "GET /user/packages/{package_type}/{package_name}/versions/{package_version_id}",
        ],
        getPackageVersionForOrganization: [
            "GET /orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}",
        ],
        getPackageVersionForUser: [
            "GET /users/{username}/packages/{package_type}/{package_name}/versions/{package_version_id}",
        ],
        restorePackageForAuthenticatedUser: [
            "POST /user/packages/{package_type}/{package_name}/restore{?token}",
        ],
        restorePackageForOrg: [
            "POST /orgs/{org}/packages/{package_type}/{package_name}/restore{?token}",
        ],
        restorePackageVersionForAuthenticatedUser: [
            "POST /user/packages/{package_type}/{package_name}/versions/{package_version_id}/restore",
        ],
        restorePackageVersionForOrg: [
            "POST /orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}/restore",
        ],
    },
    projects: {
        addCollaborator: [
            "PUT /projects/{project_id}/collaborators/{username}",
            { mediaType: { previews: ["inertia"] } },
        ],
        createCard: [
            "POST /projects/columns/{column_id}/cards",
            { mediaType: { previews: ["inertia"] } },
        ],
        createColumn: [
            "POST /projects/{project_id}/columns",
            { mediaType: { previews: ["inertia"] } },
        ],
        createForAuthenticatedUser: [
            "POST /user/projects",
            { mediaType: { previews: ["inertia"] } },
        ],
        createForOrg: [
            "POST /orgs/{org}/projects",
            { mediaType: { previews: ["inertia"] } },
        ],
        createForRepo: [
            "POST /repos/{owner}/{repo}/projects",
            { mediaType: { previews: ["inertia"] } },
        ],
        delete: [
            "DELETE /projects/{project_id}",
            { mediaType: { previews: ["inertia"] } },
        ],
        deleteCard: [
            "DELETE /projects/columns/cards/{card_id}",
            { mediaType: { previews: ["inertia"] } },
        ],
        deleteColumn: [
            "DELETE /projects/columns/{column_id}",
            { mediaType: { previews: ["inertia"] } },
        ],
        get: [
            "GET /projects/{project_id}",
            { mediaType: { previews: ["inertia"] } },
        ],
        getCard: [
            "GET /projects/columns/cards/{card_id}",
            { mediaType: { previews: ["inertia"] } },
        ],
        getColumn: [
            "GET /projects/columns/{column_id}",
            { mediaType: { previews: ["inertia"] } },
        ],
        getPermissionForUser: [
            "GET /projects/{project_id}/collaborators/{username}/permission",
            { mediaType: { previews: ["inertia"] } },
        ],
        listCards: [
            "GET /projects/columns/{column_id}/cards",
            { mediaType: { previews: ["inertia"] } },
        ],
        listCollaborators: [
            "GET /projects/{project_id}/collaborators",
            { mediaType: { previews: ["inertia"] } },
        ],
        listColumns: [
            "GET /projects/{project_id}/columns",
            { mediaType: { previews: ["inertia"] } },
        ],
        listForOrg: [
            "GET /orgs/{org}/projects",
            { mediaType: { previews: ["inertia"] } },
        ],
        listForRepo: [
            "GET /repos/{owner}/{repo}/projects",
            { mediaType: { previews: ["inertia"] } },
        ],
        listForUser: [
            "GET /users/{username}/projects",
            { mediaType: { previews: ["inertia"] } },
        ],
        moveCard: [
            "POST /projects/columns/cards/{card_id}/moves",
            { mediaType: { previews: ["inertia"] } },
        ],
        moveColumn: [
            "POST /projects/columns/{column_id}/moves",
            { mediaType: { previews: ["inertia"] } },
        ],
        removeCollaborator: [
            "DELETE /projects/{project_id}/collaborators/{username}",
            { mediaType: { previews: ["inertia"] } },
        ],
        update: [
            "PATCH /projects/{project_id}",
            { mediaType: { previews: ["inertia"] } },
        ],
        updateCard: [
            "PATCH /projects/columns/cards/{card_id}",
            { mediaType: { previews: ["inertia"] } },
        ],
        updateColumn: [
            "PATCH /projects/columns/{column_id}",
            { mediaType: { previews: ["inertia"] } },
        ],
    },
    pulls: {
        checkIfMerged: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/merge"],
        create: ["POST /repos/{owner}/{repo}/pulls"],
        createReplyForReviewComment: [
            "POST /repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies",
        ],
        createReview: ["POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews"],
        createReviewComment: [
            "POST /repos/{owner}/{repo}/pulls/{pull_number}/comments",
        ],
        deletePendingReview: [
            "DELETE /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}",
        ],
        deleteReviewComment: [
            "DELETE /repos/{owner}/{repo}/pulls/comments/{comment_id}",
        ],
        dismissReview: [
            "PUT /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/dismissals",
        ],
        get: ["GET /repos/{owner}/{repo}/pulls/{pull_number}"],
        getReview: [
            "GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}",
        ],
        getReviewComment: ["GET /repos/{owner}/{repo}/pulls/comments/{comment_id}"],
        list: ["GET /repos/{owner}/{repo}/pulls"],
        listCommentsForReview: [
            "GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/comments",
        ],
        listCommits: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/commits"],
        listFiles: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/files"],
        listRequestedReviewers: [
            "GET /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers",
        ],
        listReviewComments: [
            "GET /repos/{owner}/{repo}/pulls/{pull_number}/comments",
        ],
        listReviewCommentsForRepo: ["GET /repos/{owner}/{repo}/pulls/comments"],
        listReviews: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews"],
        merge: ["PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge"],
        removeRequestedReviewers: [
            "DELETE /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers",
        ],
        requestReviewers: [
            "POST /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers",
        ],
        submitReview: [
            "POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/events",
        ],
        update: ["PATCH /repos/{owner}/{repo}/pulls/{pull_number}"],
        updateBranch: [
            "PUT /repos/{owner}/{repo}/pulls/{pull_number}/update-branch",
            { mediaType: { previews: ["lydian"] } },
        ],
        updateReview: [
            "PUT /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}",
        ],
        updateReviewComment: [
            "PATCH /repos/{owner}/{repo}/pulls/comments/{comment_id}",
        ],
    },
    rateLimit: { get: ["GET /rate_limit"] },
    reactions: {
        createForCommitComment: [
            "POST /repos/{owner}/{repo}/comments/{comment_id}/reactions",
            { mediaType: { previews: ["squirrel-girl"] } },
        ],
        createForIssue: [
            "POST /repos/{owner}/{repo}/issues/{issue_number}/reactions",
            { mediaType: { previews: ["squirrel-girl"] } },
        ],
        createForIssueComment: [
            "POST /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions",
            { mediaType: { previews: ["squirrel-girl"] } },
        ],
        createForPullRequestReviewComment: [
            "POST /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions",
            { mediaType: { previews: ["squirrel-girl"] } },
        ],
        createForTeamDiscussionCommentInOrg: [
            "POST /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions",
            { mediaType: { previews: ["squirrel-girl"] } },
        ],
        createForTeamDiscussionInOrg: [
            "POST /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions",
            { mediaType: { previews: ["squirrel-girl"] } },
        ],
        deleteForCommitComment: [
            "DELETE /repos/{owner}/{repo}/comments/{comment_id}/reactions/{reaction_id}",
            { mediaType: { previews: ["squirrel-girl"] } },
        ],
        deleteForIssue: [
            "DELETE /repos/{owner}/{repo}/issues/{issue_number}/reactions/{reaction_id}",
            { mediaType: { previews: ["squirrel-girl"] } },
        ],
        deleteForIssueComment: [
            "DELETE /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions/{reaction_id}",
            { mediaType: { previews: ["squirrel-girl"] } },
        ],
        deleteForPullRequestComment: [
            "DELETE /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions/{reaction_id}",
            { mediaType: { previews: ["squirrel-girl"] } },
        ],
        deleteForTeamDiscussion: [
            "DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions/{reaction_id}",
            { mediaType: { previews: ["squirrel-girl"] } },
        ],
        deleteForTeamDiscussionComment: [
            "DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions/{reaction_id}",
            { mediaType: { previews: ["squirrel-girl"] } },
        ],
        deleteLegacy: [
            "DELETE /reactions/{reaction_id}",
            { mediaType: { previews: ["squirrel-girl"] } },
            {
                deprecated: "octokit.rest.reactions.deleteLegacy() is deprecated, see https://docs.github.com/rest/reference/reactions/#delete-a-reaction-legacy",
            },
        ],
        listForCommitComment: [
            "GET /repos/{owner}/{repo}/comments/{comment_id}/reactions",
            { mediaType: { previews: ["squirrel-girl"] } },
        ],
        listForIssue: [
            "GET /repos/{owner}/{repo}/issues/{issue_number}/reactions",
            { mediaType: { previews: ["squirrel-girl"] } },
        ],
        listForIssueComment: [
            "GET /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions",
            { mediaType: { previews: ["squirrel-girl"] } },
        ],
        listForPullRequestReviewComment: [
            "GET /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions",
            { mediaType: { previews: ["squirrel-girl"] } },
        ],
        listForTeamDiscussionCommentInOrg: [
            "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions",
            { mediaType: { previews: ["squirrel-girl"] } },
        ],
        listForTeamDiscussionInOrg: [
            "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions",
            { mediaType: { previews: ["squirrel-girl"] } },
        ],
    },
    repos: {
        acceptInvitation: ["PATCH /user/repository_invitations/{invitation_id}"],
        addAppAccessRestrictions: [
            "POST /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps",
            {},
            { mapToData: "apps" },
        ],
        addCollaborator: ["PUT /repos/{owner}/{repo}/collaborators/{username}"],
        addStatusCheckContexts: [
            "POST /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts",
            {},
            { mapToData: "contexts" },
        ],
        addTeamAccessRestrictions: [
            "POST /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams",
            {},
            { mapToData: "teams" },
        ],
        addUserAccessRestrictions: [
            "POST /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users",
            {},
            { mapToData: "users" },
        ],
        checkCollaborator: ["GET /repos/{owner}/{repo}/collaborators/{username}"],
        checkVulnerabilityAlerts: [
            "GET /repos/{owner}/{repo}/vulnerability-alerts",
            { mediaType: { previews: ["dorian"] } },
        ],
        compareCommits: ["GET /repos/{owner}/{repo}/compare/{base}...{head}"],
        createCommitComment: [
            "POST /repos/{owner}/{repo}/commits/{commit_sha}/comments",
        ],
        createCommitSignatureProtection: [
            "POST /repos/{owner}/{repo}/branches/{branch}/protection/required_signatures",
            { mediaType: { previews: ["zzzax"] } },
        ],
        createCommitStatus: ["POST /repos/{owner}/{repo}/statuses/{sha}"],
        createDeployKey: ["POST /repos/{owner}/{repo}/keys"],
        createDeployment: ["POST /repos/{owner}/{repo}/deployments"],
        createDeploymentStatus: [
            "POST /repos/{owner}/{repo}/deployments/{deployment_id}/statuses",
        ],
        createDispatchEvent: ["POST /repos/{owner}/{repo}/dispatches"],
        createForAuthenticatedUser: ["POST /user/repos"],
        createFork: ["POST /repos/{owner}/{repo}/forks"],
        createInOrg: ["POST /orgs/{org}/repos"],
        createOrUpdateEnvironment: [
            "PUT /repos/{owner}/{repo}/environments/{environment_name}",
        ],
        createOrUpdateFileContents: ["PUT /repos/{owner}/{repo}/contents/{path}"],
        createPagesSite: [
            "POST /repos/{owner}/{repo}/pages",
            { mediaType: { previews: ["switcheroo"] } },
        ],
        createRelease: ["POST /repos/{owner}/{repo}/releases"],
        createUsingTemplate: [
            "POST /repos/{template_owner}/{template_repo}/generate",
            { mediaType: { previews: ["baptiste"] } },
        ],
        createWebhook: ["POST /repos/{owner}/{repo}/hooks"],
        declineInvitation: ["DELETE /user/repository_invitations/{invitation_id}"],
        delete: ["DELETE /repos/{owner}/{repo}"],
        deleteAccessRestrictions: [
            "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions",
        ],
        deleteAdminBranchProtection: [
            "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins",
        ],
        deleteAnEnvironment: [
            "DELETE /repos/{owner}/{repo}/environments/{environment_name}",
        ],
        deleteBranchProtection: [
            "DELETE /repos/{owner}/{repo}/branches/{branch}/protection",
        ],
        deleteCommitComment: ["DELETE /repos/{owner}/{repo}/comments/{comment_id}"],
        deleteCommitSignatureProtection: [
            "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_signatures",
            { mediaType: { previews: ["zzzax"] } },
        ],
        deleteDeployKey: ["DELETE /repos/{owner}/{repo}/keys/{key_id}"],
        deleteDeployment: [
            "DELETE /repos/{owner}/{repo}/deployments/{deployment_id}",
        ],
        deleteFile: ["DELETE /repos/{owner}/{repo}/contents/{path}"],
        deleteInvitation: [
            "DELETE /repos/{owner}/{repo}/invitations/{invitation_id}",
        ],
        deletePagesSite: [
            "DELETE /repos/{owner}/{repo}/pages",
            { mediaType: { previews: ["switcheroo"] } },
        ],
        deletePullRequestReviewProtection: [
            "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews",
        ],
        deleteRelease: ["DELETE /repos/{owner}/{repo}/releases/{release_id}"],
        deleteReleaseAsset: [
            "DELETE /repos/{owner}/{repo}/releases/assets/{asset_id}",
        ],
        deleteWebhook: ["DELETE /repos/{owner}/{repo}/hooks/{hook_id}"],
        disableAutomatedSecurityFixes: [
            "DELETE /repos/{owner}/{repo}/automated-security-fixes",
            { mediaType: { previews: ["london"] } },
        ],
        disableVulnerabilityAlerts: [
            "DELETE /repos/{owner}/{repo}/vulnerability-alerts",
            { mediaType: { previews: ["dorian"] } },
        ],
        downloadArchive: [
            "GET /repos/{owner}/{repo}/zipball/{ref}",
            {},
            { renamed: ["repos", "downloadZipballArchive"] },
        ],
        downloadTarballArchive: ["GET /repos/{owner}/{repo}/tarball/{ref}"],
        downloadZipballArchive: ["GET /repos/{owner}/{repo}/zipball/{ref}"],
        enableAutomatedSecurityFixes: [
            "PUT /repos/{owner}/{repo}/automated-security-fixes",
            { mediaType: { previews: ["london"] } },
        ],
        enableVulnerabilityAlerts: [
            "PUT /repos/{owner}/{repo}/vulnerability-alerts",
            { mediaType: { previews: ["dorian"] } },
        ],
        get: ["GET /repos/{owner}/{repo}"],
        getAccessRestrictions: [
            "GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions",
        ],
        getAdminBranchProtection: [
            "GET /repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins",
        ],
        getAllEnvironments: ["GET /repos/{owner}/{repo}/environments"],
        getAllStatusCheckContexts: [
            "GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts",
        ],
        getAllTopics: [
            "GET /repos/{owner}/{repo}/topics",
            { mediaType: { previews: ["mercy"] } },
        ],
        getAppsWithAccessToProtectedBranch: [
            "GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps",
        ],
        getBranch: ["GET /repos/{owner}/{repo}/branches/{branch}"],
        getBranchProtection: [
            "GET /repos/{owner}/{repo}/branches/{branch}/protection",
        ],
        getClones: ["GET /repos/{owner}/{repo}/traffic/clones"],
        getCodeFrequencyStats: ["GET /repos/{owner}/{repo}/stats/code_frequency"],
        getCollaboratorPermissionLevel: [
            "GET /repos/{owner}/{repo}/collaborators/{username}/permission",
        ],
        getCombinedStatusForRef: ["GET /repos/{owner}/{repo}/commits/{ref}/status"],
        getCommit: ["GET /repos/{owner}/{repo}/commits/{ref}"],
        getCommitActivityStats: ["GET /repos/{owner}/{repo}/stats/commit_activity"],
        getCommitComment: ["GET /repos/{owner}/{repo}/comments/{comment_id}"],
        getCommitSignatureProtection: [
            "GET /repos/{owner}/{repo}/branches/{branch}/protection/required_signatures",
            { mediaType: { previews: ["zzzax"] } },
        ],
        getCommunityProfileMetrics: ["GET /repos/{owner}/{repo}/community/profile"],
        getContent: ["GET /repos/{owner}/{repo}/contents/{path}"],
        getContributorsStats: ["GET /repos/{owner}/{repo}/stats/contributors"],
        getDeployKey: ["GET /repos/{owner}/{repo}/keys/{key_id}"],
        getDeployment: ["GET /repos/{owner}/{repo}/deployments/{deployment_id}"],
        getDeploymentStatus: [
            "GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses/{status_id}",
        ],
        getEnvironment: [
            "GET /repos/{owner}/{repo}/environments/{environment_name}",
        ],
        getLatestPagesBuild: ["GET /repos/{owner}/{repo}/pages/builds/latest"],
        getLatestRelease: ["GET /repos/{owner}/{repo}/releases/latest"],
        getPages: ["GET /repos/{owner}/{repo}/pages"],
        getPagesBuild: ["GET /repos/{owner}/{repo}/pages/builds/{build_id}"],
        getParticipationStats: ["GET /repos/{owner}/{repo}/stats/participation"],
        getPullRequestReviewProtection: [
            "GET /repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews",
        ],
        getPunchCardStats: ["GET /repos/{owner}/{repo}/stats/punch_card"],
        getReadme: ["GET /repos/{owner}/{repo}/readme"],
        getReadmeInDirectory: ["GET /repos/{owner}/{repo}/readme/{dir}"],
        getRelease: ["GET /repos/{owner}/{repo}/releases/{release_id}"],
        getReleaseAsset: ["GET /repos/{owner}/{repo}/releases/assets/{asset_id}"],
        getReleaseByTag: ["GET /repos/{owner}/{repo}/releases/tags/{tag}"],
        getStatusChecksProtection: [
            "GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks",
        ],
        getTeamsWithAccessToProtectedBranch: [
            "GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams",
        ],
        getTopPaths: ["GET /repos/{owner}/{repo}/traffic/popular/paths"],
        getTopReferrers: ["GET /repos/{owner}/{repo}/traffic/popular/referrers"],
        getUsersWithAccessToProtectedBranch: [
            "GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users",
        ],
        getViews: ["GET /repos/{owner}/{repo}/traffic/views"],
        getWebhook: ["GET /repos/{owner}/{repo}/hooks/{hook_id}"],
        getWebhookConfigForRepo: [
            "GET /repos/{owner}/{repo}/hooks/{hook_id}/config",
        ],
        listBranches: ["GET /repos/{owner}/{repo}/branches"],
        listBranchesForHeadCommit: [
            "GET /repos/{owner}/{repo}/commits/{commit_sha}/branches-where-head",
            { mediaType: { previews: ["groot"] } },
        ],
        listCollaborators: ["GET /repos/{owner}/{repo}/collaborators"],
        listCommentsForCommit: [
            "GET /repos/{owner}/{repo}/commits/{commit_sha}/comments",
        ],
        listCommitCommentsForRepo: ["GET /repos/{owner}/{repo}/comments"],
        listCommitStatusesForRef: [
            "GET /repos/{owner}/{repo}/commits/{ref}/statuses",
        ],
        listCommits: ["GET /repos/{owner}/{repo}/commits"],
        listContributors: ["GET /repos/{owner}/{repo}/contributors"],
        listDeployKeys: ["GET /repos/{owner}/{repo}/keys"],
        listDeploymentStatuses: [
            "GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses",
        ],
        listDeployments: ["GET /repos/{owner}/{repo}/deployments"],
        listForAuthenticatedUser: ["GET /user/repos"],
        listForOrg: ["GET /orgs/{org}/repos"],
        listForUser: ["GET /users/{username}/repos"],
        listForks: ["GET /repos/{owner}/{repo}/forks"],
        listInvitations: ["GET /repos/{owner}/{repo}/invitations"],
        listInvitationsForAuthenticatedUser: ["GET /user/repository_invitations"],
        listLanguages: ["GET /repos/{owner}/{repo}/languages"],
        listPagesBuilds: ["GET /repos/{owner}/{repo}/pages/builds"],
        listPublic: ["GET /repositories"],
        listPullRequestsAssociatedWithCommit: [
            "GET /repos/{owner}/{repo}/commits/{commit_sha}/pulls",
            { mediaType: { previews: ["groot"] } },
        ],
        listReleaseAssets: [
            "GET /repos/{owner}/{repo}/releases/{release_id}/assets",
        ],
        listReleases: ["GET /repos/{owner}/{repo}/releases"],
        listTags: ["GET /repos/{owner}/{repo}/tags"],
        listTeams: ["GET /repos/{owner}/{repo}/teams"],
        listWebhooks: ["GET /repos/{owner}/{repo}/hooks"],
        merge: ["POST /repos/{owner}/{repo}/merges"],
        pingWebhook: ["POST /repos/{owner}/{repo}/hooks/{hook_id}/pings"],
        removeAppAccessRestrictions: [
            "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps",
            {},
            { mapToData: "apps" },
        ],
        removeCollaborator: [
            "DELETE /repos/{owner}/{repo}/collaborators/{username}",
        ],
        removeStatusCheckContexts: [
            "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts",
            {},
            { mapToData: "contexts" },
        ],
        removeStatusCheckProtection: [
            "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks",
        ],
        removeTeamAccessRestrictions: [
            "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams",
            {},
            { mapToData: "teams" },
        ],
        removeUserAccessRestrictions: [
            "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users",
            {},
            { mapToData: "users" },
        ],
        renameBranch: ["POST /repos/{owner}/{repo}/branches/{branch}/rename"],
        replaceAllTopics: [
            "PUT /repos/{owner}/{repo}/topics",
            { mediaType: { previews: ["mercy"] } },
        ],
        requestPagesBuild: ["POST /repos/{owner}/{repo}/pages/builds"],
        setAdminBranchProtection: [
            "POST /repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins",
        ],
        setAppAccessRestrictions: [
            "PUT /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps",
            {},
            { mapToData: "apps" },
        ],
        setStatusCheckContexts: [
            "PUT /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts",
            {},
            { mapToData: "contexts" },
        ],
        setTeamAccessRestrictions: [
            "PUT /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams",
            {},
            { mapToData: "teams" },
        ],
        setUserAccessRestrictions: [
            "PUT /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users",
            {},
            { mapToData: "users" },
        ],
        testPushWebhook: ["POST /repos/{owner}/{repo}/hooks/{hook_id}/tests"],
        transfer: ["POST /repos/{owner}/{repo}/transfer"],
        update: ["PATCH /repos/{owner}/{repo}"],
        updateBranchProtection: [
            "PUT /repos/{owner}/{repo}/branches/{branch}/protection",
        ],
        updateCommitComment: ["PATCH /repos/{owner}/{repo}/comments/{comment_id}"],
        updateInformationAboutPagesSite: ["PUT /repos/{owner}/{repo}/pages"],
        updateInvitation: [
            "PATCH /repos/{owner}/{repo}/invitations/{invitation_id}",
        ],
        updatePullRequestReviewProtection: [
            "PATCH /repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews",
        ],
        updateRelease: ["PATCH /repos/{owner}/{repo}/releases/{release_id}"],
        updateReleaseAsset: [
            "PATCH /repos/{owner}/{repo}/releases/assets/{asset_id}",
        ],
        updateStatusCheckPotection: [
            "PATCH /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks",
            {},
            { renamed: ["repos", "updateStatusCheckProtection"] },
        ],
        updateStatusCheckProtection: [
            "PATCH /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks",
        ],
        updateWebhook: ["PATCH /repos/{owner}/{repo}/hooks/{hook_id}"],
        updateWebhookConfigForRepo: [
            "PATCH /repos/{owner}/{repo}/hooks/{hook_id}/config",
        ],
        uploadReleaseAsset: [
            "POST /repos/{owner}/{repo}/releases/{release_id}/assets{?name,label}",
            { baseUrl: "https://uploads.github.com" },
        ],
    },
    search: {
        code: ["GET /search/code"],
        commits: ["GET /search/commits", { mediaType: { previews: ["cloak"] } }],
        issuesAndPullRequests: ["GET /search/issues"],
        labels: ["GET /search/labels"],
        repos: ["GET /search/repositories"],
        topics: ["GET /search/topics", { mediaType: { previews: ["mercy"] } }],
        users: ["GET /search/users"],
    },
    secretScanning: {
        getAlert: [
            "GET /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}",
        ],
        listAlertsForRepo: ["GET /repos/{owner}/{repo}/secret-scanning/alerts"],
        updateAlert: [
            "PATCH /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}",
        ],
    },
    teams: {
        addOrUpdateMembershipForUserInOrg: [
            "PUT /orgs/{org}/teams/{team_slug}/memberships/{username}",
        ],
        addOrUpdateProjectPermissionsInOrg: [
            "PUT /orgs/{org}/teams/{team_slug}/projects/{project_id}",
            { mediaType: { previews: ["inertia"] } },
        ],
        addOrUpdateRepoPermissionsInOrg: [
            "PUT /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}",
        ],
        checkPermissionsForProjectInOrg: [
            "GET /orgs/{org}/teams/{team_slug}/projects/{project_id}",
            { mediaType: { previews: ["inertia"] } },
        ],
        checkPermissionsForRepoInOrg: [
            "GET /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}",
        ],
        create: ["POST /orgs/{org}/teams"],
        createDiscussionCommentInOrg: [
            "POST /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments",
        ],
        createDiscussionInOrg: ["POST /orgs/{org}/teams/{team_slug}/discussions"],
        deleteDiscussionCommentInOrg: [
            "DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}",
        ],
        deleteDiscussionInOrg: [
            "DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}",
        ],
        deleteInOrg: ["DELETE /orgs/{org}/teams/{team_slug}"],
        getByName: ["GET /orgs/{org}/teams/{team_slug}"],
        getDiscussionCommentInOrg: [
            "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}",
        ],
        getDiscussionInOrg: [
            "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}",
        ],
        getMembershipForUserInOrg: [
            "GET /orgs/{org}/teams/{team_slug}/memberships/{username}",
        ],
        list: ["GET /orgs/{org}/teams"],
        listChildInOrg: ["GET /orgs/{org}/teams/{team_slug}/teams"],
        listDiscussionCommentsInOrg: [
            "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments",
        ],
        listDiscussionsInOrg: ["GET /orgs/{org}/teams/{team_slug}/discussions"],
        listForAuthenticatedUser: ["GET /user/teams"],
        listMembersInOrg: ["GET /orgs/{org}/teams/{team_slug}/members"],
        listPendingInvitationsInOrg: [
            "GET /orgs/{org}/teams/{team_slug}/invitations",
        ],
        listProjectsInOrg: [
            "GET /orgs/{org}/teams/{team_slug}/projects",
            { mediaType: { previews: ["inertia"] } },
        ],
        listReposInOrg: ["GET /orgs/{org}/teams/{team_slug}/repos"],
        removeMembershipForUserInOrg: [
            "DELETE /orgs/{org}/teams/{team_slug}/memberships/{username}",
        ],
        removeProjectInOrg: [
            "DELETE /orgs/{org}/teams/{team_slug}/projects/{project_id}",
        ],
        removeRepoInOrg: [
            "DELETE /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}",
        ],
        updateDiscussionCommentInOrg: [
            "PATCH /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}",
        ],
        updateDiscussionInOrg: [
            "PATCH /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}",
        ],
        updateInOrg: ["PATCH /orgs/{org}/teams/{team_slug}"],
    },
    users: {
        addEmailForAuthenticated: ["POST /user/emails"],
        block: ["PUT /user/blocks/{username}"],
        checkBlocked: ["GET /user/blocks/{username}"],
        checkFollowingForUser: ["GET /users/{username}/following/{target_user}"],
        checkPersonIsFollowedByAuthenticated: ["GET /user/following/{username}"],
        createGpgKeyForAuthenticated: ["POST /user/gpg_keys"],
        createPublicSshKeyForAuthenticated: ["POST /user/keys"],
        deleteEmailForAuthenticated: ["DELETE /user/emails"],
        deleteGpgKeyForAuthenticated: ["DELETE /user/gpg_keys/{gpg_key_id}"],
        deletePublicSshKeyForAuthenticated: ["DELETE /user/keys/{key_id}"],
        follow: ["PUT /user/following/{username}"],
        getAuthenticated: ["GET /user"],
        getByUsername: ["GET /users/{username}"],
        getContextForUser: ["GET /users/{username}/hovercard"],
        getGpgKeyForAuthenticated: ["GET /user/gpg_keys/{gpg_key_id}"],
        getPublicSshKeyForAuthenticated: ["GET /user/keys/{key_id}"],
        list: ["GET /users"],
        listBlockedByAuthenticated: ["GET /user/blocks"],
        listEmailsForAuthenticated: ["GET /user/emails"],
        listFollowedByAuthenticated: ["GET /user/following"],
        listFollowersForAuthenticatedUser: ["GET /user/followers"],
        listFollowersForUser: ["GET /users/{username}/followers"],
        listFollowingForUser: ["GET /users/{username}/following"],
        listGpgKeysForAuthenticated: ["GET /user/gpg_keys"],
        listGpgKeysForUser: ["GET /users/{username}/gpg_keys"],
        listPublicEmailsForAuthenticated: ["GET /user/public_emails"],
        listPublicKeysForUser: ["GET /users/{username}/keys"],
        listPublicSshKeysForAuthenticated: ["GET /user/keys"],
        setPrimaryEmailVisibilityForAuthenticated: ["PATCH /user/email/visibility"],
        unblock: ["DELETE /user/blocks/{username}"],
        unfollow: ["DELETE /user/following/{username}"],
        updateAuthenticated: ["PATCH /user"],
    },
};

const VERSION = "5.0.1";

function endpointsToMethods(octokit, endpointsMap) {
    const newMethods = {};
    for (const [scope, endpoints] of Object.entries(endpointsMap)) {
        for (const [methodName, endpoint] of Object.entries(endpoints)) {
            const [route, defaults, decorations] = endpoint;
            const [method, url] = route.split(/ /);
            const endpointDefaults = Object.assign({ method, url }, defaults);
            if (!newMethods[scope]) {
                newMethods[scope] = {};
            }
            const scopeMethods = newMethods[scope];
            if (decorations) {
                scopeMethods[methodName] = decorate(octokit, scope, methodName, endpointDefaults, decorations);
                continue;
            }
            scopeMethods[methodName] = octokit.request.defaults(endpointDefaults);
        }
    }
    return newMethods;
}
function decorate(octokit, scope, methodName, defaults, decorations) {
    const requestWithDefaults = octokit.request.defaults(defaults);
    /* istanbul ignore next */
    function withDecorations(...args) {
        // @ts-ignore https://github.com/microsoft/TypeScript/issues/25488
        let options = requestWithDefaults.endpoint.merge(...args);
        // There are currently no other decorations than `.mapToData`
        if (decorations.mapToData) {
            options = Object.assign({}, options, {
                data: options[decorations.mapToData],
                [decorations.mapToData]: undefined,
            });
            return requestWithDefaults(options);
        }
        if (decorations.renamed) {
            const [newScope, newMethodName] = decorations.renamed;
            octokit.log.warn(`octokit.${scope}.${methodName}() has been renamed to octokit.${newScope}.${newMethodName}()`);
        }
        if (decorations.deprecated) {
            octokit.log.warn(decorations.deprecated);
        }
        if (decorations.renamedParameters) {
            // @ts-ignore https://github.com/microsoft/TypeScript/issues/25488
            const options = requestWithDefaults.endpoint.merge(...args);
            for (const [name, alias] of Object.entries(decorations.renamedParameters)) {
                if (name in options) {
                    octokit.log.warn(`"${name}" parameter is deprecated for "octokit.${scope}.${methodName}()". Use "${alias}" instead`);
                    if (!(alias in options)) {
                        options[alias] = options[name];
                    }
                    delete options[name];
                }
            }
            return requestWithDefaults(options);
        }
        // @ts-ignore https://github.com/microsoft/TypeScript/issues/25488
        return requestWithDefaults(...args);
    }
    return Object.assign(withDecorations, requestWithDefaults);
}

function restEndpointMethods(octokit) {
    const api = endpointsToMethods(octokit, Endpoints);
    return {
        rest: api,
    };
}
restEndpointMethods.VERSION = VERSION;
function legacyRestEndpointMethods(octokit) {
    const api = endpointsToMethods(octokit, Endpoints);
    return {
        ...api,
        rest: api,
    };
}
legacyRestEndpointMethods.VERSION = VERSION;


//# sourceMappingURL=index.js.map


/***/ }),
/* 39 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "composePaginateRest": () => (/* binding */ composePaginateRest),
/* harmony export */   "isPaginatingEndpoint": () => (/* binding */ isPaginatingEndpoint),
/* harmony export */   "paginateRest": () => (/* binding */ paginateRest),
/* harmony export */   "paginatingEndpoints": () => (/* binding */ paginatingEndpoints)
/* harmony export */ });
const VERSION = "2.13.3";

/**
 * Some “list” response that can be paginated have a different response structure
 *
 * They have a `total_count` key in the response (search also has `incomplete_results`,
 * /installation/repositories also has `repository_selection`), as well as a key with
 * the list of the items which name varies from endpoint to endpoint.
 *
 * Octokit normalizes these responses so that paginated results are always returned following
 * the same structure. One challenge is that if the list response has only one page, no Link
 * header is provided, so this header alone is not sufficient to check wether a response is
 * paginated or not.
 *
 * We check if a "total_count" key is present in the response data, but also make sure that
 * a "url" property is not, as the "Get the combined status for a specific ref" endpoint would
 * otherwise match: https://developer.github.com/v3/repos/statuses/#get-the-combined-status-for-a-specific-ref
 */
function normalizePaginatedListResponse(response) {
    const responseNeedsNormalization = "total_count" in response.data && !("url" in response.data);
    if (!responseNeedsNormalization)
        return response;
    // keep the additional properties intact as there is currently no other way
    // to retrieve the same information.
    const incompleteResults = response.data.incomplete_results;
    const repositorySelection = response.data.repository_selection;
    const totalCount = response.data.total_count;
    delete response.data.incomplete_results;
    delete response.data.repository_selection;
    delete response.data.total_count;
    const namespaceKey = Object.keys(response.data)[0];
    const data = response.data[namespaceKey];
    response.data = data;
    if (typeof incompleteResults !== "undefined") {
        response.data.incomplete_results = incompleteResults;
    }
    if (typeof repositorySelection !== "undefined") {
        response.data.repository_selection = repositorySelection;
    }
    response.data.total_count = totalCount;
    return response;
}

function iterator(octokit, route, parameters) {
    const options = typeof route === "function"
        ? route.endpoint(parameters)
        : octokit.request.endpoint(route, parameters);
    const requestMethod = typeof route === "function" ? route : octokit.request;
    const method = options.method;
    const headers = options.headers;
    let url = options.url;
    return {
        [Symbol.asyncIterator]: () => ({
            async next() {
                if (!url)
                    return { done: true };
                const response = await requestMethod({ method, url, headers });
                const normalizedResponse = normalizePaginatedListResponse(response);
                // `response.headers.link` format:
                // '<https://api.github.com/users/aseemk/followers?page=2>; rel="next", <https://api.github.com/users/aseemk/followers?page=2>; rel="last"'
                // sets `url` to undefined if "next" URL is not present or `link` header is not set
                url = ((normalizedResponse.headers.link || "").match(/<([^>]+)>;\s*rel="next"/) || [])[1];
                return { value: normalizedResponse };
            },
        }),
    };
}

function paginate(octokit, route, parameters, mapFn) {
    if (typeof parameters === "function") {
        mapFn = parameters;
        parameters = undefined;
    }
    return gather(octokit, [], iterator(octokit, route, parameters)[Symbol.asyncIterator](), mapFn);
}
function gather(octokit, results, iterator, mapFn) {
    return iterator.next().then((result) => {
        if (result.done) {
            return results;
        }
        let earlyExit = false;
        function done() {
            earlyExit = true;
        }
        results = results.concat(mapFn ? mapFn(result.value, done) : result.value.data);
        if (earlyExit) {
            return results;
        }
        return gather(octokit, results, iterator, mapFn);
    });
}

const composePaginateRest = Object.assign(paginate, {
    iterator,
});

const paginatingEndpoints = [
    "GET /app/installations",
    "GET /applications/grants",
    "GET /authorizations",
    "GET /enterprises/{enterprise}/actions/permissions/organizations",
    "GET /enterprises/{enterprise}/actions/runner-groups",
    "GET /enterprises/{enterprise}/actions/runner-groups/{runner_group_id}/organizations",
    "GET /enterprises/{enterprise}/actions/runner-groups/{runner_group_id}/runners",
    "GET /enterprises/{enterprise}/actions/runners",
    "GET /enterprises/{enterprise}/actions/runners/downloads",
    "GET /events",
    "GET /gists",
    "GET /gists/public",
    "GET /gists/starred",
    "GET /gists/{gist_id}/comments",
    "GET /gists/{gist_id}/commits",
    "GET /gists/{gist_id}/forks",
    "GET /installation/repositories",
    "GET /issues",
    "GET /marketplace_listing/plans",
    "GET /marketplace_listing/plans/{plan_id}/accounts",
    "GET /marketplace_listing/stubbed/plans",
    "GET /marketplace_listing/stubbed/plans/{plan_id}/accounts",
    "GET /networks/{owner}/{repo}/events",
    "GET /notifications",
    "GET /organizations",
    "GET /orgs/{org}/actions/permissions/repositories",
    "GET /orgs/{org}/actions/runner-groups",
    "GET /orgs/{org}/actions/runner-groups/{runner_group_id}/repositories",
    "GET /orgs/{org}/actions/runner-groups/{runner_group_id}/runners",
    "GET /orgs/{org}/actions/runners",
    "GET /orgs/{org}/actions/runners/downloads",
    "GET /orgs/{org}/actions/secrets",
    "GET /orgs/{org}/actions/secrets/{secret_name}/repositories",
    "GET /orgs/{org}/blocks",
    "GET /orgs/{org}/credential-authorizations",
    "GET /orgs/{org}/events",
    "GET /orgs/{org}/failed_invitations",
    "GET /orgs/{org}/hooks",
    "GET /orgs/{org}/installations",
    "GET /orgs/{org}/invitations",
    "GET /orgs/{org}/invitations/{invitation_id}/teams",
    "GET /orgs/{org}/issues",
    "GET /orgs/{org}/members",
    "GET /orgs/{org}/migrations",
    "GET /orgs/{org}/migrations/{migration_id}/repositories",
    "GET /orgs/{org}/outside_collaborators",
    "GET /orgs/{org}/projects",
    "GET /orgs/{org}/public_members",
    "GET /orgs/{org}/repos",
    "GET /orgs/{org}/team-sync/groups",
    "GET /orgs/{org}/teams",
    "GET /orgs/{org}/teams/{team_slug}/discussions",
    "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments",
    "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions",
    "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions",
    "GET /orgs/{org}/teams/{team_slug}/invitations",
    "GET /orgs/{org}/teams/{team_slug}/members",
    "GET /orgs/{org}/teams/{team_slug}/projects",
    "GET /orgs/{org}/teams/{team_slug}/repos",
    "GET /orgs/{org}/teams/{team_slug}/team-sync/group-mappings",
    "GET /orgs/{org}/teams/{team_slug}/teams",
    "GET /projects/columns/{column_id}/cards",
    "GET /projects/{project_id}/collaborators",
    "GET /projects/{project_id}/columns",
    "GET /repos/{owner}/{repo}/actions/artifacts",
    "GET /repos/{owner}/{repo}/actions/runners",
    "GET /repos/{owner}/{repo}/actions/runners/downloads",
    "GET /repos/{owner}/{repo}/actions/runs",
    "GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts",
    "GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs",
    "GET /repos/{owner}/{repo}/actions/secrets",
    "GET /repos/{owner}/{repo}/actions/workflows",
    "GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs",
    "GET /repos/{owner}/{repo}/assignees",
    "GET /repos/{owner}/{repo}/branches",
    "GET /repos/{owner}/{repo}/check-runs/{check_run_id}/annotations",
    "GET /repos/{owner}/{repo}/check-suites/{check_suite_id}/check-runs",
    "GET /repos/{owner}/{repo}/code-scanning/alerts",
    "GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/instances",
    "GET /repos/{owner}/{repo}/code-scanning/analyses",
    "GET /repos/{owner}/{repo}/collaborators",
    "GET /repos/{owner}/{repo}/comments",
    "GET /repos/{owner}/{repo}/comments/{comment_id}/reactions",
    "GET /repos/{owner}/{repo}/commits",
    "GET /repos/{owner}/{repo}/commits/{commit_sha}/branches-where-head",
    "GET /repos/{owner}/{repo}/commits/{commit_sha}/comments",
    "GET /repos/{owner}/{repo}/commits/{commit_sha}/pulls",
    "GET /repos/{owner}/{repo}/commits/{ref}/check-runs",
    "GET /repos/{owner}/{repo}/commits/{ref}/check-suites",
    "GET /repos/{owner}/{repo}/commits/{ref}/statuses",
    "GET /repos/{owner}/{repo}/contributors",
    "GET /repos/{owner}/{repo}/deployments",
    "GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses",
    "GET /repos/{owner}/{repo}/events",
    "GET /repos/{owner}/{repo}/forks",
    "GET /repos/{owner}/{repo}/git/matching-refs/{ref}",
    "GET /repos/{owner}/{repo}/hooks",
    "GET /repos/{owner}/{repo}/invitations",
    "GET /repos/{owner}/{repo}/issues",
    "GET /repos/{owner}/{repo}/issues/comments",
    "GET /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions",
    "GET /repos/{owner}/{repo}/issues/events",
    "GET /repos/{owner}/{repo}/issues/{issue_number}/comments",
    "GET /repos/{owner}/{repo}/issues/{issue_number}/events",
    "GET /repos/{owner}/{repo}/issues/{issue_number}/labels",
    "GET /repos/{owner}/{repo}/issues/{issue_number}/reactions",
    "GET /repos/{owner}/{repo}/issues/{issue_number}/timeline",
    "GET /repos/{owner}/{repo}/keys",
    "GET /repos/{owner}/{repo}/labels",
    "GET /repos/{owner}/{repo}/milestones",
    "GET /repos/{owner}/{repo}/milestones/{milestone_number}/labels",
    "GET /repos/{owner}/{repo}/notifications",
    "GET /repos/{owner}/{repo}/pages/builds",
    "GET /repos/{owner}/{repo}/projects",
    "GET /repos/{owner}/{repo}/pulls",
    "GET /repos/{owner}/{repo}/pulls/comments",
    "GET /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions",
    "GET /repos/{owner}/{repo}/pulls/{pull_number}/comments",
    "GET /repos/{owner}/{repo}/pulls/{pull_number}/commits",
    "GET /repos/{owner}/{repo}/pulls/{pull_number}/files",
    "GET /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers",
    "GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews",
    "GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/comments",
    "GET /repos/{owner}/{repo}/releases",
    "GET /repos/{owner}/{repo}/releases/{release_id}/assets",
    "GET /repos/{owner}/{repo}/secret-scanning/alerts",
    "GET /repos/{owner}/{repo}/stargazers",
    "GET /repos/{owner}/{repo}/subscribers",
    "GET /repos/{owner}/{repo}/tags",
    "GET /repos/{owner}/{repo}/teams",
    "GET /repositories",
    "GET /repositories/{repository_id}/environments/{environment_name}/secrets",
    "GET /scim/v2/enterprises/{enterprise}/Groups",
    "GET /scim/v2/enterprises/{enterprise}/Users",
    "GET /scim/v2/organizations/{org}/Users",
    "GET /search/code",
    "GET /search/commits",
    "GET /search/issues",
    "GET /search/labels",
    "GET /search/repositories",
    "GET /search/topics",
    "GET /search/users",
    "GET /teams/{team_id}/discussions",
    "GET /teams/{team_id}/discussions/{discussion_number}/comments",
    "GET /teams/{team_id}/discussions/{discussion_number}/comments/{comment_number}/reactions",
    "GET /teams/{team_id}/discussions/{discussion_number}/reactions",
    "GET /teams/{team_id}/invitations",
    "GET /teams/{team_id}/members",
    "GET /teams/{team_id}/projects",
    "GET /teams/{team_id}/repos",
    "GET /teams/{team_id}/team-sync/group-mappings",
    "GET /teams/{team_id}/teams",
    "GET /user/blocks",
    "GET /user/emails",
    "GET /user/followers",
    "GET /user/following",
    "GET /user/gpg_keys",
    "GET /user/installations",
    "GET /user/installations/{installation_id}/repositories",
    "GET /user/issues",
    "GET /user/keys",
    "GET /user/marketplace_purchases",
    "GET /user/marketplace_purchases/stubbed",
    "GET /user/memberships/orgs",
    "GET /user/migrations",
    "GET /user/migrations/{migration_id}/repositories",
    "GET /user/orgs",
    "GET /user/public_emails",
    "GET /user/repos",
    "GET /user/repository_invitations",
    "GET /user/starred",
    "GET /user/subscriptions",
    "GET /user/teams",
    "GET /users",
    "GET /users/{username}/events",
    "GET /users/{username}/events/orgs/{org}",
    "GET /users/{username}/events/public",
    "GET /users/{username}/followers",
    "GET /users/{username}/following",
    "GET /users/{username}/gists",
    "GET /users/{username}/gpg_keys",
    "GET /users/{username}/keys",
    "GET /users/{username}/orgs",
    "GET /users/{username}/projects",
    "GET /users/{username}/received_events",
    "GET /users/{username}/received_events/public",
    "GET /users/{username}/repos",
    "GET /users/{username}/starred",
    "GET /users/{username}/subscriptions",
];

function isPaginatingEndpoint(arg) {
    if (typeof arg === "string") {
        return paginatingEndpoints.includes(arg);
    }
    else {
        return false;
    }
}

/**
 * @param octokit Octokit instance
 * @param options Options passed to Octokit constructor
 */
function paginateRest(octokit) {
    return {
        paginate: Object.assign(paginate.bind(null, octokit), {
            iterator: iterator.bind(null, octokit),
        }),
    };
}
paginateRest.VERSION = VERSION;


//# sourceMappingURL=index.js.map


/***/ }),
/* 40 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Project": () => (/* binding */ Project),
/* harmony export */   "ProjectContainer": () => (/* binding */ ProjectContainer)
/* harmony export */ });
/* harmony import */ var vscode__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var vscode__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(vscode__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _parser_nodes__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(6);
/* harmony import */ var _parser_parser__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(41);
/* harmony import */ var _parser_symbols__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(7);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/




class Project {
    constructor() {
        this._nodeToUri = new WeakMap();
        this._cached = new Map();
        this._parser = new _parser_parser__WEBPACK_IMPORTED_MODULE_2__.Parser();
        this.symbols = new _parser_symbols__WEBPACK_IMPORTED_MODULE_3__.SymbolTable();
    }
    getOrCreate(doc) {
        let value = this._cached.get(doc.uri.toString());
        if (!value || value.versionParsed !== doc.version) {
            const text = doc.getText();
            value = {
                node: this._parser.parse(text, doc.uri.toString()),
                versionParsed: doc.version,
                doc
            };
            this._cached.set(doc.uri.toString(), value);
            this.symbols.update(value.node);
            _parser_nodes__WEBPACK_IMPORTED_MODULE_1__.Utils.walk(value.node, node => this._nodeToUri.set(node, doc.uri));
        }
        return value.node;
    }
    has(doc) {
        return this._cached.has(doc.uri.toString());
    }
    delete(doc) {
        this._cached.delete(doc.uri.toString());
        this.symbols.delete(doc.uri.toString());
    }
    all() {
        return this._cached.values();
    }
    _lookUp(node, uri) {
        if (!uri) {
            uri = this._nodeToUri.get(node);
        }
        if (!uri) {
            throw new Error('unknown node');
        }
        const entry = this._cached.get(uri.toString());
        if (!entry) {
            throw new Error('unknown file' + uri);
        }
        return entry;
    }
    rangeOf(node, uri) {
        const entry = this._lookUp(node, uri);
        return new vscode__WEBPACK_IMPORTED_MODULE_0__.Range(entry.doc.positionAt(node.start), entry.doc.positionAt(node.end));
    }
    textOf(node, uri) {
        const { doc } = this._lookUp(node, uri);
        const range = new vscode__WEBPACK_IMPORTED_MODULE_0__.Range(doc.positionAt(node.start), doc.positionAt(node.end));
        return doc.getText(range);
    }
    getLocation(node) {
        const data = this._lookUp(node);
        return new vscode__WEBPACK_IMPORTED_MODULE_0__.Location(data.doc.uri, new vscode__WEBPACK_IMPORTED_MODULE_0__.Range(data.doc.positionAt(node.start), data.doc.positionAt(node.end)));
    }
    queryData(queryNode) {
        const variableAccess = (name) => { var _a; return (_a = this.symbols.getFirst(name)) === null || _a === void 0 ? void 0 : _a.value; };
        function fillInQuery(node) {
            let sort;
            let order;
            // TODO@jrieken
            // this is hacky, but it works. We first print the node *with* sortby-statements
            // and then use a regex to remove and capture the sortby-information
            const textWithSortBy = _parser_nodes__WEBPACK_IMPORTED_MODULE_1__.Utils.print(node, queryNode.text, variableAccess);
            const query = textWithSortBy.replace(/sort:([\w-+\d]+)-(asc|desc)/g, function (_m, g1, g2) {
                sort = g1 !== null && g1 !== void 0 ? g1 : undefined;
                order = g2 !== null && g2 !== void 0 ? g2 : undefined;
                return '';
            }).trim();
            result.push({
                q: query,
                sort,
                order,
            });
        }
        function fillInQueryData(node) {
            switch (node._type) {
                case "Query" /* Query */:
                    fillInQuery(node);
                    break;
                case "OrExpression" /* OrExpression */:
                    fillInQuery(node.left);
                    // recurse
                    fillInQueryData(node.right);
            }
        }
        const result = [];
        queryNode.nodes.forEach(fillInQueryData);
        return result;
    }
}
class ProjectContainer {
    constructor() {
        this._onDidRemove = new vscode__WEBPACK_IMPORTED_MODULE_0__.EventEmitter();
        this.onDidRemove = this._onDidRemove.event;
        this._onDidChange = new vscode__WEBPACK_IMPORTED_MODULE_0__.EventEmitter();
        this.onDidChange = this._onDidChange.event;
        this._disposables = [];
        this._associations = new Map();
        this._disposables.push(vscode__WEBPACK_IMPORTED_MODULE_0__.workspace.onDidOpenNotebookDocument(notebook => {
            if (notebook.notebookType !== 'github-issues') {
                return;
            }
            if (this._associations.has(notebook)) {
                throw new Error(`Project for '${notebook.uri.toString()}' already EXISTS. All projects: ${[...this._associations.keys()].map(nb => nb.uri.toString()).join()}`);
            }
            const project = new Project();
            this._associations.set(notebook, project);
            try {
                for (const cell of notebook.getCells()) {
                    if (cell.kind === vscode__WEBPACK_IMPORTED_MODULE_0__.NotebookCellKind.Code) {
                        project.getOrCreate(cell.document);
                    }
                }
            }
            catch (err) {
                console.error('FAILED to eagerly feed notebook cell document into project');
                console.error(err);
            }
            this._onDidChange.fire(project);
        }));
        this._disposables.push(vscode__WEBPACK_IMPORTED_MODULE_0__.workspace.onDidCloseNotebookDocument(notebook => {
            const project = this._associations.get(notebook);
            if (project) {
                this._associations.delete(notebook);
                this._onDidRemove.fire(project);
            }
        }));
        this._disposables.push(vscode__WEBPACK_IMPORTED_MODULE_0__.notebooks.onDidChangeNotebookCells(e => {
            let project = this.lookupProject(e.document.uri, false);
            if (!project) {
                return;
            }
            for (let change of e.changes) {
                for (let cell of change.deletedItems) {
                    project.delete(cell.document);
                }
                for (const cell of change.items) {
                    if (cell.kind === vscode__WEBPACK_IMPORTED_MODULE_0__.NotebookCellKind.Code) {
                        project.getOrCreate(cell.document);
                    }
                }
            }
            this._onDidChange.fire(project);
        }));
    }
    lookupProject(uri, fallback = true) {
        for (let [notebook, project] of this._associations) {
            if (notebook.uri.toString() === uri.toString()) {
                // notebook uri itself
                return project;
            }
            for (let cell of notebook.getCells()) {
                if (cell.document.uri.toString() === uri.toString()) {
                    // a cell uri
                    return project;
                }
            }
        }
        if (!fallback) {
            return undefined;
        }
        console.log('returning AD-HOC project for ' + uri.toString());
        return new Project();
    }
    all() {
        return this._associations.values();
    }
}


/***/ }),
/* 41 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Parser": () => (/* binding */ Parser)
/* harmony export */ });
/* harmony import */ var _scanner__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(12);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

class Parser {
    constructor() {
        this._scanner = new _scanner__WEBPACK_IMPORTED_MODULE_0__.Scanner();
        this._token = { type: "EOF" /* EOF */, start: 0, end: 0 };
    }
    _accept(type) {
        if (this._token.type === "EOF" /* EOF */) {
            return undefined;
        }
        if (this._token.type === type) {
            const value = this._token;
            this._token = this._scanner.next();
            return value;
        }
    }
    _reset(token) {
        this._scanner.resetPosition(token);
        this._token = this._scanner.next();
    }
    parse(value, id = Date.now().toString()) {
        var _a;
        const nodes = [];
        this._scanner.reset(value);
        this._token = this._scanner.next();
        while (this._token.type !== "EOF" /* EOF */) {
            // skip over whitespace
            if (this._accept("Whitespace" /* Whitespace */) || this._accept("NewLine" /* NewLine */)) {
                continue;
            }
            const node = (_a = this._parseVariableDefinition()) !== null && _a !== void 0 ? _a : this._parseQuery(true);
            if (node) {
                nodes.push(node);
            }
        }
        return {
            _type: "QueryDocument" /* QueryDocument */,
            start: 0,
            end: value.length,
            nodes,
            text: value,
            id
        };
    }
    _parseQuery(allowOR) {
        var _a, _b, _c, _d, _e;
        const start = this._token.start;
        const nodes = [];
        while (this._token.type !== "NewLine" /* NewLine */ && this._token.type !== "EOF" /* EOF */) {
            // skip over whitespace
            if (this._accept("Whitespace" /* Whitespace */) || this._accept("LineComment" /* LineComment */)) {
                continue;
            }
            // check for OR
            const orTkn = allowOR && nodes.length > 0 && this._accept("OR" /* OR */);
            if (orTkn) {
                // make this a OrExpressionNode
                const anchor = this._token;
                const right = this._parseQuery(allowOR);
                if (right) {
                    const left = {
                        _type: "Query" /* Query */,
                        start,
                        end: nodes[nodes.length - 1].end,
                        nodes,
                    };
                    return {
                        _type: "OrExpression" /* OrExpression */,
                        or: orTkn,
                        start: left.start,
                        end: (right === null || right === void 0 ? void 0 : right.end) || orTkn.end,
                        left,
                        right
                    };
                }
                this._reset(anchor);
                nodes.push({
                    _type: "Any" /* Any */,
                    tokenType: orTkn.type,
                    start: orTkn.start,
                    end: orTkn.end
                });
            }
            // parse the query AS-IS
            const node = (_e = (_d = (_c = (_b = (_a = this._parseQualifiedValue()) !== null && _a !== void 0 ? _a : this._parseNumber()) !== null && _b !== void 0 ? _b : this._parseDate()) !== null && _c !== void 0 ? _c : this._parseVariableName()) !== null && _d !== void 0 ? _d : this._parseLiteral()) !== null && _e !== void 0 ? _e : this._parseAny(this._token.type);
            if (!node) {
                continue;
            }
            nodes.push(node);
        }
        if (nodes.length === 0) {
            return undefined;
        }
        return {
            _type: "Query" /* Query */,
            start,
            end: nodes[nodes.length - 1].end,
            nodes,
        };
    }
    _parseAny(type) {
        const token = this._accept(type);
        if (token) {
            return {
                _type: "Any" /* Any */,
                start: token.start,
                end: token.end,
                tokenType: token.type
            };
        }
    }
    _parseLiteralOrLiteralSequence() {
        const literal = this._parseLiteral();
        if (!literal) {
            return literal;
        }
        let comma = this._accept("Comma" /* Comma */);
        if (!comma) {
            return literal;
        }
        const nodes = [literal];
        do {
            const next = this._parseLiteral();
            if (!next) {
                break;
            }
            nodes.push(next);
            comma = this._accept("Comma" /* Comma */);
        } while (comma);
        return {
            _type: "LiteralSequence" /* LiteralSequence */,
            start: literal.start,
            end: this._scanner.pos,
            nodes
        };
    }
    _parseLiteral() {
        const token = this._accept("Literal" /* Literal */) || this._accept("QuotedLiteral" /* QuotedLiteral */);
        if (!token) {
            return undefined;
        }
        return {
            _type: "Literal" /* Literal */,
            start: token.start,
            end: token.end,
            value: this._scanner.value(token)
        };
    }
    _parseNumberLiteral() {
        let tk = this._accept("Number" /* Number */);
        if (!tk) {
            return undefined;
        }
        let value = this._scanner.value(tk);
        let end = tk.end;
        while (this._token.type !== "Whitespace" /* Whitespace */ && this._token.type !== "EOF" /* EOF */) {
            value += this._scanner.value(this._token);
            end = this._token.end;
            this._accept(this._token.type);
        }
        if (end === tk.end) {
            // didnt move forward
            return {
                _type: "Number" /* Number */,
                start: tk.start,
                end,
                value: Number(this._scanner.value(tk))
            };
        }
        return {
            _type: "Literal" /* Literal */,
            start: tk.start,
            end,
            value
        };
    }
    _parseNumber() {
        const tk = this._accept("Number" /* Number */);
        if (!tk) {
            return undefined;
        }
        return {
            _type: "Number" /* Number */,
            start: tk.start,
            end: tk.end,
            value: Number(this._scanner.value(tk))
        };
    }
    _parseDate() {
        const tk = this._accept("Date" /* Date */) || this._accept("DateTime" /* DateTime */);
        if (!tk) {
            return undefined;
        }
        return {
            _type: "Date" /* Date */,
            start: tk.start,
            end: tk.end,
            value: this._scanner.value(tk)
        };
    }
    _parseCompare() {
        var _a, _b, _c, _d, _e, _f;
        // <value
        // <=value
        // >value
        // >=value
        const cmp = (_c = (_b = (_a = this._accept("LessThan" /* LessThan */)) !== null && _a !== void 0 ? _a : this._accept("LessThanEqual" /* LessThanEqual */)) !== null && _b !== void 0 ? _b : this._accept("GreaterThan" /* GreaterThan */)) !== null && _c !== void 0 ? _c : this._accept("GreaterThanEqual" /* GreaterThanEqual */);
        if (!cmp) {
            return;
        }
        const value = (_f = (_e = (_d = this._parseDate()) !== null && _d !== void 0 ? _d : this._parseNumber()) !== null && _e !== void 0 ? _e : this._parseVariableName()) !== null && _f !== void 0 ? _f : this._createMissing('expected date or number');
        return {
            _type: "Compare" /* Compare */,
            start: cmp.start,
            end: value.end,
            cmp: this._scanner.value(cmp),
            value
        };
    }
    _parseRange() {
        var _a, _b, _c, _d, _e;
        // value..value
        const anchor = this._token;
        const open = (_b = (_a = this._parseDate()) !== null && _a !== void 0 ? _a : this._parseNumber()) !== null && _b !== void 0 ? _b : this._parseVariableName();
        if (!open) {
            return;
        }
        if (!this._accept("Range" /* Range */)) {
            this._reset(anchor);
            return;
        }
        const close = (_e = (_d = (_c = this._parseDate()) !== null && _c !== void 0 ? _c : this._parseNumber()) !== null && _d !== void 0 ? _d : this._parseVariableName()) !== null && _e !== void 0 ? _e : this._createMissing('expected number or date');
        return {
            _type: "Range" /* Range */,
            start: open.start,
            end: close.end,
            open,
            close
        };
    }
    _parseRangeFixedEnd() {
        var _a, _b, _c;
        // *..value
        const tk = this._accept("RangeFixedEnd" /* RangeFixedEnd */);
        if (!tk) {
            return;
        }
        const close = (_c = (_b = (_a = this._parseDate()) !== null && _a !== void 0 ? _a : this._parseNumber()) !== null && _b !== void 0 ? _b : this._parseVariableName()) !== null && _c !== void 0 ? _c : this._createMissing('expected number or date');
        return {
            _type: "Range" /* Range */,
            start: tk.start,
            end: close.end,
            open: undefined,
            close
        };
    }
    _parseRangeFixedStart() {
        var _a;
        // value..*
        const anchor = this._token;
        const value = (_a = this._parseDate()) !== null && _a !== void 0 ? _a : this._parseNumber();
        if (!value) {
            return;
        }
        const token = this._accept("RangeFixedStart" /* RangeFixedStart */);
        if (!token) {
            this._reset(anchor);
            return undefined;
        }
        return {
            _type: "Range" /* Range */,
            start: value.start,
            end: token.end,
            open: value,
            close: undefined
        };
    }
    _parseQualifiedValue() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        // literal:value
        // -literal:value
        const anchor = this._token;
        const not = this._accept("Dash" /* Dash */);
        const qualifier = this._parseLiteral();
        if (!qualifier || !this._accept("Colon" /* Colon */)) {
            this._reset(anchor);
            return;
        }
        const value = (_j = (_h = (_g = (_f = (_e = (_d = (_c = (_b = (_a = this._parseCompare()) !== null && _a !== void 0 ? _a : this._parseRange()) !== null && _b !== void 0 ? _b : this._parseRangeFixedStart()) !== null && _c !== void 0 ? _c : this._parseRangeFixedEnd()) !== null && _d !== void 0 ? _d : this._parseDate()) !== null && _e !== void 0 ? _e : this._parseNumberLiteral()) !== null && _f !== void 0 ? _f : this._parseVariableName()) !== null && _g !== void 0 ? _g : this._parseLiteralOrLiteralSequence()) !== null && _h !== void 0 ? _h : this._parseAny("SHA" /* SHA */)) !== null && _j !== void 0 ? _j : this._createMissing(`This looks like a 'key:value'-expression but lacks value.`, true);
        return {
            _type: "QualifiedValue" /* QualifiedValue */,
            start: (_k = not === null || not === void 0 ? void 0 : not.start) !== null && _k !== void 0 ? _k : qualifier.start,
            end: value.end,
            not: Boolean(not),
            qualifier,
            value
        };
    }
    _parseVariableName() {
        // ${name}
        const token = this._accept("VariableName" /* VariableName */);
        if (!token) {
            return undefined;
        }
        return {
            _type: "VariableName" /* VariableName */,
            start: token.start,
            end: token.end,
            value: this._scanner.value(token)
        };
    }
    _parseVariableDefinition() {
        var _a;
        // ${name}=query
        const anchor = this._token;
        const name = this._parseVariableName();
        if (!name) {
            return;
        }
        this._accept("Whitespace" /* Whitespace */);
        if (!this._accept("Equals" /* Equals */)) {
            this._reset(anchor);
            return;
        }
        const value = (_a = this._parseQuery(false)) !== null && _a !== void 0 ? _a : this._createMissing('query expected');
        return {
            _type: "VariableDefinition" /* VariableDefinition */,
            start: name.start,
            end: value.end,
            name,
            value,
        };
    }
    _createMissing(message, optional) {
        return {
            _type: "Missing" /* Missing */,
            start: this._token.start,
            end: this._token.start,
            message,
            optional
        };
    }
}


/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "activate": () => (/* binding */ activate)
/* harmony export */ });
/* harmony import */ var vscode__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var vscode__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(vscode__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _commands__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2);
/* harmony import */ var _languageProvider__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(9);
/* harmony import */ var _notebookProvider__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(3);
/* harmony import */ var _octokitProvider__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(14);
/* harmony import */ var _project__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(40);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/






function activate(context) {
    const octokit = new _octokitProvider__WEBPACK_IMPORTED_MODULE_4__.OctokitProvider();
    const projectContainer = new _project__WEBPACK_IMPORTED_MODULE_5__.ProjectContainer();
    context.subscriptions.push(new _notebookProvider__WEBPACK_IMPORTED_MODULE_3__.IssuesNotebookKernel(projectContainer, octokit));
    context.subscriptions.push(vscode__WEBPACK_IMPORTED_MODULE_0__.notebooks.registerNotebookCellStatusBarItemProvider('github-issues', new _notebookProvider__WEBPACK_IMPORTED_MODULE_3__.IssuesStatusBarProvider()));
    context.subscriptions.push(vscode__WEBPACK_IMPORTED_MODULE_0__.workspace.registerNotebookSerializer('github-issues', new _notebookProvider__WEBPACK_IMPORTED_MODULE_3__.IssuesNotebookSerializer(), {
        transientOutputs: true,
        transientCellMetadata: {
            inputCollapsed: true,
            outputCollapsed: true,
        }
    }));
    context.subscriptions.push((0,_languageProvider__WEBPACK_IMPORTED_MODULE_2__.registerLanguageProvider)(projectContainer, octokit));
    context.subscriptions.push((0,_commands__WEBPACK_IMPORTED_MODULE_1__.registerCommands)(projectContainer, octokit));
}

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=extension-node.js.map