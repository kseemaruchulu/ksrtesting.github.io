import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { User, Phone, Mail, MapPin, Package, Star } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Profile() {
  const { user, profile, fetchProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [reviews, setReviews] = useState([])
  const [editing, setEditing] = useState(false)
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('orders')

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    setPhone(profile?.phone || '')
    setAddress(profile?.address || '')
    fetchOrders()
    fetchReviews()
  }, [user, profile])

  const fetchOrders = async () => {
    const { data } = await supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
    setOrders(data || [])
  }

  const fetchReviews = async () => {
    const { data } = await supabase.from('ratings').select('*, menu_items(name, image_url)').eq('user_id', user.id).order('created_at', { ascending: false })
    setReviews(data || [])
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ phone, address }).eq('id', user.id)
    if (!error) { toast.success('Profile updated!'); fetchProfile(); setEditing(false) }
    else toast.error('Failed to update')
    setSaving(false)
  }

  if (!user) return null

  return (
    <div className="pt-20 min-h-screen bg-cream-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="section-title mb-8">My Profile</h1>

        {/* Profile Card */}
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            {user.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="avatar" className="w-16 h-16 rounded-full object-cover ring-4 ring-primary-100" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center"><User size={28} className="text-primary-600" /></div>
            )}
            <div>
              <h2 className="font-display text-2xl font-bold text-gray-900">{profile?.name || user.user_metadata?.full_name}</h2>
              <p className="text-gray-500 text-sm flex items-center gap-1"><Mail size={13} /> {user.email}</p>
            </div>
          </div>

          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} className="input" placeholder="+91 98765 43210" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Default Address</label>
                <textarea value={address} onChange={e => setAddress(e.target.value)} className="input resize-none" rows={2} />
              </div>
              <div className="flex gap-3">
                <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
                <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-gray-600"><Phone size={15} /><span>{profile?.phone || 'Not set'}</span></div>
              <div className="flex items-center gap-2 text-gray-600"><MapPin size={15} /><span>{profile?.address || 'No address saved'}</span></div>
              <button onClick={() => setEditing(true)} className="btn-secondary mt-2 text-sm py-2">Edit Profile</button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[['orders', '📦 My Orders'], ['reviews', '⭐ My Reviews']].map(([t, label]) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === t ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-primary-50 border border-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="card p-6">
            <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2"><Package size={20} className="text-primary-600" /> Order History</h2>
            {orders.length === 0 ? <p className="text-gray-400 text-center py-6">No orders yet</p> : (
              <div className="space-y-3">
                {orders.map(o => (
                  <div key={o.id} className="flex items-center justify-between p-4 bg-cream-50 rounded-xl">
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">#{o.order_id}</div>
                      <div className="text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-500 mt-0.5 max-w-[200px] truncate">{o.items?.map(i => i.name).join(', ')}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary-600">₹{o.total}</div>
                      <div className={`text-xs mt-1 px-2 py-0.5 rounded-full font-medium ${
                        o.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        o.status === 'placed' ? 'bg-blue-100 text-blue-700' :
                        o.status === 'preparing' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-orange-100 text-orange-700'}`}>
                        {o.status?.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="card p-6">
            <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2"><Star size={20} className="text-primary-600" /> My Reviews</h2>
            {reviews.length === 0 ? <p className="text-gray-400 text-center py-6">You haven't reviewed any orders yet</p> : (
              <div className="space-y-4">
                {reviews.map(r => (
                  <div key={r.id} className={`p-4 rounded-xl border ${r.is_hidden ? 'border-red-100 bg-red-50' : 'border-gray-100 bg-cream-50'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-gray-900 text-sm">{r.menu_items?.name || 'Item'}</p>
                          {r.is_hidden && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Hidden by restaurant</span>}
                          {r.show_in_testimonial && !r.is_hidden && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">Shown in testimonials</span>}
                        </div>
                        <div className="flex mb-2">
                          {[...Array(5)].map((_, i) => <Star key={i} size={13} className={i < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />)}
                        </div>
                        <p className="text-sm text-gray-600">"{r.comment}"</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                      </div>
                      {r.menu_items?.image_url && (
                        <img src={r.menu_items.image_url} alt="" className="w-14 h-12 object-cover rounded-lg shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
