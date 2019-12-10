import * as vinyl from 'vinyl';
import * as stream from 'stream';

export type File =
| vinyl.BufferFile
| vinyl.StreamFile
| vinyl.NullFile
| vinyl.DirectoryFile
| vinyl.SymbolicFile;

export type Handler = (
    file: File,
    stream: stream.Transform,
) => void | Promise<void>;
