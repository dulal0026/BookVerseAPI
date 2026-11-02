import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

process.env.NODE_ENV = 'test';
const { createApp } = await import('../src/app.js');

test('unknown API routes return the documented error envelope', async () => {
  const response = await request(createApp()).get('/api/v1/not-implemented');
  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, 'NOT_FOUND');
  assert.ok(response.body.meta.request_id);
});
