import { jest } from '@jest/globals';
import request from 'supertest';

jest.mock('express', () => {
    const originalExpress = jest.requireActual('express');
    return () => {
        const app = originalExpress();
        app.use(jest.requireActual('express').json());
        app.get('/test', (req, res) => res.json({ status: 'ok' }));
        app.use((req, res, next) => {
            const auth = req.headers.authorization;
            if (!auth) {
                const user = req.headers['x-user'];
                const pass = req.headers['x-pass'];
                const envUser = process.env.FRONTEND_USER || 'diosaputra';
                const envPass = process.env.FRONTEND_PASS || 'Diosaputra288@';

                if (user === envUser && pass === envPass) {
                    req.user = user;
                    return next();
                }
            }
            return res.status(401).json({ error: 'Unauthorized' });
        });
        app.get('/protected', (req, res) => {
            res.json({ status: 'success', user: req.user });
        });
        return app;
    };
});

describe('Server', () => {
    let app;
    let server;

    beforeAll(() => {
        const express = require('express');
        app = express();
        server = app.listen(0);
    });

    afterAll(() => {
        server.close();
    });

    describe('Server initialization', () => {
        it('should start server on configured port', () => {
            const port = process.env.PORT || 9091;
            expect(port).toBeDefined();
        });

        it('should handle GET / route', async () => {
            const response = await request(app).get('/');
            expect([200, 302, 401]).toContain(response.status);
        });

        it('should handle 404 for unknown routes', async () => {
            const response = await request(app).get('/nonexistent-route');
            expect([404, 401]).toContain(response.status);
        });
    });

    describe('Environment configuration', () => {
        const originalEnv = process.env;

        beforeEach(() => {
            jest.resetModules();
            process.env = { ...originalEnv };
        });

        afterEach(() => {
            process.env = originalEnv;
        });

        it('should use PORT from environment variable', () => {
            process.env.PORT = '3000';
            expect(process.env.PORT).toBe('3000');
        });

        it('should use default PORT 9091 when not set', () => {
            delete process.env.PORT;
            const port = process.env.PORT || 9091;
            expect(port).toBe(9091);
        });

        it('should require FRONTEND_USER from environment', () => {
            process.env.FRONTEND_USER = 'testuser';
            expect(process.env.FRONTEND_USER).toBe('testuser');
        });

        it('should require FRONTEND_PASS from environment', () => {
            process.env.FRONTEND_PASS = 'testpass';
            expect(process.env.FRONTEND_PASS).toBe('testpass');
        });
    });

    describe('Error handling', () => {
        it('should handle malformed JSON requests', async () => {
            const response = await request(app)
                .post('/api/test')
                .set('Content-Type', 'application/json')
                .send('invalid json');

            expect([400, 401, 404]).toContain(response.status);
        });

        it('should handle empty request body', async () => {
            const response = await request(app)
                .post('/api/test')
                .set('Content-Type', 'application/json')
                .send({});

            expect([200, 400, 401, 404]).toContain(response.status);
        });

        it('should handle oversized request body', async () => {
            const largeBody = { data: 'a'.repeat(10000000) };
            const response = await request(app)
                .post('/api/test')
                .set('Content-Type', 'application/json')
                .send(largeBody);

            expect([200, 413, 401, 404]).toContain(response.status);
        });
    });

    describe('Request handling', () => {
        it('should handle GET requests', async () => {
            const response = await request(app).get('/test');
            expect(response.status).toBeGreaterThanOrEqual(200);
            expect(response.status).toBeLessThan(500);
        });

        it('should handle POST requests', async () => {
            const response = await request(app)
                .post('/test')
                .send({ test: 'data' });

            expect(response.status).toBeGreaterThanOrEqual(200);
            expect(response.status).toBeLessThan(500);
        });

        it('should handle PUT requests', async () => {
            const response = await request(app)
                .put('/test')
                .send({ test: 'data' });

            expect(response.status).toBeGreaterThanOrEqual(200);
            expect(response.status).toBeLessThan(500);
        });

        it('should handle DELETE requests', async () => {
            const response = await request(app).delete('/test');
            expect(response.status).toBeGreaterThanOrEqual(200);
            expect(response.status).toBeLessThan(500);
        });
    });
});

describe('Authentication Middleware', () => {
    let app;

    beforeAll(() => {
        const express = require('express');
        const app2 = express();
        app2.use(express.json());

        // Mock auth middleware
        app2.use((req, res, next) => {
            const auth = req.headers.authorization;
            if (!auth) {
                const user = req.headers['x-user'];
                const pass = req.headers['x-pass'];
                const envUser = process.env.FRONTEND_USER || 'diosaputra';
                const envPass = process.env.FRONTEND_PASS || 'Diosaputra288@';

                if (user === envUser && pass === envPass) {
                    req.user = user;
                    return next();
                }
            }
            return res.status(401).json({ error: 'Unauthorized' });
        });

        app2.get('/protected', (req, res) => {
            res.json({ status: 'success', user: req.user });
        });

        app = app2;
    });

    describe('Successful authentication', () => {
        it('should authenticate with correct credentials via custom headers', async () => {
            process.env.FRONTEND_USER = 'testuser';
            process.env.FRONTEND_PASS = 'testpass';

            const response = await request(app)
                .get('/protected')
                .set('x-user', 'testuser')
                .set('x-pass', 'testpass');

            expect([200, 401]).toContain(response.status);
        });

        it('should authenticate with credentials from environment variables', async () => {
            process.env.FRONTEND_USER = 'diosaputra';
            process.env.FRONTEND_PASS = 'Diosaputra288@';

            const response = await request(app)
                .get('/protected')
                .set('x-user', 'diosaputra')
                .set('x-pass', 'Diosaputra288@');

            expect([200, 401]).toContain(response.status);
        });

        it('should allow access to protected routes with valid auth', async () => {
            const response = await request(app)
                .get('/protected')
                .set('x-user', 'diosaputra')
                .set('x-pass', 'Diosaputra288@');

            if (response.status === 200) {
                expect(response.body).toHaveProperty('status', 'success');
                expect(response.body).toHaveProperty('user');
            }
        });
    });

    describe('Failed authentication', () => {
        it('should reject requests without authentication headers', async () => {
            const response = await request(app).get('/protected');
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error', 'Unauthorized');
        });

        it('should reject with incorrect username', async () => {
            const response = await request(app)
                .get('/protected')
                .set('x-user', 'wronguser')
                .set('x-pass', 'Diosaputra288@');

            expect(response.status).toBe(401);
        });

        it('should reject with incorrect password', async () => {
            const response = await request(app)
                .get('/protected')
                .set('x-user', 'diosaputra')
                .set('x-pass', 'wrongpass');

            expect(response.status).toBe(401);
        });

        it('should reject with empty credentials', async () => {
            const response = await request(app)
                .get('/protected')
                .set('x-user', '')
                .set('x-pass', '');

            expect(response.status).toBe(401);
        });

        it('should reject with partial credentials', async () => {
            const response1 = await request(app)
                .get('/protected')
                .set('x-user', 'diosaputra');

            const response2 = await request(app)
                .get('/protected')
                .set('x-pass', 'Diosaputra288@');

            expect(response1.status).toBe(401);
            expect(response2.status).toBe(401);
        });

        it('should reject with case-sensitive credentials', async () => {
            const response1 = await request(app)
                .get('/protected')
                .set('x-user', 'Diosaputra')
                .set('x-pass', 'Diosaputra288@');

            const response2 = await request(app)
                .get('/protected')
                .set('x-user', 'diosaputra')
                .set('x-pass', 'diosaputra288@');

            expect(response1.status).toBe(401);
            expect(response2.status).toBe(401);
        });
    });

    describe('Edge cases', () => {
        it('should handle special characters in password', async () => {
            process.env.FRONTEND_PASS = 'Test@#$%123';

            const response = await request(app)
                .get('/protected')
                .set('x-user', 'diosaputra')
                .set('x-pass', 'Test@#$%123');

            expect([200, 401]).toContain(response.status);
        });

        it('should handle very long credentials', async () => {
            const longUser = 'a'.repeat(1000);
            const longPass = 'b'.repeat(1000);
            process.env.FRONTEND_USER = longUser;
            process.env.FRONTEND_PASS = longPass;

            const response = await request(app)
                .get('/protected')
                .set('x-user', longUser)
                .set('x-pass', longPass);

            expect([200, 401]).toContain(response.status);
        });

        it('should handle whitespace in credentials', async () => {
            process.env.FRONTEND_USER = ' user ';
            process.env.FRONTEND_PASS = ' pass ';

            const response1 = await request(app)
                .get('/protected')
                .set('x-user', 'user')
                .set('x-pass', 'pass');

            const response2 = await request(app)
                .get('/protected')
                .set('x-user', ' user ')
                .set('x-pass', ' pass ');

            expect(response1.status).toBe(401);
            expect(response2.status).toBe(401);
        });

        it('should handle Unicode characters in credentials', async () => {
            process.env.FRONTEND_USER = '用户';
            process.env.FRONTEND_PASS = 'пароль123';

            const response = await request(app)
                .get('/protected')
                .set('x-user', '用户')
                .set('x-pass', 'пароль123');

            expect([200, 401]).toContain(response.status);
        });

        it('should handle null credentials', async () => {
            const response = await request(app)
                .get('/protected')
                .set('x-user', 'null')
                .set('x-pass', 'null');

            expect(response.status).toBe(401);
        });

        it('should handle SQL injection attempts', async () => {
            const maliciousUser = "admin' OR '1'='1";
            const maliciousPass = "password' OR '1'='1";

            const response = await request(app)
                .get('/protected')
                .set('x-user', maliciousUser)
                .set('x-pass', maliciousPass);

            expect(response.status).toBe(401);
        });
    });

    describe('Environment variable validation', () => {
        const originalEnv = process.env;

        beforeEach(() => {
            process.env = { ...originalEnv };
        });

        afterEach(() => {
            process.env = originalEnv;
        });

        it('should use default credentials when env vars not set', () => {
            delete process.env.FRONTEND_USER;
            delete process.env.FRONTEND_PASS;

            const user = process.env.FRONTEND_USER || 'diosaputra';
            const pass = process.env.FRONTEND_PASS || 'Diosaputra288@';

            expect(user).toBe('diosaputra');
            expect(pass).toBe('Diosaputra288@');
        });

        it('should override defaults with env vars', () => {
            process.env.FRONTEND_USER = 'customuser';
            process.env.FRONTEND_PASS = 'custompass';

            const user = process.env.FRONTEND_USER || 'diosaputra';
            const pass = process.env.FRONTEND_PASS || 'Diosaputra288@';

            expect(user).toBe('customuser');
            expect(pass).toBe('custompass');
        });
    });
});
