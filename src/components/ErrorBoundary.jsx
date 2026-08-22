import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // Surfaced for debugging; in production this could go to a logging service.
    console.error('App error:', error, info)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-ink flex flex-col items-center justify-center px-6 text-center">
          <div className="max-w-sm">
            <p className="text-bronze text-[10px] font-sans tracking-[0.3em] uppercase mb-3">One World ByME</p>
            <h1 className="text-bone font-serif italic text-3xl mb-4">Κάτι πήγε στραβά.</h1>
            <p className="text-bone/60 text-sm font-sans leading-relaxed mb-8">
              Παρουσιάστηκε ένα απρόσμενο σφάλμα. Δοκίμασε να φορτώσεις ξανά τη σελίδα.
            </p>
            <button
              onClick={this.handleReload}
              className="bg-bronze hover:bg-amber text-ink font-sans font-semibold text-xs tracking-[0.22em] uppercase px-8 py-3.5 rounded-full transition-colors cursor-pointer"
            >
              Επαναφόρτωση
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
