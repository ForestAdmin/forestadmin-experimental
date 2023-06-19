const { readFileSync } = require("node:fs");
const { introspect } = require("@forestadmin/datasource-sql");

const { render } = require("./utils/file");
const { toDashCase } = require("./utils/string");
const { hasCustomizationFile } = require("./utils/schema");

async function generateProject(schemaPath, databaseUrl) {
  // Load schema from database
  const introspection = await introspect(databaseUrl);
  introspection.sort((a, b) => a.name.localeCompare(b.name));

  // Load schema from file
  const file = readFileSync(schemaPath, "utf8");
  const schema = JSON.parse(file);
  const collectionsByIntegration = getCollectionsByIntegration(schema);

  writeFiles(introspection, collectionsByIntegration);
}

function getCollectionsByIntegration(schema) {
  const collections = {};
  for (const collection of schema.collections) {
    let folder = "base";
    if (collection.isVirtual) folder = collection.integration ?? "others";

    collections[folder] ??= [];
    collections[folder].push(collection);
  }

  return collections;
}

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

async function writeFiles(introspection, collectionsByIntegration) {
  render("main.ejs", "main.ts", {
    collectionsByIntegration,
  });

  render("typings.ejs", "typings.ts", {});

  Object.entries(collectionsByIntegration).forEach(
    async ([integration, collections]) => {
      const dataSourceFolder = `datasources/${toDashCase(integration)}`;

      for (const collection of collections) {
        if (hasCustomizationFile(collection)) {
          const filepath = `customizations/${toDashCase(collection.name)}.ts`;

          render("customization.ejs", filepath, {
            collection,
            computeActionForm,
          });
        }
      }

      if (integration === "base") {
        const options = computeBaseDsOptions(introspection, collections);
        const filepath = `${dataSourceFolder}/index.ts`;

        render("datasource-base.ejs", filepath, { options });
      } else {
        const filepath = `${dataSourceFolder}/index.ts`;
        render("datasource-index.ejs", filepath, { integration, collections });

        for (const collection of collections) {
          const filepath = `${dataSourceFolder}/${toDashCase(
            collection.name
          )}.ts`;
          render("datasource-collection.ejs", filepath, { collection });
        }
      }
    }
  );
}

module.exports = { generateProject };
