#!/usr/bin/env node

var program = require('commander');
var packageJson = require('../package.json');
var cleanupLogic = require('../lib/riak-bucket-cleanup-logic');
program
  .version(packageJson.version)
  .usage('[options] bucketName')
  .option('-H, --host [host]', 'specify the host (default: localhost)')
  .option('-p, --port [port]', 'specify the post (default: 8098)')
  .option('-r, --regex [regex]', 'the regular expression that will be used to verify entries against')
  .option('-e, --emulate', 'only output the keys that would be deleted, but do not delete for real (default: false)')
  .option('-u, --prune', 'prune entries by writing an empty string to them before actually deleting them (default: false)')
  .option('-n, --numParallel [n]', 'the number of items that will be processed in parallel (default: 10)', parseInt)
  .option('--contentPath', 'JSONPath of the content that is also verified matching the value of contentRegex before deleting a node. if the path does not exist the ndoe will not be deleted')
  .option('--contentRegex', 'a regex that will be applied to a given content path in case it exists. the node will only be deleted if the regex matches')
  .parse(process.argv);
if (!program.args.length) {
  program.help();
  return;
}
program.host = program.host || 'localhost';
program.port = program.port || '8098';
program.numParallel = program.numParallel || 50;
if (!program.regex) {
  console.log('please provide a regex');
  program.help();
  return;
}
if ((program.contentRegex && !program.contenPath) || (!program.contentRegex && program.contentPath)) {
  console.log('you need to provide contentRegex and contentPath if you want to use this feature');
  program.help();
  return;
}
program.emulate = !!program.emulate;
var settings = {
  bucket: program.args,
  regex: program.regex,
  host: program.host,
  port: program.port,
  emulate: program.emulate,
  prune: program.prune,
  numParallel: program.numParallel,
  contentPath: program.contentPath,
  contentRegex: program.contentRegex
}

cleanupLogic.cleanup(settings);