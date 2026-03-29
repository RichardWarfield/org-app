import type { FileNode } from '../types';

export async function openDirectory(): Promise<{ root: FileNode; handle: FileSystemDirectoryHandle } | null> {
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    const root = await buildTree(handle, handle.name);
    return { root, handle };
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

export async function readFile(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile();
  return file.text();
}

export async function writeFile(handle: FileSystemFileHandle, content: string): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}
