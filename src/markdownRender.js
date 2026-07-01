"use strict";

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escAttr(s) {
  return esc(s).replace(/"/g, "&quot;");
}

/**
 * @param {string} text
 */
function inlineMarkdown(text) {
  let s = esc(text);
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const u = escAttr(url.trim());
    return `<a href="${u}" class="md-link" data-external>${label}</a>`;
  });
  s = s.replace(
    /(https?:\/\/[^\s<>"')\]]+)/g,
    (url) => `<a href="${escAttr(url)}" class="md-link" data-external>${url}</a>`,
  );
  return s;
}

/**
 * @param {string} md
 */
function renderMarkdownToHtml(md) {
  if (!md || !String(md).trim()) {
    return '<p class="md-empty">Sin descripción</p>';
  }

  const lines = String(md).replace(/\r\n/g, "\n").split("\n");
  /** @type {string[]} */
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      out.push("<hr />");
      i++;
      continue;
    }

    const h1 = line.match(/^# (.+)$/);
    const h2 = line.match(/^## (.+)$/);
    const h3 = line.match(/^### (.+)$/);
    const h4 = line.match(/^#### (.+)$/);
    if (h1) {
      out.push(`<h2 class="md-h1">${inlineMarkdown(h1[1])}</h2>`);
      i++;
      continue;
    }
    if (h2) {
      out.push(`<h3 class="md-h2">${inlineMarkdown(h2[1])}</h3>`);
      i++;
      continue;
    }
    if (h3) {
      out.push(`<h4 class="md-h3">${inlineMarkdown(h3[1])}</h4>`);
      i++;
      continue;
    }
    if (h4) {
      out.push(`<h5 class="md-h4">${inlineMarkdown(h4[1])}</h5>`);
      i++;
      continue;
    }

    if (line.startsWith("> ")) {
      const bq = [];
      while (i < lines.length && (lines[i].startsWith("> ") || lines[i] === ">")) {
        bq.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<blockquote>${bq.map((l) => `<p>${inlineMarkdown(l)}</p>`).join("")}</blockquote>`);
      continue;
    }

    if (/^[-*] /.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(`<li>${inlineMarkdown(lines[i].replace(/^[-*] /, ""))}</li>`);
        i++;
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (/^\d+\. /.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(`<li>${inlineMarkdown(lines[i].replace(/^\d+\. /, ""))}</li>`);
        i++;
      }
      out.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,4} /.test(lines[i]) &&
      !lines[i].startsWith("> ") &&
      !/^[-*] /.test(lines[i]) &&
      !/^\d+\. /.test(lines[i]) &&
      !/^---+$/.test(lines[i].trim())
    ) {
      para.push(lines[i].trim());
      i++;
    }
    if (para.length) {
      out.push(`<p>${inlineMarkdown(para.join(" "))}</p>`);
    }
  }

  return out.join("\n");
}

module.exports = { renderMarkdownToHtml };
