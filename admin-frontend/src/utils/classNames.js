/**
 * Join class names, ignoring falsy values.
 * Supports strings and object maps: classNames('a', cond && 'b', { c: true })
 */
export default function classNames(...classes) {
  const result = []

  classes.forEach((cls) => {
    if (!cls) return

    if (typeof cls === 'string' || typeof cls === 'number') {
      result.push(cls)
    } else if (Array.isArray(cls)) {
      result.push(classNames(...cls))
    } else if (typeof cls === 'object') {
      Object.entries(cls).forEach(([key, value]) => {
        if (value) result.push(key)
      })
    }
  })

  return result.join(' ')
}
