import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRestaurant } from '../context/RestaurantContext'
import { supabase } from '../lib/supabase'
import { playNotificationSound, setCustomSound, getCustomSound, unlockAudio } from '../lib/sounds'
import { sendPushNotification } from '../lib/pushNotifications'
import { formatDate, formatDateTime } from '../lib/utils'
import { NotificationQueue } from '../components/ui/NotificationPopup'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, UtensilsCrossed, Star as StarIcon, Tag, Settings, Package,
  LogOut, ToggleLeft, ToggleRight, Plus, Pencil, Trash2, Eye, EyeOff,
  Phone, MapPin, User, Users, ChevronDown, ChevronUp, Key, Download, Filter,
  Volume2, X, FileText, Save
} from 'lucide-react'

const TABS = [
  { id: 'orders', label: 'Live Orders', icon: Package },
  { id: 'menu', label: 'Menu Items', icon: UtensilsCrossed },
  { id: 'special', label: "Today's Special", icon: StarIcon },
  { id: 'coupons', label: 'Coupons', icon: Tag },
  { id: 'categories', label: 'Categories', icon: LayoutDashboard },
  { id: 'reviews', label: 'Reviews', icon: StarIcon },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'tables', label: 'Tables', icon: LayoutDashboard },
  { id: 'history', label: 'Order History', icon: LayoutDashboard },
]

const STATUS_OPTIONS = [
  { value: 'placed', label: '📋 Placed' },
  { value: 'preparing', label: '👨‍🍳 Preparing' },
  { value: 'out_for_delivery', label: '🛵 Out for Delivery' },
  { value: 'delivered', label: '✅ Delivered' },
  { value: 'cancelled', label: '❌ Cancelled' },
]

/* NewOrderPopup replaced by unified NotificationPopup */

export default function OwnerDashboard() {
  const { isOwner, ownerLogout } = useAuth()
  const { settings, updateSettings } = useRestaurant()
  const navigate = useNavigate()
  const [tab, setTab] = useState('orders')

  const { loading: authLoading } = useAuth()

  useEffect(() => {
    // Unlock audio on first interaction — required by browser autoplay policy
    const unlock = () => { unlockAudio(); document.removeEventListener('click', unlock) }
    document.addEventListener('click', unlock)
    return () => document.removeEventListener('click', unlock)
  }, [])

  useEffect(() => {
    // Wait until auth has finished loading before checking ownership
    // This prevents the "Access denied" flash on page load
    if (!authLoading && !isOwner) {
      navigate('/')
      toast.error('Access denied')
    }
  }, [isOwner, authLoading])

  if (authLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center text-gray-400">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p>Loading...</p>
      </div>
    </div>
  )
  if (!isOwner) return null

  return (
    <div className="pt-16 min-h-screen bg-gray-50">

      <div className="flex h-[calc(100vh-64px)]">
        <aside className="w-56 bg-white border-r border-gray-100 flex flex-col shrink-0">
          <div className="p-5 border-b border-gray-100">
            <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Owner Panel</div>
            <div className="font-display text-base font-bold text-gray-900 mt-1 leading-tight">{settings.name}</div>
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${tab === id ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                <Icon size={16} /> {label}
              </button>
            ))}
          </nav>
          <div className="p-3 border-t border-gray-100 space-y-2">
            <button onClick={() => updateSettings({ is_open: !settings.is_open })}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${settings.is_open ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {settings.is_open ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
              {settings.is_open ? 'Restaurant Open' : 'Restaurant Closed'}
            </button>
            <button onClick={async () => { await ownerLogout(); navigate('/') }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-6">
          {tab === 'orders' && <OrdersTab />}
          {tab === 'menu' && <MenuTab />}
          {tab === 'special' && <SpecialTab />}
          {tab === 'coupons' && <CouponsTab />}
          {tab === 'categories' && <CategoriesTab />}
          {tab === 'reviews' && <ReviewsTab />}
          {tab === 'settings' && <SettingsTab />}
          {tab === 'tables' && <TablesTab />}
          {tab === 'history' && <HistoryTab />}
        </main>
      </div>
    </div>
  )
}

/* ─── ORDERS TAB ─── */
function OrdersTab() {
  const [orders, setOrders] = useState([])
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    fetchOrders()
    const channel = supabase.channel('owner_live_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
        if (payload.eventType === 'INSERT') {
          // Sound + popup handled by NotificationContext globally
          setOrders(prev => [payload.new, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o))
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const fetchOrders = async () => {
    const { data } = await supabase.from('orders').select('*')
      .not('status', 'in', '("delivered","cancelled")')
      .order('created_at', { ascending: false })
    setOrders(data || [])
  }

  const updateStatus = async (orderId, status) => {
    const updates = { status }
    if (status === 'delivered') updates.delivered_at = new Date().toISOString()
    const { error } = await supabase.from('orders').update(updates).eq('id', orderId)
    if (!error) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o))
      playNotificationSound('user') // also alert user side
      toast.success('Status updated!')
    }
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-gray-900 mb-6">Live Orders</h2>
      {orders.length === 0 ? (
        <div className="text-center py-20 text-gray-400"><Package size={48} className="mx-auto mb-3 opacity-30" /><p>No active orders</p></div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 flex items-center justify-between cursor-pointer" onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <div className="font-bold text-gray-900">#{order.order_id}</div>
                    <div className="text-xs text-gray-400">{formatDateTime(order.created_at)}</div>
                  </div>
                  <div className="text-sm text-gray-600 font-medium">{order.user_name}</div>
                  <div className="bg-primary-50 rounded-xl px-4 py-2 text-right">
                    <div className="text-xs text-gray-400">Total Bill</div>
                    <div className="font-bold text-primary-600 text-xl">₹{order.total}</div>
                    <div className="text-xs text-gray-400">
                      {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                      {order.discount > 0 ? ` • ₹${order.discount} off` : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <select value={order.status} onChange={e => { e.stopPropagation(); updateStatus(order.id, e.target.value) }} onClick={e => e.stopPropagation()}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {expanded === order.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
              </div>
              {expanded === order.id && (
                <div className="border-t border-gray-100 p-5 bg-gray-50 grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2 text-sm">Customer Details</h4>
                    <div className="space-y-1.5 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5"><User size={13} /> {order.user_name}</div>
                      <div className="flex items-center gap-1.5"><Phone size={13} /> <a href={`tel:${order.phone}`} className="text-primary-600 hover:underline">{order.phone}</a></div>
                      <div className="flex items-start gap-1.5"><MapPin size={13} className="mt-0.5" /> {order.address}</div>
                      {order.maps_link && <a href={order.maps_link} target="_blank" rel="noopener noreferrer" className="text-primary-600 text-xs hover:underline">Open in Maps →</a>}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2 text-sm">Order Items</h4>
                    <div className="space-y-1 text-sm">
                      {order.items?.map((item, i) => (
                        <div key={i} className="flex justify-between text-gray-600">
                          <span>{item.name} ×{item.qty}</span><span>₹{item.price * item.qty}</span>
                        </div>
                      ))}
                      {order.coupon_code && <div className="text-green-600 text-xs">Coupon: {order.coupon_code} (−₹{order.discount})</div>}
                      <div className="border-t border-gray-200 mt-2 pt-2 space-y-1 text-xs">
                        <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>₹{order.subtotal}</span></div>
                        {order.tax_amount > 0 && <div className="flex justify-between text-gray-500"><span>GST</span><span>₹{order.tax_amount}</span></div>}
                        <div className="flex justify-between text-gray-500"><span>Delivery</span><span>₹{order.delivery_charge}</span></div>
                        {order.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>−₹{order.discount}</span></div>}
                        <div className="flex justify-between font-bold text-gray-900 text-sm border-t border-gray-200 pt-1 mt-1"><span>Total</span><span>₹{order.total}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── MENU TAB ─── */
function MenuTab() {
  const [items, setItems] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [showForm, setShowForm] = useState(false)
  const [menuCategories, setMenuCategories] = useState(['Starters','Mains','Burgers','Pizza','Desserts','Drinks'])

  useEffect(() => {
    fetchItems()
    supabase.from('categories').select('name').order('sort_order')
      .then(({ data }) => { if (data?.length) setMenuCategories(data.map(c => c.name)) })
  }, [])
  const fetchItems = async () => {
    const { data } = await supabase.from('menu_items').select('*').order('name')
    setItems(data || [])
  }
  const openNew = () => { setEditing(null); setForm({ is_veg: true, is_available: true, category: 'Mains' }); setShowForm(true) }
  const openEdit = (item) => { setEditing(item.id); setForm({ ...item }); setShowForm(true) }
  const handleSave = async () => {
    const data = { name: form.name, description: form.description, price: Number(form.price), category: form.category, is_veg: form.is_veg, is_available: form.is_available, image_url: form.image_url, delivery_time: Number(form.delivery_time) || null }
    if (editing) {
      const { error } = await supabase.from('menu_items').update(data).eq('id', editing)
      if (!error) { toast.success('Item updated!'); setShowForm(false); fetchItems() }
    } else {
      const { error } = await supabase.from('menu_items').insert(data)
      if (!error) { toast.success('Item added!'); setShowForm(false); fetchItems() }
    }
  }
  const toggleAvailable = async (id, val) => { await supabase.from('menu_items').update({ is_available: !val }).eq('id', id); fetchItems() }
  const deleteItem = async (id) => { if (!confirm('Delete this item?')) return; await supabase.from('menu_items').delete().eq('id', id); fetchItems(); toast.success('Deleted') }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl font-bold text-gray-900">Menu Items</h2>
        <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm py-2"><Plus size={16} /> Add Item</button>
      </div>
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 animate-slide-up">
          <h3 className="font-semibold text-gray-800 mb-4">{editing ? 'Edit Item' : 'Add New Item'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Name *</label><input value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input" /></div>
            <div className="sm:col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Description</label><textarea value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="input resize-none" rows={2} /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Price (₹) *</label><input value={form.price || ''} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} className="input" type="number" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select value={form.category || ''} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="input">
                {menuCategories.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Delivery Time (min)</label><input value={form.delivery_time || ''} onChange={e => setForm(p => ({ ...p, delivery_time: e.target.value }))} className="input" type="number" /></div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Image URL</label>
              <input value={form.image_url || ''} onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))} className="input" placeholder="https://..." />
              <p className="text-xs text-amber-600 mt-1">⚠️ Use 4:3 ratio images only (e.g. 400×300, 800×600) for best display across the website.</p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={form.is_veg || false} onChange={e => setForm(p => ({ ...p, is_veg: e.target.checked }))} className="accent-green-500 w-4 h-4" /> Vegetarian</label>
              <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={form.is_available !== false} onChange={e => setForm(p => ({ ...p, is_available: e.target.checked }))} className="accent-primary-600 w-4 h-4" /> Available</label>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={handleSave} className="btn-primary text-sm py-2">Save</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm py-2">Cancel</button>
          </div>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>{['Item','Category','Price','Status',''].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {item.image_url && <img src={item.image_url} alt={item.name} className="w-10 h-8 object-cover rounded-lg" />}
                    <div><div className="font-medium text-gray-900">{item.name}</div><div className="text-xs text-gray-400">{item.is_veg ? '🟢 Veg' : '🔴 Non-Veg'}</div></div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{item.category}</td>
                <td className="px-4 py-3 font-semibold text-primary-600">₹{item.price}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleAvailable(item.id, item.is_available)} className={`text-xs px-2.5 py-1 rounded-full font-medium ${item.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {item.is_available ? 'Available' : 'Hidden'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-primary-50 rounded-lg text-primary-600"><Pencil size={14} /></button>
                    <button onClick={() => deleteItem(item.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─── SPECIAL TAB (5 fixed slots, always visible, local state + explicit save) ─── */
const EMPTY_SLOT = { menu_item_id: '', special_price: '', original_price: '', special_note: '', is_active: true }

function SpecialTab() {
  const [menuItems, setMenuItems] = useState([])
  // Always 5 slots; null means "no DB row yet for this slot"
  const [slots, setSlots] = useState([null, null, null, null, null])
  const [forms, setForms] = useState(Array(5).fill(null).map(() => ({ ...EMPTY_SLOT })))
  const [saving, setSaving] = useState(Array(5).fill(false))

  useEffect(() => {
    supabase.from('menu_items').select('id, name, price').eq('is_available', true)
      .then(({ data }) => setMenuItems(data || []))
    fetchSpecials()
  }, [])

  const fetchSpecials = async () => {
    const { data, error } = await supabase
      .from('today_special')
      .select('*')
      .order('position')
    if (error) { console.error('Specials fetch error:', error); return }
    const rows = (data || []).slice(0, 5)
    const newSlots = [null, null, null, null, null]
    const newForms = Array(5).fill(null).map(() => ({ ...EMPTY_SLOT }))
    rows.forEach((row, i) => {
      newSlots[i] = row
      newForms[i] = {
        menu_item_id: row.menu_item_id || '',
        special_price: row.special_price ?? '',
        original_price: row.original_price ?? '',
        special_note: row.special_note || '',
        is_active: row.is_active ?? true,
      }
    })
    setSlots(newSlots)
    setForms(newForms)
  }

  const updateForm = (idx, field, value) => {
    setForms(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      // Auto-fill original price when item is selected
      if (field === 'menu_item_id') {
        const item = menuItems.find(i => i.id === value)
        if (item) next[idx].original_price = item.price
      }
      return next
    })
  }

  const saveSlot = async (idx) => {
    const form = forms[idx]
    if (!form.menu_item_id) { toast.error(`Slot ${idx + 1}: Please select a menu item`); return }
    if (!form.special_price || Number(form.special_price) <= 0) { toast.error(`Slot ${idx + 1}: Please enter a valid special price`); return }

    const payload = {
      menu_item_id: form.menu_item_id,
      special_price: Number(form.special_price),
      original_price: Number(form.original_price) || 0,
      special_note: form.special_note || '',
      is_active: form.is_active,
      position: idx + 1,
    }

    setSaving(prev => { const n = [...prev]; n[idx] = true; return n })
    const existing = slots[idx]
    let error = null
    if (existing?.id) {
      ;({ error } = await supabase.from('today_special').update(payload).eq('id', existing.id))
    } else {
      ;({ error } = await supabase.from('today_special').insert(payload))
    }
    if (error) { toast.error('Save failed: ' + error.message) }
    else { toast.success(`Special #${idx + 1} saved!`) }
    setSaving(prev => { const n = [...prev]; n[idx] = false; return n })
    fetchSpecials()
  }

  const clearSlot = async (idx) => {
    if (!confirm(`Clear Special #${idx + 1}?`)) return
    const existing = slots[idx]
    if (existing?.id) {
      await supabase.from('today_special').delete().eq('id', existing.id)
    }
    const newForms = [...forms]
    newForms[idx] = { ...EMPTY_SLOT }
    setForms(newForms)
    const newSlots = [...slots]
    newSlots[idx] = null
    setSlots(newSlots)
    toast.success('Cleared')
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-gray-900">Today's Specials</h2>
        <p className="text-sm text-gray-400 mt-1">Fill in the slots you want to show. Empty slots are hidden from customers.</p>
      </div>
      <div className="space-y-4">
        {forms.map((form, idx) => {
          const isSaved = !!slots[idx]
          return (
            <div key={idx} className={`bg-white rounded-2xl border-2 p-6 space-y-4 transition-colors ${isSaved && form.is_active ? 'border-primary-200' : 'border-gray-100'}`}>
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isSaved ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{idx + 1}</span>
                  <span className="font-semibold text-gray-700">
                    {isSaved ? (menuItems.find(m => m.id === form.menu_item_id)?.name || 'Special') : 'Empty Slot'}
                  </span>
                  {isSaved && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${form.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{form.is_active ? '● Active' : '○ Hidden'}</span>}
                </div>
                {isSaved && (
                  <button onClick={() => clearSlot(idx)} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 border border-red-100 hover:border-red-300 px-2 py-1 rounded-lg transition-colors">
                    <Trash2 size={12} /> Clear
                  </button>
                )}
              </div>

              {/* Form */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Menu Item *</label>
                <select value={form.menu_item_id} onChange={e => updateForm(idx, 'menu_item_id', e.target.value)} className="input">
                  <option value="">— Choose item —</option>
                  {menuItems.map(i => <option key={i.id} value={i.id}>{i.name} (₹{i.price})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Original Price (₹)</label>
                  <input value={form.original_price} onChange={e => updateForm(idx, 'original_price', e.target.value)} className="input" type="number" placeholder="220" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Special Price (₹) *</label>
                  <input value={form.special_price} onChange={e => updateForm(idx, 'special_price', e.target.value)} className="input" type="number" placeholder="110" />
                  {form.original_price && form.special_price && Number(form.original_price) > Number(form.special_price) && (
                    <p className="text-xs text-green-600 mt-1">
                      {Math.round((1 - form.special_price / form.original_price) * 100)}% discount
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Special Note (optional)</label>
                <input value={form.special_note} onChange={e => updateForm(idx, 'special_note', e.target.value)} className="input" placeholder="e.g. Limited time offer — today only!" />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={form.is_active} onChange={e => updateForm(idx, 'is_active', e.target.checked)} className="accent-primary-600 w-4 h-4" />
                  <span className="text-sm text-gray-600">Show to customers</span>
                </label>
                <button onClick={() => saveSlot(idx)} disabled={saving[idx]} className="btn-primary text-sm py-2 px-4 flex items-center gap-2 disabled:opacity-60">
                  <Save size={14} />
                  {saving[idx] ? 'Saving...' : isSaved ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── COUPONS TAB ─── */
function CouponsTab() {
  const [coupons, setCoupons] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ code: '', description: '', discount_type: 'flat', discount_value: '', min_order: '', max_discount: '', is_active: true, free_delivery_above: '' })

  useEffect(() => { fetchCoupons() }, [])
  const fetchCoupons = async () => {
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false })
    setCoupons(data || [])
  }
  const handleSave = async () => {
    if (!form.code) { toast.error('Please enter a coupon code'); return }
    if (!form.discount_value && form.discount_type !== 'free_delivery') { toast.error('Please enter a discount value'); return }
    // Only send columns that exist in the DB — no extra fields
    const payload = {
      code: form.code.toUpperCase(),
      description: form.description || '',
      discount_type: form.discount_type === 'free_delivery' ? 'flat' : form.discount_type,
      discount_value: form.discount_type === 'free_delivery' ? 0 : (Number(form.discount_value) || 0),
      min_order: Number(form.min_order) || 0,
      max_discount: form.max_discount ? Number(form.max_discount) : null,
      is_active: true,
      // Store free_delivery intent in description if needed
    }
    // For free delivery coupons, we use min_order as the threshold and discount_type flat with 0 value
    // The Cart page checks discount_type = 'free_delivery' but DB only has flat/percent
    // So we store it as a special flat coupon with a note, OR we need to update DB constraint
    // Best fix: just allow free_delivery in DB — we already added it in schema_update_v3.sql
    // Let's try inserting with free_delivery directly
    if (form.discount_type === 'free_delivery') {
      payload.discount_type = 'free_delivery'
      payload.discount_value = 0
    }
    const { error } = await supabase.from('coupons').insert(payload)
    if (!error) { toast.success('Coupon created!'); setShowForm(false); fetchCoupons() }
    else { toast.error('Failed: ' + error.message); console.error('Coupon error:', error) }
  }
  const toggleCoupon = async (id, val) => { await supabase.from('coupons').update({ is_active: !val }).eq('id', id); fetchCoupons() }
  const deleteCoupon = async (id) => { if (!confirm('Delete coupon?')) return; await supabase.from('coupons').delete().eq('id', id); fetchCoupons(); toast.success('Deleted') }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl font-bold text-gray-900">Coupons</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm py-2 flex items-center gap-2"><Plus size={16} /> New Coupon</button>
      </div>
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 animate-slide-up">
          <h3 className="font-semibold text-gray-800 mb-4">Create Coupon</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Code *</label><input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} className="input font-mono" placeholder="SAVE50" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select value={form.discount_type} onChange={e => setForm(p => ({ ...p, discount_type: e.target.value }))} className="input">
                <option value="flat">Flat Amount (₹)</option>
                <option value="percent">Percentage (%)</option>
                <option value="free_delivery">🚚 Free Delivery</option>
              </select>
            </div>
            {form.discount_type !== 'free_delivery' && (
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Discount Value *</label><input value={form.discount_value} onChange={e => setForm(p => ({ ...p, discount_value: e.target.value }))} className="input" type="number" /></div>
            )}
            <div><label className="block text-xs font-medium text-gray-600 mb-1">
              {form.discount_type === 'free_delivery' ? 'Min Order for Free Delivery (₹) *' : 'Min Order Value (₹)'}
            </label><input value={form.min_order} onChange={e => setForm(p => ({ ...p, min_order: e.target.value }))} className="input" type="number" placeholder="200" /></div>
            {form.discount_type === 'percent' && <div><label className="block text-xs font-medium text-gray-600 mb-1">Max Discount Cap (₹)</label><input value={form.max_discount} onChange={e => setForm(p => ({ ...p, max_discount: e.target.value }))} className="input" type="number" /></div>}
            <div className="sm:col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Description</label><input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="input" placeholder={form.discount_type === 'free_delivery' ? 'Free delivery on orders above ₹500' : 'Get ₹50 off on orders above ₹200'} /></div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={handleSave} className="btn-primary text-sm py-2">Create</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm py-2">Cancel</button>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {coupons.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">{c.code}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.is_active ? 'Active' : 'Inactive'}</span>
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{c.discount_type === 'free_delivery' ? '🚚 Free Delivery' : c.discount_type === 'percent' ? `${c.discount_value}%` : `₹${c.discount_value}`}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">{c.description}</p>
              <p className="text-xs text-gray-400">{c.min_order > 0 ? `Min order ₹${c.min_order}` : 'No minimum'}{c.max_discount ? ` • Max ₹${c.max_discount}` : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleCoupon(c.id, c.is_active)} className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-500">{c.is_active ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              <button onClick={() => deleteCoupon(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
        {coupons.length === 0 && <div className="text-center py-10 text-gray-400">No coupons yet</div>}
      </div>
    </div>
  )
}

/* ─── REVIEWS TAB ─── */
function ReviewsTab() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchReviews() }, [])

  const fetchReviews = async () => {
    const { data, error } = await supabase
      .from('ratings')
      .select('*, profiles(name, email), menu_items(name, id)')
      .order('created_at', { ascending: false })
    if (error) console.error('Reviews fetch error:', error.message)
    setReviews(data || [])
    setLoading(false)
  }

  const deleteReview = async (r) => {
    if (!confirm('Delete this rating? It will be removed from testimonials and the item avg rating, but the customer can still see their order was rated.')) return
    // 1. Delete the rating row
    const { error } = await supabase.from('ratings').delete().eq('id', r.id)
    if (error) { toast.error('Failed: ' + error.message); return }
    // 2. Recalculate avg rating for the menu item
    if (r.menu_items?.id) {
      const { data: remaining } = await supabase
        .from('ratings')
        .select('rating')
        .eq('menu_item_id', r.menu_items.id)
        .eq('is_hidden', false)
      const avg = remaining?.length
        ? remaining.reduce((s, x) => s + x.rating, 0) / remaining.length
        : 0
      await supabase.from('menu_items').update({ avg_rating: avg }).eq('id', r.menu_items.id)
    }
    toast.success('Rating deleted and avg updated')
    fetchReviews()
  }

  const STARS = [1,2,3,4,5]
  const LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent']

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">Customer Ratings & Reviews</h2>
      <p className="text-sm text-gray-400 mb-6">All ratings given by customers after delivery. Deleting removes from testimonials and item rating average.</p>
      {loading ? <div className="text-center py-10 text-gray-400">Loading...</div> : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {/* Stars row */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex">
                      {STARS.map(i => (
                        <svg key={i} className={`w-4 h-4 ${i <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                          viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-gray-700">{LABELS[r.rating]}</span>
                    <span className="text-xs text-gray-400">· {r.rating}/5</span>
                    {r.is_hidden && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">Hidden from testimonials</span>}
                    {r.show_in_testimonial && !r.is_hidden && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ In testimonials</span>}
                  </div>
                  {/* Comment */}
                  {r.comment
                    ? <p className="text-sm text-gray-700 mb-2">"{r.comment}"</p>
                    : <p className="text-xs text-gray-300 italic mb-2">No comment given</p>
                  }
                  {/* Customer + item + date */}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                    <span className="font-medium text-gray-600">{r.profiles?.name || 'Customer'}</span>
                    {r.profiles?.email && <span>{r.profiles.email}</span>}
                    {r.menu_items?.name && <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded">Item: {r.menu_items.name}</span>}
                    <span>{formatDate(r.created_at)}</span>
                  </div>
                </div>
                <button onClick={() => deleteReview(r)}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-medium transition-colors">
                  🗑 Delete
                </button>
              </div>
            </div>
          ))}
          {reviews.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">⭐</div>
              <p>No ratings yet. They appear here after customers rate their delivered orders.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── SETTINGS TAB ─── */
function SettingsTab() {
  const { settings, updateSettings } = useRestaurant()
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [changingPwd, setChangingPwd] = useState(false)
  const [newOrderSoundUrl, setNewOrderSoundUrl] = useState(getCustomSound('owner') || '')
  const [statusSoundUrl, setStatusSoundUrl] = useState(getCustomSound('user') || '')

  useEffect(() => { setForm({ ...settings }) }, [settings])

  const handleSave = async () => {
    setSaving(true)
    const { error } = await updateSettings({
      name: form.name, tagline: form.tagline, address: form.address, phone: form.phone,
      email: form.email, about: form.about, google_maps_url: form.google_maps_url,
      google_maps_embed_url: form.google_maps_embed_url,
      opening_hours: form.opening_hours, delivery_charge: Number(form.delivery_charge),
      cgst_percent: Number(form.cgst_percent) || 0, sgst_percent: Number(form.sgst_percent) || 0,
      stat_customers: form.stat_customers || '500+',
      stat_items: form.stat_items || '50+',
      stat_rating: form.stat_rating || '4.8★',
      stat_delivery: form.stat_delivery || '30min',
      announcement_enabled: !!form.announcement_enabled,
      announcement_text: form.announcement_text || '',
    })
    if (!error) toast.success('Settings saved!')
    else toast.error('Failed to save')
    setSaving(false)
  }

  const handleChangePwd = async () => {
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setChangingPwd(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (!error) { toast.success('Password updated!'); setNewPassword('') }
    else toast.error(error.message)
    setChangingPwd(false)
  }

  const saveSounds = () => {
    setCustomSound('owner', newOrderSoundUrl || null)
    setCustomSound('user', statusSoundUrl || null)
    toast.success('Sound settings saved!')
  }

  const f = (key) => ({ value: form[key] ?? '', onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) })

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="font-display text-2xl font-bold text-gray-900">Restaurant Settings</h2>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">General Info</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Restaurant Name</label><input {...f('name')} className="input" /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Tagline</label><input {...f('tagline')} className="input" /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Phone</label><input {...f('phone')} className="input" /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Email</label><input {...f('email')} className="input" /></div>
          <div className="sm:col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Address</label><input {...f('address')} className="input" /></div>
          <div className="sm:col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">About</label><textarea {...f('about')} className="input resize-none" rows={3} /></div>
          <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Google Maps Embed URL (for About page)</label>
              <input {...f('google_maps_embed_url')} className="input" placeholder="Paste src= URL from Google Maps embed iframe" />
              <p className="text-xs text-gray-400 mt-1">
                How to get: Google Maps → Share → Embed a map → copy only the URL inside src="..."
              </p>
            </div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Opening Hours</label><input {...f('opening_hours')} className="input" /></div>
        </div>

        <h3 className="font-semibold text-gray-800 pt-2">Homepage Stats</h3>
        <p className="text-xs text-gray-400 -mt-2 mb-2">These appear in the "About" section on the home page.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Happy Customers</label><input {...f('stat_customers')} className="input" placeholder="500+" /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Menu Items</label><input {...f('stat_items')} className="input" placeholder="50+" /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Avg Rating</label><input {...f('stat_rating')} className="input" placeholder="4.8★" /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Avg Delivery</label><input {...f('stat_delivery')} className="input" placeholder="30min" /></div>
        </div>

        <h3 className="font-semibold text-gray-800 pt-2">Charges & Taxes</h3>
        <p className="text-xs text-gray-400 -mt-2 mb-1">Set CGST and SGST as per your GST registration. Set both to 0 if you don't charge GST.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Delivery Charge (₹)</label>
            <input {...f('delivery_charge')} className="input" type="number" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">CGST %</label>
            <input {...f('cgst_percent')} className="input" type="number" placeholder="e.g. 2.5" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">SGST %</label>
            <input {...f('sgst_percent')} className="input" type="number" placeholder="e.g. 2.5" />
          </div>
        </div>
        {(Number(form.cgst_percent) > 0 || Number(form.sgst_percent) > 0) && (
          <p className="text-xs text-green-600">
            Total GST on bill: {(Number(form.cgst_percent||0) + Number(form.sgst_percent||0)).toFixed(1)}% (CGST {form.cgst_percent||0}% + SGST {form.sgst_percent||0}%)
          </p>
        )}

        <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Settings'}</button>
      </div>

      {/* Announcement Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">📢 Announcement Bar</h3>
        <p className="text-xs text-gray-400 mb-4">Scrolling banner shown at the top of the website. Hidden on About, Profile, and Track Order pages. Only shows when restaurant is open.</p>
        <label className="flex items-center gap-3 cursor-pointer mb-4">
          <div className={`relative w-11 h-6 rounded-full transition-colors ${form.announcement_enabled ? 'bg-primary-600' : 'bg-gray-300'}`}
            onClick={() => setForm(p => ({ ...p, announcement_enabled: !p.announcement_enabled }))}>
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.announcement_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
          <span className="text-sm font-medium text-gray-700">{form.announcement_enabled ? 'Bar is ON' : 'Bar is OFF'}</span>
        </label>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Announcement Text</label>
          <input {...f('announcement_text')} className="input" placeholder="e.g. Use WELCOME50 for ₹50 off your first order above ₹300!" />
          <p className="text-xs text-gray-400 mt-1">This text will scroll across the top. You can paste coupon descriptions here.</p>
        </div>
      </div>

      {/* Sounds */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Volume2 size={16} /> Custom Sound Alerts</h3>
        <p className="text-xs text-gray-400 mb-4">Paste a direct URL to an .mp3 or .wav file. Leave blank to use the default built-in sound.</p>
        <div className="space-y-3">
          <div><label className="block text-xs font-medium text-gray-600 mb-1">New Order Alert (owner side)</label><input value={newOrderSoundUrl} onChange={e => setNewOrderSoundUrl(e.target.value)} className="input" placeholder="https://example.com/sound.mp3" /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Status Change Alert (user side)</label><input value={statusSoundUrl} onChange={e => setStatusSoundUrl(e.target.value)} className="input" placeholder="https://example.com/sound.mp3" /></div>
        </div>
        <button onClick={saveSounds} className="btn-primary mt-4 text-sm py-2">Save Sound Settings</button>
      </div>

      {/* Password */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Key size={16} /> Change Password</h3>
        <div className="flex gap-3">
          <input value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input" type="password" placeholder="New password (min 8 chars)" />
          <button onClick={handleChangePwd} disabled={changingPwd} className="btn-primary whitespace-nowrap">{changingPwd ? '...' : 'Update'}</button>
        </div>
      </div>

      {/* Delivery Areas */}
      <DeliveryAreasSection />
    </div>
  )
}

function DeliveryAreasSection() {
  const [areas, setAreas] = useState([])
  const [newName, setNewName] = useState('')
  const [newCharge, setNewCharge] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => { fetchAreas() }, [])

  const fetchAreas = async () => {
    const { data } = await supabase.from('delivery_areas').select('*').order('sort_order')
    setAreas(data || [])
  }

  const addArea = async () => {
    if (!newName.trim()) { toast.error('Enter area name'); return }
    setAdding(true)
    const { error } = await supabase.from('delivery_areas').insert({
      name: newName.trim(),
      delivery_charge: Number(newCharge) || 0,
      sort_order: areas.length,
      is_active: true,
    })
    if (!error) { setNewName(''); setNewCharge(''); fetchAreas(); toast.success('Area added') }
    else toast.error(error.message)
    setAdding(false)
  }

  const updateArea = async (id, field, value) => {
    await supabase.from('delivery_areas').update({ [field]: value }).eq('id', id)
    fetchAreas()
  }

  const deleteArea = async (id) => {
    if (!confirm('Delete this delivery area?')) return
    await supabase.from('delivery_areas').delete().eq('id', id)
    fetchAreas()
    toast.success('Deleted')
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2"><MapPin size={16} /> Delivery Areas</h3>
      <p className="text-xs text-gray-400 mb-4">Each area can have a different delivery charge. Users pick their area in the cart.</p>

      {/* Add new */}
      <div className="flex gap-2 mb-4">
        <input value={newName} onChange={e => setNewName(e.target.value)} className="input flex-1" placeholder="Area name (e.g. Gandhi Nagar)" />
        <input value={newCharge} onChange={e => setNewCharge(e.target.value)} className="input w-28" type="number" min="0" placeholder="₹ charge" />
        <button onClick={addArea} disabled={adding} className="btn-primary text-sm py-2 px-4 shrink-0">+ Add</button>
      </div>

      {/* List */}
      {areas.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No delivery areas yet. Add one above.</p>
      ) : (
        <div className="space-y-2">
          {areas.map(a => (
            <div key={a.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <input defaultValue={a.name} onBlur={e => updateArea(a.id, 'name', e.target.value)}
                className="flex-1 bg-transparent border-0 outline-none text-sm font-medium text-gray-800 focus:bg-white focus:border focus:border-gray-200 rounded px-2 py-1" />
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs text-gray-400">₹</span>
                <input defaultValue={a.delivery_charge} type="number" min="0"
                  onBlur={e => updateArea(a.id, 'delivery_charge', Number(e.target.value))}
                  className="w-20 bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
              </div>
              <label className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0 cursor-pointer">
                <input type="checkbox" checked={a.is_active}
                  onChange={e => updateArea(a.id, 'is_active', e.target.checked)}
                  className="accent-primary-600" />
                Active
              </label>
              <button onClick={() => deleteArea(a.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── HISTORY TAB ─── */
function HistoryTab() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('newest')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDate, setFilterDate] = useState('')

  useEffect(() => { fetchHistory() }, [])

  const fetchHistory = async () => {
    const { data } = await supabase.from('orders').select('*, ratings(rating, comment, is_hidden)').order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  const filtered = orders
    .filter(o => filterStatus === 'all' || o.status === filterStatus)
    .filter(o => !filterDate || o.created_at.startsWith(filterDate))
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at)
      if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
      if (sortBy === 'highest') return b.total - a.total
      if (sortBy === 'lowest') return a.total - b.total
      return 0
    })

  const exportCSV = () => {
    const header = ['Order ID','Customer','Phone','Items','Subtotal','Tax','Delivery','Discount','Total','Status','Date']
    const rows = filtered.map(o => [
      "'" + o.order_id, o.user_name, o.phone,
      o.items?.map(i => `${i.name}x${i.qty}`).join('; '),
      o.subtotal, o.tax_amount, o.delivery_charge, o.discount, o.total,
      o.status, new Date(o.created_at).toLocaleDateString()
    ])
    const csv = [header, ...rows].map(r => r.map(c => `"${c ?? ''}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `orders_${new Date().toISOString().slice(0,10)}.csv`; a.click()
    toast.success('Exported as CSV (open in Excel)')
  }

  const exportPDF = () => {
    const win = window.open('', '_blank')
    const rows = filtered.map(o => `
      <tr>
        <td>#${o.order_id}</td><td>${o.user_name}</td>
        <td>${o.items?.map(i => `${i.name}×${i.qty}`).join(', ')}</td>
        <td>₹${o.total}</td><td>${o.status}</td>
        <td>${new Date(o.created_at).toLocaleDateString()}</td>
      </tr>`).join('')
    win.document.write(`<html><head><title>Order History</title>
      <style>body{font-family:sans-serif;font-size:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f97316;color:white}</style></head>
      <body><h2>Order History — ${new Date().toLocaleDateString()}</h2>
      <table><thead><tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
      <tbody>${rows}</tbody></table></body></html>`)
    win.document.close()
    win.print()
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="font-display text-2xl font-bold text-gray-900">Order History</h2>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 text-sm border border-gray-200 bg-white hover:bg-green-50 hover:border-green-300 text-gray-700 px-3 py-2 rounded-xl transition-colors"><Download size={14} /> Excel/CSV</button>
          <button onClick={exportPDF} className="flex items-center gap-1.5 text-sm border border-gray-200 bg-white hover:bg-red-50 hover:border-red-300 text-gray-700 px-3 py-2 rounded-xl transition-colors"><FileText size={14} /> PDF</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5 bg-white p-4 rounded-xl border border-gray-100">
        <div className="flex items-center gap-2 text-sm text-gray-600"><Filter size={14} />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input py-1.5 text-sm w-auto">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Amount</option>
            <option value="lowest">Lowest Amount</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input py-1.5 text-sm w-auto">
            <option value="all">All Statuses</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="placed">Placed</option>
          </select>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="input py-1.5 text-sm w-auto" />
          {filterDate && <button onClick={() => setFilterDate('')} className="text-xs text-red-500 hover:underline">Clear date</button>}
        </div>
        <span className="ml-auto text-xs text-gray-400 self-center">{filtered.length} orders</span>
      </div>

      {loading ? <div className="text-center py-10 text-gray-400">Loading...</div> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{['Order ID','Customer','Items','Total','Status','Review','Date'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(o => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-bold text-gray-900">#{o.order_id}</td>
                  <td className="px-4 py-3"><div className="text-gray-800">{o.user_name}</div><div className="text-xs text-gray-400">{o.phone}</div></td>
                  <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{o.items?.map(i => i.name).join(', ')}</td>
                  <td className="px-4 py-3 font-semibold text-primary-600">₹{o.total}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${o.status === 'delivered' ? 'bg-green-100 text-green-700' : o.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'}`}>{o.status}</span></td>
                  <td className="px-4 py-3">
                    {o.ratings?.[0] ? (
                      <div>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => <svg key={i} className={`w-3 h-3 ${i < o.ratings[0].rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>)}
                        </div>
                        <p className="text-xs text-gray-500 max-w-[120px] truncate mt-0.5">"{o.ratings[0].comment}"</p>
                        {o.ratings[0].is_hidden && <span className="text-xs text-red-500">Hidden</span>}
                      </div>
                    ) : <span className="text-xs text-gray-300">No review</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-10 text-gray-400">No orders match filters</div>}
        </div>
      )}
    </div>
  )
}


/* ─── CATEGORIES TAB ─── */
function CategoriesTab() {
  const EMOJIS = ['🍽','🥗','🍱','🍔','🍕','🍰','🥤','🍛','🥘','🍜','🍣','🥪','🧆','🫕']
  const [cats, setCats] = useState([])
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('🍽')
  const [adding, setAdding] = useState(false)

  useEffect(() => { fetchCats() }, [])

  const fetchCats = async () => {
    const { data } = await supabase.from('categories').select('*').order('sort_order')
    setCats(data || [])
  }

  const addCat = async () => {
    if (!newName.trim()) { toast.error('Enter category name'); return }
    setAdding(true)
    const { error } = await supabase.from('categories').insert({
      name: newName.trim(), emoji: newEmoji, sort_order: cats.length + 1
    })
    if (!error) { setNewName(''); fetchCats(); toast.success('Category added') }
    else toast.error(error.message)
    setAdding(false)
  }

  const updateCat = async (id, field, value) => {
    await supabase.from('categories').update({ [field]: value }).eq('id', id)
    fetchCats()
  }

  const deleteCat = async (id, name) => {
    const { count } = await supabase.from('menu_items').select('*', { count: 'exact', head: true }).eq('category', name)
    if (count > 0) {
      toast.error(`Cannot delete — ${count} menu item(s) use this category. Change their category first.`)
      return
    }
    if (!confirm(`Delete "${name}" category?`)) return
    await supabase.from('categories').delete().eq('id', id)
    fetchCats()
    toast.success('Deleted')
  }

  return (
    <div className="max-w-xl">
      <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">Categories</h2>
      <p className="text-sm text-gray-400 mb-6">These appear in the Menu filters and item form. Deleting a category is blocked if menu items use it.</p>

      {/* Add new */}
      <div className="flex gap-2 mb-6">
        <select value={newEmoji} onChange={e => setNewEmoji(e.target.value)} className="input w-16 text-xl text-center px-1">
          {EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <input value={newName} onChange={e => setNewName(e.target.value)} className="input flex-1" placeholder="Category name (e.g. Thalis)" />
        <button onClick={addCat} disabled={adding} className="btn-primary text-sm py-2 px-4 shrink-0">+ Add</button>
      </div>

      <div className="space-y-2">
        {cats.map((c, i) => (
          <div key={c.id} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
            <select value={c.emoji} onChange={e => updateCat(c.id, 'emoji', e.target.value)} className="text-xl bg-transparent border-0 outline-none cursor-pointer w-10">
              {EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <input defaultValue={c.name} onBlur={e => updateCat(c.id, 'name', e.target.value)}
              className="flex-1 bg-transparent border-0 outline-none text-sm font-semibold text-gray-800 focus:bg-gray-50 focus:border focus:border-gray-200 rounded px-2 py-1" />
            <span className="text-xs text-gray-400 shrink-0">#{i + 1}</span>
            <button onClick={() => deleteCat(c.id, c.name)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {cats.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No categories yet</p>}
      </div>
    </div>
  )
}

/* ─── TABLES TAB ─── */
function TablesTab() {
  const [tables, setTables]   = useState([])
  const [bookings, setBookings] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ table_number: '', seats: 2, booking_price: 0 })

  useEffect(() => {
    fetchTables()
    fetchBookings()

    // Realtime: new bookings + table status changes
    const ch = supabase.channel('owner_tables_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => {
        fetchTables()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'table_bookings' }, payload => {
        playNotificationSound('owner')
        // Show full popup via parent
        if (onNewBooking) onNewBooking(payload.new)
        fetchBookings()
        fetchTables()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'table_bookings' }, () => {
        fetchBookings()
        fetchTables()
      })
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [])

  const fetchTables = async () => {
    const { data } = await supabase.from('tables').select('*').order('table_number')
    setTables(data || [])
  }
  const fetchBookings = async () => {
    const { data } = await supabase
      .from('table_bookings')
      .select('*, tables(table_number, seats)')
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false })
    setBookings(data || [])
  }

  const addTable = async () => {
    if (!form.table_number) { toast.error('Enter table number'); return }
    const { error } = await supabase.from('tables').insert({
      table_number:  Number(form.table_number),
      seats:         Number(form.seats),
      booking_price: Number(form.booking_price) || 0,
      status:        'vacant',
    })
    if (error) toast.error(error.message)
    else { toast.success('Table added'); setShowForm(false); setForm({ table_number: '', seats: 2, booking_price: 0 }); fetchTables() }
  }

  const setStatus = async (id, status) => {
    await supabase.from('tables').update({ status }).eq('id', id)
    fetchTables()
  }

  const updateTableField = async (id, field, value) => {
    await supabase.from('tables').update({ [field]: Number(value) }).eq('id', id)
    fetchTables()
  }

  const deleteTable = async (id) => {
    if (!confirm('Delete this table? All bookings for it will remain in history.')) return
    await supabase.from('tables').delete().eq('id', id)
    fetchTables(); toast.success('Table removed')
  }

  const cancelBooking = async (bookingId, tableId) => {
    if (!confirm('Cancel this customer booking? This cannot be undone.')) return
    await supabase.from('table_bookings').update({ status: 'cancelled_by_owner' }).eq('id', bookingId)
    await supabase.from('tables').update({ status: 'vacant' }).eq('id', tableId)
    toast.success('Booking cancelled, table marked vacant')
    fetchTables(); fetchBookings()
  }

  const STATUS_OPTIONS = [
    { value: 'vacant',   label: '🟢 Vacant' },
    { value: 'occupied', label: '🔴 Occupied' },
    { value: 'disabled', label: '⚫ Disabled (hidden from customers)' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-gray-900">Table Management</h2>
          <p className="text-sm text-gray-400 mt-1">Only you can change table status and prices. Customers can only book vacant tables.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm py-2 flex items-center gap-2">
          <Plus size={16} /> Add Table
        </button>
      </div>

      {/* Add table form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-slide-up">
          <h3 className="font-semibold text-gray-800 mb-4">Add New Table</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Table Number *</label>
              <input value={form.table_number} onChange={e => setForm(p => ({ ...p, table_number: e.target.value }))} className="input" type="number" placeholder="1" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Seats</label>
              <input value={form.seats} onChange={e => setForm(p => ({ ...p, seats: e.target.value }))} className="input" type="number" min="1" max="20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Booking Price (₹)</label>
              <input value={form.booking_price} onChange={e => setForm(p => ({ ...p, booking_price: e.target.value }))} className="input" type="number" min="0" placeholder="0 = free" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={addTable} className="btn-primary text-sm py-2">Add Table</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm py-2">Cancel</button>
          </div>
        </div>
      )}

      {/* Tables list */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">All Tables ({tables.length})</h3>
          <span className="text-xs text-gray-400">Edit seats or price inline · Change status using dropdown</span>
        </div>
        {tables.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">No tables yet. Click "Add Table" to get started.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {tables.map(t => (
              <div key={t.id} className="p-4 flex flex-wrap items-center gap-4">
                <div className="font-bold text-gray-900 w-20">Table {t.table_number}</div>

                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Users size={13} />
                  <input type="number" defaultValue={t.seats} min="1" max="20"
                    onBlur={e => updateTableField(t.id, 'seats', e.target.value)}
                    className="w-12 text-center border border-gray-200 rounded-lg px-1 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-300" />
                  <span className="text-gray-400">seats</span>
                </div>

                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <span className="text-gray-400 text-xs">₹</span>
                  <input type="number" defaultValue={t.booking_price || 0} min="0"
                    onBlur={e => updateTableField(t.id, 'booking_price', e.target.value)}
                    className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-300" />
                  <span className="text-gray-400 text-xs">booking fee</span>
                </div>

                <select value={t.status}
                  onChange={e => setStatus(t.id, e.target.value)}
                  className={`text-xs border rounded-lg px-3 py-1.5 font-medium focus:outline-none focus:ring-2 focus:ring-primary-300 cursor-pointer
                    ${t.status === 'vacant' ? 'border-green-300 bg-green-50 text-green-800' :
                      t.status === 'occupied' ? 'border-red-300 bg-red-50 text-red-700' :
                      'border-gray-200 bg-gray-100 text-gray-500'}`}>
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>

                <button onClick={() => deleteTable(t.id)} className="ml-auto p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active bookings — full details */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Active Bookings ({bookings.length})</h3>
        {bookings.length === 0 ? (
          <p className="text-gray-400 text-sm">No active bookings right now.</p>
        ) : (
          <div className="space-y-4">
            {bookings.map(b => (
              <div key={b.id} className="border border-green-200 bg-green-50 rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 bg-green-100">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-green-900">
                      Table {b.tables?.table_number ?? '?'}
                    </span>
                    <span className="text-xs text-green-700 bg-green-200 px-2 py-0.5 rounded-full">
                      {b.tables?.seats} seat{b.tables?.seats !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs text-green-700">
                      Arrival: <strong>{b.arrival_time}</strong>
                    </span>
                  </div>
                  <button onClick={() => cancelBooking(b.id, b.table_id)}
                    className="text-xs text-red-500 border border-red-300 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors bg-white">
                    Cancel & Free Table
                  </button>
                </div>
                {/* Details grid */}
                <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Customer</div>
                    <div className="font-semibold text-gray-900">{b.user_name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Phone</div>
                    <a href={"tel:" + b.user_phone} className="font-medium text-primary-600 hover:underline">{b.user_phone}</a>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Email</div>
                    <a href={"mailto:" + b.user_email} className="font-medium text-primary-600 hover:underline truncate block max-w-[180px]">{b.user_email || '—'}</a>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Booking Fee Paid</div>
                    <div className="font-semibold text-green-700">{b.amount_paid > 0 ? `₹${b.amount_paid}` : 'Free'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Booked On</div>
                    <div className="text-gray-600">{formatDate(b.created_at)} {new Date(b.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}