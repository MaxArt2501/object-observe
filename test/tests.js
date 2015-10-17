(function(root, tests) {
    if (typeof define === "function" && define.amd)
        define(["expect", "object-observe"], tests);
    else if (typeof exports === "object")
        tests(require("expect.js"), require("../dist/object-observe.js"));
    else tests(root.expect, root.Object.observe);
})(this, function(expect) {
"use strict";

function looseIndexOf(pivot, array) {
    for (var i = 0, r = -1; i < array.length && r < 0; i++)
        if (expect.eql(array[i], pivot)) r = i;
    return r;
};

expect.Assertion.prototype.looselyContain = function(obj) {
    this.assert(~looseIndexOf(obj, this.obj),
        function(){ return 'expected ' + expect.stringify(this.obj) + ' to contain ' + expect.stringify(obj) },
        function(){ return 'expected ' + expect.stringify(this.obj) + ' to not contain ' + expect.stringify(obj) }
    );
    return this;
};

if (typeof Object.observe === "function")
    console.log(/\{ \[native code\] \}/.test(Object.observe.toString())
            ? "Object.observe is natively supported by the environment"
            : "Object.observe has been correctly polyfilled");
else console.log("Object.observe has NOT been polyfilled");

var timeout = 30;

describe("Object.observe", function() {
    it("should notify 'add', 'update' and 'delete' changes", function(done) {
        function handler(changes) {
            try {
                expect(tested).to.be(false);
                expect(changes).to.have.length(3)
                    .and.to.looselyContain({ type: "add", name: "test", object: obj })
                    .and.to.looselyContain({ type: "update", name: "foo", object: obj, oldValue: 0 })
                    .and.to.looselyContain({ type: "delete", name: "bar", object: obj, oldValue: "a" });
                tested = true;
            } catch (e) { done(e); }
        }

        var obj = { foo: 0, bar: "a" },
            tested = false;
        Object.observe(obj, handler);

        obj.test = "Hello!";
        obj.foo = 42;
        delete obj.bar;

        Object.unobserve(obj, handler);

        setTimeout(function() {
            try {
                expect(tested).to.be(true);
                done();
            } catch (e) { done(e); }
        }, timeout);
    });

    it("should only notify on actual changes", function(done) {
        function handler(changes) {
            done(new Error("expected no changes"));
        }

        var obj = { foo: 0 },
            changed = false;
        Object.observe(obj, handler);

        obj.foo = 0;
        delete obj.bar;

        Object.unobserve(obj, handler);

        setTimeout(function() {
            try {
                expect(changed).to.be(false);
                done();
            } catch (e) { done(e); }
        }, timeout);
    });

    it("should observe plain objects", function(done) {
        function handler(changes) {
            try {
                expect(tested).to.be(false);
                expect(changes).to.have.length(1);
                tested = true;
            } catch (e) { done(e); }
        }

        var obj = {}, tested = false;
        Object.observe(obj, handler);

        obj.foo = 42;

        Object.unobserve(obj, handler);

        setTimeout(function() {
            try {
                expect(tested).to.be(true);
                done();
            } catch (e) { done(e); }
        }, timeout);
    });

    it("should observe arrays", function(done) {
        function handler(changes) {
            try {
                expect(tested).to.be(false);
                expect(changes).to.have.length(2)
                    .and.to.looselyContain({ type: "add", name: "0", object: array })
                    .and.to.looselyContain({ type: "update", name: "length", object: array, oldValue: 0 });
                tested = true;
            } catch (e) { done(e); }
        }

        var array = [], tested = false;
        Object.observe(array, handler);

        array.push(42);

        Object.unobserve(array, handler);

        setTimeout(function() {
            try {
                expect(tested).to.be(true);
                done();
            } catch (e) { done(e); }
        }, timeout);
    });

    it("should observe functions", function(done) {
        function handler(changes) {
            try {
                expect(tested).to.be(false);
                expect(changes).to.have.length(1)
                expect(changes[0]).to.eql({ type: "add", name: "foo", object: observeMe });
                tested = true;
            } catch (e) { done(e); }
        }
        function observeMe() {}

        var tested = false;
        Object.observe(observeMe, handler);

        observeMe.foo = "bar";

        Object.unobserve(observeMe, handler);

        setTimeout(function() {
            try {
                expect(tested).to.be(true);
                done();
            } catch (e) { done(e); }
        }, timeout);
    });

    it("should observe all kinds of objects, including instances of user defined classes", function(done) {
        function handler(changes) {
            try {
                expect(tested).to.be(false);
                expect(changes).to.have.length(3)
                    .and.to.looselyContain({ type: "update", name: "message", object: error, oldValue: "Message" })
                    .and.to.looselyContain({ type: "add", name: "TAU", object: Math })
                    .and.to.looselyContain({ type: "add", name: "foo", object: inst });
                tested = true;
            } catch (e) { done(e); }
        }

        function Class() {};

        var error = new Error("Message"),
            inst = new Class(),
            tested = false;

        Object.observe(error, handler);
        Object.observe(Math, handler);
        Object.observe(inst, handler);

        error.message = "New message";
        Math.TAU = Math.PI * 2;
        inst.foo = "bar";

        Object.unobserve(error, handler);
        Object.unobserve(Math, handler);
        Object.unobserve(inst, handler);

        delete Math.TAU;

        setTimeout(function() {
            try {
                expect(tested).to.be(true);
                done();
            } catch (e) { done(e); }
        }, timeout);
    });

    it("should throw when given any non-object", function() {
        var matcher = /cannot observe non-object/;
        expect(Object.observe).to.throwError(matcher);
        expect(Object.observe).withArgs(undefined, function() {}).to.throwError(matcher);
        expect(Object.observe).withArgs(null, function() {}).to.throwError(matcher);
        expect(Object.observe).withArgs(1, function() {}).to.throwError(matcher);
        expect(Object.observe).withArgs("foo", function() {}).to.throwError(matcher);
        expect(Object.observe).withArgs(true, function() {}).to.throwError(matcher);
    });

    it("should throw when not given a handler function", function() {
        var matcher = /cannot deliver to non-function/;
        expect(Object.observe).withArgs({}).to.throwError(matcher);
        expect(Object.observe).withArgs({}, "foo").to.throwError(matcher);
        expect(Object.observe).withArgs({}, 42).to.throwError(matcher);
    });

    if (Object.freeze) it("should throw when given a frozen handler function", function() {
        function handler() {}
        Object.freeze(handler);
        expect(Object.observe).withArgs({}, handler)
                .to.throwError(/cannot deliver to a frozen function object/);
    });

    it("should throw when given a non-object accept list", function() {
        // Can't test the error message, since Blink doesn't give one
        // See https://code.google.com/p/chromium/issues/detail?id=464695
        function matcher(e) {
            expect(e).to.be.a(TypeError);
        }
        expect(Object.observe).withArgs({}, function() {}, null).to.throwError(matcher);
        expect(Object.observe).withArgs({}, function() {}, "foo").to.throwError(matcher);
        expect(Object.observe).withArgs({}, function() {}, 42).to.throwError(matcher);
    });

    it("should deliver changes asynchronously", function(done) {
        function handler(changes) {
            try {
                expect(async).to.be(true);
                expect(tested).to.be(false);
                expect(changes).to.have.length(1);
                tested = true;
            } catch (e) { done(e); }
        }

        var obj = { foo: 0 },
            tested = false, async = false;
        Object.observe(obj, handler);

        obj.foo = 42;
        async = true;

        Object.unobserve(obj, handler);

        setTimeout(function() {
            try {
                expect(tested).to.be(true);
                done();
            } catch (e) { done(e); }
        }, timeout);
    });

    if (Object.defineProperties) it("should notify 'reconfigure' changes", function(done) {
        function handler(changes) {
            try {
                expect(tested).to.be(false);
                expect(changes).to.have.length(1);
                expect(changes[0]).to.eql({ type: "reconfigure", name: "foo", object: obj, oldValue: 0 });
                tested = true;
            } catch (e) { done(e); }
        }

        var obj = { foo: 0 },
            tested = false;
        Object.observe(obj, handler, [ "reconfigure" ]);

        Object.defineProperty(obj, "foo", { value: 10, writable: false });

        Object.unobserve(obj, handler);

        setTimeout(function() {
            try {
                expect(tested).to.be(true);
                done();
            } catch (e) { done(e); }
        }, timeout);
    });

    if (Object.seal) it("should notify 'preventExtensions' changes", function(done) {
        function handler(changes) {
            try {
                expect(tested).to.be(false);
                expect(changes).to.have.length(1)
                expect(changes[0]).to.eql({ type: "preventExtensions", object: obj });
                tested = true;
            } catch (e) { done(e); }
        }

        var obj = {},
            tested = false;
        Object.observe(obj, handler);

        Object.seal(obj);

        Object.unobserve(obj, handler);

        setTimeout(function() {
            try {
                expect(tested).to.be(true);
                done();
            } catch (e) { done(e); }
        }, timeout);
    });

    var setProto = Object.setPrototypeOf || "__proto__" in {}
            && function(object, proto) { object.__proto__ = proto; };
    if (setProto) it("should notify 'setPrototype' changes", function(done) {
        function handler(changes) {
            try {
                expect(tested).to.be(false);
                expect(changes).to.have.length(1)
                expect(changes[0]).to.eql({ type: "setPrototype", object: obj, name: "__proto__", oldValue: {} });
                tested = true;
            } catch (e) { done(e); }
        }

        var obj = {},
            tested = false;
        Object.observe(obj, handler);

        setProto(obj, Array.prototype);

        Object.unobserve(obj, handler);

        setTimeout(function() {
            try {
                expect(tested).to.be(true);
                done();
            } catch (e) { done(e); }
        }, timeout);
    });

    it("should deliver changes for multiple objects observed by the same handler", function(done) {
        function handler(changes) {
            try {
                expect(tested).to.be(false);
                expect(changes).to.have.length(2)
                    .and.to.looselyContain({ type: "update", name: "foo", object: obj1, oldValue: 0 })
                    .and.to.looselyContain({ type: "add", name: "foo", object: obj2 });
                tested = true;
            } catch (e) { done(e); }
        }

        var obj1 = { foo: 0 },
            obj2 = {},
            tested = false;
        Object.observe(obj1, handler);
        Object.observe(obj2, handler);

        obj1.foo = 42;
        obj2.foo = "bar";

        Object.unobserve(obj1, handler);
        Object.unobserve(obj2, handler);

        setTimeout(function() {
            try {
                expect(tested).to.be(true);
                done();
            } catch (e) { done(e); }
        }, timeout);
    });

    it("should not follow changes in the accept list array", function(done) {
        function handler(changes) {
            try {
                expect(tested).to.be(false);
                expect(changes).to.have.length(1);
                expect(changes[0]).to.eql({ type: "update", name: "foo", object: obj, oldValue: 0 });
                tested = true;
            } catch (e) { done(e); }
        }

        var obj = { foo: 0 },
            list = [ "update" ],
            tested = false;
        Object.observe(obj, handler, list);

        list.push("add");
        obj.foo = 6;
        obj.bar = 28;

        Object.unobserve(obj, handler);

        setTimeout(function() {
            try {
                expect(tested).to.be(true);
                done();
            } catch (e) { done(e); }
        }, timeout);
    });

    it("should deliver changes only after the handler has been registered", function(done) {
        function handler1(changes) {
            try {
                expect(changes).to.have.length(1);
                expect(async).to.be(true);
                tested = true;
            } catch (e) { done(e); }
        }
        function handler2() {
            done(new Error("expected no changes"));
        }

        var obj = {},
            async = false,
            tested = false;

        obj.foo = 42;
        Object.observe(obj, handler1);

        obj.bar = "Hello!";
        Object.observe(obj, handler2);

        async = true;

        Object.unobserve(obj, handler1);
        Object.unobserve(obj, handler2);

        setTimeout(function() {
            try {
                expect(tested).to.be(true);
                done();
            } catch (e) { done(e); }
        }, timeout);
    });
});

describe("Object.unobserve", function() {
    it("should prevent further change notifications on observed objects", function(done) {
        function handler(changes) {
            try {
                expect(tested).to.be(false);
                expect(changes).to.have.length(1);
                expect(changes[0]).to.eql({ type: "add", name: "foo", object: obj });
                tested = true;
            } catch (e) { done(e); }
        }

        var obj = {},
            tested = false;
        Object.observe(obj, handler);

        obj.foo = 6;

        Object.unobserve(obj, handler);

        obj.foo = 28;

        setTimeout(function() {
            try {
                expect(tested).to.be(true);
                done();
            } catch (e) { done(e); }
        }, timeout);
    });

    it("should allow asynchronous delivering of pending changes", function(done) {
        function handler(changes) {
            try {
                expect(tested).to.be(false);
                expect(async).to.be(true);
                expect(changes).to.have.length(1);
                tested = true;
            } catch (e) { done(e); }
        }

        var obj = {},
            tested = false, async = false;
        Object.observe(obj, handler);

        obj.foo = 42;

        Object.unobserve(obj, handler);
        async = true;

        setTimeout(function() {
            try {
                expect(tested).to.be(true);
                done();
            } catch (e) { done(e); }
        }, timeout);
    });

    it("should unobserve one handler at time", function(done) {
        function handler1(changes) {
            try {
                expect(tested).to.be(false);
                expect(changes).to.have.length(1);
                expect(changes[0]).to.eql({ type: "add", name: "foo", object: obj });
                tested = true;
            } catch (e) { done(e); }
        }
        function handler2(changes) {
            done(new Error("This shouldn't have be called"));
        }
        var obj = { foo: "bar" },
            tested = false;
        Object.observe(obj, handler1, [ "add" ]);
        Object.observe(obj, handler2, [ "update" ]);

        delete obj.foo;

        Object.unobserve(obj, handler2);

        obj.foo = "bar";

        Object.unobserve(obj, handler1);

        setTimeout(function() {
            try {
                expect(tested).to.be(true);
                done();
            } catch (e) { done(e); }
        }, timeout);
    });

    it("should not throw errors on any non-observed object", function() {
        Object.unobserve({}, function() {});
    });

    it("should not throw errors on a not previously used handler", function() {
        var obj = {},
            handler = function() {};
        Object.observe(obj, handler);
        Object.unobserve(obj, function() {});
        Object.unobserve(obj, handler);
    });

    it("should not unobserve any non-object", function() {
        var matcher = /cannot unobserve non-object/;
        expect(Object.unobserve).withArgs(null, function() {}).to.throwError(matcher);
        expect(Object.unobserve).withArgs(undefined, function() {}).to.throwError(matcher);
        expect(Object.unobserve).withArgs(42, function() {}).to.throwError(matcher);
        expect(Object.unobserve).withArgs("foo", function() {}).to.throwError(matcher);
        expect(Object.unobserve).withArgs(NaN, function() {}).to.throwError(matcher);
        expect(Object.unobserve).withArgs(true, function() {}).to.throwError(matcher);
    });

    it("should not unobserve when not given a handler function", function() {
        var matcher = /cannot deliver to non-function/;
        expect(Object.unobserve).withArgs({}).to.throwError(matcher);
        expect(Object.unobserve).withArgs({}, "foo").to.throwError(matcher);
        expect(Object.unobserve).withArgs({}, 42).to.throwError(matcher);
    });
});

describe("Object.deliverChangeRecords", function() {
    it("should not deliver to non-functions", function() {
        var matcher = /cannot deliver to non-function/;
        expect(Object.deliverChangeRecords).to.throwError(matcher);
        expect(Object.deliverChangeRecords).withArgs(undefined).to.throwError(matcher);
        expect(Object.deliverChangeRecords).withArgs(null).to.throwError(matcher);
        expect(Object.deliverChangeRecords).withArgs(1).to.throwError(matcher);
        expect(Object.deliverChangeRecords).withArgs("foo").to.throwError(matcher);
        expect(Object.deliverChangeRecords).withArgs(true).to.throwError(matcher);
    });

    it("should deliver changes synchronously", function(done) {
        function handler(changes) {
            try {
                expect(tested).to.be(false);
                expect(changes).to.have.length(1);
                expect(changes[0]).to.eql({ type: "add", name: "foo", object: obj });
                tested = true;
            } catch (e) { done(e); }
        }

        var obj = {}, tested = false;
        Object.observe(obj, handler);

        obj.foo = 42;
        Object.deliverChangeRecords(handler);
        expect(tested).to.be(true);

        Object.unobserve(obj, handler);
        done();
    });

    it("should deliver changes to an observer for multiple objects", function(done) {
        function handler(changes) {
            try {
                expect(tested).to.be(false);
                expect(changes).to.have.length(2)
                    .and.to.looselyContain({ type: "update", name: "foo", object: obj1, oldValue: 0 })
                    .and.to.looselyContain({ type: "add", name: "foo", object: obj2 });

                tested = true;
            } catch (e) { done(e); }
        }

        var obj1 = { foo: 0 }, obj2 = {},
            tested = false;
        Object.observe(obj1, handler);
        Object.observe(obj2, handler);

        obj1.foo = obj2.foo = 42;
        Object.deliverChangeRecords(handler);
        expect(tested).to.be(true);

        Object.unobserve(obj1, handler);
        Object.unobserve(obj2, handler);
        done();
    });

    it("should not deliver changes already being under delivery", function (done) {
        function handler() {
            try {
                expect(tested).to.be(false);
                tested = true;

                Object.deliverChangeRecords(handler);
            } catch (e) { done(e); }
        };

        var obj = { value: 1 },
            tested = false;
        Object.observe(obj, handler);

        obj.value++;
        Object.deliverChangeRecords(handler);

        done();
    });
});

describe("Object.getNotifier", function() {
    it("should provide a notifier for objects", function() {
        var obj = { },
            notifier = Object.getNotifier(obj);
        expect(notifier).to.be.an("object");
        expect(notifier.notify).to.be.a("function");
        expect(notifier.performChange).to.be.a("function");
    });

    it("should not provide a notifier for non-objects", function() {
        var matcher = /cannot getNotifier non-object/;
        expect(Object.getNotifier).to.throwError(matcher);
        expect(Object.getNotifier).withArgs(undefined).to.throwError(matcher);
        expect(Object.getNotifier).withArgs(null).to.throwError(matcher);
        expect(Object.getNotifier).withArgs(1).to.throwError(matcher);
        expect(Object.getNotifier).withArgs("foo").to.throwError(matcher);
        expect(Object.getNotifier).withArgs(true).to.throwError(matcher);
    });

    it("should deliver custom notifications asynchronously", function(done) {
        function handler(changes) {
            try {
                expect(async).to.be(true);
                expect(tested).to.be(false);
                expect(changes).to.have.length(1)
                expect(changes[0]).to.eql({ type: "test", object: obj, message: "Hello" });
                tested = true;
            } catch (e) { done(e); }
        }

        var obj = {},
            tested = false, async = false;

        Object.observe(obj, handler, [ "test" ]);

        Object.getNotifier(obj).notify({ type: "test", message: "Hello" });
        async = true;

        Object.unobserve(obj, handler);

        setTimeout(function() {
            try {
                expect(tested).to.be(true);
                done();
            } catch (e) { done(e); }
        }, timeout);
    });

    it("should ignore other changes when performing a custom change", function(done) {
        function handler(changes) {
            try {
                expect(tested).to.be(false);
                expect(changes).to.have.length(1);
                expect(changes[0]).to.eql({ type: "test", object: obj, message: "Hello" });
                tested = true;
            } catch (e) { done(e); }
        }

        var obj = { },
            tested = false,
            notifier;
        Object.observe(obj, handler, [ "test", "add" ]);

        notifier = Object.getNotifier(obj);

        notifier.performChange("test", function() {
            obj.foo = "bar";
        });
        notifier.notify({ type: "test", message: "Hello" });

        Object.unobserve(obj, handler);

        setTimeout(function() {
            try {
                expect(tested).to.be(true);
                done();
            } catch (e) { done(e); }
        }, timeout);
    });

    it("should notify a custom record when performing a custom change returns an object", function(done) {
        function handler(changes) {
            try {
                expect(tested).to.be(false);
                expect(changes).to.have.length(1);
                expect(changes[0]).to.eql({ type: "test", object: obj, message: "Hello" });
                tested = true;
            } catch (e) { done(e); }
        }

        var obj = { },
            tested = false;
        Object.observe(obj, handler, [ "test" ]);

        Object.getNotifier(obj).performChange("test", function() {
            obj.foo = "bar";
            return { message: "Hello" };
        });

        Object.unobserve(obj, handler);

        setTimeout(function() {
            try {
                expect(tested).to.be(true);
                done();
            } catch (e) { done(e); }
        }, timeout);
    });

    it("should perform custom changes synchronously", function() {
        var obj = {};

        Object.getNotifier(obj).performChange("test", function() {
            obj.foo = "bar";
        });

        expect(obj.foo).to.be("bar");
    });

    it("should deliver notifications asynchronously after performing custom changes", function(done) {
        function handler(changes) {
            try {
                expect(async).to.be(true);
                expect(tested).to.be(false);
                expect(changes).to.have.length(1);
                expect(changes[0]).to.eql({ type: "test", object: obj });
                tested = true;
            } catch (e) { done(e); }
        }

        var obj = { foo: 0 },
            tested = false, async = false;
        Object.observe(obj, handler, [ "test" ]);

        Object.getNotifier(obj).performChange("test", function() {
            obj.foo = "bar";
            return {};
        });
        async = true;

        Object.unobserve(obj, handler);

        setTimeout(function() {
            try {
                expect(tested).to.be(true);
                done();
            } catch (e) { done(e); }
        }, timeout);
    });
});

});
