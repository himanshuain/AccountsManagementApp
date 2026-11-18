"use client";

import { useReducer, useMemo, useCallback } from "react";

export const initialProfilePageUi = {
  showMenu: false,
  showProfile: false,
  editFormOpen: false,
  transactionFormOpen: false,
  udharFormOpen: false,
  deleteDialogOpen: false,
  deleteTransactionDialog: false,
  transactionToDelete: null,
  editingTransaction: null,
  draftInitialData: null,
  quickCaptureData: null,
  selectedTransaction: null,
  focusPaymentId: null,
  imageViewerOpen: false,
  viewerImages: [],
  viewerIndex: 0,
  paymentFormOpen: false,
  paymentTransaction: null,
  billsGalleryOpen: false,
  profileImageViewerOpen: false,
  editingPayment: null,
  editingPaymentTxn: null,
};

/**
 * @param {typeof initialProfilePageUi} state
 * @param {{ type: string, payload?: unknown }} action
 */
export function profilePageUiReducer(state, action) {
  switch (action.type) {
    case "RESET_OVERLAYS":
      return { ...initialProfilePageUi };

    case "SET_SHOW_MENU":
      return { ...state, showMenu: Boolean(action.payload) };

    case "SET_SHOW_PROFILE":
      return { ...state, showProfile: Boolean(action.payload) };

    case "SET_EDIT_FORM_OPEN":
      return { ...state, editFormOpen: Boolean(action.payload) };

    case "OPEN_TRANSACTION_FORM": {
      const { editing, draft, quickCapture } = action.payload || {};
      return {
        ...state,
        transactionFormOpen: true,
        editingTransaction: editing ?? null,
        draftInitialData: draft ?? null,
        quickCaptureData: quickCapture ?? null,
      };
    }

    case "SET_TRANSACTION_FORM_OPEN": {
      const open = Boolean(action.payload?.open);
      if (open) {
        return {
          ...state,
          transactionFormOpen: true,
          ...(action.payload?.editing !== undefined
            ? { editingTransaction: action.payload.editing }
            : {}),
        };
      }
      return {
        ...state,
        transactionFormOpen: false,
        editingTransaction: null,
        draftInitialData: null,
        quickCaptureData: null,
      };
    }

    case "OPEN_UDHAR_FORM": {
      const { editing, draft, quickCapture } = action.payload || {};
      return {
        ...state,
        udharFormOpen: true,
        editingTransaction: editing ?? null,
        draftInitialData: draft ?? null,
        quickCaptureData: quickCapture ?? null,
      };
    }

    case "SET_UDHAR_FORM_OPEN": {
      const open = Boolean(action.payload?.open);
      if (open) {
        return {
          ...state,
          udharFormOpen: true,
          ...(action.payload?.editing !== undefined
            ? { editingTransaction: action.payload.editing }
            : {}),
        };
      }
      return {
        ...state,
        udharFormOpen: false,
        editingTransaction: null,
        draftInitialData: null,
        quickCaptureData: null,
      };
    }

    case "SET_DELETE_DIALOG_OPEN":
      return { ...state, deleteDialogOpen: Boolean(action.payload) };

    case "SET_DELETE_TRANSACTION_DIALOG":
      return { ...state, deleteTransactionDialog: Boolean(action.payload) };

    case "SET_TRANSACTION_TO_DELETE":
      return { ...state, transactionToDelete: action.payload ?? null };

    case "OPEN_TXN_DETAIL":
      return { ...state, selectedTransaction: action.payload ?? null };

    case "CLOSE_TXN_DETAIL":
      return { ...state, selectedTransaction: null, focusPaymentId: null };

    case "UPDATE_SELECTED_TRANSACTION":
      return { ...state, selectedTransaction: action.payload ?? null };

    case "SET_FOCUS_PAYMENT_ID":
      return { ...state, focusPaymentId: action.payload ?? null };

    case "OPEN_PAYMENT":
      return {
        ...state,
        paymentFormOpen: true,
        paymentTransaction: action.payload ?? null,
      };

    case "CLOSE_PAYMENT":
      return {
        ...state,
        paymentFormOpen: false,
        paymentTransaction: null,
      };

    case "OPEN_EDIT_PAYMENT":
      return {
        ...state,
        editingPayment: action.payload?.payment ?? null,
        editingPaymentTxn: action.payload?.txn ?? null,
      };

    case "CLOSE_EDIT_PAYMENT":
      return {
        ...state,
        editingPayment: null,
        editingPaymentTxn: null,
      };

    case "OPEN_IMAGE_VIEWER": {
      const { images, startIndex = 0 } = action.payload || {};
      return {
        ...state,
        imageViewerOpen: true,
        viewerImages: images ?? [],
        viewerIndex: startIndex,
      };
    }

    case "SET_IMAGE_VIEWER_OPEN":
      return {
        ...state,
        imageViewerOpen: Boolean(action.payload),
        ...(action.payload ? {} : { viewerImages: [], viewerIndex: 0 }),
      };

    case "SET_BILLS_GALLERY_OPEN":
      return { ...state, billsGalleryOpen: Boolean(action.payload) };

    case "SET_PROFILE_IMAGE_VIEWER_OPEN":
      return { ...state, profileImageViewerOpen: Boolean(action.payload) };

    case "SET_EDITING_TRANSACTION":
      return { ...state, editingTransaction: action.payload ?? null };

    default:
      return state;
  }
}

/** @param {typeof initialProfilePageUi} ui */
export function selectOverlayGateState(ui) {
  return {
    showProfile: ui.showProfile,
    showMenu: ui.showMenu,
    selectedTransaction: ui.selectedTransaction,
    paymentFormOpen: ui.paymentFormOpen,
    billsGalleryOpen: ui.billsGalleryOpen,
    profileImageViewerOpen: ui.profileImageViewerOpen,
    transactionFormOpen: ui.transactionFormOpen,
    udharFormOpen: ui.udharFormOpen,
    editFormOpen: ui.editFormOpen,
    imageViewerOpen: ui.imageViewerOpen,
    deleteDialogOpen: ui.deleteDialogOpen,
    deleteTransactionDialog: ui.deleteTransactionDialog,
    editingPayment: ui.editingPayment,
    editingPaymentTxn: ui.editingPaymentTxn,
  };
}

export function useProfilePageUi() {
  const [ui, dispatch] = useReducer(profilePageUiReducer, initialProfilePageUi);

  const overlayGateState = useMemo(() => selectOverlayGateState(ui), [ui]);

  const resetOverlays = useCallback(() => {
    dispatch({ type: "RESET_OVERLAYS" });
  }, []);

  return { ui, dispatch, overlayGateState, resetOverlays };
}

export default useProfilePageUi;