import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import { nftSchema, categories, type NFTInput, type NFT } from '@nexanft/contracts';
import {
  ScreenContainer,
  Heading,
  Copy,
  Input,
  Button,
  Artwork,
  styles,
} from '../../components/ui';
import { colors } from '../../constants/theme';
import { useOwnedCollections } from '../../hooks/marketplace';
import { useAuthStore } from '../../store/auth';
import { pickImage, uploadImage } from '../../services/upload';
import { request } from '../../services/api';
import { errorMessage } from '../../services/errors';
export function ListingForm({ nft }: { nft?: NFT }) {
  const user = useAuthStore((s) => s.user!),
    router = useRouter(),
    cache = useQueryClient(),
    collections = useOwnedCollections(user.id);
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null),
    [error, setError] = useState(''),
    [uploading, setUploading] = useState(false),
    [progress, setProgress] = useState(0);
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<NFTInput>({
    resolver: zodResolver(nftSchema),
    defaultValues: {
      name: nft?.name ?? '',
      description: nft?.description ?? '',
      price: nft?.price ?? '',
      category: nft?.category ?? 'Art',
      collectionId: nft?.collectionId ?? null,
      assetId: nft ? '00000000-0000-4000-a000-000000000000' : '',
    },
  });
  const submit = handleSubmit(async (values) => {
    setError('');
    try {
      const { assetId, ...metadata } = values;
      const result = await request<NFT>(nft ? `/nfts/${nft.id}` : '/nfts', {
        method: nft ? 'PATCH' : 'POST',
        data: nft ? metadata : { ...metadata, assetId },
      });
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['nfts'] }),
        cache.invalidateQueries({ queryKey: ['nft', nft?.id] }),
        cache.invalidateQueries({ queryKey: ['profile'] }),
        cache.invalidateQueries({ queryKey: ['collections'] }),
        cache.invalidateQueries({ queryKey: ['creators'] }),
      ]);
      if (!nft) {
        reset();
        setImage(null);
      }
      router.replace(`/nft/${result.data.id}`);
    } catch (e) {
      setError(errorMessage(e));
    }
  });
  return (
    <ScreenContainer scroll>
      <Heading>{nft ? 'Edit your listing.' : 'A little imagination, listed.'}</Heading>
      <Copy muted>
        {nft
          ? 'Update the details of your platform listing.'
          : 'Share your work with a new world of collectors. No blockchain minting is performed.'}
      </Copy>
      <Artwork
        uri={nft?.imageUrl ?? image?.uri}
        style={{ width: '100%', aspectRatio: 1.2, borderRadius: 22 }}
      />
      {!nft && (
        <>
          <Button
            title={
              uploading
                ? `Uploading ${progress}%`
                : image
                  ? 'Choose another image'
                  : 'Select artwork'
            }
            loading={uploading}
            onPress={() => {
              setError('');
              void pickImage()
                .then(async (picked) => {
                  if (!picked) return;
                  setImage(picked);
                  setValue('assetId', '');
                  setUploading(true);
                  setProgress(0);
                  try {
                    const uploaded = await uploadImage(picked, 'nft', setProgress);
                    setValue('assetId', uploaded.id, { shouldValidate: true });
                  } finally {
                    setUploading(false);
                  }
                })
                .catch((e) => setError(errorMessage(e)));
            }}
          />
          {uploading && <Copy muted>Uploading {progress}%…</Copy>}
          <Copy muted>JPEG, PNG, or WebP · Maximum 8 MB</Copy>
          {errors.assetId && <Text style={styles.error}>Upload an image before publishing.</Text>}
        </>
      )}
      {(['name', 'description', 'price'] as const).map((name) => (
        <Controller
          key={name}
          name={name}
          control={control}
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <Input
              label={
                name === 'price'
                  ? 'Price (ETH denomination)'
                  : name === 'name'
                    ? 'Artwork name'
                    : 'Description'
              }
              value={value}
              onChangeText={onChange}
              error={error?.message}
              multiline={name === 'description'}
              keyboardType={name === 'price' ? 'decimal-pad' : 'default'}
            />
          )}
        />
      ))}
      <Copy muted>Category</Copy>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {categories.map((category) => (
          <Pressable
            key={category}
            onPress={() => setValue('category', category)}
            style={{
              padding: 12,
              borderRadius: 20,
              backgroundColor: watch('category') === category ? colors.accent : colors.raised,
            }}
          >
            <Text style={{ color: watch('category') === category ? colors.bg : colors.text }}>
              {category}
            </Text>
          </Pressable>
        ))}
      </View>
      <Copy muted>Collection (optional)</Copy>
      <Button
        title={watch('collectionId') ? 'Remove collection' : 'No collection selected'}
        variant="secondary"
        onPress={() => setValue('collectionId', null)}
      />
      {collections.data?.pages
        .flatMap((page) => page.data)
        .map((c) => (
          <Button
            key={c.id}
            title={`${watch('collectionId') === c.id ? '✓ ' : ''}${c.name}`}
            variant="secondary"
            onPress={() => setValue('collectionId', c.id)}
          />
        ))}
      {collections.hasNextPage && (
        <Button
          title="More collections"
          variant="secondary"
          loading={collections.isFetchingNextPage}
          onPress={() => void collections.fetchNextPage()}
        />
      )}
      {collections.isError && <Copy>{errorMessage(collections.error)}</Copy>}
      <Button
        title="Create a collection"
        variant="secondary"
        onPress={() => router.push('/create-collection')}
      />
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      <Button
        title={nft ? 'Save changes' : 'Publish listing'}
        onPress={() => void submit()}
        loading={isSubmitting}
        disabled={uploading}
      />
    </ScreenContainer>
  );
}
