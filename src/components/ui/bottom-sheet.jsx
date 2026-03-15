"use client";

import { forwardRef } from "react";
import { Sheet } from "react-modal-sheet";
import { cn } from "@/lib/utils";

const BottomSheet = forwardRef(function BottomSheet(
  {
    open,
    onClose,
    children,
    detent = "default",
    disableDismiss = false,
    snapPoints,
    initialSnap,
    onSnap,
    className,
    backdropClassName,
    containerClassName,
    headerClassName,
    contentProps = {},
    hideBackdrop = false,
    hideHeader = false,
    customHeader,
    modalEffectRootId,
    ...rest
  },
  ref
) {
  return (
    <Sheet
      ref={ref}
      isOpen={open}
      onClose={onClose}
      detent={detent}
      disableDismiss={disableDismiss}
      snapPoints={snapPoints}
      initialSnap={initialSnap}
      onSnap={onSnap}
      modalEffectRootId={modalEffectRootId}
      {...rest}
    >
      <Sheet.Container className={cn(containerClassName)}>
        {!hideHeader &&
          (customHeader ? (
            <Sheet.Header className={cn(headerClassName)}>
              {customHeader}
            </Sheet.Header>
          ) : (
            <Sheet.Header className={cn(headerClassName)} />
          ))}
        <Sheet.Content {...contentProps}>{children}</Sheet.Content>
      </Sheet.Container>
      {!hideBackdrop && (
        <Sheet.Backdrop
          className={cn(backdropClassName)}
          onTap={disableDismiss ? undefined : onClose}
        />
      )}
    </Sheet>
  );
});

BottomSheet.displayName = "BottomSheet";

export { BottomSheet, Sheet };
