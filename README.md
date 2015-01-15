riak-bucket-cleanup
===================

clean riak entries where keys match a given regex

### How to use ###

* `npm install -g riak-bucket-cleanup`
* `run riak-bucket-cleanup --regex="^old_.*$" [bucketName]`
* `grab a cup of coffee`
* `all keys starting with "old_" will be deleted`

### Any options ###

````
 Usage: riak-bucket-cleanup [options] bucketName

  Options:

    -h, --help           output usage information
    -V, --version        output the version number
    -H, --host [host]    specify the host (default: localhost)
    -p, --port [port]    specify the post (default: 8098)
    -r, --regex [regex]  the regular expression that will be used to verify entries against
    -e, --emulate        only output the keys that would be deleted, but do not delete for real
    -u, --prune          prune entries by writing an empty object to them before actually deleting them
````
