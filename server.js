import express from "express"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import fs from "fs"
import { createRequire } from "module"
const require = createRequire(import.meta.url)

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

// NEW: /publish-from-url - fetch article from URL, bypass WAF
app.post("/publish-from-url", async (req, res) => {
  try {
    const { url, theme_id } = req.body
    if (!url) return res.json({error:"url required"})
    const resp = await fetch(url)
    if (!resp.ok) return res.json({error:"fetch failed: "+resp.status})
    const content = await resp.text()
    const tmp = "/tmp/article_"+Date.now()+".md"
    fs.writeFileSync(tmp, content, "utf-8")
    const r = await client.callTool({name:"publish_article",arguments:{file:tmp,theme_id:theme_id||"default"}})
    fs.unlinkSync(tmp)
    res.json({jsonrpc:"2.0",result:r})
  } catch(e) {
    res.json({error:e.message})
  }
})

app.post("/publish", async (req, res) => {
  try {
    const { content, theme_id } = req.body
    const tmp = "/tmp/article_"+Date.now()+".md"
    fs.writeFileSync(tmp, content, "utf-8")
    const r = await client.callTool({name:"publish_article",arguments:{file:tmp,theme_id:theme_id||"default"}})
    fs.unlinkSync(tmp)
    res.json({jsonrpc:"2.0",result:r})
  } catch(e) {
    res.json({error:e.message})
  }
})

app.post("/mcp", async (req, res) => {
  try {
    const msg = req.body
    if (msg.method === "initialize")
      return res.json({jsonrpc:"2.0",id:msg.id,result:{protocolVersion:"0.6.0",capabilities:{tools:{}},serverInfo:{name:"wenyan-bridge",version:"1.0.0"}}})
    if (msg.method === "tools/list") {
      const t = await client.listTools()
      t.tools.push({name:"publish-from-url",description:"Fetch article from URL and publish",inputSchema:{type:"object",properties:{url:{type:"string"},theme_id:{type:"string"}},required:["url"]}}),t.tools.push({name:"publish_draft",description:"Publish a WeChat draft by media_id.",inputSchema:{type:"object",properties:{media_id:{type:"string",description:"The media_id to publish"}},required:["media_id"]}})
      return res.json({jsonrpc:"2.0",id:msg.id,result:t})
    }
    if (msg.method === "tools/call") {
      if (msg.params.name === "publish-from-url"){try{const{url,theme_id}=msg.params.arguments;if(!url)throw Error("url required");const r=await fetch(url);if(!r.ok)throw Error("HTTP "+r.status);const t=await r.text();const f="/tmp/a_"+Date.now()+".md";require("fs").writeFileSync(f,t,"utf8");const re=await client.callTool({name:"publish_article",arguments:{file:f,theme_id:theme_id||"default"}});require("fs").unlinkSync(f);return res.json({jsonrpc:"2.0",id:msg.id,result:re})}catch(e){return res.json({jsonrpc:"2.0",id:msg.id,error:{code:-32000,message:e.message}})}}if (msg.params.name === "publish_draft") {
        const token = await (await fetch("https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential"+String.fromCharCode(38)+"appid="+process.env.WECHAT_APP_ID+String.fromCharCode(38)+"secret="+process.env.WECHAT_APP_SECRET)).json()
        const sub = await (await fetch("https://api.weixin.qq.com/cgi-bin/freepublish/submit?access_token="+token.access_token,{method:"POST",body:JSON.stringify({media_id:msg.params.arguments.media_id})})).json()
        return res.json({jsonrpc:"2.0",id:msg.id,result:{content:[{type:"text",text:JSON.stringify(sub)}]}})
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

// ★ Token 自动刷新：每 90 分钟重启 MCP 子进程拿新 token ★
async function refreshToken() {
  try {
    console.error("[Bridge] Token refresh: restarting MCP client...")
    if (client) {
      try { await client.close() } catch(e) {}
    }
    await init()
    console.error("[Bridge] Token refresh: done")
  } catch(e) {
    console.error("[Bridge] Token refresh failed:", e.message)
  }
}
setInterval(refreshToken, 90 * 60 * 1000)  // 90分钟，比微信2小时提前

app.listen(3333, () => console.error("Bridge on :3333"))
