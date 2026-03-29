export interface FileNode {
  name: string;
  path: string;
  kind: 'file' | 'directory';
  children?: FileNode[];
  handle?: FileSystemFileHandle;
  dirHandle?: FileSystemDirectoryHandle;
  fileData?: File;
}

export interface OrgHeading {
  level: number;
  title: string;
  keyword?: string;
  tags?: string[];
}

export interface OrgBlock {
  type: 'heading' | 'paragraph' | 'list-item' | 'code-block' | 'horizontal-rule' | 'blank';
  raw: string;
  heading?: OrgHeading;
  language?: string;
  content?: string;
}
