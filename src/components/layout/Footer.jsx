import { Link } from 'react-router-dom'
import { useRestaurant } from '../../context/RestaurantContext'
import { Phone, Mail, MapPin, Clock } from 'lucide-react'

export default function Footer() {
  const { settings } = useRestaurant()
  return (
    <footer className="bg-gray-900 text-gray-300 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div>
            <div className="font-display text-2xl font-bold text-white mb-3 flex items-center gap-2">
              <span className="text-3xl">🍽</span>{settings.name}
            </div>
            <p className="text-sm leading-relaxed text-gray-400 mb-4">{settings.tagline}</p>
            <Link to="/about" className="inline-block bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors">
              About Us
            </Link>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="font-display text-lg font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              {[['Home', '/'], ["Today's Special", '/todays-special'], ['Menu', '/menu'], ['Amenities', '/amenities'], ['Testimonials', '/testimonials']].map(([label, to]) => (
                <li key={label}><Link to={to} className="hover:text-primary-400 transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display text-lg font-semibold text-white mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2"><MapPin size={15} className="text-primary-400 mt-0.5 shrink-0" /><span>{settings.address}</span></li>
              <li className="flex items-center gap-2"><Phone size={15} className="text-primary-400 shrink-0" /><a href={`tel:${settings.phone}`} className="hover:text-primary-400 transition-colors">{settings.phone}</a></li>
              <li className="flex items-center gap-2"><Mail size={15} className="text-primary-400 shrink-0" /><a href={`mailto:${settings.email}`} className="hover:text-primary-400 transition-colors">{settings.email}</a></li>
              <li className="flex items-center gap-2"><Clock size={15} className="text-primary-400 shrink-0" /><span>{settings.opening_hours}</span></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} {settings.name}. All rights reserved.</p>
          <p>
            Developed by{' '}
            <a href="mailto:developer@example.com" className="text-primary-400 hover:text-primary-300 transition-colors">
              Your Developer Name
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
