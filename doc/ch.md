## 这是什么？

基于 DOM 的模板库。

## 快速开始

### 所需

*  建议操作系统： OS X 或者 Linux ；
*  NodeJS & npm ；
*  webpack 。

### 步骤

* 创建项目根目录 `demo` 。
* 运行命令：

	```
	cd demo
	npm init
	npm install elegant-view/vtpl --save
	```

* 在 `demo` 目录下新建两个文件：`tpl.html` 、 `tpl.js` ，此时目录结构看起来是这样的：

	* demo
		* tpl.html
		* tpl.js
		* package.json

* 用下面的代码填充 `tpl.html` ：

	```html
	<!DOCTYPE html>
	<html>
	<head>
	    <meta charset="utf-8">
	    <title>demo</title>
	</head>
	<body>
		<div id="main">
			<!-- if: ${age} > 18 -->
				<p>age &gt; 18</p>
			<!-- /if -->
			<!-- for: ${list} as ${item} -->
				${item},${key},${index}
			<!-- /for -->
		</div>
		<script src="./dist/tpl.js"></script>
	</body>
	</html>
	```

* 用下面的代码填充 `tpl.js` ：

	```js
	var Vtpl = require('vtpl');
	
	var main = document.getElementById('main');
	var vtpl = new Vtpl({
	    startNode: main,
	    endNode: main
	});
	
	vtpl.render();
	
	vtpl.setData({
		age: 20,
		list: [
			'a', 'b', 'c'
		]
	});
	```

* 新建 `webpack.config.js` ：

	```js
	module.exports = {
	    entry: {
	        'tpl': './tpl'
	    },
	    output: {
	        path: __dirname,
	        filename: './dist/[name].js'
	    }
	};
	```

* 在 `demo` 目录下运行：

	```
	webpack
	```

* 用浏览器打开 `tpl.html` 。


## 