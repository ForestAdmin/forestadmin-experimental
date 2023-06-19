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

module.exports = {
  hasCustomizationFile,
};
