import { describe, expect, it } from 'bun:test';
import { sampleRequest } from './mocks/sampleRequest.js';

describe('Server', () => {
  it('should handle incoming cast mentions', async () => {
    const response = await fetch('http://localhost:3000/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sampleRequest),
    });

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain('Replied to the cast with hash:');
  });

  it('should return 200 for health check', async () => {
    const response = await fetch('http://localhost:3000/health');
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe('Server is running');
  });
});
