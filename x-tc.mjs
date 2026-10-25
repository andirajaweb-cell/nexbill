import ts from "typescript";
const cfgPath = ts.findConfigFile(".", ts.sys.fileExists, "tsconfig.json");
const cfg = ts.parseJsonConfigFileContent(ts.readConfigFile(cfgPath, ts.sys.readFile).config, ts.sys, ".");
const p = ts.createProgram(process.argv.slice(2), { ...cfg.options, incremental: false, tsBuildInfoFile: undefined, noEmit: true, skipLibCheck: true });
const d = ts.getPreEmitDiagnostics(p);
for (const x of d) { const pos = x.file ? x.file.getLineAndCharacterOfPosition(x.start) : null; console.log(x.file ? x.file.fileName.replace(process.cwd(),"") : "(global)", pos ? pos.line+1 : "", ts.flattenDiagnosticMessageText(x.messageText, "\n").slice(0,250)); }
console.log("diagnostics:", d.length);
