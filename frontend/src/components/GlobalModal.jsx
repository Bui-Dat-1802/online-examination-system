// src/components/GlobalModal.jsx
import React from 'react';
import { useModal } from '../context/ModalContext';
import styles from './GlobalModal.module.scss'; // Sẽ tạo file này ở bước sau

const GlobalModal = () => {
    const { modal, closeModal } = useModal();

    if (!modal.isOpen) return null;

    const handleConfirm = () => {
        if (modal.onConfirm) modal.onConfirm();
        closeModal();
    };

    return (
        <div className={styles.overlay}>
            <div className={`${styles.modal} ${styles[modal.type]}`}>
                <div className={styles.header}>
                    <h3>{modal.title}</h3>
                    <button className={styles.closeBtn} onClick={closeModal}>&times;</button>
                </div>

                <div className={styles.body}>
                    <p>{modal.message}</p>
                </div>

                <div className={styles.footer}>
                    {/* Nếu là confirm/danger thì hiện nút Hủy */}
                    {(modal.type === 'confirm' || modal.type === 'danger') && (
                        <button className={styles.btnCancel} onClick={closeModal}>
                            Hủy bỏ
                        </button>
                    )}

                    <button
                        className={modal.type === 'danger' ? styles.btnDanger : styles.btnPrimary}
                        onClick={handleConfirm}
                    >
                        Đồng ý
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GlobalModal;