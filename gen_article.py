import sys,base64  
with open("article.md","wb") as f:  
  f.write(base64.b64decode(sys.stdin.read())) 
