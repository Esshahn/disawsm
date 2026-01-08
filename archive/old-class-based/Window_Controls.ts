/*

  WINDOW CONTROLS
  Provides basic functionality for windows, mostly canvas & zoom related
  Inherited e.g. from Editor, List, Preview

 */

export default class Window_Controls {
  width: any;
  height: any;
  pixels_x: any;
  pixels_y: any;
  config: any;

  get_width(): number {
    return this.width;
  }

  get_height(): number {
    return this.height;
  }

}
