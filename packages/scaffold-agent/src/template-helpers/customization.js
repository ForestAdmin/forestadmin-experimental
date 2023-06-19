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

module.exports = { computeActionForm };
