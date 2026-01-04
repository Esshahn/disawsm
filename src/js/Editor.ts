import { dom } from "./helper";

export default class Editor {
  constructor(public window: number, public config) {
    this.config = config;
    this.window = window;

    const template = `
      <div id="editor-content" style="padding: 20px;">
        <h1>Hello World</h1>
        <p>This is the Editor window.</p>
      </div>
    `;

    dom.append("#window-" + this.window, template);
  }
}
