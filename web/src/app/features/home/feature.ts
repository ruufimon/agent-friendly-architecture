import { Feature } from '../../dune/feature';
import { HomeScreen } from './home-screen';

export const feature: Feature = {
  id: 'home',
  entrypoints: [{ screen: 'home', slot: 'screen', component: HomeScreen, label: 'Home' }],
};
