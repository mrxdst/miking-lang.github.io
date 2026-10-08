import helloWorld from "./examples/hello-world.mc";
import utest from "./examples/utest.mc";
import languageComposition from "./examples/language-composition.mc";

import boolTest from "../../modules/miking/src/test/mexpr/bool-test.mc";
import intTest from "../../modules/miking/src/test/mexpr/int-test.mc";
import floatTest from "../../modules/miking/src/test/mexpr/float-test.mc";
import stringTest from "../../modules/miking/src/test/mexpr/string-test.mc";
import seqTest from "../../modules/miking/src/test/mexpr/seq-test.mc";
import effects from "../../modules/miking/src/test/mexpr/effects.mc";
import symbs from "../../modules/miking/src/test/mexpr/symbs.mc";
import references from "../../modules/miking/src/test/mexpr/references.mc";
import randomTest from "../../modules/miking/src/test/mexpr/random-test.mc";
import time from "../../modules/miking/src/test/mexpr/time.mc";

export interface Example {
    name: string,
    src: string,
}

const _examples = [
    { name: "Hello, world", src: helloWorld },
    { name: "Unit tests", src: utest },
    { name: "Language composition", src: languageComposition },
    { name: "Boolean intrinsics", src: boolTest },
    { name: "Integer intrinsics", src: intTest },
    { name: "Floating-point number intrinsics", src: floatTest },
    { name: "Strings intrinsics", src: stringTest },
    { name: "Sequences intrinsics", src: seqTest },
    { name: "Side effect intrinsics", src: effects },
    { name: "Symbol intrinsics", src: symbs },
    { name: "Reference intrinsics", src: references },
    { name: "Random number generation intrinsics", src: randomTest },
    { name: "Time intrinsics", src: time },
] satisfies Example[];

export const examples = _examples as Example[];
