import { useState, useCallback, useRef, useEffect } from 'react';
import { parseOrgContent, formatInlineOrg } from '../utils/orgParser';
import type { OrgBlock } from '../types';

interface OrgEditorProps {
  content: string;
  fileName: string;
  modified: boolean;
  onContentChange: (content: string) => void;
  onSave: () => void;
}

function OrgBlockRenderer({ block }: { block: OrgBlock }) {
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
      return <div className="org-blank" />;
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

export default function OrgEditor({ content, fileName, modified, onContentChange, onSave }: OrgEditorProps) {
  const [mode, setMode] = useState<'rendered' | 'source'>('rendered');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const blocks = parseOrgContent(content);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave();
      }
    },
    [onSave],
  );

  useEffect(() => {
    if (mode === 'source' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [mode]);

  return (
    <div className="org-editor" onKeyDown={handleKeyDown}>
      <div className="editor-toolbar">
        <div className="editor-file-info">
          <span className="editor-filename">{fileName}</span>
          {modified && <span className="editor-modified">●</span>}
        </div>
        <div className="editor-actions">
          <button
            className={`mode-btn ${mode === 'rendered' ? 'active' : ''}`}
            onClick={() => setMode('rendered')}
          >
            Preview
          </button>
          <button
            className={`mode-btn ${mode === 'source' ? 'active' : ''}`}
            onClick={() => setMode('source')}
          >
            Source
          </button>
          <button className="save-btn" onClick={onSave} disabled={!modified} title="Ctrl+S">
            Save
          </button>
        </div>
      </div>
      <div className="editor-content">
        {mode === 'rendered' ? (
          <div className="org-rendered">
            {blocks.map((block, i) => (
              <OrgBlockRenderer key={i} block={block} />
            ))}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            className="org-source"
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            spellCheck={false}
          />
        )}
      </div>
    </div>
  );
}
