import { useCallback, useEffect, useRef, useState } from "react";
import Layout from "@theme/Layout";
import styles from "./playground.module.css";
import clsx from "clsx";
import type { FromWorkerMessage, ToWorkerMessage } from "./playground.worker";
import "@xterm/xterm/css/xterm.css";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";

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
    const outputRef = useRef<HTMLDivElement>(null);
    const termRef = useRef<Terminal>(new Terminal({convertEol: true, disableStdin: true}));
    const termFitRef = useRef(new FitAddon());

    const [input, setInput] = useState(() => sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY) || DEFAULT_INPUT);

    const [running, setRunning] = useState(false);

    // Terminal
    useEffect(() => {
        if (!outputRef.current) return;

        termRef.current.open(outputRef.current);
        termRef.current.loadAddon(termFitRef.current);
        termFitRef.current.fit();

        const resizeObserver = new ResizeObserver(() => {
            termFitRef.current.fit();
        });

        resizeObserver.observe(outputRef.current);

        return () => {
            resizeObserver.disconnect();
            termRef.current.dispose();
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
                    termRef.current.write(msg.text);
                    break;
                }
                case "exit": {
                    setRunning(false);
                    break;
                }
            }
        }
    }, [worker])

    // Save input
    useEffect(() => {
        sessionStorage.setItem(STORAGE_KEY, input);
        localStorage.setItem(STORAGE_KEY, input);
    }, [input]);

    const handleRun = useCallback(() => {
        setRunning(true);
        const msg: ToWorkerMessage = { input };
        worker.postMessage(msg);
    }, [input, worker]);

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
                        <textarea className={styles.input} wrap="off" value={input} onChange={(e) => setInput(e.target.value)} />
                        {running
                            ? <button className={styles.btn} onClick={handleAbort}>Abort</button>
                            : <button className={styles.btn} onClick={handleRun}>Run</button>
                        }
                    </div>
                    <div className="col col--6">
                        <div className={styles.output} ref={outputRef}/>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
