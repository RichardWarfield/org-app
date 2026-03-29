import type { FileNode } from '../types';

export const hasNativeFS = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

export async function openDirectory(): Promise<{ root: FileNode } | null> {
  if (!hasNativeFS) return null;
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    const root = await buildTree(handle, handle.name);
    return { root };
  } catch {
    return null;
  }
}

async function buildTree(dirHandle: FileSystemDirectoryHandle, path: string): Promise<FileNode> {
  const children: FileNode[] = [];

  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file') {
      if (entry.name.endsWith('.org')) {
        children.push({
          name: entry.name,
          path: `${path}/${entry.name}`,
          kind: 'file',
          handle: entry,
        });
      }
    } else if (entry.kind === 'directory' && !entry.name.startsWith('.')) {
      const subtree = await buildTree(entry, `${path}/${entry.name}`);
      if (subtree.children && subtree.children.length > 0) {
        children.push(subtree);
      }
    }
  }

  children.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return {
    name: dirHandle.name,
    path,
    kind: 'directory',
    children,
    dirHandle: dirHandle,
  };
}

export function buildTreeFromFiles(files: File[]): FileNode | null {
  const orgFiles = files.filter((f) => f.name.endsWith('.org'));
  if (orgFiles.length === 0) return null;

  const rootMap = new Map<string, FileNode>();

  for (const file of orgFiles) {
    const pathParts = file.webkitRelativePath
      ? file.webkitRelativePath.split('/')
      : [file.name];

    let currentPath = '';
    for (let i = 0; i < pathParts.length - 1; i++) {
      const dirName = pathParts[i];
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${dirName}` : dirName;

      if (!rootMap.has(currentPath)) {
        const dirNode: FileNode = {
          name: dirName,
          path: currentPath,
          kind: 'directory',
          children: [],
        };
        rootMap.set(currentPath, dirNode);

        if (parentPath && rootMap.has(parentPath)) {
          rootMap.get(parentPath)!.children!.push(dirNode);
        }
      }
    }

    const fileNode: FileNode = {
      name: file.name,
      path: file.webkitRelativePath || file.name,
      kind: 'file',
      fileData: file,
    };

    if (currentPath && rootMap.has(currentPath)) {
      rootMap.get(currentPath)!.children!.push(fileNode);
    } else {
      rootMap.set(fileNode.path, fileNode);
    }
  }

  // Find root nodes
  const allPaths = [...rootMap.keys()];
  const rootPaths = allPaths.filter((p) => !p.includes('/') || !rootMap.has(p.substring(0, p.lastIndexOf('/'))));

  if (rootPaths.length === 1) {
    return rootMap.get(rootPaths[0])!;
  }

  // Wrap in virtual root
  const root: FileNode = {
    name: 'Files',
    path: '',
    kind: 'directory',
    children: rootPaths.map((p) => rootMap.get(p)!),
  };
  return root;
}

export async function readFileNode(node: FileNode): Promise<string> {
  if (node.handle) {
    const file = await node.handle.getFile();
    return file.text();
  }
  if (node.fileData) {
    return node.fileData.text();
  }
  return '';
}

export async function writeFileNode(node: FileNode, content: string): Promise<boolean> {
  if (node.handle) {
    try {
      const writable = await node.handle.createWritable();
      await writable.write(content);
      await writable.close();
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function downloadFile(fileName: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
