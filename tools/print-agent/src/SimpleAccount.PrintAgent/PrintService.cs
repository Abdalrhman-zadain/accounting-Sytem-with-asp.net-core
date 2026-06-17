using System.Drawing.Printing;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace SimpleAccount.PrintAgent;

public sealed class PrintService : IDisposable
{
    private readonly SynchronizationContext _uiContext;
    private readonly Form _hostForm;
    private readonly WebView2 _webView;
    private readonly SemaphoreSlim _printLock = new(1, 1);
    private bool _initialized;

    public PrintService()
    {
        _uiContext = SynchronizationContext.Current ?? new WindowsFormsSynchronizationContext();

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

    public void EnsureReady()
    {
        if (_hostForm.IsHandleCreated)
        {
            return;
        }

        _hostForm.Show();
        _hostForm.Hide();
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
        await RunOnUiThreadAsync(async () =>
        {
            if (string.IsNullOrWhiteSpace(printerName))
            {
                throw new InvalidOperationException("Printer name is required.");
            }

            if (!ListInstalledPrinters().Contains(printerName, StringComparer.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException($"Printer \"{printerName}\" was not found on this machine.");
            }

            await PrintHtmlCoreAsync(printerName, html, cancellationToken);
        });
    }

    private async Task PrintHtmlCoreAsync(string printerName, string html, CancellationToken cancellationToken)
    {
        await _printLock.WaitAsync(cancellationToken);
        try
        {
            EnsureFormHandle();

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

            var navigated = await navigationCompleted.Task.WaitAsync(TimeSpan.FromSeconds(30), cancellationToken);
            if (!navigated)
            {
                throw new InvalidOperationException("Failed to render print HTML.");
            }

            await WaitForDocumentImagesAsync(cancellationToken);
            await Task.Delay(800, cancellationToken);

            var settings = _webView.CoreWebView2.Environment.CreatePrintSettings();
            settings.PrinterName = printerName;
            settings.ShouldPrintBackgrounds = true;
            settings.ShouldPrintHeaderAndFooter = false;

            var printStatus = await _webView.CoreWebView2.PrintAsync(settings);
            if (printStatus != CoreWebView2PrintStatus.Succeeded)
            {
                throw new InvalidOperationException($"Print job failed with status: {printStatus}");
            }
        }
        finally
        {
            _printLock.Release();
        }
    }

    private Task RunOnUiThreadAsync(Func<Task> action)
    {
        var tcs = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        _uiContext.Post(_ =>
        {
            _ = RunCoreAsync();

            async Task RunCoreAsync()
            {
                try
                {
                    EnsureReady();
                    await action().ConfigureAwait(true);
                    tcs.TrySetResult();
                }
                catch (Exception ex)
                {
                    tcs.TrySetException(ex);
                }
            }
        }, null);

        return tcs.Task;
    }

    private void EnsureFormHandle()
    {
        EnsureReady();
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

    private async Task WaitForDocumentImagesAsync(CancellationToken cancellationToken)
    {
        const string script = """
            (async () => {
              const pending = Array.from(document.images).filter((img) => !img.complete);
              if (pending.length === 0) {
                return true;
              }
              await Promise.all(
                pending.map(
                  (img) =>
                    new Promise((resolve) => {
                      img.onload = () => resolve(true);
                      img.onerror = () => resolve(true);
                    }),
                ),
              );
              return true;
            })()
            """;

        await _webView.CoreWebView2!.ExecuteScriptAsync(script);
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
