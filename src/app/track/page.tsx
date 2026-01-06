'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Activity, Shield, Power } from 'lucide-react'

interface User {
  id: string
  email: string
  name: string | null
  role: 'ADMIN' | 'USER'
  isActive: boolean
}

export default function TrackingPage() {
  const [isTracking, setIsTracking] = useState(false)
  const [deviceId, setDeviceId] = useState('')
  const [error, setError] = useState('')
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [speed, setSpeed] = useState<number | null>(null)
  const [userData, setUserData] = useState<User | null>(null)

  const watchIdRef = useRef<number | null>(null)

  // Load user data from localStorage only on client side
  useEffect(() => {
    if (typeof window === 'undefined') return

    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        setUserData(JSON.parse(userStr))
      } catch (err) {
        console.error('Failed to parse user data:', err)
      }
    }
  }, [])

  const handleStartTracking = async () => {
    setError('')

    // Check if device ID is provided
    if (!deviceId) {
      setError('Please enter a device ID')
      return
    }

    // Get user's devices to validate
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null
    if (!token) {
      setError('Not authenticated. Please login first.')
      return
    }

    try {
      const response = await fetch('/api/devices', {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch devices')
      }

      const data = await response.json()
      const devices = data.devices || []

      // Check if device exists and belongs to user
      const device = devices.find((d: any) => d.deviceId === deviceId)
      if (!device) {
        setError('Device not found or not authorized')
        return
      }

      // Request GPS permission
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setError('Geolocation is not supported by your browser')
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
          setAccuracy(position.coords.accuracy)
          setIsTracking(true)

          // Start watching position
          startWatching()
        },
        (err) => {
          setError(`GPS Error: ${err.message}`)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      )
    } catch (err) {
      setError('Failed to validate device')
      console.error(err)
    }
  }

  const startWatching = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }

        setLocation(newLocation)
        setAccuracy(position.coords.accuracy)

        // Calculate speed if available
        let speedKmh: number | null = null
        if (position.coords.speed !== null) {
          speedKmh = position.coords.speed * 3.6 // Convert m/s to km/h
          setSpeed(speedKmh)
        }

        // Send location update via API
        if (deviceId) {
          const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null
          if (token) {
            fetch('/api/locations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                deviceId,
                latitude: newLocation.lat,
                longitude: newLocation.lng,
                accuracy: position.coords.accuracy,
                altitude: position.coords.altitude,
                heading: position.coords.heading,
                speedKmh,
                timestamp: new Date().toISOString(),
              }),
            }).catch(err => console.error('Failed to send location update:', err))
          }
        }
      },
      (err) => {
        console.error('GPS error:', err)
        setError(`GPS Error: ${err.message}`)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  const stopWatching = () => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }

  const handleStopTracking = () => {
    stopWatching()
    setIsTracking(false)
    setLocation(null)
    setAccuracy(null)
    setSpeed(null)
  }

  const determineMotionState = (speedKmh: number | null): string => {
    if (speedKmh === null || speedKmh === undefined) {
      return 'UNKNOWN'
    }
    if (speedKmh < 2) {
      return 'STATIONARY'
    } else if (speedKmh < 10) {
      return 'WALKING'
    } else {
      return 'DRIVING'
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">GPS Tracking</h1>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline">
              <Shield className="h-3 w-3 mr-1" />
              {userData?.role || 'USER'}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => (window.location.href = '/')}>
              Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-6">
          {/* Tracking Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Location Sharing</CardTitle>
                <Badge variant={isTracking ? 'default' : 'secondary'}>
                  {isTracking ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-6">
                <div
                  className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                    isTracking ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                >
                  {isTracking ? (
                    <Activity className="h-8 w-8 text-white" />
                  ) : (
                    <MapPin className="h-8 w-8 text-white" />
                  )}
                </div>
                <p className="text-lg font-semibold mb-1">
                  {isTracking ? 'Tracking Active' : 'Tracking Stopped'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isTracking
                    ? 'Your location is being shared'
                    : 'Your location is not being shared'}
                </p>
              </div>

              {!isTracking && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="device-id" className="text-sm font-medium">
                      Device ID
                    </label>
                    <input
                      id="device-id"
                      type="text"
                      value={deviceId}
                      onChange={(e) => setDeviceId(e.target.value)}
                      placeholder="Enter your device ID"
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                      {error}
                    </div>
                  )}

                  <Button onClick={handleStartTracking} className="w-full" size="lg">
                    <Activity className="h-4 w-4 mr-2" />
                    Start Tracking
                  </Button>
                </div>
              )}

              {isTracking && (
                <div className="space-y-4">
                  <Button onClick={handleStopTracking} variant="destructive" className="w-full" size="lg">
                    <Power className="h-4 w-4 mr-2" />
                    Stop Tracking
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Your location will no longer be shared
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location Info Card */}
          {location && (
            <Card>
              <CardHeader>
                <CardTitle>Current Location</CardTitle>
                <CardDescription>
                  Last updated location data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Latitude</span>
                  <span className="text-sm font-mono font-medium">
                    {location.lat.toFixed(6)}°
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Longitude</span>
                  <span className="text-sm font-mono font-medium">
                    {location.lng.toFixed(6)}°
                  </span>
                </div>
                {accuracy !== null && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Accuracy</span>
                    <span className="text-sm font-medium">
                      {accuracy.toFixed(0)}m
                    </span>
                  </div>
                )}
                {speed !== null && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Speed</span>
                    <span className="text-sm font-medium">
                      {speed.toFixed(1)} km/h
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy Notice
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                • Your location is only shared while tracking is active
              </p>
              <p>
                • Location data is transmitted securely
              </p>
              <p>
                • You can stop tracking at any time
              </p>
              <p>
                • Only devices you have registered can be tracked
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>© 2025 GPS Tracking Platform. Production-ready system.</p>
        </div>
      </footer>
    </div>
  )
}
