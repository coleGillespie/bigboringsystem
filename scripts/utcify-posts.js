#!/usr/bin/env node

// Update old post 'created' timestamps to UTC:
// - They are currently stored as [millseconds since the local epoch / 1000].
// - Multiply them by 1000, and save them as an ISO string.

// Note: this script must only be run if the server's timezone hasn't
// changed since the original posts were created

var concat = require('concat-stream');

var db = require('../lib/db').register('posts');

getPosts(function (err, posts) {
    if (err) { throw err; }

    updatePosts(posts, function (err) {
        if (err) { throw err; }

        process.stdout.write('\n');
        console.log('Successfully processed ' + posts.length + ' post timezones');
        process.exit();
    });
});

function getPosts(next) {
  var rs = db.createReadStream();

  rs.pipe(concat(function (posts) {
    next(null, posts);
  }));

  rs.on('error', next);
}

function updatePosts(posts, next) {
  var processed = 0;

  posts.forEach(function updatePost(post) {

    if (process.argv[2] === '--test') {
      console.log(post.value.created);
      return next(null);
    }

    process.stdout.write('.');

    if (post.value.created[post.value.created.length - 1] !== 'Z') {
      post.value.created = (new Date(+post.value.created * 1000)).toISOString();
      db.put(post.key, post.value, function (err) {
        if (err) {
          return next(err);
        }

        processed++;
        if (processed === posts.length) {
          next(null);
        }
      });
    } else {
      processed++;
      if (processed === posts.length) {
        next(null);
      }
    }
  });
}
