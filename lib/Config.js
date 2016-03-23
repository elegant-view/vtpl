define(['exports', './utils'], function (exports, _utils) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

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

    var Config = function () {
        function Config() {
            _classCallCheck(this, Config);

            this.exprPrefix = '${';
            this.exprSuffix = '}';

            this.ifName = 'if';
            this.elifName = 'elif';
            this.elseName = 'else';
            this.ifEndName = '/if';

            this.ifPrefixRegExp = /^\s*if:\s*/;
            this.elifPrefixRegExp = /^\s*elif:\s*/;
            this.elsePrefixRegExp = /^\s*else\s*/;
            this.ifEndPrefixRegExp = /^\s*\/if\s*/;

            this.forName = 'for';
            this.forEndName = '/for';

            this.forPrefixRegExp = /^\s*for:\s*/;
            this.forEndPrefixRegExp = /^\s*\/for\s*/;

            this.eventPrefix = 'event';

            this.varName = 'var';

            this.scopeName = 'scope';
            this.scopeEndName = '/scope';
        }

        _createClass(Config, [{
            key: 'setExprPrefix',
            value: function setExprPrefix(prefix) {
                this.exprPrefix = prefix;
            }
        }, {
            key: 'setExprSuffix',
            value: function setExprSuffix(suffix) {
                this.exprSuffix = suffix;
            }
        }, {
            key: 'getExprRegExp',
            value: function getExprRegExp() {
                if (!this.exprRegExp) {
                    this.exprRegExp = new RegExp((0, _utils.regExpEncode)(this.exprPrefix) + '(.+?)' + (0, _utils.regExpEncode)(this.exprSuffix), 'g');
                }
                this.exprRegExp.lastIndex = 0;
                return this.exprRegExp;
            }
        }, {
            key: 'getAllIfRegExp',
            value: function getAllIfRegExp() {
                if (!this.allIfRegExp) {
                    this.allIfRegExp = new RegExp('\\s*(' + this.ifName + '|' + this.elifName + '|' + this.elseName + '|' + this.ifEndName + '):\\s*', 'g');
                }
                this.allIfRegExp.lastIndex = 0;
                return this.allIfRegExp;
            }
        }, {
            key: 'setIfName',
            value: function setIfName(ifName) {
                this.ifName = ifName;
                this.ifPrefixRegExp = new RegExp('^\\s*' + ifName + ':\\s*');
            }
        }, {
            key: 'setElifName',
            value: function setElifName(elifName) {
                this.elifName = elifName;
                this.elifPrefixRegExp = new RegExp('^\\s*' + elifName + ':\\s*');
            }
        }, {
            key: 'setElseName',
            value: function setElseName(elseName) {
                this.elseName = elseName;
                this.elsePrefixRegExp = new RegExp('^\\s*' + elseName + '\\s*');
            }
        }, {
            key: 'setIfEndName',
            value: function setIfEndName(ifEndName) {
                this.ifEndName = ifEndName;
                this.ifEndPrefixRegExp = new RegExp('^\\s*' + ifEndName + '\\s*');
            }
        }, {
            key: 'setForName',
            value: function setForName(forName) {
                this.forName = forName;
                this.forPrefixRegExp = new RegExp('^\\s*' + forName + ':\\s*');
            }
        }, {
            key: 'setForEndName',
            value: function setForEndName(forEndName) {
                this.forEndName = forEndName;
                this.forEndPrefixRegExp = new RegExp('^\\s*' + forEndName + '\\s*');
            }
        }, {
            key: 'getForExprsRegExp',
            value: function getForExprsRegExp() {
                if (!this.forExprsRegExp) {
                    this.forExprsRegExp = new RegExp('\\s*' + this.forName + ':\\s*' + (0, _utils.regExpEncode)(this.exprPrefix) + '([^' + (0, _utils.regExpEncode)(this.exprSuffix) + ']+)' + (0, _utils.regExpEncode)(this.exprSuffix));
                }
                this.forExprsRegExp.lastIndex = 0;
                return this.forExprsRegExp;
            }
        }, {
            key: 'getForItemValueNameRegExp',
            value: function getForItemValueNameRegExp() {
                if (!this.forItemValueNameRegExp) {
                    this.forItemValueNameRegExp = new RegExp('as\\s*' + (0, _utils.regExpEncode)(this.exprPrefix) + '([^' + (0, _utils.regExpEncode)(this.exprSuffix) + ']+)' + (0, _utils.regExpEncode)(this.exprSuffix));
                }
                this.forItemValueNameRegExp.lastIndex = 0;
                return this.forItemValueNameRegExp;
            }
        }, {
            key: 'setEventPrefix',
            value: function setEventPrefix(prefix) {
                this.eventPrefix = prefix;
            }
        }, {
            key: 'setVarName',
            value: function setVarName(name) {
                this.varName = name;
            }
        }]);

        return Config;
    }();

    exports.default = Config;
});