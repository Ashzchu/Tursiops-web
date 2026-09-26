/**
 * Vercel Serverless Function entrypoint with Diagnostic Catch
 */
export default async function handler(req, res) {
  try {
    const { default: app } = await import('../server.js');
    return app(req, res);
  } catch (err) {
    console.error('[FATAL SERVERLESS ERROR]', err);
    return res.status(500).json({
      error: 'Serverless Error',
      name: err.name,
      message: err.message,
      stack: err.stack,
    });
  }
}


