Object.observe polyfill
=======================

`Object.observe` is a very nice [EcmaScript 7 feature](http://arv.github.io/ecmascript-object-observe/) that has landed on Blink-based browsers (Chrome 36+, Opera 23+) in the [first part of 2014](http://www.html5rocks.com/en/tutorials/es7/observe/). [Node.js](https://nodejs.org/) delivers it too in version 0.11.x, and it's supported by [io.js](https://iojs.org/) since its first public release.

In short, it's one of the things web developers wish they had 10-15 years ago: it notifies the application of any changes made to an object, like adding, deleting or updating a property, changing its descriptor and so on. It even supports custom events. Sweet!

The problem is that most browsers still doesn't support `Object.observe`. While technically it's *impossible* to perfectly replicate the feature's behaviour, something useful can be done keeping the same API.

After giving a look at other polyfills, like [jdarling's](https://github.com/jdarling/Object.observe) and [joelgriffith's](https://github.com/joelgriffith/object-observe-es5), and taking inspiration from them, I decided to write one myself trying to be more adherent to the specifications.

## Which version?

The polyfill comes in two flavours: a "full" and a "light" version. The "full" version aims to be 100% spec compliant, and fully supports all the native observable events. The "light" version, instead, only supports `"add"`, `"update"` and `"delete"`, and ditches most of the checks about properties, but it could be used in most cases where data binding is based on plain objects.

If you don't need to check for `"reconfigure"`, `"preventExtensions"` and `"setPrototype"` events, and you are confident that your observed objects don't have to do with accessor properties or changes in their descriptors, then go for the light version, which should perform reasonably better on older and/old slower environments.

## Installation

This polyfill extends the native `Object` and doesn't have any dependencies, so loading it is pretty straightforward:

```html
<script src="object-observe.js"></script>
```

Or in node.js:

```js
require("object-observe.js");
```

That's it. If the environment doesn't already support `Object.observe`, the shim is installed and ready to use.

If you only need the "light" version of the polyfill, replace `object-observe.js` with `object-observe-lite.js`. You can also use the minified versions of the same files (replacing `.js` with `.min.js`).

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

## Limitations and caveats

* Because properties are polled, when more than one change is made synchronously to the same property, it won't get caught. This means that this won't notify any event:

  ```js
  var object = { foo: null };
  Object.observe(object, function(changes) {
      console.log("Changes: ", changes);
  });
  
  object.foo = "bar";
  object.foo = null;
  ```
  
  `Object.prototype.watch` could help in this case, but it would be a partial solution.

* Property changes may not be reported in the correct order. The polyfill performs the checks - and issues the notifications - in this order:

  1. `"add"` and `"update"`, or `"reconfigure"`
  2. `"delete"` or `"reconfigure"`
  3. `"preventExtensions"`
  4. `"setPrototype"`
  
  This means that the `"add"` change is listed *before* the `"delete"` in the following snippet:
  
  ```js
  var obj = { foo: "bar" };
  Object.observe(foo, ...);
  delete obj.foo;
  obj.bar = "foo";
  ```
  
  Due to the nature of the shim, there's nothing that can be done about it.

* When a property is created using `Object.defineProperty` and set to not enumerable, it's basically invisible to the polyfill:

  ```js
  Object.defineProperty(object, "bar", {
      value: "hello", enumerable: false, writable: true
  });
  // Nothing happens
  
  object.bar = "hi";
  // Still nothing...
  ```
  
  Also, if the `enumerable` descriptor property is subsequently set to `true`, it will trigger an `"add"` event.
  
  There's no way to prevent this limitation.

* It doesn't work correctly on DOM nodes or other *host* objects. Nodes have a lot of enumerable properties that `Object.observe` should *not* check.

* **Possible memory leaks**: remember to `unobserve` the objects you want to be garbage collected. This can be avoided with native implementations of `Object.observe`, but due to the fact that in this polyfill observed objects are held in internal [maps](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map), they can't be GC'ed until they're unobserved. ([`WeakMap`s](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap) could solve this particular issue, but of course they're not for every environment - a shim for `Map` is used when not supported - and it's also not possible to iterate through their entries.)

* Dirty checking can be intensive. Memory occupation can grow to undesirable levels, not to mention CPU load. Pay attention to the number of objects your application needs to observe, and consider whether a polyfill is actually good for you.

## What's provided

### `Object.observe` and `Object.unobserve`

Well, I couldn't call this an `Object.observe` polyfill without these ones.

It "correctly" (considering the above limitations) supports the `"add"`, `"update"`, `"delete"`, `"preventExtensions"`, `"reconfigure"` and `"setPrototype"`.

Type filtering works too when an array is passed as the third argument of `Object.observe`. Handlers don't get called if the change's type is not included in their list.

### `Object.getNotifier`

This function allows to create user defined notifications. And yes, it pretty much works, delivering the changes to the handlers that accept the given type.

Both the `notify` and `performChange` methods are supported.

### `Object.deliverChangeRecords`

This method allows to get deliver the notifications currently collected for the given handler *synchronously*. Yep, this is supposed to work too.

## Browser support

This polyfill has been tested (and is working) in the following environments:

* Firefox 35 stable and 37 Developer Edition
* Internet Explorer 11
* Internet Explorer 5, 7, 8, 9, 10 (as IE11 in emulation mode)
* node.js 0.10.33

## To do

* Some deeper considerations about whether using `Object.prototype.watch` or not;
* support for DOM nodes;
* code tests, documentation, optimization and cleanup.

### `Array.observe`

The [spec](http://arv.github.io/ecmascript-object-observe/#Array.observe) only states that `Array.observe` is just like `Object.observe` with a fixed accept list of `["add", "update", "delete", "splice"]`, and `Array.unobserve` is equivalent to `Object.unobserve`. That's fine, but where does that `"splice"` event come from?

It's actually triggered by any operation on the array that *may* change the length of the array itself, like `push()` or `splice()`. These operations internally call `notifier.performChange("splice", ...)`, so one solution would be wrapping these methods in `Array.prototype` - or maybe better in the observed array itself - in a `performChange` call. Unfortunately, besides the obvious performance hit, a `"splice"` notification is triggered by this operation too:

```js
var fibonacci = [ 0, 1, 1, 2, 3 ];
Array.observe(fibonacci, ...);
fibonacci[5] = 5;
```

There's no way to trap this, and forcing developers to only use `Array.prototype` methods leaves me unsure. So, still have to figure out what to do.

## License

The MIT License (MIT)

Copyright (c) 2015 Massimo Artizzu (MaxArt2501)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
