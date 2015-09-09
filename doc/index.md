Object.observe polyfill
=======================

`Object.observe` polyfill based on EcmaScript 7 spec.

## Introduction

`Object.observe` is a very nice [EcmaScript 7 feature](http://arv.github.io/ecmascript-object-observe/) that has landed on Blink-based browsers (Chrome 36+, Opera 23+) in the [first part of 2014](http://www.html5rocks.com/en/tutorials/es7/observe/). [Node.js](https://nodejs.org/) delivers it too in version 0.11.x, and it's supported by [io.js](https://iojs.org/) since its first public release.

In short, it's one of the things web developers wish they had 10-15 years ago: it notifies the application of any change made to an object, like adding, deleting or updating a property, changing its descriptor and so on. It even supports custom events. Sweet!

The problem is that most browsers still don't support `Object.observe`. While technically it's *impossible* to perfectly replicate the feature's behaviour, something useful can be done keeping the same API.

After giving a look at other polyfills, like [jdarling's](https://github.com/jdarling/Object.observe) and [joelgriffith's](https://github.com/joelgriffith/object-observe-es5), and taking inspiration from them, I decided to write one myself trying to be more adherent to the specifications.

## Under the hood

Your intuition may have led you to think that this polyfill is based on polling the properties of the observed object. In other words, "dirty checking". If that's the case, well, you're correct: we have no better tools at the moment.

Even Gecko's [`Object.prototype.watch`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/watch) is probably not worth the effort. First of all, it just checks for updates to the value of a *single* property (or recreating the property after it's been deleted), which may save some work, but not much really. Furthermore, you can't watch a property with two different handlers, meaning that performing `watch` on the same property *replaces* the previous handler.

Regarding value changes, changing the property descriptors with `Object.defineProperty` has similar issues. Moreover, it makes everything slower - if not *much* slower - when it comes to accessing the property. It would also prevent a correct handling of the `"reconfigure"` event.

And of course, Internet Explorer's legacy [`propertychange` event](http://msdn.microsoft.com/en-us/library/ms536956%28VS.85%29.aspx) isn't very useful either, as it works only on DOM elements, it's not fired on property deletion, and... well, let's get rid of it already, shall we?

[Proxies](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy), currently implemented in Gecko-based browsers, is the closest thing we could get to `Object.observe`. And a *very* powerful thing too: it can trap property additions, changes, deletions, possession checks, or object changes in extensibility, prototype, and so on, even *before* they're made! Awesome! Sounds like the perfect tool, huh?

Too bad proxies are sort of *copies* of the original objects, with the behaviour defined by the script. Changes should be made to the *proxied* object, not the original one. In short, this doesn't trigger the proxy's trap:

```js
var object = { foo: null },
    proxy = new Proxy(object, {
        set: function(object, property, value, proxy) {
            console.log("Property '" + property + "' is set to: " + value);
        }
    });

object.foo = "bar";
// Nothing happens...
```

Instead, proxies are meant to *apply* the changes to the original object, after eventual computing made by the traps. This is the correct usage of a proxy:

```js
var object = { foo: null },
    proxy = new Proxy(object, {
        set: function(object, property, value, proxy) {
            object[property] = String(value).toUpperCase();
        }
    });

proxy.foo = "bar";
console.log(object.foo); // => "BAR"
```

So, yeah, dirty checking. It sounds lame, but now you know why I had to resolve to this.

The checks are performed using `requestAnimationFrame`, with a fallback to `setTimeout(..., 17)` when it's not available.

## Which version?

The polyfill comes in two flavours: a "full" and a "light" version. The "full" version aims to be 100% spec compliant, and fully supports all the native observable events. The "light" version, instead, only supports `"add"`, `"update"` and `"delete"`, and ditches most of the checks about properties, but it could be used in most cases where data binding is based on plain objects.

If you don't need to check for `"reconfigure"`, `"preventExtensions"` and `"setPrototype"` events, and you are confident that your observed objects don't have to do with accessor properties or changes in their descriptors, then go for the light version, which should perform reasonably better on older and/old slower environments.


## What's provided

### `Object.observe` and `Object.unobserve`

Well, I couldn't call this an `Object.observe` polyfill without these ones.

It "correctly" (considering the above limitations) supports the `"add"`, `"update"`, `"delete"`, `"preventExtensions"`, `"reconfigure"` and `"setPrototype"` events.

Type filtering works too when an array is passed as the third argument of `Object.observe`. Handlers don't get called if the change's type is not included in their list.

### `Object.getNotifier`

This function allows to create user defined notifications. And yes, it pretty much works, delivering the changes to the handlers that accept the given type.

Both the `notify` and `performChange` methods are supported.

### `Object.deliverChangeRecords`

This method allows to get deliver the notifications currently collected for the given handler *synchronously*. Yep, this is supposed to work too.

## node.js

The polyfill works just fine on Javascript environments like node.js (which doesn't support `Object.observe` up to version 0.10.x). Although the shim handles the thing on its own, the best way to load it is to check if `Object.observe` is actually supported to avoid loading an useless module:

```js
if (!Object.observe) require("object.observe");
```

Keep into consideration that this shim *hasn't been developed with node.js in mind*, so it doesn't make use of all the node.js goodies that could make this polyfill more efficient. They may be implemented in the future, but for now it works just fine. Node.js supports `Object.observe` since version 0.12.0, and the "beta" channel does since 0.11.13.

## Loading on a client

In a server side environment, as in node.js (see above), loading the polyfill as a module shouldn't bring any problems. On a client, on the other hand, it's common to pack all the module dependencies in a single file to minimize client requests. Whether using [Browserify](http://browserify.org/), [webpack](http://webpack.github.io/), R.js ([RequireJS](http://requirejs.org/)' packer) or any other tool for the task, developers should be aware that there's no way to reliably dynamically load the polyfill.

For example, using RequireJS, one would do something like:

```js
var dependencies = [ "jquery" ];
if (!Object.observe) dependencies.push("object-observe-lite.min");
define(dependencies, function($) {
    ...
});
```

But, over the fact that R.js' can't analyze a more complex loading pattern like this one, it simply con't perform a client side test on the server. So, the module is *always* packer in the final script. So, in the end, it's not even necessary to check the definition of `Object.observe`, since the polyfill does it on its own.

It's not even much of a problem, though: the polyfill is currently 2269 bytes minified and gzipped (and 1768 bytes for the "lite" version), so it's probably a bearable load for every client.

If your project does *not* pack the scripts in a single file (which may be fine for small projects or on HTTP2/SPDY connections, or in environments where loading times don't matter), this allows you to load the script only if necessary:

```html
<script>if (Object.observe) document.write('<script src="object-observe.js"></script>')</script>
```

Notice the absence of the `async` attribute, as you would probably load it before everything other script that uses `Object.observe`.

## To do

* code optimization and cleanup.

### `Array.observe`

The [spec](http://arv.github.io/ecmascript-object-observe/#Array.observe) only states that `Array.observe` is just like `Object.observe` with a fixed accept list of `["add", "update", "delete", "splice"]`, and `Array.unobserve` is equivalent to `Object.unobserve`. The `"splice"` event is especially tricky to deal with, but a polyfill for `Array.observe` that wraps the native array methods is available [here](https://github.com/MaxArt2501/array-observe), along with a documentation that explains the problem around the polyfill.

## Tests

Tests are performed using [mocha](http://mochajs.org/) and assertions are made using [expect](https://github.com/Automattic/expect.js), which are set as development dependencies. Assuming the you're located in the project's root directory, if you want to run the tests after installing the package, just do

```bash
cd node_modules/object.observe
npm install
```

Then you can execute `npm run test` or, if you have mocha installed globally, just `mocha` from the package's root directory.

For client side testing, just open [index.html](../test/index.html) in your browser of choice.
