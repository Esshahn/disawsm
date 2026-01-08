export function get_config() {
  const config = {
    version: "26.01.08.3",  // Bumped version to force update
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
    }
  };

  return config;
}
