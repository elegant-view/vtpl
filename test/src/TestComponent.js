require(['/dist/main'], function (main) {
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

    var tree = new main.Tree({
        startNode: document.body,
        endNode: document.body,
        config: new main.Config()
    });

    tree.registeComponent(TestComponent);

    tree.traverse();

    tree.setData({
        name: '张三',
        list: [1,2,3]
    });
});
