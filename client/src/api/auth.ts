import { useMutation } from 'react-query';
import { apiClient } from './client';
import type { AuthResponse } from '../types';

interface Credentials {
  email: string;
  password: string;
}

async function register(creds: Credentials): Promise<AuthResponse> {
  return apiClient.post('auth/register', { json: creds }).json<AuthResponse>();
}

async function login(creds: Credentials): Promise<AuthResponse> {
  return apiClient.post('auth/login', { json: creds }).json<AuthResponse>();
}

export function useRegister() {
  return useMutation(register);
}

export function useLogin() {
  return useMutation(login);
}
