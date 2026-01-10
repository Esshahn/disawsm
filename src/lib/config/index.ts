export function get_config() {
  const config = {
    version: "26.01.10",  // Added: Monitor window (unified Data/Code view)
    default_filename: "mycode",
    window_monitor: {
      top: 50,
      left: 210,
      width: 800,
      height: 600,
      autoOpen: true,
      closeable: true,
      isOpen: true,
      resizable: true
    },
    window_info: {
      top: 50,
      left: 50,
      width: 300,
      height: 300,
      autoOpen: true,
      closeable: true,
      isOpen: true,
      resizable: false
    },
    window_entrypoints: {
      top: 50,
      left: 700,
      width: 500,
      height: 400,
      autoOpen: true,
      closeable: true,
      isOpen: true,
      resizable: false
    },
    window_disassembler: {
      top: 50,
      left: 1200,
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
