import { z } from "zod";

/**
 * Validation schemas for design tokens
 * Ensures tokens conform to W3C Design Tokens format
 */

// Color token validation
const ColorTokenSchema = z.object({
  $type: z.literal("color"),
  $value: z.string().regex(
    /^#[0-9A-Fa-f]{6}$|^#[0-9A-Fa-f]{8}$|^rgb\(|^rgba\(|^hsl\(|^hsla\(/,
    "Invalid color format. Use hex, rgb, rgba, hsl, or hsla"
  ),
  $description: z.string().optional(),
});

// Dimension token validation
const DimensionTokenSchema = z.object({
  $type: z.literal("dimension"),
  $value: z.string().regex(
    /^\d+(\.\d+)?(px|rem|em|%|vh|vw)$/,
    "Invalid dimension format. Use px, rem, em, %, vh, or vw"
  ),
  $description: z.string().optional(),
});

// Typography value validation
const TypographyValueSchema = z.object({
  fontFamily: z.string().optional(),
  fontSize: z.string().regex(/^\d+(\.\d+)?(px|rem|em)$/),
  fontWeight: z.string().regex(/^[1-9]00$/),
  lineHeight: z.string().optional(),
  letterSpacing: z.string().optional(),
});

// Typography token validation
const TypographyTokenSchema = z.object({
  $type: z.literal("typography"),
  $value: TypographyValueSchema,
  $description: z.string().optional(),
});

// Number token validation
const NumberTokenSchema = z.object({
  $type: z.literal("number"),
  $value: z.number(),
  $description: z.string().optional(),
});

// Shadow value validation
const ShadowValueSchema = z.object({
  offsetX: z.string(),
  offsetY: z.string(),
  blur: z.string(),
  spread: z.string().optional(),
  color: z.string(),
});

// Shadow token validation
const ShadowTokenSchema = z.object({
  $type: z.literal("shadow"),
  $value: ShadowValueSchema,
  $description: z.string().optional(),
});

/**
 * Complete design tokens schema
 * Uses passthrough() to allow additional custom tokens while validating known ones
 */
export const BrakitDesignTokensSchema = z
  .object({
    $schema: z.string().optional(),
    color: z.record(ColorTokenSchema).optional(),
    typography: z.record(TypographyTokenSchema).optional(),
    spacing: z.record(DimensionTokenSchema).optional(),
    radius: z.record(DimensionTokenSchema).optional(),
    shadow: z.record(ShadowTokenSchema).optional(),
    layout: z.record(DimensionTokenSchema).optional(),
    border: z.record(DimensionTokenSchema).optional(),
    opacity: z.record(NumberTokenSchema).optional(),
    zIndex: z.record(NumberTokenSchema).optional(),
  })
  .passthrough(); // Allow additional properties for extensibility

export type ValidatedDesignTokens = z.infer<typeof BrakitDesignTokensSchema>;
