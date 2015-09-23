## What's this?

This is a template library. Unlike those traditional templates (such as [Jade](http://jade-lang.com/)), It is based on DOM.

## Sample codes

* Use basic expressions:

    ```html
    <p id="startNode" class="${klass}">${name}</p>
    <p id="endNode">${3-1}</p>
    <script src="./dist/index.js"></script>
    <script>
    var tree = new Tree({
        startNode: document.getElementById('startNode'),
        endNode: document.getElementById('endNode'),
        config: new Config()
    });
    tree.traverse();
    tree.setData({
        name: 'Amy',
        klass: 'show'
    });
    </script>
    ```

    Following is the output DOM structure:

    ```html
    <p id="startNode" class="show">Amy</p>
    <p id="endNode">2</p>
    ```

* Use `if directive`:

    ```html
    <p id="node">
    <!-- if: ${age} < 10 -->
    show some contents for children.
    <!-- elif: ${age} > 18 -->
    show some contents for adults.
    <!-- else -->
    nothing to show
    <!-- /if -->
    </p>
    <script src="./dist/index.js"></script>
    <script>
    var node = document.getElementById('node');
    var tree = new Tree({
        startNode: node,
        endNode: node,
        config: new Config()
    });
    tree.traverse();
    tree.setData({
        age: 20
    });
    </script>
    ```

    Then the output is:

    ```html
    <p id="node">
     <!-- if: ${age} < 10 -->
    <!-- elif: ${age} > 18 -->
    show some contents for adults.
    <!-- else -->
    <!-- /if -->
    </p>
    ```

* Use `for directive`:

    ```html
    <p id="node">
    <!-- for: ${students} as ${student} -->
        ${student.name}&nbsp;
    <!-- /for -->
    </p>
    <script src="./dist/index.js"></script>
    <script>
    var node = document.getElementById('node');
    var tree = new Tree({
        startNode: node,
        endNode: node,
        config: new Config()
    });
    tree.traverse();
    tree.setData({
        students: [
            {
                name: 'Amy'
            },
            {
                name: 'Jack'
            }
        ]
    });
    </script>
    ```

    The output:

    ```html
    <p id="node">
    Amy Jack
    </p>
    ```

* Use `event`:

    ```html
    <button id="node" event-click="${onClick(event)}">click me</button>
    <script src="./dist/index.js"></script>
    <script>
    var node = document.getElementById('node');
    var tree = new Tree({
        startNode: node,
        endNode: node,
        config: new Config()
    });
    tree.traverse();
    tree.setData({
        onClick: function (event) {
            console.log('clicked');
        }
    });
    </script>
    ```
