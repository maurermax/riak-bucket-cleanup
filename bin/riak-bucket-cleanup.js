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
  .option('-e, --emulate', 'only output the keys that would be deleted, but do not delete for real')
  .option('-u, --prune', 'prune entries by writing an empty string to them before actually deleting them')
  .parse(process.argv);
if (!program.args.length) {
  program.help();
}
program.host = program.host || 'localhost';
program.port = program.port || '8098';
if (!program.regex) {
  console.log('please provide a regex');
  program.help();
  return;
}
program.emulate = !!program.emulate;
var regex = new RegExp(program.regex);
var settings = {
  bucket: program.args,
  regex: program.regex,
  host: program.host,
  port: program.port,
  emulate: program.emulate,
  prune: program.prune
}

cleanupLogic.cleanup(settings);