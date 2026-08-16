import js from "@eslint/js"
import { defineConfig, globalIgnores } from "eslint/config"
import betterTailwindcss from "eslint-plugin-better-tailwindcss"
import jsxA11y from "eslint-plugin-jsx-a11y"
import promise from "eslint-plugin-promise"
import sonarjs from "eslint-plugin-sonarjs"
import unicorn from "eslint-plugin-unicorn"
import nextCoreWebVitals from "eslint-config-next/core-web-vitals"
import nextTypescript from "eslint-config-next/typescript"

const asWarnings = (rules) =>
  Object.fromEntries(
    Object.entries(rules).map(([name, config]) => {
      const [severity, ...options] = Array.isArray(config) ? config : [config]
      return [name, severity === "off" || severity === 0 ? "off" : ["warn", ...options]]
    }),
  )

const tailwindRules = Object.fromEntries(
  Object.entries(betterTailwindcss.configs.recommended.rules)
    .filter(([name]) =>
      [
        "better-tailwindcss/no-concatenated-classes",
        "better-tailwindcss/no-conflicting-classes",
        "better-tailwindcss/no-deprecated-classes",
        "better-tailwindcss/no-duplicate-classes",
        "better-tailwindcss/no-unknown-classes",
      ].includes(name),
    )
    .map(([name, config]) => {
      const [, ...options] = Array.isArray(config) ? config : [config]
      return [name, ["warn", ...options, { entryPoint: "app/globals.css" }]]
    }),
)

export default defineConfig([
  js.configs.recommended,
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "better-tailwindcss": betterTailwindcss,
      promise,
      sonarjs,
      unicorn,
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
    rules: {
      ...asWarnings(jsxA11y.configs.recommended.rules),
      ...asWarnings(promise.configs["flat/recommended"].rules),
      ...asWarnings(unicorn.configs.unopinionated.rules),
      ...tailwindRules,

      // Correctness and defensive JavaScript practices.
      "array-callback-return": ["warn", { allowImplicit: true, checkForEach: true }],
      "block-scoped-var": "error",
      "consistent-return": "warn",
      "constructor-super": "error",
      "default-case-last": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
      "for-direction": "error",
      "getter-return": ["error", { allowImplicit: false }],
      "grouped-accessor-pairs": "warn",
      "logical-assignment-operators": ["warn", "always", { enforceForIfStatements: true }],
      "no-alert": "warn",
      "no-async-promise-executor": "error",
      "no-await-in-loop": "warn",
      "no-class-assign": "error",
      "no-compare-neg-zero": "error",
      "no-cond-assign": ["error", "always"],
      "no-console": ["warn", { allow: ["error", "info", "warn"] }],
      "no-const-assign": "error",
      "no-constant-binary-expression": "error",
      "no-constructor-return": "error",
      "no-control-regex": "warn",
      "no-debugger": "error",
      "no-dupe-args": "error",
      "no-dupe-class-members": "error",
      "no-dupe-else-if": "error",
      "no-dupe-keys": "error",
      "no-duplicate-case": "error",
      "no-empty-pattern": "error",
      "no-eval": "error",
      "no-ex-assign": "error",
      "no-extra-boolean-cast": "error",
      "no-fallthrough": ["error", { allowEmptyCase: true }],
      "no-func-assign": "error",
      "no-global-assign": "error",
      "no-import-assign": "error",
      "no-implied-eval": "error",
      "no-irregular-whitespace": "error",
      "no-loss-of-precision": "error",
      "no-new-func": "error",
      "no-new-native-nonconstructor": "error",
      "no-obj-calls": "error",
      "no-promise-executor-return": "error",
      "no-prototype-builtins": "error",
      "no-regex-spaces": "error",
      "no-script-url": "error",
      "no-self-assign": ["error", { props: true }],
      "no-self-compare": "error",
      "no-setter-return": "error",
      "no-shadow-restricted-names": "error",
      "no-sparse-arrays": "error",
      "no-template-curly-in-string": "warn",
      "no-this-before-super": "error",
      "no-throw-literal": "error",
      "no-undef-init": "error",
      "no-unexpected-multiline": "error",
      "no-unmodified-loop-condition": "warn",
      "no-unreachable": "error",
      "no-unreachable-loop": "error",
      "no-unsafe-finally": "error",
      "no-unsafe-negation": ["error", { enforceForOrderingRelations: true }],
      "no-unsafe-optional-chaining": ["error", { disallowArithmeticOperators: true }],
      "no-unused-private-class-members": "error",
      "no-useless-assignment": "warn",
      "no-useless-backreference": "error",
      "no-useless-call": "warn",
      "no-useless-catch": "error",
      "no-useless-concat": "warn",
      "no-useless-escape": "error",
      "no-useless-return": "warn",
      "no-with": "error",
      "object-shorthand": ["warn", "always"],
      "prefer-arrow-callback": ["warn", { allowNamedFunctions: true }],
      "prefer-exponentiation-operator": "warn",
      "prefer-named-capture-group": "off",
      "prefer-object-has-own": "warn",
      "prefer-object-spread": "warn",
      "prefer-promise-reject-errors": ["error", { allowEmptyReject: true }],
      "prefer-regex-literals": ["warn", { disallowRedundantWrapping: true }],
      radix: "error",
      "require-atomic-updates": "warn",
      "require-unicode-regexp": "off",
      "use-isnan": ["error", { enforceForIndexOf: true }],
      "valid-typeof": ["error", { requireStringLiterals: true }],
      yoda: ["error", "never", { exceptRange: true }],

      // TypeScript consistency without requiring type-aware linting on every file.
      "@typescript-eslint/consistent-type-assertions": ["warn", { assertionStyle: "as" }],
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { disallowTypeAnnotations: false, fixStyle: "inline-type-imports", prefer: "type-imports" },
      ],
      "@typescript-eslint/default-param-last": "warn",
      "@typescript-eslint/method-signature-style": ["warn", "property"],
      "@typescript-eslint/no-confusing-non-null-assertion": "error",
      "@typescript-eslint/no-dynamic-delete": "warn",
      "@typescript-eslint/no-empty-function": "warn",
      "@typescript-eslint/no-extraneous-class": "warn",
      "@typescript-eslint/no-invalid-void-type": "error",
      "@typescript-eslint/no-loop-func": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-shadow": "warn",
      "@typescript-eslint/no-useless-constructor": "warn",
      "@typescript-eslint/prefer-enum-initializers": "warn",
      "@typescript-eslint/prefer-for-of": "warn",
      "@typescript-eslint/prefer-function-type": "warn",
      "@typescript-eslint/prefer-literal-enum-member": "warn",
      "@typescript-eslint/unified-signatures": "warn",

      // Import boundaries and module hygiene.
      "import/consistent-type-specifier-style": "off",
      "import/first": "warn",
      "import/newline-after-import": ["warn", { count: 1 }],
      "import/no-absolute-path": "error",
      "import/no-cycle": ["warn", { ignoreExternal: true, maxDepth: 3 }],
      "import/no-duplicates": "warn",
      "import/no-empty-named-blocks": "error",
      "import/no-mutable-exports": "error",
      "import/no-named-as-default": "warn",
      "import/no-named-as-default-member": "warn",
      "import/no-relative-packages": "error",
      "import/no-self-import": "error",
      "import/no-useless-path-segments": ["warn", { noUselessIndex: true }],

      // React consistency and rendering safety.
      "react/button-has-type": "warn",
      "react/jsx-boolean-value": ["warn", "never"],
      "react/jsx-curly-brace-presence": ["warn", { children: "never", propElementValues: "always", props: "never" }],
      "react/jsx-fragments": ["warn", "syntax"],
      "react/jsx-no-constructed-context-values": "warn",
      "react/jsx-no-script-url": "error",
      "react/jsx-no-useless-fragment": "warn",
      "react/no-array-index-key": "warn",
      "react/no-danger": "warn",
      "react/no-invalid-html-attribute": "error",
      "react/no-object-type-as-default-prop": "error",
      "react/no-this-in-sfc": "error",
      "react/no-unstable-nested-components": ["warn", { allowAsProps: true }],
      "react/prefer-stateless-function": "warn",
      "react/self-closing-comp": ["warn", { component: true, html: true }],
      "react/void-dom-elements-no-children": "error",

      // Maintainability signals. These are warnings to support gradual cleanup.
      "sonarjs/cognitive-complexity": ["warn", 20],
      "sonarjs/no-all-duplicated-branches": "warn",
      "sonarjs/no-collapsible-if": "warn",
      "sonarjs/no-duplicate-string": ["warn", { threshold: 5 }],
      "sonarjs/no-duplicated-branches": "warn",
      "sonarjs/no-identical-functions": "warn",
      "sonarjs/no-inverted-boolean-check": "warn",
      "sonarjs/no-nested-switch": "warn",
      "sonarjs/no-redundant-boolean": "warn",
      "sonarjs/no-small-switch": "warn",
      "sonarjs/no-use-of-empty-return-value": "warn",
      "sonarjs/prefer-immediate-return": "warn",
      "sonarjs/prefer-single-boolean-return": "warn",

      // Useful in greenfield code, but too noisy or subjective for the current baseline.
      "unicorn/new-for-builtins": "off",
      "unicorn/no-array-for-each": "off",
      "unicorn/no-array-sort": "off",
      "unicorn/no-negated-condition": "off",
      "unicorn/no-useless-undefined": "off",
      "unicorn/numeric-separators-style": "off",
      "unicorn/prefer-global-this": "off",
      "unicorn/prefer-string-replace-all": "off",

      // React Compiler is not enabled yet; migrate these patterns separately.
      "react-hooks/incompatible-library": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["**/*.cjs"],
    rules: {
      "no-undef": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "ferm_extension/**", "public/vad-assets/**"]),
])
