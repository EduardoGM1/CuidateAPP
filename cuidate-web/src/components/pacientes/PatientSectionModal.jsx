import Modal from '../ui/Modal';
import { getSectionLabel, getSectionModalWidth } from '../../constants/patientDetailSections';

/**
 * Modal reutilizable para mostrar el contenido de una sección del detalle de paciente.
 * Usa Ant Design vía nuestro wrapper. Título y ancho derivados de sectionId (patientDetailSections).
 *
 * @param {Object} props
 * @param {boolean} props.open - Si el modal está abierto
 * @param {string | null} props.sectionId - Id de sección (datos, citas, signos, etc.)
 * @param {() => void} props.onClose - Callback al cerrar
 * @param {React.ReactNode} props.children - Contenido a renderizar dentro del body
 * @param {number} [props.width] - Ancho override; si no se pasa, se usa getSectionModalWidth(sectionId)
 * @param {string} [props.title] - Título override; si no se pasa, se usa getSectionLabel(sectionId)
 */
export default function PatientSectionModal({
  open,
  sectionId,
  onClose,
  children,
  width: widthOverride,
  title: titleOverride,
}) {
  const title = titleOverride ?? (sectionId ? getSectionLabel(sectionId) : '');
  const width = widthOverride ?? (sectionId ? getSectionModalWidth(sectionId) : undefined);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={null}
      width={width}
      maskClosable
      destroyOnClose
    >
      <div className="patient-section-modal-body">
        {children}
      </div>
    </Modal>
  );
}
