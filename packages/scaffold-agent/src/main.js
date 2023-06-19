const { readFileSync } = require("node:fs");
const { introspect } = require("@forestadmin/datasource-sql");

const { render } = require("./utils/file");
const { toDashCase } = require("./utils/string");
const { hasCustomizationFile } = require("./template-helpers/_shared");

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

function writeFiles(introspection, collectionsByIntegration) {
  const variables = { collectionsByIntegration, introspection };

  render("main", "main.ts", variables);
  render("typings", "typings.ts", variables);

  Object.entries(collectionsByIntegration).forEach(
    ([integration, collections]) => {
      const integrationVariables = { ...variables, integration, collections };
      const dataSourceFolder = `datasources/${toDashCase(integration)}`;

      if (integration === "base") {
        const filepath = `${dataSourceFolder}/index.ts`;
        render("datasource-base", filepath, integrationVariables);
      } else {
        const filepath = `${dataSourceFolder}/index.ts`;
        render("datasource-index", filepath, integrationVariables);
      }

      for (const collection of collections) {
        const filename = toDashCase(collection.name);
        const collectionVars = { ...integrationVariables, collection };

        if (hasCustomizationFile(collection)) {
          const filepath = `customizations/${filename}.ts`;
          render("customization", filepath, collectionVars);
        }

        if (integration !== "base") {
          const filepath = `${dataSourceFolder}/${filename}.ts`;
          render("datasource-collection", filepath, collectionVars);
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
