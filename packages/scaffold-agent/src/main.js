const { readFileSync } = require("node:fs");
const { introspect } = require("@forestadmin/datasource-sql");

const { render } = require("./utils/file");
const { toDashCase } = require("./utils/string");
const { hasCustomizationFile } = require("./utils/schema");
const { computeBaseDsOptions } = require("./template-helpers/datasource-base");
const { computeActionForm } = require("./template-helpers/customization");

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

module.exports = { generateProject };
