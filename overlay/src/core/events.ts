export const OverlayEvents = {
  BubbleClicked: "bubble-clicked",
  BubbleFixError: "bubble-fix-error",
  ModalSubmit: "brakit-modal-submit",
  ModalClose: "brakit-modal-close",
  ModalUndo: "brakit-modal-undo",
  UndoRequest: "brakit-undo-request",
  ToolChange: "brakit-tool-change",
  SmartEditConfirm: "brakit-smart-edit-confirm",
  SmartEditCancel: "brakit-smart-edit-cancel",
} as const;

type OverlayEventMap = typeof OverlayEvents;
export type OverlayEventName = OverlayEventMap[keyof OverlayEventMap];
