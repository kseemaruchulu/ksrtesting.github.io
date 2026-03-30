import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { supabase } from '../lib/supabase'
import MenuItemCard from '../components/ui/MenuItemCard'

const SORT_OPTIONS = [
  { label: 'Popular',            value: 'avg_rating-desc' },
  { label: 'Price: Low → High', value: 'price-asc' },
  { label: 'Price: High → Low', value: 'price-desc' },
  { label: 'Delivery Time',     value: 'delivery_time-asc' },
  { label: 'A–Z',               value: 'name-asc' },
]

export default function Menu() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems]         = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState(searchParams.get('search') || '')
  const [category, setCategory]   = useState(searchParams.get('category') || 'All')
  const [vegFilter, setVegFilter] = useState(searchParams.get('veg') || 'all')
  const [sort, setSort]           = useState(searchParams.get('sort') || 'avg_rating-desc')
  const [showFilters, setShowFilters] = useState(false)

  const updateParam = (key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value && value !== 'all' && value !== 'All' && value !== 'avg_rating-desc') next.set(key, value)
      else next.delete(key)
      return next
    }, { replace: true })
  }

  const handleSetCategory = (v) => { setCategory(v); updateParam('category', v) }
  const handleSetVeg      = (v) => { setVegFilter(v); updateParam('veg', v) }
  const handleSetSort     = (v) => { setSort(v); updateParam('sort', v) }

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const [{ data: itemData }, { data: catData }] = await Promise.all([
      supabase.from('menu_items').select('*').eq('is_available', true),
      supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
    ])
    setItems(itemData || [])
    // Build category list: All + DB categories + any leftover from items
    const dbCats = (catData || []).map(c => ({ name: c.name, emoji: c.emoji || '🍽' }))
    const itemCats = [...new Set((itemData || []).map(i => i.category).filter(Boolean))]
    const merged = [{ name: 'All', emoji: '🍽' }]
    dbCats.forEach(c => merged.push(c))
    itemCats.forEach(name => { if (!merged.find(c => c.name === name)) merged.push({ name, emoji: '🍽' }) })
    setCategories(merged)
    setLoading(false)
  }

  const filtered = useMemo(() => {
    let result = [...items]
    if (search)           result = result.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.description?.toLowerCase().includes(search.toLowerCase()))
    if (category !== 'All') result = result.filter(i => i.category === category)
    if (vegFilter === 'veg')    result = result.filter(i => i.is_veg)
    if (vegFilter === 'nonveg') result = result.filter(i => !i.is_veg)
    const [field, dir] = sort.split('-')
    result.sort((a, b) => {
      const va = a[field] ?? 0, vb = b[field] ?? 0
      if (typeof va === 'string') return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      return dir === 'asc' ? va - vb : vb - va
    })
    return result
  }, [items, search, category, vegFilter, sort])

  return (
    <div className="pt-20 min-h-screen bg-cream-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="section-title mb-1">Our Menu</h1>
          <p className="text-gray-500 text-sm">Handcrafted dishes made with love</p>
        </div>

        {/* Search + sort bar */}
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search dishes..."
              className="input pl-9 pr-9 h-11"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X size={14} className="text-gray-400" />
              </button>
            )}
          </div>
          <select
            value={sort}
            onChange={e => handleSetSort(e.target.value)}
            className="input w-auto min-w-[140px] h-11 text-sm"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {/* Dietary toggle button */}
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`h-11 px-4 rounded-xl border-2 flex items-center gap-2 text-sm font-medium transition-all
              ${vegFilter !== 'all' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-primary-300'}`}
          >
            <SlidersHorizontal size={15} />
            <span className="hidden sm:inline">
              {vegFilter === 'veg' ? '🟢 Veg' : vegFilter === 'nonveg' ? '🔴 Non-Veg' : 'Filter'}
            </span>
          </button>
        </div>

        {/* Dietary filter dropdown */}
        {showFilters && (
          <div className="flex gap-2 mb-4 animate-fade-in">
            {[['all','All Items'],['veg','🟢 Veg Only'],['nonveg','🔴 Non-Veg Only']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => { handleSetVeg(val); setShowFilters(false) }}
                className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all
                  ${vegFilter === val ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Horizontal category pills */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
          {categories.map(cat => {
            const count = cat.name === 'All' ? items.length : items.filter(i => i.category === cat.name).length
            return (
              <button
                key={cat.name}
                onClick={() => handleSetCategory(cat.name)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border-2 shrink-0
                  ${category === cat.name
                    ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600'}`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${category === cat.name ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Results count */}
        <p className="text-xs text-gray-400 mb-4">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</p>

        {/* Items grid — 2 cols on mobile, 3 on desktop */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden animate-pulse bg-white shadow-sm">
                <div className="aspect-[4/3] bg-gray-200" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">🍽</div>
            <p className="text-lg font-medium">No items found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
            <button onClick={() => { setSearch(''); handleSetCategory('All'); handleSetVeg('all') }}
              className="mt-4 text-primary-600 text-sm underline">Clear all filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(item => <MenuItemCard key={item.id} item={item} />)}
          </div>
        )}
      </div>
    </div>
  )
}
