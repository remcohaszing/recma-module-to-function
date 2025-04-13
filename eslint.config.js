import config from '@remcohaszing/eslint'

export default [
  ...config,
  {
    files: ['*.md/*'],
    rules: {
      'capitalized-comments': 'off',
      'require-await': 'off'
    }
  }
]
