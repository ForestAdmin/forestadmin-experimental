const { convertType } = require("./_shared");

function computeColumns(collection) {
  const entries = collection.fields.map((field) => {
    let schema = null;

    if (!field.relationship) {
      schema = { type: "Column", columnType: convertType(field.type) };
      if (field.isReadOnly) schema.isReadOnly = true;
      if (field.isRequired) schema.validations = [{ operator: "Present" }];
      if (field.defaultValue !== null) schema.defaultValue = field.defaultValue;
      if (field.isPrimaryKey || field.field === 'id') {
        schema.isPrimaryKey = true;
        schema.filterOperators = new Set(["In", "NotIn"]);
      }
    }

    return [field.field, schema];
  });

  return Object.fromEntries(entries);
}

module.exports = { computeColumns, convertType };
