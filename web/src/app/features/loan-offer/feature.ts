import { Feature } from '../../dune/feature';
import { LoanOffer } from './loan-offer';

export const feature: Feature = {
  id: 'loan-offer',
  entrypoints: [{ screen: 'home', slot: 'body', component: LoanOffer }],
};
