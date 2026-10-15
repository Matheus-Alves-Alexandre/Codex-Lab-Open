// @vitest-environment node
import { it, expect } from 'vitest';
import request from 'supertest';
import { createApiApp } from '../../server/app';
it('serves health status', async () => { const res = await request(createApiApp()).get('/api/health'); expect(res.status).toBe(200); expect(res.body).toEqual({ status: 'ok' }); });
it('keeps invalid API routes out of SPA fallback', async () => { const res = await request(createApiApp()).get('/api/nope'); expect(res.status).toBe(404); });
it('mounts shared image validation in Express', async () => { const res = await request(createApiApp()).get('/api/image-proxy').query({ url: 'http://127.0.0.1' }); expect(res.status).toBe(400); });
