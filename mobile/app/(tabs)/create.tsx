import { AuthGate } from '../../components/AuthGate';
import { ListingForm } from '../../features/listings/ListingForm';
export default function Create() {
  return (
    <AuthGate>
      <ListingForm />
    </AuthGate>
  );
}
