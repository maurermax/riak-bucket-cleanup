var async = require('async');

function cleanup(settings, callback) {
  var regex = new RegExp(settings.regex);
  var count = 0;
  var db = require("riak-js").getClient({host: settings.host, port: settings.port});
  var receivedAll = false;

  var queue = async.queue(function (key, callback) {
    if (!regex.test(key)) {
      console.log('skipping key ' + key  + ' as it does not match the regex');
      return setImmediate(callback);
    }
    if (settings.emulate) {
      if (settings.prune) {
        console.log('[EMULATION] would prune entry with key '+key);
      }
      console.log('[EMULATION] would delete entry with key '+key);
      return setImmediate(callback);
    } else {
      if (settings.prune) {
        console.log('going to prune key ' + key);
        db.save(settings.bucket, key, {}, function(err) {
          if (err) {
            console.log(err);
          }
          console.log('going to remove key '+key);
          db.remove(settings.bucket, key, function(err) {
            if (err) {
              console.log(err);
            }
            count++;
            return setImmediate(callback);
          });
        });
      } else {
        console.log('going to remove key without pruning '+key);
        db.remove(settings.bucket, key, function(err) {
          if (err) {
            console.log(err);
          }
          count++;
          return setImmediate(callback);
        });
      }
    }
  }, 100);

  queue.drain = function() {
    if (receivedAll) {
      queue.kill();
      end(callback);
    }
  };

  function end(callback) {
    if (count<=0) {
      console.log('nothing done');
    } else {
      console.log('finished cleanup of '+count+' keys in bucket '+ settings.bucket);
    }
    return callback();
  }

  db.keys(settings.bucket, {keys:'stream'}, function (err) {
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
      end(callback);
    }
  }).start();
}

module.exports = {
  cleanup: cleanup
}