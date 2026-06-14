'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { MAP_CENTER, MAP_ZOOM } from '@/lib/data';
import type { Zone } from '@/types';

// Leaflet needs window object, so we load it dynamically with ssr: false
const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => <div style={{ height: '100%', width: '100%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading map...</div>
});

interface MapViewProps {
  zones: Zone[];
  selectedZoneId?: number;
  onZoneSelect?: (id: number) => void;
  interactive?: boolean;
}

export default function MapView(props: MapViewProps) {
  // We wrap the map in a mounted check, though dynamic with ssr: false usually handles it
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div style={{ height: '100%', width: '100%', background: '#e2e8f0' }} />;

  return <MapComponent {...props} />;
}
