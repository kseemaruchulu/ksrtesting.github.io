import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { RestaurantProvider } from './context/RestaurantContext'
import { NotificationProvider } from './context/NotificationContext'
import { GlobalNotificationRenderer } from './components/ui/NotificationPopup'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import Home from './pages/Home'
import Menu from './pages/Menu'
import TodaysSpecial from './pages/TodaysSpecial'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import TrackOrder from './pages/TrackOrder'
import Login from './pages/Login'
import Profile from './pages/Profile'
import About from './pages/About'
import Amenities from './pages/Amenities'
import Testimonials from './pages/Testimonials'
import OwnerDashboard from './pages/OwnerDashboard'
import TableBooking from './pages/TableBooking'
import FloatingButtons from './components/ui/FloatingButtons'
import AnnouncementBar from './components/layout/AnnouncementBar'

// ── Scroll to top on every route change ──────────────────────────────────────
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      <Navbar />
      <AnnouncementBar />
      <main className="flex-1">{children}</main>
      <Footer />
      <FloatingButtons />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <RestaurantProvider>
            {/* NotificationProvider must be inside Auth so it can read user/isOwner */}
            <NotificationProvider>
              {/* GlobalNotificationRenderer shows popups on EVERY page */}
              <GlobalNotificationRenderer />
              <Toaster position="top-center" toastOptions={{ style: { fontFamily: "'DM Sans', sans-serif" } }} />
              {/* ScrollToTop must be inside BrowserRouter to use useLocation */}
              <ScrollToTop />
              <Routes>
                <Route path="/" element={<Layout><Home /></Layout>} />
                <Route path="/menu" element={<Layout><Menu /></Layout>} />
                <Route path="/todays-special" element={<Layout><TodaysSpecial /></Layout>} />
                <Route path="/cart" element={<Layout><Cart /></Layout>} />
                <Route path="/checkout" element={<Layout><Checkout /></Layout>} />
                <Route path="/track-order" element={<Layout><TrackOrder /></Layout>} />
                <Route path="/login" element={<Layout><Login /></Layout>} />
                <Route path="/profile" element={<Layout><Profile /></Layout>} />
                <Route path="/about" element={<Layout><About /></Layout>} />
                <Route path="/amenities" element={<Layout><Amenities /></Layout>} />
                <Route path="/testimonials" element={<Layout><Testimonials /></Layout>} />
                <Route path="/book-table" element={<Layout><TableBooking /></Layout>} />
                <Route path="/owner" element={<OwnerDashboard />} />
              </Routes>
            </NotificationProvider>
          </RestaurantProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
