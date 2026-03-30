import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ShoppingCart, Menu, X, User, LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useRestaurant } from '../../context/RestaurantContext'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const { user, profile, signOut, isOwner } = useAuth()
  const { itemCount } = useCart()
  const { settings } = useRestaurant()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [location])

  const navLinks = [
    { label: 'Home', to: '/' },
    { label: "Today's Special", to: '/todays-special' },
    { label: 'Menu', to: '/menu' },
    { label: 'Amenities', to: '/amenities' },
    { label: 'Testimonials', to: '/testimonials' },
    { label: 'About Us', to: '/about' },
    { label: 'Contact', to: 'tel:' + settings.phone, external: true },
    ...(user ? [{ label: 'Track Order', to: '/track-order' }, { label: 'Book Table', to: '/book-table' }] : []),
  ]

  const handleSignOut = async () => {
    await signOut()
    setProfileOpen(false)
    navigate('/')
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${scrolled ? 'bg-white/60 backdrop-blur-xl shadow-lg' : 'bg-white/80 backdrop-blur-md shadow-sm'}`}>
      {!settings.is_open && (
        <div className="bg-red-600 text-white text-center text-sm py-2 px-4 font-medium">
          🔴 Restaurant is currently closed. We'll be back soon!
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="font-display text-2xl font-bold text-primary-700 flex items-center gap-2">
            <span className="text-3xl">🍽</span>
            <span>{settings.name}</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map(link =>
              link.external ? (
                <a key={link.label} href={link.to} className="btn-ghost text-sm">{link.label}</a>
              ) : (
                <Link key={link.label} to={link.to} className={`btn-ghost text-sm ${location.pathname === link.to ? 'text-primary-600 bg-primary-50' : ''}`}>
                  {link.label}
                </Link>
              )
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Cart */}
            <Link to="/cart" className="relative p-2 hover:bg-primary-50 rounded-xl transition-colors">
              <ShoppingCart size={22} className="text-gray-700" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>

            {/* Auth */}
            {user ? (
              <div className="relative">
                <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 hover:bg-primary-50 rounded-xl px-3 py-2 transition-colors">
                  {user.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="avatar" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center">
                      <User size={14} className="text-primary-700" />
                    </div>
                  )}
                  <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[100px] truncate">
                    {profile?.name || user.user_metadata?.full_name?.split(' ')[0] || 'Profile'}
                  </span>
                  <ChevronDown size={14} className="text-gray-500" />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-fade-in">
                    <Link to="/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors">
                      <User size={14} /> My Profile
                    </Link>
                    <Link to="/track-order" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors">
                      📦 Track Order
                    </Link>
                    {isOwner && (
                      <Link to="/owner" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors">
                        ⚙️ Owner Dashboard
                      </Link>
                    )}
                    <hr className="my-1 border-gray-100" />
                    <button onClick={handleSignOut} className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left">
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="btn-primary text-sm py-2 px-4">Login</Link>
            )}

            {/* Mobile menu toggle */}
            <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden p-2 hover:bg-primary-50 rounded-xl transition-colors">
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 px-4 pb-4 animate-fade-in">
          {navLinks.map(link =>
            link.external ? (
              <a key={link.label} href={link.to} className="block py-3 text-gray-700 hover:text-primary-600 border-b border-gray-50 text-sm font-medium">{link.label}</a>
            ) : (
              <Link key={link.label} to={link.to} className={`block py-3 border-b border-gray-50 text-sm font-medium ${location.pathname === link.to ? 'text-primary-600' : 'text-gray-700 hover:text-primary-600'}`}>
                {link.label}
              </Link>
            )
          )}
        </div>
      )}
    </nav>
  )
}
