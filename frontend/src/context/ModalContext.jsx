// src/context/ModalContext.jsx
import React, { createContext, useState, useContext } from 'react';

const ModalContext = createContext();

export const useModal = () => useContext(ModalContext);

export const ModalProvider = ({ children }) => {
    const [modal, setModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info', // 'info' (alert) hoặc 'confirm' (hỏi xác nhận) hoặc 'danger' (xóa)
        onConfirm: null, // Hàm sẽ chạy khi bấm OK
    });

    // Hàm thay thế alert()
    const showAlert = (title, message) => {
        setModal({
            isOpen: true,
            title,
            message,
            type: 'info',
            onConfirm: null
        });
    };

    // Hàm thay thế window.confirm()
    const showConfirm = (title, message, onConfirmCallback) => {
        setModal({
            isOpen: true,
            title,
            message,
            type: 'danger', // Mặc định là danger cho các hành động xóa
            onConfirm: onConfirmCallback
        });
    };

    const closeModal = () => {
        setModal({ ...modal, isOpen: false });
    };

    return (
        <ModalContext.Provider value={{ modal, showAlert, showConfirm, closeModal }}>
            {children}
        </ModalContext.Provider>
    );
};