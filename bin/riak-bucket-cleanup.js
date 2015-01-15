#!/usr/bin/env node

var program = require('commander');
var packageJson = require('../package.json');
var async = require('async');
program
    .version(packageJson.version)
    .usage('[options] bucketName')
    .option('-H, --host [host]','specify the host (default: localhost)')
    .option('-p, --port [port]','specify the post (default: 8098)')
    .option('-r, --regex [regex]','the regular expression that will be used to verify entries against')
  .option('-e, --emulate','only output the keys that would be deleted, but do not delete for real')
  .option('-u, --prune','prune entries by writing an empty string to them before actually deleting them')
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
var receivedAll = false;

var queue = async.queue(function (key, callback) {
  if (!regex.test(key)) {
    console.log('skipping key ' + key  + ' as it does not match the regex');
    return setImmediate(callback);
  }
  if (program.emulate) {
    if (program.prune) {
      console.log('[EMULATION] would prune entry with key '+key);
    }
    console.log('[EMULATION] would delete entry with key '+key);
    return setImmediate(callback);
  } else {
    if (program.prune) {
      console.log('going to prune key ' + key);
      db.save(bucket, key, {}, function(err) {
        if (err) {
          console.log(err);
        }
        console.log('going to remove key '+key);
        db.remove(bucket, key, function(err) {
          if (err) {
            console.log(err);
          }
          count++;
          return setImmediate(callback);
        });
      });
    }
  }
}, 100);

queue.drain = function() {
  if (receivedAll) {
    queue.kill();
    end();
  }
};

function end() {
  if (count<=0) {
    console.log('nothing done');
  } else {
    console.log('finished cleanup of '+count+' keys in bucket '+bucket);
  }
}

db.keys(bucket, {keys:'stream'}, function (err) {
  if (err) {
    console.log('failed to fetch keys');
    console.log(err);
  }
}).on('keys', function(keys) {
  console.log('received ' + keys.length + ' keys');
  queue.push(keys);
  console.log('current queue size: ' + queue.length());
}).on('end', function() {
  receivedAll = true;
  if (queue.idle()) {
    end();
  }
}).start();
