// Archive or unarchive a thread, updating the cached list at once so the
// thread moves sections without waiting for the server.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { client, keys } from '~/lib/api'
import type { Thread } from '~/lib/types'

export function useArchive(folder: string) {
  const queryClient = useQueryClient()
  const key = keys.threads(folder)
  return useMutation({
    mutationFn: ({ threadId, archived }: { threadId: string; archived: boolean }) =>
      client.archive(folder, threadId, archived),
    onMutate: async ({ threadId, archived }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const before = queryClient.getQueryData<Thread[]>(key)
      queryClient.setQueryData<Thread[]>(key, (threads) =>
        threads?.map((t) => (t.threadId === threadId ? { ...t, archived } : t)),
      )
      return { before }
    },
    onError: (_err, _vars, context) => queryClient.setQueryData(key, context?.before),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: key }),
  })
}
