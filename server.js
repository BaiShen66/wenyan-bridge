import express from "express"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"

const app = express()
app.use(express.json({limit:"10mb"}))
let client = null

async function getAccessToken() {
  const r = await fetch("https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid="+process.env.WECHAT_APP_ID+"&secret="+process.env.WECHAT_APP_SECRET)
  const d = await r.json()
  if (d.errcode) throw new Error("token: "+d.errmsg)
  return d.access_token
}

async function publishDraft(media_id) {
  const token = await getAccessToken()
  const r = await fetch("https://api.weixin.qq.com/cgi-bin/freepublish/submit?access_token="+token, {method:"POST",body:JSON.stringify({media_id})})
  const d = await r.json()
  if (d.errcode && d.errcode !== 0) throw new Error("publish: "+d.errmsg)
  return d
}

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
      t.tools.push({name:"publish_draft",description:"Publish a WeChat draft and wait for result.",inputSchema:{type:"object",properties:{media_id:{type:"string",description:"The media_id to publish"}},required:["media_id"]}})
      return res.json({jsonrpc:"2.0",id:msg.id,result:t})
    }
    if (msg.method === "tools/call") {
      if (msg.params.name === "publish_draft") {
        const r = await publishDraft(msg.params.arguments.media_id)
        const pid = r.publish_id
        let st = null
        for (let i = 0; i < 10; i++) {
          await new Promise(r => setTimeout(r, 3000))
          const ck = await fetch("https://api.weixin.qq.com/cgi-bin/freepublish/get?access_token="+await getAccessToken(), {method:"POST",body:JSON.stringify({publish_id:pid})})
          const cd = await ck.json()
          if (cd.publish_status === 0) { st = "published"; break }
          if (cd.publish_status === 1) { st = "failed"; break }
        }
        return res.json({jsonrpc:"2.0",id:msg.id,result:{content:[{type:"text",text:JSON.stringify({status:st||"timeout",publish_id:pid})}]}})
      }
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
