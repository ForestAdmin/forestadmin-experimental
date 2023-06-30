const { convertType } = require("./_shared");

function computeFields(collection) {
  const fields = {};

  collection.fields.forEach((field) => {
    let schema = null;

    if (!field.reference) {
      schema = { type: "Column", columnType: convertType(field.type) };
      if (field.isReadOnly) schema.isReadOnly = true;
      if (field.isRequired) schema.validations = [{ operator: "Present" }];
      if (field.defaultValue !== null) schema.defaultValue = field.defaultValue;
      if (field.isPrimaryKey || field.field === 'id') {
        schema.isPrimaryKey = true;
        schema.filterOperators = new Set(["In", "NotIn"]);
      }

      fields[field.field] = schema;
    } else if (!Array.isArray(field.type)) {
      fields[field.field] = {
        type: 'ManyToOne',
        foreignCollection: field.reference.split('.')[0],
        foreignKey: `FIXME`,
        foreignKeyTarget: field.reference.split('.')[1],
      };
    } else {
      fields[field.field] = {
        type: 'OneToMany',
        foreignCollection: field.reference.split('.')[0],
        originKey: `FIXME`,
        originKeyTarget: field.reference.split('.')[1],
      };
    }
  });

  return fields;
}

module.exports = { computeFields, convertType };
