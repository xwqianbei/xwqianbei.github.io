// Ensure index.html and archives/index.html are always generated,
// even when there are no posts.

hexo.extend.generator.register('ensure-index', function(locals) {
  var results = [];

  // Always generate index.html
  var indexExists = locals.posts.length > 0;
  if (!indexExists) {
    results.push({
      path: 'index.html',
      layout: ['index'],
      data: {
        posts: locals.posts,
        total: 0,
        current: 1,
        current_url: '/',
        __index: true
      }
    });
  }

  // Always generate archives/index.html
  results.push({
    path: 'archives/index.html',
    layout: ['archive', 'index'],
    data: {
      posts: locals.posts.sort('-date'),
      total: 1,
      current: 1,
      current_url: '/archives/',
      archive: true
    }
  });

  return results;
});
