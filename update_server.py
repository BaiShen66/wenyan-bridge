import sys  
import json  
c = []  
c.append("import express from 'express'")  
c.append("import { Client } from '@modelcontextprotocol/sdk/client/index.js'")  
c.append("import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'")  
c.append("")  
c.append("const app = express()")  
c.append('app.use(express.json({limit:"10mb"}))')  
c.append("let client = null")  
