import zlib from 'zlib';

const MIN_COMPRESS_BYTES = 1024;

/**
 * Lightweight, zero-dependency gzip compression middleware for JSON responses.
 * Shrinks large GeoJSON route polylines, trajectories, and list payloads over the wire.
 */
export function gzipCompression() {
  return (req, res, next) => {
    const acceptEncoding = req.headers['accept-encoding'] || '';
    if (!/\bgzip\b/i.test(acceptEncoding)) {
      return next();
    }

    const originalJson = res.json.bind(res);

    res.json = (body) => {
      if (res.headersSent) {
        return originalJson(body);
      }

      const jsonStr = JSON.stringify(body);
      if (!jsonStr || Buffer.byteLength(jsonStr, 'utf8') < MIN_COMPRESS_BYTES) {
        return originalJson(body);
      }

      zlib.gzip(Buffer.from(jsonStr, 'utf8'), { level: zlib.constants.Z_BEST_SPEED }, (err, compressed) => {
        if (err || res.headersSent) {
          return originalJson(body);
        }
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Vary', 'Accept-Encoding');
        res.setHeader('Content-Length', compressed.length);
        res.end(compressed);
      });

      return res;
    };

    next();
  };
}
