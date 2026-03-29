import { useState, useCallback } from 'react';
import FileTree from './components/FileTree';
import OrgEditor from './components/OrgEditor';
import type { FileNode } from './types';
import { openDirectory, readFile, writeFile } from './utils/fileSystem';
import './App.css';

function App() {
  const [rootNode, setRootNode] = useState<FileNode | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');

  const handleOpenDirectory = useCallback(async () => {
    const result = await openDirectory();
    if (result) {
      setRootNode(result.root);
      setSelectedFile(null);
      setFileContent('');
      setOriginalContent('');
    }
  }, []);

  const handleSelectFile = useCallback(async (node: FileNode) => {
    if (node.kind === 'file' && node.handle) {
      const content = await readFile(node.handle);
      setSelectedFile(node);
      setFileContent(content);
      setOriginalContent(content);
    }
  }, []);

  const handleContentChange = useCallback((content: string) => {
    setFileContent(content);
  }, []);

  const handleSave = useCallback(async () => {
    if (selectedFile?.handle) {
      await writeFile(selectedFile.handle, fileContent);
      setOriginalContent(fileContent);
    }
  }, [selectedFile, fileContent]);

  const isModified = fileContent !== originalContent;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Org Mode PDA</h1>
      </header>
      <div className="app-body">
        <aside className="sidebar">
          <FileTree
            root={rootNode}
            selectedPath={selectedFile?.path ?? null}
            onSelectFile={handleSelectFile}
            onOpenDirectory={handleOpenDirectory}
          />
        </aside>
        <main className="main-pane">
          {selectedFile ? (
            <OrgEditor
              content={fileContent}
              fileName={selectedFile.name}
              modified={isModified}
              onContentChange={handleContentChange}
              onSave={handleSave}
            />
          ) : (
            <div className="empty-editor">
              <div className="empty-editor-content">
                <h2>Org Mode PDA</h2>
                <p>Select a .org file from the tree to view and edit it.</p>
                {!rootNode && (
                  <button className="open-dir-btn-large" onClick={handleOpenDirectory}>
                    Open a Folder
                  </button>
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
