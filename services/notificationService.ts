// Browser notification service for game start alerts

const NOTIFICATION_PERMISSION_KEY = 'johnnyff_notification_permission_asked';

// Check if notifications are supported and enabled
export function areNotificationsSupported(): boolean {
  return 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!areNotificationsSupported()) return 'unsupported';
  return Notification.permission;
}

// Request notification permission (only once)
export async function requestNotificationPermission(): Promise<boolean> {
  if (!areNotificationsSupported()) {
    console.log('Notifications not supported in this browser');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.log('Notifications have been denied by user');
    return false;
  }

  // Only ask once per session
  const alreadyAsked = sessionStorage.getItem(NOTIFICATION_PERMISSION_KEY);
  if (alreadyAsked) {
    return Notification.permission === 'granted';
  }

  try {
    sessionStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true');
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return false;
  }
}

// Send a game start notification
export function notifyGameStart(
  playerNames: string[],
  championNames?: string[],
  gameMode?: string
): void {
  if (Notification.permission !== 'granted') return;

  const playerList = playerNames.join(', ');
  const championList = championNames?.join(', ');

  let body = `${playerList} ${playerNames.length > 1 ? 'sont' : 'est'} en game!`;
  if (championList) {
    body += `\nChampions: ${championList}`;
  }
  if (gameMode) {
    body += `\n${gameMode}`;
  }

  const notification = new Notification('🎮 Game Détectée!', {
    body,
    icon: '/favicon.ico',
    tag: 'game-start', // Prevents duplicate notifications
    requireInteraction: false
  });

  // Auto-close after 10 seconds
  setTimeout(() => notification.close(), 10000);

  // Focus window when clicked
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}

// Send a game end notification
export function notifyGameEnd(
  playerName: string,
  result?: 'VICTORY' | 'DEFEAT'
): void {
  if (Notification.permission !== 'granted') return;

  const emoji = result === 'VICTORY' ? '🏆' : result === 'DEFEAT' ? '💀' : '🏁';
  const resultText = result ? ` - ${result}` : '';

  const notification = new Notification(`${emoji} Game Terminée!`, {
    body: `${playerName}${resultText}`,
    icon: '/favicon.ico',
    tag: 'game-end',
    requireInteraction: false
  });

  setTimeout(() => notification.close(), 10000);

  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}
