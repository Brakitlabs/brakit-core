import { logger } from "./logger";

/**
 * Utility for safely initializing dialogs that need to be appended to document.body
 * Handles timing issues when document.body might not be available immediately
 */
export class DialogInitializer {
  /**
   * Safely append an element to document.body with proper timing handling
   */
  static async appendToBody(
    document: Document,
    element: HTMLElement,
    context: string = "Dialog"
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const appendElement = () => {
        try {
          if (document.body) {
            document.body.appendChild(element);
            resolve();
          } else {
            reject(
              new Error(`${context}: document.body is still null after retry`)
            );
          }
        } catch (error) {
          reject(error);
        }
      };

      // If document.body is available, append immediately
      if (document.body) {
        appendElement();
        return;
      }

      // If document is loading, wait for DOMContentLoaded
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", appendElement, {
          once: true,
        });
        return;
      }

      // If document is not loading but body is still null, try again after a short delay
      setTimeout(() => {
        if (document.body) {
          appendElement();
        } else {
          logger.warn(
            `[${context}] Still cannot append element - body is still null`
          );
          reject(
            new Error(`${context}: document.body is still null after delay`)
          );
        }
      }, 100);
    });
  }

  /**
   * Safely append an element to document.body with error handling
   */
  static appendToBodySafe(
    document: Document,
    element: HTMLElement,
    context: string = "Dialog"
  ): void {
    if (!document.body) {
      // If document.body is not available, wait for it
      if (document.readyState === "loading") {
        document.addEventListener(
          "DOMContentLoaded",
          () => {
            this.appendToBodySafe(document, element, context);
          },
          { once: true }
        );
      } else {
        // If document is not loading but body is still null, try again after a short delay
        setTimeout(() => {
          if (document.body) {
            document.body.appendChild(element);
          } else {
            logger.warn(
              `[${context}] Still cannot append element - body is still null`
            );
          }
        }, 100);
      }
      return;
    }

    document.body.appendChild(element);
  }
}
