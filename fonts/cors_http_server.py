from http.server import SimpleHTTPRequestHandler, HTTPServer
import socketserver

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        SimpleHTTPRequestHandler.end_headers(self)

PORT = 8001
handler = CORSRequestHandler
httpd = socketserver.TCPServer(("", PORT), handler)
print("Serving at port", PORT)
httpd.serve_forever()

