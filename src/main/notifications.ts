import { BrowserWindow, Notification } from "electron";

let reminderWindow: BrowserWindow | null = null;

function showCustomReminder(title: string, body: string): void {
  if (reminderWindow) {
    reminderWindow.close();
    reminderWindow = null;
  }

  reminderWindow = new BrowserWindow({
    width: 340,
    height: 180,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    frame: false,
    transparent: false,
    show: false,
    webPreferences: {
      sandbox: true,
    },
  });

  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { margin: 0; font-family: 'Segoe UI', sans-serif; background: #111827; color: #f9fafb; }
        .wrap { padding: 16px; }
        h1 { font-size: 16px; margin: 0 0 8px; }
        p { font-size: 13px; margin: 0; line-height: 1.4; color: #d1d5db; }
      </style>
    </head>
    <body>
      <div class="wrap">
        <h1>${title}</h1>
        <p>${body}</p>
      </div>
    </body>
  </html>`;

  reminderWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
  );
  reminderWindow.once("ready-to-show", () => reminderWindow?.show());

  setTimeout(() => {
    reminderWindow?.close();
    reminderWindow = null;
  }, 10000);
}

export function sendReminderNotification(title: string, body: string): void {
  if (process.platform === "win32") {
    new Notification({ title, body }).show();
  } else {
    showCustomReminder(title, body);
  }
}
