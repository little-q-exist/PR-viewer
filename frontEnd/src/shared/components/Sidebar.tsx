import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Menu, Tooltip } from 'antd';
import {
  HomeOutlined,
  UnorderedListOutlined,
  GithubOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { useDispatch, useSelector } from 'react-redux';
import { clearAuth } from '@/store/modules/authSlice';
import { resetUI, setSidebarExpanded } from '@/store/modules/uiSlice';
import { useQueryClient } from '@tanstack/react-query';
import type { RootState } from '@/store';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const expanded = useSelector((state: RootState) => state.ui.sidebarExpanded);
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    dispatch(clearAuth());
    dispatch(resetUI());
    queryClient.clear();
    navigate('/', { replace: true });
  };

  if (!isAuthenticated) return null;

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: '主页' },
    { key: '/pr-list', icon: <UnorderedListOutlined />, label: 'PR 列表' },
  ];

  const selectedKey = menuItems.find((item) =>
    item.key === '/' ? location.pathname === '/' : location.pathname.startsWith(item.key)
  )?.key || '/';

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 1000,
        width: expanded ? 200 : 64,
        willChange: 'width',
        transform: 'translateZ(0)',
        transition: 'width 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        background: 'rgba(20, 20, 30, 0.9)',
        backdropFilter: 'blur(12px)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      onMouseEnter={() => dispatch(setSidebarExpanded(true))}
      onMouseLeave={() => dispatch(setSidebarExpanded(false))}
    >
      <div style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        color: '#fff',
      }}>
        <GithubOutlined style={{ fontSize: 24 }} />
        {expanded && <span style={{ marginLeft: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>PR Viewer</span>}
      </div>
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        inlineCollapsed={!expanded}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
        style={{
          background: 'transparent',
          borderInlineEnd: 'none',
          marginTop: 8,
        }}
        theme="dark"
      />
      <div
        style={{
          marginTop: 'auto',
          padding: '8px 8px 16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Tooltip title="登出" placement="right" mouseEnterDelay={0.2}>
          <Button
            type="text"
            danger
            block
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            aria-label="登出"
            style={{
              height: 40,
              justifyContent: expanded ? 'flex-start' : 'center',
              padding: expanded ? '0 16px' : 0,
              gap: 10,
            }}
          >
            {expanded && '登出'}
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
