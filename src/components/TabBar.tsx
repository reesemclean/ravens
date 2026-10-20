import { Link } from '@tanstack/react-router'

// Board D's tabs. Today and Outputs come later; they're shown, not live.
export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Sections">
      <button type="button" className="tab" disabled>
        Today
      </button>
      <Link to="/" className="tab" activeOptions={{ exact: false }} activeProps={{ 'aria-current': 'page' }}>
        Ravens
      </Link>
      <button type="button" className="tab" disabled>
        Outputs
      </button>
    </nav>
  )
}
