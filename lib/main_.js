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
 * @version       0.0.5
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
    fmat      = require('front-matter'),
    mom       = require('moment'),
    marked    = require('marked'),
    hl        = require('highlight.js'),
    dust      = require('dustjs-linkedin'),
    dusthelp  = require('dustjs-helpers'),
    colour    = require('colour');

// colour -> colors
// lodash
// string.js
// inquirer  = require('inquirer')

// error reporting
// utility module

var $ = (function () {



})();



/**
 * feature vector exclusion dictionary
 */

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
  // additional words
  "has", "however", "more", "might", "by", "does", "such", "am", "other",
  "ones", "should", "than", "any", "must", "few", "them", "many",
  "r", ""
];


/**
 * module setup: colour, marked
 */

(function () {

  var colour_theme = {
    post: 'green',
    info: 'gray',
    warn: 'yellow',
    error: 'red'
  };

  var marked_lang = [
    'javascript', 'html', 'css', 'markdown', 'json',
    'bash', 'python', 'c++', 'c',
    'lisp', 'latex'
  ];

  colour.setTheme(colour_theme);
  marked.setOptions({
    highlight: function (code) {
      return hl.highlightAuto(code, marked_lang).value;
    },
    gfm: true
  });

})();


/**
 * Stasis Core
 */

var Core = (function () {

  // config and document id objects
  var CONFIG = null;
  var DOC_IDS = [];

  // internal: cleaning document ids
  function _cleanDocCache() {
    DOC_IDS = [];
  }

  // internal: generated document id, check duplicates
  function _generateDocId(filename) {
    // normalize
    filename = filename.slice(0, -3).toLowerCase();
    var doc_id = filename.replace(/[^a-zA-Z0-9- ]/g, '').replace(/ +/g, '-');
    // check DOC_IDS for duplicates
    if (DOC_IDS.indexOf(doc_id) > -1) {
      return null;
    } else {
      DOC_IDS.push(doc_id);
      return doc_id;
    }
  }

  // internal: document filter by option object (tag, date period)
  function _filterDoc(doc, options) {
    // options { startDate, endDate, tags }
    var flagDate = false,
        flagTag = false;
    // if options exist, check conditions
    if (options) {
      // check start and end date
      if (options.startDate || options.endDate) {
        if (options.startDate) {
          flagDate = mom(options.endDate).format('X') > doc.date.unix ? true : false;
        }
        if (options.endDate) {
          flagDate = doc.date.unix < mom(options.endDate).format('X') ? true : false;
        }
      }
      // if no dates, just pass
      else {
        flagDate = true;
      }
      // if doc.tags contains any option.tags, it passes
      if (options.tags) {
        for (var i = 0; i < options.tags.length; i++) {
          if (doc.tags.indexOf(options.tags[i]) > -1) {
            flagTag = true;
          }
        }
      }
      // if no tags, just pass
      else {
        flagTag = true;
      }
      // return flags
      return flagDate && flagTag;
    }
    // if options are undefined, just pass
    else {
      return true;
    }
  }

  // internal: calculated document feature vector (EXPERIMENTAL)
  function _calculateFeatureVector(rawtext) {
    // get rid of all the punctuation
    words = rawtext.toLowerCase().replace(/[^a-zA-Z ]/g, '').split(' ');
    // word count
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
    // cutout below 3
    for (var token in fvec) {
      if (fvec[token] < 3) {
        delete fvec[token];
      }
    }
    return fvec;
  }

  // internal: replace tokens into user-defined word
  function _replaceTokens(str, dict) {
    var newStr = str.slice(0);
    for (var key in dict) {
      newStr = newStr.replace(new RegExp(key, 'g'), dict[key]);
    }
    return newStr;
  }

  /**
   * calculates various path based on target file path and root
   * and returns 'path' property in doc, where 'path' is
   * {
   *   self: target html file path
   *   root: from self to www root
   *   assets: from self to site asset path
   *   permalink: document permalink (including site url)
   * }
   */
  function _getRenderPaths(doc, target_path) {
    // trim target_path: remove excessive '/'
    if (target_path[target_path.length-1] === '/') {
      target_path = target_path.slice(0, -1);
    }
    // get filename (!ext) from doc source path
    var filename = path.basename(doc.source, '.md');
    // create enclosing folder, unless filename is 'index'
    if (filename !== 'index') {
      target_path += '/' + filename;
    }
    // get relative path to www root path
    var root = path.relative(target_path, CONFIG.path.out);
    root += (root === '' ? '' : '/');
    return {
      self: target_path + '/index.html',
      root: root,
      assets: root + 'assets',
      permalink: CONFIG.siteinfo.url + '/' + target_path
    };
  }

  // TODO: add 'multiple candidate' feature
  // internal: get document location based on sitemap
  function _getDocLocation(doc) {
    var selfpath = doc.path.self;
    for (var loc in CONFIG.sitemap) {
      var dist = path.relative(CONFIG.path.out + '/' + loc, selfpath);
      // if dist starts with '..', that's not it.
      if (dist.indexOf('..') > -1) continue;
      // console.log(selfpath.info, '\t', sitemap[loc]);
      return CONFIG.sitemap[loc];
    }
  }

  function loadConfig(config_path) {
    try {
      // loading stasis.json config file
      CONFIG = JSON.parse(fs.readFileSync(config_path, 'utf8'));
      return true;
    } catch (error) {
      console.log(">>> FATAL: Check your Stasis config file.".error, error);
    }
  }

  function loadTemplates(template_path) {
    var templates = glob.sync(template_path + '/**/*.dust');
    for (var i = 0; i < templates.length; i++) {
      var name = path.basename(templates[i], '.dust');
      var tpl = dust.compile(fs.readFileSync(templates[i], 'utf8').toString(), name);
      dust.loadSource(tpl);
      console.log(' + template loaded:'.info, templates[i]);
    }
    // returns names of loaded templates
    return Object.keys(dust.cache);
  }

  function read(source_path) {
    var filename = path.basename(source_path),
        yaml = fmat(fs.readFileSync(source_path, 'utf8')),
        attr = yaml.attributes;
    // bypass draft
    if (attr.draft) {
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
      doc_id: _generateDocId(filename),
      source: source_path,
      language: (attr.language || 'en'),
      // calculate doc feature vector
      // fvec: _calculateFeatureVector(yaml.body)
    };
    console.log(' + document loaded:'.info, source_path);
    return doc;
  }

  function rake(glob_pattern, options) {
    var sources = glob.sync(glob_pattern),
        docs = [];
    for (var i = 0; i < sources.length; i++) {
      var doc = read(sources[i]);
      if (doc) {
        docs.push(doc);
      }
    }
    // reverse sort by date
    docs.sort(function (a, b) {
      if (a.date.unix > b.date.unix) return -1;
      else if (a.date.unix < b.date.unix) return 1;
      else return 0;
    });
    // returns document collection
    return docs;
  }

  function render(docs, target_path) {
    async.each(
      docs,
      function (doc, done) {
        // trim target_path: remove excessive '/'
        if (target_path[target_path.length-1] === '/') {
          target_path = target_path.slice(0, -1);
        }

        // get render path
        doc.path = _getRenderPaths(doc, target_path);
        // inject document location
        doc.location = _getDocLocation(doc);

        // create directory first, handle exception for index.md
        if (doc.doc_id !== 'index') {
          mkdirp.sync(target_path + '/' + doc.doc_id);
        }

        // and substitute keywords
        doc.body = _replaceTokens(doc.body, {
          '{@root}': doc.path.root,
          '{@assets}': doc.path.assets
        });

        // then render with template
        dust.render(doc.template, doc, function (err, out) {
          fs.writeFileSync(doc.path.self, out);
          console.log(
            ' + page generated:'.info,
            doc.path.self,
            ('(' + doc.location + ')').info
          );
          done();
        });
      },
      function (err) {
        // TODO
      }
    );
  }

  // NOTE: this should be executed after render()
  function renderIndex(docs, target_path, template_name, options) {
    // trim target_path: remove excessive '/'
    if (target_path[target_path.length-1] === '/') {
      target_path = target_path.slice(0, -1);
    }
    // to root
    var root = path.relative(target_path, CONFIG.path.out);
    root += (root === '' ? '' : '/');
    // list page data
    var page = {
      title: 'Blog',
      tags: [],
      listitems: [],
      path: {
        self: target_path + '/index.html',
        root: root,
        assets: root + 'assets',
        permalink: CONFIG.siteinfo.url + '/' + target_path
      }
    };
    // inject location
    page.location = _getDocLocation(page);

    // iterate document collection
    for (var i = 0; i < docs.length; i++) {
      var doc = docs[i];
      // if doc passes the filter, render it
      if (_filterDoc(doc, options)) {
        // collect tags
        for (var t = 0; t < doc.tags.length; t++) {
          if (page.tags.indexOf(doc.tags[t]) === -1) {
            page.tags.push(doc.tags[t]);
          }
        }
        // build listitems
        page.listitems.push({
          title: doc.title,
          date: doc.date.mdy,
          tags: doc.tags,
          language: doc.language,
          path: path.relative(target_path, doc.path.self)
          // summary: summary
        });
      }
    }
    // make directory if not exists
    mkdirp.sync(target_path);
    // render listdata @ target_path/index.html with list-template
    var list_template = (template_name || 'stasis_list_template');
    dust.render(list_template, page, function (err, html) {
      fs.writeFileSync(page.path.self, html);
      console.log(' + page generated:'.info, page.path.self);
    });

    // FEAT5: generate list data json file
    fs.writeFileSync(target_path + '/listdata.json', JSON.stringify(page));
    dust.render('blogindex-feat5', page, function (err, html) {
      fs.writeFileSync(target_path + '/index-f5.html', html);
      console.log(' + page generated:'.info, page.path.self);
    });
  }

  return {
    _cleanDocCache: _cleanDocCache,
    _generateDocId: _generateDocId,
    _filterDoc: _filterDoc,
    _calculateFeatureVector: _calculateFeatureVector,
    _calculateSimilarity: _calculateSimilarity,
    _replaceTokens: _replaceTokens,
    _getRenderPaths: _getRenderPaths,
    _getDocLocation: _getDocLocation,
    loadConfig: loadConfig,
    loadTemplates: loadTemplates,
    read: read,
    rake: rake,
    render: render,
    renderIndex: renderIndex,
  };

})();


/**
 * build process
 */

// function build() {
//   // reading documents
//   console.log(">>> Reading doucments...".post);
//   var pages = Core.rake(CONFIG.path.src + '/pages/*.md');
//   var posts = Core.rake(CONFIG.path.src + '/posts/**/*.md');
//   // loading templates
//   console.log(">>> Loading templates...".post);
//   Core.loadTemplates(CONFIG.path.templates);
//   // render pages, posts, blog index
//   console.log(">>> Rendering pages...".post);
//   Core.render(pages, CONFIG.path.out);
//   console.log(">>> Rendering blog posts and index...".post);
//   Core.render(posts, CONFIG.path.out + '/posts');
//   Core.renderIndex(posts, CONFIG.path.out + '/posts', 'blogindex');
// }

// build();


/**
 * export
 */

module.exports = Core;

// CONFIG: CONFIG,
// Core: Core,
// build: build