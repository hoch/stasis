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
 * Stasis Document Object
 *
 * {
 *   title:         // human readable title
 *   tags:          // tags
 *   date: {
 *     mdy:         // month, day, year
 *     ago:         // ~ ago
 *     unix:        // unix timestamp
 *   }
 *   body:          // markdown body -> HTML
 *   template:      // render template
 *   doc_id:        // document id
 *   language:      // language (en | ko)
 *   path: {
 *     source:      // document source path
 *     self:        // target path [render time]
 *     root:        // from self to root [render time]
 *     assets:      // self to assets [render time]
 *     permalink:   // permalink [render time]
 *   }
 *   location:      // doc location based on site map [render time]
 * }
 *
 */


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

  // setting up log feature
  var log_verbose = false;

  colors.setTheme({
    success: 'green',
    info: 'grey',
    warn: 'yellow',
    error: 'red'
  });

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


  // Public methods
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

    // filter document by options: tag
    filterDocument: function (doc, options) {

      // date period checking
      // if (options.startDate || options.endDate) {
      //   if (options.startDate) {
      //     flagDate = mom(options.endDate).format('X') > doc.date.unix ? true : false;
      //   }
      //   if (options.endDate) {
      //     flagDate = doc.date.unix < mom(options.endDate).format('X') ? true : false;
      //   }
      // }
      // // if no dates, just pass
      // else {
      //   flagDate = true;
      // }

      var flag = false;
      // check options
      if (options.tags) {
        options.tags.forEach(function (tag) {
          if (_.contains(doc.tags, tag)) {
            flag = true;
          }
        });
      }
      // pass true with no options specified
      else {
        flag = true;
      }
      // all else fails
      return flag;
    },

    // replace tokens into user-defined word
    replaceTokens: function (source_string, dict) {
      var result = source_string.slice(0);
      for (var key in dict) {
        result = result.replace(new RegExp(key, 'g'), dict[key]);
      }
      return result;
    }

  };

})();


/**
 * Stasis Core
 */

var Stasis = (function () {

  var CONFIG = null,
      DOC_ID = [],
      TEMPLATES = [],
      READY = false;

  /**
   * internal helpers
   */

  // build document from markdown file
  function _buildDocument(source_path) {
    var filename = path.basename(source_path, '.md'),
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
      doc_id: _getDocumentId(filename),
      source: source_path,
      language: (attr.language || 'en'),
      // calculate doc feature vector
      // fvec: _calculateFeatureVector(yaml.body)
    };
    Util.log(' + document loaded:'.info, source_path);
    return doc;
  }

  // get document id from filename (without extension)
  function _getDocumentId(filename) {
    var doc_id = filename.toLowerCase().replace(/[^a-z0-9- ]/g, '').replace(/ +/g, '-');
    if (_.contains(DOC_ID, doc_id)) {
      return null;
    } else {
      DOC_ID.push(doc_id);
      return doc_id;
    }
  }

  // get document location based on sitemap in CONFIG
  // TODO: add 'multiple candidate' feature
  function _getDocumentLocation(doc) {
    var self = doc.path.self;
    for (var loc in CONFIG.sitemap) {
      var dist = path.relative(CONFIG.path.out + '/' + loc, self);
      // if dist starts with '..', that's not it.
      if (dist.indexOf('..') > -1) continue;
      // console.log(selfpath.info, '\t', sitemap[loc]);
      return CONFIG.sitemap[loc];
    }
  }

  // calculates various path based on target file path and root
  // and returns 'path' property in doc
  function _resolvePath(doc, target_path) {
    // get filename
    var filename = path.basename(doc.source, '.md');
    // normlize target path
    target_path = path.normalize(target_path);
    // create enclosing folder (unless filename is 'index')
    if (filename !== 'index') {
      target_path += '/' + filename;
    }
    // get relative path to www root path
    var root = path.relative(target_path, CONFIG.path.out);
    // add trailing slash when target_path is root
    root += (root === '' ? '' : '/');
    return {
      self: target_path + '/index.html',
      root: root,
      assets: root + 'assets',
      permalink: CONFIG.siteinfo.url + '/' + target_path
    };
  }


  /**
   * Public Methods
   */

  return {

    _buildDocument: _buildDocument,
    _getDocumentId: _getDocumentId,
    _getDocumentLocation: _getDocumentLocation,
    _resolvePath: _resolvePath,

    // create collection of documents
    collectDocuments: function (glob_pattern) {
      var sources = glob.sync(glob_pattern),
          docs = [];
      for (var i = 0; i < sources.length; i++) {
        var doc = _buildDocument(sources[i]);
        if (doc) {
          docs.push(doc);
        }
      }

      // returns document collection
      return docs;
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

    // render document collection at target path
    // options: { tags, timeorder }
    renderDocuments: function (docs, target_path, options) {
      if (options.index === 'true') {
        // TODO: render index page for collection
      }
      // timeorder sort (recent top)
      if (options.order === 'recent top') {
        docs.sort(function (a, b) {
          if (a.date.unix > b.date.unix) return -1;
          else if (a.date.unix < b.date.unix) return 1;
          else return 0;
        });
      }
      // normalize path
      target_path = path.normalize(target_path);
      // async workflow
      async.each(
        docs,
        function (doc, done) {
          // get render path
          doc.path = _resolvePath(doc, target_path);
          // inject document location
          doc.location = _getDocumentLocation(doc);
          // and substitute keywords
          doc.body = Util.replaceTokens(doc.body, {
            '{@root}': doc.path.root,
            '{@assets}': doc.path.assets
          });
          // if doc passes filter (tag)
          if (Util.filterDocument(doc, options)) {
            // then render with template
            dust.render(doc.template, doc, function (err, out) {
              // create directory first, handle exception for index.md
              if (doc.doc_id !== 'index') {
                mkdirp.sync(path.dirname(doc.path.self));
              }
              fs.writeFileSync(doc.path.self, out);
              Util.log(
                ' + page generated:'.info,
                doc.path.self,
                ('(' + doc.location + ')').info
              );
              done();
            });
          } else {
            done();
          }
        },
        function (err) {
          // TODO
        }
      );
    },

    // NOTE: this will be deprecated in 0.0.6
    // Instead, building a landing page
    // renderIndex: function (docs, target_path, template_name, options) {
    //   // normalize path
    //   target_path = path.normalize(target_path);
    //   // aggregated document proxy
    //   var doc = {
    //     title: 'Blog',
    //     tags: [],
    //     listitems: [],
    //     source: target_path + '/index.md'
    //   };
    //   // process document: path, location, token substitution
    //   doc.path = _resolvePaths(doc, target_path);
    //   doc.location = _getDocumentLocation(doc);
    //   doc.body = _replaceTokens(doc.body, {
    //     '{@root}': doc.path.root,
    //     '{@assets}': doc.path.assets
    //   });
    //   // iterate document collection
    //   docs.foeEach(function (d) {
    //     if (_filterDocument(d, options)) {
    //       d.tags.forEach(function (tag) {

    //       })
    //     }
    //   });
    //   for (var i = 0; i < docs.length; i++) {
    //     var d = docs[i];
    //     // if doc passes the filter, render it
    //     if (_filterDocument(d, options)) {
    //       // collect tags

    //       for (var t = 0; t < d.tags.length; t++) {
    //         if (page.tags.indexOf(d.tags[t]) === -1) {
    //           page.tags.push(d.tags[t]);
    //         }
    //       }
    //       // build listitems
    //       page.listitems.push({
    //         title: d.title,
    //         date: d.date.mdy,
    //         tags: d.tags,
    //         language: d.language,
    //         path: path.relative(target_path, d.path.self)
    //         // summary: summary
    //       });
    //     }
    //   }
    //
    // FEAT5: generate list data json file
    // fs.writeFileSync(target_path + '/listdata.json', JSON.stringify(page));
    // dust.render('blogindex-feat5', page, function (err, html) {
    //   fs.writeFileSync(target_path + '/index-f5.html', html);
    //   console.log(' + page generated:'.info, page.path.self);
    // });
    //
    // },

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