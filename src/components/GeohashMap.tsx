import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import geohash from 'ngeohash';

import 'mapbox-gl/dist/mapbox-gl.css';

const GeohashMap = () => {
  const mapContainerRef = useRef<HTMLDivElement>();
  const mapRef = useRef<mapboxgl.Map>();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    mapboxgl.accessToken = process.env.VITE_MAPBOX_PUBLIC_KEY as string;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current as HTMLDivElement,
      center: [90.4125, 23.8103],
      zoom: 9,
    });

    mapRef.current.on('load', () => {
      addGeohashPins();
    });
  }, []);

  const addGeohashPins = () => {
    if (!mapRef.current) return;

    const geohashes = searchParams.get('geohashes');
    if (!geohashes) return;

    const geohashArray = geohashes.split(',');

    geohashArray.forEach((hash) => {
      const { latitude, longitude } = geohash.decode(hash);

      new mapboxgl.Marker()
        .setLngLat([longitude, latitude])
        .addTo(mapRef.current as mapboxgl.Map);

      new mapboxgl.Popup({
        closeOnClick: false,
        closeButton: false,
      })
        .setLngLat([longitude, latitude])
        .setHTML(`<text style="color: red;">${hash}</text>`)
        .addTo(mapRef.current as mapboxgl.Map);
    });

  };
  return (
    <div
      style={{ height: '100vh', width: '100vw' }}
      ref={mapContainerRef as React.RefObject<HTMLDivElement>}
      className="map-container"
    />
  );
};




export default GeohashMap;
