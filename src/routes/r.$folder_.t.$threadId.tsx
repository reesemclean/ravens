import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ThreadView } from '~/components/ThreadView'
import { client, keys } from '~/lib/api'

export const Route = createFileRoute('/r/$folder_/t/$threadId')({ component: ThreadPage })

function ThreadPage() {
  const { folder, threadId } = Route.useParams()
  const threads = useQuery({ queryKey: keys.threads(folder), queryFn: () => client.threads(folder) })
  const title = threads.data?.find((t) => t.threadId === threadId)?.title
  // assistant-ui renders in the browser only.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <div className="thread-page">
      <header className="thread-header">
        <Link to="/r/$folder" params={{ folder }} className="back" aria-label="Back to threads">
          ‹
        </Link>
        <h2>{title ?? 'New thread'}</h2>
      </header>
      {mounted && <ThreadView folder={folder} threadId={threadId} />}
    </div>
  )
}
