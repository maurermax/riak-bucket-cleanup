var async = require('async');
var jsonPath = require('JSONPath');

function cleanup(settings, callback) {
  var regex = new RegExp(settings.regex);
  var regexContent = null;
  if (settings.contentRegex) {
    regexContent = new RegExp(settings.contentRegex);
  }
  var count = 0;
  var db = require("riak-js").getClient({host: settings.host, port: settings.port});
  var receivedAll = false;

  function deleteKey(key, callback) {
    async.waterfall([function(callback) {
      if (settings.prune) {
        if (settings.emulate) {
          console.log('[EMULATION] would prune entry with key '+key);
          return callback();
        }
        console.log('going to prune key ' + key);
        db.save(settings.bucket, key, {}, callback);
      }
      return callback();
    }, function(callback) {
      if (!settings.contentPath || !regexContent) {
        return callback(null, true);
      }
      db.get(settings.bucket, key, function(err, data) {
        if (err) {
          console.log('failed to load key: %j', key);
          return callback(err);
        }
        var contents = jsonPath.eval(data, settings.contentPath);
        if (contents.length === 0) {
          console.log('content path of key %j does not exist', key);
          return callback(null, false);
        }
        for (var i = 0; i < contents.length; i++) {
          var contentVal = contents[i];
          if (!regexContent.test(contentVal)) {
            console.log('content value %j of path %j of key %j does NOT match regex', contentVal, settings.contentPath, key);
            return callback(null, false);
          }
        }
        console.log('content value %j of path %j of key %j does match regex for all', contents, settings.contentPath, key);
        return callback(null, true);
      });
    }, function(doRemove, callback) {
      if (!doRemove) {
        return callback();
      }
      if (settings.emulate) {
        console.log('[EMULATION] would remove entry with key '+key);
        return callback();
      }
      console.log('going to remove key %j', key);
      db.remove(settings.bucket, key, function(err) {
        if (err) {
          return callback(err);
        }
        count++;
        return callback();
      });
    }], function(err) {
      if (err) {
        console.log(err);
      }
      return setImmediate(callback);
    });
  }

  var queue = async.queue(function (key, callback) {
    if (!regex.test(key)) {
      console.log('skipping key ' + key  + ' as it does not match the regex');
      return setImmediate(callback);
    }
    return deleteKey(key, callback);
  }, settings.numParallel);

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