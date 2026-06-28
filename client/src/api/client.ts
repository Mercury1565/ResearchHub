import ky from 'ky';

const TOKEN_KEY = 'rh_token';

export const apiClient = ky.create({
  prefixUrl: '/api',
  timeout: 30_000,
  retry: { limit: 1 },
  hooks: {
    beforeRequest: [
      (request) => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
      },
    ],
  },
});
