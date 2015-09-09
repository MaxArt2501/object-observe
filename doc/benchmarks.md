Benchmarks
==========

Here are some benchmarks performed using [benchmark.js](http://benchmarkjs.com/), the library behind [jsPerf](http://jsperf.com/). Old one, but still good.

To ensure the most reliable results, the polyfill is tested *synchronously*, which can be done using `Object.deliverChangeRecords`.

The *Properties* column refers to the number of properties that are subject to observation. The *Objects* column means the number of observed objects. For example, if the number of properties is 100 and the objects are 20, then each object has 5 properties.

The *Changes* column tells how many changes are performed in the test. When it's "all", then all properties are changed. No properties are added or deleted, no property descriptors are altered, object frozen or prototype changed. It's a mere benchmark on the dirty checking routine.

The results are given in cycles per second, with some native implementations given as a reference. Keep in mind that *anything above 60 Hz is more than enough*, as the polyfill caps the iterations to 60 frames per second.

## Desktop/server

Test platform:
* Chrome, io.js, node.js, Edge, IE and Firefox on Windows 10 64 bit (Intel Core i7-4702, 2.2 GHz, 8 GB RAM)
* Safari 8 on Mac OS X 10.10 Yosemite (Intel Core i5-3210M, 2.5 GHz, 16 GB RAM)

### Regular version

| Properties | Objects | Changes | Chrome 44 (native) | io.js (native) | Edge 20    | IE 11     | Firefox 42 | Safari 8  | node.js 0.10.40 |
|-----------:|--------:|:--------|-------------------:|---------------:|-----------:|----------:|-----------:|----------:|----------------:|
|         10 |       1 | none    |        12695226.07 |     9049899.39 |  130434.97 |  83872.44 |   73352.65 | 136194.27 |       101291.62 |
|         10 |       1 | one     |          474152.37 |      605161.84 |  125770.03 |  78540.56 |   69110.05 | 117424.81 |        99470.16 |
|         10 |       1 | all     |           65370.32 |       72723.21 |   73645.72 |  50913.31 |   33597.83 |  63551.55 |        67420.76 |
|         10 |       2 | none    |        11055704.90 |     9714097.84 |  124025.56 |  83853.47 |   74785.66 | 114128.75 |        98065.76 |
|         10 |       2 | one     |          503978.73 |      345396.99 |  117530.59 |  79384.80 |   67676.77 | 110071.79 |        63901.37 |
|         10 |       2 | all     |           65479.07 |       49071.59 |   71660.27 |  50796.94 |   34059.22 |  55677.89 |        63650.51 |
|        100 |       1 | none    |        12556039.14 |     7948191.02 |    9989.80 |   5757.68 |    4517.18 |   8358.55 |         8092.19 |
|        100 |       1 | one     |          480307.76 |      280002.44 |   10109.94 |   5094.36 |    4462.59 |   8753.64 |         7969.60 |
|        100 |       1 | all     |            7745.07 |        4670.98 |    5989.60 |   3859.97 |    2596.89 |   4853.01 |         5494.10 |
|        100 |      20 | none    |        12055798.16 |     9231993.34 |   11334.37 |   7884.65 |    7873.30 |  12111.71 |         9814.64 |
|        100 |      20 | one     |          482869.76 |      393232.06 |   11699.48 |   7992.85 |    7885.51 |  12178.59 |         9515.44 |
|        100 |      20 | all     |            7233.48 |        6120.82 |    6447.95 |   4896.90 |    3347.28 |   6011.95 |         5914.51 |
|       1000 |       1 | none    |        10151267.78 |     7107230.89 |     280.01 |    122.47 |      79.84 |    145.94 |          249.47 |
|       1000 |       1 | one     |          502903.60 |      278385.46 |     268.66 |    119.83 |      79.85 |    143.85 |          247.07 |
|       1000 |       1 | all     |             779.45 |         798.78 |     232.99 |    106.65 |      68.20 |    123.18 |          229.31 |
|       1000 |     200 | none    |        10414350.34 |    10352455.73 |    1163.79 |    805.99 |     803.90 |   1273.99 |          972.77 |
|       1000 |     200 | one     |          496837.38 |      359983.36 |    1042.34 |    679.55 |     785.10 |   1302.35 |          962.21 |
|       1000 |     200 | all     |             743.03 |         532.97 |     620.28 |    481.21 |     364.61 |    596.17 |          483.60 |


### Lite version

| Properties | Objects | Changes | Chrome 44 (native) | io.js (native) | Edge 20    | IE 11     | Firefox 42 | Safari 8  | node.js 0.10.40 |
|-----------:|--------:|:--------|-------------------:|---------------:|-----------:|----------:|-----------:|----------:|----------------:|
|         10 |       1 | none    |        12695226.07 |     9049899.39 |  396917.52 | 366848.35 |  216419.76 | 306189.73 |       214778.07 |
|         10 |       1 | one     |          474152.37 |      605161.84 |  327993.13 | 320364.92 |  157258.96 | 251524.20 |       200435.74 |
|         10 |       1 | all     |           65370.32 |       72723.21 |   87167.82 | 110067.97 |   49040.88 |  89913.17 |       103307.57 |
|         10 |       2 | none    |        11055704.90 |     9714097.84 |  348254.48 | 373360.56 |  208276.39 | 271377.33 |       191128.14 |
|         10 |       2 | one     |          503978.73 |      345396.99 |  316159.48 | 289281.85 |  150637.00 | 231797.23 |       180886.68 |
|         10 |       2 | all     |           65479.07 |       49071.59 |  106801.76 | 105960.07 |   48047.94 |  92345.23 |        98055.80 |
|        100 |       1 | none    |        12556039.14 |     7948191.02 |   21057.95 |  11794.79 |    7012.34 |  11807.05 |        13166.59 |
|        100 |       1 | one     |          480307.76 |      280002.44 |   21536.84 |  10974.59 |    6959.01 |  11311.73 |         9922.74 |
|        100 |       1 | all     |            7745.07 |        4670.98 |    8787.08 |   6385.73 |    2867.63 |   6296.93 |         8140.72 |
|        100 |      20 | none    |        12055798.16 |     9231993.34 |   37112.96 |  36455.26 |   22106.36 |  31086.33 |        20560.18 |
|        100 |      20 | one     |          482869.76 |      393232.06 |   33943.99 |  40519.03 |   21700.42 |  32266.06 |        19932.32 |
|        100 |      20 | all     |            7233.48 |        6120.82 |   10537.17 |  10312.76 |    4841.93 |   9174.64 |         9720.20 |
|       1000 |       1 | none    |        10151267.78 |     7107230.89 |     328.28 |    144.99 |      85.34 |    153.53 |          267.41 |
|       1000 |       1 | one     |          502903.60 |      278385.46 |     326.86 |    138.71 |      85.74 |    152.91 |          271.37 |
|       1000 |       1 | all     |             779.45 |         798.78 |     255.39 |    129.40 |      74.68 |    123.38 |          234.86 |
|       1000 |     200 | none    |        10414350.34 |    10352455.73 |    3637.22 |   4146.43 |    2312.70 |   3168.53 |         2019.55 |
|       1000 |     200 | one     |          496837.38 |      359983.36 |    3621.43 |   3570.93 |    2176.87 |   3318.44 |         2034.43 |
|       1000 |     200 | all     |             743.03 |         532.97 |    1015.30 |    905.53 |     510.69 |    975.95 |          665.03 |


## Mobile

Test platforms:
* Chrome 44, Firefox 40 on Samsung Galaxy Note 3 with Android 5.0 (Qualcomm Snapdragon 800, quad core, 2.3 GHz, 3 GB RAM)
* Safari 8 on iPhone 5 with iOS 8.4 (Apple A6, dual core, 1.3 GHz, 1 GB RAM)
* IE Mobile on Nokia Lumia 820 with Windows Phone 8.1 (Qualcomm Snapdragon S4 Plus, 1.5 GHz, 1 GB RAM)

### Regular version

| Properties | Objects | Changes | Chrome 44 (native) | Firefox 40 | Safari 8 | IE Mobile |
|-----------:|--------:|:--------|-------------------:|-----------:|---------:|----------:|
|         10 |       1 | none    |         2935925.26 |   12597.76 |  8127.91 |  11909.16 |
|         10 |       1 | one     |           45891.64 |    7942.07 |  7920.00 |  11130.70 |
|         10 |       1 | all     |            6731.94 |    3729.48 |  1862.07 |   6472.74 |
|         10 |       2 | none    |         2840198.42 |    7375.12 |  7454.55 |  11343.22 |
|         10 |       2 | one     |           44824.87 |    9923.59 |  4064.94 |  10980.57 |
|         10 |       2 | all     |            5669.78 |    3906.25 |  2354.43 |   5934.50 |
|        100 |       1 | none    |         3189570.94 |    1018.38 |  2291.08 |   1181.13 |
|        100 |       1 | one     |           40600.19 |    1008.52 |  2259.26 |   1149.36 |
|        100 |       1 | all     |             890.46 |     361.72 |  1000.00 |    606.30 |
|        100 |      20 | none    |         3165550.58 |    1357.33 |   630.43 |   1228.42 |
|        100 |      20 | one     |           40863.50 |    1260.03 |   987.34 |   1191.83 |
|        100 |      20 | all     |             677.30 |     325.42 |   119.57 |    595.45 |
|       1000 |       1 | none    |         2059353.05 |      27.43 |    36.14 |     29.54 |
|       1000 |       1 | one     |           45913.34 |      26.62 |    38.96 |     31.50 |
|       1000 |       1 | all     |              76.61 |      18.59 |    30.93 |     21.57 |
|       1000 |     200 | none    |         2968757.38 |      70.96 |   316.46 |    121.93 |
|       1000 |     200 | one     |           41713.60 |     113.50 |   312.50 |    110.72 |
|       1000 |     200 | all     |              76.98 |      41.75 |   134.15 |     58.30 |


### Lite version

| Properties | Objects | Changes | Chrome 44 (native) | Firefox 40 | Safari 8 | IE Mobile |
|-----------:|--------:|:--------|-------------------:|-----------:|---------:|----------:|
|         10 |       1 | none    |         2935925.26 |   28742.57 | 61000.00 |  53980.35 |
|         10 |       1 | one     |           45891.64 |   18272.91 | 45546.51 |  48678.81 |
|         10 |       1 | all     |            6731.94 |    4773.90 | 16222.22 |  12020.68 |
|         10 |       2 | none    |         2840198.42 |   22611.80 | 48045.45 |  58659.53 |
|         10 |       2 | one     |           44824.87 |   19874.12 | 44881.58 |  44002.45 |
|         10 |       2 | all     |            5669.78 |    4786.42 | 16831.17 |  12463.18 |
|        100 |       1 | none    |         3189570.94 |    2581.15 |  2752.94 |   2219.00 |
|        100 |       1 | one     |           40600.19 |    2278.73 |  3059.56 |   2556.97 |
|        100 |       1 | all     |             890.46 |     401.35 |  1247.06 |   1051.21 |
|        100 |      20 | none    |         3165550.58 |    3198.00 |  6024.69 |   6552.65 |
|        100 |      20 | one     |           40863.50 |    3298.02 |  6296.77 |   5767.85 |
|        100 |      20 | all     |             677.30 |     522.06 |  2098.92 |   1327.50 |
|       1000 |       1 | none    |         2059353.05 |      26.63 |    38.10 |     36.51 |
|       1000 |       1 | one     |           45913.34 |      31.63 |    38.10 |     36.36 |
|       1000 |       1 | all     |              76.61 |      10.59 |    32.61 |     30.90 |
|       1000 |     200 | none    |         2968757.38 |     316.54 |   675.68 |    691.51 |
|       1000 |     200 | one     |           41713.60 |     381.54 |   671.05 |    663.15 |
|       1000 |     200 | all     |              76.98 |      49.85 |   188.24 |    134.54 |


## Running the benchmarks

After having installed the development dependencies with `npm install`, open the [index.html](../benchmark/index.html) file in the benchmark/ directory (or its counterpart [index-lite.html](../benchmark/index-lite.html) for the "lite" version of the polyfill) in your browser of choice.

To test node.js < 0.11.13, run `npm run benchmark` or `npm run benchmark-lite`. Any other version of node.js, or io.js, will test a native implentation of `Object.observe`.

For other environments, refer to [benchmarks.js](../benchmark/benchmarks.js) or its ["lite" counterpart](../benchmark/benchmarks-lite.js).
