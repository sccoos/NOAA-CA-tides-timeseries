---
title: California sea level
---

```js
import {mountChart} from "./chart.js";
const data = await FileAttachment("./data/sea-level.json").json();
```

<div id="chart"></div>

```js
const dispose = mountChart(document.querySelector("#chart"), data);
invalidation.then(dispose);
```
