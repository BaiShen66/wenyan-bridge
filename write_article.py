import sys
with open("article.md","w",encoding="utf-8") as f:
 f.write(sys.stdin.read())
