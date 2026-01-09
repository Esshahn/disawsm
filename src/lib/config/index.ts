export function get_config() {
  const config = {
    version: "26.01.09.1",  // Bumped version for code view window
    default_filename: "mycode",
    window_editor: {
      top: 50,
      left: 210,
      width: 800,
      height: 600,
      autoOpen: true,
      closeable: false,
      isOpen: true,
      resizable: true
    },
    window_codeview: {
      top: 50,
      left: 1030,
      width: 600,
      height: 600,
      autoOpen: true,
      closeable: true,
      isOpen: true,
      resizable: true
    }
  };

  return config;
}
