import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ApprovalCard } from '~/components/ApprovalCard'
import { useVisibleCards } from '~/components/useVisibleCards'
import { client, keys } from '~/lib/api'

// Where a push notification lands: /needs-you#<questionId> highlights the card.
export const Route = createFileRoute('/needs-you')({ component: NeedsYou })

function NeedsYou() {
  const agents = useQuery({ queryKey: keys.agents, queryFn: client.agents })
  const pending = useQuery({ queryKey: keys.pending, queryFn: client.pending })
  const cards = useVisibleCards(pending.data)
  const [target, setTarget] = useState<string | null>(null)

  useEffect(() => {
    const read = () => setTarget(decodeURIComponent(location.hash.slice(1)) || null)
    read()
    window.addEventListener('hashchange', read)
    return () => window.removeEventListener('hashchange', read)
  }, [])
  useEffect(() => {
    if (target) document.getElementById(target)?.scrollIntoView({ block: 'center' })
  }, [target, cards.length])

  return (
    <main className="page">
      <header className="page-header">
        <Link to="/" className="back" aria-label="Back to Ravens">
          ‹
        </Link>
        <h1>Needs you</h1>
      </header>
      {pending.isSuccess && cards.length === 0 && (
        <p className="empty">You're caught up. Your ravens will ask here when they need you.</p>
      )}
      <div className="cards">
        {cards.map((card) => (
          <ApprovalCard
            key={card.questionId}
            card={card}
            ravenName={agents.data?.find((a) => a.folder === card.folder)?.name}
            highlight={card.questionId === target}
          />
        ))}
      </div>
    </main>
  )
}
