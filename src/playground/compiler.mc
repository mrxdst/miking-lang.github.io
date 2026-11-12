include "basic-types.mc"
include "bool.mc"
include "common.mc"
include "map.mc"
include "name.mc"
include "option.mc"
include "seq.mc"
include "string.mc"
include "sys.mc"
include "mexpr/ast.mc"
include "mexpr/ast-builder.mc"
include "mexpr/builtin.mc"
include "mexpr/deadcode.mc"
include "mexpr/generate-eq.mc"
include "mexpr/generate-pprint.mc"
include "mexpr/generate-utest.mc"
include "mexpr/info.mc"
include "mexpr/shallow-patterns.mc"
include "mexpr/type-check.mc"
include "mlang/loader.mc"
include "parser/loader.mc"
include "ecmascript/mcore.mc"
include "ocaml/compile.mc"
include "ocaml/mcore.mc"

lang MCoreESLiteCompile =
  ComposedMCoreLoader + NativeParserLoader +
  DPrintViaPprintLoader + StripUtestLoader + UtestLoader +
  OldDPrintViaPprint + MExprGeneratePprint + GeneratePprintMissingCase +
  MExprGenerateEq + GenerateEqMetaVarError +
  MExprLowerNestedPatterns + MExprDeadcodeElimination + MCoreCompileLang
end

-- This is a minimal copy of compileViaLoader in modules/miking/src/main/compile.mc
let compile = lam.
  use MCoreESLiteCompile in
  let sourcePath = "./playground.mc" in
  let absSourcePath = "/home/miking/playground.mc" in

  let loader = mkLoader typcheckEnvDefault [] in
  let loader = enableNativeParser loader in

  let loader =
    let keepUtestIf = lam x.
      if x.static
      then match x.info with Info x
        then eqString x.filename absSourcePath
        else true
      else true in
    let loader = enableUtestGeneration keepUtestIf loader in
    registerCustomEqFunction (mapFindExn "Symbol" builtinTypeNames) (uconst_ (CEqsym ())) loader in

  let loader =
    let loader = enableDPrintViaPprint loader in
    match includeFileExn "." "stdlib::string.mc" loader with (stringEnv, loader) in
    let symName = nameSym "s" in
    let symPprint =
      nulam_ symName (concat_ (str_ "sym (")
        (concat_
          (app_ (nvar_ (_getVarExn "int2string" stringEnv)) (app_ (uconst_ (CSym2hash ())) (nvar_ symName)))
          (str_ ")"))) in
    registerCustomPprintFunction (mapFindExn "Symbol" builtinTypeNames) symPprint loader in

  let loader =
    (includeFileTypeExn (FMCore {includeMExpr = true}) "." sourcePath loader).1 in

  let ast = buildFullAst loader in
  let ast = removeMetaVarExpr ast in
  let ast = lowerAll ast in
  let ast = deadcodeElimination ast in
  let ast = forceLazyExpr ast in
  let ast = removeOpaqueExpr ast in

  compileMCoreToES compileESOptionsEmpty ast sourcePath;
  ()

mexpr

compile ()
