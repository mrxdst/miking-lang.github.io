import { useCallback, useEffect, useRef, useState } from "react";
import { useColorMode } from "@docusaurus/theme-common";
import Layout from "@theme/Layout";
import styles from "./playground.module.css";
import clsx from "clsx";
import type { FromWorkerMessage, ToWorkerMessage } from "../misc/playground.worker";
import "@xterm/xterm/css/xterm.css";
import { ITheme, Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import Editor from "@monaco-editor/react";
import type * as monaco from "monaco-editor";
import { conf, language } from "../misc/miking-monarch";
import BrowserOnly from "@docusaurus/BrowserOnly";

const STORAGE_KEY = "miking-playground-src";
const DEFAULT_INPUT = `-- A base language fragment for an expression evaluator.
-- It does not implement anything on its own.
lang Eval
  syn Expr =

  sem eval: Expr -> Expr
end

-- A language fragment that extends the Eval fragment
-- with numbers and arithmetic addition.
lang Arith = Eval
  syn Expr +=
  | Num Int
  | Add (Expr, Expr)

  sem eval +=
  | Num n -> Num n
  | Add (e1, e2) ->
    match eval e1 with Num n1 then
      match eval e2 with Num n2 then
        Num (addi n1 n2)
      else error "Not a number"
    else error "Not a number"
end

-- Another language fragment that implements logical
-- values and branching.
lang Logic = Eval
  syn Expr +=
  | True()
  | False()
  | If (Expr, Expr, Expr)

  sem eval +=
  | True() -> True()
  | False() -> False()
  | If (cnd, thn, els) ->
    let cndVal = eval cnd in
    match cndVal with True() then eval thn
    else match cndVal with False() then eval els
    else error "Not a boolean"
end

-- Here we compose the two language fragments to
-- make a third language fragment that implements
-- both arithmetic and logical operations.
lang ArithLogic = Arith + Logic end

-- End of declarations and start of program
mexpr

use ArithLogic in

-- Construct an abstract syntax tree and evaluate it.
let ast = Add (If (False(), Num 0, Num 5), Num 2) in
let result = eval ast in
dprint result
`;

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
    return new Worker(new URL("../misc/playground.worker", import.meta.url));
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
        setRunning(true);
        const msg: ToWorkerMessage = { input: editorRef.current?.getValue() || "" };
        worker.postMessage(msg);
    }, [worker]);

    const handleAbort = useCallback(() => {
        setRunning(false);
        setWorker(initWorker());
    }, [initWorker]);

    return (
        <div className={clsx(styles.root, "container margin-vert--lg")}>
            <div className="row">
                <div className="col col--12">
                    <h1>The Miking playground</h1>
                    <p>
                        Edit the Miking program source in the editor to the left and hit <b>Run</b>.<br/>
                        The program output will be displayed in the right column.
                    </p>
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
                    <p className={styles.textAlignRight}>
                        {running
                            ? <button onClick={handleAbort}>Abort</button>
                            : <button onClick={handleRun}>Run</button>
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
