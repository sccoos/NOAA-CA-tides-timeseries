import calendar
import datetime as dt
import json
import sys
import urllib.parse
import urllib.request

STATIONS = {"9410170": "San Diego", "9413450": "Monterey", "9415020": "Point Reyes"}
today = dt.datetime.now(dt.timezone.utc).date()
start = dt.date(today.year - 1, 12, 26)
end = today
result = {"year": today.year, "generated": dt.datetime.now(dt.timezone.utc).isoformat(), "stations": []}
for station, name in STATIONS.items():
    rows = []
    cursor = start
    while cursor <= end:
        # Restrict each request to a calendar month, comfortably within NOAA's one-year limit.
        last = min(end, dt.date(cursor.year, cursor.month, calendar.monthrange(cursor.year, cursor.month)[1]))
        query = urllib.parse.urlencode({"begin_date": cursor.strftime("%Y%m%d"), "end_date": last.strftime("%Y%m%d"), "station": station, "product": "hourly_height", "datum": "MSL", "time_zone": "lst", "units": "metric", "application": "CaliforniaSeaLevel", "format": "json"})
        request = urllib.request.Request("https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?" + query, headers={"User-Agent": "CaliforniaSeaLevel/1.0"})
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = json.load(response)
        if "error" in payload:
            message = payload["error"].get("message", "Unknown NOAA error")
            if "No data was found" not in message:
                raise RuntimeError(f"{name}: {message}")
        rows.extend(payload.get("data", []))
        cursor = last + dt.timedelta(days=1)
    days = {}
    for row in rows:
        try:
            timestamp = dt.datetime.strptime(row["t"], "%Y-%m-%d %H:%M")
            value = float(row["v"])
            if timestamp.minute == 0:
                days.setdefault(timestamp.date(), {})[timestamp.hour] = value
        except (KeyError, ValueError, TypeError):
            continue
    values = []
    date = dt.date(today.year, 1, 1)
    while date <= end:
        window = [days.get(date - dt.timedelta(days=i), {}) for i in range(7)]
        value = sum(sum(day.values()) for day in window) / 168 * 3.280839895 if all(len(day) == 24 for day in window) else None
        values.append({"date": date.isoformat(), "feet": value})
        date += dt.timedelta(days=1)
    result["stations"].append({"id": station, "name": name, "values": values, "latest": next((v["date"] for v in reversed(values) if v["feet"] is not None), None)})
    print(f"{name}: latest complete window {result['stations'][-1]['latest']}", file=sys.stderr)
print(json.dumps(result, allow_nan=False))
