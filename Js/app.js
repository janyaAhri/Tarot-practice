/* จุดเริ่มต้นของแอป */
function initApp() {
  initSheets();
  SettingsPanel.init();
  LibraryPanel.init();
  Table.init();

  $("#btn-settings").addEventListener("click", () => { SettingsPanel.render(); openSheet("sheet-settings"); });
  $("#btn-library").addEventListener("click", () => { LibraryPanel.render(); openSheet("sheet-library"); });
  $("#btn-notes").addEventListener("click", () => { NotesPanel.render(); openSheet("sheet-notes"); });

  LibraryPanel.render();
}

document.addEventListener("DOMContentLoaded", initApp);
