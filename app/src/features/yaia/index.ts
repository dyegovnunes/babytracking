/**
 * Public API da feature yaIA.
 *
 * Consumidores externos devem importar só daqui — nunca de arquivos internos.
 * O lazy() em App.tsx aponta direto pra YaIAPage.tsx porque React.lazy
 * precisa de default export (igual às outras features).
 */

export { useYaIA } from './useYaIA'
export type { YaIAMessage } from './useYaIA'
