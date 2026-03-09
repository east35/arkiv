import { useEffect } from "react"
import { useShelfStore } from "@/store/useShelfStore"
import { useLists } from "@/hooks/useLists"
import { CreateListDialog } from "@/components/lists/CreateListDialog"
import { ListCard } from "@/components/lists/ListCard"

export default function Lists() {
  const { lists } = useShelfStore()
  const { fetchLists } = useLists()

  useEffect(() => {
    fetchLists()
  }, [fetchLists])

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lists</h1>
          <p className="text-muted-foreground mt-1">
            Organize your collection into custom lists.
          </p>
        </div>
        <CreateListDialog />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 -mx-4 px-4 sm:mx-0 sm:px-0">
        {lists.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
            <p className="text-lg font-medium mb-2">No lists yet</p>
            <p className="text-sm mb-4 max-w-sm">Create lists to organize your collection by theme, genre, or reading challenge.</p>
            <CreateListDialog />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 pb-8">
            {lists.map((list) => (
              <ListCard key={list.id} list={list} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
