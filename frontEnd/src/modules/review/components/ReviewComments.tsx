import { List, Popover, Tag, Typography } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import type { CommentInfo } from '@/types';
import { marked } from 'marked';

const { Text } = Typography;

interface ReviewCommentsProps {
  comments: CommentInfo[];
}

function sortComments(comments: CommentInfo[]): CommentInfo[] {
  return [...comments].sort((a, b) => {
    const aLine = typeof a.line === 'number' ? a.line : Number.MAX_SAFE_INTEGER;
    const bLine = typeof b.line === 'number' ? b.line : Number.MAX_SAFE_INTEGER;
    return aLine - bLine;
  });
}

export default function ReviewComments({ comments }: ReviewCommentsProps) {
  const sorted = sortComments(comments);

  if (sorted.length === 0) {
    return null;
  }

  return (
    <div style={{
      marginTop: 16,
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 8,
      border: '1px solid rgba(255,255,255,0.06)',
      padding: 12,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#aaa', marginBottom: 10 }}>
        GitHub 评论 ({sorted.length})
      </div>
      <List
        size="small"
        dataSource={sorted}
        split={false}
        renderItem={(comment) => (
          <List.Item style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '4px 0' }}>
            <Popover
              content={
                <div style={{ maxWidth: 420 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Text strong style={{ color: '#4fc3f7' }}>@{comment.author.login}</Text>
                    {typeof comment.line === 'number' && (
                      <Tag style={{ marginInlineEnd: 0 }}>第 {comment.line} 行</Tag>
                    )}
                  </div>
                  <div
                    style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 1.6 }}
                    dangerouslySetInnerHTML={{ __html: marked.parse(comment.body) as string }}
                  />
                </div>
              }
              trigger="click"
              placement="left"
              overlayStyle={{ maxWidth: 460 }}
              overlayInnerStyle={{
                background: 'rgba(30,30,40,0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10,
                padding: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', width: '100%' }}>
                <MessageOutlined style={{ color: '#4fc3f7', fontSize: 14, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#e0e0e0', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    @{comment.author.login}
                  </div>
                  <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>
                    {typeof comment.line === 'number' ? `第 ${comment.line} 行` : '行级位置未知'}
                  </div>
                </div>
              </div>
            </Popover>
          </List.Item>
        )}
      />
    </div>
  );
}
