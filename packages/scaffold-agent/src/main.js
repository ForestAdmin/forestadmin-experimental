const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { introspect } = require("@forestadmin/datasource-sql");
const dotenv = require('dotenv');

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

function writeFiles(env, introspection, collectionsByIntegration) {
  const variables = { collectionsByIntegration, introspection, env };

  render('package', 'package.json', variables, false);
  render("main", "src/main.ts", variables);
  render("typings", "src/typings.ts", variables);
  render("env", ".env", variables, false);

  Object.entries(collectionsByIntegration).forEach(
    ([integration, collections]) => {
      const integrationVariables = { ...variables, integration, collections };
      const dataSourceFolder = `src/datasources/${toDashCase(integration)}`;

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
          const filepath = `src/customizations/${filename}.ts`;
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

async function generateProject(projectFolder) {
  // Load .env
  const dotEnvPath = join(projectFolder, ".env");
  const env = dotenv.parse(readFileSync(dotEnvPath, "utf8"));

  // Load schema from database
  const introspection = await introspect(env.DATABASE_URL);
  introspection.sort((a, b) => a.name.localeCompare(b.name));

  // Load schema from file
  const schemaPath = join(projectFolder, ".forestadmin-schema.json");
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const collectionsByIntegration = getCollectionsByIntegration(schema);

  writeFiles(env, introspection, collectionsByIntegration);
}

module.exports = { generateProject };
