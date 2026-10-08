import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import type { Collection } from '@nexanft/contracts';
import { collectionSchema } from '@nexanft/contracts';
import { AuthGate } from '../components/AuthGate';
import { ScreenContainer, Heading, Copy, Input, Button, Artwork } from '../components/ui';
import { pickImage, uploadImage } from '../services/upload';
import { request } from '../services/api';
import { errorMessage } from '../services/errors';
function Form() {
  const [name, setName] = useState(''),
    [description, setDescription] = useState(''),
    [asset, setAsset] = useState<{ id: string; url: string } | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0);
  const router = useRouter(),
    cache = useQueryClient();
  return (
    <ScreenContainer scroll>
      <Heading>Create a collection.</Heading>
      <Copy muted>Bring your works together under one story.</Copy>
      <Artwork uri={asset?.url} style={{ height: 220, borderRadius: 20 }} />
      <Button
        title="Upload cover image"
        loading={busy}
        onPress={() => {
          setError('');
          void pickImage()
            .then(async (picked) => {
              if (picked) {
                setBusy(true);
                try {
                  setAsset(await uploadImage(picked, 'collection', setProgress));
                } finally {
                  setBusy(false);
                }
              }
            })
            .catch((e) => setError(errorMessage(e)));
        }}
      />
      {busy && <Copy muted>{progress}% uploaded</Copy>}
      <Input label="Collection name" value={name} onChangeText={setName} />
      <Input label="Description" value={description} onChangeText={setDescription} multiline />
      {error && <Copy>{error}</Copy>}
      <Button
        title="Create collection"
        loading={busy}
        onPress={() => {
          const result = collectionSchema.safeParse({ name, description, assetId: asset?.id });
          if (!result.success) {
            setError(result.error.issues[0]?.message ?? 'Check the collection fields');
            return;
          }
          setBusy(true);
          void request<Collection>('/collections', { method: 'POST', data: result.data })
            .then(async (response) => {
              await cache.invalidateQueries({ queryKey: ['collections'] });
              router.replace(`/collection/${response.data.id}`);
            })
            .catch((e) => setError(errorMessage(e)))
            .finally(() => setBusy(false));
        }}
      />
    </ScreenContainer>
  );
}
export default function CreateCollection() {
  return (
    <AuthGate>
      <Form />
    </AuthGate>
  );
}
