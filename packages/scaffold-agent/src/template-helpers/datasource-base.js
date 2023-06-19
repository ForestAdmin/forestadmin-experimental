function computeBaseDsOptions(introspection, collections) {
  const options = { exclude: [], rename: {} };

  for (const collection of collections) {
    if (!collection.introspection) {
      console.warn(`The collection ${collection.name} is missing!`);
    } else if (collection.introspection.name !== collection.name) {
      options.rename[collection.introspection.name] = collection.name;
    }
  }

  // Warn about missing collections
  for (const collection of introspection) {
    if (!collections.some((c) => c.introspection === collection)) {
      console.warn(`Skipping extra collection ${collection.name}!`);
      options.exclude.push(collection.name);
    }
  }

  return options;
}

module.exports = { computeBaseDsOptions };
