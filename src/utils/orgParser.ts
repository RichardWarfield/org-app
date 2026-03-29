import type { OrgBlock } from '../types';

export function parseOrgContent(text: string): OrgBlock[] {
  const lines = text.split('\n');
  const blocks: OrgBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Heading
    const headingMatch = line.match(/^(\*+)\s+((?:TODO|DONE|IN_PROGRESS|WAITING|CANCELLED)\s+)?(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const keyword = headingMatch[2]?.trim();
      const rest = headingMatch[3];
      const tagMatch = rest.match(/^(.*?)\s+:([\w:]+):\s*$/);
      const title = tagMatch ? tagMatch[1] : rest;
      const tags = tagMatch ? tagMatch[2].split(':').filter(Boolean) : undefined;
      blocks.push({
        type: 'heading',
        raw: line,
        heading: { level, title, keyword, tags },
      });
      i++;
      continue;
    }

    // Code block
    if (line.match(/^#\+BEGIN_SRC\b/i)) {
      const langMatch = line.match(/^#\+BEGIN_SRC\s+(\S+)/i);
      const language = langMatch ? langMatch[1] : undefined;
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].match(/^#\+END_SRC/i)) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({
        type: 'code-block',
        raw: line + '\n' + codeLines.join('\n') + (i < lines.length ? '\n' + lines[i] : ''),
        language,
        content: codeLines.join('\n'),
      });
      i++;
      continue;
    }

    // Horizontal rule
    if (line.match(/^-{5,}\s*$/)) {
      blocks.push({ type: 'horizontal-rule', raw: line });
      i++;
      continue;
    }

    // List item
    if (line.match(/^\s*[-+]\s+/) || line.match(/^\s*\d+[.)]\s+/)) {
      blocks.push({ type: 'list-item', raw: line });
      i++;
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      blocks.push({ type: 'blank', raw: line });
      i++;
      continue;
    }

    // Paragraph
    blocks.push({ type: 'paragraph', raw: line });
    i++;
  }

  return blocks;
}

export function formatInlineOrg(text: string): string {
  let result = text;
  // Bold
  result = result.replace(/\*([^\s*][^*]*[^\s*])\*/g, '<strong>$1</strong>');
  result = result.replace(/\*([^\s*])\*/g, '<strong>$1</strong>');
  // Italic
  result = result.replace(/\/([^\s/][^/]*[^\s/])\//g, '<em>$1</em>');
  result = result.replace(/\/([^\s/])\//g, '<em>$1</em>');
  // Underline
  result = result.replace(/_([^\s_][^_]*[^\s_])_/g, '<u>$1</u>');
  result = result.replace(/_([^\s_])_/g, '<u>$1</u>');
  // Code / verbatim
  result = result.replace(/~([^\s~][^~]*[^\s~])~/g, '<code>$1</code>');
  result = result.replace(/~([^\s~])~/g, '<code>$1</code>');
  result = result.replace(/=([^\s=][^=]*[^\s=])=/g, '<code class="verbatim">$1</code>');
  result = result.replace(/=([^\s=])=/g, '<code class="verbatim">$1</code>');
  // Strikethrough
  result = result.replace(/\+([^\s+][^+]*[^\s+])\+/g, '<del>$1</del>');
  result = result.replace(/\+([^\s+])\+/g, '<del>$1</del>');
  // Links [[url][desc]] or [[url]]
  result = result.replace(/\[\[([^\]]+)\]\[([^\]]+)\]\]/g, '<a href="$1" target="_blank" rel="noopener">$2</a>');
  result = result.replace(/\[\[([^\]]+)\]\]/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');

  return result;
}
