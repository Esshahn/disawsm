
import { dom } from "./helper";
export default class About {
  constructor(public window: number, public config, public eventhandler) {
    this.config = config;
    this.window = window;
    this.eventhandler = eventhandler;

    const template = `
    <div id="info">
        <h1>DisAWSM</h1>
        <p>The 6502 Disassembler</p>

        <fieldset>
            <legend>About</legend>

            <h2>Version ${this.config.version}</h2>
            <p>
            DisAWSM is a web-based 6502 disassembler built with TypeScript and modern web technologies.
            </p>
        </fieldset>

        <button id="button-info">Let's go!</button>
    </div>
    `;

    dom.append("#window-" + this.window, template);

    // Add close button to the dialog title bar
    // Wait for next tick to ensure dialog is created
    setTimeout(() => {
      const dialogElement = document.querySelector(`#dialog-window-${this.window}`) as HTMLDialogElement;
      if (dialogElement) {
        const titleBar = dialogElement.querySelector(".dialog-titlebar");
        if (titleBar) {
          const closeButton = document.createElement("div");
          closeButton.className = "window-close-button";
          titleBar.appendChild(closeButton);

          closeButton.addEventListener("click", () => {
            dialogElement.close();
            this.eventhandler.onLoad();
          });
        }
      }
    }, 0);

    dom.sel("#button-info").onclick = () => {
      const dialogElement = document.querySelector(`#dialog-window-${this.window}`) as HTMLDialogElement;
      if (dialogElement) {
        dialogElement.close();
      }
      this.eventhandler.onLoad(); // calls "regain_keyboard_controls" method in app.js
    };

    // Prevent auto-scroll to first link by focusing the fieldset
    const fieldset = dom.sel("#info fieldset") as HTMLElement;
    if (fieldset) {
      fieldset.setAttribute("tabindex", "0");
      setTimeout(() => {
        fieldset.focus();
        fieldset.scrollTop = 0;
      }, 0);
    }
  }
}
