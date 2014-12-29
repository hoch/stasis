# Stasis

<img src="https://travis-ci.org/hoch/stasis.svg?branch=master" />

#### **Opinionated, light-weight static site generator for Node.js**

__Stasis__ is a super simple and lightweight static site generator written in Node.js. The project simply started to minimize _manual labor_ on my own web site. I am aware that there is an army of static site generators for Node and some of them are useful and efficient, but none of them really worked for me.

__Stasis__ is a part of a boilerplate that I created, which is a collection of essential elements for mobile/responsive web development. With this combination of __Stasis__ and its boilerplate, you can have:

- Markdown/YAML front-matter Page Authoring
- [Foundation 5](http://foundation.zurb.com/)
- [SASS](http://sass-lang.com/) with [node-sass](https://github.com/sass/node-sass)
- [Dust.js](http://linkedin.github.io/dustjs/) templating
- [Polymer](http://www.polymer-project.org/) elements

I simply put the best things in the web world into create __Stasis__ and the boilerplate. _(This is why I refer this project as opinionated.)_ [So far it has been good enough for me.](http://hoch.io) So I thought I would share!


### Prerequisites

- GNU Make and Git
- Node.js, Bower and Grunt

On OS X and Linux systems, GNU Make and Git should be already installed. To install [Node.js](http://nodejs.org/), [Bower](http://bower.io/) and [Grunt](http://gruntjs.com/), visit the project pages.


### Installation

3 commands to get up and running. The last `make` command will install all npm and Bower dependencies.

~~~bash
git clone http://www.github.com/hoch/stasis-bp MY_WEB_SITE
cd MY_WEB_SITE
make
~~~


### Usage

The boilerplate uses Grunt for copying files, CSS compilation and publishing. __Stasis__ only deals with parsing and generating HTML documents. It allows you to modify the work-flow without learning new things. Just stick with your Grunt skill.

Note that Grunt commands are a part of the boilerplate, not Stasis engine itself. Use the following command in the directory created above.

~~~bash
cd MY_WEB_SITE
grunt                  # default: build site 
grunt new              # create content template with interactive options
grunt serve            # starts preview server at localhost:8000 and watch
grunt publish          # publishes generated site to specified host
~~~


### Directory Structure: Source and Output

The below tree graph shows how the source documents are translated into the output. The rules are super-simple; there is no complex routing system. `pages` are for static pages and `posts` are for blog posts.

        $SRC                            $OUT
        |                               |
        +- pages/                       |
        |   |                           |    
        |   +- index.md                 +- index.html
        |   +- page-1.md                +- page-1/index.html
        |   +- page-2.md                +- page-2/index.html
        |                               |
        +- posts/                       +- posts/
        |   +- 2013/                        |
        |   |   |                           |
        |   |   +- hello-world.md           +- hello-world/index.html
        |   |                               |
        |   +- 2014/                        |
        |   |   |                           |
        |   |   +- welcome-stasis.md        +- welcome-stasis/index.html
        |   |                               |
        |   +- ...                          +- ...
        |
        +- templates/
            |
            +- ...


### Markdown/YAML Front-Matter Source

__Stasis__ uses Markdown and YAML front-matter format as source document. Internally, __Stasis__ uses [Marked](https://github.com/chjj/marked) for Markdown translating and [Highlight.js](http://highlightjs.org/) for code syntax highlighting.

~~~markdown
---
title: "Markdown is easy."
date: 2014-06-01 00:00
tags: ["thoughts", "research"]
template: "post"
language: "en"
draft: true
---

Your text goes here.

~~~


### Document Object

This is how __Stasis__ engine builds a document object from a source document. All the data field (properties) can be freely used in the template.

    {
        id: "hello-world",                  // document id
        language: "ko",                     // language: [en, ko]
        location: "intro",                  // doc location based on site map
        template: "fancy_template",         // rendering template name
        title: "Hello World!",              // human readable title
        tags: ["tag1", "tag2"],             // tags
        date: {
            mdy: "06.26.1976",              // month, day, year
            ago: "38 years ago",            // ~ ago
            unix: "204595200",              // unix timestamp
        },
        body: "<p>Body Text</p>",           // HTML converted body text
        path: {
            source: "src/pages/hello.md",   // document source path
            self: "out/hello/index.html",   // target path
            dir: "out/hello",               // target dir
            root: "../../",                 // from self to root
            permalink: "//yo.com/hello"       // permalink
        }
    }


## License and Contact

MIT License. Copyright (c) 2014 [Hongchan Choi](https://ccrma.stanford.edu/~hongchan)


## Change Log

(0.0.12)
- Dependencies updated to the latest version.
- Boilerplate updated.

(0.0.10), (0.0.11)
- Dustjs conflict solved.

(0.0.9)
- Interactive prompts for content creation added.

(0.0.8)
- NPM packages pruned.
- Boilerplate updated.

(0.0.7)
- Fixed `@root` keyword substitution.
- More details added to README

(0.0.6) 
- Boilerplate released.

(0.0.3) 
- Initial commit.