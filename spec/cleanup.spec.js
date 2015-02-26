var expect = require('expect.js');
var RiakMockServer = require('riak-mock-server');
var cleanupLogic = require('../lib/riak-bucket-cleanup-logic');

describe('key based', function() {
  var mockServer;
  var mockPort;
  var bucket = 'test';
  var db;
  var options;

  before(function(done) {
    mockServer = new RiakMockServer({ port: null });
    mockServer.start(function(port) {
      mockPort = port;
      db = require('riak-js').getClient({ host: 'localhost', port: port });
      done();
    });
  });

  after(function(done) {
    mockServer.stop(done);
  });

  beforeEach(function(done) {
    options = {
      bucket: bucket,
      host: 'localhost',
      port: mockPort,
      regex: '.*',
      purge: false,
      emulate: false,
      purgeZombies: false,
      keys: null
    }
    done();
  });

  function insert(key, val, cb) {
    db.save(bucket, key, val, cb);
  }

  beforeEach(function(done) {
    insert('key1', { contentKey: 'contentVal1' }, function(err) {
      insert('key2', { contentKey: 'contentVal2' }, function(err) {
        done();
      });
    });
  });

  function getKeys(cb) {
    var keys = [];
    db.keys(bucket).on('keys', function(k) {
      keys = k;
    }).on('end', function() {
      return cb(keys);
    }).start();
  }

  it('has test data in the database', function(done) {
    getKeys(function(keys) {
      expect(keys.length).to.be(2);
      done();
    });
  });

  it('after a clean up with regex .* all keys will be gone', function(done) {
    cleanupLogic.cleanup(options, function() {
      getKeys(function(keys) {
        expect(keys.length).to.be(0);
        done();
      });
    });
  });

  it('when passing a key list this will be used instead requesting all keys', function(done) {
    options.keys = ['key1'];
    cleanupLogic.cleanup(options, function() {
      getKeys(function(keys) {
        expect(keys.length).to.be(1);
        done();
      });
    });
  });

  it('after a clean up with regex key2 only key2 will be gone', function(done) {
    options.regex = '.*2';
    cleanupLogic.cleanup(options, function() {
      getKeys(function(keys) {
        expect(keys.length).to.be(1);
        done();
      });
    });
  });

  it('after a simulated cleaup all keys will still be there', function(done) {
    options.emulate = true;
    cleanupLogic.cleanup(options, function() {
      getKeys(function(keys) {
        expect(keys.length).to.be(2);
        done();
      });
    });
  });

  it('using a json path and a content regex we won\'t delete items in case the content path does not match', function(done) {
    options.contentPath = 'non existing';
    options.contentRegex = '.*'
    cleanupLogic.cleanup(options, function() {
      getKeys(function(keys) {
        expect(keys.length).to.be(2);
        done();
      });
    });
  });

  it('using an existing json path and a content regex .* we will delete all items', function(done) {
    options.contentPath = 'contentKey';
    options.contentRegex = '.*'
    cleanupLogic.cleanup(options, function() {
      getKeys(function(keys) {
        expect(keys.length).to.be(0);
        done();
      });
    });
  });

  it('using a json path and a content regex will delete all items where the regex matches', function(done) {
    options.contentPath = 'contentKey';
    options.contentRegex = '.*1'
    cleanupLogic.cleanup(options, function() {
      getKeys(function(keys) {
        expect(keys.length).to.be(1);
        done();
      });
    });
  });

  it('using the purgeZombies option will purge all keys that generate a 404 but not those existing', function(done) {
    options.purgeZombies = true;
    options.keys = ['key1', 'key2', '404key'];
    cleanupLogic.cleanup(options, function(countDeleted) {
      expect(countDeleted).to.be(1);
      getKeys(function(keys) {
        expect(keys.length).to.be(2);
        done();
      });
    });
  });
});