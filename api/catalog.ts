import express from 'express';
import { createCatalogProxy } from '../server/catalog-proxy';

// Shared within a warm function instance, NOT a distributed limiter.
// For the 1,000-user deployment use the single gateway in docs/SCALING.md.
const app = express();
app.use((req, res, next) => {
  const url = new URL(req.url, 'http://localhost');
  const paths = url.searchParams.getAll('__catalog_path');
  if (paths.length !== 1 || !paths[0]) {
    res.status(400).json({ error: 'Missing catalog route' });
    return;
  }
  url.searchParams.delete('__catalog_path');
  req.url = `/${paths[0]}${url.search}`;
  next();
});
app.use(createCatalogProxy());
export default app;
