import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { client, keys, newThreadId } from '~/lib/api'
import { relativeTime } from '~/lib/time'

export const Route = createFileRoute('/r/$folder/')({ component: Threads })

function Threads() {
  const { folder } = Route.useParams()
  const navigate = useNavigate()
  const threads = useQuery({ queryKey: keys.threads(folder), queryFn: () => client.threads(folder) })

  return (
    <main className="page">
      <button
        type="button"
        className="btn primary wide"
        onClick={() => navigate({ to: '/r/$folder/t/$threadId', params: { folder, threadId: newThreadId() } })}
      >
        New thread
      </button>
      {threads.isError && <p className="card-error">{(threads.error as Error).message}</p>}
      {threads.isSuccess && threads.data.length === 0 && <p className="empty">No threads yet.</p>}
      <ul className="list">
        {threads.data?.map((t) => (
          <li key={t.threadId}>
            <Link to="/r/$folder/t/$threadId" params={{ folder, threadId: t.threadId }} className="row">
              <span className="row-text">
                <span className="row-title">{t.title ?? 'Untitled thread'}</span>
                <span className="row-sub">
                  {relativeTime(t.lastActive ?? t.createdAt)}
                  {t.containerStatus === 'running' && ' · working'}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
