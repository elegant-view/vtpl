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

    this.varName = 'var';
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

Config.prototype.setVarName = function (name) {
    this.varName = name;
};

module.exports = Config;

function regExpEncode(str) {
    return '\\' + str.split('').join('\\');
}

},{}],2:[function(require,module,exports){
window.Config = module.exports = require('../src/Config.js');
},{"../src/Config.js":1}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9Db25maWcuanMiLCIvVXNlcnMvYmFpZHUvZG9tLWRhdGEtYmluZC90bXAvZmFrZV85MGQ1ODZlMi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSEEiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBAZmlsZSDphY3nva5cbiAqIEBhdXRob3IgeWlidXlpc2hlbmcoeWlidXlpc2hlbmdAMTYzLmNvbSlcbiAqL1xuXG5mdW5jdGlvbiBDb25maWcoKSB7XG4gICAgdGhpcy5leHByUHJlZml4ID0gJyR7JztcbiAgICB0aGlzLmV4cHJTdWZmaXggPSAnfSc7XG5cbiAgICB0aGlzLmlmTmFtZSA9ICdpZic7XG4gICAgdGhpcy5lbGlmTmFtZSA9ICdlbGlmJztcbiAgICB0aGlzLmVsc2VOYW1lID0gJ2Vsc2UnO1xuICAgIHRoaXMuaWZFbmROYW1lID0gJy9pZic7XG5cbiAgICB0aGlzLmlmUHJlZml4UmVnRXhwID0gL15cXHMqaWY6XFxzKi87XG4gICAgdGhpcy5lbGlmUHJlZml4UmVnRXhwID0gL15cXHMqZWxpZjpcXHMqLztcbiAgICB0aGlzLmVsc2VQcmVmaXhSZWdFeHAgPSAvXlxccyplbHNlXFxzKi87XG4gICAgdGhpcy5pZkVuZFByZWZpeFJlZ0V4cCA9IC9eXFxzKlxcL2lmXFxzKi87XG5cbiAgICB0aGlzLmZvck5hbWUgPSAnZm9yJztcbiAgICB0aGlzLmZvckVuZE5hbWUgPSAnL2Zvcic7XG5cbiAgICB0aGlzLmZvclByZWZpeFJlZ0V4cCA9IC9eXFxzKmZvcjpcXHMqLztcbiAgICB0aGlzLmZvckVuZFByZWZpeFJlZ0V4cCA9IC9eXFxzKlxcL2ZvclxccyovO1xuXG4gICAgdGhpcy5ldmVudFByZWZpeCA9ICdldmVudCc7XG5cbiAgICB0aGlzLnZhck5hbWUgPSAndmFyJztcbn1cblxuQ29uZmlnLnByb3RvdHlwZS5zZXRFeHByUHJlZml4ID0gZnVuY3Rpb24gKHByZWZpeCkge1xuICAgIHRoaXMuZXhwclByZWZpeCA9IHByZWZpeDtcbn07XG5cbkNvbmZpZy5wcm90b3R5cGUuc2V0RXhwclN1ZmZpeCA9IGZ1bmN0aW9uIChzdWZmaXgpIHtcbiAgICB0aGlzLmV4cHJTdWZmaXggPSBzdWZmaXg7XG59O1xuXG5Db25maWcucHJvdG90eXBlLmdldEV4cHJSZWdFeHAgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmV4cHJSZWdFeHApIHtcbiAgICAgICAgdGhpcy5leHByUmVnRXhwID0gbmV3IFJlZ0V4cChyZWdFeHBFbmNvZGUodGhpcy5leHByUHJlZml4KSArICcoLis/KScgKyByZWdFeHBFbmNvZGUodGhpcy5leHByU3VmZml4KSwgJ2cnKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZXhwclJlZ0V4cDtcbn07XG5cbkNvbmZpZy5wcm90b3R5cGUuZ2V0QWxsSWZSZWdFeHAgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmFsbElmUmVnRXhwKSB7XG4gICAgICAgIHRoaXMuYWxsSWZSZWdFeHAgPSBuZXcgUmVnRXhwKCdcXFxccyooJ1xuICAgICAgICAgICAgKyB0aGlzLmlmTmFtZSArICd8J1xuICAgICAgICAgICAgKyB0aGlzLmVsaWZOYW1lICsgJ3wnXG4gICAgICAgICAgICArIHRoaXMuZWxzZU5hbWUgKyAnfCdcbiAgICAgICAgICAgICsgdGhpcy5pZkVuZE5hbWUgKyAnKTpcXFxccyonLCAnZycpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5hbGxJZlJlZ0V4cDtcbn07XG5cbkNvbmZpZy5wcm90b3R5cGUuc2V0SWZOYW1lID0gZnVuY3Rpb24gKGlmTmFtZSkge1xuICAgIHRoaXMuaWZOYW1lID0gaWZOYW1lO1xuICAgIHRoaXMuaWZQcmVmaXhSZWdFeHAgPSBuZXcgUmVnRXhwKCdeXFxcXHMqJyArIGlmTmFtZSArICc6XFxcXHMqJyk7XG59O1xuXG5Db25maWcucHJvdG90eXBlLnNldEVsaWZOYW1lID0gZnVuY3Rpb24gKGVsaWZOYW1lKSB7XG4gICAgdGhpcy5lbGlmTmFtZSA9IGVsaWZOYW1lO1xuICAgIHRoaXMuZWxpZlByZWZpeFJlZ0V4cCA9IG5ldyBSZWdFeHAoJ15cXFxccyonICsgZWxpZk5hbWUgKyAnOlxcXFxzKicpO1xufTtcblxuQ29uZmlnLnByb3RvdHlwZS5zZXRFbHNlTmFtZSA9IGZ1bmN0aW9uIChlbHNlTmFtZSkge1xuICAgIHRoaXMuZWxzZU5hbWUgPSBlbHNlTmFtZTtcbiAgICB0aGlzLmVsc2VQcmVmaXhSZWdFeHAgPSBuZXcgUmVnRXhwKCdeXFxcXHMqJyArIGVsc2VOYW1lICsgJ1xcXFxzKicpO1xufTtcblxuQ29uZmlnLnByb3RvdHlwZS5zZXRJZkVuZE5hbWUgPSBmdW5jdGlvbiAoaWZFbmROYW1lKSB7XG4gICAgdGhpcy5pZkVuZE5hbWUgPSBpZkVuZE5hbWU7XG4gICAgdGhpcy5pZkVuZFByZWZpeFJlZ0V4cCA9IG5ldyBSZWdFeHAoJ15cXFxccyonICsgaWZFbmROYW1lICsgJ1xcXFxzKicpO1xufTtcblxuQ29uZmlnLnByb3RvdHlwZS5zZXRGb3JOYW1lID0gZnVuY3Rpb24gKGZvck5hbWUpIHtcbiAgICB0aGlzLmZvck5hbWUgPSBmb3JOYW1lO1xuICAgIHRoaXMuZm9yUHJlZml4UmVnRXhwID0gbmV3IFJlZ0V4cCgnXlxcXFxzKicgKyBmb3JOYW1lICsgJzpcXFxccyonKTtcbn07XG5cbkNvbmZpZy5wcm90b3R5cGUuc2V0Rm9yRW5kTmFtZSA9IGZ1bmN0aW9uIChmb3JFbmROYW1lKSB7XG4gICAgdGhpcy5mb3JFbmROYW1lID0gZm9yRW5kTmFtZTtcbiAgICB0aGlzLmZvckVuZFByZWZpeFJlZ0V4cCA9IG5ldyBSZWdFeHAoJ15cXFxccyonICsgZm9yRW5kTmFtZSArICdcXFxccyonKTtcbn07XG5cbkNvbmZpZy5wcm90b3R5cGUuZ2V0Rm9yRXhwcnNSZWdFeHAgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmZvckV4cHJzUmVnRXhwKSB7XG4gICAgICAgIHRoaXMuZm9yRXhwcnNSZWdFeHAgPSBuZXcgUmVnRXhwKCdcXFxccyonXG4gICAgICAgICAgICArIHRoaXMuZm9yTmFtZVxuICAgICAgICAgICAgKyAnOlxcXFxzKidcbiAgICAgICAgICAgICsgcmVnRXhwRW5jb2RlKHRoaXMuZXhwclByZWZpeClcbiAgICAgICAgICAgICsgJyhbXicgKyByZWdFeHBFbmNvZGUodGhpcy5leHByU3VmZml4KVxuICAgICAgICAgICAgKyAnXSspJyArIHJlZ0V4cEVuY29kZSh0aGlzLmV4cHJTdWZmaXgpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZm9yRXhwcnNSZWdFeHA7XG59O1xuXG5Db25maWcucHJvdG90eXBlLmdldEZvckl0ZW1WYWx1ZU5hbWVSZWdFeHAgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmZvckl0ZW1WYWx1ZU5hbWVSZWdFeHApIHtcbiAgICAgICAgdGhpcy5mb3JJdGVtVmFsdWVOYW1lUmVnRXhwID0gbmV3IFJlZ0V4cChcbiAgICAgICAgICAgICdhc1xcXFxzKicgKyByZWdFeHBFbmNvZGUodGhpcy5leHByUHJlZml4KVxuICAgICAgICAgICAgKyAnKFteJyArIHJlZ0V4cEVuY29kZSh0aGlzLmV4cHJTdWZmaXgpICsgJ10rKSdcbiAgICAgICAgICAgICsgcmVnRXhwRW5jb2RlKHRoaXMuZXhwclN1ZmZpeClcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZm9ySXRlbVZhbHVlTmFtZVJlZ0V4cDtcbn07XG5cbkNvbmZpZy5wcm90b3R5cGUuc2V0RXZlbnRQcmVmaXggPSBmdW5jdGlvbiAocHJlZml4KSB7XG4gICAgdGhpcy5ldmVudFByZWZpeCA9IHByZWZpeDtcbn07XG5cbkNvbmZpZy5wcm90b3R5cGUuc2V0VmFyTmFtZSA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhpcy52YXJOYW1lID0gbmFtZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29uZmlnO1xuXG5mdW5jdGlvbiByZWdFeHBFbmNvZGUoc3RyKSB7XG4gICAgcmV0dXJuICdcXFxcJyArIHN0ci5zcGxpdCgnJykuam9pbignXFxcXCcpO1xufVxuIiwid2luZG93LkNvbmZpZyA9IG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi4vc3JjL0NvbmZpZy5qcycpOyJdfQ==
