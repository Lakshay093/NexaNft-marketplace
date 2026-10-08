import { ScreenContainer, Heading, Copy } from '../../components/ui';
import { AuthGate } from '../../components/AuthGate';
import { NFTGrid } from '../../features/marketplace/NFTGrid';
import { useAuthStore } from '../../store/auth';
function Saved() {
  const id = useAuthStore((s) => s.user!.id);
  return (
    <ScreenContainer>
      <NFTGrid
        path={`/users/${id}/favorites`}
        header={
          <>
            <Heading>Your favorites</Heading>
            <Copy muted>A little collection of things you love.</Copy>
          </>
        }
      />
    </ScreenContainer>
  );
}
export default function Favorites() {
  return (
    <AuthGate>
      <Saved />
    </AuthGate>
  );
}
