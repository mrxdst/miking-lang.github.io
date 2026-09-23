import { useCallback, useEffect, useRef, useState } from "react";
import Layout from "@theme/Layout";
import styles from "./playground.module.css";
import clsx from "clsx";
import type { FromWorkerMessage, ToWorkerMessage } from "./playground.worker";
import "@xterm/xterm/css/xterm.css";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import Editor from '@monaco-editor/react';
import type * as monaco from "monaco-editor";

const STORAGE_KEY = "miking-playground-input";
const DEFAULT_INPUT = [
    "mexpr",
    "",
    "print \"Hello world!\""
].join("\n");

function initWorker(): Worker {
    return new Worker(new URL("./playground.worker", import.meta.url));
}

export default function Playground(): JSX.Element {
    const [worker, setWorker] = useState<Worker>(initWorker);
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const termContainerRef = useRef<HTMLDivElement>(null);
    const termRef = useRef<Terminal | null>(null);

    const [defaultInput] = useState(() => sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY) || DEFAULT_INPUT);

    const [running, setRunning] = useState(false);

    // Terminal
    useEffect(() => {
        if (!termContainerRef.current) return;

        const term = termRef.current = new Terminal({convertEol: true, disableStdin: true});
        const termFit = new FitAddon();

        term.open(termContainerRef.current);
        term.loadAddon(termFit);
        termFit.fit();

        const resizeObserver = new ResizeObserver(() => {
            termFit.fit();
        });

        resizeObserver.observe(termContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            termFit.dispose();
        };
    }, []);

    // Worker
    useEffect(() => {
        worker.addEventListener("message", handleMessage);

        return () => { worker.terminate(); }

        function handleMessage(event: MessageEvent<FromWorkerMessage>) {
            const msg = event.data;
            switch (msg.type) {
                case "print": {
                    termRef.current?.write(msg.text);
                    break;
                }
                case "exit": {
                    setRunning(false);
                    break;
                }
            }
        }
    }, [worker])

    const handleEditorDidMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
        editorRef.current = editor;
    }, []);

    // Save input
    const handleEditorChange = useCallback((value: string | undefined) => {
        sessionStorage.setItem(STORAGE_KEY, value || "");
        localStorage.setItem(STORAGE_KEY, value || "");
    }, []);

    const handleRun = useCallback(() => {
        setRunning(true);
        const msg: ToWorkerMessage = { input: editorRef.current?.getValue() || '' };
        worker.postMessage(msg);
    }, [worker]);

    const handleAbort = useCallback(() => {
        setRunning(false);
        termRef.current?.write("^C\n");
        setWorker(initWorker());
    }, [initWorker]);

    return (
        <Layout title="Playground">
            <div className="container margin-vert--lg">
                <div className="row">
                    <div className={clsx("col col--6", styles.inputCol)}>
                        <div className={styles.input}>
                            <Editor
                                defaultValue={defaultInput}
                                onMount={handleEditorDidMount}
                                onChange={handleEditorChange}
                            />
                        </div>
                        {running
                            ? <button className={styles.btn} onClick={handleAbort}>Abort</button>
                            : <button className={styles.btn} onClick={handleRun}>Run</button>
                        }
                    </div>
                    <div className="col col--6">
                        <div className={styles.output} ref={termContainerRef}/>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
