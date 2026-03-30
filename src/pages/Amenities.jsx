import { Wifi, Wind, Music, Tv, Bath } from 'lucide-react'

const AMENITIES = [
  { icon: Wifi, label: 'Free WiFi', desc: 'Stay connected with high-speed internet while you enjoy your meal.' },
  { icon: Wind, label: 'Air Conditioned', desc: 'Comfortable, cool dining environment throughout the year.' },
  { icon: Music, label: 'Live Music', desc: 'Enjoy soulful live performances on select evenings.' },
  { icon: Tv, label: 'TV Screens', desc: 'Watch your favourite sports and shows while dining.' },
  { icon: Bath, label: 'Clean Restrooms', desc: 'Well-maintained restrooms available for all our guests.' },
]

export default function Amenities() {
  return (
    <div className="pt-20 min-h-screen bg-cream-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="section-title mb-3">Our Amenities</h1>
          <p className="text-gray-500">Everything we offer to make your visit exceptional</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {AMENITIES.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="card p-8 flex items-start gap-5 hover:shadow-md transition-shadow group">
              <div className="w-14 h-14 bg-primary-100 group-hover:bg-primary-600 rounded-2xl flex items-center justify-center transition-colors shrink-0">
                <Icon size={26} className="text-primary-600 group-hover:text-white transition-colors" />
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold text-gray-900 mb-2">{label}</h3>
                <p className="text-gray-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
