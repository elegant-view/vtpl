/**
 * @file 实现一套本库需要的节点类，将所有直接操作DOM的代码都封装在这里。
 * @author yibuyisheng(yibuyisheng@163.com)
 */
import {
    isFunction,
    isPureObject,
    isClass,
    isArray,
    distinctArr,
    extend
} from '../utils';
import DoneEvent from '../DoneEvent';
import mixin from '../decorators/mixin';
import StateTrait from '../decorators/StateTrait';

const NODE = Symbol('node');
const MANAGER = Symbol('manager');
const EVENT = Symbol('event');
const NODE_EVENT_FUNCTIONS = Symbol('nodeEventFunctions');
const COMMENT_NODE = Symbol('commentNode');
const NODE_VALUE = Symbol('nodeValue');
const GET_IN_DOM_NODE = Symbol('getInDOMNode');
const IN_DARK_ERROR = Symbol('inDarkError');

/**
 * 使用到的状态：dark
 *
 * @class WrapNode
 * @extends {State}
 */
@mixin(StateTrait)
export default class WrapNode {

    /**
     * constructor
     *
     * @public
     * @param {WrapNode} node node
     * @param {NodesManager} manager manager
     */
    constructor(node, manager) {
        this[NODE] = node;
        this[MANAGER] = manager;

        this[EVENT] = new DoneEvent();
        this[NODE_EVENT_FUNCTIONS] = {};

        this[NODE_VALUE] = null;

        this[COMMENT_NODE] = document.createComment('holder');
    }

    /**
     * 获取节点类型
     *
     * @public
     * @return {number} 指代节点类型的数值
     */
    getNodeType() {
        return this[NODE].nodeType;
    }

    /**
     * 获取所有子节点的一个快照
     *
     * @public
     * @return {Array.<WrapNode>}
     */
    getChildNodes() {
        this[IN_DARK_ERROR]();

        const nodes = [];
        const childNodes = this[NODE].childNodes;
        for (let i = 0, il = childNodes.length; i < il; ++i) {
            nodes.push(this[MANAGER].getNode(childNodes[i]));
        }
        return nodes;
    }

    /**
     * 获取第一个子节点
     *
     * @public
     * @return {WrapNode}
     */
    getFirstChild() {
        this[IN_DARK_ERROR]();
        return this[MANAGER].getNode(this[NODE].firstChild);
    }

    /**
     * 获取最后一个子节点
     *
     * @public
     * @return {WrapNode}
     */
    getLastChild() {
        this[IN_DARK_ERROR]();
        return this[MANAGER].getNode(this[NODE].lastChild);
    }

    /**
     * 检查两个节点是否对应同一个DOM节点
     *
     * @public
     * @param  {WrapNode} node 要比较的节点
     * @return {boolean}
     */
    equal(node) {
        return WrapNode.isNode(node) && this[NODE] === node[NODE];
    }

    /**
     * 获取父节点
     *
     * @public
     * @return {WrapNode}
     */
    getParentNode() {
        const inDOMNode = this[GET_IN_DOM_NODE]();

        if (inDOMNode) {
            const parentNode = inDOMNode.parentNode;
            return this[MANAGER].getNode(parentNode);
        }
    }

    /**
     * 获取下一个兄弟节点
     *
     * @public
     * @return {WrapNode}
     */
    getNextSibling() {
        const inDOMNode = this[GET_IN_DOM_NODE]();
        return this[MANAGER].getNode(inDOMNode.nextSibling);
    }

    /**
     * 获取上一个兄弟节点
     *
     * @public
     * @return {WrapNode}
     */
    getPreviousSibling() {
        const inDOMNode = this[GET_IN_DOM_NODE]();
        return this[MANAGER].getNode(inDOMNode.previousSibling);
    }

    /**
     * 获取指定的属性值
     *
     * @public
     * @param  {string} name 属性名
     * @return {string}
     */
    getAttribute(name) {
        return this[NODE].getAttribute(name);
    }

    /**
     * 设置属性值
     *
     * @public
     * @param {string} name  属性名
     * @param {string} value 属性值
     */
    setAttribute(name, value) {
        this[NODE].setAttribute(name, value);
    }

    /**
     * 获取所有属性
     *
     * @public
     * @return {NamedNodeMap}
     */
    getAttributes() {
        return this[NODE].attributes;
    }

    /**
     * 获取节点值
     *
     * @public
     * @return {string}
     */
    getNodeValue() {
        return this[NODE].nodeValue;
    }

    /**
     * 设置节点值
     *
     * @public
     * @param {string} value 节点值
     */
    setNodeValue(value) {
        this[NODE].nodeValue = value;
    }

    /**
     * 在尾部添加一个子节点
     *
     * @public
     * @param  {WrapNode} node 待添加的节点
     */
    appendChild(node) {
        this[NODE].appendChild(node[NODE]);
    }

    /**
     * 克隆一下节点
     *
     * @public
     * @param  {boolean=} deep 是否连子树一起克隆
     * @return {WrapNode}
     */
    cloneNode(deep) {
        return this[MANAGER].getNode(
            this[NODE].cloneNode(deep)
        );
    }

    /**
     * 在指定节点之前插入节点
     *
     * @public
     * @param  {WrapNode} newNode       待插入的节点
     * @param  {WrapNode} referenceNode 相对节点
     * @return {WrapNode}               返回插入的节点
     */
    insertBefore(newNode, referenceNode) {
        this[IN_DARK_ERROR]();
        return this[MANAGER].getNode(
            this[NODE].insertBefore(newNode[NODE], referenceNode[NODE])
        );
    }

    /**
     * 获取内部html字符串
     *
     * @public
     * @return {string}
     */
    getInnerHTML() {
        return this[NODE].innerHTML;
    }

    /**
     * 设置内部html
     *
     * @public
     * @param {string} html html字符串
     */
    setInnerHTML(html) {
        this[NODE].innerHTML = html;
    }

    /**
     * 获取当前节点的标签名字
     *
     * @public
     * @return {string}
     */
    getTagName() {
        return this[NODE].tagName.toLowerCase();
    }

    /**
     * 获取输入型控件的值
     *
     * @public
     * @return {string}
     */
    getValue() {
        return this[NODE].value;
    }

    /**
     * 设置输入型控件的值
     *
     * @public
     * @param {string|number} value 值
     */
    setValue(value) {
        this[NODE].value = value;
    }

    /**
     * 判断当前节点是否和node是兄弟关系，并且在node之后。
     *
     * @public
     * @param  {WrapNode}  node 要对比的节点
     * @return {boolean}
     */
    isAfter(node) {
        if (!this.isBrotherWith(node)
            || this.equal(node)
        ) {
            return false;
        }

        const thisInDOMNode = this[GET_IN_DOM_NODE]();
        const thatInDOMNode = node[GET_IN_DOM_NODE]();

        for (let curNode = thatInDOMNode; curNode; curNode = curNode.nextSibling) {
            if (curNode === thisInDOMNode) {
                return true;
            }
        }

        return false;
    }

    /**
     * 判断当前节点是否是指定节点的兄弟节点
     *
     * @public
     * @param  {WrapNode}  node 指定节点
     * @return {boolean}
     */
    isBrotherWith(node) {
        return this.getParentNode().equal(node.getParentNode());
    }

    /**
     * 获取或设定属性值。
     * 如果参数只有一个，并且第一个参数是字符串类型，说明是获取属性值；
     * 如果参数有两个，并且第一个参数是字符串类型，说明是设置属性值；
     *
     * TODO: 完善
     *
     * @public
     * @param {string} name  节点属性名
     * @param {*=} value 节点属性值
     * @return {*}
     */
    attr(name, value) {
        /* eslint-disable prefer-rest-params */
        if (this.getNodeType() === WrapNode.TEXT_NODE && name === 'nodeValue') {
            if (arguments.length === 1) {
                return this.getNodeValue();
            }

            return this.setNodeValue(value);
        }

        if (this.getNodeType() !== WrapNode.ELEMENT_NODE) {
            return;
        }

        // 只有一个参数，那就归到获取属性的范畴
        if (arguments.length === 1) {
            return this.getAttribute(name);
        }
        /* eslint-enable prefer-rest-params */

        if (this.getNodeType() === WrapNode.ELEMENT_NODE) {
            if (name === 'style' && isPureObject(value)) {
                return this.setStyle(value);
            }

            if (name === 'class') {
                return this.setClass(value);
            }

            if (name === 'readonly') {
                return this[NODE].readOnly = value;
            }

            if (WrapNode.isEventName(name)) {
                return this.on(name.replace('on', ''), value);
            }

            // 外部点击事件
            if (name === 'onoutclick') {
                return this.on('outclick', value);
            }

            if (name === 'value') {
                return this[NODE].value = value;
            }
        }

        this.setAttribute(name, value);
    }

    /**
     * 设置css类
     *
     * @public
     * @param {string|Object} klass 一串css类字符串或者一个Object
     */
    setClass(klass) {
        if (!klass) {
            return;
        }

        const classList = WrapNode.getClassList(klass);
        this[NODE].className = classList && classList.length ? classList.join(' ') : klass + '';
    }

    /**
     * 设置inline style
     *
     * @public
     * @param {Object} styleObj style对应的js对象
     */
    setStyle(styleObj) {
        /* eslint-disable guard-for-in */
        /* eslint-disable fecs-use-for-of */
        for (let k in styleObj) {
            if (styleObj.hasOwnProperty(k)) {
                this[NODE].style[k] = styleObj[k];
            }
        }
        /* eslint-enable guard-for-in */
        /* eslint-enable fecs-use-for-of */
    }

    /**
     * 获取元素在页面中的位置和尺寸信息
     *
     * @public
     * @return {Object} 元素的尺寸和位置信息，包含`top`、`right`、`bottom`、`left`、`width`和`height`属性
     */
    getBoundingClientRect() {
        const rect = this[NODE].getBoundingClientRect();
        const offset = {
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            left: rect.left,
            width: rect.right - rect.left,
            height: rect.bottom - rect.top
        };
        const clientTop = document.documentElement.clientTop
            || document.body.clientTop
            || 0;
        const clientLeft = document.documentElement.clientLeft
            || document.body.clientLeft
            || 0;
        const scrollTop = window.pageYOffset
            || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset
            || document.documentElement.scrollLeft;
        offset.top = offset.top + scrollTop - clientTop;
        offset.bottom = offset.bottom + scrollTop - clientTop;
        offset.left = offset.left + scrollLeft - clientLeft;
        offset.right = offset.right + scrollLeft - clientLeft;

        return offset;
    }

    /**
     * clientHeight
     *
     * @public
     * @return {number}
     */
    getClientHeight() {
        return this[NODE].clientHeight;
    }

    /**
     * clientWidth
     *
     * @public
     * @return {number}
     */
    getClientWidth() {
        return this[NODE].clientWidth;
    }

    /**
     * 从父节点中移除当前节点
     *
     * @public
     */
    remove() {
        if (this[COMMENT_NODE].parentNode) {
            this[COMMENT_NODE].parentNode.removeChild(this[COMMENT_NODE]);
        }
        if (this[NODE].parentNode) {
            this[NODE].parentNode.removeChild(this[NODE]);
        }
    }

    /**
     * 包含
     *
     * @public
     * @param  {WrapNode} node 节点
     * @return {boolean}
     */
    contains(node) {
        return this[NODE].contains(node[NODE]);
    }

    /**
     * 绑定节点事件
     *
     * @public
     * @param  {string}   eventName 事件名
     * @param  {function(Event)} callback  回调函数
     */
    on(eventName, callback) {
        this[EVENT].on(eventName, callback);

        const me = this;
        if (!isFunction(this[NODE_EVENT_FUNCTIONS][eventName])) {
            if (eventName === 'outclick') {
                this[NODE_EVENT_FUNCTIONS][eventName] = function (event) {
                    event = event || window.event;
                    if (me[NODE] !== event.target
                        && !me[NODE].contains(event.target)
                    ) {
                        me[EVENT].trigger(eventName, event);
                    }
                };
                window.addEventListener('click', this[NODE_EVENT_FUNCTIONS][eventName]);
            }
            else {
                this[NODE_EVENT_FUNCTIONS][eventName] = function (event) {
                    event = event || window.event;
                    me[EVENT].trigger(eventName, event);
                };
                this[NODE].addEventListener(eventName, this[NODE_EVENT_FUNCTIONS][eventName]);
            }
        }
    }

    /**
     * 解绑事件
     *
     * @public
     * @param  {string}   eventName 事件名
     * @param  {Function=} callback  回调函数
     */
    off(eventName, callback) {
        this[EVENT].off(eventName, callback);

        if (this[EVENT].isAllRemoved(eventName, callback)) {
            let eventFn;
            eventFn = this[NODE_EVENT_FUNCTIONS][eventName];
            if (eventName === 'outclick') {
                window.removeEventListener('click', eventFn);
            }
            else {
                this[NODE].removeEventListener(eventName, this[NODE_EVENT_FUNCTIONS][eventName]);
            }
            this[NODE_EVENT_FUNCTIONS][eventName] = null;
        }
    }

    /**
     * 获取当前节点在库内部分配到的id
     *
     * @public
     * @return {string}
     */
    getNodeId() {
        return this[NODE][this[MANAGER].domNodeIdKey];
    }

    /**
     * 将节点展现出来
     *
     * @public
     */
    show() {
        if (this.hasState('dark')) {
            const parentNode = this[COMMENT_NODE] && this[COMMENT_NODE].parentNode;
            if (parentNode) {
                parentNode.insertBefore(this[NODE], this[COMMENT_NODE]);
                parentNode.removeChild(this[COMMENT_NODE]);
            }
            this.removeState('dark');
        }
    }

    /**
     * 将节点隐藏起来
     *
     * @public
     */
    hide() {
        if (!this.hasState('dark')) {
            const parentNode = this[NODE] && this[NODE].parentNode;
            if (parentNode) {
                parentNode.insertBefore(this[COMMENT_NODE], this[NODE]);
                parentNode.removeChild(this[NODE]);
            }
            this.addState('dark');
        }
    }

    /**
     * 判断节点是否隐藏
     *
     * @public
     * @return {boolean}
     */
    isHidden() {
        return this.hasState('dark');
    }

    /**
     * in dark error
     *
     * @private
     */
    [IN_DARK_ERROR]() {
        if (this.hasState('dark')) {
            throw new Error('current node is in dark.');
        }
    }

    /**
     * get in dom node
     *
     * @private
     * @return {WrapNode}
     */
    [GET_IN_DOM_NODE]() {
        return this.hasState('dark') ? this[COMMENT_NODE] : this[NODE];
    }

    /**
     * 获取outerHTML
     *
     * @public
     * @return {string}
     */
    getOuterHTML() {
        let div = document.createElement('div');
        div.appendChild(this[NODE].cloneNode(true));
        const html = div.innerHTML;
        div = null;
        return html;
    }

    /**
     * 判断节点是否在DOM树种
     *
     * @public
     * @return {boolean}
     */
    isInDom() {
        return !!this[NODE].parentNode;
    }

    /**
     * 获取对应的DOM节点
     *
     * @public
     * @return {Node}
     */
    getDOMNode() {
        return this[NODE];
    }

    /**
     * 销毁，做一些清理工作：
     * 1、清理outclick；
     * 2、清理事件；
     *
     * @public
     */
    destroy() {
        this[EVENT].off();

        /* eslint-disable guard-for-in */
        /* eslint-disable fecs-use-for-of */
        for (let eventName in this[NODE_EVENT_FUNCTIONS]) {
        /* eslint-enable fecs-use-for-of */
        /* eslint-enable guard-for-in */
            let eventFn = this[NODE_EVENT_FUNCTIONS][eventName];
            if (eventName === 'outclick') {
                window.removeEventListener('click', eventFn);
            }
            else {
                this[NODE].removeEventListener(eventName, eventFn);
            }
        }

        this[NODE] = null;
    }

    /**
     * 解析klass，生成一个css类字符串的数组
     *
     * @static
     * @param  {string|Object} klass klass
     * @return {Array.<string>}
     */
    static getClassList(klass) {
        let klasses = [];
        if (isClass(klass, 'String')) {
            klasses = klass.split(' ');
        }
        else if (isPureObject(klass)) {
            /* eslint-disable guard-for-in */
            /* eslint-disable fecs-use-for-of */
            for (let k in klass) {
                if (klass[k]) {
                    klasses.push(klass[k]);
                }
            }
            /* eslint-enable guard-for-in */
            /* eslint-enable fecs-use-for-of */
        }
        else if (isArray(klass)) {
            klasses = klass;
        }

        return distinctArr(klasses);
    }

    /**
     * 判断str是不是DOM事件名
     *
     * @static
     * @param  {string}  str 事件名
     * @return {boolean}
     */
    static isEventName(str) {
        if (str.indexOf('on-') !== 0) {
            return;
        }
        str = str.slice(3);
        return !!this.eventMap[str];
    }

    /**
     * 将NodeList转换成真正的数组
     *
     * @static
     * @param {(NodeList|Array.<WrapNode>)} nodeList DOM节点列表
     * @return {Array.<WrapNode>}
     */
    static toArray(nodeList) {
        if (isArray(nodeList)) {
            return nodeList;
        }

        try {
            return Array.prototype.slice.call(nodeList, 0);
        }
        catch (e) {
            // IE8 及更早版本将 NodeList 实现为一个 COM 对象，因此只能一个一个遍历出来。
            let list = [];
            for (let i = 0, il = nodeList.length; i < il; ++i) {
                list.push(nodeList[i]);
            }
            return list;
        }
    }

    /**
     * 遍历DOM树。
     *
     * 遍历过程会受iterateFn影响：
     * - 如果iterateFn返回true，则说明要跳出遍历了（即不会遍历当前节点的下一个兄弟节点），但是在跳出之前，还是要遍历完当前节点的子孙节点的；
     * - 如果iterateFn返回一个节点对象，做如下判断：
     *     - 如果这个节点不是当前节点之后的兄弟节点，则抛出异常；
     *     - 如果是，则将当前节点设为这个节点对象。
     * - 如果返回的是其他值，则自动将当前节点设为下一个兄弟节点。
     *
     * 此处有个很蛋碎的问题，就是如果iterateFn里面做了破坏DOM树形结构的操作的话，遍历就会出现困难。
     * 所以在实际操作中建议延迟处理（即遍历完之后）这种破坏结构的DOM操作。
     *
     * @static
     * @param {WrapNode} startNode 起始节点
     * @param {WrapNode} endNode 终止节点
     * @param {function(WrapNode):(WrapNode|undefined|boolean)} iterateFn 迭代函数。
     *                             如果这个函数返回了一个Node对象，则把这个Node对象当成下一个要遍历的节点。
     * @return {boolean} 如果是true，说明在遍历子节点的时候中途中断了，不需要继续遍历了。
     */
    static iterate(startNode, endNode, iterateFn) {
        if (!isFunction(iterateFn)) {
            return;
        }

        let curNode = startNode;
        while (curNode) {
            let nextNode = iterateFn(curNode);

            if (!nextNode) {
                if (iterateChildren(curNode)) {
                    return true;
                }
                curNode = curNode.getNextSibling();
            }
            else if (nextNode === true) {
                iterateChildren(curNode);
                return true;
            }
            // 对于给定了下一个节点的情况，就不再遍历curNode的子节点了
            else if (WrapNode.isNode(nextNode)) {
                if (!nextNode.isAfter(curNode)) {
                    throw new Error('wrong next node');
                }

                curNode = nextNode;
            }
            // 外部提供获取下一个节点和获取当前节点的子节点方法
            else if (nextNode.type === 'options') {
                let childNodes = isFunction(nextNode.getChildNodes)
                    ? nextNode.getChildNodes(curNode)
                    : (WrapNode.ELEMENT_NODE === curNode.getNodeType() ? curNode.getChildNodes() : []);

                if (iterateChildren(childNodes)) {
                    return true;
                }

                curNode = isFunction(nextNode.getNextNode)
                    ? nextNode.getNextNode(curNode)
                    : curNode.getNextSibling();
            }

            if (curNode && curNode.isAfter(endNode)) {
                curNode = null;
            }

        }

        function iterateChildren(childNodes) {
            if (childNodes.length) {
                let isBreak = WrapNode.iterate(
                    childNodes[0],
                    childNodes[childNodes.length - 1],
                    iterateFn
                );
                if (isBreak === true) {
                    curNode = null;
                    return true;
                }
            }
        }
    }

    static isNode(obj) {
        return obj instanceof WrapNode;
    }

    static removeFromDOM(startNode, endNode) {
        if (!WrapNode.isNode(startNode) || !WrapNode.isNode(endNode)) {
            return;
        }

        if (!startNode.getParentNode() || !endNode.getParentNode()) {
            startNode.remove();
            endNode.remove();
            return;
        }

        if (!startNode.isBrotherWith(endNode)) {
            throw new Error('not brother node');
        }

        let curNode = startNode;
        while (curNode) {
            const nextNode = curNode.getNextSibling();
            curNode.remove();

            if (curNode === endNode) {
                break;
            }
            curNode = nextNode;
        }
    }

    /**
     * 获取视口高度
     *
     * @static
     * @param {Window=} win 窗口对象
     * @return {number}
     */
    static getWindowHeight(win) {
        win = win || window;
        return win.innerHeight;
    }
}

extend(WrapNode, {
    ELEMENT_NODE: 1,
    ATTRIBUTE_NODE: 2,
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    ENTITY_REFERENCE_NODE: 5,
    ENTITY_NODE: 6,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11,
    NOTATION_NODE: 12,

    eventMap: {
        blur: true,
        focus: true,
        focusin: true,
        focusout: true,
        load: true,
        resize: true,
        scroll: true,
        unload: true,
        click: true,
        dblclick: true,
        mousedown: true,
        mouseup: true,
        mousemove: true,
        mouseover: true,
        mouseout: true,
        mouseenter: true,
        mouseleave: true,
        change: true,
        select: true,
        submit: true,
        keydown: true,
        keypress: true,
        keyup: true,
        error: true,
        contextmenu: true,

        outclick: true
    }
});
