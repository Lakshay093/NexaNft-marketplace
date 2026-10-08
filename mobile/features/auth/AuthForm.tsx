import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { z } from 'zod';
import { registerSchema, loginSchema } from '@nexanft/contracts';
import { ScreenContainer, Heading, Copy, Input, Button, styles } from '../../components/ui';
import { signIn, signUp } from '../../services/auth';
import { errorMessage } from '../../services/errors';
import { Text } from 'react-native';
const formSchema = z.object({
  fullName: z.string(),
  username: z.string(),
  email: loginSchema.shape.email,
  password: loginSchema.shape.password,
  confirmPassword: z.string(),
});
type Values = z.infer<typeof formSchema>;
export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const register = mode === 'register',
    router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<Values>({
    defaultValues: { fullName: '', username: '', email: '', password: '', confirmPassword: '' },
    resolver: zodResolver(register ? registerSchema : formSchema),
  });
  const submit = handleSubmit(async (input) => {
    setError(null);
    try {
      if (register) await signUp(registerSchema.parse(input));
      else await signIn({ email: input.email, password: input.password });
      router.replace('/(tabs)');
    } catch (err) {
      setError(errorMessage(err));
    }
  });
  const fields: Array<{ name: keyof Values; label: string; secret?: boolean }> = [
    ...(register
      ? [
          { name: 'fullName' as const, label: 'Full name' },
          { name: 'username' as const, label: 'Username' },
        ]
      : []),
    { name: 'email', label: 'Email' },
    { name: 'password', label: 'Password', secret: true },
    ...(register
      ? [{ name: 'confirmPassword' as const, label: 'Confirm password', secret: true }]
      : []),
  ];
  return (
    <ScreenContainer scroll>
      <Copy muted>NEXANFT / YOUR NEXT CHAPTER</Copy>
      <Heading>{register ? 'A space for your imagination.' : 'Welcome back.'}</Heading>
      <Copy muted>
        {register
          ? 'Create your account and join a world of independent creators.'
          : 'Your next discovery is waiting.'}
      </Copy>
      {fields.map((field) => (
        <Controller
          key={field.name}
          control={control}
          name={field.name}
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <Input
              label={field.label}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={error?.message}
              secureTextEntry={field.secret}
              autoCapitalize={field.name === 'fullName' ? 'words' : 'none'}
              autoComplete={
                field.name === 'email'
                  ? 'email'
                  : field.secret
                    ? register
                      ? 'new-password'
                      : 'current-password'
                    : 'off'
              }
              keyboardType={field.name === 'email' ? 'email-address' : 'default'}
            />
          )}
        />
      ))}
      {register && (
        <Copy muted>Use 12+ characters with uppercase, lowercase, a number, and a symbol.</Copy>
      )}
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      <Button
        title={register ? 'Create account' : 'Sign in'}
        onPress={() => void submit()}
        loading={isSubmitting}
      />
      {!register && (
        <Link href="/(auth)/forgot-password" style={styles.copy}>
          Forgot password?
        </Link>
      )}
      <Link href={register ? '/(auth)/login' : '/(auth)/register'} style={styles.copy}>
        {register ? 'Already a member? Sign in' : 'New here? Create an account'}
      </Link>
      <Button
        title="Explore the marketplace"
        variant="secondary"
        onPress={() => router.replace('/(tabs)')}
      />
    </ScreenContainer>
  );
}
