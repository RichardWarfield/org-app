import { useState, useCallback, useEffect, useRef } from 'react';
import FileTree from './components/FileTree';
import OrgEditor from './components/OrgEditor';
import type { FileNode } from './types';
import { openDirectory, readFileNode, writeFileNode, downloadFile, buildTreeFromFiles, hasNativeFS } from './utils/fileSystem';
import './App.css';

const POLL_INTERVAL = 2000;

function App() {
  const [rootNode, setRootNode] = useState<FileNode | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [diskConflict, setDiskConflict] = useState(false);
  const diskContentRef = useRef<string>('');

  const handleOpenDirectory = useCallback(async () => {
    const result = await openDirectory();
    if (result) {
      setRootNode(result.root);
      setSelectedFile(null);
      setFileContent('');
      setOriginalContent('');
      setDiskConflict(false);
    }
  }, []);

  const handleDropFiles = useCallback((files: File[]) => {
    const tree = buildTreeFromFiles(files);
    if (tree) {
      setRootNode(tree);
      setSelectedFile(null);
      setFileContent('');
      setOriginalContent('');
      setDiskConflict(false);
    }
  }, []);

  const handleSelectFile = useCallback(async (node: FileNode) => {
    if (node.kind === 'file') {
      const content = await readFileNode(node);
      setSelectedFile(node);
      setFileContent(content);
      setOriginalContent(content);
      setDiskConflict(false);
      diskContentRef.current = content;
    }
  }, []);

  const handleContentChange = useCallback((content: string) => {
    setFileContent(content);
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedFile) return;
    const saved = await writeFileNode(selectedFile, fileContent);
    if (saved) {
      setOriginalContent(fileContent);
      diskContentRef.current = fileContent;
      setDiskConflict(false);
    } else {
      downloadFile(selectedFile.name, fileContent);
      setOriginalContent(fileContent);
    }
  }, [selectedFile, fileContent]);

  const handleReloadFromDisk = useCallback(() => {
    setFileContent(diskContentRef.current);
    setOriginalContent(diskContentRef.current);
    setDiskConflict(false);
  }, []);

  const handleDismissConflict = useCallback(() => {
    setDiskConflict(false);
  }, []);

  // Poll for file changes on disk
  useEffect(() => {
    if (!selectedFile?.handle) return;

    const handle = selectedFile.handle;
    const interval = setInterval(async () => {
      try {
        const file = await handle.getFile();
        const diskText = await file.text();
        if (diskText === diskContentRef.current) return;

        diskContentRef.current = diskText;
        // No local edits: auto-reload
        if (fileContent === originalContent) {
          setFileContent(diskText);
          setOriginalContent(diskText);
        } else {
          // Local edits exist: show conflict
          setDiskConflict(true);
        }
      } catch {
        // File may have been deleted or permission revoked
      }
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [selectedFile, fileContent, originalContent]);

  const isModified = fileContent !== originalContent;
  const canSaveToDisk = !!selectedFile?.handle;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Org Mode PDA</h1>
      </header>
      <div className="app-body">
        <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          >
            {sidebarCollapsed ? '▸' : '▾'}
          </button>
          {!sidebarCollapsed && (
            <FileTree
            root={rootNode}
            selectedPath={selectedFile?.path ?? null}
            onSelectFile={handleSelectFile}
            onOpenDirectory={handleOpenDirectory}
            onDropFiles={handleDropFiles}
          />
          )}
        </aside>
        <main className="main-pane">
          {selectedFile ? (
            <>
              {diskConflict && (
                <div className="conflict-bar">
                  <span>File changed on disk.</span>
                  <button onClick={handleReloadFromDisk}>Reload</button>
                  <button onClick={handleDismissConflict}>Dismiss</button>
                </div>
              )}
              <OrgEditor
                content={fileContent}
                fileName={selectedFile.name}
                modified={isModified}
                canSaveToDisk={canSaveToDisk}
                onContentChange={handleContentChange}
                onSave={handleSave}
              />
            </>
          ) : (
            <div className="empty-editor">
              <div className="empty-editor-content">
                <h2>Org Mode PDA</h2>
                <p>Select a .org file from the tree to view and edit it.</p>
                {!rootNode && (
                  <>
                    <button className="open-dir-btn-large" onClick={hasNativeFS ? handleOpenDirectory : undefined}>
                      {hasNativeFS ? 'Open a Folder' : 'Drop .org files to get started'}
                    </button>
                    {!hasNativeFS && (
                      <p className="hint">
                        Tip: Use Chrome or Edge for full folder access and saving back to disk
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
