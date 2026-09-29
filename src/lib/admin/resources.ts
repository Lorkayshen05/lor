import "server-only";
import { Prisma } from "@/generated/prisma/client";
import {
  AdSlot, AdType, ArticleStatus, ClaimStatus, CategoryKind, DataSource, ModerationStatus, Placement,
  PaymentProvider, PlanTier, Role, SubscriptionStatus,
} from "@/generated/prisma/enums";
import type { Actor } from "@/lib/auth/errors";
import { approveClaim, rejectClaim } from "@/lib/services/claims";
import { approveDeal, rejectDeal } from "@/lib/services/deals";
import { moderateReview } from "@/lib/services/reviews";
import { updateLeadStatus } from "@/lib/services/leads";
import { db } from "@/lib/db";

export type Option = { value: string; label: string };
type RelationKey = "business" | "branch" | "category" | "storeType" | "productCategory" | "product" | "area" | "plan" | "user";

export type FieldDef = {
  name: string;
  label: string;
  type: "text" | "textarea" | "int" | "float" | "money" | "boolean" | "select" | "relation" | "multirelation" | "datetime" | "json" | "url" | "slug" | "phone";
  required?: boolean;
  /** Column is NOT NULL with a DB default: a blank input is omitted instead of being sent as null. */
  notNull?: boolean;
  help?: string;
  options?: Option[];
  relation?: RelationKey;
  slugFrom?: string;
  max?: number;
  jsonCheck?: (v: unknown) => string | null;
};

export type Column = { label: string; path: string; format?: "date" | "money" | "bool" | "badge" | "trunc" };
type Row = Record<string, unknown>;

export type RowAction = { key: string; label: string; show?: (row: Row) => boolean; run: (actor: Actor, id: string) => Promise<unknown> };

export type ResourceDef = {
  key: string;
  label: string;
  singular: string;
  model: string;
  group: "Moderation" | "Directory" | "Growth" | "People";
  fields: FieldDef[];
  columns: Column[];
  search?: string[];
  orderBy: Record<string, "asc" | "desc">;
  include?: Record<string, unknown>;
  statusFilter?: { field: string; options: string[] };
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  defaults?: Record<string, unknown>;
  rowActions?: RowAction[];
  /** Adjust the parsed data before saving (stamps, derived fields). */
  beforeSave?: (data: Record<string, unknown>, ctx: { actor: Actor; id: string | null; mode: "create" | "update" }) => void | string;
};

const opts = (o: Record<string, string>): Option[] => Object.values(o).map((v) => ({ value: v, label: v.replaceAll("_", " ").toLowerCase() }));

const faqCheck = (v: unknown) =>
  Array.isArray(v) && v.every((x) => x && typeof x.q === "string" && typeof x.a === "string") ? null : 'Must be a JSON array like [{"q":"…","a":"…"}]';
const stringsCheck = (v: unknown) => (Array.isArray(v) && v.every((x) => typeof x === "string") ? null : 'Must be a JSON array of strings like ["Feature one","Feature two"]');
const hoursCheck = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? null : 'Must be a JSON object like {"mon":[{"open":"09:00","close":"18:00"}]}');

const moderate = (label: string, run: RowAction["run"], show?: RowAction["show"]): RowAction => ({ key: label.toLowerCase(), label, run, show });

export const RESOURCES: ResourceDef[] = [
  {
    key: "claims", label: "Business claims", singular: "claim", model: "businessClaim", group: "Moderation",
    fields: [], canCreate: false, canEdit: false, canDelete: true,
    include: { business: { select: { name: true } }, user: { select: { email: true } } },
    columns: [
      { label: "Business", path: "business.name" }, { label: "Claimant", path: "claimantName" }, { label: "Role", path: "claimantRole" },
      { label: "Phone", path: "phone" }, { label: "Account", path: "user.email" }, { label: "Note", path: "note", format: "trunc" },
      { label: "Status", path: "status", format: "badge" }, { label: "Submitted", path: "createdAt", format: "date" },
    ],
    orderBy: { createdAt: "desc" }, statusFilter: { field: "status", options: Object.values(ModerationStatus) },
    rowActions: [
      moderate("Approve", (a, id) => approveClaim(a, id), (r) => r.status === "PENDING"),
      moderate("Reject", (a, id) => rejectClaim(a, id), (r) => r.status === "PENDING"),
    ],
  },
  {
    key: "deals", label: "Deals", singular: "deal", model: "deal", group: "Moderation",
    canCreate: true, canEdit: true, canDelete: true, defaults: { status: "APPROVED" },
    include: { business: { select: { name: true } }, branch: { select: { branchName: true } } },
    fields: [
      { name: "businessId", label: "Business", type: "relation", relation: "business", required: true },
      { name: "branchId", label: "Branch (blank = all)", type: "relation", relation: "branch" },
      { name: "productId", label: "Product", type: "relation", relation: "product" },
      { name: "categoryId", label: "Category", type: "relation", relation: "productCategory" },
      { name: "title", label: "Title", type: "text", required: true, max: 120 },
      { name: "description", label: "Description", type: "textarea", max: 1000 },
      { name: "priceSen", label: "Deal price (RM)", type: "money" },
      { name: "originalPriceSen", label: "Normal price (RM)", type: "money" },
      { name: "priceUnit", label: "Per…", type: "text", max: 30 },
      { name: "startsAt", label: "Starts (Malaysia time)", type: "datetime", required: true },
      { name: "endsAt", label: "Ends (Malaysia time)", type: "datetime", required: true },
      { name: "status", label: "Status", type: "select", options: opts(ModerationStatus), required: true },
      { name: "isSponsored", label: "Sponsored deal (shows a “Sponsored” label)", type: "boolean" },
      { name: "rejectionReason", label: "Rejection reason", type: "text", max: 300 },
    ],
    columns: [
      { label: "Title", path: "title" }, { label: "Business", path: "business.name" }, { label: "Branch", path: "branch.branchName" },
      { label: "Price", path: "priceSen", format: "money" }, { label: "Ends", path: "endsAt", format: "date" },
      { label: "Sponsored", path: "isSponsored", format: "bool" }, { label: "Status", path: "status", format: "badge" },
    ],
    orderBy: { createdAt: "desc" }, statusFilter: { field: "status", options: Object.values(ModerationStatus) }, search: ["title"],
    rowActions: [
      moderate("Approve", (a, id) => approveDeal(a, id), (r) => r.status !== "APPROVED"),
      moderate("Reject", (a, id) => rejectDeal(a, id), (r) => r.status !== "REJECTED"),
    ],
    beforeSave(d, { actor }) {
      if (typeof d.endsAt === "object" && typeof d.startsAt === "object" && (d.endsAt as Date) <= (d.startsAt as Date)) return "End must be after start.";
      if (d.status === "APPROVED" || d.status === "REJECTED") { d.reviewedById = actor.id; d.reviewedAt = new Date(); }
    },
  },
  {
    key: "reviews", label: "Reviews", singular: "review", model: "review", group: "Moderation",
    canCreate: false, canEdit: true, canDelete: true,
    include: { branch: { select: { branchName: true, business: { select: { name: true } } } }, user: { select: { name: true } } },
    fields: [
      { name: "status", label: "Status", type: "select", options: opts(ModerationStatus), required: true },
      { name: "body", label: "Review text", type: "textarea", required: true, max: 2000 },
    ],
    columns: [
      { label: "Store", path: "branch.branchName" }, { label: "Reviewer", path: "user.name" }, { label: "Rating", path: "rating" },
      { label: "Review", path: "body", format: "trunc" }, { label: "Status", path: "status", format: "badge" }, { label: "Date", path: "createdAt", format: "date" },
    ],
    orderBy: { createdAt: "desc" }, statusFilter: { field: "status", options: Object.values(ModerationStatus) },
    rowActions: [
      moderate("Approve", (a, id) => moderateReview(a, id, "APPROVED"), (r) => r.status !== "APPROVED"),
      moderate("Reject", (a, id) => moderateReview(a, id, "REJECTED"), (r) => r.status !== "REJECTED"),
    ],
  },
  {
    key: "photos", label: "Photos", singular: "photo", model: "photo", group: "Moderation",
    canCreate: false, canEdit: true, canDelete: true, include: { business: { select: { name: true } } },
    fields: [
      { name: "alt", label: "Alt text", type: "text", required: true, max: 140 },
      { name: "status", label: "Status", type: "select", options: opts(ModerationStatus), required: true },
      { name: "sortOrder", label: "Sort order", type: "int" },
    ],
    columns: [{ label: "Business", path: "business.name" }, { label: "Photo", path: "url" }, { label: "Alt", path: "alt" }, { label: "Status", path: "status", format: "badge" }],
    orderBy: { createdAt: "desc" }, statusFilter: { field: "status", options: Object.values(ModerationStatus) },
    rowActions: [
      { key: "approve", label: "Approve", show: (r) => r.status !== "APPROVED", run: async (a, id) => { if (a.role !== "ADMIN") throw new Error("forbidden"); await db.photo.update({ where: { id }, data: { status: "APPROVED" } }); } },
      { key: "reject", label: "Reject", show: (r) => r.status !== "REJECTED", run: async (a, id) => { if (a.role !== "ADMIN") throw new Error("forbidden"); await db.photo.update({ where: { id }, data: { status: "REJECTED" } }); } },
    ],
  },
  {
    key: "businesses", label: "Businesses", singular: "business", model: "business", group: "Directory",
    canCreate: true, canEdit: true, canDelete: true, include: { owner: { select: { email: true } }, _count: { select: { branches: true } } },
    fields: [
      { name: "name", label: "Name", type: "text", required: true, max: 120 },
      { name: "slug", label: "Slug", type: "slug", slugFrom: "name", required: true },
      { name: "nameAlt", label: "Alternative / English name", type: "text", max: 160 },
      { name: "description", label: "Description", type: "textarea", max: 1500 },
      { name: "website", label: "Website", type: "url" },
      { name: "claimStatus", label: "Claim status", type: "select", options: opts(ClaimStatus), required: true },
      { name: "dataSource", label: "Data source", type: "select", options: opts(DataSource), required: true },
      { name: "ownerId", label: "Owner account", type: "relation", relation: "user", help: "Set automatically when a claim is approved." },
      { name: "isPublished", label: "Published", type: "boolean" },
    ],
    columns: [
      { label: "Name", path: "name" }, { label: "Slug", path: "slug" }, { label: "Branches", path: "_count.branches" },
      { label: "Claim", path: "claimStatus", format: "badge" }, { label: "Owner", path: "owner.email" }, { label: "Published", path: "isPublished", format: "bool" },
    ],
    orderBy: { name: "asc" }, search: ["name", "nameAlt", "slug"], defaults: { claimStatus: "UNCLAIMED", dataSource: "ADMIN_ENTERED", isPublished: true },
    rowActions: [{
      key: "release", label: "Release ownership", show: (r) => r.claimStatus === "CLAIMED",
      run: async (a, id) => { if (a.role !== "ADMIN") throw new Error("forbidden"); await db.business.update({ where: { id }, data: { ownerId: null, claimStatus: "UNCLAIMED" } }); },
    }],
    beforeSave(d) {
      if (d.claimStatus === "UNCLAIMED") d.ownerId = null;
    },
  },
  {
    key: "branches", label: "Branches", singular: "branch", model: "branch", group: "Directory",
    canCreate: true, canEdit: true, canDelete: true, include: { business: { select: { name: true } }, area: { select: { name: true } } },
    fields: [
      { name: "businessId", label: "Business", type: "relation", relation: "business", required: true },
      { name: "areaId", label: "Area", type: "relation", relation: "area", required: true },
      { name: "branchName", label: "Branch name", type: "text", required: true, max: 100 },
      { name: "slug", label: "Slug", type: "slug", slugFrom: "branchName", required: true },
      { name: "addressLine", label: "Address", type: "text", required: true, max: 250 },
      { name: "postcode", label: "Postcode", type: "text", required: true, max: 10 },
      { name: "city", label: "City", type: "text", required: true, max: 80 },
      { name: "state", label: "State", type: "text", required: true, max: 80 },
      { name: "lat", label: "Latitude", type: "float" },
      { name: "lng", label: "Longitude", type: "float" },
      { name: "coordsApprox", label: "Coordinates are approximate", type: "boolean" },
      { name: "phone", label: "Phone (verified only)", type: "phone" },
      { name: "whatsapp", label: "WhatsApp (verified only)", type: "phone" },
      { name: "email", label: "Email", type: "text", max: 254 },
      { name: "website", label: "Website", type: "url" },
      { name: "priceLevel", label: "Price level", type: "select", options: [{ value: "1", label: "$" }, { value: "2", label: "$$" }, { value: "3", label: "$$$" }] },
      { name: "promoDescription", label: "Promo description (Featured)", type: "textarea", max: 600 },
      { name: "openingHours", label: "Opening hours (JSON)", type: "json", jsonCheck: hoursCheck, help: "Leave blank unless verified." },
      { name: "hoursVerifiedAt", label: "Hours verified at", type: "datetime", help: "Hours are only shown publicly when this is set." },
      { name: "categories", label: "Shop types", type: "multirelation", relation: "storeType" },
      { name: "isActive", label: "Active", type: "boolean" },
    ],
    columns: [
      { label: "Business", path: "business.name" }, { label: "Branch", path: "branchName" }, { label: "Area", path: "area.name" },
      { label: "City", path: "city" }, { label: "Phone", path: "phone" }, { label: "Active", path: "isActive", format: "bool" },
    ],
    orderBy: { branchName: "asc" }, search: ["branchName", "addressLine", "city", "slug"], defaults: { coordsApprox: true, isActive: true },
  },
  {
    key: "categories", label: "Categories", singular: "category", model: "category", group: "Directory",
    canCreate: true, canEdit: true, canDelete: true,
    fields: [
      { name: "name", label: "Name", type: "text", required: true, max: 80 },
      { name: "slug", label: "Slug", type: "slug", slugFrom: "name", required: true },
      { name: "nameZh", label: "Chinese name", type: "text", max: 40 },
      { name: "kind", label: "Kind", type: "select", options: opts(CategoryKind), required: true, help: "STORE_TYPE tags shops; PRODUCT groups products." },
      { name: "emoji", label: "Emoji", type: "text", max: 8, notNull: true },
      { name: "description", label: "Description", type: "textarea", required: true, max: 500 },
      { name: "sortOrder", label: "Sort order", type: "int" },
      { name: "storeTypes", label: "Typically sold at (for PRODUCT categories)", type: "multirelation", relation: "storeType" },
    ],
    columns: [{ label: "Name", path: "name" }, { label: "Slug", path: "slug" }, { label: "Kind", path: "kind", format: "badge" }, { label: "Order", path: "sortOrder" }],
    orderBy: { sortOrder: "asc" }, search: ["name", "slug"], defaults: { kind: "PRODUCT", emoji: "🛒", sortOrder: 0 },
  },
  {
    key: "products", label: "Products", singular: "product", model: "product", group: "Directory",
    canCreate: true, canEdit: true, canDelete: true, include: { category: { select: { name: true } } },
    fields: [
      { name: "name", label: "Name", type: "text", required: true, max: 120 },
      { name: "slug", label: "Slug", type: "slug", slugFrom: "name", required: true },
      { name: "nameZh", label: "Chinese name", type: "text", max: 60 },
      { name: "categoryId", label: "Category", type: "relation", relation: "productCategory", required: true },
      { name: "description", label: "Description", type: "textarea", required: true, max: 600 },
      { name: "buyingTips", label: "Buying tips (markdown)", type: "textarea", max: 3000 },
      { name: "nutritionNote", label: "Nutrition note (cite a source)", type: "textarea", max: 500 },
      { name: "sortOrder", label: "Sort order", type: "int" },
      { name: "isPublished", label: "Published", type: "boolean" },
    ],
    columns: [{ label: "Name", path: "name" }, { label: "Category", path: "category.name" }, { label: "Published", path: "isPublished", format: "bool" }],
    orderBy: { name: "asc" }, search: ["name", "slug"], defaults: { isPublished: true, sortOrder: 0 },
  },
  {
    key: "areas", label: "Areas", singular: "area", model: "area", group: "Directory",
    canCreate: true, canEdit: true, canDelete: true,
    fields: [
      { name: "name", label: "Name", type: "text", required: true, max: 80 },
      { name: "slug", label: "Slug", type: "slug", slugFrom: "name", required: true },
      { name: "city", label: "City", type: "text", required: true, max: 80 },
      { name: "state", label: "State", type: "text", required: true, max: 80 },
      { name: "lat", label: "Centre latitude", type: "float", required: true },
      { name: "lng", label: "Centre longitude", type: "float", required: true },
      { name: "radiusKm", label: "SEO radius (km)", type: "float", required: true, help: "Location pages list shops within this distance of the centre." },
      { name: "blurb", label: "Short factual blurb", type: "textarea", max: 400 },
      { name: "isActive", label: "Active (creates SEO pages where shops exist)", type: "boolean" },
    ],
    columns: [{ label: "Name", path: "name" }, { label: "Slug", path: "slug" }, { label: "City", path: "city" }, { label: "Radius km", path: "radiusKm" }, { label: "Active", path: "isActive", format: "bool" }],
    orderBy: { name: "asc" }, search: ["name", "slug"], defaults: { radiusKm: 6, isActive: true },
  },
  {
    key: "leads", label: "Leads", singular: "lead", model: "lead", group: "Growth",
    canCreate: false, canEdit: false, canDelete: true, include: { business: { select: { name: true } }, branch: { select: { branchName: true } } },
    fields: [],
    columns: [
      { label: "Business", path: "business.name" }, { label: "Branch", path: "branch.branchName" }, { label: "Type", path: "type", format: "badge" }, { label: "Name", path: "name" },
      { label: "Phone", path: "phone" }, { label: "Email", path: "email" }, { label: "Message", path: "message", format: "trunc" }, { label: "Status", path: "status", format: "badge" }, { label: "Date", path: "createdAt", format: "date" },
    ],
    orderBy: { createdAt: "desc" }, statusFilter: { field: "status", options: ["NEW", "CONTACTED", "CLOSED"] },
    rowActions: (["CONTACTED", "CLOSED"] as const).map((s) => ({ key: s.toLowerCase(), label: `Mark ${s.toLowerCase()}`, show: (r: Row) => r.status !== s, run: (a: Actor, id: string) => updateLeadStatus(a, id, s) })),
  },
  {
    key: "sponsored", label: "Sponsored listings", singular: "sponsored listing", model: "sponsoredListing", group: "Growth",
    canCreate: true, canEdit: true, canDelete: true, include: { business: { select: { name: true } }, branch: { select: { branchName: true } } },
    fields: [
      { name: "businessId", label: "Business", type: "relation", relation: "business", required: true },
      { name: "branchId", label: "Branch (blank = all branches)", type: "relation", relation: "branch" },
      { name: "placement", label: "Placement", type: "select", options: opts(Placement), required: true },
      { name: "categoryId", label: "Category (for CATEGORY placement)", type: "relation", relation: "category" },
      { name: "areaId", label: "Area (for AREA placement)", type: "relation", relation: "area" },
      { name: "startsAt", label: "Starts (Malaysia time)", type: "datetime", required: true },
      { name: "endsAt", label: "Ends (Malaysia time)", type: "datetime", required: true },
      { name: "priority", label: "Priority (higher first)", type: "int" },
      { name: "isActive", label: "Active", type: "boolean" },
      { name: "notes", label: "Internal notes (invoice ref, etc.)", type: "textarea", max: 500 },
    ],
    columns: [
      { label: "Business", path: "business.name" }, { label: "Branch", path: "branch.branchName" }, { label: "Placement", path: "placement", format: "badge" },
      { label: "Starts", path: "startsAt", format: "date" }, { label: "Ends", path: "endsAt", format: "date" }, { label: "Active", path: "isActive", format: "bool" },
    ],
    orderBy: { startsAt: "desc" }, defaults: { isActive: true, priority: 0, placement: "HOMEPAGE" },
    beforeSave(d) {
      if (d.endsAt instanceof Date && d.startsAt instanceof Date && d.endsAt <= d.startsAt) return "End must be after start.";
    },
  },
  {
    key: "ads", label: "Advertisements", singular: "advertisement", model: "advertisement", group: "Growth",
    canCreate: true, canEdit: true, canDelete: true,
    fields: [
      { name: "slot", label: "Slot", type: "select", options: opts(AdSlot), required: true },
      { name: "type", label: "Type", type: "select", options: opts(AdType), required: true, help: "AFFILIATE links are marked rel=sponsored nofollow and labelled." },
      { name: "advertiser", label: "Advertiser", type: "text", required: true, max: 100 },
      { name: "title", label: "Headline", type: "text", required: true, max: 120 },
      { name: "body", label: "Body text", type: "textarea", max: 300 },
      { name: "imageUrl", label: "Image URL", type: "url" },
      { name: "linkUrl", label: "Destination URL", type: "url", required: true },
      { name: "startsAt", label: "Starts (Malaysia time)", type: "datetime" },
      { name: "endsAt", label: "Ends (Malaysia time)", type: "datetime" },
      { name: "isActive", label: "Active", type: "boolean" },
    ],
    columns: [{ label: "Advertiser", path: "advertiser" }, { label: "Slot", path: "slot", format: "badge" }, { label: "Type", path: "type", format: "badge" }, { label: "Headline", path: "title" }, { label: "Active", path: "isActive", format: "bool" }],
    orderBy: { createdAt: "desc" }, defaults: { isActive: true, type: "DISPLAY", slot: "HOME_MID" },
  },
  {
    key: "articles", label: "Articles", singular: "article", model: "article", group: "Growth",
    canCreate: true, canEdit: true, canDelete: true,
    fields: [
      { name: "title", label: "Title", type: "text", required: true, max: 160 },
      { name: "slug", label: "Slug", type: "slug", slugFrom: "title", required: true },
      { name: "excerpt", label: "Excerpt", type: "textarea", required: true, max: 400 },
      { name: "body", label: "Body (markdown; raw HTML is not rendered)", type: "textarea", required: true, max: 40000 },
      { name: "status", label: "Status", type: "select", options: opts(ArticleStatus), required: true },
      { name: "publishedAt", label: "Published at (Malaysia time)", type: "datetime", help: "Defaults to now when publishing." },
      { name: "reviewedAt", label: "Content last reviewed", type: "datetime" },
      { name: "metaTitle", label: "SEO title", type: "text", max: 70 },
      { name: "metaDescription", label: "SEO description", type: "textarea", max: 160 },
      { name: "faq", label: "FAQ (JSON)", type: "json", jsonCheck: faqCheck },
      { name: "areaSlug", label: "Show listings for area (slug)", type: "text", max: 80 },
      { name: "categorySlug", label: "Show listings for category (slug)", type: "text", max: 80 },
      { name: "isSponsored", label: "Sponsored article", type: "boolean" },
      { name: "sponsorName", label: "Sponsor name", type: "text", max: 100 },
      { name: "sponsorUrl", label: "Sponsor URL", type: "url" },
    ],
    columns: [{ label: "Title", path: "title" }, { label: "Status", path: "status", format: "badge" }, { label: "Sponsored", path: "isSponsored", format: "bool" }, { label: "Published", path: "publishedAt", format: "date" }],
    orderBy: { updatedAt: "desc" }, search: ["title", "slug"], defaults: { status: "DRAFT" },
    beforeSave(d, { actor, mode }) {
      if (d.status === "PUBLISHED" && !d.publishedAt) d.publishedAt = new Date();
      if (mode === "create") d.authorId = actor.id;
    },
  },
  {
    key: "plans", label: "Plans & pricing", singular: "plan", model: "plan", group: "Growth",
    canCreate: true, canEdit: true, canDelete: false,
    fields: [
      { name: "code", label: "Code (unique)", type: "slug", required: true },
      { name: "name", label: "Name", type: "text", required: true, max: 60 },
      { name: "tier", label: "Tier (drives features)", type: "select", options: opts(PlanTier), required: true },
      { name: "priceSen", label: "Price (RM) per interval", type: "money", required: true, help: "Shown on /business and the dashboard. Changing it does not alter existing subscriptions." },
      { name: "interval", label: "Interval", type: "text", required: true, max: 10 },
      { name: "features", label: "Feature bullets (JSON array)", type: "json", jsonCheck: stringsCheck },
      { name: "sortOrder", label: "Sort order", type: "int" },
      { name: "isActive", label: "Active (shown publicly)", type: "boolean" },
    ],
    columns: [{ label: "Name", path: "name" }, { label: "Tier", path: "tier", format: "badge" }, { label: "Price", path: "priceSen", format: "money" }, { label: "Interval", path: "interval" }, { label: "Active", path: "isActive", format: "bool" }],
    orderBy: { sortOrder: "asc" }, defaults: { interval: "month", isActive: true, sortOrder: 0 },
  },
  {
    key: "subscriptions", label: "Subscriptions", singular: "subscription", model: "subscription", group: "Growth",
    canCreate: true, canEdit: true, canDelete: true, include: { business: { select: { name: true } }, plan: { select: { name: true, tier: true } } },
    fields: [
      { name: "businessId", label: "Business", type: "relation", relation: "business", required: true },
      { name: "planId", label: "Plan", type: "relation", relation: "plan", required: true },
      { name: "status", label: "Status", type: "select", options: opts(SubscriptionStatus), required: true },
      { name: "provider", label: "Payment provider", type: "select", options: opts(PaymentProvider), required: true },
      { name: "providerRef", label: "Provider reference / invoice no.", type: "text", max: 100 },
      { name: "currentPeriodEnd", label: "Paid until (Malaysia time)", type: "datetime", help: "Features switch off automatically after this date." },
      { name: "notes", label: "Notes", type: "textarea", max: 500 },
    ],
    columns: [{ label: "Business", path: "business.name" }, { label: "Plan", path: "plan.name" }, { label: "Status", path: "status", format: "badge" }, { label: "Paid until", path: "currentPeriodEnd", format: "date" }, { label: "Provider", path: "provider", format: "badge" }],
    orderBy: { updatedAt: "desc" }, statusFilter: { field: "status", options: Object.values(SubscriptionStatus) }, defaults: { status: "ACTIVE", provider: "MANUAL" },
  },
  {
    key: "users", label: "Users", singular: "user", model: "user", group: "People",
    canCreate: false, canEdit: true, canDelete: false,
    fields: [{ name: "role", label: "Role", type: "select", options: opts(Role), required: true }],
    columns: [{ label: "Email", path: "email" }, { label: "Name", path: "name" }, { label: "Role", path: "role", format: "badge" }, { label: "Joined", path: "createdAt", format: "date" }],
    orderBy: { createdAt: "desc" }, search: ["email", "name"],
    beforeSave(d, { actor, id }) {
      if (id === actor.id && d.role !== "ADMIN") return "You can't remove your own admin role.";
    },
  },
];

export const getResource = (key: string) => RESOURCES.find((r) => r.key === key);

// ── relation option lists (id → label), loaded server-side ──
export async function relationOptions(rel: RelationKey): Promise<Option[]> {
  switch (rel) {
    case "business": return (await db.business.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" }, take: 500 })).map((r) => ({ value: r.id, label: r.name }));
    case "branch": return (await db.branch.findMany({ select: { id: true, branchName: true, business: { select: { name: true } } }, orderBy: { branchName: "asc" }, take: 1000 })).map((r) => ({ value: r.id, label: `${r.business.name} | ${r.branchName}` }));
    case "category": return (await db.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })).map((r) => ({ value: r.id, label: r.name }));
    case "storeType": return (await db.category.findMany({ where: { kind: "STORE_TYPE" }, select: { id: true, name: true }, orderBy: { sortOrder: "asc" } })).map((r) => ({ value: r.id, label: r.name }));
    case "productCategory": return (await db.category.findMany({ where: { kind: "PRODUCT" }, select: { id: true, name: true }, orderBy: { sortOrder: "asc" } })).map((r) => ({ value: r.id, label: r.name }));
    case "product": return (await db.product.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" }, take: 1000 })).map((r) => ({ value: r.id, label: r.name }));
    case "area": return (await db.area.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })).map((r) => ({ value: r.id, label: r.name }));
    case "plan": return (await db.plan.findMany({ select: { id: true, name: true }, orderBy: { sortOrder: "asc" } })).map((r) => ({ value: r.id, label: r.name }));
    case "user": return (await db.user.findMany({ select: { id: true, email: true }, orderBy: { email: "asc" }, take: 500 })).map((r) => ({ value: r.id, label: r.email }));
  }
}

export const DB_NULL = Prisma.DbNull;
