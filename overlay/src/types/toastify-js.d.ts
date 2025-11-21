declare module "toastify-js" {
  interface ToastifyOptions {
    text?: string;
    node?: Node;
    duration?: number;
    selector?: string | Node;
    destination?: string;
    newWindow?: boolean;
    close?: boolean;
    gravity?: "top" | "bottom";
    position?: "left" | "center" | "right";
    stopOnFocus?: boolean;
    className?: string;
    style?: Partial<CSSStyleDeclaration> & Record<string, string>;
    offset?: {
      x?: number | string;
      y?: number | string;
    };
    onClick?: (this: HTMLElement, event: MouseEvent) => void;
    avatar?: string;
  }

  interface ToastifyInstance {
    showToast(): void;
    hideToast(): void;
  }

  function Toastify(options?: ToastifyOptions): ToastifyInstance;
  export default Toastify;
}


