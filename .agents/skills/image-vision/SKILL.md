---
name: image-vision
description: 图片识别。当用户发送图片、提到图片/截图/照片内容、
需要读取图片中的文字（OCR）、识别报错截图、或消息中图片显示为
[Unsupported Image] 时使用。自动定位图片路径并调用视觉模型识别。
---

# 图片识别（视觉模型）

自包含技能：`SKILL.md`、`vision.mjs`、`.env` 同目录，整目录拷贝即可迁移到其他项目。

## 何时使用
用户发送图片/需要识别图片内容时自动触发。

## 调用方式
`vision.mjs` 与本 `SKILL.md` 同目录（即技能 base 目录，加载时会给出）。运行：

```bash
node <技能base目录>/vision.mjs <图片路径> "<要识别的内容/问题>"
```

- API token 由脚本自动从**同目录 `.env`** 读取（`OPENCODE_API_KEY`），无需硬编码。
- 同目录 `.env` 缺失时，回退读取项目根目录 `.env`。

## 图片路径获取
1. 消息里 [Image: source: <路径>] 给出的路径
2. Claude 的 image-cache 目录（最近接收的图片）
3. 用户明确给出的路径
4. 询问用户

## 迁移到其他项目
1. 整目录拷贝到目标项目的 skills 目录（`.claude/skills/` 或 `.agents/skills/`）。
2. 参考 `.env.example` 在同目录创建 `.env` 并填入 token，即可使用。
