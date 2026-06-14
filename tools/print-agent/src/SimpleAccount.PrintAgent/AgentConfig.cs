using System.Text.Json;
using System.Text.Json.Serialization;

namespace SimpleAccount.PrintAgent;

public sealed class AgentConfig
{
    public const int DefaultPort = 9188;
    public const string DefaultAuthToken = "simple-account-print-agent";

    public int Port { get; set; } = DefaultPort;

    public string? KitchenPrinterName { get; set; }

    public string? ReceiptPrinterName { get; set; }

    public string AuthToken { get; set; } = DefaultAuthToken;

    public bool StartWithWindows { get; set; }

    public string[] AllowedOrigins { get; set; } =
    [
        "https://sabina.trusttechlimited.com",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ];

    private static string ConfigDirectory =>
        Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "SimpleAccount",
            "PrintAgent");

    private static string ConfigPath => Path.Combine(ConfigDirectory, "config.json");

    public static AgentConfig Load()
    {
        try
        {
            if (!File.Exists(ConfigPath))
            {
                return new AgentConfig();
            }

            var json = File.ReadAllText(ConfigPath);
            return JsonSerializer.Deserialize<AgentConfig>(json, JsonOptions()) ?? new AgentConfig();
        }
        catch
        {
            return new AgentConfig();
        }
    }

    public void Save()
    {
        Directory.CreateDirectory(ConfigDirectory);
        var json = JsonSerializer.Serialize(this, JsonOptions());
        File.WriteAllText(ConfigPath, json);
    }

    private static JsonSerializerOptions JsonOptions() =>
        new()
        {
            WriteIndented = true,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        };
}
