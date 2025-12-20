export type LevelValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export const levelFromName = (name: string): LevelValue => {
  switch (name) {
    case 'fatal': return 1;
    case 'error': return 2;
    case 'warn':  return 3;
    case 'notice':return 4;
    case 'info':  return 5;
    case 'debug': return 6;
    case 'trace': return 7;
    case 'verbose': return 8;
    default: return 5;
  }
};
