const fs = require("node:fs");
const path = require("node:path");
const ejs = require("ejs");
const prettier = require("prettier");

const stringHelpers = require("./string");

const helpers = {
  _shared: require("../template-helpers/_shared"),
  customization: require("../template-helpers/customization"),
  "datasource-base": require("../template-helpers/datasource-base"),
  "datasource-collection": require("../template-helpers/datasource-collection"),
};

function render(tplPath, destPath, variables, lint = true) {
  const template = fs.readFileSync(`./templates/${tplPath}.ejs`, "utf-8");
  const helper = helpers[tplPath] ?? {};
  const content = ejs.render(template, {
    ...stringHelpers,
    ...helpers._shared,
    ...helper,
    ...variables,
  });

  const formatted = lint
    ? prettier.format(content, { parser: "typescript", printWidth: 100 })
    : content;

  fs.mkdirSync(path.dirname(`./agent/${destPath}`), { recursive: true });
  fs.writeFileSync(`./agent/${destPath}`, formatted);
}

module.exports = {
  render,
};
