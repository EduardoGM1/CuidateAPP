import { Table as AntTable, Spin, Empty } from 'antd';

/**
 * Tabla reutilizable basada en Ant Design.
 * columns: [{ key, label, render? }]
 */
export default function Table({
  columns,
  data,
  emptyMessage = 'No hay datos',
  loading = false,
  onRowClick,
  rowClassName,
  rowStyle,
}) {
  const antColumns = (columns || []).map((col) => ({
    title: col.label,
    dataIndex: col.key,
    key: col.key,
    render: col.render
      ? (value, record) => col.render(record)
      : (value) => (value != null ? value : '—'),
  }));

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <Empty description={emptyMessage} />;
  }

  return (
    <AntTable
      columns={antColumns}
      dataSource={data}
      rowKey={(row) => row.id ?? row.id_paciente ?? row.id_cita ?? row.key}
      rowClassName={typeof rowClassName === 'function' ? rowClassName : undefined}
      rowStyle={typeof rowStyle === 'function' ? rowStyle : undefined}
      onRow={
        onRowClick
          ? (record) => ({
              onClick: () => onRowClick(record),
              onKeyDown: (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onRowClick(record);
                }
              },
            })
          : undefined
      }
      pagination={false}
    />
  );
}
