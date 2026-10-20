import { useState, type ReactNode } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useArchive } from '~/components/useArchive'
import { client, keys, newThreadId } from '~/lib/api'
import { relativeTime } from '~/lib/time'
import type { Thread } from '~/lib/types'

export const Route = createFileRoute('/r/$folder/')({ component: Threads })

function Threads() {
  const { folder } = Route.useParams()
  const navigate = useNavigate()
  const threads = useQuery({ queryKey: keys.threads(folder), queryFn: () => client.threads(folder) })
  const archive = useArchive(folder)
  const [showArchived, setShowArchived] = useState(false)
  const open = threads.data?.filter((t) => !t.archived) ?? []
  const archived = threads.data?.filter((t) => t.archived) ?? []

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
      {threads.isSuccess && open.length === 0 && (
        <p className="empty">{archived.length ? 'No open threads.' : 'No threads yet.'}</p>
      )}
      <ThreadList folder={folder} threads={open} />

      {archived.length > 0 && (
        <>
          <button
            type="button"
            className="section-toggle"
            aria-expanded={showArchived}
            onClick={() => setShowArchived((v) => !v)}
          >
            Archived ({archived.length}) <span aria-hidden="true">{showArchived ? '▾' : '▸'}</span>
          </button>
          {showArchived && (
            <ThreadList
              folder={folder}
              threads={archived}
              action={(t) => (
                <button
                  type="button"
                  className="btn small"
                  disabled={archive.isPending}
                  onClick={() => archive.mutate({ threadId: t.threadId, archived: false })}
                >
                  Unarchive
                </button>
              )}
            />
          )}
        </>
      )}
      {archive.isError && <p className="card-error">{(archive.error as Error).message}</p>}
    </main>
  )
}

function ThreadList({
  folder,
  threads,
  action,
}: {
  folder: string
  threads: Thread[]
  action?: (thread: Thread) => ReactNode
}) {
  return (
    <ul className="list">
      {threads.map((t) => (
        <li key={t.threadId} className="row-with-action">
          <Link to="/r/$folder/t/$threadId" params={{ folder, threadId: t.threadId }} className="row">
            <span className="row-text">
              <span className="row-title">{t.title ?? 'Untitled thread'}</span>
              <span className="row-sub">
                {relativeTime(t.lastActive ?? t.createdAt)}
                {t.containerStatus === 'running' && ' · working'}
              </span>
            </span>
          </Link>
          {action?.(t)}
        </li>
      ))}
    </ul>
  )
}
