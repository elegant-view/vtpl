(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * @file 脏检测器
 * @author yibuyisheng(yibuyisheng@163.com)
 */

function DirtyChecker() {
    this.checkers = {};
}

DirtyChecker.prototype.setChecker = function (expr, checkerFn) {
    this.checkers[expr] = checkerFn;
};

DirtyChecker.prototype.getChecker = function (expr) {
    return this.checkers[expr];
};

module.exports = DirtyChecker;

},{}],2:[function(require,module,exports){
window.DirtyChecker = module.exports = require('../src/DirtyChecker.js');
},{"../src/DirtyChecker.js":1}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9iYWlkdS9kb20tZGF0YS1iaW5kL3NyYy9EaXJ0eUNoZWNrZXIuanMiLCIvVXNlcnMvYmFpZHUvZG9tLWRhdGEtYmluZC90bXAvZmFrZV8zYjg4YmUyOS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKipcbiAqIEBmaWxlIOiEj+ajgOa1i+WZqFxuICogQGF1dGhvciB5aWJ1eWlzaGVuZyh5aWJ1eWlzaGVuZ0AxNjMuY29tKVxuICovXG5cbmZ1bmN0aW9uIERpcnR5Q2hlY2tlcigpIHtcbiAgICB0aGlzLmNoZWNrZXJzID0ge307XG59XG5cbkRpcnR5Q2hlY2tlci5wcm90b3R5cGUuc2V0Q2hlY2tlciA9IGZ1bmN0aW9uIChleHByLCBjaGVja2VyRm4pIHtcbiAgICB0aGlzLmNoZWNrZXJzW2V4cHJdID0gY2hlY2tlckZuO1xufTtcblxuRGlydHlDaGVja2VyLnByb3RvdHlwZS5nZXRDaGVja2VyID0gZnVuY3Rpb24gKGV4cHIpIHtcbiAgICByZXR1cm4gdGhpcy5jaGVja2Vyc1tleHByXTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRGlydHlDaGVja2VyO1xuIiwid2luZG93LkRpcnR5Q2hlY2tlciA9IG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi4vc3JjL0RpcnR5Q2hlY2tlci5qcycpOyJdfQ==
