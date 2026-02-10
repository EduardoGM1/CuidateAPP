import { Modal as AntModal } from 'antd';

/**
 * Modal reutilizable basado en Ant Design.
 *
 * Props habituales:
 * - open: boolean
 * - onClose: () => void
 * - title: string | ReactNode
 * - onOk: () => void | Promise<void>
 * - okText, cancelText: string
 * - confirmLoading: boolean
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  okText = 'Guardar',
  cancelText = 'Cancelar',
  onOk,
  confirmLoading = false,
  width,
  ...rest
}) {
  return (
    <AntModal
      open={open}
      onCancel={onClose}
      onOk={onOk}
      title={title}
      okText={okText}
      cancelText={cancelText}
      confirmLoading={confirmLoading}
      destroyOnClose
      maskClosable={false}
      width={width}
      {...rest}
    >
      {children}
    </AntModal>
  );
}

