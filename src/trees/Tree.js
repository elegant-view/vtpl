/**
 * @file 最终的树
 * @author yibuyisheng(yibuyisheng@163.com)
 */

import {each, extend, forEach} from '../utils';
import ScopeModel from '../ScopeModel';
import Base from '../Base';
import Node from '../nodes/Node';
import ExprWatcher from '../ExprWatcher';
import parserState from '../parsers/parserState';

export default class Tree extends Base {

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

        this.startNode = options.startNode;
        this.endNode = options.endNode;

        this.treeVars = {};
        this.$parsers = [];
        this.$parent = null;
        this.$$nodeIdParserMap = {};

        this.rootScope = new ScopeModel();

        this.$exprWatcher = null;
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
        if (this.treeVars[name] !== undefined) {
            return false;
        }
        this.treeVars[name] = value;
        return true;
    }

    /**
     * 去掉树上的变量
     *
     * @public
     * @param  {string} name 变量名
     */
    unsetTreeVar(name) {
        this.treeVars[name] = undefined;
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
        let val = this.treeVars[name];
        if (!shouldNotFindInParent
            && val === undefined
            && this.$parent
        ) {
            val = this.$parent.getTreeVar(name);
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
        this.$parent = parent;
    }

    /**
     * 拿到当前树所属的表达式监视器。
     * 这个表达式监视器是和当前树的rootScope绑定的，也就是说只能监视当前树管辖范围内的表达式。
     *
     * @public
     * @return {ExprWatcher} 表达式监视器
     */
    getExprWatcher() {
        return this.$exprWatcher;
    }

    /**
     * 获取当前树下所有的解析器对象
     *
     * @public
     * @return {Array.<Parser>}
     */
    getParsers() {
        return this.$parsers;
    }

    /**
     * 编译。会先遍历自己，然后再是儿子节点。
     *
     * @public
     */
    compile() {
        this.$exprWatcher = new ExprWatcher(this.rootScope, this.getTreeVar('exprCalculater'));

        let delayFns = [];
        Node.iterate(this.startNode, this.endNode, node => {
            let options = {
                startNode: node,
                node: node,
                tree: this
            };

            let parser;
            let ParserClasses = this.getTreeVar('parserClasses');
            for (let i = 0, il = ParserClasses.length; i < il; ++i) {
                let ParserClass = ParserClasses[i];
                parser = this.createParser(ParserClass, options);

                if (!parser) {
                    continue;
                }
                this.$parsers.push(parser);
                break;
            }

            if (!parser) {
                throw new Error('no such parser');
            }

            delayFns.push(handle);

            function handle() {
                parser.$state = parserState.BEGIN_COMPILING;
                parser.collectExprs();
                parser.$state = parserState.END_COMPILING;
            }

            return {
                type: 'options',
                getNextNode(curNode) {
                    return parser.getEndNode().getNextSibling();
                },
                getChildNodes(curNode) {
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
        for (let i = 0, il = this.$parsers.length; i < il; ++i) {
            let parser = this.$parsers[i];
            // 将解析器对象和对应树的scope绑定起来
            parser.$state = parserState.BEGIN_LINK;
            parser.linkScope();
            parser.$state = parserState.END_LINK;
        }
    }

    /**
     * 初始第一次渲染
     *
     * @public
     */
    initRender() {
        for (let i = 0, il = this.$parsers.length; i < il; ++i) {
            let parser = this.$parsers[i];
            // 将解析器对象和对应树的scope绑定起来
            parser.$state = parserState.BEGIN_INIT_RENDER;
            parser.initRender();
            parser.$state = parserState.READY;
        }

        this.$exprWatcher.start();
    }

    goDark() {
        // 调用这棵树下面所有解析器的goDark方法
        forEach(this.$parsers, parser => parser.goDark());
        this.$exprWatcher.stop();
    }

    restoreFromDark() {
        forEach(this.$parsers, parser => parser.restoreFromDark());
        this.$exprWatcher.resume();
    }

    destroy() {
        each(this.$parsers, function (parser) {
            parser.destroy();
            parser.$state = parserState.DESTROIED;
        });

        this.startNode = null;
        this.endNode = null;
        this.config = null;

        this.$parser = null;
        this.treeVars = null;

        this.$$nodeIdParserMap = null;
    }

    /**
     * 创建解析器实例。
     *
     * @inner
     * @param {Class} ParserClass parser 类
     * @param  {Object} options 初始化参数
     * @return {Object}         返回值
     */
    createParser(ParserClass, options) {
        let startNode = options.startNode || options.node;
        let config = this.getTreeVar('config');
        if (!ParserClass.isProperNode(startNode, config)) {
            return;
        }

        let endNode;
        if (ParserClass.findEndNode) {
            endNode = ParserClass.findEndNode(startNode, config);

            if (!endNode) {
                throw ParserClass.getNoEndNodeError();
            }
            else if (endNode.parentNode !== startNode.parentNode) {
                throw new Error('the relationship between start node and end node is not brotherhood!');
            }
        }

        let parser = new ParserClass(
            extend(
                options,
                {endNode}
            )
        );

        let key = !endNode || startNode.equal(endNode)
            ? startNode.getNodeId()
            : startNode.getNodeId() + '-' + endNode.getNodeId();
        this.$$nodeIdParserMap[key] = parser;

        return parser;
    }

    /**
     * 给parser开放的创建树的方法
     *
     * @public
     * @param {Object} options 参数
     * @return {Tree}
     */
    createTree(options) {
        return new Tree(options);
    }
}
