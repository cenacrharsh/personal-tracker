import { localRepository, repository } from "@/data"

// One-time migration: copy any data saved in THIS browser's localStorage
// up to the backend for the currently logged-in user.
export async function importLocalData(): Promise<{ imported: boolean }> {
  const [portfolio, cards, snapshots, bills, trackers] = await Promise.all([
    localRepository.getPortfolio(),
    localRepository.getCreditCards(),
    localRepository.listSnapshots(),
    localRepository.getBills(),
    localRepository.getTrackers(),
  ])

  const hasAny =
    portfolio || cards || (snapshots && snapshots.length > 0) || bills || trackers
  if (!hasAny) return { imported: false }

  if (portfolio) await repository.savePortfolio(portfolio)
  if (cards) await repository.saveCreditCards(cards)
  if (bills) await repository.saveBills(bills)
  if (trackers) await repository.saveTrackers(trackers)
  for (const snap of snapshots ?? []) await repository.upsertSnapshot(snap)

  return { imported: true }
}
