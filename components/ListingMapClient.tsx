'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Navigation, MapPin, Compass } from 'lucide-react';
import { toast } from 'sonner';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Define an icon for the user's location
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface ListingMapProps {
  lat: number;
  lng: number;
  title: string;
}

export default function ListingMap({ lat, lng, title }: ListingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletMap.current) {
      leafletMap.current = L.map(mapRef.current).setView([lat, lng], 15);

      L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '© Google Maps'
      }).addTo(leafletMap.current);

      L.marker([lat, lng])
        .addTo(leafletMap.current)
        .bindPopup(`<b>${title}</b>`)
        .openPopup();
        
      setTimeout(() => {
        leafletMap.current?.invalidateSize();
      }, 500);
    }

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, [lat, lng, title]);

  // Haversine formula to calculate distance
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleCalculateDistance = () => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    toast.info('Finding your location...');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const dist = calculateDistance(latitude, longitude, lat, lng);
        setDistanceKm(dist);
        
        if (leafletMap.current) {
          // Remove old marker/line if they exist
          if (userMarkerRef.current) leafletMap.current.removeLayer(userMarkerRef.current);
          if (routeLineRef.current) leafletMap.current.removeLayer(routeLineRef.current);
          
          // Add user marker
          userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon })
            .addTo(leafletMap.current)
            .bindPopup('Your Location');
            
          // Draw line between user and listing
          routeLineRef.current = L.polyline([[latitude, longitude], [lat, lng]], { color: 'var(--primary)', weight: 3, dashArray: '5, 10' })
            .addTo(leafletMap.current);
            
          // Fit map to show both
          const bounds = L.latLngBounds([latitude, longitude], [lat, lng]);
          leafletMap.current.fitBounds(bounds, { padding: [50, 50] });
        }
        
        setIsLocating(false);
      },
      (error) => {
        toast.error('Could not get your location. ' + error.message);
        setIsLocating(false);
      }
    );
  };

  const handleGetDirections = () => {
    // Open Google Maps directions in a new tab
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  return (
    <div className="card" style={{ padding: '32px', marginBottom: '24px' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={20} /> Location & Map</h3>
      
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-sm" onClick={handleGetDirections} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Navigation size={16} /> Get Directions
        </button>
        <button className="btn btn-outline btn-sm" onClick={handleCalculateDistance} disabled={isLocating} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Compass size={16} /> {isLocating ? 'Locating...' : 'Distance from me'}
        </button>
        {distanceKm !== null && (
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', background: 'var(--success-light)', color: 'var(--success)', borderRadius: '6px', fontWeight: 500 }}>
            {distanceKm.toFixed(1)} km away
          </div>
        )}
      </div>

      <div ref={mapRef} style={{ width: '100%', height: '350px', borderRadius: '12px', zIndex: 1, border: '1px solid var(--border)' }} />
    </div>
  );
}
