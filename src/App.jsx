import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import Navbar   from './components/Navbar.jsx'
import Hero     from './components/Hero.jsx'
import Marquee  from './components/Marquee.jsx'
import Story    from './components/Story.jsx'
import Services from './components/Services.jsx'
import Spaces   from './components/Spaces.jsx'
import Reviews  from './components/Reviews.jsx'
import Booking  from './components/Booking.jsx'
import Map      from './components/Map.jsx'
import Footer   from './components/Footer.jsx'

const Login    = lazy(() => import('./pages/Login.jsx'))
const Admin    = lazy(() => import('./pages/Admin.jsx'))
const Cancel   = lazy(() => import('./pages/Cancel.jsx'))
const MePortal = lazy(() => import('./pages/MePortal.jsx'))
const MeLogin  = lazy(() => import('./pages/MeLogin.jsx'))
const Privacy  = lazy(() => import('./pages/Privacy.jsx'))

function Site() {
  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <main>
        <Hero />
        <Marquee tone="ember" />
        <Story />
        <Services />
        <Marquee tone="bronze" />
        <Spaces />
        <Reviews />
        <Booking />
        <Map />
      </main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<div className="min-h-screen bg-ink" />}>
          <Routes>
            <Route path="/"            element={<Site />} />
            <Route path="/login"       element={<MeLogin />} />
            <Route path="/me"          element={<MePortal />} />
            <Route path="/admin/login" element={<Login />} />
            <Route path="/admin"       element={<Admin />} />
            <Route path="/cancel/:id"  element={<Cancel />} />
            <Route path="/privacy"     element={<Privacy />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
