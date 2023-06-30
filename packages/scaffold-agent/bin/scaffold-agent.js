#! /usr/bin/env node

const { program } = require('commander');
const { generateProject } = require('../src/main');

program
  .name('scaffold-agent')
  .description('CLI to generate a modern agent from a legacy one')
  .version(require('../package.json').version)
  .argument('<projectFolder>', 'Path to the project folder')
  .argument('<destinationFolder>', 'Path to the destination folder')

program.parse(process.argv);

generateProject(program.args[0], program.args[1]).catch((err) => {
  console.error(err);
  process.exit(1);
});
