import { AuthGate } from '../components/AuthGate';
import { ActivityFeed } from '../features/activity/ActivityFeed';
export default function Notifications() {
  return (
    <AuthGate>
      <ActivityFeed notifications />
    </AuthGate>
  );
}
