# vscode-jscad-preview

A previewer for JSCAD rendering result JSON.

![](https://raw.githubusercontent.com/mtsmfm/vscode-jscad-preview/main/demo/demo.gif)

## How to generate .jscad.json

### 1. Write jscad script

```
$ cat cuboid.js
const {
  primitives: { cuboid },
} = require("@jscad/modeling");

module.exports.main = () => cuboid();
```

### 2. Generate .jscad.json

```
$ npx @jscad/cli cuboid.js -o cuboid.jscad.json
```

## Open VSX

https://open-vsx.org/extension/mtsmfm/vscode-jscad-preview

## VSCode Marketplace

https://marketplace.visualstudio.com/items?itemName=mtsmfm.vscode-jscad-preview
