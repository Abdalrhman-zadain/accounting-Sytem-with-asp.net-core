import re

file_path = "frontend/features/pos/pos-page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

if "LuChevronRight" not in content:
    content = content.replace("LuChevronDown,", "LuChevronDown,\n  LuChevronRight,")
if "LuFolder" not in content:
    content = content.replace("LuSearch,", "LuSearch,\n  LuFolder,\n  LuMonitor,\n  LuShoppingCart,")

# Find renderSettingsWorkspace
pattern = re.compile(r'const renderSettingsWorkspace = \(\) => \{.*?\n  \};\n\n  const renderWorkspace', re.DOTALL)

new_settings = """const renderSettingsWorkspace = () => {
    const settings = posSettings;
    const [searchTerm, setSearchTerm] = useState("");
    const [role, setRole] = useState("MANAGER");
    const [localPermissions, setLocalPermissions] = useState<Record<string, boolean> | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
      Session: true,
      Cart: true,
      Accounting: true,
      General: true
    });

    useEffect(() => {
      if (settings && !localPermissions) {
        setLocalPermissions(settings.permissions);
      }
    }, [settings, localPermissions]);

    if (!settings || !localPermissions) {
      return (
        <div className="space-y-6">
          <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6 text-sm text-[#64736b]">
            {t("pos.settings.loadError")}
          </Card>
        </div>
      );
    }

    const togglePermission = (key: string) => {
      setLocalPermissions(prev => ({
        ...prev!,
        [key]: !prev![key]
      }));
    };

    const isDirty = JSON.stringify(localPermissions) !== JSON.stringify(settings.permissions);

    const handleRoleChange = (newRole: string) => {
      setRole(newRole);
      if (newRole === "CASHIER") {
        setLocalPermissions(prev => {
          const next = { ...prev! };
          Object.keys(next).forEach(k => {
            if (k.includes("JOURNAL") || k.includes("LEDGER") || k.includes("ACCOUNTING") || k.includes("REPORTS") || k.includes("INVENTORY_MOVEMENTS")) {
              next[k] = false;
            }
          });
          return next;
        });
      }
    };

    const toggleAll = (forceVal?: boolean) => {
      setLocalPermissions(prev => {
        const next = { ...prev! };
        Object.keys(next).forEach(k => {
          next[k] = forceVal !== undefined ? forceVal : !next[k];
        });
        return next;
      });
    };

    const permissionEntries = Object.entries(localPermissions);
    const enabledCount = permissionEntries.filter(([k, v]) => v).length;
    
    const groups = {
      Session: { icon: LuMonitor, keys: [] as string[], label: "الجلسة — Session" },
      Cart: { icon: LuShoppingCart, keys: [] as string[], label: "السلة — Cart" },
      Accounting: { icon: LuCalculator, keys: [] as string[], label: "الحسابات — Accounting" },
      General: { icon: LuSettings2, keys: [] as string[], label: "عام — General" }
    };

    permissionEntries.forEach(([key]) => {
      if (key.includes("SESSION") || key.includes("SCREEN")) {
        groups.Session.keys.push(key);
      } else if (key.includes("CART") || key.includes("SALE") || key.includes("PAYMENT") || key.includes("ITEM") || key.includes("BARCODE")) {
        groups.Cart.keys.push(key);
      } else if (key.includes("JOURNAL") || key.includes("LEDGER") || key.includes("ACCOUNTING") || key.includes("INVENTORY")) {
        groups.Accounting.keys.push(key);
      } else {
        groups.General.keys.push(key);
      }
    });

    const highlightText = (text: string) => {
      if (!searchTerm) return text;
      const regex = new RegExp(`(${searchTerm})`, 'gi');
      const parts = text.split(regex);
      return parts.map((part, i) => 
        regex.test(part) ? <span key={i} className="bg-yellow-200">{part}</span> : part
      );
    };

    return (
      <div className="space-y-6">
        <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xl font-black text-[#233329] arabic-heading">
                {t("pos.workspace.settings")}
              </div>
              <p className="mt-2 text-sm text-[#64736b] arabic-auto">
                {t("pos.settings.description")}
              </p>
            </div>
            {isDirty && (
              <button className="flex items-center gap-2 rounded-full bg-[#0f8f67] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#0c7a57]">
                <LuSave className="h-4 w-4" />
                حفظ التغييرات
              </button>
            )}
          </div>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <SettingToggleCard
            label={t("pos.settings.discountTaxPolicy")}
            value={settings.runtime.invoiceDiscountTaxPolicy}
            isToggle={false}
          />
          <SettingToggleCard
            label={t("pos.settings.creditSale")}
            enabled={settings.runtime.allowCreditSale}
          />
          <SettingToggleCard
            label={t("pos.settings.autoPost")}
            enabled={settings.runtime.autoPost}
          />
          <SettingToggleCard
            label={t("pos.settings.allowCloseWithDrafts")}
            enabled={settings.runtime.allowCloseWithDrafts}
          />
          <SettingToggleCard
            label={t("pos.settings.negativeStock")}
            enabled={settings.runtime.negativeStockAllowed}
          />
          <SettingToggleCard
            label={t("pos.settings.cashierDiscountLimit")}
            value={`${settings.runtime.cashierDiscountLimitPercent}%`}
            isToggle={false}
          />
        </div>

        <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-0 overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-[#e1e7e2] p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-lg font-black text-[#233329]">{t("pos.settings.roleActionsTitle")}</div>
              <div className="text-sm text-[#68776f]">({enabledCount} / {permissionEntries.length} مفعل)</div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select 
                value={role} 
                onChange={e => handleRoleChange(e.target.value)}
                className="rounded-[16px] border border-[#d4ddd7] bg-[#fbfcfb] px-4 py-2.5 text-sm font-bold text-[#233329]"
              >
                <option value="MANAGER">مدير النظام (Manager)</option>
                <option value="CASHIER">كاشير (Cashier)</option>
              </select>
              
              <div className="relative">
                <LuSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8f9b94]" />
                <input
                  type="text"
                  placeholder="ابحث عن إجراء..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full rounded-[16px] border border-[#d4ddd7] bg-[#fbfcfb] pl-10 pr-4 py-2.5 text-sm outline-none transition-colors focus:border-[#46644b]"
                />
              </div>

              <button 
                onClick={() => toggleAll()}
                className="rounded-[16px] border border-[#d4ddd7] bg-[#fbfcfb] px-4 py-2.5 text-sm font-bold text-[#233329] hover:bg-[#f2f4f2]"
              >
                تبديل الكل
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="min-w-full text-base">
              <thead className="sticky top-0 bg-[#f8faf8] z-10 shadow-sm border-b border-[#e1e7e2]">
                <tr className="text-left text-[#6d7b73]">
                  <th className="px-6 py-4 font-bold">{t("pos.settings.header.action")}</th>
                  <th className="px-6 py-4 font-bold w-32 text-right">{t("pos.settings.header.allowed")}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groups).map(([groupKey, group]) => {
                  const matchingKeys = group.keys.filter(k => k.toLowerCase().includes(searchTerm.toLowerCase()));
                  if (matchingKeys.length === 0) return null;
                  
                  const isExpanded = expandedGroups[groupKey];
                  const Icon = group.icon;

                  return (
                    <React.Fragment key={groupKey}>
                      <tr 
                        className="cursor-pointer bg-[#fbfcfb] transition-colors hover:bg-[#f6f7f8]"
                        onClick={() => setExpandedGroups(p => ({ ...p, [groupKey]: !p[groupKey] }))}
                      >
                        <td colSpan={2} className="border-b border-[#e1e7e2] px-6 py-4">
                          <div className="flex items-center gap-3 font-bold text-[#233329]">
                            {isExpanded ? <LuChevronDown className="h-5 w-5" /> : <LuChevronRight className="h-5 w-5" />}
                            <Icon className="h-5 w-5 text-[#46644b]" />
                            {group.label}
                            <span className="text-xs font-normal text-[#8f9b94] ml-2">
                              ({matchingKeys.length})
                            </span>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && matchingKeys.map(key => (
                        <tr key={key} className="border-b border-[#f0f3f0] transition-colors hover:bg-[#fbfcfb]">
                          <td className="px-6 py-4 font-medium text-[#445149]">
                            {highlightText(key)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Switch 
                              checked={localPermissions[key]} 
                              onChange={() => togglePermission(key)} 
                            />
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  const renderWorkspace"""

content = pattern.sub(new_settings, content)

new_components = """
function SettingToggleCard({
  label,
  value,
  enabled,
  isToggle = true
}: {
  label: string;
  value?: string;
  enabled?: boolean;
  isToggle?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-[24px] border border-[#e1e7e2] bg-white p-6 shadow-sm transition-all hover:border-[#c5d0c9]">
      <div className="font-bold text-[#233329] text-lg">{label}</div>
      <div>
        {isToggle ? (
          <Switch checked={!!enabled} onChange={() => {}} />
        ) : (
          <div className="text-lg font-black tracking-wider text-[#46644b]">{value}</div>
        )}
      </div>
    </div>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? "bg-[#0f8f67]" : "bg-[#d4ddd7]"
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
"""

content += new_components

# ensure React is imported if we used React.Fragment
if "import React" not in content and "import * as React" not in content:
    content = content.replace('import type { ComponentType } from "react";', 'import React, { ComponentType } from "react";')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Updated successfully.")
