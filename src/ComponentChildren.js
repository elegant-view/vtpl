var utils = require('./utils');

function ComponentChildren(startNode, endNode, scope) {
    this.div = document.createElement('div');
    if (!startNode || !endNode) {
        this.div.innerHTML = '';
    }
    else {
        utils.traverseNodes(
            startNode,
            endNode,
            function (curNode) {
                this.div.appendChild(curNode);
            },
            this
        );
    }

    this.scope = scope;
}

ComponentChildren.prototype.getTplHtml = function () {
    return this.div.innerHTML;
};

module.exports = ComponentChildren;
