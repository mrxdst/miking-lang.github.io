const languageComposition = `-- A base language fragment for an expression evaluator.
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

const helloWorld = `mexpr

print "Hello, world!"
`;

const utest = `-- Each dot in the output indicate a passing unit test.

mexpr

-- Checks that the addition of 1 and 2 is in fact 3.
utest addi 1 2 with 3 in

-- Checks that the addition of 1 and 2 is not 0.
utest addi 1 2 with 0 using neqi in

-- With a custom failure message. Try changing 0 to 3.
utest addi 1 2 with 0 using neqi else lam l. lam r. "1+2 should not be 0" in

()
`;

export interface Example {
    name: string,
    src: string;
}

export const examples = {
    helloWorld: {
        name: "Hello, world",
        src: helloWorld
    } as Example,
    utest: {
        name: "Unit tests",
        src: utest
    } as Example,
    languageComposition: {
        name: "Language composition",
        src: languageComposition,
    } as Example,
};
