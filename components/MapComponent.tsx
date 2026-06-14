'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MAP_CENTER, MAP_ZOOM } from '@/lib/data';
import type { Zone } from '@/types';

interface MapComponentProps {
  zones: Zone[];
  selectedZoneId?: number;
  onZoneSelect?: (id: number) => void;
  interactive?: boolean;
}

export default function MapComponent({ zones, selectedZoneId, onZoneSelect, interactive = true }: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const polygonLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        zoomControl: interactive,
        dragging: interactive,
        scrollWheelZoom: interactive ? 'center' : false,
      }).setView(MAP_CENTER, MAP_ZOOM);

      L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps'
      }).addTo(mapRef.current);

      polygonLayerRef.current = L.layerGroup().addTo(mapRef.current);
    }

    const map = mapRef.current;
    const polygonGroup = polygonLayerRef.current;
    
    if (polygonGroup) {
      polygonGroup.clearLayers();

      const defaultStyle = {
        color: '#1a5c45',
        weight: 2,
        fillColor: '#1a5c45',
        fillOpacity: 0.1
      };
      
      const selectedStyle = {
        color: '#2e7d5a',
        weight: 3,
        fillColor: '#2e7d5a',
        fillOpacity: 0.3
      };

      zones.forEach(zone => {
        if (!zone.polygon) return;
        const isSelected = selectedZoneId === zone.id || selectedZoneId === zone.zone_id;
        
        const polygon = L.polygon(zone.polygon as [number, number][], isSelected ? selectedStyle : defaultStyle);
        
        if (interactive) {
          polygon.bindTooltip(`<b>${zone.name || zone.zone_name}</b>`, { direction: 'top', sticky: true });
          polygon.on('mouseover', () => {
             if (selectedZoneId !== zone.id && selectedZoneId !== zone.zone_id) {
               polygon.setStyle({ fillOpacity: 0.2 });
             }
          });
          polygon.on('mouseout', () => {
             if (selectedZoneId !== zone.id && selectedZoneId !== zone.zone_id) {
               polygon.setStyle({ fillOpacity: 0.1 });
             }
          });
          polygon.on('click', () => {
            if (onZoneSelect) onZoneSelect(zone.id || zone.zone_id);
          });
        }
        
        polygon.addTo(polygonGroup);

        if (isSelected && map) {
          map.fitBounds(polygon.getBounds(), { padding: [20, 20] });
        }
      });
    }

    return () => {
      // Don't destroy map on unmount to prevent leaflet errors in React strict mode
      // Let it persist or handle carefully if needed
    };
  }, [zones, selectedZoneId, interactive, onZoneSelect]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />;
}
