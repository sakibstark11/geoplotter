import { LegacyRef, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import geoHash from "ngeohash";

import "mapbox-gl/dist/mapbox-gl.css";

const GeoHashMap = () => {
  const mapContainerRef = useRef<HTMLDivElement>();
  const mapRef = useRef<mapboxgl.Map>();
  const [searchParams] = useSearchParams();
  const refreshIntervalSeconds = Number(searchParams.get("timer") ?? 0);
  const [geoHashCount, setGeoHashCount] = useState(0);

  const decodeGeoHashToFeature = (hash: string) => {
    const [minLat, minLon, maxLat, maxLon] = geoHash.decode_bbox(hash);
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
    };
  };

  const drawGeoHashBoundingBoxes = useCallback(
    (geoHashes: { color: string; geoHashes: string[]; id: string }[]) => {
      geoHashes.forEach(({ geoHashes, color, id }) => {
        const features = geoHashes.map((hash) => {
          const { latitude, longitude } = geoHash.decode(hash);
          new mapboxgl.Popup({ closeOnClick: false, closeButton: false })
            .setLngLat([longitude, latitude])
            .setHTML(`<text style="color: ${color}; font-weight: bold">${hash}</text>`)
            .addTo(mapRef.current!);
          return decodeGeoHashToFeature(hash);
        });
        const geoJson = {
          type: "FeatureCollection",
          features,
        } as GeoJSON.FeatureCollection;

        const sourceId = `geoHash-bboxes-${id}`;
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
              "fill-color": color,
              "fill-opacity": 0.4,
            },
          });
        } else {
          const source = mapRef.current.getSource(
            sourceId
          ) as mapboxgl.GeoJSONSource;
          source.setData(geoJson);
        }
      });
    },
    []
  );

  const fetchGeoHashesFromUrl = async (url: string) => {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch data");
      const data = await response.text();
      return data.trim().split("\n");
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  const refreshMap = useCallback(async () => {
    if (!mapRef.current) return;
    const urls = searchParams.get("urls")?.split(",") || [];
    const colors = searchParams.get("colors")?.split(",") || [];
    const geoHashes = searchParams.get("geohashes")?.split(",") || [];

    if (urls) {
      const fetchedGeoHashes = await Promise.all(
        urls.map(async (url) => fetchGeoHashesFromUrl(url))
      );
      setGeoHashCount(
        fetchedGeoHashes.reduce((acc, curr) => acc + curr.length, 0)
      );
      drawGeoHashBoundingBoxes(
        fetchedGeoHashes.map((arr, index) => ({
          color: `#${colors[index]}`,
          geoHashes: arr,
          id: `url-${index}`,
        }))
      );
    }

    if (geoHashes) {
      setGeoHashCount((prev) => prev + geoHashes.length);
      drawGeoHashBoundingBoxes([
        { color: `#a85e32`, geoHashes: geoHashes, id: "manual" },
      ]);
    }
  }, [drawGeoHashBoundingBoxes, searchParams]);

  useEffect(() => {
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_PUBLIC_KEY;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current!,
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
      ref={mapContainerRef as LegacyRef<HTMLDivElement>}
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
        <div>
          <strong style={{ color: "red" }}>{geoHashCount}</strong> locations
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

export default GeoHashMap;
