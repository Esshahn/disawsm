export function get_config() {
  const config = {
    version: "26.01.08.2",  // Bumped version to force update
    default_filename: "mycode",
    window_editor: {
      top: 50,
      left: 210,
      minWidth: 400,
      minHeight: 200,
      width: 200,
      height: 400,
      autoOpen: true,
      closeable: false,
      isOpen: true,
      resizable: true
    }
  };

  return config;
}
