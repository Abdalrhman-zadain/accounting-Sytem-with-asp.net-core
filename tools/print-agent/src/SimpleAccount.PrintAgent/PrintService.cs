using System.Drawing.Printing;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace SimpleAccount.PrintAgent;

public sealed class PrintService : IDisposable
{
    private readonly Form _hostForm;
    private readonly WebView2 _webView;
    private readonly SemaphoreSlim _printLock = new(1, 1);
    private bool _initialized;

    public PrintService()
    {
        _hostForm = new Form
        {
            ShowInTaskbar = false,
            WindowState = FormWindowState.Minimized,
            Width = 400,
            Height = 600,
            Opacity = 0,
        };

        _webView = new WebView2
        {
            Dock = DockStyle.Fill,
        };
        _hostForm.Controls.Add(_webView);
    }

    public static IReadOnlyList<string> ListInstalledPrinters()
    {
        var printers = new List<string>();
        foreach (string printer in PrinterSettings.InstalledPrinters)
        {
            printers.Add(printer);
        }

        return printers;
    }

    public async Task PrintHtmlAsync(string printerName, string html, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(printerName))
        {
            throw new InvalidOperationException("Printer name is required.");
        }

        if (!ListInstalledPrinters().Contains(printerName, StringComparer.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException($"Printer \"{printerName}\" was not found on this machine.");
        }

        await _printLock.WaitAsync(cancellationToken);
        try
        {
            await EnsureInitializedAsync(cancellationToken);

            var htmlWithFeed = AppendTrailingFeed(html);
            var navigationCompleted = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);

            void Handler(object? sender, CoreWebView2NavigationCompletedEventArgs args)
            {
                _webView.CoreWebView2!.NavigationCompleted -= Handler;
                navigationCompleted.TrySetResult(args.IsSuccess);
            }

            _webView.CoreWebView2!.NavigationCompleted += Handler;
            _webView.CoreWebView2.NavigateToString(htmlWithFeed);

            var navigated = await navigationCompleted.Task.WaitAsync(TimeSpan.FromSeconds(20), cancellationToken);
            if (!navigated)
            {
                throw new InvalidOperationException("Failed to render print HTML.");
            }

            await Task.Delay(300, cancellationToken);

            var settings = _webView.CoreWebView2.Environment.CreatePrintSettings();
            settings.PrinterName = printerName;
            settings.ShouldPrintBackgrounds = true;
            settings.ShouldPrintHeaderAndFooter = false;

            var printCompleted = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
            _webView.CoreWebView2.PrintCompleted += (_, args) =>
            {
                printCompleted.TrySetResult(args.Succeeded);
            };

            _webView.CoreWebView2.Print(settings);

            var printed = await printCompleted.Task.WaitAsync(TimeSpan.FromSeconds(60), cancellationToken);
            if (!printed)
            {
                throw new InvalidOperationException("Print job did not complete successfully.");
            }
        }
        finally
        {
            _printLock.Release();
        }
    }

    private async Task EnsureInitializedAsync(CancellationToken cancellationToken)
    {
        if (_initialized)
        {
            return;
        }

        _hostForm.Show();
        _hostForm.Hide();

        await _webView.EnsureCoreWebView2Async();
        _initialized = true;
        cancellationToken.ThrowIfCancellationRequested();
    }

    private static string AppendTrailingFeed(string html)
    {
        const string feedBlock = "<div style=\"height:48px;line-height:12px;font-size:12px;\"><br/><br/><br/><br/></div>";
        if (html.Contains("</body>", StringComparison.OrdinalIgnoreCase))
        {
            return html.Replace("</body>", feedBlock + "</body>", StringComparison.OrdinalIgnoreCase);
        }

        return html + feedBlock;
    }

    public void Dispose()
    {
        _printLock.Dispose();
        _webView.Dispose();
        _hostForm.Dispose();
    }
}
