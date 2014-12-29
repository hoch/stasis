/**
 * Mocha + Chai test for Stasis
 */

// dependencies
var chai    = require('chai'),
    expect  = chai.expect;

var fs      = require('fs'),
    path    = require('path'),
    glob    = require('glob'),
    rimraf  = require('rimraf'),
    mkdirp  = require('mkdirp');

// Stasis instance
var Stasis  = require('../lib/main');


/**
 * Initializing: obliterate-recreate output path and boot up Stasis
 */

describe('Initializing', function () {

  it('should clean up several path first.', function () {
    rimraf.sync('test/src/drafts');
    rimraf.sync('test/out');
    mkdirp.sync('test/out');
    expect(glob.sync('test/out')).deep.equal(['test/out']);
  });

  it('should load config and template files.', function () {
    var ready = Stasis.initialize('test/config.json');
    // Stasis.Util.setVerbose(true);
    expect(ready).deep.equal(true);
  });

});


/**
 * Stasis Utilities
 */

describe('Utilities', function () {

  describe('calculateFeature(source_string)', function () {
    it('calculates feature vector from source string.', function () {
      var srcstr1 = 'The sun in the sky is bright. We can see the shining sun.';
      var srcstr2 = 'Twinkle, twinkle, little star, How I wonder what you are.';
      expect(Stasis.Util.calculateFeature(srcstr1)).deep.equal({ 'sun': 2 });
      expect(Stasis.Util.calculateFeature(srcstr2)).deep.equal({ 'twinkle': 2 });
    });
  });

  describe('checkDate(doc, startDate, endDate)', function () {
    it('checks document date in range', function () {
      // this is 03.06.2014
      var doc = { date: { unix: '1394092800' }} ;
      var d1 = new Date('2014 03 05'),
          d2 = new Date('2014 03 07');
      expect(Stasis.Util.checkDate(doc, d1)).to.equal(true);
      expect(Stasis.Util.checkDate(doc, d2)).to.equal(false);
      expect(Stasis.Util.checkDate(doc, d1, d2)).to.equal(true);
    });
  });

  describe('checkTags(doc, tags)', function () {
    it('checks document tags', function () {
      var doc = { tags: ['tag1', 'tag2'] };
      var tags1 = ['tag1'],
          tags2 = ['tag2'],
          tags3 = ['tag3'];
      expect(Stasis.Util.checkTags(doc, tags1)).to.equal(true);
      expect(Stasis.Util.checkTags(doc, tags2)).to.equal(true);
      expect(Stasis.Util.checkTags(doc, tags3)).to.equal(false);
    });
  });

  describe('sortCollection(doc)', function () {
    it('sorts collection object in time-reverse order', function () {
      var docs = [
        { title: 'a', date: { unix: 0 } },
        { title: 'b', date: { unix: 1 } }
      ];
      Stasis.Util.sortCollection(docs);
      expect(docs[0].title).to.equal('b');
    });
  });

  describe('extractTags(str)', function () {
    it('extract tags from a string', function () {
      var str1 = '#hEy #Hoe #hEE',
          str2 = '#Hello@!& #stasis is cool';
      expect(Stasis.Util.extractTags(str1)).deep.equal(['hey', 'hoe', 'hee']);
      expect(Stasis.Util.extractTags(str2)).deep.equal(['hello', 'stasis is cool']);
    });
  });

  describe('replaceToken(source_string, dict)', function () {
    it('should replace tokens in the input string.', function () {
      var string = '{@hey} hey {@hoe} hoe {@hee} hee';
      var dict = { '{@hey}': 'hey', '{@hoe}': 'hoe', '{@hee}': 'hee' };
      expect(Stasis.Util.replaceTokens(string, dict)).to.equal('hey hey hoe hoe hee hee');
    });
  });

  // NOTE: renderDocument test is down there...

});


/**
 * Stasis Core: Internal Methods
 */

describe('Core', function () {

  describe('_buildDocument(source_path, target_path)', function () {
    it('should build markdown file to a doc object.', function () {
      var doc = Stasis._buildDocument('test/src/pages/index.md', 'test/out');
      expect(doc.id).to.equal('index');
      expect(doc.path.source).to.equal('test/src/pages/index.md');
      expect(doc.path.dir).to.equal('test/out');
      expect(doc.template).to.equal('test_index');
      expect(doc.title).to.equal('Hello Stasis!');
    });
  });

  describe('_createNewContent(answers)', function () {
    it('should create a new content from query answers.', function () {
      var answers = {
        title: 'This is The Test Page!!',
        type: 'page',
        tags: '#page #test #static!!'
      };
      var content = Stasis._createNewContent(answers);
      expect(fs.existsSync('test/src/drafts/this-is-the-test-page.md')).to.equal(true);
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
        var doc1 = { path: { self: 'test/out/page-1/index.html' }},
            doc2 = { path: { self: 'test/out/posts/test-post-1/index.html' }};
        expect(Stasis._getDocumentLocation(doc1)).to.equal('page 1');
        expect(Stasis._getDocumentLocation(doc2)).to.equal('blog');
      }
    );
  });

  describe('_resolvePath(source_path, target_path)', function () {
    it('should return correct paths for rendering.', function () {
      var path = Stasis._resolvePath('test/src/document.md', 'test/out');
      expect(path).deep.equal({
        "source": "test/src/document.md",
        "dir": "test/out/document",
        "permalink": "https://www.yoursite.com/test/out/document",
        "root": "../",
        "self": "test/out/document/index.html"
      });
    });
  });

  describe('_validateNewContent(title)', function () {
    it('validates new content title with respect to existing contents.',
      function () {
        expect(Stasis._validateNewContent('Test Post 1')).to.equal(false);
        expect(Stasis._validateNewContent('hello world!')).to.equal(true);
      }
    );
  });

});


/**
 * Stasis Core: Public Methods
 */

describe('Stasis Core: Public Methods', function () {

  describe('createCollection(glob_pattern, target_path)', function () {
    it('should read matching files and create a collection.', function () {
      Stasis.resetDocumentID();
      // create collections
      var pages = Stasis.createCollection('test/src/pages/*.md', 'test/out'),
          posts = Stasis.createCollection('test/src/posts/**/*.md', 'test/out/posts');
      // assert
      expect(pages[0]).to.have.property('id', 'index');
      expect(pages[1]).to.have.property('id', 'page-1');
      expect(pages[2]).to.have.property('id', 'page-2');
      expect(posts[0]).to.have.property('id', 'test-post-1');
      expect(posts[1]).to.have.property('id', 'test-post-2');
      expect(posts[2]).to.have.property('id', 'test-post-3');
    });
  });

  describe('renderCollection(docs)', function () {
    it('should render the document collection at target path.', function () {
      Stasis.resetDocumentID();
      // create collections
      var pages = Stasis.createCollection('test/src/pages/*.md', 'test/out'),
          posts = Stasis.createCollection('test/src/posts/**/*.md', 'test/out/posts');
      // render
      Stasis.renderCollection(pages);
      Stasis.renderCollection(posts);
      // get result html file paths
      var rendered = glob.sync('test/out/**/index.html');
      // assert
      expect(rendered).to.include('test/out/index.html');
      expect(rendered).to.include('test/out/page-1/index.html');
      expect(rendered).to.include('test/out/page-2/index.html');
      expect(rendered).to.include('test/out/posts/test-post-3/index.html');
      expect(rendered).to.include('test/out/posts/test-post-2/index.html');
      expect(rendered).to.include('test/out/posts/test-post-1/index.html');
    });
  });

  describe('generateCollectionData(docs, target_path, filterFn)', function () {
    it('should render the document collection data at target path.', function () {
      Stasis.resetDocumentID();
      // create collection
      var posts = Stasis.createCollection('test/src/posts/**/*.md', 'test/out/posts');
      // generate data json file
      Stasis.generateCollectionData(
        posts,
        'test/out/posts/data.json',
        function (doc) {
          return {
            title: doc.title,
            date: doc.date.mdy,
            tags: doc.tags,
            language: doc.language,
            path: doc.path.dir
          };
        }
      );
      // read it back
      var data = JSON.parse(fs.readFileSync('test/out/posts/data.json', 'utf8'));
      // assert
      expect(data[0]).to.have.property('path', 'test/out/posts/test-post-3');
      expect(data[1]).to.have.property('path', 'test/out/posts/test-post-2');
      expect(data[2]).to.have.property('path', 'test/out/posts/test-post-1');
    });
  });

});