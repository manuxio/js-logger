// packages/logger/src/sinks/file.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import path from 'path';
import fs from 'fs';
import FileStreamRotator from 'file-stream-rotator';

export class FileSink {
  private mainStream: any | null = null;
  private topicStreams: Map<string, any> = new Map();
  private basePath?: string;
  private topicPattern?: string;

  constructor(filePath?: string, topicFilePath?: string) {
    this.basePath = filePath;
    this.topicPattern = topicFilePath;

    // Ensure directories exist eagerly (rotator doesn't always create them)
    if (this.basePath) ensureDir(this.basePath);
    if (this.topicPattern) ensureDir(this.topicPattern);

    if (this.basePath) {
      this.mainStream = createRotatingStream(this.basePath);
    }
  }

  write(topic: string, line: string) {
    // main file
    if (this.mainStream) {
      try { this.mainStream.write(line); } catch {}
    }

    // per-topic file
    if (this.topicPattern) {
      const p = this.topicPattern.replace(/%TOPIC%/g, sanitizeTopic(topic));
      let s = this.topicStreams.get(p);
      if (!s) {
        ensureDir(p);
        s = createRotatingStream(p);
        this.topicStreams.set(p, s);
      }
      try { s.write(line); } catch {}
    }
  }
}

/* --------------------------------- helpers -------------------------------- */

function createRotatingStream(targetPath: string) {
  // We pass the configured path as the "symlink_name",
  // so callers always see THIS exact filename for the current log.
  const dir = path.dirname(targetPath);
  const symlinkName = path.basename(targetPath).replace(/-%DATE%/g, ''); // remove any %DATE% placeholder

  // If the user didn’t include %DATE%, file-stream-rotator will append a date.
  // We keep that default behavior for the real files, but add a symlink
  // with the exact configured name pointing to the current active file.
  const stream = FileStreamRotator.getStream({
    filename: targetPath,        // allow rotator to manage real file names
    frequency: 'daily',          // or whatever your default is
    date_format: 'YYYY-MM-DD',   // keep your existing format
    create_symlink: true,
    symlink_name: symlinkName,   // e.g., predictive-test.log
    audit_file: path.join(dir, '.audit.json'), // avoids unbounded file growth
    // optional: size / max_logs / rotate_on_start
  });

  // Make sure the symlink lives in the same dir as targetPath:
  // file-stream-rotator creates the symlink next to the generated file.
  // If the library ever writes outside dir, ensureDir has already created it.
  return stream;
}

function ensureDir(p: string) {
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
  } catch {}
}

function sanitizeTopic(t: string): string {
  return t.replace(/[^\w.-]+/g, '_');
}
