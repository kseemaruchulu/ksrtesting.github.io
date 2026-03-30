import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRestaurant } from '../context/RestaurantContext'
import { supabase } from '../lib/supabase'
import { playNotificationSound, unlockAudio } from '../lib/sounds'
import { validatePhone } from '../lib/utils'
import { Users, Clock, Phone, User, AlertTriangle, CheckCircle, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function TableBooking() {
  const { user, profile } = useAuth()
  const { settings } = useRestaurant()
  const navigate = useNavigate()

  const [tables, setTables]             = useState([])
  const [myBookings, setMyBookings]     = useState([])
  const [selected, setSelected]         = useState(null)
  const [step, setStep]                 = useState(1)
  const [booking, setBooking]           = useState(false)
  const [successPopup, setSuccessPopup] = useState(null)
  const [name, setName]                 = useState('')
  const [phone, setPhone]               = useState('')
  const [arrivalTime, setArrivalTime]   = useState('')

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    setName(profile?.name || user.user_metadata?.full_name || '')
    setPhone(profile?.phone || '')
    fetchTables()
    fetchMyBookings()
    const u = () => { unlockAudio(); document.removeEventListener('click', u) }
    document.addEventListener('click', u)
    return () => document.removeEventListener('click', u)
  }, [user, profile])

  // Realtime — listen to table updates so ALL users see status changes instantly
  useEffect(() => {
    const ch = supabase.channel('tables_live')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tables' }, payload => {
        setTables(prev => prev.map(t =>
          t.id === payload.new.id ? { ...t, ...payload.new } : t
        ))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'table_bookings' }, () => {
        fetchTables() // Refresh to pick up any status changes
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const fetchTables = async () => {
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .order('table_number')
    if (error) { console.error('fetchTables error:', error); return }
    setTables((data || []).filter(t => t.status !== 'disabled'))
  }

  const fetchMyBookings = async () => {
    if (!user) return
    const { data } = await supabase
      .from('table_bookings')
      .select('*, tables(table_number, seats)')
      .eq('user_id', user.id)
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false })
    setMyBookings(data || [])
  }

  const selectTable = (table) => {
    if (!settings.is_open) {
      toast.error('Restaurant is currently closed. Table booking is not available.')
      return
    }
    if (table.status !== 'vacant') {
      toast.error('This table is already occupied')
      return
    }
    setSelected(table)
    setStep(1)
  }

  const handleDetailsNext = () => {
    if (!name.trim()) { toast.error('Please enter your name'); return }
    const cleaned = validatePhone(phone)
    if (!cleaned) { toast.error('Enter a valid 10-digit phone number (no country code)'); return }
    setPhone(cleaned)
    if (!arrivalTime) { toast.error('Please select your arrival time'); return }
    setStep(2)
  }

  const handleConfirm = async () => {
    if (!selected) return
    setBooking(true)
    try {
      // Step 1: Re-read table status from DB right now
      const { data: freshTable, error: fetchErr } = await supabase
        .from('tables')
        .select('status')
        .eq('id', selected.id)
        .single()

      if (fetchErr) throw new Error('Could not verify table status: ' + fetchErr.message)

      if (freshTable.status !== 'vacant') {
        toast.error('Sorry — this table was just booked by someone else. Please choose another table.')
        setSelected(null)
        setBooking(false)
        fetchTables()
        return
      }

      // Step 2: Save phone if not set
      if (!profile?.phone) {
        await supabase.from('profiles').update({ phone }).eq('id', user.id)
      }

      // Step 3: Mark table as occupied FIRST (before creating booking)
      // This prevents race conditions — two users can't both get past this
      const { error: occupyErr } = await supabase
        .from('tables')
        .update({ status: 'occupied' })
        .eq('id', selected.id)
        .eq('status', 'vacant') // Only update if STILL vacant (atomic check)

      if (occupyErr) {
        console.error('Occupy error:', occupyErr)
        toast.error('Could not reserve table: ' + occupyErr.message)
        setBooking(false)
        fetchTables()
        return
      }

      // Step 4: Create the booking record
      const { error: bookErr } = await supabase.from('table_bookings').insert({
        user_id:      user.id,
        table_id:     selected.id,
        arrival_time: arrivalTime,
        status:       'confirmed',
        amount_paid:  selected.booking_price || 0,
        user_name:    name,
        user_phone:   phone,
        user_email:   user.email,
      })

      if (bookErr) {
        // Rollback: set table back to vacant if booking insert fails
        await supabase.from('tables').update({ status: 'vacant' }).eq('id', selected.id)
        throw new Error('Booking failed: ' + bookErr.message)
      }

      // Success
      playNotificationSound('user')
      setSuccessPopup({ ...selected, arrival_time: arrivalTime })
      setSelected(null)
      fetchTables()
      fetchMyBookings()

    } catch (e) {
      toast.error(e.message)
    }
    setBooking(false)
  }

  const minTime = (() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() + 15)
    return d.toTimeString().slice(0, 5)
  })()

  return (
    <div className="pt-20 min-h-screen bg-cream-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">

        <div className="mb-8">
          <h1 className="section-title mb-1">Book a Table</h1>
          <p className="text-gray-500">Select an available table to make a reservation</p>
          {!settings.is_open && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-center gap-3">
              <span className="text-2xl">🔴</span>
              <p className="text-red-700 font-medium">Restaurant is currently closed. Table booking is unavailable.</p>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6 bg-white p-4 rounded-2xl border border-gray-100 items-center">
          <span className="flex items-center gap-2 text-sm text-green-700 font-medium">
            <span className="w-3 h-3 rounded-full bg-green-500" /> Available — tap to book
          </span>
          <span className="flex items-center gap-2 text-sm text-red-600 font-medium">
            <span className="w-3 h-3 rounded-full bg-red-500" /> Occupied
          </span>
          <p className="ml-auto text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
            ⏰ 30-min grace period after arrival time. No-show = booking cancelled, fee non-refundable.
          </p>
        </div>

        {/* Tables grid */}
        {tables.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">🪑</div>
            <p>No tables available right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
            {tables.map(table => (
              <button key={table.id}
                onClick={() => selectTable(table)}
                disabled={table.status !== 'vacant' || !settings.is_open}
                className={`p-5 rounded-2xl border-2 text-left transition-all
                  ${!settings.is_open
                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                    : table.status === 'vacant'
                      ? 'border-green-300 bg-green-50 hover:shadow-lg hover:-translate-y-1 cursor-pointer active:scale-95'
                      : 'border-red-200 bg-red-50 cursor-not-allowed opacity-75'}
                  ${selected?.id === table.id ? 'ring-2 ring-primary-500 ring-offset-2' : ''}`}>
                <div className="text-3xl mb-3">🪑</div>
                <div className="font-bold text-gray-900 text-lg">Table {table.table_number}</div>
                <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                  <Users size={13} /> {table.seats} seat{table.seats !== 1 ? 's' : ''}
                </div>
                <div className={`text-xs font-semibold mt-2 ${table.status === 'vacant' ? 'text-green-700' : 'text-red-600'}`}>
                  {table.status === 'vacant' ? '🟢 Available' : '🔴 Occupied'}
                </div>
                {table.status === 'vacant' && (
                  <div className="text-xs mt-1 text-green-800 font-medium">
                    {table.booking_price > 0 ? `₹${table.booking_price} to book` : 'Free to book'}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Booking form — inline */}
        {selected && (
          <div className="bg-white rounded-3xl border-2 border-primary-200 shadow-lg p-8 mb-8 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-gray-900">
                  Book Table {selected.table_number}
                </h2>
                <p className="text-sm text-gray-400 mt-0.5">
                  {selected.seats} seats ·{' '}
                  {selected.booking_price > 0 ? `₹${selected.booking_price} reservation fee` : 'Free reservation'}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-gray-100 rounded-xl">
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            {/* Step pills */}
            <div className="flex items-center gap-3 mb-8">
              {['Your Details', 'Confirm & Pay'].map((label, i) => (
                <div key={label} className="flex items-center gap-2 flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors
                    ${step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {step > i + 1 ? '✓' : i + 1}
                  </div>
                  <span className={`text-sm font-medium ${step === i + 1 ? 'text-gray-800' : 'text-gray-400'}`}>{label}</span>
                  {i < 1 && <div className="flex-1 h-px bg-gray-200" />}
                </div>
              ))}
            </div>

            {step === 1 && (
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <User size={13} className="inline mr-1" />Full Name *
                  </label>
                  <input value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Your full name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <Phone size={13} className="inline mr-1" />Phone Number * (10 digits, no country code)
                  </label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} className="input" placeholder="98765 43210" type="tel" maxLength={10} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <Clock size={13} className="inline mr-1" />Expected Arrival Time *
                  </label>
                  <input type="time" value={arrivalTime} min={minTime} onChange={e => setArrivalTime(e.target.value)} className="input" />
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-2">
                  <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-800">
                    Your table is held for <strong>30 minutes</strong> after your arrival time.
                    After that the restaurant may cancel your booking. The reservation fee is <strong>non-refundable</strong>.
                  </p>
                </div>
                <button onClick={handleDetailsNext} className="btn-primary w-full">Continue →</button>
              </div>
            )}

            {step === 2 && (
              <div className="max-w-md space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                  <h3 className="font-semibold text-green-800 flex items-center gap-2 mb-4">
                    <CheckCircle size={16} /> Booking Summary
                  </h3>
                  <div className="space-y-2 text-sm divide-y divide-green-100">
                    {[
                      ['Table', `Table ${selected.table_number} (${selected.seats} seat${selected.seats !== 1 ? 's' : ''})`],
                      ['Name', name],
                      ['Phone', phone],
                      ['Arrival', arrivalTime],
                    ].map(([l, v]) => (
                      <div key={l} className="flex justify-between py-1.5">
                        <span className="text-gray-500">{l}</span>
                        <span className="font-medium text-gray-800">{v}</span>
                      </div>
                    ))}
                    {selected.booking_price > 0 && (
                      <div className="flex justify-between py-2">
                        <span className="font-semibold text-gray-800">Reservation Fee</span>
                        <span className="font-bold text-primary-600 text-base">₹{selected.booking_price}</span>
                      </div>
                    )}
                  </div>
                </div>
                {selected.booking_price > 0 && (
                  <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-xl p-3">
                    💡 ₹{selected.booking_price} will be adjusted in your final dining bill.
                  </p>
                )}
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">
                  ⚠️ By confirming: 30-min grace period applies, fee is non-refundable if no-show.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="btn-secondary flex-1">← Edit</button>
                  <button onClick={handleConfirm} disabled={booking} className="btn-primary flex-1">
                    {booking ? 'Booking...' : selected.booking_price > 0 ? `Pay ₹${selected.booking_price} & Book` : 'Confirm Booking'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* My active bookings */}
        {myBookings.length > 0 && (
          <div className="card p-6">
            <h2 className="font-display text-xl font-semibold mb-4">My Active Bookings</h2>
            <div className="space-y-3">
              {myBookings.map(b => (
                <div key={b.id} className="flex items-center justify-between p-4 bg-green-50 border border-green-100 rounded-xl">
                  <div>
                    <div className="font-semibold text-gray-900">
                      Table {b.tables?.table_number} — {b.tables?.seats} seat{b.tables?.seats !== 1 ? 's' : ''}
                    </div>
                    <div className="text-sm text-gray-600 mt-0.5">
                      Arrival: <strong>{b.arrival_time}</strong>
                      {b.amount_paid > 0 && <> · Paid: ₹{b.amount_paid}</>}
                    </div>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-semibold">✓ Confirmed</span>
                </div>
              ))}
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">
                ⚠️ To cancel, please call the restaurant directly.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Success popup */}
      {successPopup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSuccessPopup(null)}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-slide-up text-center" onClick={e => e.stopPropagation()}>
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">Table Booked!</h2>
            <p className="text-gray-500 text-sm mb-6">Your reservation is confirmed</p>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-left space-y-2 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-gray-500">Table</span>
                <span className="font-semibold">Table {successPopup.table_number} ({successPopup.seats} seats)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Arrival Time</span>
                <span className="font-semibold">{successPopup.arrival_time}</span>
              </div>
              {successPopup.booking_price > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Fee Paid</span>
                  <span className="font-bold text-primary-600">₹{successPopup.booking_price}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 rounded-xl p-3 mb-5">
              ⏰ Your table is held for 30 minutes after your arrival time.
            </p>
            <button onClick={() => setSuccessPopup(null)} className="btn-primary w-full">Done</button>
          </div>
        </div>
      )}
    </div>
  )
}
