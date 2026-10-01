import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { useColorMode } from "@docusaurus/theme-common";
import Layout from "@theme/Layout";
import styles from "./playground.module.css";
import clsx from "clsx";
import type { FromWorkerMessage, ToWorkerMessage } from "../playground/playground.worker";
import "@xterm/xterm/css/xterm.css";
import { ITheme, Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import Editor from "@monaco-editor/react";
import type * as monaco from "monaco-editor";
import { conf, language } from "../playground/miking-monarch";
import { Example, examples } from "../playground/examples";
import BrowserOnly from "@docusaurus/BrowserOnly";

const STORAGE_KEY = "miking-playground-src";
const DEFAULT_INPUT = examples.helloWorld.src;

const termLightTheme: ITheme = {
  background: "#ffffff",
  foreground: "#000000",
  cursor: "#000000",
  selectionBackground: "#b4b4b4",
};

const termDarkTheme: ITheme = {
  background: "#1e1e1e",
  foreground: "#d4d4d4",
  cursor: "#d4d4d4",
};

const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
    tabSize: 2
};

function initWorker(): Worker {
    return new Worker(new URL("../playground/playground.worker", import.meta.url));
}

export default function Playground(): JSX.Element {
    return (
        <Layout title="Playground">
            <BrowserOnly>
                {() => <PlaygroundInner/>}
            </BrowserOnly>
        </Layout>
    );
}

function PlaygroundInner(): JSX.Element {
    const {colorMode} = useColorMode();

    const [worker, setWorker] = useState<Worker>(initWorker);
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const termContainerRef = useRef<HTMLDivElement>(null);
    const termRef = useRef<Terminal | null>(null);

    const [defaultInput] = useState(() => sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY) || DEFAULT_INPUT);

    const [running, setRunning] = useState(false);

    // Terminal
    useEffect(() => {
        if (!termContainerRef.current) return;

        const term = termRef.current = new Terminal({
            convertEol: true,
            disableStdin: true,
            theme: colorMode === "dark" ? termDarkTheme : termLightTheme,
        });
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

    // Terminal theme
    useEffect(() => {
        if (!termRef.current) return;
        termRef.current.options.theme = colorMode === "dark" ? termDarkTheme : termLightTheme;
    }, [colorMode]);

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

    const handleEditorBeforeMount = useCallback((monaco: typeof import("monaco-editor")) => {
        monaco.languages.register({id: "miking"});
        monaco.languages.setMonarchTokensProvider("miking", language);
        monaco.languages.setLanguageConfiguration("miking", conf);
    }, []);

    const handleEditorMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
        editorRef.current = editor;
    }, []);

    // Save input
    const handleEditorChange = useCallback((value: string | undefined) => {
        sessionStorage.setItem(STORAGE_KEY, value || "");
        localStorage.setItem(STORAGE_KEY, value || "");
    }, []);

    const handleRun = useCallback(() => {
        if (!editorRef.current) return;
        setRunning(true);
        const msg: ToWorkerMessage = { input: editorRef.current.getValue() };
        worker.postMessage(msg);
    }, [worker]);

    const handleAbort = useCallback(() => {
        setRunning(false);
        setWorker(initWorker());
    }, [initWorker]);

    const handleExampleChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
        if (!editorRef.current) return;
        const key = e.target.value;
        e.target.value = "";
        const ex = (examples as Record<string, Example | undefined>)[key];
        if (!ex) return;
        const model = editorRef.current.getModel();
        if (!model) return;
        const range = model.getFullModelRange();
        model.pushEditOperations([], [{range, text: ex.src}], () => null);
    }, []);

    return (
        <div className={clsx(styles.root, "container margin-vert--lg")}>
            <div className="row">
                <div className="col col--12">
                    <h1>The Miking playground</h1>
                    <p style={{marginBottom: 0}}>
                        Edit the Miking program source in the editor to the left and hit <b>Run</b> at the bottom.<br/>
                        The program output will be displayed in the right column.<br/>
                    </p>
                </div>
            </div>
            <div className="row">
                <div className="col col--6">
                    <div style={{textAlign: "right"}}>
                        <select className={styles.select} onChange={handleExampleChange}>
                            <option value="" disabled>Pick an example</option>
                            {Object.entries(examples).map(([key, ex]) => {
                                return (
                                    <option key={key} value={key}>{ex.name}</option>
                                );
                            })}
                        </select>
                    </div>
                </div>
            </div>
            <div className="row">
                <div className="col col--6">
                    <div className={styles.input}>
                        <Editor
                            language="miking"
                            theme={colorMode === "dark" ? "vs-dark" : "vs"}
                            defaultValue={defaultInput}
                            beforeMount={handleEditorBeforeMount}
                            onMount={handleEditorMount}
                            onChange={handleEditorChange}
                            options={editorOptions}
                        />
                    </div>
                    <p style={{textAlign: "right"}}>
                        {running
                            ? <button className={styles.btn} onClick={handleAbort}>Abort</button>
                            : <button className={styles.btn} onClick={handleRun}>Run</button>
                        }
                    </p>
                </div>
                <div className="col col--6">
                    <div className={styles.output} ref={termContainerRef}/>
                </div>
            </div>
        </div>
    );
}
