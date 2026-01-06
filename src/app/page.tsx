'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { MapPin, Activity, Shield, Plus, Edit, Trash2, RefreshCw, Smartphone, Battery } from 'lucide-react'

interface User {
  id: string
  email: string
  name: string | null
  role: 'ADMIN' | 'USER'
  isActive: boolean
}

interface Device {
  id: string
  deviceId: string
  name: string
  userId: string
  isActive: boolean
  lastSeen: string | null
  latitude: number | null
  longitude: number | null
  speedKmh: number | null
  heading: number | null
  motionState: string | null
  createdAt: string
  updatedAt: string
  _count: {
    locations: number
    captures: number
  }
}

export default function GPSDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showLogin, setShowLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [userData, setUserData] = useState<User | null>(null)

  // Device management state
  const [devices, setDevices] = useState<Device[]>([])
  const [loadingDevices, setLoadingDevices] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [deviceName, setDeviceName] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [apiError, setApiError] = useState('')

  // Load user data from localStorage only on client side
  useEffect(() => {
    if (typeof window === 'undefined') return

    const token = localStorage.getItem('auth-token')
    const userStr = localStorage.getItem('user')

    if (token && userStr) {
      try {
        setUserData(JSON.parse(userStr))
        setIsAuthenticated(true)
      } catch (err) {
        console.error('Failed to parse user data:', err)
      }
    }
  }, [])

  // Load devices on mount and when authenticated
  useEffect(() => {
    if (isAuthenticated && userData) {
      loadDevices()
    }
  }, [isAuthenticated, userData])

  const loadDevices = async () => {
    if (!isAuthenticated) return

    setLoadingDevices(true)
    setApiError('')

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null
    if (!token) return

    try {
      const response = await fetch('/api/devices', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load devices')
      }

      const data = await response.json()
      setDevices(data.devices || [])
    } catch (err) {
      console.error('Error loading devices:', err)
      setApiError('Failed to load devices')
    } finally {
      setLoadingDevices(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Login failed')
        return
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('auth-token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
      }
      setUserData(data.user)
      setIsAuthenticated(true)
      await loadDevices()
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Registration failed')
        return
      }

      setShowLogin(true)
      setError('Registration successful! Please login.')
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-token')
      localStorage.removeItem('user')
    }
    setUserData(null)
    setIsAuthenticated(false)
    setDevices([])
  }

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiError('')

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null
    if (!token) return

    try {
      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: deviceName,
          deviceId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setApiError(data.error || 'Failed to add device')
        return
      }

      setAddDialogOpen(false)
      setDeviceName('')
      setDeviceId('')
      await loadDevices()
    } catch (err) {
      console.error('Failed to add device:', err)
      setApiError('Failed to add device')
    }
  }

  const handleEditDevice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDevice) return

    setApiError('')

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null
    if (!token) return

    try {
      const response = await fetch(`/api/devices/${selectedDevice.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: deviceName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setApiError(data.error || 'Failed to update device')
        return
      }

      setEditDialogOpen(false)
      setDeviceName('')
      setSelectedDevice(null)
      await loadDevices()
    } catch (err) {
      console.error('Failed to update device:', err)
      setApiError('Failed to update device')
    }
  }

  const handleDeleteDevice = async () => {
    if (!selectedDevice) return

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null
    if (!token) return

    try {
      const response = await fetch(`/api/devices/${selectedDevice.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        setApiError('Failed to delete device')
        return
      }

      setDeleteDialogOpen(false)
      setSelectedDevice(null)
      await loadDevices()
    } catch (err) {
      console.error('Failed to delete device:', err)
      setApiError('Failed to delete device')
    }
  }

  const openEditDialog = (device: Device) => {
    setSelectedDevice(device)
    setDeviceName(device.name)
    setEditDialogOpen(true)
  }

  const openDeleteDialog = (device: Device) => {
    setSelectedDevice(device)
    setDeleteDialogOpen(true)
  }

  const getMotionStateColor = (state: string | null) => {
    switch (state) {
      case 'DRIVING':
        return 'bg-green-500'
      case 'WALKING':
        return 'bg-yellow-500'
      case 'STATIONARY':
        return 'bg-gray-500'
      default:
        return 'bg-gray-400'
    }
  }

  const formatLastSeen = (date: string | null) => {
    if (!date) return 'Never'
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return d.toLocaleDateString()
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">GPS Tracking Platform</h1>
            </div>
            <Badge variant="secondary">Phase 5: Device Management</Badge>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Welcome</CardTitle>
              <CardDescription>
                Sign in to access your GPS tracking dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={showLogin ? 'login' : 'register'} onValueChange={(v) => setShowLogin(v === 'login')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="•••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-name">Name</Label>
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="•••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Must be at least 8 characters with uppercase, lowercase, and number
                      </p>
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Creating account...' : 'Create Account'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </main>

        <footer className="border-t mt-auto">
          <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
            <p>© 2025 GPS Tracking Platform. Production-ready system.</p>
          </div>
        </footer>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">GPS Tracking Platform</h1>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline">
              <Shield className="h-3 w-3 mr-1" />
              {userData?.role}
            </Badge>
            {userData && (
              <span className="text-sm text-muted-foreground hidden sm:inline">{userData.email}</span>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {apiError && (
          <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-md">
            {apiError}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
              <Smartphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{devices.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Registered devices</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Devices</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {devices.filter(d => d.isActive).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Currently tracking</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Phase</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">5</div>
              <p className="text-xs text-muted-foreground mt-1">Device Management</p>
            </CardContent>
          </Card>
        </div>

        {/* Device List Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>My Devices</CardTitle>
                <CardDescription>
                  Manage and track your GPS devices
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadDevices}
                  disabled={loadingDevices}
                >
                  <RefreshCw className={`h-4 w-4 ${loadingDevices ? 'animate-spin' : ''}`} />
                </Button>
                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Device
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent className="min-h-[500px]">
            {loadingDevices ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading devices...
              </div>
            ) : devices.length === 0 ? (
              <div className="text-center py-12">
                <Smartphone className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No devices registered</h3>
                <p className="text-muted-foreground mb-4">
                  Add a GPS device to start tracking its location
                </p>
                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Device
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {devices.map((device) => (
                  <Card key={device.id} className="relative">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{device.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {device.deviceId}
                          </CardDescription>
                        </div>
                        <Badge variant={device.isActive ? 'default' : 'secondary'}>
                          {device.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Location Info */}
                      {device.latitude !== null && device.longitude !== null && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Location</span>
                            <span className="text-sm font-mono">
                              {device.latitude.toFixed(4)}, {device.longitude.toFixed(4)}
                            </span>
                          </div>
                          {device.speedKmh !== null && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Speed</span>
                              <span className="text-sm">{device.speedKmh.toFixed(1)} km/h</span>
                            </div>
                          )}
                          {device.motionState && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">State</span>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${getMotionStateColor(device.motionState)}`} />
                                <span className="text-sm">{device.motionState}</span>
                              </div>
                            </div>
                          )}
                          {device.lastSeen && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Last Seen</span>
                              <span className="text-sm">
                                {formatLastSeen(device.lastSeen)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* No Location Yet */}
                      {device.latitude === null && (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          No location data yet
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        <span>{device._count.locations} locations</span>
                        <span>{device._count.captures} photos</span>
                      </div>

                      {/* Edit/Delete Buttons */}
                      <div className="flex gap-2 mt-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => openEditDialog(device)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                          onClick={() => openDeleteDialog(device)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Platform Progress</CardTitle>
            <CardDescription>Phase completion status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span>Phase 1: Database Schema</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span>Phase 2: Authentication</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span>Phase 3: WebSocket Infrastructure</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span>Phase 4: GPS Tracking APIs</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span>Phase 5: Device Management UI</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-600">○</span>
              <span>Phase 6: Interactive Map (Next)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">○</span>
              <span>Phase 7: Mobile PWA Interface</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">○</span>
              <span>Phase 8: Location History & Timeline</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">○</span>
              <span>Phase 9: Camera Integration (Optional)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">○</span>
              <span>Phase 10: Testing & Documentation</span>
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>© 2025 GPS Tracking Platform. Production-ready system.</p>
        </div>
      </footer>

      {/* Add Device Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Device</DialogTitle>
            <DialogDescription>
              Register a new GPS-enabled device for tracking
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddDevice} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="device-name">Device Name</Label>
              <Input
                id="device-name"
                placeholder="e.g., John's Phone"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="device-id">Device ID</Label>
              <Input
                id="device-id"
                placeholder="e.g., phone-001"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Device</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Device Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Device</DialogTitle>
            <DialogDescription>
              Update device information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditDevice} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-device-name">Device Name</Label>
              <Input
                id="edit-device-name"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Device Alert */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Device</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedDevice?.name}"? This action cannot be undone and all location history will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDevice} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
