var chai    = require('chai'),
    expect  = chai.expect;

var glob    = require('glob'),
    rimraf  = require('rimraf');

var stasis  = require('../lib/main');


// clean up output path
describe('Initialize Test', function () {

  it('should clean up output path first.', function () {
    rimraf.sync('test/out/');
    var output = glob.sync('test/out');
    expect(output).deep.equal([]);
  });

});


/**
 * CONFIG
 */

describe('Stasis Config', function () {

  describe('loadConfig(config_path)', function () {
    it('should fetch and parse ./stasis.json file.', function () {
      var success = stasis.loadConfig('test/config.json');
      expect(success).to.equal(true);
      // have.keys(['path', 'siteinfo', 'sitemap']);
    });
  });

});


/**
 * Stasis Core: Internal Methods
 */

describe('Stasis Core: Internal Methods', function () {

  describe('_generateDocId(filename)', function () {

    it('should generate unique document ID from filename.', function () {
      // generates doc_id
      var doc_id = stasis._generateDocId('Hello World. This is Stais#?!');
      expect(doc_id).to.equal('hello-world-this-is-stais');
    });

    it('should return null for duplicate document ID.', function () {
      // return null for duplicated id
      var duped = stasis._generateDocId('Hello World. This is Stais#?!');
      expect(duped).to.equal(null);
      // clean doc cache for next test
      stasis._cleanDocCache();
    });
  });

  describe('_filterDoc(doc, options)', function () {
    // filter case 1
    it('should return flag after checking dates.', function () {
      var post = stasis.read('test/src/posts/test-post-1.md');
      var flag = stasis._filterDoc(post, {
        startDate: '2013-12-31 00:00',
        endDate: '2014-01-02 00:00'
      });
      expect(flag).to.equal(true);
    });
    // filter case 2
    it('should return flag after checking tags.', function () {
      var post1 = stasis.read('test/src/posts/test-post-1.md');
      var flag1 = stasis._filterDoc(post1, {
        tags: ['tag1']
      });
      expect(flag1).to.equal(true);
      var post2 = stasis.read('test/src/posts/test-post-2.md');
      var flag2 = stasis._filterDoc(post2, {
        tags: ['tag1']
      });
      expect(flag2).to.equal(false);
    });
    // filter case 3
    it('should return flag after checking both dates and tags.', function () {
      var post = stasis.read('test/src/posts/test-post-3.md');
      var flag = stasis._filterDoc(post, {
        startDate: '2014-01-02 00:00',
        endDate: '2014-01-04 00:00',
        tags: ['tag3']
      });
      expect(flag).to.equal(true);
      // clean doc cache for next test
      stasis._cleanDocCache();
    });
  });

  // NEED REWRITE
  // describe('_calculateFeatureVector', function () {
  //   it('calculates feature vector of documents.', function () {
  //     var posts = stasis.rake('src/posts/2014/*.md');
  //     for (var i = 0; i < posts.length; i++) {
  //       expect(posts[i]).to.have.property('fvec');
  //     }
  //     // clean doc cache for next test
  //     stasis._cleanDocCache();
  //   });
  // });

  describe('_replaceToken', function () {
    it('should replace tokens in the input string.', function () {
      var string = '{@hey} hey {@hoe} hoe {@hee} hee';
      var dict = {
        '{@hey}': 'hey',
        '{@hoe}': 'hoe',
        '{@hee}': 'hee'
      };
      var subbed = stasis._replaceTokens(string, dict);
      expect(subbed).to.equal('hey hey hoe hoe hee hee');
    });
  });

  describe('_getRenderPaths(doc, target_path)', function () {
    it('should return correct paths for rendering.', function () {
      var doc = { source: 'test/src/document.md' };
      var paths = stasis._getRenderPaths(doc, 'test/out');
      expect(paths).deep.equal({
        "assets": "../assets",
        "permalink": "https://www.yoursite.com/test/out/document",
        "root": "../",
        "self": "test/out/document/index.html"
      });
    });
  });

  describe('_getDocLocation(docs)', function () {
    it('should return document location based on sitemap.',
      function () {
        var page = stasis.read('test/src/page-1.md');
        stasis.render([page], 'test/out');
        expect(page.location).to.equal('page 1');
      }
    );
  });

});


/**
 * Stasis Core: Public Methods
 */

describe('Stasis Core: Public Methods', function () {

  describe('read(source_path)', function () {
    it('should read markdown file to a doc object.', function () {
      var doc = stasis.read('test/src/test.md');
      expect(doc).deep.equal({
        "body": "<p>TEST BODY</p>\n",
        "date": {
          "ago": "38 years ago",
          "mdy": "06.26.1976",
          "unix": "204688800"
        },
        "doc_id": "test",
        "language": "en",
        "source": "test/src/test.md",
        "tags": [
          "birthday"
        ],
        "template": "test_template",
        "title": "Test Document: Hello World",
        "fvec": {}
      });
      // clean doc cache for next test
      stasis._cleanDocCache();
    });
  });

  describe('rake(glob_pattern, options)', function () {
    it('should read all the matching markdown files.', function () {
      var posts = stasis.rake('test/src/posts/**/*.md');
      expect(posts[0]).to.have.property('doc_id', 'test-post-3');
      expect(posts[1]).to.have.property('body', '<p>TEST POST #2</p>\n');
      expect(posts[2]).to.have.property('title', 'Test Post 1');
      // clean doc cache for next test
      stasis._cleanDocCache();
    });

  });

  describe('loadTemplates(path)', function () {
    it('load **/*.dust files at path', function () {
      var tpls = stasis.loadTemplates('test/templates');
      expect(tpls).deep.equal(['test_page', 'test_postlist']);
    });
  });

  describe('render(docs, target_path)', function () {
    it('should render the document collection at target path.', function () {
      // rake and render
      var posts = stasis.rake('test/src/posts/**/*.md');
      stasis.render(posts, 'test/out/posts/');
      // get result html file paths
      var output = glob.sync('test/out/posts/**/index.html');
      // assert
      expect(output).to.include('test/out/posts/test-post-3/index.html');
      expect(output).to.include('test/out/posts/test-post-2/index.html');
      expect(output).to.include('test/out/posts/test-post-1/index.html');
      // clean doc cache for next test
      stasis._cleanDocCache();
    });
  });

  describe('renderIndex(docs, target_path, template_name)', function () {
    it('should render index page for document collection at target path.',
      function () {
        // rake and render
        var posts = stasis.rake('test/src/posts/**/*.md');
        stasis.render(posts, 'test/out/posts/');
        // 'test_postlist' is loaded above. (NOTE: dustjs is global)
        stasis.renderIndex(posts, 'test/out/posts', 'test_postlist');
        // test produced list page
        var index = glob.sync('test/out/posts/*.html');
        expect(index).to.include('test/out/posts/index.html');
        // clean doc cache for next test
        stasis._cleanDocCache();
      }
    );
  });

});