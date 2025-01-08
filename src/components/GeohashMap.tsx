import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import geohash from "ngeohash";

import "mapbox-gl/dist/mapbox-gl.css";

const GeohashMap = () => {
  const mapContainerRef = useRef<HTMLDivElement>();
  const mapRef = useRef<mapboxgl.Map>();
  const [searchParams] = useSearchParams();

  const drawGeohashBoundingBoxes = (geohashes: string[]) => {
    const features = geohashes.map((hash) => {
      const [minLat, minLon, maxLat, maxLon] = geohash.decode_bbox(hash);
      const { latitude, longitude } = geohash.decode(hash);

      new mapboxgl.Popup({
        closeOnClick: false,
        closeButton: false,
      })
        .setLngLat([longitude, latitude])
        .setHTML(`<text style="color: red;">${hash}</text>`)
        .addTo(mapRef.current as mapboxgl.Map);

      return {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [minLon, minLat],
              [maxLon, minLat],
              [maxLon, maxLat],
              [minLon, maxLat],
              [minLon, minLat],
            ],
          ],
        },
        properties: {
          geohash: hash,
        },
      };
    });

    const geoJson = {
      type: "FeatureCollection",
      features,
    };

    console.log(geoJson);

    if (!mapRef.current?.getSource("geohash-bboxes")) {
      mapRef.current?.addSource("geohash-bboxes", {
        type: "geojson",
        data: geoJson as FeatureCollection<Geometry, GeoJsonProperties>,
      });

      mapRef.current?.addLayer({
        id: "geohash-bboxes-fill",
        type: "fill",
        source: "geohash-bboxes",
        paint: {
          "fill-color": "#ff0000",
          "fill-opacity": 0.4,
        },
      });
    } else {
      const source = mapRef.current.getSource(
        "geohash-bboxes"
      ) as mapboxgl.GeoJSONSource;
      source.setData(geoJson as FeatureCollection<Geometry, GeoJsonProperties>);
    }
  };

  const fetchUrl = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      alert("Failed to fetch data");
    }
    return await response.text();
  };

  useEffect(() => {
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_PUBLIC_KEY as string;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current as HTMLDivElement,
      center: [90.4125, 23.8103],
      zoom: 17,
    });

    const geohashArray =
      searchParams.get("geohashes") !== null
        ? searchParams.get("geohashes")!.split(",")
        : [];
    const url = searchParams.get("url")!;
    if (url) {
      fetchUrl(url).then((data) => {
        geohashArray.push(...data.slice(0, -1).split("\n"));
      });
    }

    mapRef.current.on("load", () => {
      if (geohashArray.length) {
        drawGeohashBoundingBoxes(geohashArray);
      }
    });
  }, []);

  return (
    <div
      style={{ height: "100vh", width: "100vw" }}
      ref={mapContainerRef as React.RefObject<HTMLDivElement>}
      className="map-container"
    />
  );
};

export default GeohashMap;
