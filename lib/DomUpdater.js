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

    var DomUpdater = function () {
        function DomUpdater() {
            _classCallCheck(this, DomUpdater);

            this.tasks = {};
            this.counter = 0;
            this.$$nodeAttrNameTaskIdMap = {};
            this.$$isExecuting = false;

            this.$$requestAnimationFrame = function (fn) {
                window.requestAnimationFrame(fn);
            } || function (fn) {
                setTimeout(fn, 17);
            };
        }

        /**
         * 生成任务ID。
         * 为啥会有任务ID呢？
         * 因为此处存在这样一种策略：
         * 如果两个任务的ID是一样的，那么认为是同一个性质的任务，后面的任务将会覆盖掉前面的任务。
         *
         * 比如，在设置DOM元素节点的title属性的时候，第一次设置为`zhangsan`，第二次设置为`lisi`，
         * 如果这两次设置操作是在某一次批量操作中进行的，那么第一次设置完全可以抛弃，直接将title设置为`lisi`。
         *
         * @public
         * @return {number} 任务ID号
         */

        _createClass(DomUpdater, [{
            key: 'generateTaskId',
            value: function generateTaskId() {
                return this.counter++;
            }
        }, {
            key: 'generateNodeAttrUpdateId',
            value: function generateNodeAttrUpdateId(node, attrName) {
                var key = node.getNodeId() + '-' + attrName;
                if (!this.$$nodeAttrNameTaskIdMap[key]) {
                    this.$$nodeAttrNameTaskIdMap[key] = this.generateTaskId();
                }

                return this.$$nodeAttrNameTaskIdMap[key];
            }
        }, {
            key: 'addTaskFn',
            value: function addTaskFn(taskId, taskFn, callback) {
                this.tasks[taskId] = {
                    fn: taskFn,
                    notifyFn: callback || _utils.empty
                };
            }
        }, {
            key: 'destroy',
            value: function destroy() {
                this.stop();
                this.tasks = null;
                this.$$nodeAttrNameTaskIdMap = null;
            }
        }, {
            key: 'stop',
            value: function stop() {
                this.$$isExecuting = false;
            }
        }, {
            key: 'start',
            value: function start() {
                if (this.$$isExecuting) {
                    return;
                }

                this.$$isExecuting = true;
                execute.call(this);

                function execute() {
                    var _this = this;

                    this.$$requestAnimationFrame(function () {
                        if (!_this.$$isExecuting) {
                            return;
                        }

                        /* eslint-disable guard-for-in */
                        for (var taskId in _this.tasks) {
                            /* eslint-enable guard-for-in */
                            var task = _this.tasks[taskId];
                            if (!task) {
                                continue;
                            }

                            try {
                                task.notifyFn(null, task.fn());
                            } catch (error) {
                                task.notifyFn(error);
                            }
                            if (_this.tasks) {
                                _this.tasks[taskId] = null;
                            }
                        }
                        execute.call(_this);
                    });
                }
            }
        }]);

        return DomUpdater;
    }();

    exports.default = DomUpdater;
});
//# sourceMappingURL=/Users/baidu/elegant-view/vtpl/DomUpdater.js.map