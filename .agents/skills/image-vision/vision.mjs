// 视觉识别脚本：调用 OpenCode Go 的 qwen3.6-plus 视觉模型
// 用法：node scripts/vision.mjs <图片路径或URL> [问题]
import { readFileSync, existsSync } from "node:fs";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// 技能目录（vision.mjs 所在目录），用于定位同目录的 .env
const SKILL_DIR = dirname(fileURLToPath(import.meta.url));

// 读取 .env：优先技能同目录（自包含、可整目录迁移），缺失时回退项目根目录
function loadEnvFile(envPath) {
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
loadEnvFile(join(SKILL_DIR, ".env"));
loadEnvFile(join(process.cwd(), ".env"));

const API_KEY = process.env.OPENCODE_API_KEY;
const BASE_URL = "https://opencode.ai/zen/go/v1";
const MODEL = process.env.OPENCODE_MODEL || "qwen3.6-plus";

const args = process.argv.slice(2);
const imageInput = args[0];
const question = args[1] || "请识别这张图片的内容，并尽可能详细地描述。";

// 图片转 base64 data URL
async function buildImageContent(input) {
  if (/^https?:\/\//.test(input)) {
    return { type: "image_url", image_url: { url: input } };
  }
  const ext = extname(input).toLowerCase().replace(".", "");
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg"
    : ext === "webp" ? "image/webp" : "image/png";
  const b64 = readFileSync(input).toString("base64");
  return { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } };
}

const imageContent = await buildImageContent(imageInput);
const res = await fetch(`${BASE_URL}/chat/completions`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
  body: JSON.stringify({
    model: MODEL,
    max_tokens: 2048,
    messages: [{
      role: "user",
      content: [
        { type: "text", text: question },
        imageContent,
      ],
    }],
  }),
});
const data = await res.json();
console.log(data.choices?.[0]?.message?.content || "（无输出）");