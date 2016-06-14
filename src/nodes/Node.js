/**
 * @file 实现一套本库需要的节点类，将所有直接操作DOM的代码都封装在这里。
 * @author yibuyisheng(yibuyisheng@163.com)
 * @flow
 */
import {
    isFunction,
    isPureObject,
    isClass,
    isArray,
    distinctArr,
    extend
} from '../utils';
import Event from '../Event';

const NODE = Symbol('node');
const MANAGER = Symbol('manager');
const EVENT = Symbol('event');
const NODE_EVENT_FUNCTIONS = Symbol('nodeEventFunctions');
const IS_DARK = Symbol('isDark');
const COMMENT_NODE = Symbol('commentNode');
const NODE_VALUE = Symbol('nodeValue');
const GET_IN_DOM_NODE = Symbol('getInDOMNode');
const IN_DARK_ERROR = Symbol('inDarkError');

export default class WrapNode {
    constructor(node, manager) {
        this[NODE] = node;
        this[MANAGER] = manager;

        this[EVENT] = new Event();
        this[NODE_EVENT_FUNCTIONS] = {};

        this[IS_DARK] = false;
        this[COMMENT_NODE] = document.createComment('placeholder');
        this[NODE_VALUE] = null;
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

        if (this.getNodeType() === WrapNode.ELEMENT_NODE) {
            if (name === 'style' && isPureObject(value)) {
                return this.setStyle(value);
            }

            if (name === 'class') {
                return this.setClass(value);
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

        this[NODE].className = WrapNode.getClassList(klass).join(' ');
    }

    /**
     * 设置inline style
     *
     * @public
     * @param {Object} styleObj style对应的js对象
     */
    setStyle(styleObj) {
        for (let k in styleObj) {
            if (styleObj.hasOwnProperty(k)) {
                this[NODE].style[k] = styleObj[k];
            }
        }
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
        if (!this[IS_DARK] || !this[COMMENT_NODE].parentNode) {
            return;
        }

        this[COMMENT_NODE].parentNode.insertBefore(this[NODE], this[COMMENT_NODE]);
        this[COMMENT_NODE].parentNode.removeChild(this[COMMENT_NODE]);

        this[IS_DARK] = false;
    }

    /**
     * 将节点隐藏起来
     *
     * @public
     */
    hide() {
        if (this[IS_DARK] || !this[NODE].parentNode) {
            return;
        }

        this[NODE].parentNode.insertBefore(this[COMMENT_NODE], this[NODE]);
        this[NODE].parentNode.removeChild(this[NODE]);

        this[IS_DARK] = true;
    }

    [IN_DARK_ERROR]() {
        if (this[IS_DARK]) {
            throw new Error('current node is in dark.');
        }
    }

    [GET_IN_DOM_NODE]() {
        return this[IS_DARK] ? this[COMMENT_NODE] : this[NODE];
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
        for (let eventName in this[NODE_EVENT_FUNCTIONS]) {
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
            for (let k in klass) {
                if (klass[k]) {
                    klasses.push(klass[k]);
                }
            }
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
        let eventList = this.eventList;

        if (str.indexOf('on-') !== 0) {
            return;
        }
        str = str.slice(3);
        for (let i = 0, il = eventList.length; i < il; ++i) {
            if (str === eventList[i]) {
                return true;
            }
        }

        return false;
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

    eventList: ('blur focus focusin focusout load resize scroll unload click dblclick '
        + 'mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave '
        + 'change select submit keydown keypress keyup error contextmenu').split(' ')
});
