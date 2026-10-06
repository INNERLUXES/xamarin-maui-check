// The listing of the solution folder: every file the tool reads or notes, in the order of their paths. Those are
// solutions (*.sln), C# projects (*.csproj), packages.config files, C# files (*.cs), XAML files (*.xaml), and the
// platform manifests AndroidManifest.xml and Info.plist, whose presence alone is used. The folders bin, obj, packages,
// .git and .vs hold build output, restored packages, history and editor state, not the code as written, so they are
// counted and passed over, in any case of letters; so is every path that matches an exclude pattern. A symbolic link (a
// junction on Windows too) is counted and never followed, so the listing cannot leave the folder or walk a loop. The
// listing keeps a list of folders of its own, with no recursion, and stops at its limits of entries, depth and files
// and says so, so a run never passes because a part of the folder was not read.

import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { excluded } from './glob.js';
import { asciiLower, byCode, joinPath } from './words.js';

export const WALK_LIMITS = { maxProjectEntries: 50000, maxFolderDepth: 32, maxInputFiles: 5000 };

// The folders that are never read: build output, restored packages, the history of git and the state of the editor.
export const SKIPPED_FOLDERS = ['bin', 'obj', 'packages', '.git', '.vs'];

// The kind of a file from its name, or null: 'solution', 'project', 'packages', 'code', 'xaml', 'androidManifest' or
// 'infoPlist'. Names are compared without regard to case.
export function kindOfFile(name) {
  const n = asciiLower(name);
  const ends = (ext) => n.endsWith(ext) && n.length > ext.length;
  if (ends('.sln')) return 'solution';
  if (ends('.csproj')) return 'project';
  if (n === 'packages.config') return 'packages';
  if (ends('.cs')) return 'code';
  if (ends('.xaml')) return 'xaml';
  if (n === 'androidmanifest.xml') return 'androidManifest';
  if (n === 'info.plist') return 'infoPlist';
  return null;
}

// The files below a folder: { files: [{ rel, full, name, kind }], skipped, excluded, links, others, limit }, where rel is
// the path from the folder with forward slashes, skipped counts the folders of SKIPPED_FOLDERS passed over, and limit
// says which limit stopped the listing, or is null.
export async function walkProject(root, { exclude = [], limits = WALK_LIMITS } = {}) {
  const lim = { ...WALK_LIMITS, ...limits };
  const files = [];
  let entries = 0;
  let skipped = 0;
  let excludedCount = 0;
  let links = 0;
  let others = 0;
  let limit = null;
  const folders = [{ rel: '', full: root, depth: 0 }];
  while (folders.length && limit === null) {
    const folder = folders.pop();
    const list = await readdir(folder.full, { withFileTypes: true });
    list.sort((a, b) => byCode(a.name, b.name));
    const inner = [];
    for (const entry of list) {
      entries += 1;
      if (entries > lim.maxProjectEntries) {
        limit = `more than ${lim.maxProjectEntries.toLocaleString('en-US')} files and folders`;
        break;
      }
      const rel = joinPath(folder.rel, entry.name);
      if (entry.isSymbolicLink()) {
        links += 1;
        continue;
      }
      if (entry.isDirectory()) {
        if (SKIPPED_FOLDERS.includes(asciiLower(entry.name))) skipped += 1;
        else if (excluded(exclude, rel, true)) excludedCount += 1;
        else if (folder.depth + 1 > lim.maxFolderDepth) limit = `folders nested more than ${lim.maxFolderDepth} deep, at ${rel}`;
        else inner.push({ rel, full: join(folder.full, entry.name), depth: folder.depth + 1 });
        continue;
      }
      const kind = entry.isFile() ? kindOfFile(entry.name) : null;
      if (kind === null) {
        others += 1;
        continue;
      }
      if (excluded(exclude, rel)) {
        excludedCount += 1;
        continue;
      }
      if (files.length >= lim.maxInputFiles) {
        limit = `more than ${lim.maxInputFiles.toLocaleString('en-US')} solution, project, package, C#, XAML and manifest files`;
        break;
      }
      files.push({ rel, full: join(folder.full, entry.name), name: entry.name, kind });
    }
    for (let k = inner.length - 1; k >= 0; k -= 1) folders.push(inner[k]);
  }
  files.sort((a, b) => byCode(a.rel, b.rel));
  return { files, skipped, excluded: excludedCount, links, others, limit };
}
