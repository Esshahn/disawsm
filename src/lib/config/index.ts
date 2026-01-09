export function get_config() {
  const config = {
    version: "26.01.09.5",  // Fixed: PETSCII column alignment on incomplete last lines
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
      left: 50,
      width: 300,
      height: 300,
      autoOpen: true,
      closeable: false,
      isOpen: true,
      resizable: false
    },
    window_entrypoints: {
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
