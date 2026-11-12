import { Feature } from '../../dune/feature';
import { TransferScreen } from './transfer-screen';

export const feature: Feature = {
  id: 'transfer',
  entrypoints: [{ screen: 'transfer', slot: 'screen', component: TransferScreen, label: 'Transfer' }],
};
