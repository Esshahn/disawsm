export function get_config() {
  const config = {
    version: "26.01.09.3",  // Bumped version for jump-to-address feature
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
      left: 800,
      width: 600,
      height: 600,
      autoOpen: true,
      closeable: false,
      isOpen: true,
      resizable: true
    },
    window_info: {
      top: 50,
      left: 700,
      width: 400,
      height: 500,
      autoOpen: true,
      closeable: false,
      isOpen: true,
      resizable: false
    },
    window_checkpoints: {
      top: 50,
      left: 700,
      width: 500,
      height: 400,
      autoOpen: true,
      closeable: false,
      isOpen: true,
      resizable: false
    }
  };

  return config;
}
