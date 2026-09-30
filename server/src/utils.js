// Mongoose Map fields are Map instances; JSON.stringify would turn them into {}.
export const mapToObj = (m) => {
  if (!m) return {}
  if (m instanceof Map) return Object.fromEntries(m)
  if (typeof m.toObject === "function") return m.toObject()
  return m
}
