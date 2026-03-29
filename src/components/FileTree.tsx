import { useState, useRef, useCallback } from 'react';
import type { FileNode } from '../types';
import { hasNativeFS } from '../utils/fileSystem';

interface FileTreeProps {
  root: FileNode | null;
  selectedPath: string | null;
  onSelectFile: (node: FileNode) => void;
  onOpenDirectory: () => void;
  onDropFiles: (files: File[]) => void;
}

function TreeNode({
  node,
  depth,
  selectedPath,
  onSelectFile,
}: {
  node: FileNode;
  depth: number;
  selectedPath: string | null;
  onSelectFile: (node: FileNode) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const isSelected = node.path === selectedPath;

  if (node.kind === 'file') {
    return (
      <div
        className={`tree-file ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelectFile(node)}
        title={node.path}
      >
        <span className="file-icon">📄</span>
        <span className="file-name">{node.name}</span>
      </div>
    );
  }

  return (
    <div className="tree-directory">
      <div
        className="tree-dir-label"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="dir-arrow">{expanded ? '▾' : '▸'}</span>
        <span className="dir-icon">{expanded ? '📂' : '📁'}</span>
        <span className="dir-name">{node.name}</span>
      </div>
      {expanded && node.children && (
        <div className="tree-children">
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileTree({ root, selectedPath, onSelectFile, onOpenDirectory, onDropFiles }: FileTreeProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onDropFiles(files);
      }
    },
    [onDropFiles],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        onDropFiles(files);
      }
      e.target.value = '';
    },
    [onDropFiles],
  );

  const handleOpen = useCallback(() => {
    if (hasNativeFS) {
      onOpenDirectory();
    } else if (folderInputRef.current) {
      folderInputRef.current.click();
    }
  }, [onOpenDirectory]);

  const handleOpenFiles = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div
      className={`file-tree ${dragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="file-tree-header">
        <h2>Files</h2>
        <button className="open-dir-btn" onClick={handleOpen} title="Open directory">
          Open Folder
        </button>
      </div>
      {/* Hidden file inputs for fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".org"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is non-standard
        webkitdirectory=""
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />
      <div className="file-tree-content">
        {root ? (
          <TreeNode node={root} depth={0} selectedPath={selectedPath} onSelectFile={onSelectFile} />
        ) : (
          <div className="empty-tree">
            <p>No folder open</p>
            <button className="open-dir-btn-large" onClick={handleOpen}>
              Open a Folder
            </button>
            {!hasNativeFS && (
              <button className="open-files-btn" onClick={handleOpenFiles}>
                or select .org files
              </button>
            )}
            <p className="hint">
              {hasNativeFS
                ? 'Select a folder containing .org files'
                : 'Drop .org files here, select a folder, or pick files'}
            </p>
            {dragOver && <div className="drop-overlay">Drop .org files here</div>}
          </div>
        )}
      </div>
    </div>
  );
}
