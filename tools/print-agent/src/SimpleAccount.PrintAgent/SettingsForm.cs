namespace SimpleAccount.PrintAgent;

public sealed class SettingsForm : Form
{
    private readonly AgentConfig _config;
    private readonly ComboBox _kitchenPrinterCombo;
    private readonly ComboBox _receiptPrinterCombo;
    private readonly CheckBox _startWithWindowsCheck;

    public SettingsForm(AgentConfig config)
    {
        _config = config;

        Text = "Simple Account Print Agent";
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        ClientSize = new Size(520, 260);

        var intro = new Label
        {
            AutoSize = false,
            Location = new Point(16, 16),
            Size = new Size(488, 40),
            Text = "Select the kitchen and receipt printers for this cashier PC.",
        };

        var kitchenLabel = new Label { AutoSize = true, Location = new Point(16, 68), Text = "Kitchen printer" };
        _kitchenPrinterCombo = new ComboBox
        {
            DropDownStyle = ComboBoxStyle.DropDownList,
            Location = new Point(16, 92),
            Size = new Size(488, 28),
        };

        var receiptLabel = new Label { AutoSize = true, Location = new Point(16, 128), Text = "Receipt printer" };
        _receiptPrinterCombo = new ComboBox
        {
            DropDownStyle = ComboBoxStyle.DropDownList,
            Location = new Point(16, 152),
            Size = new Size(488, 28),
        };

        _startWithWindowsCheck = new CheckBox
        {
            AutoSize = true,
            Location = new Point(16, 192),
            Text = "Start with Windows",
            Checked = config.StartWithWindows,
        };

        var saveButton = new Button
        {
            Text = "Save",
            Location = new Point(328, 216),
            Size = new Size(84, 32),
        };
        saveButton.Click += (_, _) => SaveAndClose();

        var cancelButton = new Button
        {
            Text = "Cancel",
            Location = new Point(420, 216),
            Size = new Size(84, 32),
        };
        cancelButton.Click += (_, _) => Close();

        Controls.Add(intro);
        Controls.Add(kitchenLabel);
        Controls.Add(_kitchenPrinterCombo);
        Controls.Add(receiptLabel);
        Controls.Add(_receiptPrinterCombo);
        Controls.Add(_startWithWindowsCheck);
        Controls.Add(saveButton);
        Controls.Add(cancelButton);

        LoadPrinters();
    }

    private void LoadPrinters()
    {
        var printers = PrintService.ListInstalledPrinters();
        _kitchenPrinterCombo.Items.Clear();
        _receiptPrinterCombo.Items.Clear();

        foreach (var printer in printers)
        {
            _kitchenPrinterCombo.Items.Add(printer);
            _receiptPrinterCombo.Items.Add(printer);
        }

        SelectPrinter(_kitchenPrinterCombo, _config.KitchenPrinterName);
        SelectPrinter(_receiptPrinterCombo, _config.ReceiptPrinterName);
    }

    private static void SelectPrinter(ComboBox combo, string? printerName)
    {
        if (string.IsNullOrWhiteSpace(printerName))
        {
            if (combo.Items.Count > 0)
            {
                combo.SelectedIndex = 0;
            }

            return;
        }

        var index = combo.FindStringExact(printerName);
        combo.SelectedIndex = index >= 0 ? index : (combo.Items.Count > 0 ? 0 : -1);
    }

    private void SaveAndClose()
    {
        _config.KitchenPrinterName = _kitchenPrinterCombo.SelectedItem?.ToString();
        _config.ReceiptPrinterName = _receiptPrinterCombo.SelectedItem?.ToString();
        _config.StartWithWindows = _startWithWindowsCheck.Checked;
        _config.Save();

        StartupHelper.SetEnabled(_config.StartWithWindows, Application.ExecutablePath);
        DialogResult = DialogResult.OK;
        Close();
    }
}
