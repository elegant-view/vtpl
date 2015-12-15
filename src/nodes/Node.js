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

            this.$node.className = this.getClassList(klass).join(' ');
        },

        setStyle: function (styleObj) {
            for (var k in styleObj) {
                if (styleObj.hasOwnProperty(k)) {
                    this.$node.style[k] = styleObj[k];
                }
            }
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
                    this.$commentNode.$nodeId = ++this.$manager.$idCounter;
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
         * 遍历DOM树
         *
         * @static
         * @param {Node} startNode 起始节点
         * @param {Node} endNode 终止节点
         * @param {function(Node):(Node|undefined|boolean)} iterateFn 迭代函数。
         *                                                            如果这个函数返回了一个Node对象，则把这个Node对象当成下一个要遍历的节点
         * @return {boolean} 如果是true，说明在遍历子节点的时候中途中断了，不需要继续遍历了。
         */
        iterate: function (startNode, endNode, iterateFn) {
            if (!utils.isFunction(iterateFn)) {
                return;
            }

            var curNode = startNode;
            while (curNode) {
                var nextNode = iterateFn(curNode);
                if (nextNode === true) {
                    return true;
                }

                if (Node.ELEMENT_NODE === curNode.getNodeType()) {
                    var childNodes = curNode.getChildNodes();
                    if (childNodes.length) {
                        if (true === Node.iterate(
                            childNodes[0],
                            childNodes[childNodes.length - 1],
                            iterateFn)
                        ) {
                            curNode = null;
                            return true;
                        }
                    }
                }

                if (nextNode instanceof Node) {
                    if (!nextNode.isAfter(curNode)) {
                        throw new Error('wrong next node');
                    }

                    curNode = nextNode;
                }
                else if (!nextNode) {
                    curNode = curNode.getNextSibling();
                }

                if (curNode && curNode.isAfter(endNode)) {
                    curNode = null;
                }

            }
        }
    }
);

module.exports = Node;
