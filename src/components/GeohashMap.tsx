import { LegacyRef, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import geohash from "ngeohash";

import "mapbox-gl/dist/mapbox-gl.css";

const GeohashMap = () => {
  const mapContainerRef = useRef<HTMLDivElement>();
  const mapRef = useRef<mapboxgl.Map>();
  const [searchParams] = useSearchParams();
  const [geohashCount, setGeohashCount] = useState(0);
  const refreshInterval = searchParams.get("timer");

  const decodeGeohashToFeature = (hash: string) => {
    const [minLat, minLon, maxLat, maxLon] = geohash.decode_bbox(hash);
    const { latitude, longitude } = geohash.decode(hash);

    // Add popup
    new mapboxgl.Popup({ closeOnClick: false, closeButton: false })
      .setLngLat([longitude, latitude])
      .setHTML(`<text style="color: red;">${hash}</text>`)
      .addTo(mapRef.current!);

    // Return GeoJSON feature
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
    const url = searchParams.get("url");

    if (url) {
      const fetchedGeohashes = await fetchGeohashesFromUrl(url);
      geohashArray.push(...fetchedGeohashes);
    }

    if (geohashArray.length > 0) {
      setGeohashCount(geohashArray.length);
      drawGeohashBoundingBoxes(geohashArray);
    }
  }, [drawGeohashBoundingBoxes, searchParams]);

  useEffect(() => {
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_PUBLIC_KEY;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current!,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [90.4125, 23.8103],
      zoom: 17,
      pitch: 45,
    });

    mapRef.current.on("load", refreshMap);

    if (refreshInterval) {
      const refreshIntervalInMS =
        parseInt(searchParams.get("timer") ?? "0", 10) * 1000;
      const refreshIntervalId = setInterval(refreshMap, refreshIntervalInMS);

      return () => {
        mapRef.current?.remove();
        if (refreshIntervalId) {
          clearInterval(refreshIntervalId);
        }
      };
    }
  }, [refreshMap, searchParams]);

  return (
    <>
      <div
        ref={mapContainerRef as LegacyRef<HTMLDivElement>}
        style={{ height: "100vh", width: "100vw" }}
        className="map-container"
      />
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          background: "white",
          padding: "5px",
          borderRadius: "5px",
          color: "black",
        }}
      >
        <strong
          style={{
            color: "red",
          }}
        >
          {geohashCount}{" "}
        </strong>{" "}
        locations displayed
      </div>
      <div
        style={{
          position: "absolute",
          top: 46,
          left: 10,
          background: "white",
          padding: "5px",
          borderRadius: "5px",
          color: "black",
        }}
      >
        Refreshing every{" "}
        <strong
          style={{
            color: "red",
          }}
        >
          {refreshInterval}{" "}
        </strong>
        seconds
      </div>
    </>
  );
};

export default GeohashMap;
