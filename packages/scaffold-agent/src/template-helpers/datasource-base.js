function computeBaseDsOptions(newSchema) {
  const options = { exclude: [], rename: {} };

  for (const newCollection of newSchema.collections) {
    if (!newCollection.oldCollection) {
      options.exclude.push(newCollection.name);
    } else if (newCollection.oldCollection.name !== newCollection.name) {
      options.rename[newCollection.name] = newCollection.oldCollection.name;
    }
  }

  return options;
}

function getFieldsDiff(newCollection) {
  const result = { adds: [], renames: [], removes: [] };

  // Collection was dropped in computeBaseDsOptions, we can ignore it.
  if (!newCollection.oldCollection) return result;

  for (const newField of newCollection.fields) {
    if (!newField.oldField) {
      if (!newField.isPrimaryKey)
        result.removes.push(newField.field);
    } else if (newField.oldField.field !== newField.field) {
      const rename = { from: newField.field, to: newField.oldField.field };
      if (newField.oldField.newFieldCandidates)
        rename.candidates = newField.oldField.newFieldCandidates.map(field => field.field);

      result.renames.push(rename);
    }
  }

  for (const oldField of newCollection.oldCollection.fields) {
    if (!oldField.newField && !oldField.isVirtual && !oldField.integration) {
      result.adds.push(oldField.field);
    }
  }

  return result;
}

module.exports = { computeBaseDsOptions, getFieldsDiff };
