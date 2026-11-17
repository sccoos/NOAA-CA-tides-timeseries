import * as d3 from "d3";

export function mountChart(container, data) {
  const colors = ["#0072b2", "#d55e00", "#009e73"];
  const series = data.stations.map((s, i) => ({...s, color: colors[i], values: s.values.map(d => ({date: d3.utcParse("%Y-%m-%d")(d.date), value: d.feet}))}));
  const svg = d3.select(container).append("svg").attr("role", "img").attr("tabindex", 0).attr("aria-label", `Trailing seven-day mean water level in feet relative to each station's mean sea level datum for ${data.year}. Focus and use left and right arrows to inspect dates.`);
  let selectedDate = null;
  let update = () => {};
  function render() {
    const width = Math.max(container.clientWidth, 200), height = Math.max(container.clientHeight, 200);
    const narrow = width < 600;
    const m = {top: narrow ? 91 : 68, right: 18, bottom: 40, left: 62}, w = Math.max(1, width - m.left - m.right), h = Math.max(1, height - m.top - m.bottom);
    svg.attr("viewBox", `0 0 ${width} ${height}`).selectAll("*").remove();
    const x = d3.scaleUtc().domain([new Date(Date.UTC(data.year, 0, 1)), new Date(Date.UTC(data.year + 1, 0, 1))]).range([0, w]);
    const values = series.flatMap(s => s.values.map(d => d.value).filter(v => v != null && Number.isFinite(v)));
    const extent = d3.extent([0, ...values]);
    const y = d3.scaleLinear().domain(values.length ? [extent[0] - .1, extent[1] + .1] : [-1, 1]).nice().range([h, 0]);
    svg.append("text").attr("class", "chart-title").attr("x", width / 2).attr("y", 22).attr("text-anchor", "middle").text("NOAA Hourly Tidal Observations (7-day running mean)");
    const legend = svg.append("g");
    const items = series.map(s => {
      const item = legend.append("g");
      item.append("line").attr("x2", 20).attr("stroke", s.color).attr("stroke-width", 3);
      item.append("text").attr("x", 26).attr("dy", ".35em").attr("class", "legend-label").text(s.name);
      return item;
    });
    const rows = narrow ? [items.slice(0, 2), items.slice(2)] : [items];
    rows.forEach((row, rowIndex) => {
      const widths = row.map(item => item.node().getBBox().width);
      let left = (width - (d3.sum(widths) + 28 * (row.length - 1))) / 2;
      row.forEach((item, i) => {
        item.attr("transform", `translate(${left},${narrow ? 45 + rowIndex * 22 : 49})`);
        left += widths[i] + 28;
      });
    });
    const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);
    g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(6).tickSize(-w).tickFormat(""));
    g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(6));
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${h})`).call(d3.axisBottom(x).ticks(narrow ? 4 : 12).tickFormat(d3.utcFormat("%b")));
    svg.append("text").attr("class", "axis-label").attr("text-anchor", "middle").attr("transform", `translate(15,${m.top + h / 2}) rotate(-90)`).text("Feet relative to mean sea level");
    g.append("line").attr("class", "zero").attr("x2", w).attr("y1", y(0)).attr("y2", y(0));
    g.append("text").attr("class", "zero-label").attr("x", w - 4).attr("y", y(0) - 6).attr("text-anchor", "end").text("Mean sea level");
    const line = d3.line().defined(d => d.value != null).x(d => x(d.date)).y(d => y(d.value));
    series.forEach(s => g.append("path").datum(s.values).attr("fill", "none").attr("stroke", s.color).attr("stroke-width", 2.5).attr("d", line));
    const guide = g.append("line").attr("class", "guide").attr("y2", h).style("display", "none");
    const markers = g.append("g").attr("pointer-events", "none").selectAll("circle")
      .data(series).join("circle").attr("r", 4.5).attr("fill", s => s.color)
      .attr("stroke", "white").attr("stroke-width", 1.5).style("display", "none");
    const tooltip = g.append("g").style("display", "none").attr("pointer-events", "none");
    tooltip.append("rect").attr("class", "hover-bg").attr("width", 170).attr("height", 78).attr("rx", 3);
    const text = tooltip.append("text").attr("class", "hover-label").attr("x", 8).attr("y", 16);
    update = date => {
      if (!date || date.getUTCFullYear() !== data.year) { guide.style("display", "none"); markers.style("display", "none"); tooltip.style("display", "none"); return; }
      selectedDate = date;
      const pos = x(date);
      guide.style("display", null).attr("x1", pos).attr("x2", pos);
      markers.each(function(s) {
        const value = s.values.find(d => +d.date === +date)?.value;
        d3.select(this).style("display", value == null ? "none" : null)
          .attr("cx", pos).attr("cy", value == null ? 0 : y(value));
      });
      tooltip.style("display", null).attr("transform", `translate(${Math.max(0, Math.min(w - 170, pos + 8))},${Math.max(0, Math.min(8, h - 78))})`);
      const lines = [d3.utcFormat("%b %-d, %Y")(date), ...series.map(s => { const v = s.values.find(d => +d.date === +date)?.value; return `${s.name}: ${v == null ? "no data" : `${v.toFixed(2)} ft`}`; })];
      text.selectAll("tspan").data(lines).join("tspan").attr("x", 8).attr("dy", (_, i) => i ? 17 : 0).text(d => d);
      svg.attr("aria-label", lines.join(". ") + ". Use left and right arrows to inspect dates.");
    };
    g.append("rect").attr("width", w).attr("height", h).attr("fill", "transparent").on("pointermove", event => update(d3.utcDay.round(x.invert(Math.max(0, Math.min(w, d3.pointer(event)[0])))))).on("pointerleave", () => { selectedDate = null; update(null); });
    if (!values.length) g.append("text").attr("x", w / 2).attr("y", h / 2).attr("text-anchor", "middle").text("No complete seven-day windows are available.");
    if (selectedDate) update(selectedDate);
  }
  svg.on("keydown", event => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const base = selectedDate ?? new Date(Date.UTC(data.year, 0, 1));
    const date = d3.utcDay.offset(base, event.key === "ArrowLeft" ? -1 : 1);
    if (date.getUTCFullYear() === data.year) update(date);
  }).on("blur", () => { selectedDate = null; update(null); });
  const observer = new ResizeObserver(render); observer.observe(container); render();
  return () => { observer.disconnect(); svg.on("keydown", null).on("blur", null); container.replaceChildren(); };
}
