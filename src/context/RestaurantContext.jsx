import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const RestaurantContext = createContext({})

export const RestaurantProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    name: 'Our Restaurant',
    tagline: 'Crafted with love, served with passion',
    is_open: true,
    delivery_charge: 40,
    tax_percent: 5,
    address: '123 Food Street, City, State 560001',
    phone: '+91 98765 43210',
    email: 'hello@ourrestaurant.com',
    about: 'Founded with a simple vision — to bring people together over exceptional food. Every dish is crafted from scratch using the freshest ingredients.',
    google_maps_url: 'https://maps.google.com',
    opening_hours: 'Mon–Fri: 11:00 AM – 11:00 PM | Sat–Sun: 10:00 AM – 11:30 PM',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSettings()
    const channel = supabase.channel('restaurant_settings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'restaurant_settings' }, payload => {
        setSettings(prev => ({ ...prev, ...payload.new }))
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const fetchSettings = async () => {
    const { data } = await supabase.from('restaurant_settings').select('*').eq('id', 1).single()
    if (data) setSettings(data)
    setLoading(false)
  }

  const updateSettings = async (updates) => {
    const { error } = await supabase.from('restaurant_settings').update(updates).eq('id', 1)
    if (!error) setSettings(prev => ({ ...prev, ...updates }))
    return { error }
  }

  return (
    <RestaurantContext.Provider value={{ settings, loading, updateSettings, fetchSettings }}>
      {children}
    </RestaurantContext.Provider>
  )
}

export const useRestaurant = () => useContext(RestaurantContext)
