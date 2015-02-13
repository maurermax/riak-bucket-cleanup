var expect = require('expect.js');
var RiakMockServer = require('riak-mock-server');
var cleanupLogic = require('../lib/riak-bucket-cleanup-logic');

describe('key based', function() {
  var mockServer;
  var mockPort;
  var bucket = 'test';
  var db;

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

  function insert(key, val, cb) {
    db.save(bucket, key, val, cb);
  }

  beforeEach(function(done) {
    insert('key1', { contentKey1: 'contentVal1' }, function(err) {
      insert('key2', { contentKey2: 'contentVal2' }, function(err) {
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
    cleanupLogic.cleanup({ bucket: bucket, host: 'localhost', port: mockPort, regex: '.*', prune: false, emulate: false }, function() {
      getKeys(function(keys) {
        expect(keys.length).to.be(0);
        done();
      });
    });
  });

  it('after a clean up with regex key2 only key2 will be gone', function(done) {
    cleanupLogic.cleanup({ bucket: bucket, host: 'localhost', port: mockPort, regex: 'key2', prune: false, emulate: false }, function() {
      getKeys(function(keys) {
        expect(keys.length).to.be(1);
        done();
      });
    });
  });

  it('after a simulated cleaup all keys will still be there', function(done) {
    cleanupLogic.cleanup({ bucket: bucket, host: 'localhost', port: mockPort, regex: '.*', prune: false, emulate: true }, function() {
      getKeys(function(keys) {
        expect(keys.length).to.be(2);
        done();
      });
    });
  });
});