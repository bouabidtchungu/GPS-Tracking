'use client'

import { useEffect, useRef } from 'react'
import { createDeviceMarkerIcon, getMotionStateColor, DEFAULT_CENTER, DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM, TILE_LAYER_URL, TILE_ATTRIBUTION } from '@/lib/map-utils'

interface Device {
  id: string
  deviceId: string
  name: string
  latitude: number | null
  longitude: number | null
  speedKmh: number | null
  heading: number | null
  motionState: string | null
  lastSeen: string | null
}

interface MapProps {
  devices: Device[]
  onDeviceClick?: (device: Device) => void
  className?: string
}

export default function GPSMap({ devices, onDeviceClick, className = '' }: MapProps) {
  const mapRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const [L, setL] = useState<any>(null)

  // Dynamically import Leaflet only on client
  useEffect(() => {
    import('leaflet').then((leafletModule) => {
      import('leaflet/dist/leaflet.css')
      setL(leafletModule.default)
    })
  }, [])

  // Initialize map
  useEffect(() => {
    if (!L || typeof window === 'undefined') return

    // Create map instance
    const map = L.map('gps-map', {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
    })

    // Add tile layer
    L.tileLayer(TILE_LAYER_URL, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: MAX_ZOOM,
    }).addTo(map)

    mapRef.current = map

    // Cleanup
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [L])

  // Update markers when devices change
  useEffect(() => {
    if (!mapRef.current || !L) return

    const map = mapRef.current
    const currentMarkers = markersRef.current

    // Get active devices with locations
    const activeDevices = devices.filter(
      (device) => device.latitude !== null && device.longitude !== null
    )

    // Remove markers for devices no longer in list
    const deviceIds = new Set(activeDevices.map((d) => d.id))
    for (const [deviceId, marker] of currentMarkers.entries()) {
      if (!deviceIds.has(deviceId)) {
        marker.remove()
        currentMarkers.delete(deviceId)
      }
    }

    // Add or update markers
    activeDevices.forEach((device) => {
      const color = getMotionStateColor(device.motionState)
      const icon = createDeviceMarkerIcon(device.heading, color)

      if (currentMarkers.has(device.id)) {
        // Update existing marker
        const marker = currentMarkers.get(device.id)!
        marker.setLatLng([device.latitude!, device.longitude!])
        if (icon) {
          marker.setIcon(icon)
        }
      } else {
        // Create new marker
        const marker = L.marker([device.latitude!, device.longitude!], {
          icon,
          title: device.name,
        }).addTo(map)

        // Create popup content
        const popupContent = `
          <div style="min-width: 200px;">
            <h3 style="font-weight: 600; font-size: 1.125rem; margin-bottom: 0.5rem;">${device.name}</h3>
            <p style="font-size: 0.875rem; color: #64748b;">${device.deviceId}</p>
            <div style="margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.25rem;">
              <div style="display: flex; justify-content: space-between;">
                <span style="font-size: 0.875rem; color: #64748b;">Status:</span>
                <span style="font-size: 0.875rem; font-weight: 500;">${device.motionState || 'Unknown'}</span>
              </div>
              ${device.speedKmh !== null ? `
                <div style="display: flex; justify-content: space-between;">
                  <span style="font-size: 0.875rem; color: #64748b;">Speed:</span>
                  <span style="font-size: 0.875rem; font-weight: 500;">${device.speedKmh.toFixed(1)} km/h</span>
                </div>
              ` : ''}
              ${device.heading !== null ? `
                <div style="display: flex; justify-content: space-between;">
                  <span style="font-size: 0.875rem; color: #64748b;">Heading:</span>
                  <span style="font-size: 0.875rem; font-weight: 500;">${device.heading.toFixed(0)}°</span>
                </div>
              ` : ''}
              ${device.lastSeen ? `
                <div style="display: flex; justify-content: space-between;">
                  <span style="font-size: 0.875rem; color: #64748b;">Last Seen:</span>
                  <span style="font-size: 0.875rem; font-weight: 500;">${new Date(device.lastSeen).toLocaleString()}</span>
                </div>
              ` : ''}
            </div>
          </div>
        `

        marker.bindPopup(popupContent)

        // Add click handler
        marker.on('click', () => {
          if (onDeviceClick) {
            onDeviceClick(device)
          }
        })

        currentMarkers.set(device.id, marker)
      }
    })

    // Fit bounds if there are devices
    if (activeDevices.length > 0) {
      const latitudes = activeDevices.map((d) => d.latitude!)
      const longitudes = activeDevices.map((d) => d.longitude!)

      const bounds = [
        [Math.min(...latitudes), Math.min(...longitudes)],
        [Math.max(...latitudes), Math.max(...longitudes)],
      ] as [[number, number], [number, number]]

      // Add padding
      const latPadding = (bounds[1][0] - bounds[0][0]) * 0.1
      const lngPadding = (bounds[1][1] - bounds[0][1]) * 0.1

      const paddedBounds = [
        [bounds[0][0] - latPadding, bounds[0][1] - lngPadding],
        [bounds[1][0] + latPadding, bounds[1][1] + lngPadding],
      ]

      map.fitBounds(paddedBounds, { padding: [50, 50] })
    }
  }, [devices, onDeviceClick, L])

  return (
    <div
      id="gps-map"
      className={`w-full h-full min-h-[400px] rounded-lg ${className}`}
      style={{ zIndex: 0 }}
    />
  )
}
