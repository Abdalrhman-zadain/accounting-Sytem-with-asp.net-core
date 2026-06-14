using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace SimpleAccount.PrintAgent;

public sealed class LocalPrintServer : IDisposable
{
    private readonly PrintService _printService;
    private readonly Func<AgentConfig> _getConfig;
    private readonly Action<string>? _log;
    private HttpListener? _listener;
    private CancellationTokenSource? _cts;
    private Task? _loopTask;

    public LocalPrintServer(PrintService printService, Func<AgentConfig> getConfig, Action<string>? log = null)
    {
        _printService = printService;
        _getConfig = getConfig;
        _log = log;
    }

    public bool IsRunning => _listener?.IsListening == true;

    public void Start()
    {
        if (IsRunning)
        {
            return;
        }

        var config = _getConfig();
        var prefix = $"http://127.0.0.1:{config.Port}/";
        _listener = new HttpListener();
        _listener.Prefixes.Add(prefix);
        _listener.Start();

        _cts = new CancellationTokenSource();
        _loopTask = Task.Run(() => ListenLoopAsync(_cts.Token));
        _log?.Invoke($"Listening on {prefix}");
    }

    public async Task StopAsync()
    {
        _cts?.Cancel();
        if (_listener?.IsListening == true)
        {
            _listener.Stop();
        }

        if (_loopTask is not null)
        {
            try
            {
                await _loopTask;
            }
            catch (OperationCanceledException)
            {
            }
        }

        _listener?.Close();
        _listener = null;
        _cts?.Dispose();
        _cts = null;
    }

    private async Task ListenLoopAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested && _listener is { IsListening: true })
        {
            HttpListenerContext? context = null;
            try
            {
                context = await _listener.GetContextAsync().WaitAsync(cancellationToken);
                await HandleRequestAsync(context, cancellationToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _log?.Invoke($"Request error: {ex.Message}");
                if (context is not null)
                {
                    await WriteJsonAsync(context.Response, HttpStatusCode.InternalServerError, new { ok = false, error = ex.Message });
                }
            }
        }
    }

    private async Task HandleRequestAsync(HttpListenerContext context, CancellationToken cancellationToken)
    {
        var config = _getConfig();
        var origin = context.Request.Headers["Origin"];
        var allowedOrigin = ResolveAllowedOrigin(origin, config);
        var isPreflight = string.Equals(context.Request.HttpMethod, "OPTIONS", StringComparison.OrdinalIgnoreCase);

        if (isPreflight)
        {
            WriteCors(context.Response, allowedOrigin, isPreflight: true);
            context.Response.StatusCode = (int)HttpStatusCode.NoContent;
            context.Response.Close();
            return;
        }

        WriteCors(context.Response, allowedOrigin);

        if (!IsAuthorized(context.Request, config))
        {
            await WriteJsonAsync(context.Response, HttpStatusCode.Unauthorized, new { ok = false, error = "Unauthorized" });
            return;
        }

        var path = context.Request.Url?.AbsolutePath.TrimEnd('/') ?? string.Empty;
        if (string.IsNullOrEmpty(path))
        {
            path = "/";
        }

        switch (path)
        {
            case "/health":
                await WriteJsonAsync(context.Response, HttpStatusCode.OK, new { ok = true, version = "1.0.2" });
                return;
            case "/printers":
                await WriteJsonAsync(context.Response, HttpStatusCode.OK, new { printers = PrintService.ListInstalledPrinters() });
                return;
            case "/config" when context.Request.HttpMethod == "GET":
                await WriteJsonAsync(context.Response, HttpStatusCode.OK, new
                {
                    port = config.Port,
                    kitchenPrinterName = config.KitchenPrinterName,
                    receiptPrinterName = config.ReceiptPrinterName,
                });
                return;
            case "/config" when context.Request.HttpMethod == "PUT":
                await HandleUpdateConfigAsync(context);
                return;
            case "/print" when context.Request.HttpMethod == "POST":
                await HandlePrintAsync(context, cancellationToken);
                return;
            default:
                await WriteJsonAsync(context.Response, HttpStatusCode.NotFound, new { ok = false, error = "Not found" });
                return;
        }
    }

    private async Task HandleUpdateConfigAsync(HttpListenerContext context)
    {
        using var reader = new StreamReader(context.Request.InputStream, context.Request.ContentEncoding);
        var body = await reader.ReadToEndAsync();
        var payload = JsonSerializer.Deserialize<UpdateConfigRequest>(body, JsonOptions());
        if (payload is null)
        {
            await WriteJsonAsync(context.Response, HttpStatusCode.BadRequest, new { ok = false, error = "Invalid JSON" });
            return;
        }

        var config = _getConfig();
        config.KitchenPrinterName = payload.KitchenPrinterName;
        config.ReceiptPrinterName = payload.ReceiptPrinterName;
        config.Save();

        await WriteJsonAsync(context.Response, HttpStatusCode.OK, new { ok = true });
    }

    private async Task HandlePrintAsync(HttpListenerContext context, CancellationToken cancellationToken)
    {
        using var reader = new StreamReader(context.Request.InputStream, context.Request.ContentEncoding);
        var body = await reader.ReadToEndAsync();
        var payload = JsonSerializer.Deserialize<PrintRequest>(body, JsonOptions());
        if (payload is null || string.IsNullOrWhiteSpace(payload.PrinterName) || string.IsNullOrWhiteSpace(payload.Html))
        {
            await WriteJsonAsync(context.Response, HttpStatusCode.BadRequest, new { ok = false, error = "printerName and html are required" });
            return;
        }

        await _printService.PrintHtmlAsync(payload.PrinterName, payload.Html, cancellationToken);
        await WriteJsonAsync(context.Response, HttpStatusCode.OK, new { ok = true });
    }

    private static bool IsAuthorized(HttpListenerRequest request, AgentConfig config)
    {
        var header = request.Headers["Authorization"];
        if (string.IsNullOrWhiteSpace(header))
        {
            return true;
        }

        var expected = $"Bearer {config.AuthToken}";
        return string.Equals(header, expected, StringComparison.Ordinal);
    }

    private static string? ResolveAllowedOrigin(string? origin, AgentConfig config)
    {
        if (string.IsNullOrWhiteSpace(origin))
        {
            return config.AllowedOrigins.FirstOrDefault();
        }

        return config.AllowedOrigins.Any(o => string.Equals(o, origin, StringComparison.OrdinalIgnoreCase))
            ? origin
            : null;
    }

    private static void WriteCors(HttpListenerResponse response, string? allowedOrigin, bool isPreflight = false)
    {
        if (!string.IsNullOrWhiteSpace(allowedOrigin))
        {
            response.Headers["Access-Control-Allow-Origin"] = allowedOrigin;
            response.Headers["Vary"] = "Origin";
        }

        response.Headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, OPTIONS";
        response.Headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept";
        // Required when https://public-site calls http://127.0.0.1 (Chrome Private Network Access).
        response.Headers["Access-Control-Allow-Private-Network"] = "true";

        if (isPreflight)
        {
            response.Headers["Access-Control-Max-Age"] = "86400";
        }
    }

    private static async Task WriteJsonAsync(HttpListenerResponse response, HttpStatusCode statusCode, object payload)
    {
        response.StatusCode = (int)statusCode;
        response.ContentType = "application/json; charset=utf-8";
        var json = JsonSerializer.Serialize(payload, JsonOptions());
        var bytes = Encoding.UTF8.GetBytes(json);
        response.ContentLength64 = bytes.Length;
        await response.OutputStream.WriteAsync(bytes);
        response.Close();
    }

    private static JsonSerializerOptions JsonOptions() =>
        new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        };

    public void Dispose()
    {
        StopAsync().GetAwaiter().GetResult();
    }

    private sealed class PrintRequest
    {
        public string? PrinterName { get; set; }
        public string? Html { get; set; }
    }

    private sealed class UpdateConfigRequest
    {
        public string? KitchenPrinterName { get; set; }
        public string? ReceiptPrinterName { get; set; }
    }
}
