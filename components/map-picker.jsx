'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Default coordinates: Kota Madiun, Jawa Timur
const DEFAULT_LAT = -7.6298;
const DEFAULT_LNG = 111.5239;

// Reverse geocoding function using Nominatim
const reverseGeocode = async (lat, lng) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=id`,
      {
        headers: {
          'User-Agent': 'SiagaSekitar/1.0'
        }
      }
    );
    const data = await response.json();
    
    if (data && data.address) {
      const address = data.address;
      return {
        kelurahan: address.village || address.suburb || address.neighbourhood || address.hamlet || '',
        kecamatan: address.county || address.municipality || address.city_district || '',
        kota: address.city || address.town || address.city_district || address.county || '',
        provinsi: address.state || ''
      };
    }
    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
};

export default function MapPicker({ lat, lng, onLocationChange, onAddressChange, dangerRadius, warningRadius, readonly = false }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const dangerCircleRef = useRef(null);
  const warningCircleRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const isUserInteractionRef = useRef(false); // Track if update is from user action

  const handleLocationUpdate = async (newLat, newLng, isFromUserAction = false) => {
    // Set flag to prevent smart pan during user interaction
    if (isFromUserAction) {
      isUserInteractionRef.current = true;
    }

    // Update coordinates
    onLocationChange?.(newLat, newLng);
    
    // Fetch and update address if callback provided
    if (isFromUserAction && onAddressChange) {
      setIsLoadingAddress(true);
      const addressData = await reverseGeocode(newLat, newLng);
      if (addressData) {
        onAddressChange(addressData);
      }
      setIsLoadingAddress(false);
    }

    // Reset flag after a short delay
    setTimeout(() => {
      isUserInteractionRef.current = false;
    }, 100);
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current || isLoaded) return;

    // Initialize map
    const map = L.map(mapRef.current).setView([lat || DEFAULT_LAT, lng || DEFAULT_LNG], 13);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add search control
    const provider = new OpenStreetMapProvider({
      params: {
        countrycodes: 'id',
        addressdetails: 1,
      },
    });

    const searchControl = new GeoSearchControl({
      provider: provider,
      style: 'bar',
      showMarker: false,
      showPopup: false,
      autoClose: true,
      retainZoomLevel: false,
      animateZoom: true,
      keepResult: true,
      searchLabel: 'Cari alamat, kecamatan, kota...',
    });

    map.addControl(searchControl);

    // Add marker
    const marker = L.marker([lat || DEFAULT_LAT, lng || DEFAULT_LNG], {
      draggable: !readonly
    }).addTo(map);

    markerRef.current = marker;

    // Add circles for radius visualization
    if (dangerRadius) {
      const dangerCircle = L.circle([lat || DEFAULT_LAT, lng || DEFAULT_LNG], {
        radius: dangerRadius,
        color: 'red',
        fillColor: '#ff0000',
        fillOpacity: 0.2
      }).addTo(map);
      dangerCircleRef.current = dangerCircle;
    }

    if (warningRadius) {
      const warningCircle = L.circle([lat || DEFAULT_LAT, lng || DEFAULT_LNG], {
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
        handleLocationUpdate(position.lat, position.lng, true);
        
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
        const clickedLatLng = e.latlng;
        
        // Immediately update marker position (visual feedback)
        marker.setLatLng(clickedLatLng);
        
        // Update circles
        if (dangerCircleRef.current) {
          dangerCircleRef.current.setLatLng(clickedLatLng);
        }
        if (warningCircleRef.current) {
          warningCircleRef.current.setLatLng(clickedLatLng);
        }
        
        // Notify parent component
        handleLocationUpdate(clickedLatLng.lat, clickedLatLng.lng, true);
      });

      // Handle search result
      map.on('geosearch/showlocation', function(e) {
        const { x, y, raw } = e.location;
        const newLatLng = L.latLng(y, x);
        
        // Set user interaction flag
        isUserInteractionRef.current = true;
        
        marker.setLatLng(newLatLng);
        
        // Extract address from search result
        if (raw && raw.address && onAddressChange) {
          const address = raw.address;
          const addressData = {
            kelurahan: address.village || address.suburb || address.neighbourhood || address.hamlet || '',
            kecamatan: address.county || address.municipality || address.city_district || '',
            kota: address.city || address.town || address.city_district || address.county || '',
            provinsi: address.state || ''
          };
          onAddressChange(addressData);
        }
        
        // Only update coordinates, address already updated from search
        onLocationChange?.(y, x);
        
        // Update circles
        if (dangerCircleRef.current) {
          dangerCircleRef.current.setLatLng(newLatLng);
        }
        if (warningCircleRef.current) {
          warningCircleRef.current.setLatLng(newLatLng);
        }

        // Reset flag
        setTimeout(() => {
          isUserInteractionRef.current = false;
        }, 100);
      });
    }

    setIsLoaded(true);

    // Cleanup
    return () => {
      map.remove();
    };
  }, []);

  // Update marker position when lat/lng changes (from external source only)
  useEffect(() => {
    // Skip if this is a user interaction (marker already moved by user)
    if (isUserInteractionRef.current) {
      return;
    }

    if (markerRef.current && lat && lng && mapInstanceRef.current) {
      const newLatLng = L.latLng(lat, lng);
      const currentLatLng = markerRef.current.getLatLng();
      
      // Check if coordinates actually changed (avoid unnecessary updates)
      const latChanged = Math.abs(currentLatLng.lat - lat) > 0.000001;
      const lngChanged = Math.abs(currentLatLng.lng - lng) > 0.000001;
      
      if (!latChanged && !lngChanged) {
        return; // No change, skip update
      }
      
      markerRef.current.setLatLng(newLatLng);
      
      if (dangerCircleRef.current) {
        dangerCircleRef.current.setLatLng(newLatLng);
      }
      if (warningCircleRef.current) {
        warningCircleRef.current.setLatLng(newLatLng);
      }

      // Smart pan: Only pan if marker is outside current view
      const bounds = mapInstanceRef.current.getBounds();
      if (!bounds.contains(newLatLng)) {
        mapInstanceRef.current.panTo(newLatLng, {
          animate: true,
          duration: 0.5
        });
      }
    }
  }, [lat, lng]);

  // Update circle radius when dangerRadius or warningRadius changes
  useEffect(() => {
    if (dangerCircleRef.current && dangerRadius) {
      dangerCircleRef.current.setRadius(dangerRadius);
    }
    if (warningCircleRef.current && warningRadius) {
      warningCircleRef.current.setRadius(warningRadius);
    }
  }, [dangerRadius, warningRadius]);

  return (
    <div>
      <div 
        ref={mapRef} 
        className="w-full h-[400px] rounded-lg border border-border relative z-0"
      />
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-muted-foreground">
          💡 Gunakan kotak pencarian di peta untuk mencari alamat dengan mudah
        </p>
        {isLoadingAddress && (
          <p className="text-xs text-blue-600 font-medium">
            🔍 Mencari alamat...
          </p>
        )}
      </div>
    </div>
  );
}
