import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileSchema, type CurrentUser } from '@nexanft/contracts';
import { AuthGate } from '../components/AuthGate';
import { ScreenContainer, Heading, Input, Avatar, Button, Copy } from '../components/ui';
import { useAuthStore } from '../store/auth';
import { sessions } from '../services/auth';
import { pickImage, uploadImage } from '../services/upload';
import { request } from '../services/api';
import { errorMessage } from '../services/errors';
type Values = { fullName?: string; username?: string; bio?: string; avatarAssetId?: string };
function Edit() {
  const user = useAuthStore((s) => s.user!),
    router = useRouter(),
    cache = useQueryClient(),
    [avatar, setAvatar] = useState(user.avatarUrl),
    [error, setError] = useState(''),
    [uploading, setUploading] = useState(false);
  const {
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: user.fullName, username: user.username, bio: user.bio },
  });
  const submit = handleSubmit(async (input) => {
    try {
      const updated = await request<CurrentUser>(`/users/${user.id}`, {
        method: 'PATCH',
        data: input,
      });
      sessions.updateUser(updated.data);
      await cache.invalidateQueries({ queryKey: ['profile', user.id] });
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    }
  });
  return (
    <ScreenContainer scroll>
      <Heading>Make yourself at home.</Heading>
      <Avatar uri={avatar} name={user.fullName} size={90} />
      <Button
        title="Change profile picture"
        variant="secondary"
        loading={uploading}
        onPress={() => {
          setError('');
          void pickImage()
            .then(async (picked) => {
              if (picked) {
                setUploading(true);
                try {
                  const result = await uploadImage(picked, 'avatar');
                  setAvatar(result.url);
                  setValue('avatarAssetId', result.id);
                } finally {
                  setUploading(false);
                }
              }
            })
            .catch((e) => setError(errorMessage(e)));
        }}
      />
      {(['fullName', 'username', 'bio'] as const).map((name) => (
        <Controller
          key={name}
          name={name}
          control={control}
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <Input
              label={name === 'fullName' ? 'Full name' : name === 'username' ? 'Username' : 'Bio'}
              value={value}
              onChangeText={onChange}
              error={error?.message}
              multiline={name === 'bio'}
              autoCapitalize={name === 'username' ? 'none' : 'sentences'}
            />
          )}
        />
      ))}
      {error && <Copy>{error}</Copy>}
      <Button
        title="Save profile"
        loading={isSubmitting}
        disabled={uploading}
        onPress={() => void submit()}
      />
    </ScreenContainer>
  );
}
export default function EditProfile() {
  return (
    <AuthGate>
      <Edit />
    </AuthGate>
  );
}
