/** JSON 404 for unmatched API paths. Mounted after the real routes. */
export function notFound(req, res) {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
}