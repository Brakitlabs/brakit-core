const js = require("@eslint/js");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const globals = require("globals");

module.exports = [
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "brakit-pro/dist/**",
      "overlay/dist/**",
      "backend/dist/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["cli/**/*.ts", "backend/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: "module",
        ecmaVersion: 2022,
        // eslint-disable-next-line no-undef
        tsconfigRootDir: process.cwd(),
        projectService: true,
      },
      globals: {
        ...globals.node,
        process: "readonly",
        __dirname: "readonly",
        require: "readonly",
        module: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^ignored" },
      ],
    },
  },
];
