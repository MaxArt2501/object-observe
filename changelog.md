## v0.1.1

2015-01-19

* Fixed bugs in `Object.unobserve`
* Fixed bugs in `notifier.performChange`
* Used `Map`s when available - *much* cleaner code!
* Added some code documentation

## v0.1.0

2015-01-18 - First preliminary version

* `Object.observe`, `Object.unobserve`
* `Object.getNotifier`, `Object.deliverChangeRecords`
* No support for `"reconfigure"` and `"setPrototype"` events
* No `Array.observe`/`unobserve` yet