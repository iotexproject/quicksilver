export interface Tool {
    name: string;
    description: string;
    twitterAccount: string;
    execute(input: string): Promise<string>;
}

export abstract class APITool implements Tool {
    name: string;
    description: string;
    twitterAccount: string = '';
    protected apiKey: string;

    constructor(name: string, description: string, apiKey: string) {
        this.name = name;
        this.description = description;
        this.apiKey = apiKey;
    }

    abstract execute(input: string): Promise<string>;
}