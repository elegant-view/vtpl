define(['exports', './Node', '../log'], function (exports, _Node, _log) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

    var _Node2 = _interopRequireDefault(_Node);

    var _log2 = _interopRequireDefault(_log);

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

    var Fragment = function () {
        function Fragment(manager) {
            _classCallCheck(this, Fragment);

            this.$$manager = manager;
            this.$$fragment = this.$$manager.createElement('div');
        }

        _createClass(Fragment, [{
            key: 'appendChild',
            value: function appendChild(node) {
                this.$$fragment.appendChild(node);
            }
        }, {
            key: 'getChildNodes',
            value: function getChildNodes() {
                return this.$$fragment.getChildNodes();
            }
        }, {
            key: 'getFirstChild',
            value: function getFirstChild() {
                return this.$$fragment.getFirstChild();
            }
        }, {
            key: 'getLastChild',
            value: function getLastChild() {
                return this.$$fragment.getLastChild();
            }
        }, {
            key: 'setInnerHTML',
            value: function setInnerHTML(html) {
                var xmlDoc = void 0;
                if (window.DOMParser) {
                    var parser = new DOMParser();
                    try {
                        xmlDoc = parser.parseFromString('<div>' + html + '</div>', 'text/xml');
                    } catch (error) {
                        _log2.default.error(error, '\n' + html);
                        throw error;
                    }
                }
                // Internet Explorer
                else {
                        xmlDoc = new ActiveXObject('Microsoft.XMLDOM');
                        xmlDoc.async = false;
                        try {
                            xmlDoc.loadXML('<div>' + html + '</div>');
                        } catch (error) {
                            _log2.default.error(error, '\n' + html);
                            throw error;
                        }
                    }

                this.$$fragment.setInnerHTML('');
                walk.call(this, xmlDoc.childNodes[0], this.$$fragment);

                function createDOMNode(parserNode) {
                    var nodeType = parserNode.nodeType;
                    if (nodeType === _Node2.default.ELEMENT_NODE) {
                        var node = document.createElement(parserNode.tagName);
                        var attributes = parserNode.attributes;
                        for (var i = 0, il = attributes.length; i < il; ++i) {
                            var attr = attributes[i];
                            node.setAttribute(attr.name, attr.value);
                        }
                        return this.$$manager.getNode(node);
                    }

                    if (nodeType === _Node2.default.TEXT_NODE) {
                        var node = document.createTextNode(parserNode.nodeValue);
                        return this.$$manager.getNode(node);
                    }

                    if (nodeType === _Node2.default.COMMENT_NODE) {
                        var node = document.createComment(parserNode.nodeValue);
                        return this.$$manager.getNode(node);
                    }

                    throw new Error('unknown node type: ' + nodeType);
                }

                function walk(rootParserNode, rootDOMNode) {
                    var childNodes = rootParserNode.childNodes;
                    for (var i = 0, il = childNodes.length; i < il; ++i) {
                        var curDOMNode = createDOMNode.call(this, childNodes[i]);
                        rootDOMNode.appendChild(curDOMNode);
                        walk.call(this, childNodes[i], curDOMNode);
                    }
                }
            }
        }, {
            key: 'getInnerHTML',
            value: function getInnerHTML() {
                return this.$$fragment.getInnerHTML();
            }
        }]);

        return Fragment;
    }();

    exports.default = Fragment;
});