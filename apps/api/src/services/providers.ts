import type { Provider, ProviderType } from '@healthy-companion/types';
import { AppError } from '../errors.js';
import type { ProviderDirectory } from '../integrations/provider-directory.js';

/** Provider discovery (docs/07 §7.4). Directory data is not PHI. */
export class ProviderService {
  constructor(private readonly directory: ProviderDirectory) {}

  async search(params: { query?: string; type?: ProviderType; insurance?: string; limit: number }): Promise<Provider[]> {
    return this.directory.search(params);
  }

  async get(id: string): Promise<Provider> {
    const p = await this.directory.get(id);
    if (!p) throw AppError.notFound('Provider not found');
    return p;
  }
}
