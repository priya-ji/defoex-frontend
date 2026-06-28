const { createProxyMiddleware } = require('http-proxy-middleware');

const LIVE_API = 'http://3.110.209.154';
const API_TARGET = process.env.REACT_APP_PROXY_TARGET || LIVE_API;

const proxyOpts = {
  target: API_TARGET,
  changeOrigin: true,
};

module.exports = function (app) {
  app.use('/api', createProxyMiddleware(proxyOpts));
  app.use('/health', createProxyMiddleware(proxyOpts));
};
