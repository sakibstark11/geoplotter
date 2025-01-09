# geoplotter
A simple react app that plots geohashes onto mapbox via url parameters.
## config
### Available URL Parameters for `GeohashMap`

| Parameter    | Type     | Required | Description                                                                                       | Example Value                  |
|--------------|----------|----------|---------------------------------------------------------------------------------------------------|---------------------------------|
| `geohashes`  | String   | No       | A comma-separated list of geohashes to display on the map.                                        | `geohashes=dr5ru,dr5rv,dr5rw`  |
| `url`        | String   | No       | A URL pointing to a file containing geohashes (one per line). These are fetched and displayed.    | `url=https://example.com/data` |
| `timer`      | Integer  | No       | Refresh interval in seconds for reloading geohashes and updating the map.                        | `timer=60`                     |
