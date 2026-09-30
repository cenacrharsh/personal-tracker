import { create } from "zustand"
import { toast } from "sonner"

export type SyncStatus = "idle" | "saving" | "saved" | "error"

type SyncState = {
  status: SyncStatus
}

export const useSyncStore = create<SyncState>()(() => ({
  status: "idle",
}))

type Save = () => Promise<void>

// The last request on each queue. Saves for the same item share a queue, so
// they run one after another and reach the server in the order they were made.
const queues = new Map<string, Promise<void>>()
// Saves that failed, per item, until they succeed or a newer save replaces them.
const failed = new Map<string, { save: Save; queue: string }>()
// How many saves each item has had, so a failure from an older save that a
// newer one already replaced is ignored instead of being retried later.
const saveCount = new Map<string, number>()
const timers = new Map<string, { timer: ReturnType<typeof setTimeout>; save: Save; queue: string }>()
let inFlight = 0
let errorShown = false

function settle() {
  if (failed.size > 0) {
    useSyncStore.setState({ status: "error" })
    if (!errorShown) toast.error("Couldn't save — your next edit will retry")
    errorShown = true
    return
  }
  useSyncStore.setState({ status: inFlight > 0 ? "saving" : "saved" })
  if (errorShown && inFlight === 0) {
    toast.success("Back online — changes saved")
    errorShown = false
  }
}

function enqueue(key: string, queue: string, save: Save) {
  const n = (saveCount.get(key) ?? 0) + 1
  saveCount.set(key, n)
  inFlight += 1
  if (failed.size === 0) useSyncStore.setState({ status: "saving" })
  const run = (queues.get(queue) ?? Promise.resolve()).then(save).then(
    () => {
      inFlight -= 1
      settle()
    },
    () => {
      inFlight -= 1
      if (saveCount.get(key) === n) failed.set(key, { save, queue })
      settle()
    },
  )
  queues.set(queue, run)
  void run.then(() => {
    if (queues.get(queue) === run) queues.delete(queue)
  })
}

// Send one item's save and track it in the sync badge. `key` names the item;
// `queue` groups items that must stay in order (e.g. a card and its months).
// Earlier failures are retried along with it.
export function trackSave(key: string, save: Save, queue = key): void {
  failed.delete(key) // this newer save replaces it
  for (const [k, f] of [...failed]) {
    failed.delete(k)
    enqueue(k, f.queue, f.save)
  }
  enqueue(key, queue, save)
}

// Like trackSave, but waits until edits to `key` pause, so typing into a field
// sends one request instead of one per keystroke. `save` runs at that point,
// so it should read the latest value from the store.
export function debounceSave(key: string, save: Save, queue = key): void {
  clearTimeout(timers.get(key)?.timer)
  timers.set(key, {
    timer: setTimeout(() => {
      timers.delete(key)
      trackSave(key, save, queue)
    }, 400),
    save,
    queue,
  })
}

// Send every edit still waiting on its debounce now, then wait until every
// request has finished.
export async function flushSaves(): Promise<void> {
  for (const [key, { timer, save, queue }] of [...timers]) {
    clearTimeout(timer)
    timers.delete(key)
    trackSave(key, save, queue)
  }
  while (queues.size > 0) await Promise.all(queues.values())
}

// Forget saves that failed, e.g. once the data they'd write has been wiped.
export function discardFailedSaves(): void {
  failed.clear()
  errorShown = false
  useSyncStore.setState({ status: inFlight > 0 ? "saving" : "idle" })
}
