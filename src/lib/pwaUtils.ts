const ensureLeadingSlash = (value: string) => {
  if (!value) {
    return '/'
  }

  return value.startsWith('/') ? value : `/${value}`
}

const ensureTrailingSlash = (value: string) => (value.endsWith('/') ? value : `${value}/`)

export const getBasePath = () => {
  const base = (import.meta.env?.BASE_URL ?? '/') as string
  const withLeadingSlash = ensureLeadingSlash(base)
  return ensureTrailingSlash(withLeadingSlash)
}

export const getServiceWorkerUrl = () => `${getBasePath()}sw.js`

export const getServiceWorkerScope = () => getBasePath()
