import { useState, useCallback } from 'react';
import FileTree from './components/FileTree';
import OrgEditor from './components/OrgEditor';
import type { FileNode } from './types';
import { openDirectory, readFileNode, writeFileNode, downloadFile, buildTreeFromFiles, hasNativeFS } from './utils/fileSystem';
import './App.css';

function App() {
  const [rootNode, setRootNode] = useState<FileNode | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const handleOpenDirectory = useCallback(async () => {
    const result = await openDirectory();
    if (result) {
      setRootNode(result.root);
      setSelectedFile(null);
      setFileContent('');
      setOriginalContent('');
    }
  }, []);

  const handleDropFiles = useCallback((files: File[]) => {
    const tree = buildTreeFromFiles(files);
    if (tree) {
      setRootNode(tree);
      setSelectedFile(null);
      setFileContent('');
      setOriginalContent('');
    }
  }, []);

  const handleSelectFile = useCallback(async (node: FileNode) => {
    if (node.kind === 'file') {
      const content = await readFileNode(node);
      setSelectedFile(node);
      setFileContent(content);
      setOriginalContent(content);
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
    } else {
      downloadFile(selectedFile.name, fileContent);
      setOriginalContent(fileContent);
    }
  }, [selectedFile, fileContent]);

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
            <OrgEditor
              content={fileContent}
              fileName={selectedFile.name}
              modified={isModified}
              canSaveToDisk={canSaveToDisk}
              onContentChange={handleContentChange}
              onSave={handleSave}
            />
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
