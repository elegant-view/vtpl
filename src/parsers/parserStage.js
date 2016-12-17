/**
 * @file 解析器状态
 * @author yibuyisheng(yibuyisheng@163.com)
 */

export default {
    INITIALIZING: Symbol('initializing'),
    BEGIN_COMPILING: Symbol('beginCompiling'),
    END_COMPILING: Symbol('endCompiling'),
    BEGIN_LINK: Symbol('beginLink'),
    END_LINK: Symbol('endLink'),
    BEGIN_INIT_RENDER: Symbol('beginInitRender'),
    END_INIT_RENDER: Symbol('endInitRender'),
    READY: Symbol('ready'),
    DESTROIED: Symbol('destroied')
};
