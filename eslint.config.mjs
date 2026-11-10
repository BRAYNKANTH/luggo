import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'public/**', 'next-env.d.ts', 'tests/**', 'scripts/**'] },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // Rules added by the newer react-hooks plugin; existing code predates them, so warn until cleaned up.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/use-memo': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
]

export default config
