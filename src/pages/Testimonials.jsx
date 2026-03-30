import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Testimonials() {
  const [ratings, setRatings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchReviews() }, [])

  const fetchReviews = async () => {
    const { data, error } = await supabase
      .from('ratings')
      .select(`
        id, rating, comment, show_in_testimonial, is_hidden, created_at,
        profiles ( name, avatar_url ),
        menu_items ( name )
      `)
      .eq('show_in_testimonial', true)
      .order('created_at', { ascending: false })
      .limit(12)

    if (error) {
      console.error('Testimonials error:', error.message)
      setLoading(false)
      return
    }

    const visible = (data || []).filter(r => r.is_hidden !== true)
    setRatings(visible)
    setLoading(false)
  }

  const LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent']

  return (
    <div className="pt-20 min-h-screen bg-cream-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="section-title mb-3">Customer Reviews</h1>
          <p className="text-gray-500">What our valued customers have to say</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card p-6 animate-pulse h-40 rounded-2xl" />
            ))}
          </div>
        ) : ratings.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">⭐</div>
            <p className="text-lg font-medium">No reviews yet</p>
            <p className="text-sm mt-2 text-gray-300">
              After your order is delivered, you can rate it from the Track Order page.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {ratings.map(r => (
              <div key={r.id} className="card p-6 flex flex-col gap-3 hover:shadow-md transition-shadow">
                {/* Stars */}
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} size={15}
                        className={i <= r.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-200'} />
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-gray-500">{LABELS[r.rating]}</span>
                </div>

                {/* Comment */}
                {r.comment && (
                  <p className="text-sm text-gray-600 leading-relaxed flex-1">
                    "{r.comment}"
                  </p>
                )}

                {/* Customer + item */}
                <div className="flex items-center gap-3 pt-2 border-t border-gray-50">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700 text-sm shrink-0">
                    {r.profiles?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {r.profiles?.name || 'Customer'}
                    </p>
                    {r.menu_items?.name && (
                      <p className="text-xs text-gray-400">Ordered: {r.menu_items.name}</p>
                    )}
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
