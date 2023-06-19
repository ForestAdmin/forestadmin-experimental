function computeBaseDsOptions(introspection, collections) {
  const options = { exclude: [], rename: {} };

  // Rename collections to match the former schema
  const actualNames = introspection.map((c) => c.name);
  const wantedNames = collections.map((c) => c.name);

  for (const actualName of actualNames) {
    if (wantedNames.includes(actualName)) continue;

    const shortActualName = actualName.toLowerCase().replace(/-_/g, "");
    const match = wantedNames.find((wn) => {
      const shortWantedName = wn.toLowerCase().replace(/-_/g, "");
      return (
        shortWantedName === shortActualName ||
        shortWantedName === shortActualName.replace(/s$/, "")
      );
    });

    if (match) {
      options.rename[actualName] = match;
      continue;
    }

    options.exclude.push(actualName);
  }

  // Warn about missing collections
  for (const wantedName of wantedNames) {
    if (Object.values(options.rename).includes(wantedName)) continue;
    if (actualNames.includes(wantedName)) continue;

    console.warn(`The collection ${wantedName} is missing!`);
  }

  return options;
}

module.exports = { computeBaseDsOptions };
