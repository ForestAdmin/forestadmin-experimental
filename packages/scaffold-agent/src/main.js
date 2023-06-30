const { pluralize } = require('inflection');
const { join } = require('node:path');

const { render } = require('./utils/file');
const { toDashCase, toSnakeCase } = require('./utils/string');
const { hasCustomizationFile } = require('./template-helpers/_shared');
const { loadEnv, loadNewSchema, loadOldSchema } = require('./loaders');

function getCollectionsByIntegration(oldSchema) {
  const collections = {};
  for (const collection of oldSchema.collections) {
    let folder = 'base';
    if (collection.isVirtual) folder = collection.integration ?? 'others';

    collections[folder] ??= [];
    collections[folder].push(collection);
  }

  return collections;
}

function linkOldSchemaAndNewSchema(oldSchema, newSchema) {
  // Link schema together
  for (const oldCollection of oldSchema.collections) {
    // Find mathing collection in new schema
    const newCollection =
      newSchema.collections.find(newCollection => newCollection.name === oldCollection.name) ??
      newSchema.collections.find(
        newCollection => newCollection.name === pluralize(oldCollection.name),
      ) ??
      newSchema.collections.find(
        newCollection => newCollection.name === toSnakeCase(oldCollection.name),
      ) ??
      newSchema.collections.find(
        newCollection => newCollection.name === toSnakeCase(pluralize(oldCollection.name)),
      );

    if (newCollection) {
      // Save links
      oldCollection.newCollection = newCollection;
      newCollection.oldCollection = oldCollection;

      // Do the same for fields
      for (const oldField of oldCollection.fields) {
        // Find matching field in new schema
        let newField =
          newCollection.fields.find(newField => newField.field === oldField.field) ??
          newCollection.fields.find(newField => newField.field === toSnakeCase(oldField.field));

        if (!newField) {
          const newFieldCandidates = newCollection.fields.filter(newField =>
            newField.field.startsWith(`${oldField.field}_through_`),
          );

          if (newFieldCandidates.length) {
            newField = newFieldCandidates[0];
            if (newFieldCandidates.length > 1) {
              oldField.newFieldCandidates = newFieldCandidates;
            }
          }
        }

        if (newField) {
          oldField.newField = newField;
          newField.oldField = oldField;
        }
      }
    }
  }
}

function writeFiles(destPath, env, newSchema, collectionsByIntegration) {
  const variables = { collectionsByIntegration, newSchema, env };

  render('package', join(destPath, 'package.json'), variables, false);
  render('tsconfig', join(destPath, 'tsconfig.json'), variables, false);
  render('env', join(destPath, '.env'), variables, false);
  render('main', join(destPath, 'src/main.ts'), variables);
  render('typings', join(destPath, 'src/typings.ts'), variables);

  Object.entries(collectionsByIntegration).forEach(([integration, oldCollections]) => {
    const integrationVariables = { ...variables, integration, oldCollections };
    const dataSourceFolder = `src/datasources/${toDashCase(integration)}`;

    if (integration === 'base') {
      const filepath = join(destPath, `${dataSourceFolder}/index.ts`);
      render('datasource-base', filepath, integrationVariables);
    } else {
      const filepath = join(destPath, `${dataSourceFolder}/index.ts`);
      render('datasource-index', filepath, integrationVariables);
    }

    for (const oldCollection of oldCollections) {
      const filename = toDashCase(oldCollection.name);
      const collectionVars = { ...integrationVariables, oldCollection };

      if (hasCustomizationFile(oldCollection)) {
        const filepath = join(destPath, `src/customizations/${filename}.ts`);
        render('customization', filepath, collectionVars);
      }

      if (integration !== 'base') {
        const filepath = join(destPath, `${dataSourceFolder}/${filename}.ts`);
        render('datasource-collection', filepath, collectionVars);
      }
    }
  });
}

async function generateProject(projectFolder, destPath) {
  const env = loadEnv(projectFolder);
  const oldSchema = loadOldSchema(projectFolder);
  const newSchema = await loadNewSchema(env.DATABASE_URL);

  linkOldSchemaAndNewSchema(oldSchema, newSchema);

  const collectionsByIntegration = getCollectionsByIntegration(oldSchema);

  writeFiles(destPath, env, newSchema, collectionsByIntegration);
}

module.exports = { generateProject };
