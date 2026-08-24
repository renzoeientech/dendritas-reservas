export function getErrorMessage(error, fallback = 'Ocurrió un error inesperado.') {
  const data = error?.response?.data
  if (!error?.response) {
    return 'No se pudo conectar con el servidor.'
  }
  if (!data || typeof data !== 'object') {
    return fallback
  }
  const messages = Object.values(data).flatMap((value) => (Array.isArray(value) ? value : [String(value)]))
  return messages.length > 0 ? messages.join(' ') : fallback
}
