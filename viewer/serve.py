"""Read-only localhost viewer; serves only viewer assets and the URDF package."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent
PACKAGE = ROOT.parent


class Handler(SimpleHTTPRequestHandler):
    # Windows may register .js as text/plain; ES modules require a JS MIME type.
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map,
                      '.js': 'text/javascript', '.mjs': 'text/javascript',
                      '.css': 'text/css', '.urdf': 'application/xml',
                      '.stl': 'application/octet-stream'}

    def translate_path(self, path):
        path = unquote(urlsplit(path).path)
        if path.startswith('/description/'):
            root, relative = PACKAGE, path[len('/description/'):]
        else:
            root, relative = ROOT, path.lstrip('/') or 'index.html'
        target = (root / relative).resolve()
        if not target.is_relative_to(root):
            return str(ROOT / '__not_found__')
        return str(target)

    def list_directory(self, path):
        self.send_error(404)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8891)
    args = parser.parse_args()
    print(f'reBot B601 URDF viewer: http://127.0.0.1:{args.port}/', flush=True)
    ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()

