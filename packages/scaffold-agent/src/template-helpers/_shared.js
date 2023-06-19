function hasCustomizationFile(collection) {
  const hasActions = collection.actions.length > 0;
  const hasFields = collection.fields.some((field) => field.isVirtual);
  const hasSegments = collection.segments.length > 0;
  const isSmart = collection.isVirtual;

  return (
    (!isSmart && (hasActions || hasFields || hasSegments)) ||
    (isSmart && (hasActions || hasSegments))
  );
}

function convertType(type) {
  if (typeof type === "string") {
    // Casing is not consistent in the schema of forest-express
    return type[0].toUpperCase() + type.slice(1).toLocaleLowerCase();
  }

  if (Array.isArray(type)) {
    // [{ field: 'name', type: 'String' }, { field: 'age', type: 'Number' }]
    if (
      type.every((t) => typeof t === "object" && "field" in t && "type" in t)
    ) {
      return Object.fromEntries(
        type.map(({ field, type }) => [field, convertType(type)])
      );
    }

    // ['String', 'Number']
    return type.map(convertType);
  }

  // { name: 'String', age: 'Number' }
  if (typeof type === "object") {
    return Object.fromEntries(
      Object.entries(type).map(([k, v]) => [k, convertType(v)])
    );
  }

  return null;
}

function stringify(value) {
  function replacer(key, value) {
    if (typeof value === "function") {
      return `$$$$${value.toString()}$$$$`;
    }

    if (value instanceof Set) {
      const values = JSON.stringify(Array.from(value)).replace(/"/g, "'");

      return `$$$$new Set(${values})$$$$`;
    }

    return value;
  }

  return JSON.stringify(value, replacer)
    .replace(/\$\$\$\$"/g, "")
    .replace(/"\$\$\$\$/g, "");
}

module.exports = {
  convertType,
  hasCustomizationFile,
  stringify,
};
