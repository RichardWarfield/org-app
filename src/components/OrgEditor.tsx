import { useState, useCallback, useRef, useEffect } from 'react';
import { parseOrgContent, formatInlineOrg } from '../utils/orgParser';
import type { OrgBlock } from '../types';

interface OrgEditorProps {
  content: string;
  fileName: string;
  modified: boolean;
  canSaveToDisk: boolean;
  onContentChange: (content: string) => void;
  onSave: () => void;
}

function OrgLineRendered({ block }: { block: OrgBlock }) {
  switch (block.type) {
    case 'heading': {
      const h = block.heading!;
      const level = Math.min(h.level, 6);
      const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      return (
        <div className={`org-heading org-heading-${h.level}`}>
          <Tag>
            <span className="heading-stars">{'*'.repeat(h.level)}</span>
            {h.keyword && (
              <span className={`org-keyword org-keyword-${h.keyword.toLowerCase()}`}>
                {h.keyword}
              </span>
            )}
            <span
              className="heading-text"
              dangerouslySetInnerHTML={{ __html: formatInlineOrg(h.title) }}
            />
            {h.tags && h.tags.length > 0 && (
              <span className="org-tags">
                {h.tags.map((tag) => (
                  <span key={tag} className="org-tag">
                    {tag}
                  </span>
                ))}
              </span>
            )}
          </Tag>
        </div>
      );
    }
    case 'code-block':
      return (
        <div className="org-code-block">
          {block.language && <div className="code-language">{block.language}</div>}
          <pre>
            <code>{block.content}</code>
          </pre>
        </div>
      );
    case 'list-item':
      return (
        <div
          className="org-list-item"
          dangerouslySetInnerHTML={{
            __html: formatInlineOrg(block.raw.replace(/^\s*[-+]\s+/, '• ').replace(/^\s*\d+[.)]\s+/, (m) => m.trim())),
          }}
        />
      );
    case 'horizontal-rule':
      return <hr className="org-hr" />;
    case 'blank':
      return <div className="org-blank">&nbsp;</div>;
    case 'paragraph':
    default:
      return (
        <div
          className="org-paragraph"
          dangerouslySetInnerHTML={{ __html: formatInlineOrg(block.raw) }}
        />
      );
  }
}

export default function OrgEditor({ content, fileName, modified, canSaveToDisk, onContentChange, onSave }: OrgEditorProps) {
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [cursorPos, setCursorPos] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const lines = content.split('\n');

  // Map each line index to the block it belongs to, and track multi-line blocks
  const lineBlocks: { block: OrgBlock; lineStart: number; lineEnd: number }[] = [];
  const blocks = parseOrgContent(content);
  let lineIdx = 0;
  for (const block of blocks) {
    const blockLineCount = block.raw.split('\n').length;
    lineBlocks.push({ block, lineStart: lineIdx, lineEnd: lineIdx + blockLineCount - 1 });
    lineIdx += blockLineCount;
  }

  function getBlockForLine(line: number) {
    return lineBlocks.find((b) => line >= b.lineStart && line <= b.lineEnd);
  }

  const handleLineClick = useCallback((lineIndex: number) => {
    setActiveLine(lineIndex);
    setCursorPos(lines[lineIndex]?.length ?? 0);
  }, [lines]);

  const updateLine = useCallback(
    (lineIndex: number, newValue: string) => {
      const newLines = [...lines];
      newLines[lineIndex] = newValue;
      onContentChange(newLines.join('\n'));
    },
    [lines, onContentChange],
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave();
        return;
      }

      const input = e.currentTarget;

      if (e.key === 'Enter') {
        e.preventDefault();
        const before = lines[activeLine!].substring(0, input.selectionStart ?? 0);
        const after = lines[activeLine!].substring(input.selectionStart ?? 0);
        const newLines = [...lines];
        newLines.splice(activeLine!, 1, before, after);
        onContentChange(newLines.join('\n'));
        const newLine = activeLine! + 1;
        setActiveLine(newLine);
        setCursorPos(0);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (activeLine! > 0) {
          const pos = Math.min(input.selectionStart ?? 0, lines[activeLine! - 1].length);
          setActiveLine(activeLine! - 1);
          setCursorPos(pos);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (activeLine! < lines.length - 1) {
          const pos = Math.min(input.selectionStart ?? 0, lines[activeLine! + 1].length);
          setActiveLine(activeLine! + 1);
          setCursorPos(pos);
        }
      } else if (e.key === 'Backspace' && input.selectionStart === 0 && input.selectionEnd === 0) {
        e.preventDefault();
        if (activeLine! > 0) {
          const prevLen = lines[activeLine! - 1].length;
          const newLines = [...lines];
          newLines[activeLine! - 1] = newLines[activeLine! - 1] + newLines[activeLine!];
          newLines.splice(activeLine!, 1);
          onContentChange(newLines.join('\n'));
          setActiveLine(activeLine! - 1);
          setCursorPos(prevLen);
        }
      } else if (e.key === 'Delete' && input.selectionStart === lines[activeLine!].length) {
        e.preventDefault();
        if (activeLine! < lines.length - 1) {
          const newLines = [...lines];
          newLines[activeLine!] = newLines[activeLine!] + newLines[activeLine! + 1];
          newLines.splice(activeLine! + 1, 1);
          onContentChange(newLines.join('\n'));
        }
      } else if (e.key === 'ArrowLeft' && input.selectionStart === 0) {
        e.preventDefault();
        if (activeLine! > 0) {
          setActiveLine(activeLine! - 1);
          setCursorPos(lines[activeLine! - 1].length);
        }
      } else if (e.key === 'ArrowRight' && input.selectionStart === lines[activeLine!].length) {
        e.preventDefault();
        if (activeLine! < lines.length - 1) {
          setActiveLine(activeLine! + 1);
          setCursorPos(0);
        }
      }
    },
    [activeLine, lines, onContentChange, onSave],
  );

  // Focus and set cursor when active line changes
  useEffect(() => {
    if (activeLine !== null && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(cursorPos, cursorPos);
    }
  }, [activeLine, cursorPos]);

  // Click outside to deactivate
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (editorRef.current && !editorRef.current.contains(e.target as Node)) {
        setActiveLine(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Render lines grouped by blocks
  const renderedElements: React.ReactNode[] = [];
  const visitedBlocks = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    if (i === activeLine) {
      // Active line: show raw input
      renderedElements.push(
        <div key={`line-${i}`} className="org-line org-line-active">
          <input
            ref={inputRef}
            className="org-line-input"
            type="text"
            value={lines[i]}
            onChange={(e) => updateLine(i, e.target.value)}
            onKeyDown={handleInputKeyDown}
            spellCheck={false}
          />
        </div>,
      );
    } else {
      // Find block for this line
      const entry = getBlockForLine(i);
      if (entry && !visitedBlocks.has(entry.lineStart)) {
        // Check if active line is inside this block — if so, render lines individually
        const activeInBlock = activeLine !== null && activeLine >= entry.lineStart && activeLine <= entry.lineEnd;
        if (activeInBlock) {
          // Render just this non-active line as plain text
          renderedElements.push(
            <div
              key={`line-${i}`}
              className="org-line org-line-plain"
              onClick={() => handleLineClick(i)}
            >
              {lines[i] || '\u00A0'}
            </div>,
          );
        } else {
          // Render the whole block formatted
          visitedBlocks.add(entry.lineStart);
          renderedElements.push(
            <div
              key={`block-${entry.lineStart}`}
              className="org-line org-line-rendered"
              onClick={() => handleLineClick(entry.lineStart)}
            >
              <OrgLineRendered block={entry.block} />
            </div>,
          );
          // Skip the rest of the lines in this block
          i = entry.lineEnd;
        }
      } else if (!entry || visitedBlocks.has(entry.lineStart)) {
        // Line in already-rendered block or orphan — skip if block rendered, else show plain
        renderedElements.push(
          <div
            key={`line-${i}`}
            className="org-line org-line-plain"
            onClick={() => handleLineClick(i)}
          >
            {lines[i] || '\u00A0'}
          </div>,
        );
      }
    }
  }

  return (
    <div className="org-editor" ref={editorRef}>
      <div className="editor-toolbar">
        <div className="editor-file-info">
          <span className="editor-filename">{fileName}</span>
          {modified && <span className="editor-modified">●</span>}
        </div>
        <div className="editor-actions">
          <button className="save-btn" onClick={onSave} disabled={!modified} title="Ctrl+S">
            {canSaveToDisk ? 'Save' : 'Download'}
          </button>
        </div>
      </div>
      <div className="editor-content">
        <div className="org-unified">
          {renderedElements}
        </div>
      </div>
    </div>
  );
}
