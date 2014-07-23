var chai    = require('chai'),
    expect  = chai.expect;

var glob    = require('glob'),
    rimraf  = require('rimraf');

var Stasis  = require('../lib/main');


// clean up output path and initialize Stasis
describe('Initializing', function () {

  it('should clean up output path first.', function () {
    rimraf.sync('test/out/');
    expect(glob.sync('test/out')).deep.equal([]);
  });

  it('should load config and template files.', function () {
    var ready = Stasis.initialize('test/config.json');
    // Stasis.Util.setVerbose(true);
    expect(ready).deep.equal(true);
  });

});


// Utilities
describe('Utilities', function () {

  describe('calculateFeature(source_string)', function () {
    it('calculate feature vector from source string.', function () {
      var srcstr1 = 'The sun in the sky is bright. We can see the shining sun.';
      var srcstr2 = 'Twinkle, twinkle, little star, How I wonder what you are.';
      expect(Stasis.Util.calculateFeature(srcstr1)).deep.equal({ 'sun': 2 });
      expect(Stasis.Util.calculateFeature(srcstr2)).deep.equal({ 'twinkle': 2 });
    });
  });

  describe('filterDocument(doc, options)', function () {
    it('filter document by options. (i.e. tag)', function () {
      var doc = { tags: ['tag1', 'tag2'] };
      var opt1 = { tags: ['tag1'] },
          opt2 = { tags: ['tag2'] },
          opt3 = { tags: ['tag3'] };
      expect(Stasis.Util.filterDocument(doc, opt1)).to.equal(true);
      expect(Stasis.Util.filterDocument(doc, opt2)).to.equal(true);
      expect(Stasis.Util.filterDocument(doc, opt3)).to.equal(false);
    });
  });

  describe('replaceToken(source_string, dict)', function () {
    it('should replace tokens in the input string.', function () {
      var string = '{@hey} hey {@hoe} hoe {@hee} hee';
      var dict = { '{@hey}': 'hey', '{@hoe}': 'hoe', '{@hee}': 'hee' };
      expect(Stasis.Util.replaceTokens(string, dict)).to.equal('hey hey hoe hoe hee hee');
    });
  });

});


/**
 * Stasis Core: Internal Methods
 */

describe('Core', function () {

  describe('_buildDocument(source_path)', function () {
    it('should build markdown file to a doc object.', function () {
      var doc = Stasis._buildDocument('test/src/test.md');
      expect(doc.body).to.equal("<p>TEST BODY</p>\n");
      expect(doc.date.ago).to.equal("38 years ago");
      expect(doc.doc_id).to.equal("test");
      expect(doc.source).to.equal("test/src/test.md");
      expect(doc.template).to.equal("test_template");
      expect(doc.title).to.equal("Test Document: Hello Stasis!");
    });
  });

  describe('_getDocumentId(filename)', function () {

    it('should generate unique document ID from filename.', function () {
      // generates doc_id
      var doc_id = Stasis._getDocumentId('Hello World. This is Stais#?!');
      expect(doc_id).to.equal('hello-world-this-is-stais');
    });

    it('should return null for duplicate document ID.', function () {
      // return null for duplicated id
      var duped = Stasis._getDocumentId('Hello World. This is Stais#?!');
      expect(duped).to.equal(null);
    });
  });

  describe('_getDocLocation(doc)', function () {
    it('should return document location based on sitemap.', function () {
        var doc1 = Stasis._buildDocument('test/src/page-1.md'),
            doc2 = Stasis._buildDocument('test/src/posts/test-post-1.md');
        doc1.path = Stasis._resolvePath(doc1, 'test/out');
        doc2.path = Stasis._resolvePath(doc2, 'test/out/posts');
        expect(Stasis._getDocumentLocation(doc1)).to.equal('page 1');
        expect(Stasis._getDocumentLocation(doc2)).to.equal('blog');
      }
    );
  });

  describe('_resolvePath(doc, target_path)', function () {
    it('should return correct paths for rendering.', function () {
      var doc = { source: 'test/src/document.md' };
      var path = Stasis._resolvePath(doc, 'test/out');
      expect(path).deep.equal({
        "assets": "../assets",
        "permalink": "https://www.yoursite.com/test/out/document",
        "root": "../",
        "self": "test/out/document/index.html"
      });
    });
  });

  // describe('_filterDoc(doc, options)', function () {
  //   // filter case 1
  //   it('should return flag after checking dates.', function () {
  //     var post = stasis.read('test/src/posts/test-post-1.md');
  //     var flag = stasis._filterDoc(post, {
  //       startDate: '2013-12-31 00:00',
  //       endDate: '2014-01-02 00:00'
  //     });
  //     expect(flag).to.equal(true);
  //   });
  //   // filter case 2
  //   it('should return flag after checking tags.', function () {
  //     var post1 = stasis.read('test/src/posts/test-post-1.md');
  //     var flag1 = stasis._filterDoc(post1, {
  //       tags: ['tag1']
  //     });
  //     expect(flag1).to.equal(true);
  //     var post2 = stasis.read('test/src/posts/test-post-2.md');
  //     var flag2 = stasis._filterDoc(post2, {
  //       tags: ['tag1']
  //     });
  //     expect(flag2).to.equal(false);
  //   });
  //   // filter case 3
  //   it('should return flag after checking both dates and tags.', function () {
  //     var post = stasis.read('test/src/posts/test-post-3.md');
  //     var flag = stasis._filterDoc(post, {
  //       startDate: '2014-01-02 00:00',
  //       endDate: '2014-01-04 00:00',
  //       tags: ['tag3']
  //     });
  //     expect(flag).to.equal(true);
  //     // clean doc cache for next test
  //     stasis._cleanDocCache();
  //   });
  // });

});


/**
 * Stasis Core: Public Methods
 */

describe('Stasis Core: Public Methods', function () {

  describe('collectDocuments(glob_pattern)', function () {
    it('should read all the matching markdown files.', function () {
      Stasis.resetDocumentID();
      var posts = Stasis.collectDocuments('test/src/posts/**/*.md');
      expect(posts[0]).to.have.property('title', 'Test Post 1');
      expect(posts[1]).to.have.property('body', '<p>TEST POST #2</p>\n');
      expect(posts[2]).to.have.property('doc_id', 'test-post-3');
    });
  });

  describe('renderDocuments(docs, target_path, options)', function () {
    it('should render the document collection at target path.', function () {
      Stasis.resetDocumentID();
      // collect and render
      var posts = Stasis.collectDocuments('test/src/posts/**/*.md');
      Stasis.renderDocuments(posts, 'test/out/posts/', {});
      // get result html file paths
      var output = glob.sync('test/out/posts/**/index.html');
      // assert
      expect(output).to.include('test/out/posts/test-post-3/index.html');
      expect(output).to.include('test/out/posts/test-post-2/index.html');
      expect(output).to.include('test/out/posts/test-post-1/index.html');
    });
  });

  // describe('renderIndex(docs, target_path, template_name)', function () {
  //   it('should render index page for document collection at target path.',
  //     function () {
  //       // rake and render
  //       var posts = stasis.rake('test/src/posts/**/*.md');
  //       stasis.render(posts, 'test/out/posts/');
  //       // 'test_postlist' is loaded above. (NOTE: dustjs is global)
  //       stasis.renderIndex(posts, 'test/out/posts', 'test_postlist');
  //       // test produced list page
  //       var index = glob.sync('test/out/posts/*.html');
  //       expect(index).to.include('test/out/posts/index.html');
  //       // clean doc cache for next test
  //       stasis._cleanDocCache();
  //     }
  //   );
  // });

});