import { LegacyRef, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import geohash from "ngeohash";

import "mapbox-gl/dist/mapbox-gl.css";

const GeohashMap = () => {
  const mapContainerRef = useRef<HTMLDivElement>();
  const mapRef = useRef<mapboxgl.Map>();
  const [searchParams] = useSearchParams();
  const refreshIntervalSeconds = Number(searchParams.get("timer") ?? 0);
  const url = searchParams.get("url");
  const mapLabel = searchParams.get("label");
  const [geohashCount, setGeohashCount] = useState(0);

  const decodeGeohashToFeature = (hash: string) => {
    const [minLat, minLon, maxLat, maxLon] = geohash.decode_bbox(hash);
    const { latitude, longitude } = geohash.decode(hash);

    new mapboxgl.Popup({ closeOnClick: false, closeButton: false })
      .setLngLat([longitude, latitude])
      .setHTML(`<text style="color: red;">${hash}</text>`)
      .addTo(mapRef.current!);

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
      properties: { geohash: hash },
    };
  };

  const drawGeohashBoundingBoxes = useCallback((geohashes: string[]) => {
    const features = geohashes.map(decodeGeohashToFeature);
    const geoJson = {
      type: "FeatureCollection",
      features,
    } as GeoJSON.FeatureCollection;

    const sourceId = "geohash-bboxes";

    if (!mapRef.current?.getSource(sourceId)) {
      mapRef.current?.addSource(sourceId, {
        type: "geojson",
        data: geoJson,
      });

      mapRef.current?.addLayer({
        id: `${sourceId}-fill`,
        type: "fill",
        source: sourceId,
        paint: {
          "fill-color": "#ff0000",
          "fill-opacity": 0.4,
        },
      });
    } else {
      const source = mapRef.current.getSource(
        sourceId
      ) as mapboxgl.GeoJSONSource;
      source.setData(geoJson);
    }
  }, []);

  const fetchGeohashesFromUrl = async (url: string) => {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch data");
      const data = await response.text();
      return data.trim().split("\n");
    } catch (error) {
      alert(error);
      return [];
    }
  };

  const refreshMap = useCallback(async () => {
    if (!mapRef.current) return;
    const geohashArray = searchParams.get("geohashes")?.split(",") || [];

    if (url) {
      const fetchedGeohashes = await fetchGeohashesFromUrl(url);
      geohashArray.push(...fetchedGeohashes);
    }

    if (geohashArray.length > 0) {
      setGeohashCount(geohashArray.length);
      drawGeohashBoundingBoxes(geohashArray);
    }
  }, [drawGeohashBoundingBoxes, searchParams, url]);

  useEffect(() => {
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_PUBLIC_KEY;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current!,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [90.4125, 23.8103],
      zoom: 18,
      maxPitch: 0,
    });

    mapRef.current.on("load", refreshMap);

    if (refreshIntervalSeconds) {
      const refreshIntervalInMS = refreshIntervalSeconds * 1000;
      const refreshIntervalId = setInterval(refreshMap, refreshIntervalInMS);

      return () => {
        mapRef.current?.remove();
        if (refreshIntervalId) {
          clearInterval(refreshIntervalId);
        }
      };
    }
  }, [refreshIntervalSeconds, refreshMap, searchParams]);

  return (
    <div
      style={{ height: "100vh", width: "100vw" }}
      ref={mapContainerRef}
      className="map-container"
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          position: "absolute",
          top: 10,
          left: 10,
          background: "white",
          padding: "10px",
          borderRadius: "5px",
          boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
          color: "black",
          zIndex: 1,
        }}
      >
        {mapLabel && (
          <div>
            <strong style={{ color: "red" }}>{mapLabel}</strong>
          </div>
        )}
        <div>
          <strong style={{ color: "red" }}>{geohashCount}</strong> locations
          displayed
        </div>
        {refreshIntervalSeconds > 0 && (
          <div>
            Refreshing every{" "}
            <strong style={{ color: "red" }}>{refreshIntervalSeconds}</strong>{" "}
            seconds
          </div>
        )}
      </div>
    </div>
  );
};

export default GeohashMap;
