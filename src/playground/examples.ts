export interface Example {
    name: string,
    src: string,
}

const exCtx = import.meta.webpackContext("../../modules/miking/src/test/playground", {
    mode: "sync",
    recursive: true,
    regExp: /\.mc$/i,
});

export const examples: Example[] = [];

for (const key of exCtx.keys()) {
    let src = exCtx(key) as string;

    const titleRe = /-- title: (.+)(?:\r?\n)+/;

    const match = src.match(titleRe);
    const name = match?.[1];
    if (!name) continue;

    src = src.replace(titleRe, "");

    examples.push({name, src});
}

examples.sort((a, b) => a.name.localeCompare(b.name));
