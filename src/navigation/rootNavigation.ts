import {createNavigationContainerRef} from '@react-navigation/native';

import {RootStackParamList} from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

let pendingNavigation:
  | {
      screen: keyof RootStackParamList;
      params?: RootStackParamList[keyof RootStackParamList];
    }
  | undefined;

const performNavigate = <RouteName extends keyof RootStackParamList>(
  screen: RouteName,
  params?: RootStackParamList[RouteName],
) => {
  (navigationRef as unknown as {navigate: (name: RouteName, value?: unknown) => void}).navigate(
    screen,
    params,
  );
};

export const onNavigationReady = (): void => {
  if (!pendingNavigation || !navigationRef.isReady()) {
    return;
  }

  const {screen, params} = pendingNavigation;
  pendingNavigation = undefined;
  performNavigate(screen, params);
};

export const navigate = <RouteName extends keyof RootStackParamList>(
  screen: RouteName,
  params?: RootStackParamList[RouteName],
): void => {
  if (navigationRef.isReady()) {
    performNavigate(screen, params);
    return;
  }

  pendingNavigation = {screen, params};
};
