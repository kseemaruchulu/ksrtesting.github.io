// Shared utility functions

// Format date as DD/MM/YYYY
export const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

// Format date + time as DD/MM/YYYY HH:MM
export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

// Validate Indian phone number (10 digits, no country code)
export const validatePhone = (phone) => {
  const cleaned = phone.replace(/\s+/g, '').replace(/^\+91/, '').replace(/^0/, '')
  return /^[6-9]\d{9}$/.test(cleaned) ? cleaned : null
}
