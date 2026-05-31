import { describe, it, expect } from 'vitest';
import uiReducer, { setSidebarExpanded, setCurrentReviewId } from '../uiSlice';

describe('uiSlice', () => {
  it('初始状态 sidebarExpanded 为 false', () => {
    const state = uiReducer(undefined, { type: '@@INIT' });
    expect(state.sidebarExpanded).toBe(false);
    expect(state.currentReviewId).toBeNull();
  });

  it('setSidebarExpanded 切换侧边栏展开状态', () => {
    const state = uiReducer({ sidebarExpanded: false, currentReviewId: null }, setSidebarExpanded(true));
    expect(state.sidebarExpanded).toBe(true);
  });

  it('setCurrentReviewId 更新当前评审 ID', () => {
    const state = uiReducer({ sidebarExpanded: false, currentReviewId: null }, setCurrentReviewId('abc123'));
    expect(state.currentReviewId).toBe('abc123');
  });

  it('setCurrentReviewId 支持设为 null', () => {
    const state = uiReducer({ sidebarExpanded: false, currentReviewId: 'abc123' }, setCurrentReviewId(null));
    expect(state.currentReviewId).toBeNull();
  });
});
