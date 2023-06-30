const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { createSqlDataSource } = require("@forestadmin/datasource-sql");
const { SchemaGenerator } = require("@forestadmin/agent");
const { DataSourceCustomizer } = require("@forestadmin/datasource-customizer");
const dotenv = require("dotenv");

function loadOldSchema(projectFolder) {
  try {
    const oldSchemaPath = join(projectFolder, ".forestadmin-schema.json");
    return JSON.parse(readFileSync(oldSchemaPath, "utf8"));
  } catch {
    console.error(
      "Could not find a .forestadmin-schema.json file in the project folder."
    );
    process.exit(1);
  }
}

function loadEnv(projectFolder) {
  const mandatoryEntries = [
    "DATABASE_URL",
    "FOREST_ENV_SECRET",
    "FOREST_AUTH_SECRET",
  ];

  try {
    const dotEnvPath = join(projectFolder, ".env");
    const env = dotenv.parse(readFileSync(dotEnvPath, "utf8"));

    for (const mandatoryEntry of mandatoryEntries) {
      if (!env[mandatoryEntry]) {
        console.error(`Could not find a ${mandatoryEntry} in the .env file.`);
        process.exit(1);
      }
    }

    return env;
  } catch {
    console.error("Could not find a .env file in the project folder.");
    process.exit(1);
  }
}

async function loadNewSchema(databaseUrl) {
  try {
    const factory = createSqlDataSource({
      uri: databaseUrl,
      sslMode: "preferred",
    });
    const sql = await factory(() => { });
    const customizer = new DataSourceCustomizer().addDataSource(
      async () => sql
    );
    const newSchema = await SchemaGenerator.buildSchema(
      await customizer.getDataSource(),
      null
    );

    await sql.sequelize.close();

    return newSchema;
  } catch {
    console.error(
      "Failed to connect to the database. Please check your DATABASE_URL environment variable."
    );
    process.exit(1);
  }
}

module.exports = {
  loadEnv,
  loadOldSchema,
  loadNewSchema,
};
