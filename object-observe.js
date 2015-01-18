Object.observe || (function(O, A, root) {
	"use strict";

	var isNode = root.Node ? function(node) {
			return node && node instanceof root.Node;
		} : function(node) {
			// Duck typing
			return node && typeof node === "object"
					&& typeof node.nodeType === "number"
					&& typeof node.nodeName === "string";
		},
		isArray = A.isArray || (function(toString) {
			return function (object) { return toString.call(object) === "[object Array]"; };
		})(O.prototype.toString),

		// The correct method to check would be getOwnPropertyDescriptor, but
		// it's supported by IE8 but for DOM elements only. Useless.
		isAccessor = O.freeze ? function(object, prop) {
			var desc = O.getOwnPropertyDescriptor(object, prop);
			return desc ? "get" in desc || "set" in desc : false;
		} : function() { return false; },

		inArray = A.prototype.indexOf ? function(pivot, array, start) {
			return array.indexOf(pivot, start);
		} : function(pivot, array, start) {
			for (var i = start || 0; i < array.length; i++)
				if (array[i] === pivot)
					return i;
			return -1;
		},

		getKeys = Object.keys || function(obj) {
			// Misses checks on obj, don't use as a replacement of Object.keys
			var keys = [], prop;
			for (prop in obj)
				if (obj.hasOwnProperty(prop))
					keys.push(prop);
			return keys;
		},

		// This can be used as an exact polyfill of Object.is
		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
		areSame = O.is || function(x, y) {
			if (x === y)
				return x !== 0 || 1/x === 1/y;
			return x !== x && y !== y;
		},

		observed = [],
		objectData = [],

		callbacks = [],
		callbackData = [],

		defaultObjectAccepts = [ "add", "update", "delete", "reconfigure", "setPrototype", "preventExtensions" ],
		defaultArrayAccepts = [ "add", "update", "delete", "splice" ],

		doObserve = function(object, handler, acceptList) {

			var idx = inArray(object, observed),
				data, cbdata, cbidx;

			if (!isArray(acceptList))
				acceptList = isArray(object) ? defaultArrayAccepts : defaultObjectAccepts;

			if (idx === -1) {
				observed.push(object) - 1;
				addCallback(handler, acceptList, object);
				data = {
					handlers: [ handler ],
					frozen: O.isFrozen ? O.isFrozen(object) : false,
					extensible: O.isExtensible ? O.isExtensible(object) : true
				};
				objectData.push(data);
				retrieveNotifier(object, data);

				collectProperties(object, data);
				setTimeout(function worker() {
					// If this happens, the object has been unobserved
					if (inArray(object, observed) === -1) return;

					performPropertyChecks(object, data);
					broadcastChangeRecords(object, data);

					if (!data.frozen)
						setTimeout(worker, 17);
				}, 17);
			} else {
				data = objectData[idx];
				addCallback(handler, acceptList, object);
				if (inArray(handler, data.handlers) === -1)
					data.handlers.push(handler);
			}
		},

		collectProperties = function(object, data) {
			data.properties = isNode(object) ? [] : getKeys(object);
			updateValues(object, data);
		},

		updateValues = function(object, data) {
			var props = data.properties,
				values = data.values = [],
				i = 0;
			while (i < props.length)
				values[i] = object[props[i++]];
		},

		performPropertyChecks = function(object, data, except) {
			if (!data.handlers.length) return;

			var props, proplen, keys,
				values = data.values,
				i = 0, idx, key, handler;

			// If the object isn't extensible, we don't need to check for new
			// or deleted properties
			if (data.extensible) {

				props = data.properties.slice();
				proplen = props.length;
				keys = getKeys(object);

				while (i < keys.length) {
					key = keys[i++];
					idx = inArray(key, props);
					if (idx === -1) {
						addChangeRecord(object, data, {
							name: key,
							type: "add",
							object: object
						}, except);
						data.properties.push(key);
						values.push(object[key]);
					} else {
						props[idx] = null;
						proplen--;
						if (!isAccessor(object, key) && !areSame(object[key], values[idx])) {
							addChangeRecord(object, data, {
								name: key,
								type: "update",
								object: object,
								oldValue: values[idx]
							}, except);
							values[idx] = object[key];
						}
					}
				}

				// Checks if some property has been deleted
				for (i = props.length; proplen && i--;)
					if (props[i] !== null) {
						addChangeRecord(object, data, {
							name: props[i],
							type: "delete",
							object: object,
							oldValue: values[i]
						}, except);
						data.properties.splice(i, 1);
						values.splice(i, 1);
						proplen--;
					}

				if (O.isExtensible && !O.isExtensible(object)) {
					data.extensible = false;
					addChangeRecord(object, data, {
						type: "preventExtensions",
						object: object
					}, except);

					if (!data.frozen)
						data.frozen = O.isFrozen(object);
				}

			} else if (!data.frozen) {

				// If the object is not extensible, but not frozen, we just have
				// to check for value changes
				while (i < props.length) {
					key = props[i++];
					if (!areSame(object[key], values[i])) {
						addChangeRecord(object, data, {
							name: key,
							type: "update",
							object: object,
							oldValue: values[i]
						});
						values[i] = object[key];
					}
				}

				if (O.isFrozen(object))
					data.frozen = true;
			}

		},

		broadcastChangeRecords = function(object, data) {
			var handlers = data.handlers,
				i = 0, j, idx,
				cbdata, changeRecords;

			for (; i < handlers.length; i++) {
				cbdata = callbackData[inArray(handlers[i], callbacks)];
				idx = inArray(object, cbdata.objects);
				changeRecords = cbdata.changeBundles[idx];

				if (changeRecords.length) {
					handlers[i](changeRecords);
					cbdata.changeBundles[idx] = [];
				}
			}
		},

		retrieveNotifier = function(object, data) {
			if (!data)
				data = objectData[inArray(object, observed)];
			var notifier = data && data.notifier;

			if (notifier) return notifier;

			notifier = {
				// https://github.com/arv/ecmascript-object-observe/blob/master/NewInternalsSpecification.md#notifierprototypenotifychangerecord
				notify: function(changeRecord) {
					changeRecord.type; // Just to check the property is there...

					// If there's no data, the object has been unobserved
					var data = objectData[inArray(object, observed)];
					if (data) {
						var recordCopy = { object: object }, prop;
						for (prop in changeRecord)
							if (prop !== "object")
								recordCopy[prop] = changeRecord[prop];
						addChangeRecord(object, data, recordCopy);
					}
				},

				// https://github.com/arv/ecmascript-object-observe/blob/master/NewInternalsSpecification.md#notifierprototypeperformchangechangetype-changefn
				performChange: function(changeType, func/*, thisObj*/) {
					if (typeof changeType !== "string")
						throw new TypeError("Invalid non-string changeType");

					if (typeof func !== "function")
						throw new TypeError("Cannot perform non-function");

					var data = objectData[inArray(object, observed)],
						prop, changeRecord,
						result = func.call(arguments[2]);

					data && performPropertyChecks(object, data, changeType);

					// If there's no data, the object has been unobserved
					if (data && result && typeof result === "object") {
						changeRecord = { object: object, type: changeType };
						for (prop in result)
							if (prop !== "object" && prop !== "type")
								changeRecord[prop] = result[prop];
						addChangeRecord(object, data, changeRecord);
					}
				}
			};
			if (data) data.notifier = notifier;

			return notifier;
		},

		addCallback = function(callback, acceptList, object) {
			var idx = inArray(callback, callbacks),
				oidx, data;

			if (idx === -1) {
				callbacks.push(callback);
				callbackData.push({
					objects: [ object ],
					acceptLists: [ acceptList ],
					changeBundles: [ [] ]
				});
			} else {
				data = callbackData[idx];
				oidx = inArray(object, data.objects);
				if (oidx === -1) {
					data.objects.push(object);
					data.acceptLists.push(acceptList);
					data.changeBundles.push([]);
				} else data.acceptLists[oidx] = acceptList;
			}
		},

		addChangeRecord = function(object, data, changeRecord, except) {
			var handlers = data.handlers,
				i = 0, cbdata, idx;

			while (i < handlers.length)
				if (cbdata = callbackData[inArray(handlers[i++], callbacks)]) {
					idx = inArray(object, cbdata.objects);

					// If except is defined, a Notifier.performChange has been
					// performed, with except as the type.
					// All the handlers that accepts that type are skipped.
					if (except != null && inArray(except, cbdata.acceptLists[idx]) > -1)
						continue;

					if (inArray(changeRecord.type, cbdata.acceptLists[idx]) > -1)
						cbdata.changeBundles[idx].push(changeRecord);
				}
		};

	// https://github.com/arv/ecmascript-object-observe/blob/master/PublicApiSpecification.md#objectobserveo-callback-accept--undefined
	O.observe = function observe(object, handler, acceptList) {
		if (object === null || typeof object !== "object")
			throw new TypeError("Object.observe cannot observe non-object");

		if (typeof handler !== "function")
			throw new TypeError("Object.observe cannot deliver to non-function");

		if (O.isFrozen && O.isFrozen(handler))
			throw new TypeError("Object.observe cannot deliver to a frozen function object");

		doObserve(object, handler, acceptList);
	};

	// https://github.com/arv/ecmascript-object-observe/blob/master/PublicApiSpecification.md#objectunobserveo-callback
	O.unobserve = function unobserve(object, handler) {
		if (object === null || typeof object !== "object")
			throw new TypeError("Object.unobserve cannot unobserve non-object");

		if (typeof handler !== "function")
			throw new TypeError("Object.unobserve cannot deliver to non-function");

		var oidx = inArray(object, observed), hidx, idx,
			handlers, i, cbdata;

		if (oidx > -1) {
			handlers = objectData[oidx].handlers;
			for (i = 0; i < handlers.length; i++) {
				hidx = inArray(handlers[i], callbacks);
				cbdata = callbackData[hidx];

				if (cbdata.objects.length === 1 && cbdata.objects[0] === object) {
					callbacks.splice(hidx, 1);
					callbackData.splice(hidx, 1);
				} else {
					idx = inArray(object, cbdata.objects);
					cbdata.object.splice(idx, 1);
					cbdata.acceptLists.splice(idx, 1);
					cbdata.changeBundles.splice(idx, 1);
				}
			}
			observed.splice(oidx, 1);
			objectData.splice(oidx, 1);
		}
	};

	// https://github.com/arv/ecmascript-object-observe/blob/master/PublicApiSpecification.md#objectgetnotifier
	O.getNotifier = function getNotifier(object) {
		if (object === null || typeof object !== "object")
			throw new TypeError("Object.getNotifier cannot getNotifier non-object");

		if (O.isFrozen && O.isFrozen(object)) return null;

		return retrieveNotifier(object);
	};

	// https://github.com/arv/ecmascript-object-observe/blob/master/PublicApiSpecification.md#objectdeliverchangerecords
	// https://github.com/arv/ecmascript-object-observe/blob/master/NewInternalsSpecification.md#deliverchangerecordsc
	O.deliverChangeRecords = function deliveryChangeRecords(handler) {
		if (typeof handler !== "function")
			throw new TypeError("Object.deliverChangeRecords cannot deliver to non-function");
		
		var idx = inArray(handler, callbacks), oidx,
			bundles, cbdata, object, i = 0;
		if (idx > -1) {
			cbdata = callbackData[idx];
			bundles = cbdata.changeBundles;
			for (i = 0; i < bundles.length; i++) {
				object = cbdata.objects[i];
				oidx = inArray(object, observed);
				performPropertyChecks(object, objectData[oidx]);
				if (bundles[i].length) {
					handler(bundles[i]);
					cbdata.changeBundles[i] = [];
				}
			}
		}
	};

})(Object, Array, this);