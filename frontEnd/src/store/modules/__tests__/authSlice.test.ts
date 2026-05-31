import { describe, it, expect, beforeEach } from 'vitest';
import authReducer, { setAuth, clearAuth, setUser } from '../authSlice';

describe('authSlice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('初始状态 token 从 localStorage 读取', () => {
    localStorage.setItem('token', 'existing-token');
    const state = authReducer(undefined, { type: '@@INIT' });
    expect(state.token).toBe('existing-token');
    expect(state.isAuthenticated).toBe(true);
  });

  it('setAuth 更新 user/token/isAuthenticated 并写入 localStorage', () => {
    const state = authReducer(
      { user: null, token: null, isAuthenticated: false },
      setAuth({ user: { id: '1', login: 'test', avatarUrl: 'https://a.com/1.png' }, token: 'jwt-abc' })
    );
    expect(state.user?.login).toBe('test');
    expect(state.token).toBe('jwt-abc');
    expect(state.isAuthenticated).toBe(true);
    expect(localStorage.getItem('token')).toBe('jwt-abc');
  });

  it('clearAuth 清除所有状态和 localStorage', () => {
    localStorage.setItem('token', 'existing');
    const state = authReducer(
      { user: { id: '1', login: 'test', avatarUrl: 'https://a.com/1.png' }, token: 'existing', isAuthenticated: true },
      clearAuth()
    );
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('setUser 仅更新用户信息但保持认证状态', () => {
    const state = authReducer(
      { user: null, token: null, isAuthenticated: false },
      setUser({ id: '2', login: 'newuser', avatarUrl: 'https://a.com/2.png' })
    );
    expect(state.user?.login).toBe('newuser');
    expect(state.isAuthenticated).toBe(true);
  });
});
