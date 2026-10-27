import helloWorld from "./examples/hello-world.mc";
import utest from "./examples/utest.mc";
import languageComposition from "./examples/language-composition.mc";

import boolTest from "../../modules/miking/src/test/mexpr/bool-test.mc";
import effects from "../../modules/miking/src/test/mexpr/effects.mc";
import floatTest from "../../modules/miking/src/test/mexpr/float-test.mc";
import intTest from "../../modules/miking/src/test/mexpr/int-test.mc";
import match from "../../modules/miking/src/test/mexpr/match.mc";
import randomTest from "../../modules/miking/src/test/mexpr/random-test.mc";
import reclets from "../../modules/miking/src/test/mexpr/reclets.mc";
import records from "../../modules/miking/src/test/mexpr/records.mc";
import references from "../../modules/miking/src/test/mexpr/references.mc";
import seqTest from "../../modules/miking/src/test/mexpr/seq-test.mc";
import stringops from "../../modules/miking/src/test/mexpr/stringops.mc";
import stringTest from "../../modules/miking/src/test/mexpr/string-test.mc";
import symbs from "../../modules/miking/src/test/mexpr/symbs.mc";
import time from "../../modules/miking/src/test/mexpr/time.mc";
import tuples from "../../modules/miking/src/test/mexpr/tuples.mc";

export interface Example {
    name: string,
    src: string,
}

const _examples = [
    { name: "Boolean intrinsics", src: boolTest },
    { name: "Floating-point number intrinsics", src: floatTest },
    { name: "Hello, world", src: helloWorld },
    { name: "Integer intrinsics", src: intTest },
    { name: "Language composition", src: languageComposition },
    { name: "Match", src: match },
    { name: "Mutual recursion", src: reclets },
    { name: "Random number generation intrinsics", src: randomTest },
    { name: "Records", src: records },
    { name: "Reference intrinsics", src: references },
    {
        name: "Sequences intrinsics",
        // Only rope is implemented, comment out utest for isRope and isList
        src: seqTest.replaceAll(/^utest is(Rope|List) /gm, m => `-- ${m}`)
    },
    { name: "Side effect intrinsics", src: effects },
    { name: "String operations", src: stringops },
    { name: "Strings intrinsics", src: stringTest },
    { name: "Symbol intrinsics", src: symbs },
    { name: "Time intrinsics", src: time },
    { name: "Tuples", src: tuples },
    { name: "Unit tests", src: utest },
] satisfies Example[];

export const examples = _examples as Example[];
