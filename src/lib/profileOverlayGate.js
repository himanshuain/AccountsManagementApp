/**
 * True when any full-screen overlay should block background scroll and profile scroll-chrome hiding.
 * @param {object} ui
 * @returns {boolean}
 */
export function profileOverlayBlocksBackground(ui) {
  if (!ui) return false;

  const {
    showProfile,
    showMenu,
    selectedTransaction,
    paymentFormOpen,
    billsGalleryOpen,
    profileImageViewerOpen,
    transactionFormOpen,
    udharFormOpen,
    editFormOpen,
    imageViewerOpen,
    deleteDialogOpen,
    deleteTransactionDialog,
    editingPayment,
    editingPaymentTxn,
    isDeleting,
  } = ui;

  return Boolean(
    showProfile ||
      showMenu ||
      selectedTransaction ||
      paymentFormOpen ||
      billsGalleryOpen ||
      profileImageViewerOpen ||
      transactionFormOpen ||
      udharFormOpen ||
      editFormOpen ||
      imageViewerOpen ||
      deleteDialogOpen ||
      deleteTransactionDialog ||
      (editingPayment && editingPaymentTxn) ||
      isDeleting
  );
}