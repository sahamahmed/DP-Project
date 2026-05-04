import { Injectable, Logger } from '@nestjs/common';
import { GroqQueueService } from '../groq-queue/groq-queue.service';

export interface QuantityParseResult {
  quantity: number;
  unit: string;
  valid: boolean;
  error?: string;
}

export interface ItemUnitConfig {
  unitType: 'countable' | 'weight' | 'volume';
  baseUnit: string;
  minOrderQty: number;
  orderIncrement: number;
}

@Injectable()
export class QuantityParser {
  private readonly logger = new Logger(QuantityParser.name);
  private static readonly MAX_QUANTITY = 99;
  private static readonly MAX_WEIGHT_KG = 10;
  private static readonly MAX_VOLUME_LITER = 10;

  constructor(private readonly groqQueueService: GroqQueueService) {}

  async parse(
    input: string,
    unitConfig: ItemUnitConfig,
    itemName: string,
  ): Promise<QuantityParseResult> {
    if (!input || input.trim().length === 0) {
      return {
        quantity: 0,
        unit: unitConfig.baseUnit,
        valid: false,
        error: 'Please enter a quantity.',
      };
    }

    try {
      return await this.parseWithLLM(input, unitConfig, itemName);
    } catch (error) {
      this.logger.warn(`LLM parsing failed, falling back to regex: ${error}`);
      return this.parseWithRegex(input, unitConfig, itemName);
    }
  }

  validateQuantity(
    quantity: number,
    unitConfig: ItemUnitConfig,
  ): { valid: boolean; error?: string } {
    if (quantity < unitConfig.minOrderQty) {
      const minDisplay = this.formatQuantityDisplay(
        unitConfig.minOrderQty,
        unitConfig.baseUnit,
      );
      return { valid: false, error: `Minimum order is ${minDisplay}` };
    }

    const remainder =
      (quantity - unitConfig.minOrderQty) % unitConfig.orderIncrement;
    if (Math.abs(remainder) > 0.001) {
      const incDisplay = this.formatQuantityDisplay(
        unitConfig.orderIncrement,
        unitConfig.baseUnit,
      );
      return { valid: false, error: `Order in increments of ${incDisplay}` };
    }

    if (
      unitConfig.unitType === 'weight' &&
      quantity > QuantityParser.MAX_WEIGHT_KG
    ) {
      return {
        valid: false,
        error: `Maximum ${QuantityParser.MAX_WEIGHT_KG}kg per item`,
      };
    }

    if (
      unitConfig.unitType === 'volume' &&
      quantity > QuantityParser.MAX_VOLUME_LITER
    ) {
      return {
        valid: false,
        error: `Maximum ${QuantityParser.MAX_VOLUME_LITER}L per item`,
      };
    }

    if (
      unitConfig.unitType === 'countable' &&
      quantity > QuantityParser.MAX_QUANTITY
    ) {
      return {
        valid: false,
        error: `Maximum ${QuantityParser.MAX_QUANTITY} items`,
      };
    }

    return { valid: true };
  }

  private formatQuantityDisplay(qty: number, unit: string): string {
    if (unit === 'kg') {
      if (qty === 0.25) return '250g';
      if (qty === 0.5) return '500g';
      if (qty < 1) return `${Math.round(qty * 1000)}g`;
      return `${qty}kg`;
    }
    if (unit === 'liter') {
      if (qty < 1) return `${Math.round(qty * 1000)}ml`;
      return `${qty}L`;
    }
    return `${qty} ${unit}${qty !== 1 ? 's' : ''}`;
  }

  private async parseWithLLM(
    input: string,
    unitConfig: ItemUnitConfig,
    itemName: string,
  ): Promise<QuantityParseResult> {
    const systemPrompt = `You are a quantity parser for a restaurant ordering system. Extract quantity from user input.

ITEM INFO:
- Unit type: ${unitConfig.unitType}
- Base unit: ${unitConfig.baseUnit}
- Minimum order: ${unitConfig.minOrderQty}
- Increment: ${unitConfig.orderIncrement}

RULES:
1. For weight (kg): Convert grams to kg (500g = 0.5kg)
2. For volume (liter): Convert ml to liter (500ml = 0.5L)
3. For countable: Return whole numbers only

ROMAN URDU / URDU TERMS:
- "darjan" / "darzn" = dozen (12)
- "aadha" / "adha" = half (0.5)
- "pao" / "paav" = quarter (0.25)
- "kg" / "kilo" = kilogram
- "gram" / "gm" = gram
- Numbers: "ek"=1, "do"=2, "teen"=3, "char"=4, "panch"=5

OUTPUT FORMAT (JSON):
{
  "quantity": <number in base unit>,
  "unit": "${unitConfig.baseUnit}",
  "valid": true
}

If invalid input:
{
  "quantity": 0,
  "unit": "${unitConfig.baseUnit}",
  "valid": false,
  "error": "<error message>"
}`;

    const userPrompt = `Item: ${itemName}
User input: "${input}"

Parse the quantity.`;

    const response = await this.groqQueueService.queueChatRequest({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0,
      response_format: {
        type: 'json_object',
      },
    });

    const parsed = JSON.parse(response) as QuantityParseResult;

    if (!parsed.valid) {
      return parsed;
    }

    const validation = this.validateQuantity(parsed.quantity, unitConfig);
    if (!validation.valid) {
      return {
        quantity: 0,
        unit: unitConfig.baseUnit,
        valid: false,
        error: validation.error,
      };
    }

    return parsed;
  }

  private parseWithRegex(
    input: string,
    unitConfig: ItemUnitConfig,
    itemName: string,
  ): QuantityParseResult {
    const normalizedInput = this.normalizeInput(input);

    if (unitConfig.unitType === 'weight') {
      return this.parseWeight(normalizedInput, unitConfig);
    } else if (unitConfig.unitType === 'volume') {
      return this.parseVolume(normalizedInput, unitConfig);
    } else {
      return this.parseCount(normalizedInput, unitConfig, itemName);
    }
  }

  private normalizeInput(input: string): string {
    return input
      .toLowerCase()
      .trim()
      .replace(/\b(i want|give me|can i get|please|thanks|thank you)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private parseWeight(
    input: string,
    unitConfig: ItemUnitConfig,
  ): QuantityParseResult {
    const patterns = [
      { regex: /^(?:half|1\/2|0\.5)\s*(?:kg|kilo)?$/i, value: 0.5 },
      {
        regex: /^(?:quarter|1\/4|0\.25|pao|paav)\s*(?:kg|kilo)?$/i,
        value: 0.25,
      },
      { regex: /^(\d+\.?\d*)\s*(?:kg|kilo)s?$/i, multiplier: 1 },
      { regex: /^(\d+\.?\d*)\s*(?:gram|grams|gm|g)s?$/i, multiplier: 0.001 },
      { regex: /^(\d+\.?\d*)$/, multiplier: 1 },
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern.regex);
      if (match) {
        let quantity: number;
        if ('value' in pattern && pattern.value !== undefined) {
          quantity = pattern.value;
        } else if (
          match[1] &&
          'multiplier' in pattern &&
          pattern.multiplier !== undefined
        ) {
          quantity = parseFloat(match[1]) * pattern.multiplier;
        } else {
          continue;
        }

        if (isNaN(quantity) || quantity <= 0) {
          return {
            quantity: 0,
            unit: unitConfig.baseUnit,
            valid: false,
            error: 'Quantity must be greater than 0.',
          };
        }

        const validation = this.validateQuantity(quantity, unitConfig);
        if (!validation.valid) {
          return {
            quantity: 0,
            unit: unitConfig.baseUnit,
            valid: false,
            error: validation.error,
          };
        }

        return { quantity, unit: 'kg', valid: true };
      }
    }

    return {
      quantity: 0,
      unit: unitConfig.baseUnit,
      valid: false,
      error: 'Please enter a valid weight (e.g., 250g, 0.5kg, half kg).',
    };
  }

  private parseVolume(
    input: string,
    unitConfig: ItemUnitConfig,
  ): QuantityParseResult {
    const patterns = [
      { regex: /^(?:half|1\/2|0\.5)\s*(?:liter|litre|l)?$/i, value: 0.5 },
      { regex: /^(?:quarter|1\/4|0\.25)\s*(?:liter|litre|l)?$/i, value: 0.25 },
      { regex: /^(\d+\.?\d*)\s*(?:liter|litre|l)s?$/i, multiplier: 1 },
      { regex: /^(\d+\.?\d*)\s*(?:ml|milliliter)s?$/i, multiplier: 0.001 },
      { regex: /^(\d+\.?\d*)$/, multiplier: 1 },
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern.regex);
      if (match) {
        let quantity: number;
        if ('value' in pattern && pattern.value !== undefined) {
          quantity = pattern.value;
        } else if (
          match[1] &&
          'multiplier' in pattern &&
          pattern.multiplier !== undefined
        ) {
          quantity = parseFloat(match[1]) * pattern.multiplier;
        } else {
          continue;
        }

        if (isNaN(quantity) || quantity <= 0) {
          return {
            quantity: 0,
            unit: unitConfig.baseUnit,
            valid: false,
            error: 'Quantity must be greater than 0.',
          };
        }

        const validation = this.validateQuantity(quantity, unitConfig);
        if (!validation.valid) {
          return {
            quantity: 0,
            unit: unitConfig.baseUnit,
            valid: false,
            error: validation.error,
          };
        }

        return { quantity, unit: 'liter', valid: true };
      }
    }

    return {
      quantity: 0,
      unit: unitConfig.baseUnit,
      valid: false,
      error: 'Please enter a valid volume (e.g., 250ml, 0.5L, half liter).',
    };
  }

  private parseCount(
    input: string,
    unitConfig: ItemUnitConfig,
    itemName: string,
  ): QuantityParseResult {
    const itemKeywords = itemName.toLowerCase().split(/\s+/);

    const patterns = [
      { regex: /^(?:one|1)\s*(?:piece|pcs|box|item)?s?$/i, value: 1 },
      { regex: /^(?:two|2)\s*(?:piece|pcs|box|item)?s?$/i, value: 2 },
      { regex: /^(?:three|3)\s*(?:piece|pcs|box|item)?s?$/i, value: 3 },
      { regex: /^(?:four|4)\s*(?:piece|pcs|box|item)?s?$/i, value: 4 },
      { regex: /^(?:five|5)\s*(?:piece|pcs|box|item)?s?$/i, value: 5 },
      { regex: /^(?:six|6)\s*(?:piece|pcs|box|item)?s?$/i, value: 6 },
      { regex: /^(?:half|1\/2)\s*dozen$/i, value: 6 },
      { regex: /^(?:a|one|1)\s*dozen$/i, value: 12 },
      { regex: /^(\d+)\s*dozen$/i, multiplier: 12 },
      { regex: /^(\d+)\s*(?:pieces?|pcs|boxes?|items?)$/i, multiplier: 1 },
      ...itemKeywords.map((keyword) => ({
        regex: new RegExp(`^(\\d+)\\s*${keyword}s?$`, 'i'),
        multiplier: 1,
      })),
      { regex: /^(\d+)$/, multiplier: 1 },
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern.regex);
      if (match) {
        let quantity: number;
        if ('value' in pattern && pattern.value !== undefined) {
          quantity = pattern.value;
        } else if (
          match[1] &&
          'multiplier' in pattern &&
          pattern.multiplier !== undefined
        ) {
          quantity = parseInt(match[1], 10) * pattern.multiplier;
        } else {
          continue;
        }

        if (isNaN(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
          return {
            quantity: 0,
            unit: unitConfig.baseUnit,
            valid: false,
            error: 'Quantity must be a positive whole number.',
          };
        }

        const validation = this.validateQuantity(quantity, unitConfig);
        if (!validation.valid) {
          return {
            quantity: 0,
            unit: unitConfig.baseUnit,
            valid: false,
            error: validation.error,
          };
        }

        return { quantity, unit: unitConfig.baseUnit, valid: true };
      }
    }

    return {
      quantity: 0,
      unit: unitConfig.baseUnit,
      valid: false,
      error: 'Please enter a valid quantity.',
    };
  }

  static formatQuantity(quantity: number, unit: string): string {
    if (unit === 'kg') {
      if (quantity === 0.25) return '250g';
      if (quantity === 0.5) return '500g';
      if (quantity < 1) return `${Math.round(quantity * 1000)}g`;
      return `${quantity}kg`;
    }

    if (unit === 'liter') {
      if (quantity === 0.25) return '250ml';
      if (quantity === 0.5) return '500ml';
      if (quantity < 1) return `${Math.round(quantity * 1000)}ml`;
      return `${quantity}L`;
    }

    if (unit === 'piece') {
      if (quantity === 1) return '1 piece';
      return `${quantity} pieces`;
    }

    if (unit === 'box') {
      if (quantity === 1) return '1 box';
      return `${quantity} boxes`;
    }

    return `${quantity} ${unit}`;
  }

  static formatPricePerUnit(price: number, baseUnit: string): string {
    if (baseUnit === 'kg') return `Rs.${price}/kg`;
    if (baseUnit === 'liter') return `Rs.${price}/L`;
    return `Rs.${price}`;
  }

  static formatCartLineItem(
    quantity: number,
    pricePerUnit: number,
    subtotal: number,
    baseUnit: string,
  ): string {
    const qtyDisplay = QuantityParser.formatQuantity(quantity, baseUnit);

    if (baseUnit === 'kg' || baseUnit === 'liter') {
      return `${qtyDisplay} = Rs.${subtotal}`;
    }

    return `${quantity} x Rs.${pricePerUnit} = Rs.${subtotal}`;
  }
}
