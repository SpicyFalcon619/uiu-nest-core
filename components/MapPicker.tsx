'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet icon paths in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationChange: (lat: number, lng: number) => void;
  zonePolygon?: [number, number][];
}

export default function MapPicker({ initialLat = 23.7979, initialLng = 90.4497, onLocationChange, zonePolygon }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const polygonLayer = useRef<L.Polygon | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletMap.current) {
      leafletMap.current = L.map(mapRef.current).setView([initialLat, initialLng], 14);

      L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '© Google Maps'
      }).addTo(leafletMap.current);

      marker.current = L.marker([initialLat, initialLng], { draggable: true }).addTo(leafletMap.current);

      marker.current.on('dragend', () => {
        const pos = marker.current?.getLatLng();
        if (pos) {
          onLocationChange(pos.lat, pos.lng);
        }
      });

      leafletMap.current.on('click', (e: L.LeafletMouseEvent) => {
        marker.current?.setLatLng(e.latlng);
        onLocationChange(e.latlng.lat, e.latlng.lng);
      });
    }

    // Handle zone polygon updates
    if (leafletMap.current) {
      if (polygonLayer.current) {
        leafletMap.current.removeLayer(polygonLayer.current);
      }

      if (zonePolygon && zonePolygon.length > 0) {
        polygonLayer.current = L.polygon(zonePolygon, {
          color: 'var(--primary)',
          fillColor: 'var(--primary)',
          fillOpacity: 0.15,
          weight: 2
        }).addTo(leafletMap.current);

        leafletMap.current.fitBounds(polygonLayer.current.getBounds(), { padding: [20, 20] });
        
        // Also move marker to center of polygon if it wasn't specifically dragged yet
        // For simplicity, we just rely on user clicking.
      }
      
      // Invalidate size to prevent grey boxes when rendered inside a modal
      setTimeout(() => {
        leafletMap.current?.invalidateSize();
      }, 100);
      setTimeout(() => {
        leafletMap.current?.invalidateSize();
      }, 500);
    }

    return () => {
      // Cleanup happens on unmount
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update polygon if it changes after mount
  useEffect(() => {
    if (leafletMap.current && zonePolygon && zonePolygon.length > 0) {
      if (polygonLayer.current) {
        leafletMap.current.removeLayer(polygonLayer.current);
      }
      polygonLayer.current = L.polygon(zonePolygon, {
        color: 'var(--primary)',
        fillColor: 'var(--primary)',
        fillOpacity: 0.15,
        weight: 2
      }).addTo(leafletMap.current);
      leafletMap.current.fitBounds(polygonLayer.current.getBounds(), { padding: [20, 20] });
    }
  }, [zonePolygon]);

  return <div ref={mapRef} style={{ width: '100%', height: '300px', borderRadius: '8px', zIndex: 1 }} />;
}
