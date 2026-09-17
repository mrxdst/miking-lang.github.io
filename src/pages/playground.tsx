import { useCallback, useEffect, useRef, useState } from 'react';
import Layout from '@theme/Layout';
import useIsBrowser from '@docusaurus/useIsBrowser';
import styles from './playground.module.css';
import clsx from 'clsx';
import type { FromWorkerMessage, ToWorkerMessage } from "./playground.worker";

const STORAGE_KEY = "miking-playground-input";
const DEFAULT_INPUT = [
    "mexpr",
    "",
    "print \"Hello world!\""
].join("\n");

export default function Playground(): JSX.Element {
    const isBrowser = useIsBrowser();
    const [worker, setWorker] = useState<Worker | null>(null);

    const [input, setInput] = useState(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored || DEFAULT_INPUT;
    });

    const [output, setOutput] = useState("");

    const [running, setRunning] = useState(false);

    const initWorker = useCallback(() => {
        if (!isBrowser) return;
        setWorker(new Worker(new URL('./playground.worker', import.meta.url)));
        setRunning(false);
    }, [isBrowser]);

    useEffect(initWorker, [initWorker]);

    useEffect(() => {
        if (!worker) return;
        worker.addEventListener("message", handleMessage);
        
        return () => { worker.terminate(); }

        function handleMessage(event: MessageEvent<FromWorkerMessage>) {
            const msg = event.data;
            switch (msg.type) {
                case "print": {
                    setOutput(s => s + msg.text);
                    break;
                }
                case "exit": {
                    setRunning(false);
                    break;
                }
            }
        }
    }, [worker])

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, input);
    }, [input]);

    const handleRun = useCallback(() => {
        if (!worker) return;
        setRunning(true);
        setOutput("");
        const msg: ToWorkerMessage = {
            input
        };
        worker.postMessage(msg);
    }, [input, worker]);

    const handleAbort = useCallback(initWorker, [initWorker]);

    return (
        <Layout title="Playground">
            <div className="container margin-vert--lg">
                <div className="row">
                    <div className={clsx("col col--6", styles.inputCol)}>
                        <textarea className={styles.input} wrap="off" value={input} rows={20} onChange={(e) => setInput(e.target.value)} />
                        {running
                            ? <button className={styles.btn} onClick={handleAbort}>Abort</button>
                            : <button className={styles.btn} onClick={handleRun}>Run</button>
                        }
                    </div>
                    <div className="col col--6">
                        <pre className={styles.output}>{output}</pre>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
