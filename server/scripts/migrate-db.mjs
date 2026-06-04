// One-off: copy all collections from the default `test` database into a
// named database. Non-destructive — the source database is left untouched.
//
// Usage: node scripts/migrate-db.mjs <sourceDbName> <targetDbName>
import "dotenv/config"
import mongoose from "mongoose"

const SOURCE = process.argv[2] || "test"
const TARGET = process.argv[3] || "personal-tracker"

if (SOURCE === TARGET) {
  console.error("Source and target must differ")
  process.exit(1)
}

await mongoose.connect(process.env.MONGODB_URI)
const client = mongoose.connection.getClient()
const src = client.db(SOURCE)
const dst = client.db(TARGET)

const collections = await src.listCollections().toArray()
console.log(`Copying ${collections.length} collections: ${SOURCE} -> ${TARGET}\n`)

for (const { name } of collections) {
  // Make the copy idempotent: clear the target collection first.
  await dst.collection(name).drop().catch(() => {})

  const docs = await src.collection(name).find({}).toArray()
  if (docs.length) await dst.collection(name).insertMany(docs, { ordered: true })

  // Recreate non-_id indexes (e.g. the unique userId compound indexes).
  const indexes = await src.collection(name).indexes()
  for (const idx of indexes) {
    if (idx.name === "_id_") continue
    const { key, name: idxName, v, ns, ...options } = idx
    await dst.collection(name).createIndex(key, { name: idxName, ...options })
  }

  const srcCount = docs.length
  const dstCount = await dst.collection(name).countDocuments()
  const ok = srcCount === dstCount ? "OK" : "MISMATCH"
  console.log(`${String(dstCount).padStart(5)}  ${name.padEnd(16)} ${ok}`)
}

console.log("\nDone.")
await mongoose.disconnect()
process.exit(0)
