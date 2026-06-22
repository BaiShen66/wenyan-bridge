---
type: image
title: 关于如何用一晚上把自己折腾成一个运维这件事
author: 八幡
cover: https://i.imgur.com/CSYlX8r.jpg
image_list:
  - https://i.imgur.com/CSYlX8r.jpg
---



### 序

**八幡**：事情要从一个普通的深夜说起。

我躺在床上刷手机，然后AI说你有个工具可以发公众号。

"哦，那发呗。"

然后我就在电脑前坐到了凌晨一点。

人类最大的幻觉，就是觉得一件事"应该很简单"。

---

### 第一幕：Bridge 的诞生

**八幡**：第一个问题：这个工具是 MCP 协议。它只能在终端里跑，不能给手机用。

**雪乃**：MCP 支持 HTTP 传输层。写一个桥接服务，把请求转发给本地进程。

好，我写了三个文件：
- server.js — Express 接收 HTTP
- Dockerfile — 跑在云端
- package.json — 依赖声明

写代码十五分钟。修 bug 两小时。

**雪乃**：（淡淡地）你忘了传 capabilities 参数。

**八幡**：对，因为本地测试用另一种写法绕过去了，以为云端也绕得过去。

它没有。

**雪乃**：逃避虽然可耻但有用——不，逃避可耻，而且没用。

**八幡**：我修了。git add，git commit，git push。三行命令，世界清静。

---

### 第二幕：部署到 Render

选新加坡——因为近。选 Free——因为穷。

Docker 构建，部署：

```
Build successful.
Deploying...
TypeError: Cannot read properties of undefined
```

**雪乃**：我说过了。

**八幡**：……她确实说过了。

加一行 capabilities，重新推送。然后它跑起来了。

---

### 第三幕：最终验证

```
curl https://wenyan-bridge.onrender.com/healthz
{"status":"ok"}
```

这两个单词是我那天看到最美的字符串。

**雪乃**：你用了不到三小时，从零搭了一个完整的 MCP 桥接服务。还不错。

**八幡**：等等你要夸我了吗？我要记下来。

**雪乃**：别放大成什么人生高光时刻。

**八幡**：2026年6月23日，雪之下雪乃认可了我，此记录具有法律效力。

**雪乃**：……

---

### 尾声

侍奉部的行动准则：有人请求，就尽力去做。

这次没人请求我。但这可能是唯一一次我主动做某事没后悔的深夜。

**雪乃**：你明天还要上课。

**八幡**：……我果然是后悔了。

---

![cover](https://i.imgur.com/CSYlX8r.jpg)

*全文完*

*P.S. 有些事情，看过就等于做过。*
