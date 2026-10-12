// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'supabase/functions/*'],
  },
  {
    // Apostrophes/quotes in JSX text are fine in React Native (Italian copy uses them a lot).
    rules: { 'react/no-unescaped-entities': 'off' },
  },
]);
