import { Outlet } from 'react-router-dom';
import { Layout } from 'antd';
import Sidebar from './Sidebar';

const { Content } = Layout;

export default function AppLayout() {
  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Sidebar />
      <Layout style={{ marginLeft: 64, transition: 'margin-left 0.2s cubic-bezier(0.16, 1, 0.3, 1)', background: 'transparent' }}>
        <Content style={{ padding: 24, minHeight: '100vh' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
