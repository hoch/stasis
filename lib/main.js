/**
 *           __                .__
 *   _______/  |______    _____|__| ______
 *  /  ___/\   __\__  \  /  ___/  |/  ___/
 *  \___ \  |  |  / __ \_\___ \|  |\___ \
 * /____  > |__| (____  /____  >__/____  >
 *      \/            \/     \/        \/
 *
 * @description   Opiniated static site generator for node.js
 *                https://github.com/hoch/stasis
 * @author        hoch (hongchan.choi@gmail.com)
 * @license       MIT
 */


/**
 * dependencies
 */

var async     = require('async'),
    fs        = require('fs'),
    glob      = require('glob'),
    path      = require('path'),
    mkdirp    = require('mkdirp'),
    _         = require('lodash'),
    S         = require('string'),
    fmat      = require('front-matter'),
    mom       = require('moment'),
    marked    = require('marked'),
    hl        = require('highlight.js'),
    dust      = require('dustjs-linkedin'),
    dusth     = require('dustjs-helpers'),
    inq       = require('inquirer'),
    colors    = require('colors');


/**
 * initialization and utilities
 */

var Util = (function () {

  // initializing marked module
  var lang = [
    'javascript', 'html', 'markdown', 'json', 'css',
    'bash', 'python', 'c++', 'c',
    'lisp', 'latex'
  ];

  marked.setOptions({
    highlight: function (code) {
      return hl.highlightAuto(code, lang).value;
    },
    gfm: true
  });

  // log theme
  colors.setTheme({
    success: 'green',
    info: 'grey',
    warn: 'yellow',
    error: 'red'
  });

  // setting up log feature
  var log_verbose = false;

  // feature vector: ignore words
  var FVEC_DICT = [
    "a", "about", "all", "and", "are", "as", "at", "back", "be", "because",
    "been", "but", "can", "come", "could", "did", "didnt", "do",
    "don't", "for", "from", "get", "go", "going", "good", "got", "had",
    "have", "he", "her", "here", "he's", "hey", "him", "his", "how", "i",
    "if", "in", "ill", "im", "is", "it", "just", "know", "like",
    "look", "me", "mean", "most", "my", "no", "not", "now", "of", "oh", "ok",
    "okay", "on", "one", "or", "out", "really", "right", "say", "see", "she",
    "so", "some", "something", "tell", "that", "thats", "the", "then", "there",
    "they", "think", "this", "time", "to", "up", "want", "was", "we",
    "well", "were", "what", "when", "who", "why", "will", "with", "would",
    "yeah", "yes", "you", "your", "youre",
    "has", "however", "more", "might", "by", "does", "such", "am", "other",
    "ones", "should", "than", "any", "must", "few", "them", "many",
    "r", ""
  ];


  /**
   * Public Methods
   */
  return {

    /**
     * logging
     */

    setVerbose: function (bool) {
      log_verbose = bool;
    },

    log: function () {
      if (log_verbose) {
        console.log.apply(console, arguments);
      }
    },


    /**
     * core utilities
     */

    // calculate feature vector from string
    // FVEC_DICT contains common words to ignore from features
    calculateFeature: function (source_string) {
      // get rid of all the punctuation
      words = source_string.toLowerCase().replace(/[^a-z ]/g, '').split(' ');
      // feature vector (word count)
      var fvec = {};
      for (var i = 0; i < words.length; i++) {
        // remove common words
        if (FVEC_DICT.indexOf(words[i]) < 0) {
          if (fvec.hasOwnProperty(words[i])) {
            fvec[words[i]] += 1;
          } else {
            fvec[words[i]] = 1;
          }
        }
      }
      // delete token appeared less than 2 times
      for (var token in fvec) {
        if (fvec[token] < 2) {
          delete fvec[token];
        }
      }
      return fvec;
    },

    checkDate: function (doc, startDate, endDate) {
      var flag = false;
      // check start date (required)
      flag = mom(startDate).format('X') < doc.date.unix ? true : false;
      // check end date (if specified)
      if (endDate) {
        flag = doc.date.unix < mom(endDate).format('X') ? true : false;
      }
      return flag;
    },

    checkTags: function (doc, tags) {
      var flag = false;
      tags.forEach(function (tag) {
        if (_.contains(doc.tags, tag)) {
          flag = true;
        }
      });
      return flag;
    },

    // sortCollection: function (docs) {
    //   docs.sort(function (a, b) {
    //     if (a.date.unix > b.date.unix) return -1;
    //     else if (a.date.unix < b.date.unix) return 1;
    //     else return 0;
    //   });
    // },

    extractTags: function (str) {
      var stripped = str.replace(/[^a-zA-Z0-9# ]/g, '').split('#'),
          extracted = [];
      for (var i = 0; i < stripped.length; i++) {
        if (stripped[i].length >= 1) {
          extracted.push(stripped[i].toLowerCase().trim());
        }
      }
      return extracted;
    },

    // replace tokens into user-defined word
    replaceTokens: function (source_string, dict) {
      var result = source_string.slice(0);
      for (var key in dict) {
        result = result.replace(new RegExp(key, 'g'), dict[key]);
      }
      return result;
    },

    // render a document (async)
    renderDocument: function (doc, done) {
      Util.log(' + rendering:'.info, doc.path.self);
      dust.render(doc.template, doc, function (err, html) {
        // create directory first, handle exception for index.md
        if (doc.id !== 'index') {
          mkdirp.sync(doc.path.dir);
        }
        fs.writeFileSync(doc.path.self, html);
        done();
      });
    }

  };

})();


/**
 * Stasis Core
 */

var Stasis = (function () {

  // singleton storage
  var CONFIG = null,
      DOC_ID = [],
      TEMPLATES = [],
      READY = false;

  // prompts for new content
  var questions = [
    {
      type: 'input',
      name: 'title',
      message: 'Title : ',
      validate: _validateNewContent
    },
    {
      type: 'input',
      name: 'tags',
      message: 'Tags : '
    },
    {
      type: 'input',
      name: 'type',
      message: 'Template Name :',
    }
  ];

  /**
   * internal helpers
   */

  // build document from markdown file
  function _buildDocument(source_path, target_path) {
    Util.log(' + building:'.info, source_path);
    // loading source
    var filename = path.basename(source_path, '.md'),
        yaml = fmat(fs.readFileSync(source_path, 'utf8')),
        attr = yaml.attributes,
        doc_id = _getDocumentId(filename);
    // if this is draft or duplicate id, stop here
    if (attr.draft || doc_id === null) {
      return null;
    }
    // return arranged meta data and body
    var doc = {
      title: attr.title,
      tags: attr.tags,
      date: {
        mdy: mom(attr.date).format('MM.DD.YYYY'),
        ago: mom(attr.date).fromNow(),
        unix: mom(attr.date).format('X')
      },
      body: marked(yaml.body),
      template: attr.template,
      id: doc_id,
      language: (attr.language || 'en'),
      fvec: Util.calculateFeature(yaml.body)
    };
    // post processing
    doc.path = _resolvePath(source_path, target_path);
    doc.location = _getDocumentLocation(doc);
    doc.body = Util.replaceTokens(doc.body, {
      '{@root}': doc.path.root,
      '{@assets}': doc.path.root + '/assets',
    });
    return doc;
  }

  // create new content based on query
  function _createNewContent(answers) {
    // get template type and filename
    var type = (answers.type === 'Blog Post') ? 'post' : 'page',
        filename = _getFilename(answers.title),
        filepath = CONFIG.path.src + '/drafts';
    // generate a content header with answers
    var content =
      '---\n' +
      'title: ' + answers.title + '\n' +
      'date: ' + mom().format('YYYY-MM-DD HH:MM') + '\n' +
      'tags: ' + JSON.stringify(Util.extractTags(answers.tags)) + '\n' +
      'template: ' + type + '\n' +
      'draft: true\n' +
      '---\n\n';
    // create filepath (src/draft)
    mkdirp.sync(filepath);
    // async file creation
    fs.writeFileSync(filepath + '/' + filename, content);
    // logged out
    Util.log('>> New content created at: '.success, filepath + '/' + filename);
    return content;
  }

  // get document id from filename (without extension)
  function _getDocumentId(filename) {
    var id = filename.toLowerCase().replace(/[^a-z0-9- ]/g, '').replace(/ +/g, '-');
    if (_.contains(DOC_ID, id)) {
      return null;
    } else {
      DOC_ID.push(id);
      return id;
    }
  }

  // get normailized filename from document title
  function _getFilename(title) {
    return title.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/ +/g, '-') + '.md';
  }

  // get document location based on sitemap in CONFIG
  // TODO: add 'multiple candidate' feature
  function _getDocumentLocation(doc) {
    for (var location in CONFIG.sitemap) {
      var distance = path.relative(CONFIG.path.out + '/' + location, doc.path.self);
      // if dist starts with '..', that's not it.
      if (distance.indexOf('..') > -1) continue;
      return CONFIG.sitemap[location];
    }
    // if all else fails...
    return null;
  }

  // calculates various path based on target and source path
  // and returns 'path' onbject
  function _resolvePath(source_path, target_path) {
    // get filename
    var filename = path.basename(source_path, '.md');
    // create enclosing folder (unless filename is 'index')
    if (filename !== 'index') {
      target_path += '/' + filename;
    }
    // clean up target path
    target_path = path.normalize(target_path);
    // get relative path to www root path
    var root = path.relative(target_path, CONFIG.path.out);
    // add trailing slash when target_path is root
    root += (root === '' ? '' : '/');
    root = path.normalize(root);
    root = root === '.' ? '' : root;
    return {
      source: source_path,
      self: target_path + '/index.html',
      dir: target_path,
      root: root,
      permalink: CONFIG.siteinfo.url + '/' + target_path
    };
  }

  // check possible conflct with existing source contents
  function _validateNewContent(title) {
    var filename = _getFilename(title);
    var files = glob.sync(CONFIG.path.src + '/**/*.md');
    for (var i = 0; i < files.length; i++) {
      if (filename === path.basename(files[i])) {
        return false;
      }
    }
    return true;
  }




  /**
   * Public Methods
   */

  return {

    _buildDocument: _buildDocument,
    _createNewContent: _createNewContent,
    _getDocumentId: _getDocumentId,
    _getDocumentLocation: _getDocumentLocation,
    _resolvePath: _resolvePath,
    _validateNewContent: _validateNewContent,

    createCollection: function (glob_pattern, target_path) {
      var sources = glob.sync(glob_pattern),
          docs = [];
      for (var i = 0; i < sources.length; i++) {
        var doc = _buildDocument(sources[i], target_path);
        if (doc) {
          docs.push(doc);
        }
      }
      // returns document collection
      return docs;
    },

    startNewContentDialog: function () {
      Util.log(">> Creating a source content...".success);
      inq.prompt(questions, _createNewContent);
    },

    // initialize stasis: loading config, templates
    initialize: function (config_path) {
      // loading config
      try {
        CONFIG = JSON.parse(fs.readFileSync(config_path, 'utf8'));
      } catch (error) {
        Util.log(">> FATAL: Check your config file.".error, error);
      }
      // loading templates
      try {
        var templates = glob.sync(CONFIG.path.templates + '/**/*.dust');
        for (var i = 0; i < templates.length; i++) {
          var name = path.basename(templates[i], '.dust');
          var tpl = dust.compile(fs.readFileSync(templates[i], 'utf8').toString(), name);
          dust.loadSource(tpl);
          Util.log(' + template loaded:'.info, templates[i]);
        }
        // names of loaded templates
        TEMPLATES = Object.keys(dust.cache);
        READY = true;
      } catch (error) {
        Util.log(">> FATAL: Template loading failed.".error, error);
      }
      return READY;
    },

    // render collection to each doc's target path
    renderCollection: function (docs) {
      // async workflow
      async.each(
        docs,
        Util.renderDocument,
        function (error) {
          Util.log(">> FATAL: Rendering page failed.".error, error);
        }
      );
    },

    // generate JSON data file from collection (via filter)
    // NOTE: target_path should include filename
    // NOTE2: this can only be called after rendering
    generateCollectionData: function (docs, target_path, filterFn) {
      var data = [];
      for (var i = 0; i < docs.length; i++) {
        var item = filterFn(docs[i]);
        if (item) {
          data.push(item);
        }
      }
      fs.writeFileSync(target_path, JSON.stringify(data));
    },

    resetDocumentID: function () {
      DOC_ID = [];
      Util.log('>> Document ID reset.'.warn);
    }

  };

})();


/**
 * export
 */

Stasis.Util = Util;
module.exports = Stasis;