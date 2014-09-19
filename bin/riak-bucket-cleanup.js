#!/usr/bin/env node

var program = require('commander');

program
    .version('0.0.1')
    .usage('[options] bucketName')
    .option('-H, --host [host]','specify the host (default: localhost)')
    .option('-p, --port [port]','specify the post (default: 8098)')
    .option('-r, --regex [regex]','the regular expression that will be used to verify entries against')
    .option('-e, --emulate','only output the keys that would be deleted, but do not delete for real')
    .parse(process.argv);
if(!program.args.length) {
  program.help();
}
var bucket = program.args;
program.host = program.host || 'localhost';
program.port = program.port || '8098';
if (!program.regex) {
  console.log('please provide a regex');
  program.help();
  return;
}
var regex = new RegExp(program.regex);
program.emulate = !!program.emulate;
var count = 0;
var db = require("riak-js").getClient({host: program.host, port: program.port});
db.keys(bucket,{keys:'stream'}, function (err) {
  if (err) {
    console.log('failed to fetch keys');
    console.log(err);
  }
}).on('keys', handleKey).on('end', end).start();

function end() {
  if (count<=0) {
    console.log('nothing done');
  } else {
    console.log('finished cleanup of '+count+' keys in bucket '+bucket);
  }
}

function handleKey(keys) {
  for (var i=0;i<keys.length;i++) {
    var key = keys[i];
    if (processKey(key)) {
      count++;
    }
  }
}

function processKey(key) {
  if (regex.test(key)) {
    if (program.emulate) {
      console.log('[EMULATION] would delete entry with key '+key);
    } else {
      db.remove(bucket, key, function(err) {
        if (err) {
          console.log(err);
        }
      });
    }
    return true;
  }
  return false;
}





