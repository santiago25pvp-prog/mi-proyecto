require("ts-node").register({
  transpileOnly: true,
  ignoreDiagnostics: [5011, 5110],
  compilerOptions: {
    rootDir: ".",
    module: "commonjs",
    moduleResolution: "node16",
  },
});
