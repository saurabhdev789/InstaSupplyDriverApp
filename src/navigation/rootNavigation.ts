import {createNavigationContainerRef} from '@react-navigation/native';

import {RootStackParamList} from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export const navigate = <RouteName extends keyof RootStackParamList>(
  screen: RouteName,
  params?: RootStackParamList[RouteName],
): void => {
  if (navigationRef.isReady()) {
    (navigationRef as unknown as {navigate: (name: RouteName, value?: unknown) => void}).navigate(
      screen,
      params,
    );
  }
};
