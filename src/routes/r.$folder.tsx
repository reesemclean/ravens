import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Avatar } from '~/components/Avatar'
import { client, keys } from '~/lib/api'

// Inside a raven: the strip switches ravens; Chat is live, Activity and
// Access come later (board D).
export const Route = createFileRoute('/r/$folder')({ component: Raven })

function Raven() {
  const { folder } = Route.useParams()
  const agents = useQuery({ queryKey: keys.agents, queryFn: client.agents })
  const pending = useQuery({ queryKey: keys.pending, queryFn: client.pending })
  const agent = agents.data?.find((a) => a.folder === folder)
  const waiting = new Set(pending.data?.map((c) => c.folder))

  return (
    <div className="raven">
      <header className="raven-header">
        <Link to="/" className="back" aria-label="Back to Ravens">
          ‹
        </Link>
        <nav className="strip" aria-label="Ravens">
          {agents.data?.map((a) => (
            <Link
              key={a.folder}
              to="/r/$folder"
              params={{ folder: a.folder }}
              className="strip-item"
              aria-label={a.name}
              aria-current={a.folder === folder ? 'page' : undefined}
            >
              <Avatar name={a.name} folder={a.folder} size={36} />
              {waiting.has(a.folder) && <span className="dot" aria-label="needs you" />}
            </Link>
          ))}
        </nav>
      </header>
      <h1 className="raven-name">{agent?.name ?? folder}</h1>
      <div className="raven-tabs" role="tablist">
        <Link to="/r/$folder" params={{ folder }} className="raven-tab" role="tab" aria-selected="true">
          Chat
        </Link>
        <button type="button" className="raven-tab" role="tab" aria-selected="false" disabled>
          Activity
        </button>
        <button type="button" className="raven-tab" role="tab" aria-selected="false" disabled>
          Access
        </button>
      </div>
      <Outlet />
    </div>
  )
}
