import js from '@eslint/js'
import ts from 'typescript-eslint'
import hooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

/*
 * Type-aware linting is deliberately off. It re-builds the whole TypeScript
 * program, which costs three to four times as much as the rules below, and the
 * `types` job already runs `tsc --noEmit` over all three projects — paying for
 * the same analysis twice is what made the old pipeline slow.
 *
 * `react-hooks` matters more than the rest here: `rulesOfHooks.test.ts` used to
 * chase the same rule by matching indentation in source text, because the repo
 * had no linter. This rule reads the AST instead.
 */
export default ts.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      'frontend/public/**',
      // Hand-made design prototypes, not part of any build.
      'frontend/design/**',
      'backend/supabase/**',
    ],
  },
  js.configs.recommended,
  {
    /*
     * Several files carry `eslint-disable` comments for `no-explicit-any`,
     * written before this config existed. The rule stays off below — `any` is
     * load-bearing at the Supabase and Vercel boundaries, where the payload
     * shape is not ours to declare — which would make every one of those
     * comments report as unused. They belong to other lanes' files, so leave
     * them be rather than touch code this lane does not own.
     */
    linterOptions: { reportUnusedDisableDirectives: 'off' },
  },
  ...ts.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mjs}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { 'react-hooks': hooks },
    rules: {
      ...hooks.configs.recommended.rules,
      // An underscore is how this repo already spells "bound but unused".
      // `any` is load-bearing at the Supabase and Vercel boundaries, where the
      // payload shape is not ours to declare.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
)
