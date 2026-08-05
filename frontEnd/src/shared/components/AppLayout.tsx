import { Outlet } from 'react-router-dom';
import { Layout } from 'antd';
import Sidebar from './Sidebar';
import { useAuth } from '../hooks/useAuth';

const { Content } = Layout;

export default function AppLayout() {
  const { isAuthenticated } = useAuth()
  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      {isAuthenticated && <Sidebar />}
      <Layout style={{ transition: 'margin-left 0.2s cubic-bezier(0.16, 1, 0.3, 1)', background: 'transparent' }}>
        <Content style={{ padding: 24, minHeight: '100vh' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
