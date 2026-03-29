import { useState } from 'react';
import type { FileNode } from '../types';

interface FileTreeProps {
  root: FileNode | null;
  selectedPath: string | null;
  onSelectFile: (node: FileNode) => void;
  onOpenDirectory: () => void;
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

export default function FileTree({ root, selectedPath, onSelectFile, onOpenDirectory }: FileTreeProps) {
  return (
    <div className="file-tree">
      <div className="file-tree-header">
        <h2>Files</h2>
        <button className="open-dir-btn" onClick={onOpenDirectory} title="Open directory">
          Open Folder
        </button>
      </div>
      <div className="file-tree-content">
        {root ? (
          <TreeNode node={root} depth={0} selectedPath={selectedPath} onSelectFile={onSelectFile} />
        ) : (
          <div className="empty-tree">
            <p>No folder open</p>
            <button className="open-dir-btn-large" onClick={onOpenDirectory}>
              Open a Folder
            </button>
            <p className="hint">Select a folder containing .org files</p>
          </div>
        )}
      </div>
    </div>
  );
}
