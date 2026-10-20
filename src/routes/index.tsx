import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ApprovalCard } from '~/components/ApprovalCard'
import { Avatar } from '~/components/Avatar'
import { PushToggle } from '~/components/PushToggle'
import { useVisibleCards } from '~/components/useVisibleCards'
import { client, keys } from '~/lib/api'
import { relativeTime } from '~/lib/time'

export const Route = createFileRoute('/')({ component: Ravens })

function Ravens() {
  const agents = useQuery({ queryKey: keys.agents, queryFn: client.agents })
  const pending = useQuery({ queryKey: keys.pending, queryFn: client.pending })
  const cards = useVisibleCards(pending.data)
  const nameOf = (folder: string | null) => agents.data?.find((a) => a.folder === folder)?.name

  return (
    <main className="page">
      <header className="page-header">
        <h1>Ravens</h1>
      </header>
      <PushToggle />

      {cards.length > 0 && (
        <section aria-labelledby="needs-you">
          <h2 id="needs-you" className="section-title">
            Needs you <span className="count">{pending.data?.length ?? 0}</span>
          </h2>
          <div className="cards">
            {cards.map((card) => (
              <ApprovalCard key={card.questionId} card={card} ravenName={nameOf(card.folder)} />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="ravens">
        <h2 id="ravens" className="section-title">
          Your ravens
        </h2>
        {agents.isError && <p className="card-error">{(agents.error as Error).message}</p>}
        <ul className="list">
          {agents.data?.map((agent) => (
            <li key={agent.folder}>
              <Link to="/r/$folder" params={{ folder: agent.folder }} className="row">
                <Avatar name={agent.name} folder={agent.folder} />
                <span className="row-text">
                  <span className="row-title">{agent.name}</span>
                  <span className="row-sub">{agent.lastActive ? relativeTime(agent.lastActive) : 'No web threads yet'}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
