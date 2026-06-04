"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";
import { LuPlus as Plus, LuPencil as Pencil, LuX as X, LuCheck as Check, LuBuilding2 as Building2, LuMapPin as MapPin, LuUsers as Users2, LuBookMarked as BookMarked, LuFolderKanban as FolderKanban, LuWallet as Wallet, LuPercent as Percent, LuTrash2 as Trash2, LuCreditCard, LuBadgePercent, LuCoins } from "react-icons/lu";
import {
    createTax,
    createAccountSubtype,
    createCreditNoteType,
    createJournalEntryType,
    createPaymentMethodType,
    createSegmentValue,
    createSupplierDebitNoteType,
    deactivateAccountSubtype,
    deactivateJournalEntryType,
    deactivatePaymentMethodType,
    deactivateSegmentValue,
    getAccountSubtypes,
    getCurrencies,
    getCreditNoteTypes,
    getAccountOptions,
    getJournalEntryTypes,
    getPaymentMethodTypes,
    getPaymentTerms,
    getSegmentDefinitions,
    getSupplierDebitNoteTypes,
    getTaxTreatments,
    getTaxes,
    createTaxTreatment,
    updateAccountSubtype,
    updateCreditNoteType,
    updateJournalEntryType,
    updatePaymentMethodType,
    updateSegmentValue,
    updateSupplierDebitNoteType,
    updateTaxTreatment,
    updateTax,
    deleteTax,
} from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { AccountOption, AccountSubtype, CreditNoteLinkedInvoiceRequirement, CreditNoteType, CreditNoteTypeEffect, JournalEntryType, PaymentMethodType, Currency, SegmentDefinition, SegmentValue, SupplierDebitNoteType, Tax, TaxTreatment, TaxType } from "@/types/api";
import { SectionHeading, StatusPill, Card, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { PaymentTermsTab } from "./payment-terms-tab";
import { CurrenciesTab } from "./currencies-tab";
import { SetupProgressCard } from "./components/setup-progress-card";
import { MasterDataCard } from "./components/master-data-card";
import { MasterDataTableToolbar } from "./components/master-data-table-toolbar";
import { HelperPanels } from "./components/helper-panels";
import { EmptyState } from "./components/empty-state";
import { LuDownload as Download, LuUpload as Upload } from "react-icons/lu";

const SEGMENT_ICONS = [Building2, BookMarked, Users2, MapPin, FolderKanban, Wallet];
const SEGMENT_COLORS = [
    "text-violet-400 bg-violet-400/10 border-violet-400/20",
    "text-teal-400 bg-teal-400/10 border-teal-400/20",
    "text-blue-400 bg-blue-400/10 border-blue-400/20",
    "text-orange-400 bg-orange-400/10 border-orange-400/20",
    "text-pink-400 bg-pink-400/10 border-pink-400/20",
];

const TAX_TYPES: TaxType[] = ["SALES", "PURCHASE", "ZERO_RATED", "EXEMPT", "OUT_OF_SCOPE"];

type TaxEditorState = {
    id?: string;
    taxCode: string;
    taxName: string;
    rate: string;
    taxType: TaxType;
    taxAccountId: string;
    isActive: boolean;
};

type TaxTreatmentEditorState = {
    id?: string;
    code: string;
    arabicName: string;
    englishName: string;
    description: string;
    defaultTaxId: string;
    isActive: boolean;
};

type CreditNoteTypeEditorState = {
    id?: string;
    code: string;
    name: string;
    effect: CreditNoteTypeEffect;
    linkedInvoiceRequirement: CreditNoteLinkedInvoiceRequirement;
    affectsInventory: boolean;
    allowsTaxAdjustment: boolean;
    defaultAccountId: string;
    helperText: string;
    isActive: boolean;
};

type SupplierDebitNoteTypeEditorState = {
    id?: string;
    code: string;
    name: string;
    effect: CreditNoteTypeEffect;
    linkedInvoiceRequirement: CreditNoteLinkedInvoiceRequirement;
    affectsInventory: boolean;
    allowsTaxAdjustment: boolean;
    defaultAccountId: string;
    helperText: string;
    isActive: boolean;
};

const emptyTaxEditor: TaxEditorState = {
    taxCode: "",
    taxName: "",
    rate: "",
    taxType: "SALES",
    taxAccountId: "",
    isActive: true,
};

const emptyTaxTreatmentEditor: TaxTreatmentEditorState = {
    code: "",
    arabicName: "",
    englishName: "",
    description: "",
    defaultTaxId: "",
    isActive: true,
};

const emptyCreditNoteTypeEditor: CreditNoteTypeEditorState = {
    code: "",
    name: "",
    effect: "FINANCIAL_ONLY",
    linkedInvoiceRequirement: "REQUIRED",
    affectsInventory: false,
    allowsTaxAdjustment: true,
    defaultAccountId: "",
    helperText: "",
    isActive: true,
};

const emptySupplierDebitNoteTypeEditor: SupplierDebitNoteTypeEditorState = {
    code: "",
    name: "",
    effect: "FINANCIAL_ONLY",
    linkedInvoiceRequirement: "REQUIRED",
    affectsInventory: false,
    allowsTaxAdjustment: true,
    defaultAccountId: "",
    helperText: "",
    isActive: true,
};

function describeCreditNoteEffect(effect: CreditNoteTypeEffect, t: any) {
    switch (effect) {
        case "FINANCIAL_INVENTORY":
            return t("master.creditNoteEffect.financialInventory");
        case "TAX_ONLY":
            return t("master.creditNoteEffect.taxOnly");
        default:
            return t("master.creditNoteEffect.financialOnly");
    }
}

function translateSegmentName(name: string, t: any): string {
    const lowerName = name.toLowerCase().trim();
    if (lowerName === "الشركات" || lowerName === "company" || lowerName === "companies") {
        return t("common.segment.companies");
    }
    if (lowerName === "الفروع" || lowerName === "branch" || lowerName === "branches") {
        return t("common.segment.branches");
    }
    if (lowerName === "الأقسام" || lowerName === "department" || lowerName === "departments") {
        return t("common.segment.departments");
    }
    if (lowerName === "المشاريع" || lowerName === "project" || lowerName === "projects") {
        return t("common.segment.projects");
    }
    if (lowerName === "الحسابات الطبيعية" || lowerName === "natural account" || lowerName === "natural accounts") {
        return t("common.segment.naturalAccounts");
    }
    return name;
}

export function MasterDataPage() {
    const { token } = useAuth();
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState(0);
    const [segmentEditingId, setSegmentEditingId] = useState<string | null>(null);
    const [editCode, setEditCode] = useState("");
    const [editName, setEditName] = useState("");
    const [newCode, setNewCode] = useState("");
    const [newName, setNewName] = useState("");
    const [showAddSegmentValue, setShowAddSegmentValue] = useState(false);

    const [subtypeEditingId, setSubtypeEditingId] = useState<string | null>(null);
    const [editSubtypeName, setEditSubtypeName] = useState("");
    const [newSubtypeName, setNewSubtypeName] = useState("");
    const [showAddSubtype, setShowAddSubtype] = useState(false);

    const [typeEditingId, setTypeEditingId] = useState<string | null>(null);
    const [editTypeName, setEditTypeName] = useState("");
    const [newTypeName, setNewTypeName] = useState("");
    const [showAddType, setShowAddType] = useState(false);

    const [paymentMethodTypeEditingId, setPaymentMethodTypeEditingId] = useState<string | null>(null);
    const [editPaymentMethodTypeName, setEditPaymentMethodTypeName] = useState("");
    const [newPaymentMethodTypeName, setNewPaymentMethodTypeName] = useState("");
    const [showAddPaymentMethodType, setShowAddPaymentMethodType] = useState(false);
    const [taxEditor, setTaxEditor] = useState<TaxEditorState | null>(null);
    const [taxTreatmentEditor, setTaxTreatmentEditor] = useState<TaxTreatmentEditorState | null>(null);
    const [creditNoteTypeEditor, setCreditNoteTypeEditor] = useState<CreditNoteTypeEditorState | null>(null);
    const [supplierDebitNoteTypeEditor, setSupplierDebitNoteTypeEditor] = useState<SupplierDebitNoteTypeEditorState | null>(null);
    const [taxSetupView, setTaxSetupView] = useState<"taxes" | "treatments">("taxes");

    const { data: definitions = [], isLoading } = useQuery({
        queryKey: ["segment-definitions", token],
        queryFn: () => getSegmentDefinitions(token),
    });

    const { data: accountSubtypes = [], isLoading: isLoadingSubtypes } = useQuery({
        queryKey: ["account-subtypes", token],
        queryFn: () => getAccountSubtypes(token),
    });

    const { data: currencies = [], isLoading: isLoadingCurrencies } = useQuery({
        queryKey: ["currencies", token],
        queryFn: () => getCurrencies(token),
    });

    const { data: journalEntryTypes = [], isLoading: isLoadingTypes } = useQuery({
        queryKey: ["journal-entry-types", token],
        queryFn: () => getJournalEntryTypes(token),
    });

    const { data: paymentMethodTypes = [], isLoading: isLoadingPaymentMethodTypes } = useQuery({
        queryKey: ["payment-method-types", token],
        queryFn: () => getPaymentMethodTypes(token),
    });

    const { data: taxes = [], isLoading: isLoadingTaxes, isError: isTaxesError, error: taxesError } = useQuery({
        queryKey: ["taxes", token],
        queryFn: () => getTaxes(token),
    });

    const { data: taxTreatments = [], isLoading: isLoadingTaxTreatments, isError: isTaxTreatmentsError, error: taxTreatmentsError } = useQuery({
        queryKey: ["tax-treatments", token],
        queryFn: () => getTaxTreatments(token),
    });

    const { data: creditNoteTypes = [], isLoading: isLoadingCreditNoteTypes } = useQuery({
        queryKey: ["credit-note-types", token],
        queryFn: () => getCreditNoteTypes(token),
    });

    const { data: supplierDebitNoteTypes = [], isLoading: isLoadingSupplierDebitNoteTypes } = useQuery({
        queryKey: ["supplier-debit-note-types", token],
        queryFn: () => getSupplierDebitNoteTypes(token),
    });

    const { data: paymentTerms = [], isLoading: isLoadingPaymentTerms } = useQuery({
        queryKey: ["payment-terms", token],
        queryFn: () => getPaymentTerms(token),
    });

    const { data: taxAccounts = [] } = useQuery({
        queryKey: ["accounts", "tax-account-options", token],
        queryFn: () => getAccountOptions({ isActive: "true", isPosting: "true", type: "LIABILITY" }, token),
    });

    const { data: creditNoteDefaultAccounts = [] } = useQuery({
        queryKey: ["accounts", "credit-note-default-account-options", token],
        queryFn: () => getAccountOptions({ isActive: "true", isPosting: "true" }, token),
    });

    const createMutation = useMutation({
        mutationFn: ({ defId, code, name }: { defId: string; code: string; name: string }) =>
            createSegmentValue(defId, { code, name }, token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["segment-definitions"] });
            setNewCode(""); setNewName(""); setShowAddSegmentValue(false);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, code, name }: { id: string; code: string; name: string }) =>
            updateSegmentValue(id, { code, name }, token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["segment-definitions"] });
            setSegmentEditingId(null);
        },
    });

    const deactivateMutation = useMutation({
        mutationFn: (id: string) => deactivateSegmentValue(id, token),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["segment-definitions"] }),
    });

    const createSubtypeMutation = useMutation({
        mutationFn: (name: string) => createAccountSubtype({ name }, token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["account-subtypes"] });
            setNewSubtypeName("");
            setShowAddSubtype(false);
        },
    });

    const updateSubtypeMutation = useMutation({
        mutationFn: ({ id, name }: { id: string; name: string }) => updateAccountSubtype(id, { name }, token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["account-subtypes"] });
            setSubtypeEditingId(null);
        },
    });

    const deactivateSubtypeMutation = useMutation({
        mutationFn: (id: string) => deactivateAccountSubtype(id, token),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["account-subtypes"] }),
    });

    const createTypeMutation = useMutation({
        mutationFn: (name: string) => createJournalEntryType({ name }, token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["journal-entry-types"] });
            setNewTypeName("");
            setShowAddType(false);
        },
    });

    const updateTypeMutation = useMutation({
        mutationFn: ({ id, name }: { id: string; name: string }) => updateJournalEntryType(id, { name }, token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["journal-entry-types"] });
            setTypeEditingId(null);
        },
    });

    const deactivateTypeMutation = useMutation({
        mutationFn: (id: string) => deactivateJournalEntryType(id, token),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["journal-entry-types"] }),
    });

    const createPaymentMethodTypeMutation = useMutation({
        mutationFn: (name: string) => createPaymentMethodType({ name }, token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payment-method-types"] });
            setNewPaymentMethodTypeName("");
            setShowAddPaymentMethodType(false);
        },
    });

    const updatePaymentMethodTypeMutation = useMutation({
        mutationFn: ({ id, name }: { id: string; name: string }) => updatePaymentMethodType(id, { name }, token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payment-method-types"] });
            setPaymentMethodTypeEditingId(null);
        },
    });

    const deactivatePaymentMethodTypeMutation = useMutation({
        mutationFn: (id: string) => deactivatePaymentMethodType(id, token),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payment-method-types"] }),
    });

    const saveTaxMutation = useMutation({
        mutationFn: (editor: TaxEditorState) => {
            const payload = {
                taxCode: editor.taxCode,
                taxName: editor.taxName,
                rate: Number(editor.rate),
                taxType: editor.taxType,
                taxAccountId: editor.taxAccountId || null,
                isActive: editor.isActive,
            };
            return editor.id ? updateTax(editor.id, payload, token) : createTax(payload, token);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["taxes"] });
            setTaxEditor(null);
        },
    });

    const saveTaxTreatmentMutation = useMutation({
        mutationFn: (editor: TaxTreatmentEditorState) => {
            const payload = {
                code: editor.code,
                arabicName: editor.arabicName,
                englishName: editor.englishName,
                description: editor.description || null,
                defaultTaxId: editor.defaultTaxId || null,
                isActive: editor.isActive,
            };
            return editor.id
                ? updateTaxTreatment(editor.id, payload, token)
                : createTaxTreatment(payload, token);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tax-treatments"] });
            setTaxTreatmentEditor(null);
        },
    });

    const saveCreditNoteTypeMutation = useMutation({
        mutationFn: (editor: CreditNoteTypeEditorState) => {
            const payload = {
                code: editor.code,
                name: editor.name,
                effect: editor.effect,
                linkedInvoiceRequirement: editor.linkedInvoiceRequirement,
                affectsInventory: editor.affectsInventory,
                allowsTaxAdjustment: editor.allowsTaxAdjustment,
                defaultAccountId: editor.defaultAccountId,
                helperText: editor.helperText,
                isActive: editor.isActive,
            };
            return editor.id
                ? updateCreditNoteType(editor.id, payload, token)
                : createCreditNoteType(payload, token);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["credit-note-types"] });
            setCreditNoteTypeEditor(null);
        },
    });

    const saveSupplierDebitNoteTypeMutation = useMutation({
        mutationFn: (editor: SupplierDebitNoteTypeEditorState) => {
            const payload = {
                code: editor.code,
                name: editor.name,
                effect: editor.effect,
                linkedInvoiceRequirement: editor.linkedInvoiceRequirement,
                affectsInventory: editor.affectsInventory,
                allowsTaxAdjustment: editor.allowsTaxAdjustment,
                defaultAccountId: editor.defaultAccountId,
                helperText: editor.helperText,
                isActive: editor.isActive,
            };
            return editor.id
                ? updateSupplierDebitNoteType(editor.id, payload, token)
                : createSupplierDebitNoteType(payload, token);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["supplier-debit-note-types"] });
            setSupplierDebitNoteTypeEditor(null);
        },
    });

    const deleteTaxMutation = useMutation({
        mutationFn: (id: string) => deleteTax(id, token),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["taxes"] }),
    });

    if (isLoading || isLoadingSubtypes || isLoadingTypes || isLoadingPaymentMethodTypes || isLoadingTaxes || isLoadingTaxTreatments || isLoadingCreditNoteTypes || isLoadingSupplierDebitNoteTypes) return <div className="flex items-center justify-center py-40 text-gray-500">{t("master.loading")}</div>;

    const TABS = [
        ...definitions.map((def) => ({ kind: "segment" as const, def })),
        { kind: "account-subtypes" as const, def: null },
        { kind: "journal-entry-types" as const, def: null },
        { kind: "payment-method-types" as const, def: null },
        { kind: "payment-terms" as const, def: null },
        { kind: "currencies" as const, def: null },
        { kind: "taxes" as const, def: null },
        { kind: "credit-note-types" as const, def: null },
        { kind: "supplier-debit-note-types" as const, def: null },
    ];

    const active = TABS[activeTab];
    const activeDef: SegmentDefinition | undefined = active?.kind === "segment" ? active.def : undefined;
    const openTaxEditor = (tax?: Tax) => {
        setTaxEditor(tax ? {
            id: tax.id,
            taxCode: tax.taxCode,
            taxName: tax.taxName,
            rate: String(tax.rate),
            taxType: tax.taxType,
            taxAccountId: tax.taxAccountId ?? "",
            isActive: tax.isActive,
        } : emptyTaxEditor);
    };
    const openTaxTreatmentEditor = (treatment?: TaxTreatment) => {
        setTaxTreatmentEditor(
            treatment
                ? {
                    id: treatment.id,
                    code: treatment.code,
                    arabicName: treatment.arabicName,
                    englishName: treatment.englishName,
                    description: treatment.description ?? "",
                    defaultTaxId: treatment.defaultTaxId ?? "",
                    isActive: treatment.isActive,
                }
                : emptyTaxTreatmentEditor,
        );
    };
    const openCreditNoteTypeEditor = (row?: CreditNoteType) => {
        setCreditNoteTypeEditor(
            row
                ? {
                    id: row.id,
                    code: row.code,
                    name: row.name,
                    effect: row.effect,
                    linkedInvoiceRequirement: row.linkedInvoiceRequirement,
                    affectsInventory: row.affectsInventory,
                    allowsTaxAdjustment: row.allowsTaxAdjustment,
                    defaultAccountId: row.defaultAccount?.id ?? "",
                    helperText: row.helperText ?? "",
                    isActive: row.isActive,
                }
                : emptyCreditNoteTypeEditor,
        );
    };
    const openSupplierDebitNoteTypeEditor = (row?: SupplierDebitNoteType) => {
        setSupplierDebitNoteTypeEditor(
            row
                ? {
                    id: row.id,
                    code: row.code,
                    name: row.name,
                    effect: row.effect,
                    linkedInvoiceRequirement: row.linkedInvoiceRequirement,
                    affectsInventory: row.affectsInventory,
                    allowsTaxAdjustment: row.allowsTaxAdjustment,
                    defaultAccountId: row.defaultAccount?.id ?? "",
                    helperText: row.helperText ?? "",
                    isActive: row.isActive,
                }
                : emptySupplierDebitNoteTypeEditor,
        );
    };
    const accountLabel = (account?: AccountOption | null) =>
        account ? `${account.code} - ${account.nameAr || account.name}` : t("master.taxes.noAccount");
    const selectedTaxTypeRequiresAccount = taxEditor?.taxType === "SALES" || taxEditor?.taxType === "PURCHASE";
    const taxAccountOptions = taxAccounts.filter((account) => {
        if (taxEditor?.taxType === "SALES") {
            return account.code.startsWith("212100");
        }

        if (taxEditor?.taxType === "PURCHASE") {
            return account.type === "LIABILITY";
        }

        return true;
    });
    const canSaveTax = Boolean(
        taxEditor?.taxCode.trim() &&
        taxEditor?.taxName.trim() &&
        taxEditor?.rate !== "" &&
        Number.isFinite(Number(taxEditor?.rate)) &&
        Number(taxEditor?.rate) >= 0 &&
        Number(taxEditor?.rate) <= 100 &&
        (!selectedTaxTypeRequiresAccount || taxEditor?.taxAccountId)
    );
    const canSaveTaxTreatment = Boolean(
        taxTreatmentEditor?.code.trim() &&
        taxTreatmentEditor?.arabicName.trim() &&
        taxTreatmentEditor?.englishName.trim()
    );
    const canSaveCreditNoteType = Boolean(
        creditNoteTypeEditor?.code.trim() &&
        creditNoteTypeEditor?.name.trim() &&
        creditNoteTypeEditor?.defaultAccountId
    );
    const canSaveSupplierDebitNoteType = Boolean(
        supplierDebitNoteTypeEditor?.code.trim() &&
        supplierDebitNoteTypeEditor?.name.trim() &&
        supplierDebitNoteTypeEditor?.defaultAccountId
    );

    const getActiveCategoryTitle = () => {
        if (!active) return "";
        if (active.kind === "segment") return translateSegmentName(active.def?.name || "", t);
        if (active.kind === "account-subtypes") return t("master.tab.accountSubtypes");
        if (active.kind === "journal-entry-types") return t("master.tab.journalEntryTypes");
        if (active.kind === "payment-method-types") return t("master.tab.paymentMethodTypes");
        if (active.kind === "payment-terms") return t("master.tab.paymentTerms");
        if (active.kind === "currencies") return t("master.tab.currencies");
        if (active.kind === "taxes") return t("master.tab.taxes");
        if (active.kind === "credit-note-types") return t("master.tab.creditNoteTypes");
        if (active.kind === "supplier-debit-note-types") return t("master.tab.supplierDebitNoteTypes");
        return "";
    };

    const getActiveCategoryAddButtonLabel = () => {
        if (!active) return t("master.action.add");
        if (active.kind === "segment") {
            const name = active.def?.name || "";
            const lowerName = name.toLowerCase().trim();
            if (lowerName === "الشركات" || lowerName === "company" || lowerName === "companies") return t("master.action.addCompany");
            if (lowerName === "الفروع" || lowerName === "branch" || lowerName === "branches") return t("master.action.addBranch");
            if (lowerName === "الأقسام" || lowerName === "department" || lowerName === "departments") return t("master.action.addDepartment");
            if (lowerName === "المشاريع" || lowerName === "project" || lowerName === "projects") return t("master.action.addProject");
            if (lowerName === "الحسابات الطبيعية" || lowerName === "natural account" || lowerName === "natural accounts") return t("master.action.addNaturalAccount");
        }
        if (active.kind === "account-subtypes") return t("master.action.addAccountSubtype");
        if (active.kind === "journal-entry-types") return t("master.action.addJournalEntryType");
        if (active.kind === "payment-method-types") return t("master.action.addPaymentMethodType");
        if (active.kind === "payment-terms") return t("master.action.addPaymentTerm");
        if (active.kind === "currencies") return t("master.action.addCurrency");
        if (active.kind === "taxes") return t("master.action.addTax");
        if (active.kind === "credit-note-types") return t("master.action.addCreditNoteType");
        if (active.kind === "supplier-debit-note-types") return t("master.action.addSupplierDebitNoteType");
        return `${t("master.action.add")} ${getActiveCategoryTitle()}`;
    };

    const handleAddClick = () => {
        if (!active) return;
        if (active.kind === "segment") setShowAddSegmentValue(true);
        if (active.kind === "account-subtypes") setShowAddSubtype(true);
        if (active.kind === "journal-entry-types") setShowAddType(true);
        if (active.kind === "payment-method-types") setShowAddPaymentMethodType(true);
        if (active.kind === "taxes") openTaxEditor();
        if (active.kind === "credit-note-types") openCreditNoteTypeEditor();
        if (active.kind === "supplier-debit-note-types") openSupplierDebitNoteTypeEditor();
    };

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-200 motion-reduce:animate-none bg-gray-50/50 min-h-screen">
            {/* Page Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">{t("master.title.setup")}</h1>
                    <p className="mt-1 text-sm text-gray-500 max-w-2xl">
                        {t("master.description.setup")}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="secondary" className="hidden sm:flex bg-white">
                        <Upload className="ml-2 h-4 w-4" /> {t("master.action.import")}
                    </Button>
                    <Button variant="secondary" className="hidden sm:flex bg-white">
                        <Download className="ml-2 h-4 w-4" /> {t("master.action.export")}
                    </Button>
                    <Button onClick={handleAddClick} className="bg-green-600 hover:bg-green-700 text-white border-transparent">
                        <Plus className="ml-2 h-4 w-4" /> {getActiveCategoryAddButtonLabel()}
                    </Button>
                </div>
            </div>

            {/* Progress Card */}
            <SetupProgressCard />

            {/* Summary Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {TABS.map((tab, i) => {
                    const isSubtypeTab = tab.kind === "account-subtypes";
                    const isTypeTab = tab.kind === "journal-entry-types";
                    const isPaymentMethodTypeTab = tab.kind === "payment-method-types";
                    const isPaymentTermsTab = tab.kind === "payment-terms";
                    const isCurrenciesTab = tab.kind === "currencies";
                    const isTaxTab = tab.kind === "taxes";
                    const isCreditNoteTypeTab = tab.kind === "credit-note-types";
                    const isSupplierDebitNoteTypeTab = tab.kind === "supplier-debit-note-types";
                    const def = tab.def as SegmentDefinition | null;
                    const Icon = isSubtypeTab ? BookMarked : isTypeTab ? FolderKanban : isPaymentMethodTypeTab ? Wallet : isPaymentTermsTab ? LuCreditCard : isCurrenciesTab ? LuCoins : isTaxTab ? Percent : isCreditNoteTypeTab || isSupplierDebitNoteTypeTab ? LuBadgePercent : (SEGMENT_ICONS[i] ?? Building2);
                    
                    let title = def ? translateSegmentName(def.name, t) : "";
                    let count = def?.values?.length ?? 0;
                    
                    if (isSubtypeTab) { title = t("master.tab.accountSubtypes"); count = accountSubtypes.length; }
                    if (isTypeTab) { title = t("master.tab.journalEntryTypes"); count = journalEntryTypes.length; }
                    if (isPaymentMethodTypeTab) { title = t("master.tab.paymentMethodTypes"); count = paymentMethodTypes.length; }
                    if (isPaymentTermsTab) { title = t("master.tab.paymentTerms"); count = paymentTerms.length; }
                    if (isCurrenciesTab) { title = t("master.tab.currencies"); count = currencies.length; }
                    if (isTaxTab) { title = t("master.tab.taxes"); count = taxes.length; }
                    if (isCreditNoteTypeTab) { title = t("master.tab.creditNoteTypes"); count = creditNoteTypes.length; }
                    if (isSupplierDebitNoteTypeTab) { title = t("master.tab.supplierDebitNoteTypes"); count = supplierDebitNoteTypes.length; }

                    const iconColorClass = activeTab === i ? "text-green-600" : (isSubtypeTab ? "text-emerald-500" : isTypeTab ? "text-indigo-500" : isPaymentMethodTypeTab ? "text-cyan-500" : isPaymentTermsTab ? "text-purple-500" : isCurrenciesTab ? "text-blue-500" : isTaxTab ? "text-green-500" : isCreditNoteTypeTab || isSupplierDebitNoteTypeTab ? "text-amber-500" : "text-gray-500");
                    const iconBgClass = activeTab === i ? "bg-green-100" : (isSubtypeTab ? "bg-emerald-50" : isTypeTab ? "bg-indigo-50" : isPaymentMethodTypeTab ? "bg-cyan-50" : isPaymentTermsTab ? "bg-purple-50" : isCurrenciesTab ? "bg-blue-50" : isTaxTab ? "bg-green-50" : isCreditNoteTypeTab || isSupplierDebitNoteTypeTab ? "bg-amber-50" : "bg-gray-100");

                    const key = isSubtypeTab ? "account-subtypes" : isTypeTab ? "journal-entry-types" : isPaymentMethodTypeTab ? "payment-method-types" : isPaymentTermsTab ? "payment-terms" : isCurrenciesTab ? "currencies" : isTaxTab ? "taxes" : isCreditNoteTypeTab ? "credit-note-types" : isSupplierDebitNoteTypeTab ? "supplier-debit-note-types" : def!.id;

                    return (
                        <MasterDataCard
                            key={key}
                            title={title}
                            count={count}
                            icon={Icon}
                            isActive={activeTab === i}
                            needsReview={count === 0}
                            iconColorClass={iconColorClass}
                            iconBgClass={iconBgClass}
                            onClick={() => {
                                setActiveTab(i);
                                setShowAddSegmentValue(false);
                                setSegmentEditingId(null);
                                setShowAddSubtype(false);
                                setSubtypeEditingId(null);
                                setShowAddType(false);
                                setTypeEditingId(null);
                                setShowAddPaymentMethodType(false);
                                setPaymentMethodTypeEditingId(null);
                                setTaxEditor(null);
                                setTaxTreatmentEditor(null);
                                setCreditNoteTypeEditor(null);
                                setSupplierDebitNoteTypeEditor(null);
                                setTaxSetupView("taxes");
                            }}
                        />
                    );
                })}
            </div>

            {activeDef && (
                <Card className="p-0 border border-gray-200 bg-white overflow-hidden shadow-sm">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">{translateSegmentName(activeDef.name, t)}</h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {activeDef.description || t("master.segmentValues.manage", { name: translateSegmentName(activeDef.name, t) })}
                            </p>
                        </div>
                    </div>
                    
                    <MasterDataTableToolbar searchPlaceholder={t("master.toolbar.search")} />

                    {/* Add Row */}
                    {showAddSegmentValue && (
                        <div className="border-b border-gray-200 px-6 py-4 bg-teal-500/5">
                            <div className="flex items-center gap-3">
                                <input
                                    value={newCode}
                                    onChange={e => setNewCode(e.target.value.toUpperCase())}
                                    placeholder={t("master.segmentValues.codePlaceholder")}
                                    className="w-32 rounded-lg border border-teal-500/30 bg-gray-100 px-3 py-2 text-sm font-mono text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                                />
                                <input
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder={t("master.segmentValues.namePlaceholder")}
                                    className="flex-1 rounded-lg border border-teal-500/30 bg-gray-100 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                                />
                                <button
                                    onClick={() => createMutation.mutate({ defId: activeDef.id, code: newCode, name: newName })}
                                    disabled={!newCode || !newName || createMutation.isPending}
                                    className="flex items-center gap-1.5 rounded-lg bg-teal-500 px-4 py-2 text-sm font-bold text-teal-950 hover:bg-teal-400 disabled:opacity-50 transition-all"
                                >
                                    <Check className="h-4 w-4" /> {t("common.action.save")}
                                </button>
                                <button onClick={() => setShowAddSegmentValue(false)} className="p-2 text-gray-500 hover:text-gray-900">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    <table className="w-full text-left">
                        <thead className="border-b border-gray-200 bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.code")}</th>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.name")}</th>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600 text-center">{t("common.table.status")}</th>
                                <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.actions")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {activeDef.values.length === 0 ? (
                                <tr><td colSpan={4} className="p-0"><EmptyState title={t("master.empty.title")} description={t("master.empty.description")} actionLabel={getActiveCategoryAddButtonLabel()} onAction={handleAddClick} /></td></tr>
                            ) : activeDef.values.map((val: SegmentValue) => (
                                <tr key={val.id} className="group hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        {segmentEditingId === val.id
                                            ? <input value={editCode} onChange={e => setEditCode(e.target.value.toUpperCase())} className="w-24 rounded-lg border border-teal-500/30 bg-gray-100 px-2 py-1 font-mono text-sm text-gray-900 focus:outline-none" />
                                            : <span className="font-mono text-xs font-bold text-teal-400">{val.code}</span>
                                        }
                                    </td>
                                    <td className="px-6 py-4">
                                        {segmentEditingId === val.id
                                            ? <input value={editName} onChange={e => setEditName(e.target.value)} className="rounded-lg border border-teal-500/30 bg-gray-100 px-2 py-1 text-sm text-gray-900 focus:outline-none w-64" />
                                            : <span className="text-sm font-medium text-zinc-200">{val.name}</span>
                                        }
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <StatusPill label={val.isActive ? t("common.status.active") : t("common.status.inactive")} tone={val.isActive ? "positive" : "neutral"} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {segmentEditingId === val.id ? (
                                                <>
                                                    <button onClick={() => updateMutation.mutate({ id: val.id, code: editCode, name: editName })} className="p-1.5 rounded-lg text-teal-400 hover:bg-teal-400/10">
                                                        <Check className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => setSegmentEditingId(null)} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900">
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => { setSegmentEditingId(val.id); setEditCode(val.code); setEditName(val.name); }} className="p-1.5 rounded-lg text-gray-500 hover:text-teal-400 hover:bg-teal-400/10 transition-all">
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    {val.isActive && (
                                                        <button onClick={() => { if (confirm(t("common.confirm.deactivate", { name: val.name }))) deactivateMutation.mutate(val.id); }} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all">
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}

            {active?.kind === "account-subtypes" && (
                <Card className="p-0 border border-gray-200 bg-white overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">{t("master.section.accountSubtypes.title")}</h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {t("master.section.accountSubtypes.description")}
                            </p>
                        </div>
                    </div>

                    <MasterDataTableToolbar searchPlaceholder={t("master.toolbar.search")} />

                    {showAddSubtype && (
                        <div className="border-b border-gray-200 px-6 py-4 bg-emerald-500/5">
                            <div className="flex items-center gap-3">
                                <input
                                    value={newSubtypeName}
                                    onChange={(e) => setNewSubtypeName(e.target.value)}
                                    placeholder={t("master.accountSubtypes.namePlaceholder")}
                                    className="flex-1 rounded-lg border border-emerald-500/30 bg-gray-100 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                />
                                <button
                                    onClick={() => createSubtypeMutation.mutate(newSubtypeName)}
                                    disabled={!newSubtypeName.trim() || createSubtypeMutation.isPending}
                                    className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-emerald-950 hover:bg-emerald-400 disabled:opacity-50 transition-all"
                                >
                                    <Check className="h-4 w-4" /> {t("common.action.save")}
                                </button>
                                <button onClick={() => setShowAddSubtype(false)} className="p-2 text-gray-500 hover:text-gray-900">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            {createSubtypeMutation.isError && (
                                <div className="mt-2 text-xs text-red-400">
                                    {(createSubtypeMutation.error as Error).message || t("master.accountSubtypes.createError")}
                                </div>
                            )}
                        </div>
                    )}

                    <table className="w-full text-left">
                        <thead className="border-b border-gray-200 bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.name")}</th>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600 text-center">{t("common.table.status")}</th>
                                <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.actions")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {accountSubtypes.length === 0 ? (
                                <tr><td colSpan={3} className="p-0"><EmptyState title={t("master.empty.title")} description={t("master.empty.description")} actionLabel={getActiveCategoryAddButtonLabel()} onAction={handleAddClick} /></td></tr>
                            ) : accountSubtypes.map((row: AccountSubtype) => (
                                <tr key={row.id} className="group hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        {subtypeEditingId === row.id ? (
                                            <input
                                                value={editSubtypeName}
                                                onChange={(e) => setEditSubtypeName(e.target.value)}
                                                className="rounded-lg border border-emerald-500/30 bg-gray-100 px-2 py-1 text-sm text-gray-900 focus:outline-none w-64"
                                            />
                                        ) : (
                                            <span className="text-sm font-medium text-zinc-200">{row.name}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <StatusPill label={row.isActive ? t("common.status.active") : t("common.status.inactive")} tone={row.isActive ? "positive" : "neutral"} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {subtypeEditingId === row.id ? (
                                                <>
                                                    <button
                                                        onClick={() => updateSubtypeMutation.mutate({ id: row.id, name: editSubtypeName })}
                                                        className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-400/10"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => setSubtypeEditingId(null)} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900">
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => { setSubtypeEditingId(row.id); setEditSubtypeName(row.name); }}
                                                        className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-400 hover:bg-emerald-400/10 transition-all"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    {row.isActive && (
                                                        <button
                                                            onClick={() => { if (confirm(t("common.confirm.deactivate", { name: row.name }))) deactivateSubtypeMutation.mutate(row.id); }}
                                                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}

            {active?.kind === "journal-entry-types" && (
                <Card className="p-0 border border-gray-200 bg-white overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">{t("master.section.journalEntryTypes.title")}</h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {t("master.section.journalEntryTypes.description")}
                            </p>
                        </div>
                    </div>

                    <MasterDataTableToolbar searchPlaceholder={t("master.toolbar.search")} />

                    {showAddType && (
                        <div className="border-b border-gray-200 px-6 py-4 bg-indigo-500/5">
                            <div className="flex items-center gap-3">
                                <input
                                    value={newTypeName}
                                    onChange={(e) => setNewTypeName(e.target.value)}
                                    placeholder={t("master.journalEntryTypes.namePlaceholder")}
                                    className="flex-1 rounded-lg border border-indigo-500/30 bg-gray-100 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                />
                                <button
                                    onClick={() => createTypeMutation.mutate(newTypeName)}
                                    disabled={!newTypeName.trim() || createTypeMutation.isPending}
                                    className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-bold text-indigo-950 hover:bg-indigo-400 disabled:opacity-50 transition-all"
                                >
                                    <Check className="h-4 w-4" /> {t("common.action.save")}
                                </button>
                                <button onClick={() => setShowAddType(false)} className="p-2 text-gray-500 hover:text-gray-900">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            {createTypeMutation.isError && (
                                <div className="mt-2 text-xs text-red-400">
                                    {(createTypeMutation.error as Error).message || t("master.journalEntryTypes.createError")}
                                </div>
                            )}
                        </div>
                    )}

                    <table className="w-full text-left">
                        <thead className="border-b border-gray-200 bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.name")}</th>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600 text-center">{t("common.table.status")}</th>
                                <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.actions")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {journalEntryTypes.length === 0 ? (
                                <tr><td colSpan={3} className="p-0"><EmptyState title={t("master.empty.title")} description={t("master.empty.description")} actionLabel={getActiveCategoryAddButtonLabel()} onAction={handleAddClick} /></td></tr>
                            ) : journalEntryTypes.map((row: JournalEntryType) => (
                                <tr key={row.id} className="group hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        {typeEditingId === row.id ? (
                                            <input
                                                value={editTypeName}
                                                onChange={(e) => setEditTypeName(e.target.value)}
                                                className="rounded-lg border border-indigo-500/30 bg-gray-100 px-2 py-1 text-sm text-gray-900 focus:outline-none w-64"
                                            />
                                        ) : (
                                            <span className="text-sm font-medium text-zinc-200">{row.name}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <StatusPill label={row.isActive ? t("common.status.active") : t("common.status.inactive")} tone={row.isActive ? "positive" : "neutral"} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {typeEditingId === row.id ? (
                                                <>
                                                    <button
                                                        onClick={() => updateTypeMutation.mutate({ id: row.id, name: editTypeName })}
                                                        className="p-1.5 rounded-lg text-indigo-400 hover:bg-indigo-400/10"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => setTypeEditingId(null)} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900">
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => { setTypeEditingId(row.id); setEditTypeName(row.name); }}
                                                        className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-400 hover:bg-indigo-400/10 transition-all"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    {row.isActive && (
                                                        <button
                                                            onClick={() => { if (confirm(t("common.confirm.deactivate", { name: row.name }))) deactivateTypeMutation.mutate(row.id); }}
                                                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}

            {active?.kind === "payment-method-types" && (
                <Card className="p-0 border border-gray-200 bg-white overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">{t("master.section.paymentMethodTypes.title")}</h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {t("master.section.paymentMethodTypes.description")}
                            </p>
                        </div>
                    </div>

                    <MasterDataTableToolbar searchPlaceholder={t("master.toolbar.search")} />

                    {showAddPaymentMethodType && (
                        <div className="border-b border-gray-200 px-6 py-4 bg-cyan-500/5">
                            <div className="flex items-center gap-3">
                                <input
                                    value={newPaymentMethodTypeName}
                                    onChange={(e) => setNewPaymentMethodTypeName(e.target.value)}
                                    placeholder={t("master.paymentMethodTypes.namePlaceholder")}
                                    className="flex-1 rounded-lg border border-cyan-500/30 bg-gray-100 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                                />
                                <button
                                    onClick={() => createPaymentMethodTypeMutation.mutate(newPaymentMethodTypeName)}
                                    disabled={!newPaymentMethodTypeName.trim() || createPaymentMethodTypeMutation.isPending}
                                    className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-cyan-950 hover:bg-cyan-400 disabled:opacity-50 transition-all"
                                >
                                    <Check className="h-4 w-4" /> {t("common.action.save")}
                                </button>
                                <button onClick={() => setShowAddPaymentMethodType(false)} className="p-2 text-gray-500 hover:text-gray-900">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            {createPaymentMethodTypeMutation.isError && (
                                <div className="mt-2 text-xs text-red-400">
                                    {(createPaymentMethodTypeMutation.error as Error).message || t("master.paymentMethodTypes.createError")}
                                </div>
                            )}
                        </div>
                    )}

                    <table className="w-full text-left">
                        <thead className="border-b border-gray-200 bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.name")}</th>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600 text-center">{t("common.table.status")}</th>
                                <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.actions")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {paymentMethodTypes.length === 0 ? (
                                <tr><td colSpan={3} className="p-0"><EmptyState title={t("master.empty.title")} description={t("master.empty.description")} actionLabel={getActiveCategoryAddButtonLabel()} onAction={handleAddClick} /></td></tr>
                            ) : paymentMethodTypes.map((row: PaymentMethodType) => (
                                <tr key={row.id} className="group hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        {paymentMethodTypeEditingId === row.id ? (
                                            <input
                                                value={editPaymentMethodTypeName}
                                                onChange={(e) => setEditPaymentMethodTypeName(e.target.value)}
                                                className="rounded-lg border border-cyan-500/30 bg-gray-100 px-2 py-1 text-sm text-gray-900 focus:outline-none w-64"
                                            />
                                        ) : (
                                            <span className="text-sm font-medium text-zinc-200">{row.name}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <StatusPill label={row.isActive ? t("common.status.active") : t("common.status.inactive")} tone={row.isActive ? "positive" : "neutral"} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {paymentMethodTypeEditingId === row.id ? (
                                                <>
                                                    <button
                                                        onClick={() => updatePaymentMethodTypeMutation.mutate({ id: row.id, name: editPaymentMethodTypeName })}
                                                        className="p-1.5 rounded-lg text-cyan-400 hover:bg-cyan-400/10"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => setPaymentMethodTypeEditingId(null)} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900">
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => { setPaymentMethodTypeEditingId(row.id); setEditPaymentMethodTypeName(row.name); }}
                                                        className="p-1.5 rounded-lg text-gray-500 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    {row.isActive && (
                                                        <button
                                                            onClick={() => { if (confirm(t("common.confirm.deactivate", { name: row.name }))) deactivatePaymentMethodTypeMutation.mutate(row.id); }}
                                                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}

            {active?.kind === "payment-terms" && <PaymentTermsTab />}

            {active?.kind === "currencies" && <CurrenciesTab />}

            {active?.kind === "credit-note-types" && (
                <Card className="p-0 border border-gray-200 bg-white overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">{t("master.tab.creditNoteTypes")}</h2>
                            <p className="mt-0.5 text-xs text-gray-500">
                                {t("master.section.creditNoteTypes.description")}
                            </p>
                        </div>
                    </div>
                    
                    <MasterDataTableToolbar searchPlaceholder={t("master.toolbar.search")} />
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-gray-200 bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.code")}</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.name")}</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("master.column.effect")}</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("master.column.requiresInvoice")}</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("master.column.affectsInventory")}</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("master.column.allowsTaxAdjustment")}</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("master.column.defaultAccount")}</th>
                                    <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.status")}</th>
                                    <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.actions")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {creditNoteTypes.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="p-0">
                                            <EmptyState title={t("master.empty.title")} description={t("master.empty.description")} actionLabel={getActiveCategoryAddButtonLabel()} onAction={handleAddClick} />
                                        </td>
                                    </tr>
                                ) : creditNoteTypes.map((row) => (
                                    <tr key={row.id} className="group transition-colors hover:bg-gray-50">
                                        <td className="px-6 py-4"><span className="font-mono text-xs font-bold text-amber-700">{row.code}</span></td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{describeCreditNoteEffect(row.effect, t)}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{row.linkedInvoiceRequirement === "REQUIRED" ? t("common.yes") : t("common.optional")}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{row.affectsInventory ? t("common.yes") : t("common.no")}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{row.allowsTaxAdjustment ? t("common.yes") : t("common.no")}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{accountLabel(row.defaultAccount)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <StatusPill label={row.isActive ? t("common.status.active") : t("common.status.inactive")} tone={row.isActive ? "positive" : "neutral"} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openCreditNoteTypeEditor(row)}
                                                    className="rounded-lg p-1.5 text-gray-500 transition-all hover:bg-green-400/10 hover:text-green-600"
                                                    title={t("common.action.edit")}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {active?.kind === "supplier-debit-note-types" && (
                <Card className="p-0 border border-gray-200 bg-white overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">{t("master.tab.supplierDebitNoteTypes")}</h2>
                            <p className="mt-0.5 text-xs text-gray-500">
                                {t("master.section.supplierDebitNoteTypes.description")}
                            </p>
                        </div>
                    </div>
                    
                    <MasterDataTableToolbar searchPlaceholder={t("master.toolbar.search")} />

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-gray-200 bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.code")}</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.name")}</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("master.column.effect")}</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("master.column.requiresSupplierInvoice")}</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("master.column.affectsInventory")}</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("master.column.allowsTaxAdjustment")}</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("master.column.defaultAccount")}</th>
                                    <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.status")}</th>
                                    <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.actions")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {supplierDebitNoteTypes.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="p-0">
                                            <EmptyState title={t("master.empty.title")} description={t("master.empty.description")} actionLabel={getActiveCategoryAddButtonLabel()} onAction={handleAddClick} />
                                        </td>
                                    </tr>
                                ) : supplierDebitNoteTypes.map((row) => (
                                    <tr key={row.id} className="group transition-colors hover:bg-gray-50">
                                        <td className="px-6 py-4"><span className="font-mono text-xs font-bold text-amber-700">{row.code}</span></td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{describeCreditNoteEffect(row.effect, t)}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{row.linkedInvoiceRequirement === "REQUIRED" ? t("common.yes") : t("common.optional")}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{row.affectsInventory ? t("common.yes") : t("common.no")}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{row.allowsTaxAdjustment ? t("common.yes") : t("common.no")}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{accountLabel(row.defaultAccount)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <StatusPill label={row.isActive ? t("common.status.active") : t("common.status.inactive")} tone={row.isActive ? "positive" : "neutral"} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openSupplierDebitNoteTypeEditor(row)}
                                                    className="rounded-lg p-1.5 text-gray-500 transition-all hover:bg-green-400/10 hover:text-green-600"
                                                    title={t("common.action.edit")}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {active?.kind === "taxes" && (
                <Card className="p-0 border border-gray-200 bg-white overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">{t("master.section.taxes.title")}</h2>
                            <p className="text-xs text-gray-500 mt-0.5">{t("master.section.taxes.description")}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 border-b border-gray-200 px-6 py-4">
                        <button
                            type="button"
                            onClick={() => {
                                setTaxSetupView("taxes");
                                setTaxEditor(null);
                                setTaxTreatmentEditor(null);
                            }}
                            className={cn(
                                "rounded-xl border px-4 py-2 text-sm font-bold transition-all",
                                taxSetupView === "taxes"
                                    ? "border-green-500 bg-green-50 text-green-700"
                                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                            )}
                        >
                            {t("master.tab.taxes")}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setTaxSetupView("treatments");
                                setTaxEditor(null);
                                setTaxTreatmentEditor(null);
                            }}
                            className={cn(
                                "rounded-xl border px-4 py-2 text-sm font-bold transition-all",
                                taxSetupView === "treatments"
                                    ? "border-green-500 bg-green-50 text-green-700"
                                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                            )}
                        >
                            {t("master.tab.taxTreatments")}
                        </button>
                    </div>

                    {taxSetupView === "taxes" && isTaxesError && (
                        <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">
                            {(taxesError as Error)?.message || t("master.taxes.error")}
                        </div>
                    )}
                    {taxSetupView === "treatments" && isTaxTreatmentsError && (
                        <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">
                            {(taxTreatmentsError as Error)?.message || t("master.taxTreatments.error")}
                        </div>
                    )}

                    <MasterDataTableToolbar searchPlaceholder={t("master.toolbar.search")} />

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            {taxSetupView === "taxes" ? (
                                <>
                                    <thead className="border-b border-gray-200 bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("master.taxes.taxCode")}</th>
                                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("master.taxes.taxName")}</th>
                                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("master.taxes.rate")}</th>
                                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("master.taxes.taxType")}</th>
                                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("master.taxes.taxAccount")}</th>
                                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600 text-center">{t("common.table.status")}</th>
                                            <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.actions")}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {taxes.length === 0 ? (
                                            <tr><td colSpan={7} className="p-0"><EmptyState title={t("master.empty.title")} description={t("master.empty.description")} actionLabel={t("master.section.taxes.add")} onAction={() => openTaxEditor()} /></td></tr>
                                        ) : taxes.map((tax) => (
                                            <tr key={tax.id} className="group hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4"><span className="font-mono text-xs font-bold text-green-600">{tax.taxCode}</span></td>
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">{tax.taxName}</td>
                                                <td className="px-6 py-4 text-sm text-gray-700">{Number(tax.rate).toFixed(2)}%</td>
                                                <td className="px-6 py-4 text-sm text-gray-700">{t(`master.taxes.type.${tax.taxType}`)}</td>
                                                <td className="px-6 py-4 text-sm text-gray-700">{accountLabel(tax.taxAccount)}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <StatusPill label={tax.isActive ? t("common.status.active") : t("common.status.inactive")} tone={tax.isActive ? "positive" : "neutral"} />
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => openTaxEditor(tax)}
                                                            className="p-1.5 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-400/10 transition-all"
                                                            title={t("common.action.edit")}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (confirm(t("common.confirm.delete", { name: tax.taxName }))) deleteTaxMutation.mutate(tax.id);
                                                            }}
                                                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-400/10 transition-all"
                                                            title={t("common.action.delete")}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </>
                            ) : (
                                <>
                                    <thead className="border-b border-gray-200 bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("master.taxTreatments.code")}</th>
                                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("master.taxTreatments.arabicName")}</th>
                                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("master.taxTreatments.englishName")}</th>
                                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("master.taxTreatments.defaultTax")}</th>
                                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600 text-center">{t("common.table.status")}</th>
                                            <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-600">{t("common.table.actions")}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {taxTreatments.length === 0 ? (
                                            <tr><td colSpan={6} className="p-0"><EmptyState title={t("master.empty.title")} description={t("master.empty.description")} actionLabel={t("master.section.taxTreatments.add")} onAction={() => openTaxTreatmentEditor()} /></td></tr>
                                        ) : taxTreatments.map((treatment) => (
                                            <tr key={treatment.id} className="group hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4"><span className="font-mono text-xs font-bold text-green-600">{treatment.code}</span></td>
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">{treatment.arabicName}</td>
                                                <td className="px-6 py-4 text-sm text-gray-700">{treatment.englishName}</td>
                                                <td className="px-6 py-4 text-sm text-gray-700">{treatment.defaultTax ? `${treatment.defaultTax.taxCode} - ${treatment.defaultTax.taxName}` : t("master.taxTreatments.noDefaultTax")}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <StatusPill label={treatment.isActive ? t("common.status.active") : t("common.status.inactive")} tone={treatment.isActive ? "positive" : "neutral"} />
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => openTaxTreatmentEditor(treatment)}
                                                            className="p-1.5 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-400/10 transition-all"
                                                            title={t("common.action.edit")}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </>
                            )}
                        </table>
                    </div>
                    {taxSetupView === "taxes" && deleteTaxMutation.isError && (
                        <div className="border-t border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">
                            {(deleteTaxMutation.error as Error).message || t("master.taxes.deleteError")}
                        </div>
                    )}
                </Card>
            )}

            {taxEditor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                            <h3 className="text-base font-bold text-gray-900">
                                {taxEditor.id ? t("master.taxes.modal.editTitle") : t("master.taxes.modal.createTitle")}
                            </h3>
                            <button onClick={() => setTaxEditor(null)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
                            <Field label={t("master.taxes.taxCode")}>
                                <input
                                    value={taxEditor.taxCode}
                                    onChange={(event) => setTaxEditor((current) => current && ({ ...current, taxCode: event.target.value.toUpperCase() }))}
                                    placeholder={t("master.taxes.codePlaceholder")}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                />
                            </Field>
                            <Field label={t("master.taxes.taxName")}>
                                <input
                                    value={taxEditor.taxName}
                                    onChange={(event) => setTaxEditor((current) => current && ({ ...current, taxName: event.target.value }))}
                                    placeholder={t("master.taxes.namePlaceholder")}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                />
                            </Field>
                            <Field label={t("master.taxes.rate")}>
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={taxEditor.rate}
                                    onChange={(event) => setTaxEditor((current) => current && ({ ...current, rate: event.target.value }))}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                />
                            </Field>
                            <Field label={t("master.taxes.taxType")}>
                                <select
                                    value={taxEditor.taxType}
                                    onChange={(event) => setTaxEditor((current) => current && ({ ...current, taxType: event.target.value as TaxType, taxAccountId: ["ZERO_RATED", "EXEMPT", "OUT_OF_SCOPE"].includes(event.target.value) ? "" : current.taxAccountId }))}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                >
                                    {TAX_TYPES.map((type) => <option key={type} value={type}>{t(`master.taxes.type.${type}`)}</option>)}
                                </select>
                            </Field>
                            <Field label={t("master.taxes.taxAccount")}>
                                <select
                                    value={taxEditor.taxAccountId}
                                    onChange={(event) => setTaxEditor((current) => current && ({ ...current, taxAccountId: event.target.value }))}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                >
                                    <option value="">{t("master.taxes.accountPlaceholder")}</option>
                                    {taxAccountOptions.map((account) => <option key={account.id} value={account.id}>{accountLabel(account)}</option>)}
                                </select>
                            </Field>
                            <Field label={t("common.table.status")}>
                                <select
                                    value={taxEditor.isActive ? "true" : "false"}
                                    onChange={(event) => setTaxEditor((current) => current && ({ ...current, isActive: event.target.value === "true" }))}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                >
                                    <option value="true">{t("master.taxes.active")}</option>
                                    <option value="false">{t("master.taxes.inactive")}</option>
                                </select>
                            </Field>
                        </div>
                        {saveTaxMutation.isError && (
                            <div className="mx-6 mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {(saveTaxMutation.error as Error).message || t("master.taxes.saveError")}
                            </div>
                        )}
                        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
                            <Button variant="secondary" onClick={() => setTaxEditor(null)}>{t("common.action.cancel")}</Button>
                            <Button onClick={() => saveTaxMutation.mutate(taxEditor)} disabled={!canSaveTax || saveTaxMutation.isPending}>
                                <Check className="h-4 w-4 mr-2" /> {t("common.action.save")}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {taxTreatmentEditor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                            <h3 className="text-base font-bold text-gray-900">
                                {taxTreatmentEditor.id ? t("master.taxTreatments.modal.editTitle") : t("master.taxTreatments.modal.createTitle")}
                            </h3>
                            <button onClick={() => setTaxTreatmentEditor(null)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
                            <Field label={t("master.taxTreatments.code")}>
                                <input
                                    value={taxTreatmentEditor.code}
                                    onChange={(event) => setTaxTreatmentEditor((current) => current && ({ ...current, code: event.target.value.toUpperCase() }))}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                />
                            </Field>
                            <Field label={t("master.taxTreatments.defaultTax")}>
                                <select
                                    value={taxTreatmentEditor.defaultTaxId}
                                    onChange={(event) => setTaxTreatmentEditor((current) => current && ({ ...current, defaultTaxId: event.target.value }))}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                >
                                    <option value="">{t("master.taxTreatments.defaultTaxPlaceholder")}</option>
                                    {taxes.map((tax) => <option key={tax.id} value={tax.id}>{tax.taxCode} - {tax.taxName}</option>)}
                                </select>
                            </Field>
                            <Field label={t("master.taxTreatments.arabicName")}>
                                <input
                                    value={taxTreatmentEditor.arabicName}
                                    onChange={(event) => setTaxTreatmentEditor((current) => current && ({ ...current, arabicName: event.target.value }))}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                />
                            </Field>
                            <Field label={t("master.taxTreatments.englishName")}>
                                <input
                                    value={taxTreatmentEditor.englishName}
                                    onChange={(event) => setTaxTreatmentEditor((current) => current && ({ ...current, englishName: event.target.value }))}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                />
                            </Field>
                            <div className="sm:col-span-2">
                                <Field label={t("master.taxTreatments.description")}>
                                    <textarea
                                        value={taxTreatmentEditor.description}
                                        onChange={(event) => setTaxTreatmentEditor((current) => current && ({ ...current, description: event.target.value }))}
                                        className="min-h-24 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                    />
                                </Field>
                            </div>
                            <Field label={t("common.table.status")}>
                                <select
                                    value={taxTreatmentEditor.isActive ? "true" : "false"}
                                    onChange={(event) => setTaxTreatmentEditor((current) => current && ({ ...current, isActive: event.target.value === "true" }))}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                >
                                    <option value="true">{t("common.status.active")}</option>
                                    <option value="false">{t("common.status.inactive")}</option>
                                </select>
                            </Field>
                        </div>
                        {saveTaxTreatmentMutation.isError && (
                            <div className="mx-6 mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {(saveTaxTreatmentMutation.error as Error).message || t("master.taxTreatments.saveError")}
                            </div>
                        )}
                        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
                            <Button variant="secondary" onClick={() => setTaxTreatmentEditor(null)}>{t("common.action.cancel")}</Button>
                            <Button onClick={() => saveTaxTreatmentMutation.mutate(taxTreatmentEditor)} disabled={!canSaveTaxTreatment || saveTaxTreatmentMutation.isPending}>
                                <Check className="h-4 w-4 mr-2" /> {t("common.action.save")}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {creditNoteTypeEditor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                            <h3 className="text-base font-bold text-gray-900">
                                {creditNoteTypeEditor.id ? t("master.creditNoteType.editTitle") : t("master.creditNoteType.createTitle")}
                            </h3>
                            <button onClick={() => setCreditNoteTypeEditor(null)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
                            <Field label={t("common.table.code")}>
                                <input
                                    value={creditNoteTypeEditor.code}
                                    onChange={(event) => setCreditNoteTypeEditor((current) => current && ({ ...current, code: event.target.value.toUpperCase() }))}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                />
                            </Field>
                            <Field label={t("common.table.name")}>
                                <input
                                    value={creditNoteTypeEditor.name}
                                    onChange={(event) => setCreditNoteTypeEditor((current) => current && ({ ...current, name: event.target.value }))}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                />
                            </Field>
                            <Field label={t("master.column.effect")}>
                                <select
                                    value={creditNoteTypeEditor.effect}
                                    onChange={(event) => setCreditNoteTypeEditor((current) => current && ({ ...current, effect: event.target.value as CreditNoteTypeEffect }))}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                >
                                    <option value="FINANCIAL_ONLY">{t("master.creditNoteEffect.financialOnly")}</option>
                                    <option value="FINANCIAL_INVENTORY">{t("master.creditNoteEffect.financialInventory")}</option>
                                    <option value="TAX_ONLY">{t("master.creditNoteEffect.taxOnly")}</option>
                                </select>
                            </Field>
                            <Field label={t("master.column.requiresInvoice")}>
                                <select
                                    value={creditNoteTypeEditor.linkedInvoiceRequirement}
                                    onChange={(event) => setCreditNoteTypeEditor((current) => current && ({ ...current, linkedInvoiceRequirement: event.target.value as CreditNoteLinkedInvoiceRequirement }))}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                >
                                    <option value="REQUIRED">{t("master.invoiceRequirement.required")}</option>
                                    <option value="OPTIONAL">{t("master.invoiceRequirement.optional")}</option>
                                </select>
                            </Field>
                            <Field label={t("master.column.defaultAccount")}>
                                <select
                                    value={creditNoteTypeEditor.defaultAccountId}
                                    onChange={(event) => setCreditNoteTypeEditor((current) => current && ({ ...current, defaultAccountId: event.target.value }))}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                >
                                    <option value="">{t("master.column.selectDefaultAccount")}</option>
                                    {creditNoteDefaultAccounts.map((account) => (
                                        <option key={account.id} value={account.id}>{accountLabel(account)}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label={t("common.table.status")}>
                                <select
                                    value={creditNoteTypeEditor.isActive ? "true" : "false"}
                                    onChange={(event) => setCreditNoteTypeEditor((current) => current && ({ ...current, isActive: event.target.value === "true" }))}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                >
                                    <option value="true">{t("common.status.active")}</option>
                                    <option value="false">{t("common.status.inactive")}</option>
                                </select>
                            </Field>
                            <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-3 text-sm font-medium text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={creditNoteTypeEditor.affectsInventory}
                                    onChange={(event) => setCreditNoteTypeEditor((current) => current && ({ ...current, affectsInventory: event.target.checked }))}
                                />
                                {t("master.checkbox.affectsInventory")}
                            </label>
                            <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-3 text-sm font-medium text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={creditNoteTypeEditor.allowsTaxAdjustment}
                                    onChange={(event) => setCreditNoteTypeEditor((current) => current && ({ ...current, allowsTaxAdjustment: event.target.checked }))}
                                />
                                {t("master.checkbox.allowsTaxAdjustment")}
                            </label>
                            <div className="sm:col-span-2">
                                <Field label={t("master.column.helperText")}>
                                    <textarea
                                        value={creditNoteTypeEditor.helperText}
                                        onChange={(event) => setCreditNoteTypeEditor((current) => current && ({ ...current, helperText: event.target.value }))}
                                        className="min-h-24 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                    />
                                </Field>
                            </div>
                        </div>
                        {saveCreditNoteTypeMutation.isError && (
                            <div className="mx-6 mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {(saveCreditNoteTypeMutation.error as Error).message || t("master.creditNoteType.saveError")}
                            </div>
                        )}
                        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
                            <Button variant="secondary" onClick={() => setCreditNoteTypeEditor(null)}>{t("common.action.cancel")}</Button>
                            <Button onClick={() => saveCreditNoteTypeMutation.mutate(creditNoteTypeEditor)} disabled={!canSaveCreditNoteType || saveCreditNoteTypeMutation.isPending}>
                                <Check className="mr-2 h-4 w-4" /> {t("common.action.save")}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {supplierDebitNoteTypeEditor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                            <h3 className="text-base font-bold text-gray-900">
                                {supplierDebitNoteTypeEditor.id ? t("master.supplierDebitNoteType.editTitle") : t("master.supplierDebitNoteType.createTitle")}
                            </h3>
                            <button onClick={() => setSupplierDebitNoteTypeEditor(null)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
                            <Field label={t("common.table.code")}>
                                <input
                                    value={supplierDebitNoteTypeEditor.code}
                                    onChange={(event) => setSupplierDebitNoteTypeEditor((current) => current && ({ ...current, code: event.target.value.toUpperCase() }))}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                />
                            </Field>
                            <Field label={t("common.table.name")}>
                                <input
                                    value={supplierDebitNoteTypeEditor.name}
                                    onChange={(event) => setSupplierDebitNoteTypeEditor((current) => current && ({ ...current, name: event.target.value }))}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                />
                            </Field>
                            <Field label={t("master.column.effect")}>
                                <select
                                    value={supplierDebitNoteTypeEditor.effect}
                                    onChange={(event) => setSupplierDebitNoteTypeEditor((current) => current && ({ ...current, effect: event.target.value as CreditNoteTypeEffect }))}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                >
                                    <option value="FINANCIAL_ONLY">{t("master.creditNoteEffect.financialOnly")}</option>
                                    <option value="FINANCIAL_INVENTORY">{t("master.creditNoteEffect.financialInventory")}</option>
                                    <option value="TAX_ONLY">{t("master.creditNoteEffect.taxOnly")}</option>
                                </select>
                            </Field>
                            <Field label={t("master.column.requiresSupplierInvoice")}>
                                <select
                                    value={supplierDebitNoteTypeEditor.linkedInvoiceRequirement}
                                    onChange={(event) => setSupplierDebitNoteTypeEditor((current) => current && ({ ...current, linkedInvoiceRequirement: event.target.value as CreditNoteLinkedInvoiceRequirement }))}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                >
                                    <option value="REQUIRED">{t("master.invoiceRequirement.required")}</option>
                                    <option value="OPTIONAL">{t("master.invoiceRequirement.optional")}</option>
                                </select>
                            </Field>
                            <Field label={t("master.column.defaultAccount")}>
                                <select
                                    value={supplierDebitNoteTypeEditor.defaultAccountId}
                                    onChange={(event) => setSupplierDebitNoteTypeEditor((current) => current && ({ ...current, defaultAccountId: event.target.value }))}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                >
                                    <option value="">{t("master.column.selectDefaultAccount")}</option>
                                    {creditNoteDefaultAccounts.map((account) => (
                                        <option key={account.id} value={account.id}>{accountLabel(account)}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label={t("common.table.status")}>
                                <select
                                    value={supplierDebitNoteTypeEditor.isActive ? "true" : "false"}
                                    onChange={(event) => setSupplierDebitNoteTypeEditor((current) => current && ({ ...current, isActive: event.target.value === "true" }))}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                >
                                    <option value="true">{t("common.status.active")}</option>
                                    <option value="false">{t("common.status.inactive")}</option>
                                </select>
                            </Field>
                            <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-3 text-sm font-medium text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={supplierDebitNoteTypeEditor.affectsInventory}
                                    onChange={(event) => setSupplierDebitNoteTypeEditor((current) => current && ({ ...current, affectsInventory: event.target.checked }))}
                                />
                                {t("master.checkbox.affectsInventory")}
                            </label>
                            <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-3 text-sm font-medium text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={supplierDebitNoteTypeEditor.allowsTaxAdjustment}
                                    onChange={(event) => setSupplierDebitNoteTypeEditor((current) => current && ({ ...current, allowsTaxAdjustment: event.target.checked }))}
                                />
                                {t("master.checkbox.allowsTaxAdjustment")}
                            </label>
                            <div className="sm:col-span-2">
                                <Field label={t("master.column.helperText")}>
                                    <textarea
                                        value={supplierDebitNoteTypeEditor.helperText}
                                        onChange={(event) => setSupplierDebitNoteTypeEditor((current) => current && ({ ...current, helperText: event.target.value }))}
                                        className="min-h-24 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                                    />
                                </Field>
                            </div>
                        </div>
                        {saveSupplierDebitNoteTypeMutation.isError && (
                            <div className="mx-6 mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {(saveSupplierDebitNoteTypeMutation.error as Error).message || t("master.supplierDebitNoteType.saveError")}
                            </div>
                        )}
                        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
                            <Button variant="secondary" onClick={() => setSupplierDebitNoteTypeEditor(null)}>{t("common.action.cancel")}</Button>
                            <Button onClick={() => saveSupplierDebitNoteTypeMutation.mutate(supplierDebitNoteTypeEditor)} disabled={!canSaveSupplierDebitNoteType || saveSupplierDebitNoteTypeMutation.isPending}>
                                <Check className="mr-2 h-4 w-4" /> {t("common.action.save")}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <HelperPanels />
        </div>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</span>
            {children}
        </label>
    );
}
