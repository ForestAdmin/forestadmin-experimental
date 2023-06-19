const { convertType } = require("./_shared");

function computeActionForm(action) {
  return action.fields.map((field) => {
    const newField = { label: field.field, type: field.type };
    if (field.description) newField.description = field.description;
    if (field.isRequired) newField.isRequired = true;

    if (field.defaultValue !== null) {
      newField.defaultValue = field.defaultValue;
    }

    if (field.reference !== null) {
      newField.type = "Collection";
      newField.collectionName = field.reference.split(".")[0];
    }

    if (newField.type === "Enum") {
      newField.enumValues = field.enums;
    }

    return newField;
  });
}

function getValueOfType(type) {
  const ourType = convertType(type);

  if (ourType === "Number") return 0;
  if (ourType === "Boolean") return true;
  if (ourType === "Date") return new Date().toISOString();
  if (ourType === "Enum") return field.enums[0];
  if (ourType === "String") return "<sample>";
  if (ourType === 'Json') return {};
  if (Array.isArray(ourType)) return [getValueOfTypes(ourType[0])];
  if (typeof ourType === "object")
    return Object.fromEntries(
      Object.entries(ourType).map(([k, v]) => [k, getValueOfType(v)])
    );

  return null;
}

module.exports = { computeActionForm, getValueOfType, convertType };
