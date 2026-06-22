import express from "express"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"

const app = express()
app.use(express.json({limit:"10mb"}))
let client = null

async function init() {
  const transport = new StdioClientTransport({
    command: process.env.WENYAN_PATH || "wenyan-mcp",
    env: { WECHAT_APP_ID: process.env.WECHAT_APP_ID, WECHAT_APP_SECRET: process.env.WECHAT_APP_SECRET }
  })
  client = new Client({name:"wenyan-bridge",version:"1.0.0"},{capabilities:{}})
  await client.connect(transport)
  console.error("[Bridge] Connected")
}

app.post("/mcp", async (req, res) => {
  try {
    const msg = req.body
    if (msg.method === "initialize")
      return res.json({jsonrpc:"2.0",id:msg.id,result:{protocolVersion:"0.6.0",capabilities:{tools:{}},serverInfo:{name:"wenyan-bridge",version:"1.0.0"}}})
    if (msg.method === "tools/list") {
      const t = await client.listTools()
      return res.json({jsonrpc:"2.0",id:msg.id,result:t})
    }
    if (msg.method === "tools/call") {
      const r = await client.callTool(msg.params)
      return res.json({jsonrpc:"2.0",id:msg.id,result:r})
    }
    res.json({jsonrpc:"2.0",id:msg.id,error:{code:-32601,message:"Not found"}})
  } catch(e) {
    res.json({jsonrpc:"2.0",id:req.body?.id||null,error:{code:-32000,message:e.message}})
  }
})

app.get("/healthz", (req, res) => res.json({status:"ok"}))
app.get("/mcp", (req, res) => res.json({note:"POST JSON-RPC here"}))

await init()
app.listen(3333, () => console.error("Bridge on :3333"))
