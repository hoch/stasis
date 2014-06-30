# Stasis

<img src="https://travis-ci.org/hoch/stasis.svg?branch=master" />

Light-weight and simple static site generator for Node

**NOTE** This is work-in-progress! Use at your own risk!

__Stasis__ is a very simple and lightweight static site generator written in Node.js. The project simply started to minimize _manual labor_ on my own web site. I am aware that there is an army of static site generators for Node and some of them are useful and efficient, but none of them really worked for me. __Stasis__ offers features like:

- A very simple workflow: Markdown-in/HTML-out
- Built-in support of Foundation framework for mobile-first blogging
- Built-in SASS support: node-sass(libsass)
- Built-in Dust.js template support
- Dependency management: npm/Bower
- Task management: Grunt

So far it has been good enough for me. So I thought I would share!


## Usage

### Installation
    $> npm install -g stasis    # install stasis

### Creating a new project
    $> mkdir newSite
    $> stasis init newSite      # create project scaffolding

### Development
    $> cd newSite
    $> stasis new_page $TITLE   # create a new page in /pages with filename
    $> stasis new_post $TITLE   # create a new blog post with filename
    $> grunt dev                # watch project folder, build and liveReload

### Build and Publish
    $> grunt                    # build site
    $> grunt publish            # build and publish to via gh-pages or rsync

### Creating a page
To create an HTML page, simply create a markdown file (`.md`) in `/src/pages` directory. Note that `index.md` is reserved for `index.html`, which is a default landing page for the site. Other than that, Stage translates the markdown files as below:

    /src/pages/index.md           -> /out/index.html
    /src/pages/my-awesome-page.md -> /out/my-awesome-page/index.html

Note that a page will be created as `index.html` under the path which has the name of markdown file. In other words, Stage will create a permalink for every page you write and the page will be accesible by `http://your-site.com/my-awesome-page`.

### Creating a blog post
Creating a blog post is almost same with creating a page. You create a markdown file in `/src/posts` directory. See the following examples:

    /src/posts/2012/my-post.md      -> /out/posts/my-post/index.html
    /src/posts/2013/second-post.md  -> /out/posts/second-post/index.html

Note that stage looks for every markdown file under `/src/posts`. You can organize source posts as you want. Also you can see every page created will have a permlink.

### Writing a source markdown file
Stage translates a markdown file with YAML front-matter into a JS object, then it push the object data into an HTML document through Dust.js template engine. Note that Stage uses [marked](https://github.com/chjj/marked) markdown parser supporing _code syntax highlight_ and _GitHub flavored markdown_.

You can use the following front-matter key-values:
- `title`: document title
- `date`: YYYY-MM-DD HH:MM
- `tags`: document tags
- `template`: Dust template name
- `language`(optional): __en__ or __ko__ 

Stage also provides some custom tokens in the markdown source file that can be translated in the final HTML document.
- `{@root}`: relative path to `/out` from an HTML page
- `{@assets}`: relative path to `/out/assets` from an HTML page

```html
<img src="{@assets}/my-image.png" width="50%">
```

The HTML snippet above will display an image file from `/out/assets`, which is duplicated from `/src/assets`.


## Directory Structure

        .
        |
        +- bower_components         # filled by bower
        +- node_modules             # filled by npm
        +- out                      # generated output (FIXED)
        +- src                      # site source (FIXED)
        |   |
        |   +- assets               # images, media and etc
        |   +- pages                # static page sources
        |   +- posts                # blog post sources
        |       |
        |       +- 'YEAR'           # post sources in 'YEAR'
        |       +- ......           # post sources in another year
        +- template                 # Dust.js template files (FIXED)
        |   |
        |   +- partials             # partial templates
        |   +- scss                 # SASS files for site
        +- bower.json               # bower (REQUIRED)
        +- stasis.json              # stasis config file (REQUIRED)
        +- Gruntfile.js             # Grunt (REQUIRED)
        +- package.json             # npm (REQUIRED)
        +- README.md

