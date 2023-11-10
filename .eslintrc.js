module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  // parser: "vue-eslint-parser",
  // parserOptions: {
  //   parser: "@typescript-eslint/parser",
  // },
  extends: [
    "eslint:recommended",
    "prettier",
  ],
  plugins: ["@typescript-eslint", "prettier"],
  rules: {
    "prettier/prettier": "error",
  },
};
