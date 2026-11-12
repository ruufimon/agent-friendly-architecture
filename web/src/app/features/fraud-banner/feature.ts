import { Feature } from '../../dune/feature';
import { FraudBanner } from './fraud-banner';

export const feature: Feature = {
  id: 'fraud-banner',
  entrypoints: [{ screen: 'transfer', slot: 'banner', component: FraudBanner }],
};
