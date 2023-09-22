enum ElementType {
    TEXT_ELEMENT = "TEXT_ELEMENT"
}

let nextUnitOfWork = null;
let currentRoot = null;
let wipRoot = null;
let deletions = null;∂
let wipFiber = null;
let hookIndex = null;

// ---- helpers -----
const isEvent = key => key.startsWith("on");
const isProperty = key => key !== "children" && !isEvent(key);
const isNew = (prev, next) => key => prev[key] !== next[key];
const isGone = (prev, next) => key => !(key in next);

/**
 * Creates a new element with the given type, props, and children.
 * @param {string} type - The type of the element to create.
 * @param {object} props - The props to assign to the element.
 * @param {...any} children - The children to add to the element.
 * @returns {object} The newly created element.
 */
function createElement(type, props, ...children) {
    return {
        type,
        props: {
            ...props,
            children: children.map(child =>
                typeof child === "object"
                    ? child
                    : createTextElement(child)
            ),
        },
    }
}

/**
 * Creates a text element with the given text.
 *
 * @param {string} text - The text to be included in the text element.
 * @returns {object} An object representing the text element.
 */
function createTextElement(text) {
    return {
        type: ElementType.TEXT_ELEMENT,
        props: {
            nodeValue: text,
            children: [],
        },
    }
}


/**
 * Creates a new DOM element based on the given fiber.
 * @param {Object} fiber - The fiber object representing the element to create.
 * @returns {HTMLElement|Text} - The newly created DOM element.
 */
function createDom(fiber) {
    const dom =
        fiber.type == ElementType.TEXT_ELEMENT
            ? document.createTextNode("")
            : document.createElement(fiber.type)

    updateDom(dom, {}, fiber.props)

    return dom
}


/**
 * Updates the DOM element with new properties and event listeners.
 *
 * @param {HTMLElement} dom - The DOM element to update.
 * @param {Object} prevProps - The previous properties and event listeners.
 * @param {Object} nextProps - The new properties and event listeners.
 */
function updateDom(dom, prevProps, nextProps) {
    //Remove old or changed event listeners
    Object.keys(prevProps)
        .filter(isEvent)
        .filter(
            key =>
                !(key in nextProps) ||
                isNew(prevProps, nextProps)(key)
        )
        .forEach(name => {
            const eventType = name
                .toLowerCase()
                .substring(2)
            dom.removeEventListener(
                eventType,
                prevProps[name]
            )
        })

    // Remove old properties
    Object.keys(prevProps)
        .filter(isProperty)
        .filter(isGone(prevProps, nextProps))
        .forEach(name => {
            dom[name] = ""
        })

    // Set new or changed properties
    Object.keys(nextProps)
        .filter(isProperty)
        .filter(isNew(prevProps, nextProps))
        .forEach(name => {
            dom[name] = nextProps[name]
        })

    // Add event listeners
    Object.keys(nextProps)
        .filter(isEvent)
        .filter(isNew(prevProps, nextProps))
        .forEach(name => {
            const eventType = name
                .toLowerCase()
                .substring(2)
            dom.addEventListener(
                eventType,
                nextProps[name]
            )
        })
}

/**
 * Commits the changes made to the DOM by recursively calling the `commitWork` function on each deletion and child of the work-in-progress root.
 * Sets the current root to the work-in-progress root and clears the work-in-progress root.
 */
function commitRoot() {
    wipRoot.cleanups.forEach(cleanupFn => cleanupFn());
    deletions.forEach(commitWork);
    commitWork(wipRoot.child);
    wipRoot.effects.forEach(effect => effect());
    currentRoot = wipRoot;
    wipRoot = null;
}


/**
 * Commits the changes made to the DOM by the given fiber and its children.
 * @param {Fiber} fiber - The fiber to commit.
 * @returns {void}
 */
function commitWork(fiber) {
    if (!fiber) {
        return
    }

    let domParentFiber = fiber.parent
    while (!domParentFiber.dom) {
        domParentFiber = domParentFiber.parent
    }
    const domParent = domParentFiber.dom

    if (
        fiber.effectTag === "PLACEMENT" &&
        fiber.dom != null
    ) {
        domParent.appendChild(fiber.dom)
    } else if (
        fiber.effectTag === "UPDATE" &&
        fiber.dom != null
    ) {
        updateDom(
            fiber.dom,
            fiber.alternate.props,
            fiber.props
        )
    } else if (fiber.effectTag === "DELETION") {
        commitDeletion(fiber, domParent)
    }

    commitWork(fiber.child)
    commitWork(fiber.sibling)
}

/**
 * Removes the DOM node associated with the given fiber from its parent.
 * If the fiber has no DOM node, it recursively tries to remove the DOM node of its first child.
 *
 * @param {Object} fiber - The fiber to remove the DOM node from.
 * @param {HTMLElement} domParent - The parent DOM node to remove the fiber's DOM node from.
 */
function commitDeletion(fiber, domParent) {
    if (fiber.dom) {
        domParent.removeChild(fiber.dom)
    } else {
        commitDeletion(fiber.child, domParent)
    }
}

/**
 * Renders a React element into a container DOM node.
 *
 * @param {ReactElement} element - The React element to render.
 * @param {HTMLElement} container - The container DOM node to render the element into.
 */
function render(element, container) {
    wipRoot = {
        dom: container,
        props: {
            children: [element],
        },
        alternate: currentRoot,
    }
    deletions = []
    nextUnitOfWork = wipRoot
}

/**
 * Runs the work loop until there is no more work to be done.
 * @param {IdleDeadline} deadline - The deadline by which the work should be completed.
 */
function workLoop(deadline) {
    let shouldYield = false
    while (nextUnitOfWork && !shouldYield) {
        nextUnitOfWork = performUnitOfWork(
            nextUnitOfWork
        )
        shouldYield = deadline.timeRemaining() < 1
    }

    if (!nextUnitOfWork && wipRoot) {
        commitRoot()
    }

    requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)

/**
 * Performs a unit of work on the given fiber node, updating either a function component or a host component.
 * @param {Object} fiber - The fiber node to perform the unit of work on.
 * @returns {Object} - The next fiber node to perform work on.
 */
function performUnitOfWork(fiber) {
    const isFunctionComponent =
        fiber.type instanceof Function
    if (isFunctionComponent) {
        updateFunctionComponent(fiber)
    } else {
        updateHostComponent(fiber)
    }
    if (fiber.child) {
        return fiber.child
    }
    let nextFiber = fiber
    while (nextFiber) {
        if (nextFiber.sibling) {
            return nextFiber.sibling
        }
        nextFiber = nextFiber.parent
    }
}


/**
 * Updates a function component fiber node by setting the work-in-progress fiber to the given fiber,
 * resetting the hook index to 0, and initializing the hooks array. It then calls the function component
 * with the given props and reconciles the resulting children with the fiber.
 *
 * @param {Object} fiber - The fiber node to update.
 */
function updateFunctionComponent(fiber) {
    wipFiber = fiber
    hookIndex = 0
    wipFiber.hooks = [];
    wipFiber.effects = [];
    wipFiber.cleanups = [];
    const children = [fiber.type(fiber.props)]
    reconcileChildren(fiber, children)
}

/**
 * A custom hook that allows you to use side effects in your functional components.
 * @param {Function} callback - The function to be executed as a side effect.
 * @param {Array} dependencies - An array of dependencies that the effect depends on.
 */
function useEffect(callback, dependencies) {
    const oldHook =
        wipFiber.alternate &&
        wipFiber.alternate.hooks &&
        wipFiber.alternate.hooks[hookIndex];

    let hasChanged = true;
    if (oldHook) {
        hasChanged = dependencies.some(
            (dep, i) => dep !== oldHook.dependencies[i]
        );
    }

    if (hasChanged) {
        if (oldHook && oldHook.cleanup) { // If there's an old cleanup function, save it for later execution
            wipFiber.cleanups.push(oldHook.cleanup);
        }

        wipFiber.effects.push(() => {
            const cleanup = callback();
            if (cleanup instanceof Function) {
                wipFiber.hooks[hookIndex].cleanup = cleanup;
            }
        });
    }

    wipFiber.hooks.push({ dependencies, cleanup: null });
    hookIndex++;
}



/**
 * useState is a custom React Hook that allows functional components to have state.
 * @param {*} initial - The initial state value.
 * @returns {[*, function]} - An array containing the current state value and a function to update it.
 */
function useState(initial) {
    const oldHook =
        wipFiber.alternate &&
        wipFiber.alternate.hooks &&
        wipFiber.alternate.hooks[hookIndex]
    const hook = {
        state: oldHook ? oldHook.state : initial,
        queue: [],
    }

    const actions = oldHook ? oldHook.queue : []
    actions.forEach(action => {
        hook.state = action(hook.state)
    })

    const setState = action => {
        hook.queue.push(action)
        wipRoot = {
            dom: currentRoot.dom,
            props: currentRoot.props,
            alternate: currentRoot,
        }
        nextUnitOfWork = wipRoot
        deletions = []
    }

    wipFiber.hooks.push(hook)
    hookIndex++
    return [hook.state, setState]
}

/**
 * Updates the host component of a fiber node. If the fiber node does not have a corresponding
 * DOM node, it creates one using the `createDom` function. Then, it reconciles the children of
 * the fiber node with the children of the corresponding DOM node using the `reconcileChildren`
 * function.
 *
 * @param {Object} fiber - The fiber node to update.
 */
function updateHostComponent(fiber) {
    if (!fiber.dom) {
        fiber.dom = createDom(fiber)
    }
    reconcileChildren(fiber, fiber.props.children)
}

/**
 * Reconciles the children of a given fiber node with a new set of elements.
 * @param {Object} wipFiber - The work-in-progress fiber node.
 * @param {Array} elements - The new set of elements to reconcile with the children of the fiber node.
 */
function reconcileChildren(wipFiber, elements) {
    let index = 0
    let oldFiber =
        wipFiber.alternate && wipFiber.alternate.child
    let prevSibling = null

    while (
        index < elements.length ||
        oldFiber != null
    ) {
        const element = elements[index]
        let newFiber = null

        const sameType =
            oldFiber &&
            element &&
            element.type == oldFiber.type

        if (sameType) {
            newFiber = {
                type: oldFiber.type,
                props: element.props,
                dom: oldFiber.dom,
                parent: wipFiber,
                alternate: oldFiber,
                effectTag: "UPDATE",
            }
        }
        if (element && !sameType) {
            newFiber = {
                type: element.type,
                props: element.props,
                dom: null,
                parent: wipFiber,
                alternate: null,
                effectTag: "PLACEMENT",
            }
        }
        if (oldFiber && !sameType) {
            oldFiber.effectTag = "DELETION"
            deletions.push(oldFiber)
        }

        if (oldFiber) {
            oldFiber = oldFiber.sibling
        }

        if (index === 0) {
            wipFiber.child = newFiber
        } else if (element) {
            prevSibling.sibling = newFiber
        }

        prevSibling = newFiber
        index++
    }
}

export const Loush = {
    createElement,
    render,
    useState
}