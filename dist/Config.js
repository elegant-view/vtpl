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

window.Config = module.exports = Config;

function regExpEncode(str) {
    return '\\' + str.split('').join('\\');
}

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9mYWtlXzgzZjViYTAzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogQGZpbGUg6YWN572uXG4gKiBAYXV0aG9yIHlpYnV5aXNoZW5nKHlpYnV5aXNoZW5nQDE2My5jb20pXG4gKi9cblxuZnVuY3Rpb24gQ29uZmlnKCkge1xuICAgIHRoaXMuZXhwclByZWZpeCA9ICckeyc7XG4gICAgdGhpcy5leHByU3VmZml4ID0gJ30nO1xuXG4gICAgdGhpcy5pZk5hbWUgPSAnaWYnO1xuICAgIHRoaXMuZWxpZk5hbWUgPSAnZWxpZic7XG4gICAgdGhpcy5lbHNlTmFtZSA9ICdlbHNlJztcbiAgICB0aGlzLmlmRW5kTmFtZSA9ICcvaWYnO1xuXG4gICAgdGhpcy5pZlByZWZpeFJlZ0V4cCA9IC9eXFxzKmlmOlxccyovO1xuICAgIHRoaXMuZWxpZlByZWZpeFJlZ0V4cCA9IC9eXFxzKmVsaWY6XFxzKi87XG4gICAgdGhpcy5lbHNlUHJlZml4UmVnRXhwID0gL15cXHMqZWxzZVxccyovO1xuICAgIHRoaXMuaWZFbmRQcmVmaXhSZWdFeHAgPSAvXlxccypcXC9pZlxccyovO1xuXG4gICAgdGhpcy5mb3JOYW1lID0gJ2Zvcic7XG4gICAgdGhpcy5mb3JFbmROYW1lID0gJy9mb3InO1xuXG4gICAgdGhpcy5mb3JQcmVmaXhSZWdFeHAgPSAvXlxccypmb3I6XFxzKi87XG4gICAgdGhpcy5mb3JFbmRQcmVmaXhSZWdFeHAgPSAvXlxccypcXC9mb3JcXHMqLztcbn1cblxuQ29uZmlnLnByb3RvdHlwZS5zZXRFeHByUHJlZml4ID0gZnVuY3Rpb24gKHByZWZpeCkge1xuICAgIHRoaXMuZXhwclByZWZpeCA9IHByZWZpeDtcbn07XG5cbkNvbmZpZy5wcm90b3R5cGUuc2V0RXhwclN1ZmZpeCA9IGZ1bmN0aW9uIChzdWZmaXgpIHtcbiAgICB0aGlzLmV4cHJTdWZmaXggPSBzdWZmaXg7XG59O1xuXG5Db25maWcucHJvdG90eXBlLmdldEV4cHJSZWdFeHAgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmV4cHJSZWdFeHApIHtcbiAgICAgICAgdGhpcy5leHByUmVnRXhwID0gbmV3IFJlZ0V4cChyZWdFeHBFbmNvZGUodGhpcy5leHByUHJlZml4KSArICcoLis/KScgKyByZWdFeHBFbmNvZGUodGhpcy5leHByU3VmZml4KSwgJ2cnKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZXhwclJlZ0V4cDtcbn07XG5cbkNvbmZpZy5wcm90b3R5cGUuZ2V0QWxsSWZSZWdFeHAgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmFsbElmUmVnRXhwKSB7XG4gICAgICAgIHRoaXMuYWxsSWZSZWdFeHAgPSBuZXcgUmVnRXhwKCdcXFxccyooJ1xuICAgICAgICAgICAgKyB0aGlzLmlmTmFtZSArICd8J1xuICAgICAgICAgICAgKyB0aGlzLmVsaWZOYW1lICsgJ3wnXG4gICAgICAgICAgICArIHRoaXMuZWxzZU5hbWUgKyAnfCdcbiAgICAgICAgICAgICsgdGhpcy5pZkVuZE5hbWUgKyAnKTpcXFxccyonLCAnZycpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5hbGxJZlJlZ0V4cDtcbn07XG5cbkNvbmZpZy5wcm90b3R5cGUuc2V0SWZOYW1lID0gZnVuY3Rpb24gKGlmTmFtZSkge1xuICAgIHRoaXMuaWZOYW1lID0gaWZOYW1lO1xuICAgIHRoaXMuaWZQcmVmaXhSZWdFeHAgPSBuZXcgUmVnRXhwKCdeXFxcXHMqJyArIGlmTmFtZSArICc6XFxcXHMqJyk7XG59O1xuXG5Db25maWcucHJvdG90eXBlLnNldEVsaWZOYW1lID0gZnVuY3Rpb24gKGVsaWZOYW1lKSB7XG4gICAgdGhpcy5lbGlmTmFtZSA9IGVsaWZOYW1lO1xuICAgIHRoaXMuZWxpZlByZWZpeFJlZ0V4cCA9IG5ldyBSZWdFeHAoJ15cXFxccyonICsgZWxpZk5hbWUgKyAnOlxcXFxzKicpO1xufTtcblxuQ29uZmlnLnByb3RvdHlwZS5zZXRFbHNlTmFtZSA9IGZ1bmN0aW9uIChlbHNlTmFtZSkge1xuICAgIHRoaXMuZWxzZU5hbWUgPSBlbHNlTmFtZTtcbiAgICB0aGlzLmVsc2VQcmVmaXhSZWdFeHAgPSBuZXcgUmVnRXhwKCdeXFxcXHMqJyArIGVsc2VOYW1lICsgJ1xcXFxzKicpO1xufTtcblxuQ29uZmlnLnByb3RvdHlwZS5zZXRJZkVuZE5hbWUgPSBmdW5jdGlvbiAoaWZFbmROYW1lKSB7XG4gICAgdGhpcy5pZkVuZE5hbWUgPSBpZkVuZE5hbWU7XG4gICAgdGhpcy5pZkVuZFByZWZpeFJlZ0V4cCA9IG5ldyBSZWdFeHAoJ15cXFxccyonICsgaWZFbmROYW1lICsgJ1xcXFxzKicpO1xufTtcblxuQ29uZmlnLnByb3RvdHlwZS5zZXRGb3JOYW1lID0gZnVuY3Rpb24gKGZvck5hbWUpIHtcbiAgICB0aGlzLmZvck5hbWUgPSBmb3JOYW1lO1xuICAgIHRoaXMuZm9yUHJlZml4UmVnRXhwID0gbmV3IFJlZ0V4cCgnXlxcXFxzKicgKyBmb3JOYW1lICsgJzpcXFxccyonKTtcbn07XG5cbkNvbmZpZy5wcm90b3R5cGUuc2V0Rm9yRW5kTmFtZSA9IGZ1bmN0aW9uIChmb3JFbmROYW1lKSB7XG4gICAgdGhpcy5mb3JFbmROYW1lID0gZm9yRW5kTmFtZTtcbiAgICB0aGlzLmZvckVuZFByZWZpeFJlZ0V4cCA9IG5ldyBSZWdFeHAoJ15cXFxccyonICsgZm9yRW5kTmFtZSArICdcXFxccyonKTtcbn07XG5cbkNvbmZpZy5wcm90b3R5cGUuZ2V0Rm9yRXhwcnNSZWdFeHAgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmZvckV4cHJzUmVnRXhwKSB7XG4gICAgICAgIHRoaXMuZm9yRXhwcnNSZWdFeHAgPSBuZXcgUmVnRXhwKCdcXFxccyonXG4gICAgICAgICAgICArIHRoaXMuZm9yTmFtZVxuICAgICAgICAgICAgKyAnOlxcXFxzKidcbiAgICAgICAgICAgICsgcmVnRXhwRW5jb2RlKHRoaXMuZXhwclByZWZpeClcbiAgICAgICAgICAgICsgJyhbXicgKyByZWdFeHBFbmNvZGUodGhpcy5leHByU3VmZml4KVxuICAgICAgICAgICAgKyAnXSspJyArIHJlZ0V4cEVuY29kZSh0aGlzLmV4cHJTdWZmaXgpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZm9yRXhwcnNSZWdFeHA7XG59O1xuXG5Db25maWcucHJvdG90eXBlLmdldEZvckl0ZW1WYWx1ZU5hbWVSZWdFeHAgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmZvckl0ZW1WYWx1ZU5hbWVSZWdFeHApIHtcbiAgICAgICAgdGhpcy5mb3JJdGVtVmFsdWVOYW1lUmVnRXhwID0gbmV3IFJlZ0V4cChcbiAgICAgICAgICAgICdhc1xcXFxzKicgKyByZWdFeHBFbmNvZGUodGhpcy5leHByUHJlZml4KVxuICAgICAgICAgICAgKyAnKFteJyArIHJlZ0V4cEVuY29kZSh0aGlzLmV4cHJTdWZmaXgpICsgJ10rKSdcbiAgICAgICAgICAgICsgcmVnRXhwRW5jb2RlKHRoaXMuZXhwclN1ZmZpeClcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZm9ySXRlbVZhbHVlTmFtZVJlZ0V4cDtcbn07XG5cbndpbmRvdy5Db25maWcgPSBtb2R1bGUuZXhwb3J0cyA9IENvbmZpZztcblxuZnVuY3Rpb24gcmVnRXhwRW5jb2RlKHN0cikge1xuICAgIHJldHVybiAnXFxcXCcgKyBzdHIuc3BsaXQoJycpLmpvaW4oJ1xcXFwnKTtcbn1cbiJdfQ==
