(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * @file 配置
 * @author yibuyisheng(yibuyisheng@163.com)
 */

function Config() {
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
}

Config.prototype.setExprPrefix = function (prefix) {
    this.exprPrefix = prefix;
};

Config.prototype.setExprSuffix = function (suffix) {
    this.exprSuffix = suffix;
};

Config.prototype.getExprRegExp = function () {
    if (!this.exprRegExp) {
        this.exprRegExp = new RegExp(regExpEncode(this.exprPrefix) + '(.+?)' + regExpEncode(this.exprSuffix), 'g');
    }
    return this.exprRegExp;
};

Config.prototype.getAllIfRegExp = function () {
    if (!this.allIfRegExp) {
        this.allIfRegExp = new RegExp('\\s*('
            + this.ifName + '|'
            + this.elifName + '|'
            + this.elseName + '|'
            + this.ifEndName + '):\\s*', 'g');
    }
    return this.allIfRegExp;
};

Config.prototype.setIfName = function (ifName) {
    this.ifName = ifName;
    this.ifPrefixRegExp = new RegExp('^\\s*' + ifName + ':\\s*');
};

Config.prototype.setElifName = function (elifName) {
    this.elifName = elifName;
    this.elifPrefixRegExp = new RegExp('^\\s*' + elifName + ':\\s*');
};

Config.prototype.setElseName = function (elseName) {
    this.elseName = elseName;
    this.elsePrefixRegExp = new RegExp('^\\s*' + elseName + '\\s*');
};

Config.prototype.setIfEndName = function (ifEndName) {
    this.ifEndName = ifEndName;
    this.ifEndPrefixRegExp = new RegExp('^\\s*' + ifEndName + '\\s*');
};

Config.prototype.setForName = function (forName) {
    this.forName = forName;
    this.forPrefixRegExp = new RegExp('^\\s*' + forName + ':\\s*');
};

Config.prototype.setForEndName = function (forEndName) {
    this.forEndName = forEndName;
    this.forEndPrefixRegExp = new RegExp('^\\s*' + forEndName + '\\s*');
};

Config.prototype.getForExprsRegExp = function () {
    if (!this.forExprsRegExp) {
        this.forExprsRegExp = new RegExp('\\s*'
            + this.forName
            + ':\\s*'
            + regExpEncode(this.exprPrefix)
            + '([^' + regExpEncode(this.exprSuffix)
            + ']+)' + regExpEncode(this.exprSuffix));
    }
    return this.forExprsRegExp;
};

Config.prototype.getForItemValueNameRegExp = function () {
    if (!this.forItemValueNameRegExp) {
        this.forItemValueNameRegExp = new RegExp(
            'as\\s*' + regExpEncode(this.exprPrefix)
            + '([^' + regExpEncode(this.exprSuffix) + ']+)'
            + regExpEncode(this.exprSuffix)
        );
    }
    return this.forItemValueNameRegExp;
};

Config.prototype.setEventPrefix = function (prefix) {
    this.eventPrefix = prefix;
};

module.exports = Config;

function regExpEncode(str) {
    return '\\' + str.split('').join('\\');
}

},{}],2:[function(require,module,exports){
window.Config = module.exports = require('../src/Config.js');
},{"../src/Config.js":1}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9Db25maWcuanMiLCIvVXNlcnMvYmFpZHUvZG9tLWRhdGEtYmluZC90bXAvZmFrZV81OGViYWY4Yy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSEEiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBAZmlsZSDphY3nva5cbiAqIEBhdXRob3IgeWlidXlpc2hlbmcoeWlidXlpc2hlbmdAMTYzLmNvbSlcbiAqL1xuXG5mdW5jdGlvbiBDb25maWcoKSB7XG4gICAgdGhpcy5leHByUHJlZml4ID0gJyR7JztcbiAgICB0aGlzLmV4cHJTdWZmaXggPSAnfSc7XG5cbiAgICB0aGlzLmlmTmFtZSA9ICdpZic7XG4gICAgdGhpcy5lbGlmTmFtZSA9ICdlbGlmJztcbiAgICB0aGlzLmVsc2VOYW1lID0gJ2Vsc2UnO1xuICAgIHRoaXMuaWZFbmROYW1lID0gJy9pZic7XG5cbiAgICB0aGlzLmlmUHJlZml4UmVnRXhwID0gL15cXHMqaWY6XFxzKi87XG4gICAgdGhpcy5lbGlmUHJlZml4UmVnRXhwID0gL15cXHMqZWxpZjpcXHMqLztcbiAgICB0aGlzLmVsc2VQcmVmaXhSZWdFeHAgPSAvXlxccyplbHNlXFxzKi87XG4gICAgdGhpcy5pZkVuZFByZWZpeFJlZ0V4cCA9IC9eXFxzKlxcL2lmXFxzKi87XG5cbiAgICB0aGlzLmZvck5hbWUgPSAnZm9yJztcbiAgICB0aGlzLmZvckVuZE5hbWUgPSAnL2Zvcic7XG5cbiAgICB0aGlzLmZvclByZWZpeFJlZ0V4cCA9IC9eXFxzKmZvcjpcXHMqLztcbiAgICB0aGlzLmZvckVuZFByZWZpeFJlZ0V4cCA9IC9eXFxzKlxcL2ZvclxccyovO1xuXG4gICAgdGhpcy5ldmVudFByZWZpeCA9ICdldmVudCc7XG59XG5cbkNvbmZpZy5wcm90b3R5cGUuc2V0RXhwclByZWZpeCA9IGZ1bmN0aW9uIChwcmVmaXgpIHtcbiAgICB0aGlzLmV4cHJQcmVmaXggPSBwcmVmaXg7XG59O1xuXG5Db25maWcucHJvdG90eXBlLnNldEV4cHJTdWZmaXggPSBmdW5jdGlvbiAoc3VmZml4KSB7XG4gICAgdGhpcy5leHByU3VmZml4ID0gc3VmZml4O1xufTtcblxuQ29uZmlnLnByb3RvdHlwZS5nZXRFeHByUmVnRXhwID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5leHByUmVnRXhwKSB7XG4gICAgICAgIHRoaXMuZXhwclJlZ0V4cCA9IG5ldyBSZWdFeHAocmVnRXhwRW5jb2RlKHRoaXMuZXhwclByZWZpeCkgKyAnKC4rPyknICsgcmVnRXhwRW5jb2RlKHRoaXMuZXhwclN1ZmZpeCksICdnJyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmV4cHJSZWdFeHA7XG59O1xuXG5Db25maWcucHJvdG90eXBlLmdldEFsbElmUmVnRXhwID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5hbGxJZlJlZ0V4cCkge1xuICAgICAgICB0aGlzLmFsbElmUmVnRXhwID0gbmV3IFJlZ0V4cCgnXFxcXHMqKCdcbiAgICAgICAgICAgICsgdGhpcy5pZk5hbWUgKyAnfCdcbiAgICAgICAgICAgICsgdGhpcy5lbGlmTmFtZSArICd8J1xuICAgICAgICAgICAgKyB0aGlzLmVsc2VOYW1lICsgJ3wnXG4gICAgICAgICAgICArIHRoaXMuaWZFbmROYW1lICsgJyk6XFxcXHMqJywgJ2cnKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuYWxsSWZSZWdFeHA7XG59O1xuXG5Db25maWcucHJvdG90eXBlLnNldElmTmFtZSA9IGZ1bmN0aW9uIChpZk5hbWUpIHtcbiAgICB0aGlzLmlmTmFtZSA9IGlmTmFtZTtcbiAgICB0aGlzLmlmUHJlZml4UmVnRXhwID0gbmV3IFJlZ0V4cCgnXlxcXFxzKicgKyBpZk5hbWUgKyAnOlxcXFxzKicpO1xufTtcblxuQ29uZmlnLnByb3RvdHlwZS5zZXRFbGlmTmFtZSA9IGZ1bmN0aW9uIChlbGlmTmFtZSkge1xuICAgIHRoaXMuZWxpZk5hbWUgPSBlbGlmTmFtZTtcbiAgICB0aGlzLmVsaWZQcmVmaXhSZWdFeHAgPSBuZXcgUmVnRXhwKCdeXFxcXHMqJyArIGVsaWZOYW1lICsgJzpcXFxccyonKTtcbn07XG5cbkNvbmZpZy5wcm90b3R5cGUuc2V0RWxzZU5hbWUgPSBmdW5jdGlvbiAoZWxzZU5hbWUpIHtcbiAgICB0aGlzLmVsc2VOYW1lID0gZWxzZU5hbWU7XG4gICAgdGhpcy5lbHNlUHJlZml4UmVnRXhwID0gbmV3IFJlZ0V4cCgnXlxcXFxzKicgKyBlbHNlTmFtZSArICdcXFxccyonKTtcbn07XG5cbkNvbmZpZy5wcm90b3R5cGUuc2V0SWZFbmROYW1lID0gZnVuY3Rpb24gKGlmRW5kTmFtZSkge1xuICAgIHRoaXMuaWZFbmROYW1lID0gaWZFbmROYW1lO1xuICAgIHRoaXMuaWZFbmRQcmVmaXhSZWdFeHAgPSBuZXcgUmVnRXhwKCdeXFxcXHMqJyArIGlmRW5kTmFtZSArICdcXFxccyonKTtcbn07XG5cbkNvbmZpZy5wcm90b3R5cGUuc2V0Rm9yTmFtZSA9IGZ1bmN0aW9uIChmb3JOYW1lKSB7XG4gICAgdGhpcy5mb3JOYW1lID0gZm9yTmFtZTtcbiAgICB0aGlzLmZvclByZWZpeFJlZ0V4cCA9IG5ldyBSZWdFeHAoJ15cXFxccyonICsgZm9yTmFtZSArICc6XFxcXHMqJyk7XG59O1xuXG5Db25maWcucHJvdG90eXBlLnNldEZvckVuZE5hbWUgPSBmdW5jdGlvbiAoZm9yRW5kTmFtZSkge1xuICAgIHRoaXMuZm9yRW5kTmFtZSA9IGZvckVuZE5hbWU7XG4gICAgdGhpcy5mb3JFbmRQcmVmaXhSZWdFeHAgPSBuZXcgUmVnRXhwKCdeXFxcXHMqJyArIGZvckVuZE5hbWUgKyAnXFxcXHMqJyk7XG59O1xuXG5Db25maWcucHJvdG90eXBlLmdldEZvckV4cHJzUmVnRXhwID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5mb3JFeHByc1JlZ0V4cCkge1xuICAgICAgICB0aGlzLmZvckV4cHJzUmVnRXhwID0gbmV3IFJlZ0V4cCgnXFxcXHMqJ1xuICAgICAgICAgICAgKyB0aGlzLmZvck5hbWVcbiAgICAgICAgICAgICsgJzpcXFxccyonXG4gICAgICAgICAgICArIHJlZ0V4cEVuY29kZSh0aGlzLmV4cHJQcmVmaXgpXG4gICAgICAgICAgICArICcoW14nICsgcmVnRXhwRW5jb2RlKHRoaXMuZXhwclN1ZmZpeClcbiAgICAgICAgICAgICsgJ10rKScgKyByZWdFeHBFbmNvZGUodGhpcy5leHByU3VmZml4KSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmZvckV4cHJzUmVnRXhwO1xufTtcblxuQ29uZmlnLnByb3RvdHlwZS5nZXRGb3JJdGVtVmFsdWVOYW1lUmVnRXhwID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5mb3JJdGVtVmFsdWVOYW1lUmVnRXhwKSB7XG4gICAgICAgIHRoaXMuZm9ySXRlbVZhbHVlTmFtZVJlZ0V4cCA9IG5ldyBSZWdFeHAoXG4gICAgICAgICAgICAnYXNcXFxccyonICsgcmVnRXhwRW5jb2RlKHRoaXMuZXhwclByZWZpeClcbiAgICAgICAgICAgICsgJyhbXicgKyByZWdFeHBFbmNvZGUodGhpcy5leHByU3VmZml4KSArICddKyknXG4gICAgICAgICAgICArIHJlZ0V4cEVuY29kZSh0aGlzLmV4cHJTdWZmaXgpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmZvckl0ZW1WYWx1ZU5hbWVSZWdFeHA7XG59O1xuXG5Db25maWcucHJvdG90eXBlLnNldEV2ZW50UHJlZml4ID0gZnVuY3Rpb24gKHByZWZpeCkge1xuICAgIHRoaXMuZXZlbnRQcmVmaXggPSBwcmVmaXg7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbmZpZztcblxuZnVuY3Rpb24gcmVnRXhwRW5jb2RlKHN0cikge1xuICAgIHJldHVybiAnXFxcXCcgKyBzdHIuc3BsaXQoJycpLmpvaW4oJ1xcXFwnKTtcbn1cbiIsIndpbmRvdy5Db25maWcgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4uL3NyYy9Db25maWcuanMnKTsiXX0=
