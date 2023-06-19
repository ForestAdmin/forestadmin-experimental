const fs = require("node:fs");
const path = require("node:path");
const ejs = require("ejs");
const prettier = require("prettier");

const { escape, toCamelCase, toDashCase, toPascalCase } = require("./string");
const { hasCustomizationFile } = require("./schema");

function render(tplPath, destPath, variables) {
  const template = fs.readFileSync(`./templates/${tplPath}`, "utf-8");
  const content = ejs.render(template, {
    toCamelCase, toDashCase, toPascalCase, escape, hasCustomizationFile,
    ...variables,
  });

  const formatted = prettier.format(content, {
    parser: "typescript",
    printWidth: 100,
  });

  fs.mkdirSync(path.dirname(`./agent/${destPath}`), { recursive: true });
  fs.writeFileSync(`./agent/${destPath}`, formatted);
}

module.exports = {
  render,
};
