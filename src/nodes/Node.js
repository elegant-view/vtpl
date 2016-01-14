/**
 * @file 实现一套本库需要的节点类，将所有直接操作DOM的代码都封装在这里。
 *       如无特别说明，以`$`符号开头的成员变量是受保护的，以`$$`符号开头的成员变量是私有的。
 * @author yibuyisheng(yibuyisheng@163.com)
 */

var Base = require('../Base');
var utils = require('../utils');
var Event = require('../Event');

var Node = Base.extends(
    {
        initialize: function (node, manager) {
            Base.prototype.initialize.apply(this, arguments);

            // 弱弱地判断一下node是不是节点
            if (!node || node.ownerDocument !== document) {
                throw new TypeError('wrong `node` argument');
            }

            this.$node = node;
            this.$manager = manager;

            this.$event = new Event();
            this.$nodeEventFns = {};
        },

        getNodeType: function () {
            return this.$node.nodeType;
        },

        getChildNodes: function () {
            var nodes = [];
            var childNodes = this.$node.childNodes;
            for (var i = 0, il = childNodes.length; i < il; ++i) {
                nodes.push(this.$manager.getNode(childNodes[i]));
            }
            return nodes;
        },

        getFirstChild: function () {
            return this.$manager.getNode(this.$node.firstChild);
        },

        getLastChild: function () {
            return this.$manager.getNode(this.$node.lastChild);
        },

        equal: function (node) {
            return this.$node === node.$node;
        },

        getParentNode: function () {
            var parentNode = this.$node.parentNode
                || (this.$commentNode && this.$commentNode.parentNode);
            if (!parentNode) {
                return null;
            }

            return this.$manager.getNode(parentNode);
        },

        getNextSibling: function () {
            var nextSibling = this.$node.nextSibling
                || (this.$commentNode && this.$commentNode.nextSibling);
            if (!nextSibling) {
                return null;
            }

            return this.$manager.getNode(nextSibling);
        },

        getPreviousSibling: function () {
            var previousSibling = this.$node.previousSibling
                || (this.$commentNode && this.$commentNode.previousSibling);
            if (!previousSibling) {
                return null;
            }

            return this.$manager.getNode(previousSibling);
        },

        getAttribute: function (name) {
            return this.$node.getAttribute(name);
        },

        setAttribute: function (name, value) {
            this.$node.setAttribute(name, value);
        },

        getAttributes: function () {
            return this.$node.attributes;
        },

        getNodeValue: function () {
            return this.$node.nodeValue;
        },

        setNodeValue: function (value) {
            this.$node.nodeValue = value;
        },

        appendChild: function (node) {
            this.$node.appendChild(node.$node);
        },

        cloneNode: function () {
            return this.$manager.getNode(this.$node.cloneNode.apply(this.$node, arguments));
        },

        insertBefore: function (newNode, referenceNode) {
            return this.$manager.getNode(
                this.$node.insertBefore(newNode.$node, referenceNode.$node)
            );
        },

        getInnerHTML: function () {
            return this.$node.innerHTML;
        },

        setInnerHTML: function (html) {
            this.$node.innerHTML = html;
        },

        getTagName: function () {
            return this.$node.tagName.toLowerCase();
        },

        /**
         * 判断当前节点是否和node是兄弟关系，并且在node之后。
         *
         * @public
         * @param  {Node}  node 要对比的节点
         * @return {boolean}
         */
        isAfter: function (node) {
            if (!this.isBrotherWith(node)
                || this.equal(node)
            ) {
                return false;
            }

            for (var curNode = node.$node; curNode; curNode = curNode.nextSibling) {
                if (curNode === this.$node) {
                    return true;
                }
            }

            return false;
        },

        isBrotherWith: function (node) {
            return this.getParentNode().equal(node.getParentNode());
        },

        /**
         * 获取或设定属性值。
         * 如果参数只有一个，并且第一个参数是字符串类型，说明是获取属性值；
         * 如果参数有两个，并且第一个参数是字符串类型，说明是设置属性值；
         *
         * TODO: 完善
         *
         * @param {string} name  节点属性名
         * @param {*=} value 节点属性值
         * @return {*}
         */
        attr: function (name, value) {
            // 目前仅适用于元素节点
            if (this.getNodeType() !== Node.ELEMENT_NODE) {
                return;
            }

            // 只有一个参数，那就归到获取属性的范畴
            if (arguments.length === 1) {
                return this.getAttribute(name);
            }

            if (this.getNodeType() === Node.ELEMENT_NODE) {
                if (name === 'style' && utils.isPureObject(value)) {
                    return this.setStyle(value);
                }

                if (name === 'class') {
                    return this.setClass(value);
                }

                if (Node.isEventName(name)) {
                    return this.on(name.replace('on', ''), value);
                }

                // 外部点击事件
                if (name === 'onoutclick') {
                    return this.on('outclick', value);
                }
            }

            this.setAttribute(name, value);
        },

        setClass: function (klass) {
            if (!klass) {
                return;
            }

            this.$node.className = Node.getClassList(klass).join(' ');
        },

        setStyle: function (styleObj) {
            for (var k in styleObj) {
                if (styleObj.hasOwnProperty(k)) {
                    this.$node.style[k] = styleObj[k];
                }
            }
        },

        remove: function () {
            if (!this.$node.parentNode) {
                return;
            }
            this.$node.parentNode.removeChild(this.$node);
        },

        on: function (eventName, callback) {
            this.$event.on(eventName, callback);

            var me = this;
            if (!utils.isFunction(this.$nodeEventFns[eventName])) {
                if (eventName === 'outclick') {
                    this.$nodeEventFns[eventName] = function (event) {
                        event = event || window.event;
                        if (me.$node !== event.target && !me.$node.contains(event.target)) {
                            me.$event.trigger(eventName, event);
                        }
                    };
                    window.addEventListener('click', this.$nodeEventFns[eventName]);
                }
                else {
                    this.$nodeEventFns[eventName] = function (event) {
                        event = event || window.event;
                        me.$event.trigger(eventName, event);
                    };
                    this.$node.addEventListener(eventName, this.$nodeEventFns[eventName]);
                }
            }
        },

        off: function (eventName, callback) {
            this.$event.off(eventName, callback);

            if (this.$event.isAllRemoved()) {
                var eventFn;
                eventFn = this.$nodeEventFns[eventName];
                if (eventName === 'outclick') {
                    window.removeEventListener('click', eventFn);
                }
                else {
                    this.$node.removeEventListener(eventName, this.$nodeEventFns[eventName]);
                }
                this.$nodeEventFns[eventName] = null;
            }
        },

        getNodeId: function () {
            return this.$node[this.$manager.$$domNodeIdKey];
        },

        show: function () {
            if (this.$node.parentNode || !this.$commentNode) {
                return;
            }

            var parentNode = this.$commentNode.parentNode;
            if (parentNode) {
                parentNode.replaceChild(this.$node, this.$commentNode);
            }
        },

        hide: function () {
            if (!this.$node.parentNode) {
                return;
            }

            var parentNode = this.$node.parentNode;
            if (parentNode) {
                if (!this.$commentNode) {
                    this.$commentNode = document.createComment('node placeholder');
                    this.$commentNode[this.$manager.$$domNodeIdKey] = ++this.$manager.$idCounter;
                }
                parentNode.replaceChild(this.$commentNode, this.$node);
            }
        },

        isInDom: function () {
            return !!this.$node.parentNode;
        },

        /**
         * 销毁，做一些清理工作：
         * 1、清理outclick；
         * 2、清理事件；
         *
         * @public
         */
        destroy: function () {
            this.$event.off();

            for (var eventName in this.$nodeEventFns) {
                var eventFn = this.$nodeEventFns[eventName];
                if (eventName === 'outclick') {
                    window.removeEventListener('click', eventFn);
                }
                else {
                    this.$node.removeEventListener(eventName, eventFn);
                }
            }
        }
    },
    {
        $name: 'Node',

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
            + 'change select submit keydown keypress keyup error contextmenu').split(' '),

        getClassList: function (klass) {
            var klasses = [];
            if (utils.isClass(klass, 'String')) {
                klasses = klass.split(' ');
            }
            else if (utils.isPureObject(klass)) {
                for (var k in klass) {
                    if (klass[k]) {
                        klasses.push(klass[k]);
                    }
                }
            }
            else if (utils.isArray(klass)) {
                klasses = klass;
            }

            return utils.distinctArr(klasses);
        },

        isEventName: function (str) {
            var eventList = this.eventList;

            if (str.indexOf('on') !== 0) {
                return;
            }
            str = str.slice(2);
            for (var i = 0, il = eventList.length; i < il; ++i) {
                if (str === eventList[i]) {
                    return true;
                }
            }

            return false;
        },

        /**
         * 将NodeList转换成真正的数组
         *
         * @static
         * @param {(NodeList|Array.<Node>)} nodeList DOM节点列表
         * @return {Array.<Node>}
         */
        toArray: function (nodeList) {
            if (utils.isArray(nodeList)) {
                return nodeList;
            }

            try {
                return utils.slice(nodeList, 0);
            }
            catch (e) {
                // IE8 及更早版本将 NodeList 实现为一个 COM 对象，因此只能一个一个遍历出来。
                var list = [];
                for (var i = 0, il = nodeList.length; i < il; ++i) {
                    list.push(nodeList[i]);
                }
                return list;
            }
        },

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
         * @param {Node} startNode 起始节点
         * @param {Node} endNode 终止节点
         * @param {function(Node):(Node|undefined|boolean)} iterateFn 迭代函数。
         *                             如果这个函数返回了一个Node对象，则把这个Node对象当成下一个要遍历的节点。
         * @return {boolean} 如果是true，说明在遍历子节点的时候中途中断了，不需要继续遍历了。
         */
        iterate: function (startNode, endNode, iterateFn) {
            if (!utils.isFunction(iterateFn)) {
                return;
            }

            var curNode = startNode;
            while (curNode) {
                var nextNode = iterateFn(curNode);

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
                else if (nextNode instanceof Node) {
                    if (!nextNode.isAfter(curNode)) {
                        throw new Error('wrong next node');
                    }

                    curNode = nextNode;
                }
                // 外部提供获取下一个节点和获取当前节点的子节点方法
                else if (nextNode.type === 'options') {
                    var childNodes = nextNode.getChildNodes instanceof Function
                        ? nextNode.getChildNodes(curNode)
                        : (Node.ELEMENT_NODE === curNode.getNodeType() ? curNode.getChildNodes() : []);

                    if (iterateChildren(childNodes)) {
                        return true;
                    }

                    curNode = nextNode.getNextNode instanceof Function
                        ? nextNode.getNextNode(curNode)
                        : curNode.getNextSibling();
                }

                if (curNode && curNode.isAfter(endNode)) {
                    curNode = null;
                }

            }

            function iterateChildren(childNodes) {
                if (childNodes.length) {
                    if (true === Node.iterate(childNodes[0], childNodes[childNodes.length - 1], iterateFn)) {
                        curNode = null;
                        return true;
                    }
                }
            }
        }
    }
);

module.exports = Node;
