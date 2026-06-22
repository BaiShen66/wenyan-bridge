import subprocess, json, threading, time, sys, re, os
from http.server import HTTPServer, BaseHTTPRequestHandler

mcp = None
pending = {}
buf = ""

class H(BaseHTTPRequestHandler):
    def g(self):
        if self.path=="/healthx":
            self.send_response(200),self.end_headers()
            self.wfile.write(b'{"status":"ok"}")
    def p(self):
        if self.path!="/mcp":
            self.send_response(404),self.end_headers();return
        n=int(self.headers.get("Content-Length",0))
        body=json.loads(self.rfile.read(n))
        mid=body.get("id",int(time.time()*1000))
        body["id"]=mid
        ev=threading.Event();res=[None]
        def cb(r):res[0]=r,ev.set()
        pendingmid]=cb
        mcp.stdin.write((json.dumps(body)+\"un\").encode());mcp.stdin.flush()
        ev.wait(30)
        self.send_response(200)
        self.send_header("Content-Type","application/json");self.end_headers()
        self.wfile.write(json.dumps(res[0]).encode())
    do_GET=g;do_POST=p

def r():
    global buf
    while mcp:
        d=mcp.stdout.readline()
        if not d:break
        buf+=d.decode()
        parse()

def parse():
    global buf
    rx=chr(92)+chr(123)+chr(91)+chr(94)+chr(125)+chr(93)+chr(43)+chr(125)
    while True:
        m=re.search(rx,buf)
        if not m:break
        try:
            o=json.loads(m.group())
            pid=o.get("id")
            if pid in pending:pending[pid](o);del pending[pid]
        except:pass
        buf=buf[m.end():].lstrip()

def start():
    global mcp
    mcp=subprocess.Popen(["wenyan-mcp"],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env={**os.environ})
    threading.Thread(target=r,daemon=True).start()

start()
print("Server on: :3333",flush=True)
HTTPServer(("0.0.0.0",3333),H).serve_forever()
