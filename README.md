# Stasis

<img src="https://travis-ci.org/hoch/stasis.svg?branch=master" />

**Opinionated, light-weight static site generator for Node.js**

__Stasis__ is a super simple and lightweight static site generator written in Node.js. The project simply started to minimize _manual labor_ on my own web site. I am aware that there is an army of static site generators for Node and some of them are useful and efficient, but none of them really worked for me.

__Stasis__ is a part of a boilerplate that I created, which is a collection of essential elements for mobile/responsive web development. With this combination of __Stasis__ and its boilerplate, you can have:

- Markdown/YAML front-matter Page Authoring
- [Foundation 5](http://foundation.zurb.com/)
- [SASS](http://sass-lang.com/) with [node-sass](https://github.com/sass/node-sass)
- [Dust.js](http://linkedin.github.io/dustjs/) templating
- [Polymer](http://www.polymer-project.org/) elements

I simply put the best things in the web world into create __Stasis__ and the boilerplate. So far it has been good enough for me. So I thought I would share!


### Prerequisites
- GNU Make
- Git
- Node.js and Bower


### Installation
    > git clone http://www.github.com/hoch/stasis-bp MY_WEB_SITE
    > cd my_web_site
    > make


### Usage
    > grunt                  # default: build site 
    > grunt new              # create article template with interactive options
    > grunt preview          # starts preview server at localhost:8080
    > grunt publish          # publishes generated site to specified host


### Directory Structure: Source and Output
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


### Document Object
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

## License

MIT License. Copyright (c) 2014 Hongchan Choi