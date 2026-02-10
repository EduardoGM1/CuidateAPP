import { Tabs as AntTabs } from 'antd';

/**
 * Tabs horizontales basados en Ant Design.
 * @param {{ tabs: Array<{ id: string, label: string }>, activeId: string, onChange: (id: string) => void, children: React.ReactNode }}
 */
export default function Tabs({ tabs, activeId, onChange, children }) {
  const items = (tabs || []).map((tab) => ({
    key: tab.id,
    label: tab.label,
  }));

  return (
    <div>
      <AntTabs
        items={items}
        activeKey={activeId}
        onChange={onChange}
      />
      <div role="tabpanel">{children}</div>
    </div>
  );
}
