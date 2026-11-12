/** Every refusal says what went wrong and names the supported path (rule 2). */
export class DuneError extends Error {
  constructor(problem: string, supportedPath: string) {
    super(`✗ ${problem}\n  → ${supportedPath}`);
    this.name = 'DuneError';
  }
}
