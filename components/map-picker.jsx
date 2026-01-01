'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function MapPicker({ lat, lng, onLocationChange, dangerRadius, warningRadius, readonly = false }) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const dangerCircleRef = useRef(null);
  const warningCircleRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current || isLoaded) return;

    // Initialize map
    const map = L.map(mapRef.current).setView([lat || -6.2088, lng || 106.8456], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add marker
    const marker = L.marker([lat || -6.2088, lng || 106.8456], {
      draggable: !readonly
    }).addTo(map);

    markerRef.current = marker;

    // Add circles for radius visualization
    if (dangerRadius) {
      const dangerCircle = L.circle([lat || -6.2088, lng || 106.8456], {
        radius: dangerRadius,
        color: 'red',
        fillColor: '#ff0000',
        fillOpacity: 0.2
      }).addTo(map);
      dangerCircleRef.current = dangerCircle;
    }

    if (warningRadius) {
      const warningCircle = L.circle([lat || -6.2088, lng || 106.8456], {
        radius: warningRadius,
        color: 'orange',
        fillColor: '#ffa500',
        fillOpacity: 0.1
      }).addTo(map);
      warningCircleRef.current = warningCircle;
    }

    // Handle marker drag
    if (!readonly) {
      marker.on('dragend', function(e) {
        const position = e.target.getLatLng();
        onLocationChange?.(position.lat, position.lng);
        
        // Update circles
        if (dangerCircleRef.current) {
          dangerCircleRef.current.setLatLng(position);
        }
        if (warningCircleRef.current) {
          warningCircleRef.current.setLatLng(position);
        }
      });

      // Handle map click
      map.on('click', function(e) {
        marker.setLatLng(e.latlng);
        onLocationChange?.(e.latlng.lat, e.latlng.lng);
        
        // Update circles
        if (dangerCircleRef.current) {
          dangerCircleRef.current.setLatLng(e.latlng);
        }
        if (warningCircleRef.current) {
          warningCircleRef.current.setLatLng(e.latlng);
        }
      });
    }

    setIsLoaded(true);

    // Cleanup
    return () => {
      map.remove();
    };
  }, []);

  // Update marker position when lat/lng changes
  useEffect(() => {
    if (markerRef.current && lat && lng) {
      const newLatLng = L.latLng(lat, lng);
      markerRef.current.setLatLng(newLatLng);
      
      if (dangerCircleRef.current) {
        dangerCircleRef.current.setLatLng(newLatLng);
        dangerCircleRef.current.setRadius(dangerRadius || 0);
      }
      if (warningCircleRef.current) {
        warningCircleRef.current.setLatLng(newLatLng);
        warningCircleRef.current.setRadius(warningRadius || 0);
      }
    }
  }, [lat, lng, dangerRadius, warningRadius]);

  return (
    <div 
      ref={mapRef} 
      className="w-full h-[400px] rounded-lg border border-border"
      style={{ zIndex: 0 }}
    />
  );
}
