#! /usr/bin/env node

const { program } = require('commander');
const { generateProject } = require('../src/main');

program
  .name('scaffold-agent')
  .description('CLI to generate a modern agent from a legacy one')
  .version(require('../package.json').version)
  .requiredOption("-d, --database-url <databaseUrl>", "Database URL")
  .requiredOption("-s, --schema-path <schema>", "Path to .forestadmin-schema.json")

program.parse(process.argv);

const options = program.opts();

generateProject(options.schemaPath, options.databaseUrl).catch((err) => {
  console.error(err);
  process.exit(1);
});
