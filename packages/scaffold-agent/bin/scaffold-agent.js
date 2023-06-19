#! /usr/bin/env node

const { program } = require('commander');
const { generateProject } = require('../src/main');

program
  .name('scaffold-agent')
  .description('CLI to generate a modern agent from a legacy one')
  .version(require('../package.json').version)
  .argument('<projectFolder>', 'Path to the project folder')

program.parse(process.argv);

generateProject(program.args[0]).catch((err) => {
  console.error(err);
  process.exit(1);
});
