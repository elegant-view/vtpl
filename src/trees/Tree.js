/**
 * @file 最终的树
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import {extend} from '../utils';
import ScopeModel from '../ScopeModel';
import Node from '../nodes/Node';
import ExprWatcher from '../ExprWatcher';
import parserState from '../parsers/parserState';
import DoneChecker from '../DoneChecker';
import DarkEntity from '../DarkEntity';

const TREE_VARS = Symbol('treeVars');
const NODE_ID_PARSER_MAP = Symbol('nodeIdParserMap');
const PARSERS = Symbol('parsers');
const PARENT = Symbol('parent');
const START_NODE = Symbol('startNode');
const END_NODE = Symbol('endNode');
const EXPRESSION_WATCHER = Symbol('expressionWatcher');
const ROOT_SCOPE = Symbol('rootScope');
const CREATE_PARSER = Symbol('createParser');

export default class Tree extends DarkEntity {

    /**
     * 树的初始化方法。
     *
     * @protected
     * @param  {Object} options 初始化参数
     * @param {nodes/Node} options.startNode 这棵树要解析的dom块的开始节点
     * @param {nodes/Node} options.endNode 这棵树要解析的dom块的结束节点
     */
    constructor(options) {
        super(options);

        this[START_NODE] = options.startNode;
        this[END_NODE] = options.endNode;

        this[TREE_VARS] = {};
        this[PARSERS] = [];
        this[PARENT] = null;
        this[NODE_ID_PARSER_MAP] = {};

        this[ROOT_SCOPE] = new ScopeModel();

        this[EXPRESSION_WATCHER] = null;
    }

    get rootScope() {
        return this[ROOT_SCOPE];
    }

    set rootScope(scope) {
        this[ROOT_SCOPE] = scope;
    }

    /**
     * 设置绑定在树上面的额外变量。这些变量有如下特性：
     * 1、无法覆盖；
     * 2、在获取treeVars上面某个变量的时候，如果当前树取出来是undefined，那么就会到父级树的treeVars上去找，以此类推。
     *
     * @public
     * @param {string} name  变量名
     * @param {*} value 变量值
     * @return {boolean} 是否设置成功
     */
    setTreeVar(name, value) {
        if (this[TREE_VARS][name] !== undefined) {
            return false;
        }
        this[TREE_VARS][name] = value;
        return true;
    }

    /**
     * 去掉树上的变量
     *
     * @public
     * @param  {string} name 变量名
     */
    unsetTreeVar(name) {
        this[TREE_VARS][name] = undefined;
    }

    /**
     * 获取解析器对象的数量，目前只是在测试中用到。
     *
     * @public
     * @return {number}
     */
    getParsersLength() {
        let counter = 0;
        this.iterateParsers(() => ++counter, this[PARSERS]);
        return counter;
    }

    /**
     * 获取绑定到树上的额外变量
     *
     * @public
     * @param  {string} name                  变量名
     * @param  {boolean=} shouldNotFindInParent 如果在当前树中没找到，是否到父级树中去找。
     *                                         true就代表不去，false就代表要去
     * @return {*}
     */
    getTreeVar(name, shouldNotFindInParent) {
        let val = this[TREE_VARS][name];
        if (!shouldNotFindInParent
            && val === undefined
            && this[PARENT]
        ) {
            val = this[PARENT].getTreeVar(name);
        }
        return val;
    }

    /**
     * 设置树的父级，对于数变量的查询就形成了一条向上的链。
     *
     * @public
     * @param {Tree} parent 父级树
     */
    setParent(parent) {
        this[PARENT] = parent;
    }

    /**
     * 拿到当前树所属的表达式监视器。
     * 这个表达式监视器是和当前树的rootScope绑定的，也就是说只能监视当前树管辖范围内的表达式。
     *
     * @public
     * @return {ExprWatcher} 表达式监视器
     */
    getExprWatcher() {
        return this[EXPRESSION_WATCHER];
    }

    /**
     * 获取当前树下所有的解析器对象
     *
     * @public
     * @return {Array.<Parser>}
     */
    getParsers() {
        return this[PARSERS];
    }

    /**
     * 编译。会先遍历自己，然后再是儿子节点。
     *
     * @public
     */
    compile() {
        this[EXPRESSION_WATCHER] = new ExprWatcher(this[ROOT_SCOPE], this.getTreeVar('exprCalculater'));

        let delayFns = [];
        let curParentParserObj;
        let prevParserObj;
        Node.iterate(this[START_NODE], this[END_NODE], node => {
            const options = {
                startNode: node,
                node: node,
                tree: this
            };

            let parser;
            let ParserClasses = this.getTreeVar('parserClasses');
            for (let i = 0, il = ParserClasses.length; i < il; ++i) {
                let ParserClass = ParserClasses[i];
                parser = this[CREATE_PARSER](ParserClass, options);

                if (!parser) {
                    continue;
                }
                break;
            }

            if (!parser) {
                throw new Error('no such parser');
            }

            delayFns.push(handle);

            function handle() {
                parser.state = parserState.BEGIN_COMPILING;
                parser.collectExprs();
                parser.state = parserState.END_COMPILING;
            }

            const parserObj = {
                parent: curParentParserObj,
                prev: prevParserObj,
                parser
            };
            if (!curParentParserObj) {
                this[PARSERS].push(parserObj);
            }
            if (prevParserObj) {
                prevParserObj.next = parserObj;
            }
            if (curParentParserObj) {
                curParentParserObj.children = curParentParserObj.children || [];
                curParentParserObj.children.push(parserObj);
            }

            return {
                type: 'options',
                getNextNode(curNode) {
                    prevParserObj = parserObj;
                    return parser.getEndNode().getNextSibling();
                },
                getChildNodes(curNode) {
                    curParentParserObj = parserObj;
                    if (parser.getChildNodes instanceof Function) {
                        return parser.getChildNodes();
                    }
                    return curNode.getChildNodes();
                }
            };
        });

        for (let i = 0, il = delayFns.length; i < il; ++i) {
            delayFns[i]();
        }
    }

    /**
     * 连接
     *
     * @public
     */
    link() {
        this.iterateParsers(parser => {
            // 将解析器对象和对应树的scope绑定起来
            parser.state = parserState.BEGIN_LINK;
            parser.linkScope();
            parser.state = parserState.END_LINK;
        }, this[PARSERS]);
    }

    /**
     * 初始第一次渲染
     *
     * @public
     * @param {function()} done 异步操作完成后的回调函数
     */
    initRender(done) {
        const doneChecker = new DoneChecker(done);
        this.iterateParsers(parser => {
            // 将解析器对象和对应树的scope绑定起来
            parser.state = parserState.BEGIN_INIT_RENDER;
            doneChecker.add(done => {
                parser.initRender(done);
            });
            parser.state = parserState.READY;
        }, this[PARSERS]);

        this[EXPRESSION_WATCHER].start();

        doneChecker.complete();
    }

    goDark(done) {
        super.goDark(result => {
            const doneChecker = new DoneChecker(done);

            if (result) {
                // 调用这棵树下面所有解析器的goDark方法
                this.iterateParsers(parser => {
                    doneChecker.add(done => {
                        parser.goDark(done);
                    });
                }, this[PARSERS]);
                this[EXPRESSION_WATCHER].stop();
            }

            doneChecker.complete();
        });
    }

    restoreFromDark(done) {
        super.restoreFromDark(result => {
            const doneChecker = new DoneChecker(done);
            if (result) {
                this.iterateParsers(parser => {
                    doneChecker.add(done => {
                        parser.restoreFromDark(done);
                    });
                }, this[PARSERS]);
                doneChecker.add(done => {
                    this[EXPRESSION_WATCHER].resume(done);
                });
            }
            doneChecker.complete();
        });
    }

    iterateParsers(iteraterFn, parsers) {
        if (!parsers) {
            return;
        }
        for (let i = 0, il = parsers.length; i < il; ++i) {
            const parserObj = parsers[i];
            iteraterFn(parserObj.parser, parserObj);

            this.iterateParsers(iteraterFn, parserObj.children);
        }
    }

    /**
     * 释放资源
     *
     * @override
     * @protected
     */
    release() {
        this.iterateParsers(parser => {
            parser.destroy();
            parser.state = parserState.DESTROIED;
        }, this[PARSERS]);
        this[PARSERS] = null;

        this[START_NODE] = null;
        this[END_NODE] = null;
        this.config = null;

        this[TREE_VARS] = null;
        this[NODE_ID_PARSER_MAP] = null;
        this[PARENT] = null;

        this[EXPRESSION_WATCHER].destroy();
        this[EXPRESSION_WATCHER] = null;

        this[ROOT_SCOPE].destroy();
        this[ROOT_SCOPE] = null;
    }

    /**
     * 创建解析器实例。
     *
     * @private
     * @param {Class} ParserClass parser 类
     * @param  {Object} options 初始化参数
     * @return {Object}         返回值
     */
    [CREATE_PARSER](ParserClass, options) {
        let startNode = options.startNode || options.node;
        let config = this.getTreeVar('config');
        if (!ParserClass.isProperNode(startNode, config)) {
            return;
        }

        let endNode = startNode;
        if (ParserClass.findEndNode) {
            endNode = ParserClass.findEndNode(startNode, config);

            if (!endNode) {
                throw ParserClass.getNoEndNodeError();
            }
            else if (endNode.parentNode !== startNode.parentNode) {
                throw new Error('the relationship between start node and end node is not brotherhood!');
            }
        }

        const parser = new ParserClass(
            extend(
                options,
                {endNode}
            )
        );

        const key = `${startNode.getNodeId()}-${endNode.getNodeId()}`;
        this[NODE_ID_PARSER_MAP][key] = parser;

        return parser;
    }

    /**
     * 给parser开放的创建树的方法
     *
     * @static
     * @param {Object} options 参数
     * @return {Tree}
     */
    static createTree(options) {
        return new Tree(options);
    }
}
