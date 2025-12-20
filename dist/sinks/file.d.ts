export declare class FileSink {
    private mainStream;
    private topicStreams;
    private basePath?;
    private topicPattern?;
    constructor(filePath?: string, topicFilePath?: string);
    write(topic: string, line: string): void;
}
