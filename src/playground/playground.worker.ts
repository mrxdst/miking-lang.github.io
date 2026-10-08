/// <reference types="webpack/module" />

import mi from "../../modules/miking/src/es-boot/mi-es-lite.mjs";

declare module "../../modules/miking/src/es-boot/mi-es-lite.mjs" {
    export default function main(env: CompilerEnv): void;
}

const stdlibCtx = import.meta.webpackContext("file-loader?outputPath=stdlib!../../modules/miking/src/stdlib", {
    mode: "sync",
    recursive: true,
    regExp: /\.mc$/i,
});

// Workaround to silence warning.
const importUrl = new Function("url", "return import(url)") as (url: string) => Promise<any>;

export interface ToWorkerMessage {
    input: string,
}

export interface PrintMessage {
    type: "print",
    text: string,
}

export interface ExitMessage {
    type: "exit",
}

export type FromWorkerMessage = PrintMessage | ExitMessage;

function print(text: string) {
    globalThis.postMessage({
        type: "print",
        text,
    } satisfies PrintMessage);
}

function exit() {
    globalThis.postMessage({
        type: "exit",
    } satisfies ExitMessage);
}

main();
function main() {
    globalThis.addEventListener("message", handleMessage);
}

function handleMessage(event: MessageEvent<ToWorkerMessage>) {
    const input = event.data.input;
    compileAndRun(input);
    
}

async function compileAndRun(input: string) {
    try {
        const compilerEnv = newCompilerEnv(input);
        try {
            mi(compilerEnv);
        } catch (error) {
            if (error instanceof ExitError) {
                if (error.code) {
                    print(compilerEnv.getStdout());
                    return;
                }
            } else {
                print("" + error);
                return;
            }
        }

        try {
            const dataUrl = `data:text/javascript;base64,${globalThis.btoa(compilerEnv.getOutput())}`;
            const program = (await importUrl(dataUrl)).default as (env: ProgramEnv) => void;
            const programEnv = newProgramEnv();
            program(programEnv);
        } catch (error) {
            if (error instanceof ExitError) {
                if (error.code) {
                    print(`\nProgram exited with code: ${error.code}`);
                }
            } else {
                print("\n" + error);
            }
        }
    } finally {
        print("\n");
        exit();
    }
}

type CompilerEnv = ReturnType<typeof newCompilerEnv>;

function newCompilerEnv(input: string) {

    const argv = [
        "mi",
        "compile",
        "--test",
        "playground.mc",
        "--to-es"
    ];

    let fs = new Map<string, string>();
    
    const HOME = "/home/miking";
    const PWD = `${HOME}`;
    const STDLIB = `${HOME}/.local/lib/mcore/stdlib`;
    const MCORE_LIBS = `stdlib=${STDLIB}`;
    
    fs.set(`${PWD}/playground.mc`, input);

    let stdout = "";

    const env = {
        argv: (): string[] => argv,

        command: (cmd: string): number => {
            if (cmd === "command -v mkdir >/dev/null 2>&1") {
                return 0;
            }

            {
                const match = cmd.match(/^mkdir (.+) 2> \/dev\/null$/);
                if (match) {
                    return 0;
                }
            }

            {
                const match = cmd.match(/^cd . ; (.+) > (.+) 2> (.+) < (.+) ;$/);
                if (match) {
                    const prg = match[1] as string;
                    const stdout = match[2] as string;
                    switch (prg) {
                        case "pwd": {
                            fs.set(stdout, PWD + "\n");
                            return 0;
                        }
                        case "echo $HOME": {
                            fs.set(stdout, HOME + "\n");
                            return 0;
                        }
                        case "echo $MCORE_LIBS": {
                            fs.set(stdout, MCORE_LIBS + "\n");
                            return 0;
                        }
                    }
                }
            }

            {
                const match = cmd.match(/^echo  >> (.+)$/);
                if (match) {
                    const stdout = match[1] as string;
                    const content = fs.get(stdout) ?? "";
                    fs.set(stdout, content + "\n");
                    return 0;
                }
            }

            {
                const match = cmd.match(/^rm -rf (.+)$/);
                if (match) {
                    const target = match[1] as string;
                    fs = new Map([...fs].filter(([path, _]) => !path.startsWith(target)));
                    return 0;
                }
            }

            {
                const match = cmd.match(/^test -e (.+)$/);
                if (match) {
                    const path = match[1] as string;
                    if (path === PWD || path === HOME || path === STDLIB) {
                        return 0;
                    }
                    return env.fileExists(path) ? 0 : 1;
                }
            }

            console.log("COMMAND NOT IMPLEMENTED:", cmd);
            return 1;
        },

        writeFile: (path: string, data: string): void => {
            fs.set(path, data);
        },

        readFile: (path: string): string => {
            if (path.startsWith(STDLIB)) {
                const file = path.substring(STDLIB.length + 1);
                const content = syncFetchStdLibFile(file);
                if (content === null) {
                    throw new Error(`${path}: No such file`);
                }
                return content;
            }

            const content = fs.get(path);
            if (typeof content !== "string") {
                throw new Error(`${path}: No such file`);
            }
            return content;
        },

        fileExists: (path: string): boolean => {
            if (path.startsWith(STDLIB)) {
                const file = path.substring(STDLIB.length + 1);
                try {
                    stdlibCtx(`./${file}`);
                    return true;
                } catch (error) {
                    return false;
                }
            }
            return fs.has(path);
        },

        print: (s: string): void => {
            stdout += s;
        },

        printError: (s: string): void => {
            stdout += s;
        },

        dprint: (v: unknown): void => {
            stdout += JSON.stringify(v, null, 2);
        },

        flushStdout: () => {},

        flushStderr: () => {},

        exit: (code: number): never => {
            throw new ExitError(code);
        },

        error: (msg: unknown): never => {
            if (msg instanceof Error) {
                throw msg;
            }
            throw new Error("" + msg);
        },

        randIntU: (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo)),

        wallTimeMs: (): number => Date.now(),

        getOutput: (): string => {
            const content = fs.get("./playground.mjs");
            if (typeof content !== "string") {
                throw new Error("Missing compiler output");
            }
            return content;
        },

        getStdout: (): string => stdout,
    };

    return env;
}

type ProgramEnv = ReturnType<typeof newProgramEnv>;

function newProgramEnv() {
    const  fs = new Map<string, string>();

    return {
        argv: () => [],

        command: (cmd: string): number => 127,

        writeFile: (path: string, data: string): void => {
            fs.set(path, data);
        },

        readFile: (path: string): string => {
            const content = fs.get(path);
            if (typeof content !== "string") {
                throw new Error(`${path}: No such file`);
            }
            return content;
        },

        fileExists: (path: string): boolean => {
            return fs.has(path);
        },

        print: (s: string): void => {
            print(s);
        },

        printError: (s: string): void => {
            print(s);
        },

        dprint: (v: unknown): void => {
            print(JSON.stringify(v, null, 2));
        },

        flushStdout: () => {},

        flushStderr: () => {},

        exit: (code: number): never => {
            throw new ExitError(code);
        },

        error: (msg: unknown): never => {
            if (msg instanceof Error) {
                throw msg;
            }
            throw new Error("" + msg);
        },

        randIntU: (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo)),

        wallTimeMs: (): number => Date.now(),

        sleepMs: (ms: number): void => {
            const end = Date.now() + ms;
            while (Date.now() < end) {}
        },
    };
}

const fetchCache = new Map<string, string>();

function syncFetchStdLibFile(file: string): string | null {
    const cached = fetchCache.get(file);
    if (cached !== undefined) {
        return cached;
    }

    const request = new XMLHttpRequest();
    
    let url: string;
    try {
        url = (stdlibCtx(`./${file}`) as {default: string}).default;
    } catch {
        return null;
    }
    
    request.open("GET", url, false);
    request.send(null);

    if (request.status < 200 || request.status >= 300) {
        throw new Error(request.statusText);
    }

    fetchCache.set(file, request.responseText);
    return request.responseText;
}

class ExitError extends Error {
    code: number;

    constructor(code: number) {
        super();
        this.code = code;
    }
}
