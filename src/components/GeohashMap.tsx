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

  const drawGeoHashBoundingBoxes = useCallback(
    (geoHashes: { color: string; geoHashes: string[]; id: string }[]) => {
      const groupedGeoHashes = geoHashes
        .flatMap(({ geoHashes, color }) =>
          geoHashes.map((hash) => ({
            hash,
            color,
            ...geoHash.decode(hash),
          }))
        )
        .reduce((acc, { hash, color, latitude, longitude }) => {
          const key = `${hash}-${color}`;
          if (!acc[key]) {
            acc[key] = { color, count: 0, lat: latitude, lng: longitude };
          }
          acc[key].count += 1;
          return acc;
        }, {} as Record<string, { color: string; count: number; lat: number; lng: number }>);

      Object.values(groupedGeoHashes).forEach(({ color, count, lat, lng }) => {
        new mapboxgl.Popup({
          closeOnClick: false,
          closeButton: false,
        })
          .setHTML(`<strong style="color: ${color}">${count}</strong>`)
          .setLngLat([lng, lat])
          .addTo(mapRef.current!)

      });
    },
    []
  );

  const fetchGeoHashesFromUrl = async (url: string) => {
    try {
      const response = await fetch(url, { cache: "no-store" });
      return response.ok ? (await response.text()).trim().split("\n").filter((hash) => !!hash) : [];
    } catch {
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
        urls.map(fetchGeoHashesFromUrl)
      );
      setGeoHashCount(
        fetchedGeoHashes.reduce((acc, curr) => acc + curr.length, 0)
      );
      drawGeoHashBoundingBoxes(
        fetchedGeoHashes.map((arr, index) => ({
          color: `#${colors[index] ?? "FF0000"}`,
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
      zoom: 10,
    });
    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    mapRef.current.on("load", refreshMap);

    const centerMarker = new mapboxgl.Marker({ color: "orange" })
      .setLngLat(mapRef.current.getCenter())
      .addTo(mapRef.current);

    const updateCenterMarker = () => {
      if (mapRef.current) {
        const center = mapRef.current.getCenter();
        centerMarker.setLngLat(center);
        return center
      }
    };

    mapRef.current.on("move", updateCenterMarker);

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
