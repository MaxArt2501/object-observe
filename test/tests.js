(function(root, tests) {
    if (typeof define === "function" && define.amd)
        define(["expect", "object-observe"], tests);
    else if (typeof exports === "object")
        tests(require("../util/expect.js"), require("../dist/object-observe.js"));
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
        }, 30);
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
        }, 30);
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
        }, 30);
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
        }, 30);
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
        }, 30);
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
        }, 30);
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
        }, 30);
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
        }, 30);
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
        }, 30);
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
        }, 30);
    });
});

describe("Object.deliverChangeRecords", function() {
    it("should deliver changes synchronously", function(done) {
        function updateHandler(changes) {
            try {
                expect(updated).to.be(false);
                expect(added).to.be(true);
                expect(changes).to.have.length(1);
                expect(changes[0]).to.eql({ type: "update", name: "foo", object: obj, oldValue: 0 });

                updated = true;
            } catch (e) { done(e); }
        }
        function addHandler(changes) {
            try {
                expect(updated).to.be(false);
                expect(added).to.be(false);
                expect(changes).to.have.length(1);
                expect(changes[0]).to.eql({ type: "add", name: "bar", object: obj });

                added = true;
            } catch (e) { done(e); }
        }

        var obj = { foo: 0 },
            updated = false, added = false;
        Object.observe(obj, updateHandler, [ "update" ]);
        Object.observe(obj, addHandler, [ "add" ]);

        obj.foo = 42;
        obj.bar = "Hi";
        Object.deliverChangeRecords(addHandler);

        Object.unobserve(obj, updateHandler);
        Object.unobserve(obj, addHandler);

        setTimeout(function() {
            try {
                expect(updated).to.be(true);
                expect(added).to.be(true);
                done();
            } catch (e) { done(e); }
        }, 30);
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

        Object.unobserve(obj1, handler);
        Object.unobserve(obj2, handler);

        setTimeout(function() {
            try {
                expect(tested).to.be(true);
                done();
            } catch (e) { done(e); }
        }, 30);
    });
});

describe("Object.getNotifier", function() {
    it("should deliver custom notifications", function(done) {
        function handler(changes) {
            try {
                expect(tested).to.be(false);
                expect(changes).to.have.length(1)
                expect(changes[0]).to.eql({ type: "test", object: obj, message: "Hello" });
                tested = true;
            } catch (e) { done(e); }
        }

        var obj = { },
            tested = false,
            notifier;
        Object.observe(obj, handler, [ "test" ]);

        notifier = Object.getNotifier(obj);
        expect(notifier).to.be.an("object");
        expect(notifier.notify).to.be.a("function");
        expect(notifier.performChange).to.be.a("function");

        notifier.notify({ type: "test", message: "Hello" });

        Object.unobserve(obj, handler);

        setTimeout(function() {
            try {
                expect(tested).to.be(true);
                done();
            } catch (e) { done(e); }
        }, 30);
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
        }, 30);
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
        }, 30);
    });
});

});