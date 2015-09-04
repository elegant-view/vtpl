## What's this?

This is a template library. Unlike those traditional templates (such as [Jade](http://jade-lang.com/), It is based on DOM.

## Sample codes

```html
<!DOCTYPE html>
<html>
<head>
    <title></title>
    <style type="text/css">
    .hide {
        display: none;
    }
    </style>
</head>
<body>
<div id="root">
    <!-- for: ${list} as ${item} -->
        ${item.name}.
        <!-- if: ${item.name} === 2 -->
            yes, it is 2.
        <!-- /if -->
        <br />
    <!-- /for -->
</div>
<script type="text/javascript" src="../src/Parser.js"></script>
<script type="text/javascript">
    var parser = new Parser(document.getElementById('root'));
    parser.collectExpressions();
    parser.setData({list: [{name: 1}, {name: 2}, {name: 3}]});
    parser.setData({list: [{name: 1}, {name: 4}]});
    parser.setData({list: [{name: 1}, {name: 2}, {name: 3}]});
</script>
</body>
</html>
```

