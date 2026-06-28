const { createProxyMiddleware } = require('http-proxy-middleware');

const API_TARGET = process.env.REACT_APP_PROXY_TARGET || 'http://3.110.209.154';

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: API_TARGET,
      changeOrigin: true,
    })
  );
};
