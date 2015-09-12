## What's this?

This is a template library. Unlike those traditional templates (such as [Jade](http://jade-lang.com/)), It is based on DOM.

## Sample codes

use basic expressions:

```
```

```html
<table>
    <thead>
        <tr>
            <th>ID</th>
            <th>姓名</th>
            <th>性别</th>
            <th>年龄</th>
        </tr>
    </thead>
    <tbody>
        <!-- for: ${students} as ${student} -->
        <tr>
            <td>${student.id}</td>
            <td>${student.name}</td>
            <td>
            <!-- if: ${student.sex} === 0 -->
            女
            <!-- elif: ${student.sex} === 1 -->
            男
            <!-- /if -->
            </td>
            <td>${student.age}</td>
        </tr>
        <!-- /for -->
    </tbody>
</table>
<button>变一下年龄</button>
<script type="text/javascript">
    var Tree = require('../../src/Tree');
    var Config = require('../../src/config');
    var utils = require('../../src/utils');

    var table = document.getElementsByTagName('table')[0];
    var tree = new Tree({
        startNode: table,
        endNode: table,
        config: new Config()
    });
    tree.traverse();
    var data = {
        students: [
            {
                id: 1,
                name: '张三',
                sex: 1,
                age: 20
            },
            {
                id: 2,
                name: '李四',
                sex: 1,
                age: 21
            },
            {
                id: 3,
                name: '王五',
                sex: 0,
                age: 19
            }
        ]
    };
    tree.setData(data);

    document.getElementsByTagName('button')[0].onclick = function () {
        data = {
            students: [
                {
                    id: 1,
                    name: '张三',
                    sex: 1,
                    age: data.students[0].age + 1
                },
                {
                    id: 2,
                    name: '李四',
                    sex: 1,
                    age: data.students[1].age + 1
                },
                {
                    id: 3,
                    name: '王五',
                    sex: 0,
                    age: data.students[2].age + 1
                }
            ]
        };
        tree.setData(data);
    };
</script>
```

