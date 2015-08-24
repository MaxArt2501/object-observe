(function(root, tests) {
    if (typeof define === "function" && define.amd)
        define(["expect", "object-observe-lite"], tests);
    else if (typeof exports === "object")
        tests(require("benchmark"), global, require("../dist/object-observe-lite.js"));
    else tests(root.Benchmark, root);
})(this, function(Benchmark, root) {
"use strict";

root.generateObject = function(numberOfProperties) {
    var object = {};

    for (var i = 0; i < numberOfProperties; i++)
        object["prop" + i] = i;

    return object;
}

var padspace = (new Array(81)).join(" ");
function padL(text, length) {
    return (padspace + text).slice(-length);
}
function padR(text, length) {
    return (text + padspace).slice(0, length);
}

var onDOM = typeof document !== "undefined";

if (onDOM) {
    var parent = document.getElementsByTagName("tbody")[0];

    var initBench = function() {
            var row = this.row = document.createElement("tr"),
                cell = document.createElement("td");
            cell.innerHTML = this.props;
            row.appendChild(cell);
            cell = document.createElement("td");
            cell.innerHTML = this.objects;
            row.appendChild(cell);
            cell = document.createElement("td");
            cell.className = "changes";
            cell.innerHTML = this.name;
            row.appendChild(cell);

            this.cells = [];
            cell = document.createElement("td");
            cell.className = "samples";
            this.cells.push(cell);
            row.appendChild(cell);
            cell = document.createElement("td");
            cell.className = "count";
            this.cells.push(cell);
            row.appendChild(cell);
            cell = document.createElement("td");
            cell.className = "frequency";
            this.cells.push(cell);
            row.appendChild(cell);

            parent.appendChild(row);
        },
        onCycle = function() {
            this.cells[0].innerHTML = ++this.samples;
            this.cells[1].innerHTML = this.count;
            this.cells[2].innerHTML = this.hz.toFixed(2);
        };
} else {
    var writeOut = typeof process === "undefined" || !process.stdout || !process.stdout.isTTY
            ? function(text) { console.log(text); }
            : function(text) { process.stdout.write(text); };
    writeOut("\x1b[1;37mProperties  Objects  Changes     Samples  Loops       FPS (Hz)\n");
    writeOut(          "---------------------------------------------------------------------");
    var initBench = function() {
            writeOut("\n\x1b[1;30m" + padL(this.props, 10) + "  " + padL(this.objects, 7) + "  " + padR(this.name, 48));
        },
        onCycle = function() {
            writeOut("\x1b[38D\x1b[1;31m" + padL(++this.samples, 9) + "\x1b[1;36m" + padL(this.count, 12)
                    + "\x1b[1;32m" + padL(this.hz.toFixed(2), 17) + "\x1b[0;37m");
        };
}

function errorBench(e) {
    console.log(e);
}

var benches = [];

function generateBenchGroup(props, objects) {
    var propsPerObject = props / objects;
    var options = {
        setup: "\
            var handler = function() {};\n\
            var objects = [];\n\
            for (var i = 0; i < " + objects + "; i++) {\n\
                objects[i] = generateObject(" + propsPerObject + ");\n\
                Object.observe(objects[i], handler);\n\
            }\n",
        teardown: "\
            for (var i = 0; i < " + objects + "; i++)\
                Object.unobserve(objects[i], handler);\n",
        props: props,
        objects: objects,
        onStart: initBench,
        onCycle: onCycle,
        onError: errorBench,
        onComplete: nextBench,
        async: true,
        samples: 0
    };
    var midIndex = objects >> 1,
        midProp = "prop" + (propsPerObject >> 1);

    benches.push(new Benchmark("none", "\
        Object.deliverChangeRecords(handler);\n", options));
    benches.push(new Benchmark("one", "\
        objects[" + midIndex + "]." + midProp + "++;\n\
        Object.deliverChangeRecords(handler);\n", options));
    benches.push(new Benchmark("all", "\
        for (var i = 0; i < " + objects + "; i++)\n\
            for (var j = 0; j < " + propsPerObject + "; j++)\n\
                objects[i][\"prop\" + j]++;\n\
        Object.deliverChangeRecords(handler);\n", options));
}

generateBenchGroup(10, 1);
generateBenchGroup(10, 2);
generateBenchGroup(100, 1);
generateBenchGroup(100, 20);
generateBenchGroup(1000, 1);
generateBenchGroup(1000, 200);

var index = 0;

function nextBench() {
    if (index >= benches.length) return;

    benches[index++].run();
}

nextBench();

});
