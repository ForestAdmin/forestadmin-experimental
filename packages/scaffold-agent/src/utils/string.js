function escape(str) {
  return str.replace(/'/g, `\\'`);
}

function toCamelCase(str) {
  return str.replace(/[_-]([a-z])/g, (g) => g[1].toUpperCase());
}

function toDashCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();
}

function toPascalCase(str) {
  return toCamelCase(str).replace(/^[a-z]/, (g) => g.toUpperCase());
}

function toSnakeCase(str) {
  return toDashCase(str).replace(/-/g, "_");
}

module.exports = {
  escape,
  toCamelCase,
  toDashCase,
  toPascalCase,
  toSnakeCase,
};
