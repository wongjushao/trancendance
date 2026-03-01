from flask import Blueprint, Response


docs_bp = Blueprint("docs", __name__)


@docs_bp.get("/docs")
def api_docs():
    html = """
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Trancendance API Docs</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 2rem; line-height: 1.45; }
      h1, h2 { margin-bottom: 0.4rem; }
      .section { margin-top: 1.5rem; }
      code { background: #f3f4f6; padding: 0.2rem 0.35rem; border-radius: 4px; }
      table { border-collapse: collapse; width: 100%; margin-top: 0.8rem; }
      th, td { border: 1px solid #ddd; padding: 0.55rem; text-align: left; }
      th { background: #f9fafb; }
      .hint { color: #555; }
    </style>
  </head>
  <body>
    <h1>Trancendance API Docs</h1>
    <p class="hint">Gunicorn serves Flask applications but does not auto-generate API docs. This page is manually provided by the backend.</p>

    <div class="section">
      <h2>Auth Service</h2>
      <table>
        <thead>
          <tr><th>Method</th><th>Path</th><th>Notes</th></tr>
        </thead>
        <tbody>
          <tr><td>GET</td><td><code>/api/auth-service/health</code></td><td>Service health check</td></tr>
          <tr><td>GET</td><td><code>/api/auth-service/metrics</code></td><td>Prometheus metrics</td></tr>
          <tr><td>POST</td><td><code>/api/auth-service/register</code></td><td>Protected, requires <code>Authorization: Bearer &lt;token&gt;</code></td></tr>
          <tr><td>GET</td><td><code>/api/auth-service/docs</code></td><td>This documentation page</td></tr>
        </tbody>
      </table>
    </div>
  </body>
</html>
"""
    return Response(html, mimetype="text/html")