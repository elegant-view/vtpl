require(['/dist/main'], function (main) {
    var ComponentManager = main.ComponentManager;

    function TestComponent(options) {
        main.Component.call(this, options);
    }

    TestComponent.prototype.tpl = [
        '<div>',
            '<!-- children -->',
        '</div>'
    ].join('');

    main.inherit(TestComponent, main.Component);
    ComponentManager.registe(TestComponent);

    var tree = new main.Tree({
        startNode: document.body,
        endNode: document.body,
        config: new main.Config()
    });

    tree.traverse();

    tree.setData({
        name: '张三'
    });
});
