var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

define(['exports', '../Base', './parserState'], function (exports, _Base2, _parserState) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _Base3 = _interopRequireDefault(_Base2);

  var _parserState2 = _interopRequireDefault(_parserState);

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

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && ((typeof call === 'undefined' ? 'undefined' : _typeof(call)) === "object" || typeof call === "function") ? call : self;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  var Parser = function (_Base) {
    _inherits(Parser, _Base);

    function Parser(options) {
      _classCallCheck(this, Parser);

      var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Parser).call(this, options));

      _this.$state = _parserState2.default.INITIALIZING;
      _this.tree = options.tree;
      return _this;
    }

    /**
     * 隐藏当前parser实例相关的节点。具体子类实现
     *
     * @public
     * @abstract
     */

    _createClass(Parser, [{
      key: 'goDark',
      value: function goDark() {}
    }, {
      key: 'restoreFromDark',
      value: function restoreFromDark() {}
    }, {
      key: 'getStartNode',
      value: function getStartNode() {
        return this.startNode;
      }
    }, {
      key: 'getEndNode',
      value: function getEndNode() {
        return this.endNode;
      }
    }, {
      key: 'collectExprs',
      value: function collectExprs() {}
    }, {
      key: 'linkScope',
      value: function linkScope() {}
    }, {
      key: 'initRender',
      value: function initRender() {}
    }, {
      key: 'destroy',
      value: function destroy() {
        this.tree = null;
      }
    }]);

    return Parser;
  }(_Base3.default);

  exports.default = Parser;
});
//# sourceMappingURL=/Users/baidu/elegant-view/vtpl/parsers/Parser.js.map