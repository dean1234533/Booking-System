// Firebase Hosting serves bookrightly.co.uk as a plain SPA, so crawlers and link
// checkers that don't run JavaScript see an empty page for blog posts. For posts
// that carry an agreed external link (link exchanges), write a static copy of the
// SPA shell into dist/blog/<slug>/index.html that also contains the real article
// text, generated from posts.js so it can never drift from what React renders.
// Run after `npm run build`. Usage: node scripts/prerender-blog-posts.mjs [slug ...]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_SLUGS = ["cut-admin-barbershop-salon-ai-tools"];
const slugs = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_SLUGS;
const { BLOG_POSTS } = await import(pathToFileURL(`${root}/src/pages/blog/posts.js`).href);
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const indexHtml = readFileSync(`${root}/dist/index.html`, "utf8");

for (const slug of slugs) {
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) throw new Error(`Blog post not found: ${slug}`);
  const body = post.content
    .map((b) => (b.type === "h2" ? `<h2>${esc(b.text)}</h2>` : b.type === "p-html" ? `<p>${b.html}</p>` : `<p>${esc(b.text)}</p>`))
    .join("");
  let html = indexHtml.replace(/<title>[^<]*<\/title>/, `<title>${esc(`${post.title} | Bookrightly`)}</title>`);
  html = html.replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(post.description).replace(/"/g, "&quot;")}" />`);
  html = html.replace("</body>", `<div style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);"><h1>${esc(post.title)}</h1>${body}</div></body>`);
  const dir = `${root}/dist/blog/${slug}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/index.html`, html);
  console.log(`prerendered /blog/${slug}`);
}
