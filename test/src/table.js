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