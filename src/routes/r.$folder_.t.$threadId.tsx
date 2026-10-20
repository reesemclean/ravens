import { useEffect, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ThreadView } from '~/components/ThreadView'
import { useArchive } from '~/components/useArchive'
import { client, keys } from '~/lib/api'

export const Route = createFileRoute('/r/$folder_/t/$threadId')({ component: ThreadPage })

function ThreadPage() {
  const { folder, threadId } = Route.useParams()
  const threads = useQuery({ queryKey: keys.threads(folder), queryFn: () => client.threads(folder) })
  const thread = threads.data?.find((t) => t.threadId === threadId)
  const navigate = useNavigate()
  const archive = useArchive(folder)
  // assistant-ui renders in the browser only.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <div className="thread-page">
      <header className="thread-header">
        <Link to="/r/$folder" params={{ folder }} className="back" aria-label="Back to threads">
          ‹
        </Link>
        <h2>{thread?.title ?? 'New thread'}</h2>
        {thread && (
          <button
            type="button"
            className="header-action"
            disabled={archive.isPending}
            onClick={() =>
              thread.archived
                ? archive.mutate({ threadId, archived: false })
                : archive.mutate(
                    { threadId, archived: true },
                    { onSuccess: () => void navigate({ to: '/r/$folder', params: { folder } }) },
                  )
            }
          >
            {thread.archived ? 'Unarchive' : 'Archive'}
          </button>
        )}
      </header>
      {thread?.archived && <p className="archived-note">Archived. Sending a message reopens it.</p>}
      {archive.isError && <p className="card-error composer-error">{(archive.error as Error).message}</p>}
      {mounted && <ThreadView folder={folder} threadId={threadId} />}
    </div>
  )
}
