require(['/dist/main'], function (main) {
    var ComponentManager = main.ComponentManager;

    function TestComponent(options) {
        main.Component.call(this, options);
    }

    TestComponent.prototype.tpl = [
        '<div>',
            '${name}',
            '<!-- for: ${list} as ${item} -->',
            '<!-- children -->',
            '<!-- /for -->',
        '</div>'
    ].join('');

    TestComponent.prototype.afterMount = function () {
        this.setData('name', '李四');
    };

    main.inherit(TestComponent, main.Component);
    ComponentManager.registe(TestComponent);

    var tree = new main.Tree({
        startNode: document.body,
        endNode: document.body,
        config: new main.Config()
    });

    tree.traverse();

    tree.setData({
        name: '张三',
        list: [1,2,3]
    });
});
