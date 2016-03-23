define(['exports', '../utils', '../Event'], function (exports, _utils, _Event) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

    var _Event2 = _interopRequireDefault(_Event);

    function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : {
            default: obj
        };
    }

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    var Node = function () {
        function Node(node, manager) {
            _classCallCheck(this, Node);

            this.$node = node;
            this.$manager = manager;

            this.$event = new _Event2.default();
            this.$nodeEventFns = {};

            this.$$isGoDark = false;
        }

        _createClass(Node, [{
            key: 'getNodeType',
            value: function getNodeType() {
                return this.$node.nodeType;
            }
        }, {
            key: 'getChildNodes',
            value: function getChildNodes() {
                var nodes = [];
                var childNodes = this.$node.childNodes;
                for (var i = 0, il = childNodes.length; i < il; ++i) {
                    nodes.push(this.$manager.getNode(childNodes[i]));
                }
                return nodes;
            }
        }, {
            key: 'getFirstChild',
            value: function getFirstChild() {
                return this.$manager.getNode(this.$node.firstChild);
            }
        }, {
            key: 'getLastChild',
            value: function getLastChild() {
                return this.$manager.getNode(this.$node.lastChild);
            }
        }, {
            key: 'equal',
            value: function equal(node) {
                return this.$node === node.$node;
            }
        }, {
            key: 'getParentNode',
            value: function getParentNode() {
                var parentNode = this.$node.parentNode || this.$commentNode && this.$commentNode.parentNode;
                if (!parentNode) {
                    return null;
                }

                return this.$manager.getNode(parentNode);
            }
        }, {
            key: 'getNextSibling',
            value: function getNextSibling() {
                var nextSibling = this.$node.nextSibling || this.$commentNode && this.$commentNode.nextSibling;
                if (!nextSibling) {
                    return null;
                }

                return this.$manager.getNode(nextSibling);
            }
        }, {
            key: 'getPreviousSibling',
            value: function getPreviousSibling() {
                var previousSibling = this.$node.previousSibling || this.$commentNode && this.$commentNode.previousSibling;
                if (!previousSibling) {
                    return null;
                }

                return this.$manager.getNode(previousSibling);
            }
        }, {
            key: 'getAttribute',
            value: function getAttribute(name) {
                return this.$node.getAttribute(name);
            }
        }, {
            key: 'setAttribute',
            value: function setAttribute(name, value) {
                this.$node.setAttribute(name, value);
            }
        }, {
            key: 'getAttributes',
            value: function getAttributes() {
                return this.$node.attributes;
            }
        }, {
            key: 'getNodeValue',
            value: function getNodeValue() {
                return this.$node.nodeValue;
            }
        }, {
            key: 'setNodeValue',
            value: function setNodeValue(value) {
                if (this.$$isGoDark) {
                    this.$$nodeValue = value;
                } else {
                    this.$node.nodeValue = value;
                }
            }
        }, {
            key: 'appendChild',
            value: function appendChild(node) {
                this.$node.appendChild(node.$node);
            }
        }, {
            key: 'cloneNode',
            value: function cloneNode() {
                return this.$manager.getNode(this.$node.cloneNode.apply(this.$node, arguments));
            }
        }, {
            key: 'insertBefore',
            value: function insertBefore(newNode, referenceNode) {
                return this.$manager.getNode(this.$node.insertBefore(newNode.$node, referenceNode.$node));
            }
        }, {
            key: 'getInnerHTML',
            value: function getInnerHTML() {
                return this.$node.innerHTML;
            }
        }, {
            key: 'setInnerHTML',
            value: function setInnerHTML(html) {
                this.$node.innerHTML = html;
            }
        }, {
            key: 'getTagName',
            value: function getTagName() {
                return this.$node.tagName.toLowerCase();
            }
        }, {
            key: 'getValue',
            value: function getValue() {
                return this.$node.value;
            }
        }, {
            key: 'isAfter',
            value: function isAfter(node) {
                if (!this.isBrotherWith(node) || this.equal(node)) {
                    return false;
                }

                for (var curNode = node.$node; curNode; curNode = curNode.nextSibling) {
                    if (curNode === this.$node) {
                        return true;
                    }
                }

                return false;
            }
        }, {
            key: 'isBrotherWith',
            value: function isBrotherWith(node) {
                return this.getParentNode().equal(node.getParentNode());
            }
        }, {
            key: 'attr',
            value: function attr(name, value) {
                if (this.getNodeType() === Node.TEXT_NODE && name === 'nodeValue') {
                    if (arguments.length === 1) {
                        return this.getNodeValue();
                    }

                    return this.setNodeValue(value);
                }

                if (this.getNodeType() !== Node.ELEMENT_NODE) {
                    return;
                }

                // 只有一个参数，那就归到获取属性的范畴
                if (arguments.length === 1) {
                    return this.getAttribute(name);
                }

                if (this.getNodeType() === Node.ELEMENT_NODE) {
                    if (name === 'style' && (0, _utils.isPureObject)(value)) {
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
            }
        }, {
            key: 'setClass',
            value: function setClass(klass) {
                if (!klass) {
                    return;
                }

                this.$node.className = Node.getClassList(klass).join(' ');
            }
        }, {
            key: 'setStyle',
            value: function setStyle(styleObj) {
                for (var k in styleObj) {
                    if (styleObj.hasOwnProperty(k)) {
                        this.$node.style[k] = styleObj[k];
                    }
                }
            }
        }, {
            key: 'remove',
            value: function remove() {
                if (!this.$node.parentNode) {
                    return;
                }
                this.$node.parentNode.removeChild(this.$node);
            }
        }, {
            key: 'on',
            value: function on(eventName, callback) {
                this.$event.on(eventName, callback);

                var me = this;
                if (!(0, _utils.isFunction)(this.$nodeEventFns[eventName])) {
                    if (eventName === 'outclick') {
                        this.$nodeEventFns[eventName] = function (event) {
                            event = event || window.event;
                            if (me.$node !== event.target && !me.$node.contains(event.target)) {
                                me.$event.trigger(eventName, event);
                            }
                        };
                        window.addEventListener('click', this.$nodeEventFns[eventName]);
                    } else {
                        this.$nodeEventFns[eventName] = function (event) {
                            event = event || window.event;
                            me.$event.trigger(eventName, event);
                        };
                        this.$node.addEventListener(eventName, this.$nodeEventFns[eventName]);
                    }
                }
            }
        }, {
            key: 'off',
            value: function off(eventName, callback) {
                this.$event.off(eventName, callback);

                if (this.$event.isAllRemoved(eventName, callback)) {
                    var eventFn = void 0;
                    eventFn = this.$nodeEventFns[eventName];
                    if (eventName === 'outclick') {
                        window.removeEventListener('click', eventFn);
                    } else {
                        this.$node.removeEventListener(eventName, this.$nodeEventFns[eventName]);
                    }
                    this.$nodeEventFns[eventName] = null;
                }
            }
        }, {
            key: 'getNodeId',
            value: function getNodeId() {
                return this.$node[this.$manager.$$domNodeIdKey];
            }
        }, {
            key: 'show',
            value: function show() {
                if (!this.$$isGoDark) {
                    return;
                }

                if (this.$node.nodeType === Node.ELEMENT_NODE) {
                    this.$node.style.display = null;
                } else if (this.$node.nodeType === Node.TEXT_NODE) {
                    if (this.$$nodeValue !== undefined) {
                        this.$node.nodeValue = this.$$nodeValue;
                        this.$$nodeValue = undefined;
                    }
                }

                this.$$isGoDark = false;
            }
        }, {
            key: 'hide',
            value: function hide() {
                if (this.$$isGoDark) {
                    return;
                }

                if (this.$node.nodeType === Node.ELEMENT_NODE) {
                    this.$node.style.display = 'none';
                } else if (this.$node.nodeType === Node.TEXT_NODE) {
                    this.$$nodeValue = this.$node.nodeValue;
                    this.$node.nodeValue = '';
                }

                this.$$isGoDark = true;
            }
        }, {
            key: 'getOuterHTML',
            value: function getOuterHTML() {
                var div = document.createElement('div');
                div.appendChild(this.$node.cloneNode(true));
                var html = div.innerHTML;
                div = null;
                return html;
            }
        }, {
            key: 'isInDom',
            value: function isInDom() {
                return !!this.$node.parentNode;
            }
        }, {
            key: 'getDOMNode',
            value: function getDOMNode() {
                return this.$node;
            }
        }, {
            key: 'destroy',
            value: function destroy() {
                this.$event.off();

                /* eslint-disable guard-for-in */
                for (var eventName in this.$nodeEventFns) {
                    /* eslint-enable guard-for-in */
                    var eventFn = this.$nodeEventFns[eventName];
                    if (eventName === 'outclick') {
                        window.removeEventListener('click', eventFn);
                    } else {
                        this.$node.removeEventListener(eventName, eventFn);
                    }
                }

                this.$node = null;
            }
        }], [{
            key: 'getClassList',
            value: function getClassList(klass) {
                var klasses = [];
                if ((0, _utils.isClass)(klass, 'String')) {
                    klasses = klass.split(' ');
                } else if ((0, _utils.isPureObject)(klass)) {
                    for (var k in klass) {
                        if (klass[k]) {
                            klasses.push(klass[k]);
                        }
                    }
                } else if ((0, _utils.isArray)(klass)) {
                    klasses = klass;
                }

                return (0, _utils.distinctArr)(klasses);
            }
        }, {
            key: 'isEventName',
            value: function isEventName(str) {
                var eventList = this.eventList;

                if (str.indexOf('on-') !== 0) {
                    return;
                }
                str = str.slice(3);
                for (var i = 0, il = eventList.length; i < il; ++i) {
                    if (str === eventList[i]) {
                        return true;
                    }
                }

                return false;
            }
        }, {
            key: 'toArray',
            value: function toArray(nodeList) {
                if ((0, _utils.isArray)(nodeList)) {
                    return nodeList;
                }

                try {
                    return (0, _utils.slice)(nodeList, 0);
                } catch (e) {
                    // IE8 及更早版本将 NodeList 实现为一个 COM 对象，因此只能一个一个遍历出来。
                    var list = [];
                    for (var i = 0, il = nodeList.length; i < il; ++i) {
                        list.push(nodeList[i]);
                    }
                    return list;
                }
            }
        }, {
            key: 'iterate',
            value: function iterate(startNode, endNode, iterateFn) {
                if (!(0, _utils.isFunction)(iterateFn)) {
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
                    } else if (nextNode === true) {
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
                                var childNodes = nextNode.getChildNodes instanceof Function ? nextNode.getChildNodes(curNode) : Node.ELEMENT_NODE === curNode.getNodeType() ? curNode.getChildNodes() : [];

                                if (iterateChildren(childNodes)) {
                                    return true;
                                }

                                curNode = nextNode.getNextNode instanceof Function ? nextNode.getNextNode(curNode) : curNode.getNextSibling();
                            }

                    if (curNode && curNode.isAfter(endNode)) {
                        curNode = null;
                    }
                }

                function iterateChildren(childNodes) {
                    if (childNodes.length) {
                        var isBreak = Node.iterate(childNodes[0], childNodes[childNodes.length - 1], iterateFn);
                        if (isBreak === true) {
                            curNode = null;
                            return true;
                        }
                    }
                }
            }
        }]);

        return Node;
    }();

    exports.default = Node;


    (0, _utils.extend)(Node, {
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

        eventList: ('blur focus focusin focusout load resize scroll unload click dblclick ' + 'mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave ' + 'change select submit keydown keypress keyup error contextmenu').split(' ')
    });
});