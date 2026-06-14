namespace SimpleAccount.PrintAgent;

public sealed class TrayApplicationContext : ApplicationContext
{
    private readonly NotifyIcon _notifyIcon;
    private readonly PrintService _printService;
    private readonly LocalPrintServer _server;
    private AgentConfig _config;

    public TrayApplicationContext()
    {
        _config = AgentConfig.Load();
        _printService = new PrintService();
        _server = new LocalPrintServer(_printService, () => _config, Log);
        _server.Start();

        _notifyIcon = new NotifyIcon
        {
            Icon = SystemIcons.Application,
            Visible = true,
            Text = "Simple Account Print Agent",
        };

        RefreshMenu();
        _notifyIcon.DoubleClick += (_, _) => OpenSettings();
    }

    private void RefreshMenu()
    {
        var menu = new ContextMenuStrip();
        menu.Items.Add("Open settings", null, (_, _) => OpenSettings());
        menu.Items.Add("Test kitchen print", null, async (_, _) => await TestPrintAsync(isKitchen: true));
        menu.Items.Add("Test receipt print", null, async (_, _) => await TestPrintAsync(isKitchen: false));
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add("Restart server", null, (_, _) => RestartServer());
        menu.Items.Add("Exit", null, (_, _) => Shutdown());
        _notifyIcon.ContextMenuStrip = menu;
    }

    private void OpenSettings()
    {
        using var form = new SettingsForm(_config);
        if (form.ShowDialog() == DialogResult.OK)
        {
            _config = AgentConfig.Load();
            ShowBalloon("Settings saved.");
        }
    }

    private async Task TestPrintAsync(bool isKitchen)
    {
        _config = AgentConfig.Load();
        var printerName = isKitchen ? _config.KitchenPrinterName : _config.ReceiptPrinterName;
        if (string.IsNullOrWhiteSpace(printerName))
        {
            ShowBalloon("Configure the printer in Settings first.", ToolTipIcon.Warning);
            OpenSettings();
            return;
        }

        var title = isKitchen ? "Kitchen Printer Test" : "Receipt Printer Test";
        var html = $@"<!DOCTYPE html>
<html lang=""ar"" dir=""rtl"">
<head>
  <meta charset=""UTF-8""/>
  <style>
    @page {{ size: 80mm auto; margin: 0; }}
    body {{ width: 76mm; font-family: 'Courier New', monospace; text-align: center; font-size: 13pt; }}
  </style>
</head>
<body>
  <div>{title}</div>
  <div>{DateTime.Now}</div>
</body>
</html>";

        try
        {
            await _printService.PrintHtmlAsync(printerName, html, CancellationToken.None);
            ShowBalloon($"{title} sent.");
        }
        catch (Exception ex)
        {
            ShowBalloon(ex.Message, ToolTipIcon.Error);
        }
    }

    private void RestartServer()
    {
        _server.StopAsync().GetAwaiter().GetResult();
        _server.Start();
        ShowBalloon("Print agent restarted.");
    }

    private void ShowBalloon(string message, ToolTipIcon icon = ToolTipIcon.Info)
    {
        _notifyIcon.ShowBalloonTip(4000, "Simple Account Print Agent", message, icon);
    }

    private static void Log(string message)
    {
        Debug.WriteLine(message);
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _server.Dispose();
            _printService.Dispose();
            _notifyIcon.Visible = false;
            _notifyIcon.Dispose();
        }

        base.Dispose(disposing);
    }

    private void Shutdown()
    {
        ExitThreadCore();
    }
}
